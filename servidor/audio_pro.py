"""
Audio profesional, en local (numpy + scipy), sin servicios externos.

  py audio_pro.py <config.json> <salida.json>

config.accion:
  "mejorar" : { items: [{id, entrada, salida}], objetivo: -16 }  voz: paso alto 80 Hz, reducción de ruido (puerta
              espectral con el perfil de los tramos más silenciosos), presencia +2,5 dB a 3 kHz, compresor suave 3:1,
              limitador y normalización a `objetivo` LUFS (ITU-R BS.1770, ponderación K).
  "ritmo"   : { entrada }  -> { bpm, beats: [s…] }  pulsos de la música (flujo espectral + autocorrelación).
  "lufs"    : { entrada }  -> { lufs, pico }        sonoridad integrada y pico (dBFS) de un archivo.
  "sfx"     : { carpeta }  -> { archivos }          sintetiza la biblioteca de efectos originales.
Entrada/salida de audio con el ffmpeg de Remotion (config.ffmpeg). Progreso: «PROGRESO a/b».
"""
import json, os, subprocess, sys, wave
import numpy as np
from scipy import signal

conf = json.load(open(sys.argv[1], encoding='utf8'))
SALIDA = sys.argv[2]
FF = conf.get('ffmpeg', 'ffmpeg')
SR = 48000


def leer(f, sr=SR):
    out = subprocess.run([FF, '-v', 'error', '-i', f, '-vn', '-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True).stdout
    k = out.find(b'data')
    raw = out[k + 8:] if k >= 0 else out[44:]
    raw = raw[: len(raw) // 2 * 2]
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def escribir(f, x, sr=SR, canales=2):
    os.makedirs(os.path.dirname(f), exist_ok=True)
    y = np.clip(x, -1, 1)
    if canales == 2:
        y = np.stack([y, y], axis=1).reshape(-1)
    with wave.open(f, 'wb') as w:
        w.setnchannels(canales)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((y * 32767).astype(np.int16).tobytes())


def lufs(x, sr=SR):
    """Sonoridad integrada (BS.1770-4): ponderación K, bloques de 400 ms al 75 %, puertas −70 LUFS y −10 LU."""
    # filtro de estantería + paso alto (coeficientes de la norma, recalculados para sr)
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh = 10 ** (G / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a1 = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    b2 = [1, -2, 1]
    a2 = [1, 2 * (K * K - 1) / (1 + K / Q + K * K), (1 - K / Q + K * K) / (1 + K / Q + K * K)]
    y = signal.lfilter(b2, a2, signal.lfilter(b1, a1, x))
    n, h = int(0.4 * sr), int(0.1 * sr)
    if len(y) < n:
        return -70.0
    ms = np.array([np.mean(y[i:i + n] ** 2) for i in range(0, len(y) - n + 1, h)])
    l = -0.691 + 10 * np.log10(ms + 1e-12)
    ms = ms[l > -70]
    if not len(ms):
        return -70.0
    rel = -0.691 + 10 * np.log10(ms.mean()) - 10
    ms2 = ms[(-0.691 + 10 * np.log10(ms + 1e-12)) > rel]
    return float(-0.691 + 10 * np.log10((ms2 if len(ms2) else ms).mean()))


def biquad_pico(f0, gain_db, q, sr=SR):
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / sr
    al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]
    a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return np.array(b) / a[0], np.array(a) / a[0]


def mejorar(x, objetivo):
    # 1. paso alto 80 Hz
    sos = signal.butter(2, 80, 'highpass', fs=SR, output='sos')
    x = signal.sosfilt(sos, x)
    # 2. reducción de ruido: puerta espectral (perfil = percentil bajo de cada banda)
    f, t, Z = signal.stft(x, SR, nperseg=1024, noverlap=768)
    mag = np.abs(Z)
    ruido = np.percentile(mag, 12, axis=1, keepdims=True)
    gan = np.clip((mag - 1.6 * ruido) / (mag + 1e-9), 0.12, 1.0)
    gan = signal.convolve2d(gan, np.ones((3, 5)) / 15, mode='same', boundary='symm')
    _, x = signal.istft(Z * gan, SR, nperseg=1024, noverlap=768)
    # 3. presencia +2,5 dB a 3 kHz y un poco menos de barro a 250 Hz
    for f0, g, q in ((3000, 2.5, 0.9), (250, -1.5, 1.0)):
        b, a = biquad_pico(f0, g, q)
        x = signal.lfilter(b, a, x)
    # 4. compresor 3:1 sobre −20 dBFS (envolvente RMS 10 ms, ataque/relajación suavizados)
    env = np.sqrt(signal.lfilter([0.01], [1, -0.99], x * x) + 1e-12)
    db = 20 * np.log10(env)
    red = np.where(db > -20, (db + 20) * (1 - 1 / 3), 0)
    red = signal.lfilter([0.002], [1, -0.998], red)
    x = x * 10 ** (-red / 20)
    # 5. sonoridad objetivo y limitador a −1 dBFS
    l = lufs(x)
    x = x * 10 ** ((objetivo - l) / 20)
    pico = np.max(np.abs(x)) + 1e-12
    if pico > 0.89:
        x = np.tanh(x / 0.89) * 0.89
    return x, l


def ritmo(x, sr=22050):
    f, t, Z = signal.stft(x, sr, nperseg=1024, noverlap=1024 - 256)
    mag = np.log1p(np.abs(Z))
    flujo = np.maximum(0, np.diff(mag, axis=1)).sum(axis=0)
    flujo = (flujo - flujo.mean()) / (flujo.std() + 1e-9)
    fps = sr / 256
    ac = np.correlate(flujo, flujo, 'full')[len(flujo) - 1:]
    lags = np.arange(len(ac))
    bpm = 60 * fps / np.maximum(lags, 1)
    ok = (bpm >= 70) & (bpm <= 180)
    lag = lags[ok][np.argmax(ac[ok])]
    bpm_v = 60 * fps / lag
    # fase: la que más energía de ataque acumula
    fases = [flujo[p::lag].sum() for p in range(lag)]
    p0 = int(np.argmax(fases))
    beats = [round((p0 + k * lag) / fps + 1024 / sr / 2, 3) for k in range(int((len(flujo) - p0) / lag) + 1)]
    return float(round(bpm_v, 2)), beats


def sfx(carpeta):
    rng = np.random.default_rng(11)
    t = lambda d: np.arange(int(SR * d)) / SR
    env = lambda n, a, r: np.minimum(1, np.arange(n) / max(1, int(a * SR))) * np.exp(-np.arange(n) / max(1, r * SR))
    def ruido_filtrado(d, f0, f1):
        n = int(SR * d)
        x = rng.standard_normal(n)
        out = np.zeros(n)
        bloques = 64
        for i in range(bloques):
            a, b = i * n // bloques, (i + 1) * n // bloques
            fc = f0 + (f1 - f0) * (i / bloques)
            sos = signal.butter(2, [max(40, fc * 0.6), min(SR / 2 - 100, fc * 1.6)], 'bandpass', fs=SR, output='sos')
            out[a:b] = signal.sosfilt(sos, x[max(0, a - 2000):b])[-(b - a):]
        return out
    sonidos = {}
    n = int(SR * 0.7)
    w = ruido_filtrado(0.7, 300, 4000)
    sonidos['whoosh'] = w * np.sin(np.pi * np.arange(n) / n) ** 2 * 0.9
    n = int(SR * 0.35)
    s = ruido_filtrado(0.35, 6000, 1500)
    sonidos['swish'] = s * np.sin(np.pi * np.arange(n) / n) ** 3
    tt = t(0.06)
    sonidos['clic'] = (np.sin(2 * np.pi * 2200 * tt) * 0.6 + rng.standard_normal(len(tt)) * 0.15) * env(len(tt), 0.0005, 0.008)
    tt = t(0.18)
    fpop = 900 * np.exp(-tt * 18) + 180
    sonidos['pop'] = np.sin(2 * np.pi * np.cumsum(fpop) / SR) * env(len(tt), 0.001, 0.05)
    tt = t(1.6)
    fr = 200 + 1400 * (tt / tt[-1]) ** 2
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.4 + ruido_filtrado(1.6, 500, 6000) * 0.5
    sonidos['subida'] = sub * (tt / tt[-1]) ** 1.5
    tt = t(1.2)
    fi = 110 * np.exp(-tt * 4) + 42
    sonidos['impacto'] = np.sin(2 * np.pi * np.cumsum(fi) / SR) * env(len(tt), 0.002, 0.35) + ruido_filtrado(1.2, 2000, 200) * env(len(tt), 0.001, 0.06) * 0.6
    tt = t(1.4)
    sonidos['ding'] = sum(np.sin(2 * np.pi * f * tt) * g for f, g in ((1318.5, 0.6), (2637, 0.25), (3956, 0.1))) * env(len(tt), 0.002, 0.45)
    tt = t(0.04)
    sonidos['tic'] = np.sin(2 * np.pi * 3500 * tt) * env(len(tt), 0.0003, 0.006)
    archivos = []
    for nombre, x in sonidos.items():
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.8
        f = os.path.join(carpeta, f'{nombre}.wav')
        escribir(f, x)
        archivos.append(f)
    return archivos


acc = conf['accion']
res = {}
if acc == 'mejorar':
    items = conf['items']
    for k, it in enumerate(items):
        print(f'PROGRESO {k}/{len(items)} {it["id"]}', flush=True)
        x = leer(it['entrada'])
        y, antes = mejorar(x, conf.get('objetivo', -16))
        escribir(it['salida'], y)
        res[it['id']] = {'antes': round(antes, 1), 'despues': round(lufs(y), 1), 'salida': it['salida']}
        print(f'  {it["id"]}: {antes:.1f} -> {res[it["id"]]["despues"]:.1f} LUFS', flush=True)
    print(f'PROGRESO {len(items)}/{len(items)}', flush=True)
elif acc == 'ritmo':
    x = leer(conf['entrada'], 22050)
    bpm, beats = ritmo(x)
    res = {'bpm': bpm, 'beats': beats}
elif acc == 'lufs':
    x = leer(conf['entrada'])
    res = {'lufs': round(lufs(x), 2), 'pico': round(20 * np.log10(np.max(np.abs(x)) + 1e-12), 2)}
elif acc == 'sfx':
    res = {'archivos': sfx(conf['carpeta'])}
json.dump(res, open(SALIDA, 'w', encoding='utf8'))
