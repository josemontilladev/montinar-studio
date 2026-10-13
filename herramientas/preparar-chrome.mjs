// Prepara recursos/chrome-headless-shell (el navegador que se incluye en la app para exportar sin conexión).
// No está en el repositorio (≈ 280 MB): se descarga con Remotion la primera vez (o en la integración continua).
//   node herramientas/preparar-chrome.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(RAIZ, 'recursos', 'chrome-headless-shell');
const buscar = (d) => {
  if (!fs.existsSync(d)) return null;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      const r = buscar(p);
      if (r) return r;
    } else if (/^chrome-headless-shell(\.exe)?$/.test(e.name)) return p;
  }
  return null;
};
if (buscar(DEST)) {
  console.log('chrome-headless-shell ya está en recursos/');
  process.exit(0);
}
const { ensureBrowser } = await import('@remotion/renderer');
console.log('Descargando chrome-headless-shell con Remotion…');
await ensureBrowser({ logLevel: 'info' });
const origen = path.join(RAIZ, 'node_modules', '.remotion', 'chrome-headless-shell');
const exe = buscar(origen);
if (!exe) throw new Error(`No se encontró el navegador descargado en ${origen}`);
fs.cpSync(origen, DEST, { recursive: true });
console.log(`Listo: ${path.relative(RAIZ, buscar(DEST))}`);
