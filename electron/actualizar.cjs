/**
 * Actualizaciones automáticas (electron-updater). El canal se configura sin recompilar:
 *   - %APPDATA%\Montinar Studio\actualizaciones.json  (manda), o
 *   - "actualizaciones" en electron/estudio.config.json
 * Formato: { "proveedor": "github", "owner": "usuario", "repo": "montinar-studio" }
 *      o   { "proveedor": "generic", "url": "https://mi-servidor/montinar-studio/" }
 * Sin canal configurado no se busca nada (no hay peticiones de red). Nada se publica desde aquí.
 */
const fs = require('node:fs');
const path = require('node:path');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch {
  autoUpdater = null;
}

const leerCanal = (datos, conf) => {
  try {
    const f = path.join(datos, 'actualizaciones.json');
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    /* archivo mal escrito: se ignora */
  }
  return conf?.actualizaciones ?? null;
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
  if (canal.proveedor === 'github') autoUpdater.setFeedURL({ provider: 'github', owner: canal.owner, repo: canal.repo, private: false });
  else autoUpdater.setFeedURL({ provider: 'generic', url: canal.url });
  autoUpdater.on('checking-for-update', () => poner({ estado: 'buscando' }));
  autoUpdater.on('update-not-available', () => poner({ estado: 'al-dia' }));
  autoUpdater.on('update-available', (i) => poner({ estado: 'descargando', nueva: i.version, progreso: 0 }));
  autoUpdater.on('download-progress', (p) => poner({ estado: 'descargando', progreso: p.percent / 100 }));
  autoUpdater.on('update-downloaded', (i) => poner({ estado: 'lista', nueva: i.version }));
  autoUpdater.on('error', (e) => poner({ estado: 'error', error: String(e?.message ?? e).slice(0, 200) }));
  return {
    estado: () => estado,
    buscar: async () => {
      try {
        await autoUpdater.checkForUpdates();
      } catch (e) {
        poner({ estado: 'error', error: String(e?.message ?? e).slice(0, 200) });
      }
      return estado;
    },
    // instala al reiniciar (cierra la app, instala y la vuelve a abrir)
    instalar: () => {
      if (estado.estado !== 'lista') return false;
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
      return true;
    },
  };
};

module.exports = { crearActualizador };
