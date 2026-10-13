"""
Icono de Montinar Studio (original): una «M» geométrica de dos picos cuyo trazo derecho termina en un triángulo de
reproducción, en cian sobre grafito. Genera build/icon.png (1024 px) y build/icon.ico (16–256 px).

  py herramientas/icono-montinar.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 1024
k = S / 512


def P(*pts):
    return [(x * k, y * k) for x, y in pts]


def degradado(w, h, a, b, vertical=True):
    g = Image.new('RGBA', (w, h))
    px = g.load()
    for y in range(h):
        for x in range(w):
            t = (y / (h - 1)) if vertical else ((x + y) / (w + h - 2))
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)
    return g


# fondo: cuadrado redondeado grafito con un brillo frío arriba a la izquierda
fondo = degradado(S // 8, S // 8, (30, 33, 42), (11, 12, 16)).resize((S, S), Image.BICUBIC)
brillo = Image.new('L', (S, S), 0)
ImageDraw.Draw(brillo).ellipse([-S * 0.25, -S * 0.35, S * 0.75, S * 0.55], fill=70)
brillo = brillo.filter(ImageFilter.GaussianBlur(S * 0.12))
fondo = Image.composite(Image.new('RGBA', (S, S), (34, 211, 230, 255)), fondo, brillo.point(lambda v: v // 3))
masc = Image.new('L', (S, S), 0)
ImageDraw.Draw(masc).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.225), fill=255)
icono = Image.new('RGBA', (S, S), (0, 0, 0, 0))
icono.paste(fondo, (0, 0), masc)

# la «M»: pilar izquierdo, primer pico, valle y segundo pico que acaba en ▶
forma = Image.new('L', (S, S), 0)
d = ImageDraw.Draw(forma)
d.polygon(P((112, 392), (112, 150), (164, 120), (256, 238), (256, 318), (164, 210), (164, 392)), fill=255)
d.polygon(P((256, 238), (348, 120), (400, 150), (400, 250), (348, 220), (348, 210), (256, 318)), fill=255)
# triángulo de reproducción (el pie derecho de la M)
d.polygon(P((348, 262), (348, 392), (420, 327)), fill=255)
forma = forma.filter(ImageFilter.GaussianBlur(0.6 * k))
color = degradado(S // 8, S // 8, (64, 232, 245), (14, 150, 196)).resize((S, S), Image.BICUBIC)
# sombra suave debajo de la M
sombra = forma.filter(ImageFilter.GaussianBlur(14 * k)).point(lambda v: int(v * 0.55))
icono.paste(Image.new('RGBA', (S, S), (0, 0, 0, 255)), (0, int(10 * k)), Image.composite(sombra, Image.new('L', (S, S), 0), masc))
icono.paste(color, (0, 0), forma)
# línea de tiempo: tres pastillas bajo la M
d2 = ImageDraw.Draw(icono)
for x0, x1, c in [(112, 196, (64, 232, 245, 255)), (210, 330, (236, 236, 241, 230)), (344, 400, (64, 232, 245, 140))]:
    d2.rounded_rectangle([x0 * k, 420 * k, x1 * k, 440 * k], radius=10 * k, fill=c)

os.makedirs(os.path.join(RAIZ, 'build'), exist_ok=True)
icono.save(os.path.join(RAIZ, 'build', 'icon.png'))
icono.resize((256, 256), Image.LANCZOS).save(os.path.join(RAIZ, 'build', 'icon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
icono.resize((512, 512), Image.LANCZOS).save(os.path.join(RAIZ, 'build', 'icon-512.png'))
print('ok')
