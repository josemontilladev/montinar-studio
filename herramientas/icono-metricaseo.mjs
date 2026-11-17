// Icono de MétricaSEO Studio: la marca (M trazada + punto menta) sobre una
// pieza tinta plana (sin degradados, como la identidad de la marca).
//   node herramientas/icono-metricaseo.mjs [ruta-de-chrome]
// Escribe build/icon.png (256), build/icon-512.png y build/icon.ico (16–256, con Python + Pillow).
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'build');
const CHROME =
  process.argv[2] ?? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe');
const TAMANOS = [512, 256, 128, 64, 48, 32, 24, 16];

const svg = (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 100 100">
  <rect x="4" y="4" width="92" height="92" rx="22" fill="#212121"/>
  <rect x="4.5" y="4.5" width="91" height="91" rx="21.5" fill="none" stroke="#ffffff" stroke-opacity="0.08"/>
  <g transform="translate(12.3 14) scale(2.95)">
    <path d="M2.3 19.6V7.6l7.2 7.2 6.3-6.3" fill="none" stroke="#ffffff" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="21.2" cy="6.6" r="2.25" fill="#74f5a1"/>
  </g>
</svg>`;

mkdirSync(SALIDA, { recursive: true });
const navegador = await puppeteer.launch({ executablePath: CHROME });
const tmp = path.join(SALIDA, '.icono');
mkdirSync(tmp, { recursive: true });
for (const t of TAMANOS) {
  const p = await navegador.newPage();
  await p.setViewport({ width: t, height: t });
  await p.setContent(`<body style="margin:0;background:transparent">${svg(t)}</body>`);
  const el = await p.$('svg');
  await el.screenshot({ path: path.join(tmp, `${t}.png`), omitBackground: true });
  await p.close();
}
await navegador.close();

const py = `
import sys, shutil
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
ims = [Image.open(f"{d}/{t}.png").convert("RGBA") for t in (256, 128, 64, 48, 32, 24, 16)]
ims[0].save(f"{out}/icon.ico", sizes=[(i.width, i.height) for i in ims], append_images=ims[1:])
shutil.copy(f"{d}/256.png", f"{out}/icon.png")
shutil.copy(f"{d}/512.png", f"{out}/icon-512.png")
shutil.rmtree(d)
`;
execFileSync('python', ['-c', py, tmp, SALIDA], { stdio: 'inherit' });
console.log('Icono listo en', SALIDA);
