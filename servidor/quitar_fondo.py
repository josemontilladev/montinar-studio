"""
Quitar el fondo de una imagen o de un vídeo con rembg (MIT) y modelos de licencia libre:
  u2net, u2netp, u2net_human_seg (Apache-2.0) · isnet-general-use (Apache-2.0).

  py quitar_fondo.py <config.json> <salida.json>

config = { "entrada": "C:/.../clip.mp4", "salida": "C:/.../clip-sinfondo.webm" | ".png" | carpeta para secuencia,
           "modelo": "u2net", "formato": "webm" | "prores" | "png" | "secuencia", "ffmpeg": "ruta", "lado": 720 }
Vídeo: fotogramas por tubería (rawvideo) → máscara → WebM VP9 con alfa (yuva420p), ProRes 4444 con alfa o PNG.
Los modelos se guardan en U2NET_HOME (lo fija el editor: datos de la app / modelos).
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
from rembg import new_session, remove

conf = json.load(open(sys.argv[1], encoding='utf8'))
ent, sal = conf['entrada'], conf['salida']
fmt = conf.get('formato', 'webm')
lado = int(conf.get('lado', 720))
ff = conf.get('ffmpeg')
if not ff:
    import imageio_ffmpeg  # ffmpeg completo (rawvideo, VP9 con alfa, ProRes 4444)
    ff = imageio_ffmpeg.get_ffmpeg_exe()
print('PROGRESO 0/1 Cargando el modelo', flush=True)
ses = new_session(conf.get('modelo', 'u2net'))


def mascara(img: Image.Image) -> Image.Image:
    """Máscara alfa calculada a menor tamaño (rápido) y escalada al original."""
    w, h = img.size
    k = min(1.0, lado / max(w, h))
    peq = img.resize((max(1, int(w * k)), max(1, int(h * k))), Image.BILINEAR) if k < 1 else img
    m = remove(peq, session=ses, only_mask=True, post_process_mask=True)
    return m.resize((w, h), Image.BILINEAR) if k < 1 else m


es_img = os.path.splitext(ent)[1].lower() in ('.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif')
if es_img:
    img = Image.open(ent).convert('RGB')
    out = img.convert('RGBA')
    out.putalpha(mascara(img))
    out.save(sal)
    json.dump({'salida': sal, 'fotogramas': 1}, open(sys.argv[2], 'w', encoding='utf8'))
    sys.exit(0)

# vídeo: tamaño, fps y número de fotogramas
pr = subprocess.run([ff, '-hide_banner', '-i', ent], capture_output=True, text=True, encoding='utf8', errors='ignore').stderr
import re
m = re.search(r'Video:.*?(\d{2,5})x(\d{2,5})', pr)
w, h = int(m.group(1)), int(m.group(2))
fm = re.search(r'(\d+(?:\.\d+)?) fps', pr)
fps = fm.group(1) if fm else '30'
dm = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', pr)
dur = int(dm.group(1)) * 3600 + int(dm.group(2)) * 60 + float(dm.group(3)) if dm else 0
total = max(1, int(dur * float(fps)))

lee = subprocess.Popen([ff, '-v', 'error', '-i', ent, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
if fmt == 'secuencia':
    os.makedirs(sal, exist_ok=True)
    esc = None
else:
    cod = {
        'webm': ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '4M', '-auto-alt-ref', '0', '-row-mt', '1'],
        'prores': ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le'],
    }[fmt]
    esc = subprocess.Popen([ff, '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{w}x{h}', '-r', fps, '-i', '-', *cod, sal], stdin=subprocess.PIPE)
n = 0
tam = w * h * 3
while True:
    b = lee.stdout.read(tam)
    if len(b) < tam:
        break
    img = Image.frombytes('RGB', (w, h), b)
    a = np.asarray(mascara(img))
    rgba = np.dstack([np.asarray(img), a]).astype(np.uint8)
    if esc:
        esc.stdin.write(rgba.tobytes())
    else:
        Image.fromarray(rgba, 'RGBA').save(os.path.join(sal, f'{n:05d}.png'))
    n += 1
    if n % 5 == 0:
        print(f'PROGRESO {min(n, total - 1)}/{total} Quitando el fondo', flush=True)
lee.wait()
if esc:
    esc.stdin.close()
    esc.wait()
json.dump({'salida': sal, 'fotogramas': n, 'ancho': w, 'alto': h, 'fps': fps}, open(sys.argv[2], 'w', encoding='utf8'))
