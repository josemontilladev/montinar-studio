# Montinar Studio: editor de vídeo para proyectos Remotion

> **Copia para MétricaSEO** (17 nov 2026), traída de `stack web\proyectos\editor-video`. Abre por defecto
> `../metricaseo-promo/editables/promo-agencias-16x9`; cada pieza del kit (21 videos y 24 posts) es un proyecto en
> `../metricaseo-promo/editables/<id>`. Atajo: `..\Editor de video.cmd [id]`. Cambios respecto al original: Remotion
> 4.0.543 (la del kit), Vite también sirve la carpeta raíz del código del proyecto (`../../src`) y el proyecto por
> defecto. Detalles en `../metricaseo-promo/README.md` (sección «editar los videos y los posts»).


Editor local, en tiempo real, para los vídeos que hacemos con Remotion. El vídeo entero se describe en un
`proyecto.json`; el editor lo enseña en un reproductor (`@remotion/player`) y cada cambio se ve al instante, sin
renderizar. Exporta con `@remotion/renderer` en segundo plano. Primer proyecto: `../montilla-video`.

## Abrirlo

```
cd editor-video
npm install          # solo la primera vez
npm run dev          # → http://localhost:4400
```

`npm run dev` arranca un solo proceso: la API (archivos, voz, exportación) y la interfaz (Vite).
Otro proyecto u otro puerto: `npm run dev -- --proyecto ../otro-video --puerto 4401`
(o `editor.config.json`, o las variables `PROYECTO` y `PORT`).

Requisitos: Node 22+, Edge/Chrome. Para regenerar voces, lo que pida el script de voz del proyecto
(en Montilla: Python 3 con `piper-tts faster-whisper numpy`, ver su LEEME).

## App de escritorio: Montinar Studio

- **Instalar**: `dist-app/Montinar Studio Setup X.Y.Z.exe` (o la última release de https://github.com/josemontilladev/montinar-studio/releases) (se instala para el usuario, sin permisos de
  administrador, y crea accesos directos en el Escritorio y en el menú Inicio). También hay una versión
  **portable**: `dist-app/Montinar Studio X.Y.Z portable.exe` (no instala nada).
- Windows puede mostrar «Windows protegió su PC» (SmartScreen) porque la app no está firmada: «Más información» →
  «Ejecutar de todas formas».
- Al abrir enseña una pantalla de carga, arranca el servidor del editor por dentro (no hace falta navegador) y abre
  el último proyecto (por defecto `montilla-video`). **Menú** (arriba a la izquierda): Abrir proyecto…,
  Proyectos recientes, Guardar y crear versión, Versiones, Exportar, Fotograma PNG, Abrir carpeta de salida,
  Revisión, Dependencias, Atajos y Salir. Solo se puede abrir una vez; al cerrar se paran también los renders y
  trabajos de voz en curso.
- Trae Node (Electron), Remotion, ffmpeg y **Chrome Headless Shell** (exporta sin conexión). Lo externo es
  **Python** con `piper-tts`, `faster-whisper`, `numpy`, `scipy` y `av` (voz, subtítulos automáticos, audio y
  fluidez). **Menú → Dependencias** dice qué está instalado y cómo instalar lo que falte.
- Datos de la app (caché, kits de marca, recientes): `%APPDATA%\Montinar Studio`.
- **Venías de «Montilla Studio»**: el primer arranque COPIA los datos de `%APPDATA%\Montilla Studio` (recientes,
  biblioteca, kits de marca, ajustes, favoritos, modelos, diarios) y los proyectos de `Documentos\Montilla Studio` a
  `Documentos\Montinar Studio`. Lo viejo no se borra (queda como copia de seguridad); el registro está en
  `%APPDATA%\Montinar Studio\migracion.log` y no se repite.
- Nombre, proyecto por defecto y puerto: `electron/estudio.config.json`. Volver a generar los instaladores:
  `npm run dist` (salen en `dist-app/`). Probar sin empaquetar: `npm run app`.

## La pantalla

| Zona | Qué hay |
|---|---|
| Barra de título | Menú, «Guardado automático», nombre del proyecto, deshacer/rehacer, **Voz** (activada/desactivada), Revisión, Atajos y **Exportar** |
| Recursos (izquierda) | Pestañas **Medios** (miniaturas con duración, «En uso», buscar, filtro, lista/cuadrícula, importar o arrastrar archivos), **Audio** (música, efectos originales, voces y auto-edición), **Texto**, **Plantillas** (por categorías), **Efectos** (luz, Ken Burns, zoom a un punto, golpe de zoom, rampas, brillo), **Transiciones**, **Subtítulos** (automáticos y estilos) y **Marca** |
| Reproductor (centro) | Vista previa, barra de posición, tiempo `hh:mm:ss:ff`, play, zonas seguras, proporción (9:16, 4:5, 1:1, 16:9), ajustar y pantalla completa; menú con bucle y zoom |
| Inspector (derecha) | Pestañas según lo seleccionado: escena (Vídeo · Básico/Tomas/Plantilla, Animación, Ajuste), texto (Texto, Animación), voz (Voz, Mezcla), música (Música, Mezcla, Ritmo), proyecto (Proyecto, Marca). Secciones plegables; «Posición y tamaño» con rombos de fotograma clave |
| Línea de tiempo (abajo) | Herramientas (selección/cuchilla, dividir, recortar a izquierda/derecha, borrar, congelar, duplicar, imán, zoom), pistas Escenas (tira de miniaturas), Textos, Subtítulos (bloques + palabras), Voz, Música y SFX con bloquear / ocultar / silenciar, y «Portada» |

Los paneles se pueden redimensionar arrastrando los separadores. Medios y plantillas se arrastran a la pista
Escenas: encima de un clip cambian su toma; entre clips o al final crean una escena nueva.

### Línea de tiempo

- La pista **Escenas** es magnética: las escenas van una tras otra (*ripple*). Arrastrar un clip lo cambia de
  orden; su voz y sus efectos se van con él.
- **Recortar**: arrastra el borde derecho (duración) o el izquierdo (punto de entrada, se recorta el principio).
- **Dividir** (S) en el cursor, **Duplicar** (Ctrl+D), **Borrar** (Supr). Borrar una escena borra también su voz y
  sus efectos (Ctrl+Z lo devuelve).
- El **rombo** entre dos clips es la transición de entrada de la escena de la derecha: clic → tipo (corte, fundido,
  círculo, cortina, empuje, zoom, scroll) y duración. La zona rayada del clip es lo que dura.
- Textos, frases de voz y efectos se arrastran para moverlos; los textos también se recortan por los bordes.
  Un texto con ⚓ está **anclado a una palabra** de la voz (se mueve solo si la voz cambia); al arrastrarlo pasa a un
  fotograma fijo.
- **Imán**: al arrastrar se pega al cabezal, a los cortes, a otras piezas y al inicio de cada palabra.
- Zoom: deslizador, + / −, o Ctrl + rueda. Clic en la regla = mover el cabezal.

### Atajos

Espacio reproducir · ← → fotograma (Mayús: 1 s) · ↑ ↓ corte anterior/siguiente · Inicio/Fin · S dividir ·
Q / W recortar a la izquierda / derecha del cursor · A / B selección / cuchilla ·
Supr borrar · Ctrl+D duplicar · Ctrl+Z / Ctrl+Mayús+Z / Ctrl+Y · Ctrl+S guardar versión · Ctrl+E exportar ·
L bucle · G zonas seguras · F pantalla completa · Esc quitar selección · ? ayuda.
Ctrl+clic añadir a la selección (edición por lotes) · Ctrl+Alt+C / Ctrl+Alt+V copiar / pegar estilo de texto ·
Ctrl+Alt+A estilo en todos los titulares · T tipografías del texto · Intro editar el texto en el visor ·
clic derecho menú del clip, texto o elemento.

## Editar

- **Textos**: selecciona el clip (o en el inspector de la escena) y cambia contenido, fuente, tamaño, color y acento
  (de la paleta), alineación, animación (máscara, fundido, pop, máquina, ninguna), posición y tiempos.
  En el texto, `/` es salto de línea y `*palabra*` es la palabra con acento (serif cursiva).
- **Escena**: plantilla, duración, punto de entrada, fondo, marco de dispositivo (sí/no), transición, **tomas**
  (archivo de `public/` o subido, inicio, velocidad, entrada/salida), **cámara** (claves de zoom: «+ Clave en el
  cursor», y otra más adelante con más zoom) y los parámetros propios de la plantilla (JSON).
- **Medios**: clic en un medio = usarlo en la escena seleccionada (o la del cursor); **+** = escena nueva con él.
  Si falta un archivo, el visor muestra un recuadro rojo «Medio no encontrado» y el inspector del proyecto lo lista.
- **Proyecto** (pestaña Proyecto del inspector): `SITE_URL`, WhatsApp, texto legal, **paleta**, fondo, viñeta,
  grano y zonas seguras. Cambiar `SITE_URL` aquí cambia la barra del navegador y la tarjeta final al momento.
- **Música**: archivo, volumen, *ducking* (volumen bajo la voz, márgenes y rampa) y fundidos.
- **Subtítulos**: visibles o no, palabras/letras por bloque, fuente, tamaño, altura y colores.

Todo es deshacible (Ctrl+Z, hasta 300 pasos; un arrastre o una escritura seguida cuenta como un paso).

### Regenerar la voz de una frase

1. Clic en la frase en la pista **Voz** (o en Biblioteca → Voces).
2. Cambia el texto (y, si hace falta, la «pronunciación»: comas para respirar, palabras escritas a la española) y,
   si quieres, la voz (las de Piper instaladas en el proyecto).
3. **Regenerar voz**. Corre en segundo plano (barra de progreso, se puede cancelar): se escribe el texto en
   `guion.json`, se ejecuta el script de voz solo para esa frase (Piper genera varias tomas y se queda la que mejor
   entiende whisper) y se alinean las palabras con faster-whisper. Al terminar, la frase usa el audio nuevo
   (`public/voz/tomas/<id>-<fecha>.wav`) y los subtítulos se actualizan solos. Con «Ajustar la duración de la escena»
   la escena crece o encoge lo mismo que la frase.
4. La toma anterior queda en «Tomas anteriores» (se puede escuchar y volver a ella con **Usar**).

Los archivos de trabajo del script (`public/voz/<id>.wav`, `tiempos.json`) se dejan como estaban, así las versiones
anteriores de `proyecto.json` siguen sonando igual.

## Guardado y versiones

- Se guarda solo en `proyecto.json` un segundo después de cada cambio (indicador arriba). El servidor valida el JSON
  con zod antes de escribir y escribe de forma atómica.
- Antes de sobrescribir guarda una copia en `.versiones/` del proyecto (como mucho cada 3 min; **Ctrl+S** fuerza una).
  **Versiones** las lista y las restaura (y eso también se puede deshacer). Se conservan las 80 últimas.
- El navegador guarda además una copia local: si el servidor se cae o se cierra la pestaña sin guardar, al volver a
  abrir aparece «Hay cambios de una sesión anterior… Recuperar».
- Si `proyecto.json` no es válido, el editor lo dice (qué campo falla) y ofrece recuperar una versión anterior.

## Exportar

**Exportar** → formato (9:16 1080×1920; 1:1 1080×1080 y 16:9 1920×1080 con el lienzo vertical encajado sobre fondo de
papel), calidad (**Alta** = H.264 10 Mbps + AAC 192k, igual que `npm run render`; **Media** CRF 20; **Borrador** a
mitad de tamaño) y rango (todo, la escena seleccionada o unos fotogramas). Se renderiza en un proceso aparte con
progreso y botón de cancelar; al terminar, «Abrir vídeo» y «Carpeta». Las salidas van a `out/editor/` del proyecto.
La primera exportación prepara el *bundle* (un par de minutos); las siguientes lo reutilizan mientras no cambien
`src/` ni `public/`. **Fotograma PNG** renderiza el fotograma del cursor.

## Bibliotecas y edición rápida

Todo está en el panel izquierdo, con búsqueda, categorías, ★ favoritos y recientes (se recuerdan en este equipo).
Las fichas se dibujan solo cuando se ven (tipografías y miniaturas perezosas).

| Biblioteca | Cuántos | Dónde |
|---|---|---|
| Tipografías libres (OFL / Apache, sin conexión) | 86 · Sans 22, Serif 14, Display 18, Manuscrita 14, Mono 8, Condensada 10 | Texto → Fuentes (o T con un texto seleccionado) |
| Estilos de texto (fuente + color + contorno + sombra + fondo/burbuja + degradado) | 100 + «Mis estilos» | Texto → Estilos |
| Animaciones de texto | 41 · 22 de entrada, 10 de salida, 9 en bucle | Texto → Animaciones (vista previa al pasar el ratón) |
| Estilos de subtítulos (un clic = todos) | 26 | Subtítulos → Estilos |
| Filtros de color con intensidad | 32 | Filtros (miniatura del fotograma actual) |
| Efectos combinables | 37 | Efectos → Biblioteca |
| Transiciones | 32 | Transiciones |
| Elementos SVG originales y recoloreables | 50 · formas, flechas, líneas, insignias, bocadillos, progreso, rótulos, redes | Elementos |

- **Pasar el ratón** por un filtro, efecto, transición o estilo de subtítulos lo muestra en el reproductor sin aplicarlo.
- **Tipografías**: al usar una, se copia a `public/fuentes/` del proyecto y se registra en `ajustes.fuentesExtra`, así
  el vídeo se exporta igual sin conexión. Licencias de cada familia en `LICENCIAS-FUENTES.md`.
- **Guardar como estilo** (inspector del texto o clic derecho) añade el aspecto actual a «Mis estilos».
- **En el visor**: clic selecciona, arrastrar mueve (Mayús = en un eje), la esquina cambia el tamaño, el asa de arriba
  gira (Mayús = de 15 en 15°), doble clic edita el texto ahí mismo (Intro guarda, Mayús+Intro nueva línea, Esc cancela).
- **Clic derecho** en escenas, textos y elementos: dividir, duplicar, filtros, efectos, transición, copiar/pegar estilo,
  estilo en todos, guardar estilo, traer al frente, borrar…
- **Lote**: Ctrl+clic en varias escenas o textos y el inspector cambia todos a la vez (tamaño, color, fuente, animación,
  filtro, transición, duración).
- **Inspector del texto**: contorno, sombra, fondo (caja, burbuja, cinta, subrayado, marco), degradado, grosor,
  espaciado, mayúsculas, cursiva y giro; cada sección con su botón de restablecer. Deshacer (Ctrl+Z) sirve para todo.
- **Marca → Aplicar la marca a todo**: devuelve todos los textos a las fuentes de la marca y pasa los colores sueltos a
  la paleta; después, cambiar la paleta o aplicar un kit cambia el vídeo entero de una vez.
- Los vídeos ya hechos se ven idénticos: los estilos nuevos solo se activan en los textos que los usan.

## Funciones profesionales (fase 2)

### Subtítulos automáticos
Inspector → **Subtítulos** → «Transcribir (español)»: faster-whisper en local con tiempo por palabra. Fuente: la voz
del proyecto (cada frase; con «escribir como el guion» se respeta la ortografía del guion y solo se toman los tiempos)
u **otro audio/vídeo** de public/ (pista propia). Estilos: **Resaltado** (caja, palabra que suena con fondo de color),
**Karaoke** (relleno de color al decirse), **Pop** (palabra a palabra, grande), **Limpio** (dos líneas con sombra).
Fuente y colores de marca, palabras/letras por bloque, letras por línea (salto automático), posición **sobre la zona
segura** o manual, aviso de velocidad de lectura. En la línea de tiempo, la pista Subtítulos tiene dos filas: bloques y
**palabras** (doble clic = corregir, arrastrar = mover, bordes = reajustar). Exportar **.srt / .vtt**.

### Kit de marca y plantillas
- **Marca** (inspector → Proyecto): nombre, logo, eslogan, botón/CTA y fuentes. «Guardar kit» la guarda en
  `editor-video/marcas/` para **aplicarla en otros proyectos** (paleta, fuentes, logo, web, WhatsApp).
- **Kit de plantillas** (Biblioteca → Plantillas, sirven para cualquier proyecto con el contrato): Gancho cinético,
  Escaparate de dispositivo (3D), Antes/después (barrido), Lista/pasos, Testimonio, Llamada a la acción, Intro y
  Cierre de marca (botones «Intro al principio» / «Cierre al final»). Se editan con un formulario («Contenido»).
  Viven en `contrato/kit/` y trabajan en segundos (valen a cualquier fps).

### Movimiento
Inspector de escena → «Cámara y movimiento»: claves con **curva** (suave, lineal, expo, quint, muelle; con dibujo),
**Ken Burns**, **Zoom a un punto** (clic en el visor: acerca, mantiene y vuelve), **desenfoque de movimiento**
direccional en movimientos rápidos, **destellos de luz** (cálida, fría, neón), **rampas de velocidad** en las tomas
(acelerar, frenar, impulso; nunca por debajo de 1×) y resplandor en los textos. Transiciones: corte, match cut,
fundido, desenfoque, círculo, cortina, empuje, látigo (con desenfoque), deslizar, zoom y scroll, cada una con su
duración por defecto coherente.

### Audio
- **Mejorar voz** (por frase o todas): paso alto, reducción de ruido espectral, presencia, compresión y −16 LUFS.
  Cada frase guarda su toma anterior.
- **Mezcla y sonoridad** (inspector → Música): mide la mezcla (render solo de audio + BS.1770) y **normaliza** a
  −14 LUFS (redes) o −16 (voz) sin pasar de −1 dBFS. *Ducking* automático de la música bajo la voz.
- **Ritmo**: detecta los pulsos de la música (se ven en su pista y el imán se pega a ellos) y «Ajustar cortes al ritmo».
- **Biblioteca de efectos originales** (Biblioteca → Audio): whoosh, swish, clic, pop, subida, impacto, ding, tic,
  sintetizados en local (`recursos/sfx/`), libres de derechos.

### Revisión antes de exportar
Botón **Revisión** (y resumen dentro de Exportar): textos fuera de la zona segura de cada plataforma (Reels, TikTok,
Shorts, Stories), poco contraste, textos demasiado breves, subtítulos rápidos (> 17 car./s) o bajo la interfaz,
duración por plataforma, medios que faltan, frases sin audio, sonoridad y picos, **fluidez** de la última exportación
(fotogramas repetidos en movimiento, pausas, negros) y transiciones más largas que su escena. Arreglos en un clic
cuando se puede.

### Exportar por plataforma
Reels / TikTok / Shorts (9:16), Feed 4:5 y 1:1 (**reencuadre automático**: se recorta al foco de cada escena y los
textos se recolocan dentro) y YouTube 16:9 (encajado). H.264 o H.265, calidad, subtítulos quemados o **aparte**
(.srt/.vtt junto al vídeo), rango, «Exportar 3 formatos» de una vez (cola de render: uno detrás de otro) y
**miniatura/portada** con título, logo y web. Después de cada exportación se comprueba la **fluidez**.

### Extras
- «Compactar pausas entre frases» (Biblioteca → Voces → Auto-edición).
- **Versiones con nombre** (Versiones → «Guardar con nombre»), además de las automáticas.
- **Voz activada / desactivada** (barra superior): sin voz no suena (se conserva) y la música no se agacha.
  «Adaptar para sin voz» alarga frases y escenas para que los subtítulos se lean cómodos (≤ 15 car./s) y lleva los
  cortes al pulso de la música.

### Herramientas de línea de comandos
```
npx tsx herramientas/cambiar-fps.ts ../montilla-video/proyecto.json 60       # cambia fps conservando tiempos
npx tsx herramientas/sin-voz.ts ../montilla-video/proyecto.json ../montilla-video/proyecto-sinvoz.json
npx tsx herramientas/sonoridad.ts ../montilla-video proyecto-sinvoz.json -14  # mide y normaliza la mezcla
py servidor/fluidez.py --cli video.mp4                                       # tirones, pausas y negros
npm run dev -- --archivo proyecto-sinvoz.json                                # abrir otra versión del proyecto
```
Python local (sin servicios de pago): `faster-whisper`, `numpy`, `scipy`, `av`.

## Fase 3: velocidad, edición rápida, flujo y entrega

### Velocidad y estabilidad
- **Proxies**: los vídeos pesados (más de 1080p, más de 60 MB o más de 25 Mb/s) generan solos, al importarlos, una copia
  ligera de 540p (H.264 «todo intra», se busca al instante) en la caché. La vista previa la usa (chip «Proxy» en Medios);
  la exportación siempre usa el original. Menú del reproductor: «Usar proxies» (interruptor) y «Generar proxies de los
  vídeos pesados»; en cada vídeo, botón ⚡ para generarlo a mano.
- **Recuperación**: cada 3 s se guarda un diario de la sesión (proyecto, cursor, selección, vista). Si la app se cierra
  de golpe, al volver aparece «La sesión anterior se cerró de forma inesperada · Restaurar como estaba».
- **Exportar en segundo plano**: la cola sigue mientras editas; el progreso sale en la barra de título y en el icono de
  la barra de tareas, y al terminar llega un aviso de Windows (clic = abre la carpeta con el vídeo).
- **GPU**: Exportar → «Aceleración por hardware» (Automática / Desactivada / NVENC / Quick Sync / AMF) y «Probar
  velocidad». Si la GPU falla, el render se repite solo con la CPU. En este equipo (RTX 5060): NVENC 203 fps frente a
  178 fps de x264 «slow» solo codificando; en una exportación completa casi no cambia, porque lo lento es dibujar los
  fotogramas, no codificarlos.

### Edición más rápida
- **Limpiar la voz** (Audio → Voces): busca pausas largas (umbral ajustable) y muletillas («eh», «mmm», «este» aislado…)
  con los tiempos por palabra y la energía del audio; lista con casillas y ▶ para oír cada corte; «Quitar» crea una toma
  nueva de cada frase (la anterior queda guardada) y acorta las escenas. Ctrl+Z lo deshace todo de una vez.
- **Edición por texto** (Subtítulos → Transcripción): clic en una palabra = ir a ella; arrastrar o Mayús+clic =
  seleccionar; Supr = cortar esas palabras del audio y del vídeo en cadena.
- **Seguir movimiento** (inspector del texto → Animación, o del elemento): «Elegir zona» y dibujar un recuadro en el
  visor; OpenCV (CSRT preciso o KCF rápido) lo sigue y el texto o la pegatina se mueven con él. Arrastrar en el visor
  corrige la posición de ese fotograma. Pensado para tomas a pantalla completa.
- **Quitar fondo** (Medios, botón ✨ en imágenes y vídeos; modelo y formato en el desplegable «Fondo»): rembg con
  modelos libres (general, preciso, personas, rápido). Vídeo → WebM con transparencia (o ProRes 4444 / PNG); queda en
  `…/sin-fondo/` y se reutiliza si ya se hizo. La primera vez descarga el modelo (4–170 MB).
- **Grabar pantalla y cámara** (Medios → 🖥, o Menú): pantalla o ventana (con miniaturas en la app), cámara en una
  esquina y micrófono; al parar se convierte a MP4 y aparece en Medios (`grabaciones/`).

### Flujo de trabajo
- **Inicio** (Menú → Inicio, o Ctrl+Mayús+H en la app): proyectos recientes con miniatura, buscar, duplicar,
  renombrar, mover a la papelera (se puede recuperar; nunca se borra de verdad) y proyectos nuevos desde plantilla:
  Reel 9:16, Short, Anuncio 4:5, Cuadrado 1:1, Horizontal 16:9 y Presentación de web. Los nuevos van a
  `Documentos\Montinar Studio\` y comparten las dependencias del proyecto actual (enlace de carpeta, no ocupan espacio).
- **Vídeo promocional de una web** (Inicio): pega la dirección de una web propia (marca la casilla), y la app la graba
  con el reloj virtual a 60 fps (portada, recorrido en móvil, escritorio y tres secciones), toma los titulares de la
  página y monta un proyecto «Presentación de web» con música. Respeta robots.txt y se para si la página pide
  contraseña. Tarda unos minutos.
- **Varios formatos**: elige 1:1, 4:5 o 16:9 en el reproductor y aparece «Reencuadre» (llenar o encajar, zoom y
  posición de cada escena). Exportar → «Los 4 formatos» manda 9:16, 1:1, 4:5 y 16:9 a la cola.
- **Biblioteca compartida** (Marca → Compartida): logos, música, efectos, tipografías propias y escenas plantilla
  para todos los proyectos (en `%APPDATA%\Montinar Studio\biblioteca`); «Usar» lo copia al proyecto. Exportar /
  importar como .zip (al importar se guarda antes una copia de seguridad en `copias\`).

### Calidad y entrega
- **Música libre** (Audio → Música): 12 pistas originales (CC0) por ánimo y BPM, con vista previa y forma de onda;
  «Usar» la pone con sus golpes exactos y «Encajar los cortes al ritmo» mueve los cortes al golpe más cercano.
  Licencias en `LICENCIAS-MUSICA-Y-MODELOS.md`.
- **Actualizaciones**: ver abajo. **Firma de código**: ver abajo.

## Actualizaciones automáticas

La app instalada se actualiza sola: al abrirse (a los 15 s), cada 3 horas mientras está abierta y en
Menú → «Buscar actualizaciones» mira si hay una versión nueva en el **origen de actualizaciones**. Si la hay, la
descarga en segundo plano y avisa abajo a la derecha: «Hay una versión nueva (X) · **Actualizar y reiniciar**», con
«Novedades» si la versión trae notas. «Actualizar y reiniciar» guarda antes el proyecto (con copia en Versiones) y no
reinicia si hay una exportación u otro trabajo en marcha; si no se pulsa, se instala al cerrar la app.

**Qué hay que hacer tras cambiar el código.** Los cambios se hacen en el código, así que hace falta publicarlos una
vez; a partir de ahí cada app instalada se actualiza sola. Es un solo comando:

```bash
npm run release                          # 2.2.0 → 2.2.1: comprueba tipos, compila el instalador y lo publica
npm run release -- minor                 # 2.2.0 → 2.3.0   (también major, o una versión exacta: 2.4.0)
npm run release -- --notas "Qué cambia"  # texto que la app enseña en «Novedades»
```

Tarda unos minutos (el instalador pesa unos 300 MB). Después, `git commit -am "Versión X"`.

**El origen.** Está en `electron/estudio.config.json → actualizaciones`. Por defecto son dos carpetas:

```json
{ "proveedor": "carpeta", "rutas": ["dev/Metrica SEO/studio-actualizaciones", "C:/Users/KronnicxZ/Instaladores/MetricaSEO Studio/actualizaciones"] }
```

- La primera está dentro de `dev`, que Syncthing lleva a todos los equipos. Es relativa: se resuelve desde la carpeta
  personal de cada equipo (`C:\Users\<usuario>\dev\…`), así vale aunque el usuario de Windows se llame distinto.
- La segunda es la carpeta local de antes; se mantiene para equipos que no sincronicen `dev`.
- La app usa la que tenga la versión más alta **completa**: con Syncthing, `latest.yml` puede llegar antes que el
  instalador, y hasta que el instalador no está entero (del tamaño que dice `latest.yml`) no se intenta descargar.
  Al descargar, electron-updater comprueba además su huella SHA-512.

`npm run release` deja en la primera carpeta (y en las demás que ya existan en este equipo) el instalador, su
`.blockmap` y `latest.yml`, solo la última versión. Copia cada archivo con un nombre acabado en `~` (Syncthing no lo
sincroniza) y lo renombra al final, y escribe `latest.yml` el último. No sale nada a internet: la app sirve la carpeta
a su actualizador por una dirección que solo existe dentro del equipo (127.0.0.1). Otros orígenes posibles:

- **Otra carpeta sincronizada o de red**: dentro de `dev` no puede llamarse `build`, `dist`, `out`, `bin` ni `target`
  (Syncthing las ignora), y cada versión son unos 300 MB que se sincronizan.
- **Servidor propio** (por ejemplo un bucket con dominio): `{ "proveedor": "generic", "url": "https://…/studio/" }`.
  `npm run release` compila y dice qué tres archivos hay que subir; no sube nada.
- **GitHub**: `{ "proveedor": "github", "owner": "…", "repo": "…" }`, solo con un repositorio **público**. Uno privado
  obligaría a meter un token dentro de la app, que cualquiera con el programa podría leer.

Para cambiar el origen de una app ya instalada sin recompilar: `%APPDATA%\MetricaSEO Studio\actualizaciones.json`,
con el mismo formato, manda sobre la configuración.

**Límites reales.**
- La versión 2.1.1 no sabe actualizarse (se compiló sin los datos del actualizador): hay que instalar a mano una vez
  la primera versión que los trae (2.2.0 o posterior). A partir de ella ya es automático.
- La app no está firmada. Las actualizaciones automáticas funcionan igual (el instalador se comprueba por su huella
  SHA-512 de `latest.yml`), pero Windows SmartScreen puede avisar al instalar a mano y, sin firma, nada garantiza a un
  tercero quién publicó la actualización: quien pueda escribir en el origen puede publicar una versión. Con una
  carpeta propia eso es aceptable; con un origen en internet conviene firmar (ver abajo).
- Las versiones 2.2.0 y 2.2.1 solo miran la carpeta local de este equipo: en otro equipo hay que instalar a mano una
  vez la 2.2.2 o posterior (está en `dev\Metrica SEO\studio-actualizaciones`). A partir de ella se actualiza sola.

## En otro equipo (por ejemplo, la laptop)

- **Proyectos de vídeo**: la app los busca en la carpeta sincronizada `C:\Users\<usuario>\dev\Metrica SEO\metricaseo-promo\editables`
  (además de los recientes de ese equipo y de `Documentos\MetricaSEO Studio\Videos`). Si no encuentra ninguno ya no
  pide una carpeta al abrir: entra en el estudio de diseño con un aviso y los botones «Volver a buscar» y «Elegir
  carpeta del proyecto…».
- **No hace falta `npm install` en el kit**: Syncthing no sincroniza `node_modules`, así que la vista previa y la
  exportación usan los paquetes que trae la app (Remotion, React, lucide-react…) cuando el kit no tiene los suyos.
- **Voz y subtítulos automáticos** necesitan Python y sus paquetes en ese equipo (ver Dependencias). Los diseños del
  estudio se guardan en `Documentos\MetricaSEO Studio\Diseños` de cada equipo y no se sincronizan.

## Firma de código (para quitar el aviso de SmartScreen)

La app sale sin firmar (por eso Windows avisa la primera vez). Ya está preparada: `package.json → build.win.signtoolOptions`
(SHA-256 y sello de tiempo). Opciones, de más barata a más cara (precios orientativos de 2026):
- **Azure Trusted Signing** (Microsoft): ~10 USD/mes. Requiere cuenta de Azure y verificación de identidad (empresa con
  historial o profesional en países admitidos). Se configura con `build.win.azureSignOptions`
  (`publisherName`, `endpoint`, `certificateProfileName`, `codeSigningAccountName`) y las variables `AZURE_TENANT_ID`,
  `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`.
- **Certificado OV** (Sectigo, DigiCert, SSL.com…): ~200–400 USD/año. Desde 2023 la clave va en un token USB o en la
  nube del emisor. Con un .pfx: variables `CSC_LINK` (ruta del .pfx) y `CSC_KEY_PASSWORD`, y `npm run dist:firmado`.
- **Certificado EV**: ~300–600 USD/año; SmartScreen confía desde el primer día (con OV hay que «ganar reputación»).

Al firmar, añade también `build.win.publisherName` con el nombre exacto del certificado (así electron-updater comprueba
que las actualizaciones vienen firmadas por el mismo editor). No se ha comprado ni creado nada.

## Hacer compatible otro proyecto Remotion (contrato)

Un proyecto es compatible si tiene:

1. **`proyecto.json`** en la raíz con el formato de `contrato/esquema.ts` (zod). Resumen:
   - `ajustes`: `ancho`, `alto`, `fps`, `siteUrl`, `whatsapp`, `legal`, `paleta` (clave → color), `fuentes`,
     `zonas` (`arriba`, `abajo`), `fondo`, `vineta`, `grano`.
   - `escenas[]` en orden: `id`, `nombre`, `plantilla`, `duracion` (fotogramas), `recorte`, `frase` (id de la frase
     con la que se sincroniza), `preDefecto`, `fondo`, `marco`, `tomas[]` (`rol`, `src` relativo a `public/`, `t0`,
     `velocidad`, `desde`/`hasta`, `curva` opcional), `camara[]` (`f`, `zoom`, `x`, `y`), `textos[]`,
     `transicion` (`tipo`, `duracion`, `ox`/`oy`) y `params` (libres, de la plantilla).
   - `textos[]`: `texto`, `tipo` (`titulo`|`nota`), `desde`/`hasta` (fotograma local **o** ancla
     `{ palabra, n, seg, frames }`), `x`, `y`, `w`, `tam`, `fuente`, `color`, `acento`, `alinear`, `animacion`,
     `escalonado`, `tiempos` / `sincroVoz`, `grupo`.
   - `voz`: `motor`, `voz` y `frases[]` (`id`, `texto`, `dicho`, `voz`, `escena` + `offset` = dónde va pegada,
     `archivo`, `duracion`, `palabras[]` `{p, ini, fin}`, `volumen`, `subtitulos`, `tomas[]`).
   - `subtitulos` (estilo y troceado), `musica` (`src`, `volumen`, `ducking`, `volumenVoz`, `antes`, `despues`,
     `rampa`, fundidos, `inicio`) y `sfx[]` (`src`, `volumen`, `duracion`, `escena`, `ancla` opcional, `offset`).
2. **`src/contrato/`**: copia tal cual de `editor-video/contrato/` (`esquema.ts`, `linea.ts`, `kit/`). `linea.ts` calcula la
   línea de tiempo (escenas, frases, palabras, textos, efectos, bloques de subtítulos, volumen de la música) y es lo
   mismo que usa el editor: así lo que se ve en la línea de tiempo es lo que se renderiza. Si se cambia el contrato,
   se vuelve a copiar (el editor avisa si las copias no coinciden). Dependencia: `zod` 4.
3. **Una composición** que reciba `{ proyecto, formato }` y use `calculateMetadata` para sacar duración, fps y tamaño
   del proyecto (ver `montilla-video/src/Root.tsx`), con `defaultProps` = el `proyecto.json` importado, para que
   `npx remotion render` siga funcionando sin el editor.
4. **`src/editor.ts`** (lo importa el editor como `@proyecto`):
   ```ts
   export { Video } from './Video';          // el componente de la composición
   export { PLANTILLAS } from './plantillas'; // [{ id, nombre, descripcion, generica, roles, componente, crear }]
   export { FUENTES } from './fonts';         // nombre → fontFamily cargada
   export const COMPOSICION = 'MiVideo';
   ```
   Las dependencias de React/Remotion se comparten con el editor (deben ser las mismas versiones: `remotion`
   4.0.535, React 19). Si el proyecto usa otro paquete `@remotion/*` en el navegador, instálalo también en el editor.
5. **`editor.json`** en la raíz (opcional pero recomendado):
   ```json
   {
     "nombre": "Mi vídeo",
     "proyecto": "proyecto.json",
     "entrada": "src/editor.ts",
     "remotionEntrada": "src/index.ts",
     "composicion": "MiVideo",
     "publico": "public",
     "salidas": "out/editor",
     "voz": {
       "comando": ["py", "scripts/voz.py", "piper", "{id}"],
       "guion": "guion.json",
       "tiempos": "public/voz/tiempos.json",
       "voces": "tools/voces",
       "carpeta": "voz"
     }
   }
   ```
   El script de voz recibe el id de la frase, lee `guion.json` (`segmentos[]` con `id`, `texto`, `dicho`, `voz`;
   el editor los escribe antes de llamarlo) y deja el resultado en `tiempos.json`
   (`segmentos[]`: `id`, `archivo`, `duracion`, `palabras`). Imprimir líneas `toma N:` sirve como progreso.
   Sin bloque `voz`, el editor funciona igual pero sin «Regenerar voz».
6. Para exportar, el proyecto necesita `@remotion/bundler` y `@remotion/renderer` instalados.

Para convertir un vídeo hecho «a mano» (como se hizo con Montilla): sacar a `proyecto.json` todo lo que hoy son
constantes (orden y duración de escenas, textos, tomas, transiciones, voz, música, efectos), dejar en cada escena el
movimiento propio como plantilla que lee `esc.p` / `esc.w(palabra)` / `esc.t(rol, s)` (ver
`montilla-video/src/escena.tsx`) y comprobar con fotogramas sueltos antes/después que el render no cambia.

## Estructura

```
contrato/        esquema.ts (zod) y linea.ts — se copian a cada proyecto
servidor/        index.ts (API + Vite), medios.ts (listado, subida, ondas), trabajos.ts (voz y render),
                 render-trabajo.mjs (proceso de render con el @remotion/renderer del proyecto), config.ts
app/src/         interfaz React: Visor, Linea (línea de tiempo), Inspector, Biblioteca, Dialogos, estado (zustand)
.cache/          bundles de render reutilizables y props temporales (se puede borrar)
```
