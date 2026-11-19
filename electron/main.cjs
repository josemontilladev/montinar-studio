/**
 * App de escritorio (Electron). Arranca el servidor del editor como proceso hijo (con el Node de Electron),
 * enseña una pantalla de carga mientras arranca y abre el editor en una ventana nativa.
 * - Archivo: Abrir proyecto…, Proyectos recientes, Guardar, Exportar, Abrir carpeta de salida, Dependencias.
 * - Una sola instancia; al salir se cierran el servidor y todos sus trabajos (render, voz, Python).
 */
const { app, BrowserWindow, Menu, dialog, shell, nativeImage, ipcMain, Notification, desktopCapturer, session, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');

const RAIZ = path.resolve(__dirname, '..');
const CONF = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'estudio.config.json'), 'utf8'));
  } catch {
    return {};
  }
})();
// nombreApp: carpeta de datos y proceso (sin tildes); titulo: lo que ve el usuario.
const NOMBRE_APP = CONF.nombreApp || 'Montinar Studio';
const NOMBRE = CONF.titulo || NOMBRE_APP;
app.setName(NOMBRE_APP);
app.setAppUserModelId(CONF.appId || 'dev.montinar.studio');

const DATOS = app.getPath('userData');
// Biblioteca sincronizada (~/dev/Metrica SEO/studio-biblioteca, ver sincronizada.cjs): biblioteca compartida, kits de
// marca, estilos propios, Diseños y Videos. Sin la carpeta `dev`, Documentos\<app> y los datos de la app.
const { carpetaSincronizada, llevarASincronizada } = require('./sincronizada.cjs');
const SINCRONIZADA = carpetaSincronizada(app.getPath('home'));
const DOCS_LOCAL = path.join(process.env.STUDIO_DOCS ?? app.getPath('documents'), NOMBRE_APP);
const DOCS = process.env.STUDIO_DOCS ? DOCS_LOCAL : (SINCRONIZADA ?? DOCS_LOCAL);
const COMPARTIDA = SINCRONIZADA ?? DATOS;
// Migración de datos de otra instalación solo si la configuración lo pide ("migrarDesde": nombre de la app vieja).
const { migrar } = require('./migrar.cjs');
const MIGRACION = CONF.migrarDesde
  ? migrar({
      viejo: path.join(app.getPath('appData'), CONF.migrarDesde),
      nuevo: DATOS,
      docsViejo: path.join(app.getPath('documents'), CONF.migrarDesde),
      docsNuevo: DOCS_LOCAL,
    })
  : null;
// Primera vez con la carpeta sincronizada: se copia allí lo que este equipo tuviera (sin sobrescribir nada).
try {
  if (!process.env.STUDIO_DOCS) llevarASincronizada({ datos: DATOS, docsLocal: DOCS_LOCAL, destino: SINCRONIZADA });
} catch (e) {
  console.error('No se pudo copiar a la biblioteca sincronizada:', e);
}
const RECIENTES = path.join(DATOS, 'recientes.json');
const ICONO = path.join(RAIZ, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

let ventana = null;
let carga = null;
let servidor = null;
let puerto = 0;
let proyecto = null;
let saliendo = false;
let actualizador = null;
const { crearActualizador } = require('./actualizar.cjs');
let fuenteElegida = null;

// ——— una sola instancia ———
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (ventana) {
      if (ventana.isMinimized()) ventana.restore();
      ventana.focus();
    }
  });
}

// ——— proyectos ———
const leerRecientes = () => {
  try {
    return JSON.parse(fs.readFileSync(RECIENTES, 'utf8')).filter((p) => fs.existsSync(p));
  } catch {
    return [];
  }
};
const recordar = (p) => {
  const r = [p, ...leerRecientes().filter((x) => x !== p)].slice(0, 8);
  fs.mkdirSync(DATOS, { recursive: true });
  fs.writeFileSync(RECIENTES, JSON.stringify(r, null, 1));
};
const { esProyecto, candidatosProyecto, primerProyecto, KIT_EDITABLES } = require('./rutas.cjs');
/** Carpeta donde deberían estar los proyectos de vídeo en este equipo (la de `dev`, sincronizada). */
const KIT = path.join(app.getPath('home'), ...KIT_EDITABLES);
const proyectoInicial = () => {
  const arg = process.argv.find((a, i) => process.argv[i - 1] === '--proyecto');
  // STUDIO_SIN_KIT=1 simula un equipo sin la carpeta sincronizada (pruebas)
  if (process.env.STUDIO_SIN_KIT === '1') return arg && esProyecto(arg) ? arg : null;
  return primerProyecto(
    candidatosProyecto({
      arg,
      recientes: leerRecientes(),
      porDefecto: CONF.proyectoPorDefecto,
      home: app.getPath('home'),
      docsVideos: path.join(DOCS, 'Videos'),
      raiz: RAIZ,
    }),
  );
};
/** Sin proyecto de vídeo: el servidor arranca igual (el estudio de diseño no lo necesita) con esta carpeta vacía. */
const SIN_PROYECTO = path.join(DATOS, 'sin-proyecto');
const haySinProyecto = () => proyecto === SIN_PROYECTO;

// ——— servidor ———
const libre = (desde) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(libre(desde + 1)));
    s.listen(desde, '127.0.0.1', () => s.close(() => res(desde)));
  });

const matarArbol = (p) => {
  if (!p || p.exitCode != null) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/T', '/F', '/PID', String(p.pid)], { windowsHide: true, stdio: 'ignore' });
    else process.kill(-p.pid, 'SIGTERM');
  } catch {}
};

const esperar = (url, ms) =>
  new Promise((res, rej) => {
    const t0 = Date.now();
    const intento = () => {
      http
        .get(url, (r) => {
          r.resume();
          if (r.statusCode === 200) res();
          else otra();
        })
        .on('error', otra);
    };
    const otra = () => (Date.now() - t0 > ms ? rej(new Error('El servidor no responde')) : setTimeout(intento, 300));
    intento();
  });

const registro = [];
const arrancarServidor = async (dir) => {
  matarArbol(servidor);
  puerto = await libre(CONF.puerto || 4410);
  const entrada = path.join(RAIZ, 'dist-server', 'index.mjs');
  const args = fs.existsSync(entrada) ? [entrada] : ['--import', 'tsx', path.join(RAIZ, 'servidor', 'index.ts')];
  servidor = spawn(process.execPath, [...args, '--proyecto', dir, '--puerto', String(puerto)], {
    cwd: RAIZ,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      STUDIO_DATOS: DATOS,
      STUDIO_COMPARTIDA: COMPARTIDA,
      STUDIO_DOCS_APP: DOCS,
      STUDIO_PROYECTOS: process.env.STUDIO_PROYECTOS ?? path.join(DOCS, 'Videos'),
      NODE_ENV: 'production',
    },
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  const guardar = (b) => {
    const t = b.toString();
    registro.push(t);
    if (registro.length > 200) registro.shift();
    carga?.webContents.send?.('log', t);
  };
  servidor.stdout.on('data', guardar);
  servidor.stderr.on('data', guardar);
  servidor.on('exit', (c) => {
    if (!saliendo && c) dialog.showErrorBox(NOMBRE, `El servidor del editor se cerró (código ${c}).\n\n${registro.join('').slice(-1500)}`);
  });
  await esperar(`http://127.0.0.1:${puerto}/api/estado`, 90000);
  proyecto = dir;
  if (dir !== SIN_PROYECTO) recordar(dir);
};

// ——— ventanas ———
// Fondo de las ventanas mientras cargan: el gris de metricaseo.site (o su modo oscuro).
const fondoMarca = () => (nativeTheme.shouldUseDarkColors ? '#121212' : '#f3f3f3');
// Botones de la ventana sobre la barra superior (blanca o casi negra, como la web).
const barraMarca = () =>
  nativeTheme.shouldUseDarkColors
    ? { color: '#171717', symbolColor: '#f3f3f3', height: 40 }
    : { color: '#ffffff', symbolColor: '#212121', height: 40 };
const pantallaCarga = () => {
  carga = new BrowserWindow({ width: 520, height: 320, frame: false, resizable: false, transparent: false, backgroundColor: fondoMarca(), show: false, icon: ICONO, alwaysOnTop: true });
  carga.loadFile(path.join(__dirname, 'carga.html'), { query: { nombre: NOMBRE } });
  carga.once('ready-to-show', () => carga.show());
};

const abrirVentana = () => {
  ventana = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    backgroundColor: fondoMarca(),
    title: NOMBRE,
    icon: ICONO,
    autoHideMenuBar: true,
    // barra de título propia (la del editor) con los botones nativos de la ventana superpuestos
    titleBarStyle: 'hidden',
    titleBarOverlay: barraMarca(),
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
  });
  ventana.loadURL(urlInicial());
  ventana.once('ready-to-show', () => {
    ventana.maximize();
    ventana.show();
    carga?.close();
    carga = null;
  });
  // cerrar: guardar lo pendiente y cerrar aunque la página pida confirmación (beforeunload)
  ventana.webContents.on('will-prevent-unload', (e) => e.preventDefault());
  // al cambiar de página, la barra toma el tema del sistema; cada página la ajusta luego al tema elegido
  ventana.webContents.on('did-navigate', () => ventana.setTitleBarOverlay?.(barraMarca()));
  let cerrando = false;
  ventana.on('close', (e) => {
    if (cerrando) return;
    e.preventDefault();
    cerrando = true;
    Promise.race([ejecutarEnEditor('window.__cerrar ? window.__cerrar() : window.__guardar ? window.__guardar() : null'), new Promise((r) => setTimeout(r, 2500))]).finally(() => ventana.destroy());
  });
  ventana.on('page-title-updated', (e) => {
    e.preventDefault();
    ventana.setTitle(tituloVentana());
  });
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    // vídeos exportados y enlaces: en el reproductor / navegador del sistema
    if (url.includes('/salidas/') && !haySinProyecto()) {
      const rel = decodeURIComponent(url.split('/salidas/')[1]);
      shell.openPath(path.join(proyecto, 'out', 'editor', rel));
    } else shell.openExternal(url);
    return { action: 'deny' };
  });
  ventana.setTitle(tituloVentana());
};

const tituloVentana = () => (haySinProyecto() || !proyecto ? NOMBRE : `${NOMBRE} — ${path.basename(proyecto)}`);
/** Sin proyecto de vídeo, la app abre en el estudio de diseño con el aviso de dónde buscarlos. */
const urlInicial = () => `http://127.0.0.1:${puerto}/${haySinProyecto() ? 'diseno.html' : ''}`;

const ejecutarEnEditor = (js) => ventana?.webContents.executeJavaScript(js).catch(() => {});
// Inicio vive en el editor de vídeo: desde el estudio de diseño hay que volver a esa página primero.
const irAInicio = async () => {
  const url = ventana?.webContents.getURL() ?? '';
  if (haySinProyecto()) return void ventana?.loadURL(urlInicial());
  if (url.includes('/diseno')) {
    await ventana.loadURL(`http://127.0.0.1:${puerto}/?inicio=1`);
    return;
  }
  ejecutarEnEditor("window.__ed.setState({ dialogo: 'inicio' })");
};

const abrirProyecto = async (dir) => {
  if (!dir) {
    const r = await dialog.showOpenDialog(ventana, { title: 'Abrir proyecto Remotion', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return;
    dir = r.filePaths[0];
  }
  if (!esProyecto(dir)) {
    dialog.showMessageBox(ventana, { type: 'warning', title: NOMBRE, message: 'Esa carpeta no es un proyecto compatible', detail: 'Necesita proyecto.json (y editor.json). Consulta «Hacer compatible otro proyecto» en el LEEME.' });
    return;
  }
  await ejecutarEnEditor('window.__guardar && window.__guardar()');
  pantallaCarga();
  await arrancarServidor(dir);
  ventana.loadURL(urlInicial());
  ventana.setTitle(tituloVentana());
  carga?.close();
  carga = null;
  menu();
};

const menu = () => {
  const rec = leerRecientes();
  const plantilla = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Inicio (proyectos y plantillas)', accelerator: 'CmdOrCtrl+Shift+H', click: () => irAInicio() },
        { label: 'Abrir proyecto…', accelerator: 'CmdOrCtrl+O', click: () => abrirProyecto() },
        { label: 'Proyectos recientes', submenu: rec.length ? rec.map((p) => ({ label: p, click: () => abrirProyecto(p) })) : [{ label: '(ninguno)', enabled: false }] },
        { type: 'separator' },
        { label: 'Guardar (y crear versión)', accelerator: 'CmdOrCtrl+S', click: () => ejecutarEnEditor('window.__guardar && window.__guardar()') },
        { label: 'Exportar…', accelerator: 'CmdOrCtrl+E', click: () => ejecutarEnEditor("window.__ed.setState({ dialogo: 'exportar' })") },
        { label: 'Versiones…', click: () => ejecutarEnEditor("window.__ed.setState({ dialogo: 'versiones' })") },
        { type: 'separator' },
        { label: 'Abrir carpeta de salida', enabled: !haySinProyecto(), click: () => { const d = path.join(proyecto, 'out', 'editor'); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); } },
        { label: 'Abrir carpeta del proyecto', enabled: !haySinProyecto(), click: () => shell.openPath(proyecto) },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' },
      ],
    },
    {
      label: 'Diseños',
      submenu: [
        { label: 'Nuevo diseño…', accelerator: 'CmdOrCtrl+Shift+N', click: () => ejecutarEnEditor('window.__nuevoDiseno && window.__nuevoDiseno()') },
        { label: 'Mis diseños', accelerator: 'CmdOrCtrl+Shift+D', click: () => ejecutarEnEditor('window.__abrirDisenos && window.__abrirDisenos()') },
        { type: 'separator' },
        { label: 'Abrir carpeta de diseños', click: () => { const d = path.join(DOCS, 'Diseños'); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); } },
        { label: 'Abrir carpeta de exportaciones', click: () => { const d = path.join(app.getPath('downloads'), NOMBRE_APP); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); } },
      ],
    },
    {
      label: 'Edición',
      submenu: [
        { label: 'Deshacer', accelerator: 'CmdOrCtrl+Z', click: () => ejecutarEnEditor('window.__ed.getState().deshacer()') },
        { label: 'Rehacer', accelerator: 'CmdOrCtrl+Y', click: () => ejecutarEnEditor('window.__ed.getState().rehacer()') },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectAll' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Revisión de calidad', click: () => ejecutarEnEditor("window.__ed.setState({ dialogo: 'revision' })") },
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        { label: 'Acercar', role: 'zoomIn' },
        { label: 'Alejar', role: 'zoomOut' },
        { label: 'Tamaño normal', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Recargar', role: 'reload' },
        { label: 'Herramientas de desarrollo', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Dependencias…', click: () => ejecutarEnEditor("window.__ed.setState({ dialogo: 'dependencias' })") },
        { label: 'Buscar actualizaciones', click: () => actualizador?.buscar() },
        { label: 'Atajos de teclado', click: () => ejecutarEnEditor("window.__ed.setState({ dialogo: 'atajos' })") },
        { label: 'Manual (LEEME)', click: () => shell.openPath(path.join(RAIZ, 'LEEME.md')) },
        { label: 'Registro del servidor', click: () => { const f = path.join(DATOS, 'registro.txt'); fs.writeFileSync(f, registro.join('')); shell.openPath(f); } },
        { type: 'separator' },
        { label: `Acerca de ${NOMBRE}`, click: () => dialog.showMessageBox(ventana, { title: NOMBRE, message: NOMBRE, detail: `Versión ${app.getVersion()}\nEditor de vídeo y estudio de diseño de MétricaSEO · metricaseo.site\nProyecto: ${proyecto}\nDatos: ${DATOS}`, icon: nativeImage.createFromPath(path.join(RAIZ, 'build', 'icon.png')) }) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla));
};

ipcMain.handle('accion', async (_e, a, x) => {
  if (a === 'recientes') return leerRecientes();
  if (a === 'abrir') return abrirProyecto(x);
  // sin proyecto de vídeo: estado para el aviso, volver a buscar (p. ej. al terminar de sincronizar) y elegir carpeta
  if (a === 'proyecto-estado') return { sinProyecto: haySinProyecto(), kit: KIT, kitExiste: fs.existsSync(KIT) };
  if (a === 'buscar-proyectos') {
    const dir = proyectoInicial();
    if (!dir) return false;
    await abrirProyecto(dir);
    return true;
  }
  if (a === 'salida') {
    if (haySinProyecto()) return false;
    const d = path.join(proyecto, 'out', 'editor');
    fs.mkdirSync(d, { recursive: true });
    return shell.openPath(d);
  }
  if (a === 'salir') return app.quit();
  // el estudio de diseño (tema claro u oscuro, como la web) pinta los botones de la ventana a juego
  if (a === 'barra-titulo') {
    const base = barraMarca();
    const color = typeof x?.color === 'string' ? x.color : base.color;
    const simbolo = typeof x?.simbolo === 'string' ? x.simbolo : base.symbolColor;
    return ventana?.setTitleBarOverlay?.({ color, symbolColor: simbolo, height: 40 });
  }
  // progreso de las exportaciones en el icono de la barra de tareas (-1 = quitar)
  if (a === 'progreso') return ventana?.setProgressBar(typeof x === 'number' && x >= 0 ? Math.max(0.01, x) : -1);
  // aviso de Windows al terminar; clic = abrir la carpeta con el archivo seleccionado
  if (a === 'notificar') {
    if (!Notification.isSupported()) return false;
    const n = new Notification({ title: x?.titulo ?? NOMBRE, body: x?.cuerpo ?? '', icon: ICONO, silent: false });
    n.on('click', () => {
      if (x?.archivo && fs.existsSync(x.archivo)) shell.showItemInFolder(x.archivo);
      else ventana?.show();
    });
    n.show();
    return true;
  }
  // grabación de pantalla: lista de pantallas y ventanas con miniatura; la elegida se usa en getDisplayMedia
  if (a === 'fuentes-pantalla') {
    const s = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
    return s.map((x) => ({ id: x.id, nombre: x.name, miniatura: x.thumbnail.toDataURL(), tipo: x.id.startsWith('screen') ? 'screen' : 'window' }));
  }
  if (a === 'elegir-fuente') {
    fuenteElegida = x;
    return true;
  }
  // actualizaciones
  if (a === 'actualizacion-estado') return actualizador?.estado() ?? null;
  if (a === 'buscar-actualizaciones') return actualizador?.buscar() ?? null;
  if (a === 'instalar-actualizacion') return actualizador?.instalar() ?? false;
  if (a === 'mostrar-archivo') return x && fs.existsSync(x) ? shell.showItemInFolder(x) : false;
});

app.whenReady().then(async () => {
  // getDisplayMedia en la app: se usa la pantalla o ventana elegida en el diálogo «Grabar»
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, cb) => {
    const s = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    const f = s.find((x) => x.id === fuenteElegida) ?? s[0];
    cb(f ? { video: f } : {});
  });
  pantallaCarga();
  // sin ningún proyecto de vídeo en este equipo (p. ej. la carpeta dev aún no se ha sincronizado) la app abre
  // igual, en el estudio de diseño, con un aviso para buscarlos; ya no obliga a elegir una carpeta
  let dir = proyectoInicial();
  if (!dir) {
    fs.mkdirSync(SIN_PROYECTO, { recursive: true });
    dir = SIN_PROYECTO;
  }
  try {
    await arrancarServidor(dir);
  } catch (e) {
    dialog.showErrorBox(NOMBRE, `No se pudo arrancar el editor: ${e.message}\n\n${registro.join('').slice(-1500)}`);
    return app.quit();
  }
  menu();
  abrirVentana();
  actualizador = crearActualizador({
    app,
    datos: DATOS,
    conf: CONF,
    avisar: (e) => ejecutarEnEditor(`window.__actualizacion && window.__actualizacion(${JSON.stringify(e)})`),
  });
  // primera búsqueda un rato después de abrir (solo si hay canal configurado)
  setTimeout(() => actualizador.buscar(), 15000);
});

const cerrarTodo = () => {
  saliendo = true;
  matarArbol(servidor);
};
app.on('before-quit', cerrarTodo);
app.on('window-all-closed', () => {
  cerrarTodo();
  app.quit();
});
process.on('exit', cerrarTodo);
