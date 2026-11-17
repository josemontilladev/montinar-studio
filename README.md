<p align="center"><img src="build/icon-512.png" width="120" alt="Montinar Studio" /></p>

# Montinar Studio

Editor de vídeo de escritorio (Windows) para proyectos **Remotion**, de [Montinar](https://montinar.dev). El vídeo se
describe en un `proyecto.json` y se edita en tiempo real: reproductor, línea de tiempo multipista, inspector,
bibliotecas (86 tipografías libres, 100 estilos de texto, animaciones, filtros, efectos, transiciones, pegatinas,
música original CC0), subtítulos automáticos, limpieza de voz, edición por texto, seguimiento de movimiento, quitar
fondo, grabación de pantalla, proxies, exportación en segundo plano con GPU y en varios formatos a la vez.

El manual completo, en español, está en [LEEME.md](LEEME.md).

## Requisitos

- Windows 10/11 x64.
- Para desarrollar: **Node.js 22+** (probado con 24) y Git.
- Opcional, para voz, subtítulos, audio, seguimiento y quitar fondo: **Python 3.11+** con
  `faster-whisper numpy scipy av piper-tts opencv-contrib-python-headless rembg onnxruntime imageio-ffmpeg`
  (la app dice qué falta en Menú → Dependencias).
- Un proyecto Remotion compatible (ver «Hacer compatible otro proyecto Remotion» en el LEEME). Por defecto el editor
  busca `../montilla-video`; se cambia en `editor.config.json` o con `--proyecto`.

## Desarrollo

```bash
npm install
npm run dev            # editor en el navegador → http://localhost:4400
npm run typecheck
npm run app            # la app de escritorio sin empaquetar
```

## Compilar el instalador

```bash
npm run dist           # descarga el navegador incluido si falta (npm run chrome) y crea dist-app/
```

Salen `dist-app/Montinar Studio Setup X.Y.Z.exe` (instalador por usuario, acceso directo en el Escritorio y en
Inicio), la versión portable y `latest.yml` para las actualizaciones. La app no está firmada (ver «Firma de código»
en el LEEME).

## Publicar una versión

Las actualizaciones automáticas leen las releases de este repositorio (público, sin token).

```bash
# 1) sube la versión en package.json y haz commit
npm version 1.3.0 --no-git-tag-version
git commit -am "Versión 1.3.0"
# 2) etiqueta y sube: la acción «Release Windows» compila y crea la release
git tag v1.3.0
git push origin main --tags
```

Alternativa sin Actions, desde este equipo: `set GH_TOKEN=<token>` y `npm run release`.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `app/` | Interfaz (React + Vite) |
| `servidor/` | API local (Express): proyecto, medios, exportación, trabajos en segundo plano, scripts de Python |
| `contrato/` | Esquema del proyecto, línea de tiempo y kit de plantillas compartidos con los proyectos Remotion |
| `electron/` | App de escritorio (ventana, menús, migración, actualizaciones) |
| `recursos/` | Tipografías, música y efectos incluidos (el navegador se descarga con `npm run chrome`) |
| `herramientas/` | Generadores (tipografías, música, icono) y utilidades de línea de comandos |
| `build/` | Icono de la app |

## Licencias

Código: la licencia la decide Montinar (aún sin archivo LICENSE). Tipografías: OFL/Apache ([LICENCIAS-FUENTES.md](LICENCIAS-FUENTES.md)).
Música y modelos: [LICENCIAS-MUSICA-Y-MODELOS.md](LICENCIAS-MUSICA-Y-MODELOS.md).
