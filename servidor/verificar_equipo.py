"""
Comprueba que el equipo quedó preparado: genera una frase de voz con edge-tts y la transcribe con faster-whisper;
con «ia», importa los módulos de los efectos de IA.

  python verificar_equipo.py <config.json> <salida.json>

config = { "ffmpeg": "ruta", "modelo": "small" | "C:/…/faster-whisper-small", "carpeta": "temporal", "ia": false }
salida = { "voz": "…", "subtitulos": "…", "ia": "…" } o { "error": "…" } si algo no se puede ni cargar.
"""
import asyncio, json, os, subprocess, sys

conf = json.load(open(sys.argv[1], encoding='utf8'))
res = {}


def fin():
    json.dump(res, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
    sys.exit(0)


try:
    import numpy as np
    import scipy  # noqa: F401
    import av  # noqa: F401
    import edge_tts
    from faster_whisper import WhisperModel
except Exception as e:  # p. ej. «DLL load failed» si falta Visual C++
    res['error'] = f'Los paquetes de voz y subtítulos no se cargan: {e}'
    fin()

TEXTO = 'Hola, esta es una prueba de voz de MétricaSEO Studio.'
mp3 = os.path.join(conf['carpeta'], 'prueba.mp3')
try:
    asyncio.run(edge_tts.Communicate(TEXTO, 'es-MX-DaliaNeural').save(mp3))
    res['voz'] = 'La voz funciona (frase de prueba generada).'
except Exception as e:
    res['voz'] = f'No se pudo generar la voz de prueba ({e.__class__.__name__}). La voz usa el servicio de Microsoft y necesita conexión a internet.'

try:
    modelo = WhisperModel(conf['modelo'], device='cpu', compute_type='int8')
    if os.path.exists(mp3):
        raw = subprocess.run([conf['ffmpeg'], '-v', 'error', '-i', mp3, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-f', 'wav', '-'], capture_output=True).stdout
        k = raw.find(b'data')
        pcm = raw[k + 8:] if k >= 0 else raw[44:]
        pcm = pcm[: len(pcm) // 2 * 2]
        audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768
        segs, _ = modelo.transcribe(audio, language='es', beam_size=5)
        oido = ' '.join(s.text.strip() for s in segs).strip()
        if 'prueba' in oido.lower():
            res['subtitulos'] = f'Los subtítulos funcionan: «{oido}».'
        else:
            res['subtitulos'] = f'El modelo de subtítulos carga, pero entendió «{oido}» en la frase de prueba.'
    else:
        res['subtitulos'] = 'El modelo de subtítulos carga (sin frase de prueba que transcribir).'
except Exception as e:
    res['error'] = f'El modelo de subtítulos no funciona: {e}'
    fin()

if conf.get('ia'):
    try:
        import cv2  # noqa: F401
        import imageio_ffmpeg  # noqa: F401
        from PIL import Image  # noqa: F401
        import rembg  # noqa: F401
        res['ia'] = 'Los efectos de IA están instalados (el modelo de quitar fondo se descarga la primera vez que lo uses).'
    except Exception as e:
        res['error'] = f'Los efectos de IA no se cargan: {e}'
fin()
