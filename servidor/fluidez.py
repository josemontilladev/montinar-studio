"""
Fluidez: detecta fotogramas repetidos (tirones) y congelados en un vídeo.

  py fluidez.py <config.json> <salida.json>      config = { "archivo": "...mp4" }
  py fluidez.py --cli video.mp4                 (informe en texto)

Se decodifica a gris pequeño (PyAV) y se mide la diferencia media con el fotograma anterior.
- «repetido en movimiento» (tirón): diferencia < 30 % de la de sus vecinos (±4) cuando éstos se mueven. Es lo que se nota como
  saltos: tomas ralentizadas sin fotogramas suficientes o capturas irregulares.
- «congelado»: tramos > 1 s sin ningún cambio (pausas; pueden ser intencionadas).
- «negro»: tramos > 0,25 s con luminancia media < 6.
"""
import json, sys
import numpy as np
import av

cli = sys.argv[1] == '--cli'
archivo = sys.argv[2] if cli else json.load(open(sys.argv[1], encoding='utf8'))['archivo']

c = av.open(archivo)
st = c.streams.video[0]
st.thread_type = 'AUTO'
fps = float(st.average_rate or 30)
dif, luz = [], []
prev = None
for fr in c.decode(st):
    g = fr.reformat(width=96, height=max(2, int(96 * fr.height / fr.width) // 2 * 2), format='gray').to_ndarray().astype(np.float32)
    luz.append(float(g.mean()))
    dif.append(0.0 if prev is None else float(np.abs(g - prev).mean()))
    prev = g
c.close()
n = len(dif)
d = np.array(dif)
EPS = 0.08  # por debajo: idéntico (salvo ruido de compresión)
MOV = 0.6   # por encima: hay movimiento

tirones = []
for i in range(1, n):
    vec = np.concatenate([d[max(1, i - 4):i], d[i + 1:i + 5]])
    if not len(vec):
        continue
    med = float(np.median(vec))
    # repetido (o casi: grano, subtítulos…) mientras alrededor hay movimiento claro
    if med > MOV and d[i] < max(EPS, 0.3 * med):
        tirones.append(i)


def tramos(idx, min_len):
    out, ini, ant = [], None, None
    for i in idx:
        if ini is None:
            ini = ant = i
        elif i == ant + 1:
            ant = i
        else:
            if ant - ini + 1 >= min_len:
                out.append((ini, ant))
            ini = ant = i
    if ini is not None and ant - ini + 1 >= min_len:
        out.append((ini, ant))
    return out


congelados = tramos([i for i in range(1, n) if d[i] < EPS], int(fps * 1.0))
negros = tramos([i for i in range(n) if luz[i] < 6], int(fps * 0.25))
# agrupar tirones cercanos en zonas (para el informe)
zonas = []
for i in tirones:
    if zonas and i - zonas[-1][1] <= int(fps * 0.5):
        zonas[-1][1] = i
        zonas[-1][2] += 1
    else:
        zonas.append([i, i, 1])
res = {
    'fps': fps,
    'fotogramas': n,
    'duracion': n / fps,
    'repetidos': int((d[1:] < EPS).sum()),
    'tirones': len(tirones),
    'zonasTirones': [{'desde': a / fps, 'hasta': b / fps, 'n': k} for a, b, k in zonas],
    'congelados': [{'desde': a / fps, 'hasta': (b + 1) / fps} for a, b in congelados],
    'negros': [{'desde': a / fps, 'hasta': (b + 1) / fps} for a, b in negros],
}
if cli:
    print(f"{archivo}: {n} fotogramas a {fps:g} fps · {res['repetidos']} idénticos al anterior · {len(tirones)} tirones (repetidos en movimiento)")
    for z in res['zonasTirones'][:30]:
        print(f"  tirón {z['desde']:.2f}–{z['hasta']:.2f} s ({z['n']})")
    for z in res['congelados']:
        print(f"  congelado {z['desde']:.2f}–{z['hasta']:.2f} s")
    for z in res['negros']:
        print(f"  negro {z['desde']:.2f}–{z['hasta']:.2f} s")
else:
    json.dump(res, open(sys.argv[2], 'w', encoding='utf8'))
