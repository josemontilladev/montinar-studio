# Licencias de la música y de los modelos incluidos

## Música libre (`recursos/musica/`)

Las 12 pistas son **originales de Montinar Studio**: se sintetizan nota a nota con `herramientas/musica-libre.py`
(osciladores, filtros y ruido; sin muestras, loops ni grabaciones de terceros). Se publican como
**CC0 1.0 (dominio público)** — https://creativecommons.org/publicdomain/zero/1.0/ — : se pueden usar en redes
sociales, anuncios y trabajos comerciales, sin atribución. Se pueden regenerar en cualquier momento:

    py herramientas/musica-libre.py recursos/musica <ruta a ffmpeg>

| Pista | Ánimo | BPM | Licencia |
|---|---|---|---|
| Empuje | Energético | 128 | CC0 (original) |
| Avance | Corporativo | 110 | CC0 (original) |
| Calma | Tranquilo | 80 | CC0 (original) |
| Tarde lenta | Lo-fi | 84 | CC0 (original) |
| Cumbre | Épico | 90 | CC0 (original) |
| Pulso | Tecno | 124 | CC0 (original) |
| Sol | Alegre | 118 | CC0 (original) |
| Recuerdo | Emotivo | 72 | CC0 (original) |
| Groove | Funk | 105 | CC0 (original) |
| Niebla | Ambiental | 70 | CC0 (original) |
| Barrio | Urbano | 140 | CC0 (original) |
| Línea | Minimal | 100 | CC0 (original) |

No se ha incluido ninguna pista de terceros: no se podía verificar su licencia desde aquí.

## Modelos y bibliotecas de IA (se descargan la primera vez que se usan)

| Uso | Biblioteca / modelo | Licencia | Origen |
|---|---|---|---|
| Quitar fondo | rembg | MIT | https://github.com/danielgatis/rembg |
| Quitar fondo | U²-Net (u2net, u2netp, u2net_human_seg) | Apache-2.0 | https://github.com/xuebinqin/U-2-Net |
| Quitar fondo | IS-Net (isnet-general-use, DIS) | Apache-2.0 | https://github.com/xuebinqin/DIS |
| Seguimiento | OpenCV contrib (CSRT, KCF) — opencv-contrib-python-headless | Apache-2.0 | https://github.com/opencv/opencv_contrib |
| Subtítulos | faster-whisper | MIT | https://github.com/SYSTRAN/faster-whisper |
| Grabar web | puppeteer-core | Apache-2.0 | https://github.com/puppeteer/puppeteer |
