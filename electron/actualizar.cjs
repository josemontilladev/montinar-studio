/**
 * Actualizaciones automáticas (electron-updater). El origen se configura sin recompilar:
 *   - %APPDATA%\MetricaSEO Studio\actualizaciones.json  (manda), o
 *   - "actualizaciones" en electron/estudio.config.json
 * Formatos:
 *   { "proveedor": "carpeta", "ruta": "C:/…/actualizaciones" }      carpeta de este equipo, de red o sincronizada
 *   { "proveedor": "generic", "url": "https://mi-servidor/studio/" } servidor propio (p. ej. un bucket con dominio)
 *   { "proveedor": "github", "owner": "usuario", "repo": "repo" }    releases de un repositorio público
 * La carpeta se sirve a electron-updater por un servidor HTTP que solo escucha en 127.0.0.1: así no hace
 * falta nada en internet y el instalador se «descarga» del disco. Nada se publica desde aquí: las
 * versiones las deja en el origen `npm run release`.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch {
  autoUpdater = null;
}

/** Cada cuánto se vuelve a mirar con la app abierta. */
const CADA_MS = 3 * 60 * 60 * 1000;

const leerCanal = (datos, conf) => {
  try {
    const f = path.join(datos, 'actualizaciones.json');
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    /* archivo mal escrito: se ignora */
  }
  return conf?.actualizaciones ?? null;
};

const TIPOS = { '.yml': 'text/yaml', '.exe': 'application/octet-stream', '.blockmap': 'application/octet-stream' };

/** Sirve una carpeta en 127.0.0.1 (solo lectura, sin salir de ella, con peticiones parciales). */
const servirCarpeta = (carpeta) =>
  new Promise((resolve, reject) => {
    const raiz = path.resolve(carpeta);
    const srv = http.createServer((req, res) => {
      let nombre;
      try {
        nombre = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
      } catch {
        nombre = '';
      }
      const archivo = path.resolve(raiz, nombre);
      const dentro = archivo.startsWith(raiz + path.sep) && !nombre.includes('\0');
      if (!dentro || !['GET', 'HEAD'].includes(req.method) || !fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) {
        res.writeHead(404).end();
        return;
      }
      const tam = fs.statSync(archivo).size;
      const cab = { 'content-type': TIPOS[path.extname(archivo).toLowerCase()] ?? 'application/octet-stream', 'accept-ranges': 'bytes' };
      const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (rango && (rango[1] || rango[2])) {
        const ini = rango[1] ? Number(rango[1]) : Math.max(0, tam - Number(rango[2]));
        const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), tam - 1) : tam - 1;
        if (ini > fin || ini >= tam) {
          res.writeHead(416, { 'content-range': `bytes */${tam}` }).end();
          return;
        }
        res.writeHead(206, { ...cab, 'content-range': `bytes ${ini}-${fin}/${tam}`, 'content-length': fin - ini + 1 });
        if (req.method === 'HEAD') return void res.end();
        fs.createReadStream(archivo, { start: ini, end: fin }).pipe(res);
        return;
      }
      res.writeHead(200, { ...cab, 'content-length': tam });
      if (req.method === 'HEAD') return void res.end();
      fs.createReadStream(archivo).pipe(res);
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}/`, cerrar: () => srv.close() }));
  });

const textoNotas = (n) => {
  if (!n) return undefined;
  const t = Array.isArray(n) ? n.map((x) => x?.note ?? '').join('\n') : String(n);
  return t.replace(/<[^>]+>/g, '').trim().slice(0, 1200) || undefined;
};

/**
 * @param {{ app: import('electron').App, datos: string, conf: any, avisar: (estado: object) => void }} o
 */
const crearActualizador = ({ app, datos, conf, avisar }) => {
  let estado = { estado: 'sin-canal', version: app.getVersion() };
  const poner = (d) => {
    estado = { ...estado, ...d };
    avisar(estado);
  };
  const canal = leerCanal(datos, conf);
  if (!autoUpdater || !canal || !app.isPackaged) {
    estado = { estado: !autoUpdater ? 'no-disponible' : !app.isPackaged ? 'desarrollo' : 'sin-canal', version: app.getVersion() };
    return {
      estado: () => estado,
      buscar: async () => (avisar(estado), estado),
      instalar: () => false,
    };
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = !!canal.prerelease;
  autoUpdater.on('checking-for-update', () => poner({ estado: 'buscando', error: undefined }));
  autoUpdater.on('update-not-available', () => poner({ estado: 'al-dia' }));
  autoUpdater.on('update-available', (i) => poner({ estado: 'descargando', nueva: i.version, notas: textoNotas(i.releaseNotes), progreso: 0 }));
  autoUpdater.on('download-progress', (p) => poner({ estado: 'descargando', progreso: p.percent / 100 }));
  autoUpdater.on('update-downloaded', (i) => poner({ estado: 'lista', nueva: i.version, notas: textoNotas(i.releaseNotes) }));
  autoUpdater.on('error', (e) => poner({ estado: 'error', error: String(e?.message ?? e).slice(0, 200) }));

  // El origen se prepara una vez; una carpeta que aún no existe (o sin versiones) no es un error.
  let origen = null;
  const preparar = async () => {
    if (origen) return origen;
    if (canal.proveedor === 'carpeta') {
      if (!canal.ruta || !fs.existsSync(path.join(canal.ruta, 'latest.yml'))) return null;
      const s = await servirCarpeta(canal.ruta);
      // del disco no compensa la descarga por diferencias, y evita depender del .blockmap anterior
      autoUpdater.disableDifferentialDownload = true;
      autoUpdater.setFeedURL({ provider: 'generic', url: s.url });
      app.on('before-quit', s.cerrar);
    } else if (canal.proveedor === 'github') {
      autoUpdater.setFeedURL({ provider: 'github', owner: canal.owner, repo: canal.repo, private: false });
    } else {
      autoUpdater.setFeedURL({ provider: 'generic', url: canal.url });
    }
    origen = true;
    return origen;
  };

  const buscar = async () => {
    // con una versión ya descargada no hay nada más que mirar hasta reiniciar
    if (estado.estado === 'lista' || estado.estado === 'descargando') return (avisar(estado), estado);
    try {
      if (!(await preparar())) {
        poner({ estado: 'sin-versiones' });
        return estado;
      }
      await autoUpdater.checkForUpdates();
    } catch (e) {
      poner({ estado: 'error', error: String(e?.message ?? e).slice(0, 200) });
    }
    return estado;
  };
  // con la app abierta se vuelve a mirar de vez en cuando (sin avisos si no hay nada nuevo)
  setInterval(() => void buscar(), CADA_MS).unref?.();

  return {
    estado: () => estado,
    buscar,
    // instala al reiniciar (cierra la app, instala y la vuelve a abrir)
    instalar: () => {
      if (estado.estado !== 'lista') return false;
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
      return true;
    },
  };
};

module.exports = { crearActualizador };
