"""
Subtítulos automáticos: transcribe audios con faster-whisper (español, tiempos por palabra).

  py transcribir.py <config.json> <salida.json>

config = { "modelo": "small", "idioma": "es", "items": [ { "id": "...", "archivo": "C:/.../voz.wav", "texto": "opcional" } ] }
Si un item trae "texto" (el guion), las palabras se escriben como en el guion y solo se toman de whisper los tiempos
(alineación con difflib); si no, se usa lo que entiende whisper. Progreso: líneas «PROGRESO n/N» en stdout.
"""
import difflib, json, re, subprocess, sys, unicodedata
import numpy as np

conf = json.load(open(sys.argv[1], encoding='utf8'))
salida = sys.argv[2]


def norm(w):
    w = unicodedata.normalize('NFD', w.lower())
    return re.sub(r'[^a-z0-9ñ]', '', ''.join(c for c in w if unicodedata.category(c) != 'Mn'))


from faster_whisper import WhisperModel  # noqa: E402


def cargar(f):
    """Audio (o vídeo) → 16 kHz mono float32 con el ffmpeg de Remotion (la decodificación de PyAV puede fallar)."""
    out = subprocess.run([conf.get('ffmpeg', 'ffmpeg'), '-v', 'error', '-i', f, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True).stdout
    k = out.find(b'data')
    raw = out[k + 8:] if k >= 0 else out[44:]
    raw = raw[: len(raw) // 2 * 2]
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768

print('Cargando modelo', conf.get('modelo', 'small'), flush=True)
modelo = WhisperModel(conf.get('modelo', 'small'), device='cpu', compute_type='int8')

res = {}
items = conf['items']
for k, it in enumerate(items):
    print(f'PROGRESO {k}/{len(items)} {it["id"]}', flush=True)
    texto = (it.get('texto') or '').strip()
    segs, info = modelo.transcribe(cargar(it['archivo']), language=conf.get('idioma', 'es'), word_timestamps=True, beam_size=5, vad_filter=not texto, initial_prompt=texto or None)
    reco = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in (s.words or []) if w.word.strip()]
    if texto:
        mias = texto.split()
        a, b = [norm(w) for w in mias], [norm(w[0]) for w in reco]
        t = [None] * len(mias)
        for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
            for j in range(blk.size):
                t[blk.a + j] = (reco[blk.b + j][1], reco[blk.b + j][2])
        total = info.duration
        i = 0
        while i < len(mias):  # huecos: se reparten por letras entre vecinos
            if t[i] is None:
                j = i
                while j < len(mias) and t[j] is None:
                    j += 1
                t0 = t[i - 1][1] if i > 0 else 0.05
                t1 = t[j][0] if j < len(mias) else max(t0 + 0.2, total - 0.1)
                letras = [max(1, len(norm(m))) for m in mias[i:j]]
                acc = t0
                for q, n in enumerate(letras):
                    d = (t1 - t0) * n / sum(letras)
                    t[i + q] = (acc, acc + d)
                    acc += d
                i = j
            else:
                i += 1
        palabras = [{'p': m, 'ini': round(x[0], 3), 'fin': round(x[1], 3)} for m, x in zip(mias, t)]
    else:
        palabras = [{'p': w, 'ini': round(s, 3), 'fin': round(e, 3)} for w, s, e in reco]
    res[it['id']] = {'palabras': palabras, 'duracion': info.duration, 'texto': ' '.join(p['p'] for p in palabras)}
    print(f'  {it["id"]}: {len(palabras)} palabras', flush=True)

print(f'PROGRESO {len(items)}/{len(items)}', flush=True)
json.dump(res, open(salida, 'w', encoding='utf8'), ensure_ascii=False)
