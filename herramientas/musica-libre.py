"""
Biblioteca de música ORIGINAL de Montinar Studio: se sintetiza aquí nota a nota (sin muestras, loops ni pistas de
terceros), así que no hay licencias de otros que verificar. Se publica como CC0 (dominio público): se puede usar en
redes, anuncios y trabajos comerciales sin atribución.

  py herramientas/musica-libre.py [carpeta_salida] [ffmpeg]

Salida: <carpeta>/<id>.m4a (AAC 160 kb/s, 44,1 kHz estéreo, ~60 s) y catalogo.json con ánimo, BPM, duración, golpes
(segundos de cada pulso, para «encajar al ritmo») y una forma de onda reducida para la vista previa.
"""
import json, os, subprocess, sys, wave
import numpy as np
from scipy.signal import lfilter, butter

SR = 44100
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'recursos', 'musica')
FF = sys.argv[2] if len(sys.argv) > 2 else 'ffmpeg'
os.makedirs(OUT, exist_ok=True)

NOTAS = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
ESCALAS = {'mayor': [0, 2, 4, 5, 7, 9, 11], 'menor': [0, 2, 3, 5, 7, 8, 10], 'dorica': [0, 2, 3, 5, 7, 9, 10]}


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def acorde(tonica, escala, grado, octava=4):
    """Tríada (y séptima) sobre un grado de la escala."""
    esc = ESCALAS[escala]
    base = 12 * (octava + 1) + NOTAS[tonica]
    notas = []
    for k in (0, 2, 4, 6):
        i = grado + k
        notas.append(base + esc[i % 7] + 12 * (i // 7))
    return notas


def env(n, a=0.01, d=0.2, s=0.6, r=0.2):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.ones(n) * s
    if a: e[:min(a, n)] = np.linspace(0, 1, min(a, n))
    if d and a < n: e[a:min(a + d, n)] = np.linspace(1, s, min(a + d, n) - a)
    if r and n > r: e[n - r:] *= np.linspace(1, 0, r)
    return e


def saw(f, n, fase=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + fase) % 1) - 1


def lp(x, fc):
    b, a = butter(2, min(0.99, fc / (SR / 2)), 'low')
    return lfilter(b, a, x)


def hp(x, fc):
    b, a = butter(2, min(0.99, fc / (SR / 2)), 'high')
    return lfilter(b, a, x)


def pista(cfg, semilla):
    rng = np.random.default_rng(semilla)
    bpm = cfg['bpm']
    beat = 60 / bpm
    compas = beat * 4
    n_comp = int(round(cfg.get('segundos', 60) / compas))
    dur = n_comp * compas
    N = int(dur * SR) + SR
    L = np.zeros(N)
    R = np.zeros(N)
    golpes = [round(i * beat, 4) for i in range(int(dur / beat))]
    prog = cfg['progresion']
    pos = lambda s: int(s * SR)

    def poner(x, t0, pan=0.0, g=1.0):
        i = pos(t0)
        x = x[: max(0, N - i)]
        L[i:i + len(x)] += x * g * (1 - max(0, pan))
        R[i:i + len(x)] += x * g * (1 + min(0, pan))

    for c in range(n_comp):
        t0 = c * compas
        notas = acorde(cfg['tono'], cfg['escala'], prog[c % len(prog)], cfg.get('octava', 4))
        # sección: intro sin batería, mitad con todo, final suave
        fase = c / n_comp
        lleno = 0.12 < fase < 0.9
        # pad
        if cfg.get('pad', 1):
            n = pos(compas) + pos(0.3)
            x = sum(saw(hz(m) * (1 + d), n, rng.random()) for m in notas[:3] for d in (-0.004, 0.004))
            x = lp(x, cfg.get('brillo', 1800)) * env(n, a=0.4 * compas, d=0.2, s=0.8, r=0.3)
            poner(x, t0, -0.2, 0.05 * cfg.get('pad', 1))
            poner(x, t0, 0.2, 0.05 * cfg.get('pad', 1))
        # bajo
        if cfg.get('bajo', 1):
            raiz = notas[0] - 24
            for k, frac in enumerate(cfg.get('patron_bajo', [0, 1.5, 2, 3])):
                n = pos(beat * 0.9)
                x = (np.sin(2 * np.pi * hz(raiz) * np.arange(n) / SR) + 0.3 * lp(saw(hz(raiz), n), 600)) * env(n, 0.005, 0.15, 0.5, 0.08)
                poner(x, t0 + frac * beat, 0, 0.32 * cfg.get('bajo', 1))
        # arpegio / pulsación
        if cfg.get('arpegio', 0):
            paso = beat / cfg.get('subdiv', 2)
            for k in range(int(compas / paso)):
                m = notas[(k * cfg.get('salto', 1)) % len(notas)] + 12
                n = pos(paso * 1.6)
                tt = np.arange(n) / SR
                forma = np.sign(np.sin(2 * np.pi * hz(m) * tt)) * 0.3 + np.sin(2 * np.pi * hz(m) * tt)
                x = lp(forma, cfg.get('brillo', 1800) * 1.4) * np.exp(-tt * cfg.get('caida', 9))
                poner(x, t0 + k * paso, 0.35 if k % 2 else -0.35, 0.09 * cfg['arpegio'] * (0.5 if not lleno else 1))
        # piano (armónicos con caída) en los tiempos 1 y 3
        if cfg.get('piano', 0):
            for b in (0, 2):
                for m in notas[:3]:
                    n = pos(beat * 2.5)
                    tt = np.arange(n) / SR
                    x = sum(np.sin(2 * np.pi * hz(m + 12) * h * tt) / h ** 1.6 for h in (1, 2, 3, 4)) * np.exp(-tt * 2.2)
                    poner(x, t0 + b * beat, rng.uniform(-0.3, 0.3), 0.06 * cfg['piano'])
        # batería
        if lleno and cfg.get('bateria', 1):
            for fb in cfg.get('bombo', [0, 1, 2, 3]):
                n = pos(0.35)
                tt = np.arange(n) / SR
                f = 45 + 80 * np.exp(-tt * 30)
                x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
                poner(x, t0 + fb * beat, 0, 0.55 * cfg.get('bateria', 1))
            for b in range(4):
                if b in cfg.get('caja', [1, 3]):
                    n = pos(0.25)
                    tt = np.arange(n) / SR
                    x = hp(rng.standard_normal(n), 1500) * np.exp(-tt * 18) + 0.3 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 25)
                    poner(x, t0 + b * beat, 0.05, 0.16 * cfg.get('bateria', 1))
                for h in range(cfg.get('charles', 2)):
                    n = pos(0.06)
                    tt = np.arange(n) / SR
                    x = hp(rng.standard_normal(n), 7000) * np.exp(-tt * 70)
                    poner(x, t0 + b * beat + h * beat / max(1, cfg.get('charles', 2)), 0.25, 0.07 * cfg.get('bateria', 1))
    # fundidos de entrada y salida, recorte a la duración exacta
    m = np.stack([L, R], 1)[: int(dur * SR)]
    fi, fo = int(1.5 * SR), int(3 * SR)
    m[:fi] *= np.linspace(0, 1, fi)[:, None]
    m[-fo:] *= np.linspace(1, 0, fo)[:, None]
    m = np.tanh(m * 1.4) / np.tanh(1.4)
    m = m / (np.max(np.abs(m)) + 1e-9) * 0.89
    return m, golpes


PISTAS = [
    {'id': 'empuje', 'nombre': 'Empuje', 'animo': 'Energético', 'bpm': 128, 'tono': 'A', 'escala': 'menor', 'progresion': [0, 5, 2, 6], 'arpegio': 1, 'subdiv': 4, 'bombo': [0, 1, 2, 3], 'charles': 2, 'brillo': 2600},
    {'id': 'avance', 'nombre': 'Avance', 'animo': 'Corporativo', 'bpm': 110, 'tono': 'C', 'escala': 'mayor', 'progresion': [0, 4, 5, 3], 'piano': 1, 'arpegio': 0.6, 'subdiv': 2, 'bombo': [0, 2], 'charles': 2},
    {'id': 'calma', 'nombre': 'Calma', 'animo': 'Tranquilo', 'bpm': 80, 'tono': 'F', 'escala': 'mayor', 'progresion': [0, 3, 5, 4], 'piano': 1.2, 'bateria': 0, 'brillo': 1200, 'bajo': 0.6},
    {'id': 'tarde', 'nombre': 'Tarde lenta', 'animo': 'Lo-fi', 'bpm': 84, 'tono': 'D', 'escala': 'dorica', 'progresion': [0, 3, 1, 4], 'piano': 0.9, 'bombo': [0, 2], 'caja': [1, 3], 'charles': 2, 'brillo': 900, 'bateria': 0.7},
    {'id': 'cumbre', 'nombre': 'Cumbre', 'animo': 'Épico', 'bpm': 90, 'tono': 'D', 'escala': 'menor', 'progresion': [0, 5, 3, 4], 'pad': 1.6, 'arpegio': 0.8, 'subdiv': 4, 'bombo': [0, 2], 'caja': [2], 'brillo': 2200, 'octava': 3},
    {'id': 'pulso', 'nombre': 'Pulso', 'animo': 'Tecno', 'bpm': 124, 'tono': 'G', 'escala': 'menor', 'progresion': [0, 0, 5, 6], 'arpegio': 1.1, 'subdiv': 4, 'salto': 2, 'bombo': [0, 1, 2, 3], 'charles': 4, 'brillo': 3000, 'caida': 14},
    {'id': 'sol', 'nombre': 'Sol', 'animo': 'Alegre', 'bpm': 118, 'tono': 'G', 'escala': 'mayor', 'progresion': [0, 4, 5, 3], 'arpegio': 1, 'subdiv': 2, 'piano': 0.6, 'bombo': [0, 2], 'charles': 2, 'brillo': 2400},
    {'id': 'recuerdo', 'nombre': 'Recuerdo', 'animo': 'Emotivo', 'bpm': 72, 'tono': 'E', 'escala': 'menor', 'progresion': [0, 5, 2, 6], 'piano': 1.3, 'pad': 1.2, 'bateria': 0, 'brillo': 1100},
    {'id': 'groove', 'nombre': 'Groove', 'animo': 'Funk', 'bpm': 105, 'tono': 'E', 'escala': 'dorica', 'progresion': [0, 3, 0, 4], 'patron_bajo': [0, 0.75, 1.5, 2.5, 3.25], 'arpegio': 0.7, 'subdiv': 4, 'bombo': [0, 2], 'caja': [1, 3], 'charles': 4},
    {'id': 'niebla', 'nombre': 'Niebla', 'animo': 'Ambiental', 'bpm': 70, 'tono': 'C', 'escala': 'dorica', 'progresion': [0, 3, 6, 4], 'pad': 1.8, 'bateria': 0, 'bajo': 0.4, 'brillo': 800},
    {'id': 'barrio', 'nombre': 'Barrio', 'animo': 'Urbano', 'bpm': 140, 'tono': 'F#', 'escala': 'menor', 'progresion': [0, 5, 3, 4], 'bombo': [0, 2.5], 'caja': [2], 'charles': 4, 'arpegio': 0.5, 'subdiv': 2, 'brillo': 1600, 'octava': 3},
    {'id': 'linea', 'nombre': 'Línea', 'animo': 'Minimal', 'bpm': 100, 'tono': 'A', 'escala': 'menor', 'progresion': [0, 0, 3, 4], 'pad': 0.5, 'arpegio': 0.9, 'subdiv': 4, 'salto': 3, 'bombo': [0, 2], 'caja': [], 'charles': 2, 'brillo': 2000},
]

catalogo = []
for i, cfg in enumerate(PISTAS):
    m, golpes = pista(cfg, 100 + i)
    wav = os.path.join(OUT, f"{cfg['id']}.wav")
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((m * 32767).astype('<i2').tobytes())
    m4a = os.path.join(OUT, f"{cfg['id']}.m4a")
    subprocess.run([FF, '-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '160k', '-f', 'mp4', m4a], check=True)
    os.remove(wav)
    mono = np.abs(m).max(1)
    k = len(mono) // 120
    onda = [round(float(mono[j * k:(j + 1) * k].max()), 3) for j in range(120)]
    catalogo.append({'id': cfg['id'], 'nombre': cfg['nombre'], 'animo': cfg['animo'], 'bpm': cfg['bpm'], 'segundos': round(len(m) / SR, 2), 'archivo': f"{cfg['id']}.m4a", 'golpes': golpes, 'onda': onda,
                     'licencia': 'CC0 1.0 (dominio público) · música original sintetizada por Montinar Studio, sin muestras de terceros'})
    print(f"{cfg['nombre']} · {cfg['animo']} · {cfg['bpm']} BPM · {len(m) / SR:.1f} s", flush=True)
json.dump(catalogo, open(os.path.join(OUT, 'catalogo.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
