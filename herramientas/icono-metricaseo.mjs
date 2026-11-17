// Icono de MétricaSEO Studio: el mismo favicon de metricaseo.site (M trazada +
// punto menta sobre la pieza tinta).
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

// El favicon oficial de metricaseo.site (metrica-seo/public/favicon.svg), tal cual.
const svg = (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="11" fill="#212121"/>
  <g transform="translate(5.44 3.56) scale(0.78)">
    <path d="M8 40 V18 L21 31 L32.37 19.63" fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="38.23" cy="13.77" r="4.2" fill="#74F5A1"/>
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
