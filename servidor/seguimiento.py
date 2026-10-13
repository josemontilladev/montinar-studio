"""
Seguimiento de movimiento (OpenCV CSRT o KCF, opencv-contrib-python-headless, Apache-2.0).

  py seguimiento.py <config.json> <salida.json>

config = { "video": "C:/.../toma.mp4", "tiempos": [s0, s1, ...], "caja": [x, y, w, h] (px del vídeo en tiempos[0]),
           "metodo": "csrt" | "kcf" }
salida = { "centros": [[cx, cy, ok], ...] (uno por tiempo), "ancho": vw, "alto": vh }
"""
import json, sys
import cv2

conf = json.load(open(sys.argv[1], encoding='utf8'))
cap = cv2.VideoCapture(conf['video'])
if not cap.isOpened():
    raise SystemExit('No se puede abrir el vídeo')
fps = cap.get(cv2.CAP_PROP_FPS) or 30
vw, vh = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
tiempos = conf['tiempos']
n = len(tiempos)

pos = -1  # índice del último fotograma leído
actual = None


def fotograma(t):
    """Fotograma en el instante t (lectura secuencial si avanza; salto si retrocede o se aleja mucho)."""
    global pos, actual
    i = max(0, int(round(t * fps)))
    if i < pos or i > pos + 90:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        pos = i - 1
        actual = None
    while pos < i:
        ok, f = cap.read()
        if not ok:
            break
        pos += 1
        actual = f
    return actual


crear = cv2.TrackerKCF_create if conf.get('metodo') == 'kcf' else cv2.TrackerCSRT_create
tr = crear()
f0 = fotograma(tiempos[0])
x, y, w, h = [int(round(v)) for v in conf['caja']]
tr.init(f0, (x, y, max(4, w), max(4, h)))
centros = [[x + w / 2, y + h / 2, 1]]
ultimo = centros[0]
for k in range(1, n):
    f = fotograma(tiempos[k])
    if f is None:
        centros.append([ultimo[0], ultimo[1], 0])
        continue
    ok, b = tr.update(f)
    if ok:
        ultimo = [b[0] + b[2] / 2, b[1] + b[3] / 2, 1]
        centros.append(ultimo)
    else:
        centros.append([ultimo[0], ultimo[1], 0])
    if k % max(1, n // 40) == 0:
        print(f'PROGRESO {k}/{n} Siguiendo', flush=True)
json.dump({'centros': [[round(a, 2), round(b, 2), c] for a, b, c in centros], 'ancho': vw, 'alto': vh, 'fps': fps}, open(sys.argv[2], 'w', encoding='utf8'))
