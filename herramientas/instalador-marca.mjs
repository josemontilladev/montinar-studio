// Imágenes del instalador (NSIS) con la identidad de metricaseo.site:
//   build/installerSidebar.bmp y build/uninstallerSidebar.bmp (164×314, bienvenida y fin)
//   build/installerHeader.bmp (150×57, cabecera de cada paso)
//   node herramientas/instalador-marca.mjs [ruta-de-chrome]
// Se dibujan en HTML con las fuentes de la marca (electron/fuentes) y se pasan a BMP con Python + Pillow.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'build');
const FUENTES = pathToFileURL(path.join(RAIZ, 'electron', 'fuentes')).href;
const CHROME =
  process.argv[2] ?? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe');

const base = `
@font-face { font-family: 'Poppins'; font-weight: 600; src: url('${FUENTES}/poppins-logo-v1.woff2'); }
@font-face { font-family: 'Inter Tight'; font-weight: 500 700; src: url('${FUENTES}/inter-tight-latin-v1.woff2'); }
@font-face { font-family: 'Inter'; font-weight: 400 700; src: url('${FUENTES}/inter-latin-v1.woff2'); }
* { margin: 0; box-sizing: border-box; }
body { width: var(--w); height: var(--h); overflow: hidden; font-family: 'Inter', sans-serif; color: #212121; }
.logo { display: inline-flex; align-items: baseline; font: 600 var(--fs)/1 'Poppins', sans-serif; letter-spacing: -0.02em; }
.logo svg { width: 1.033em; height: 1.04em; margin-right: -0.27em; overflow: visible; }
.logo b { font-weight: 600; color: #12a150; }
.pill { display: inline-block; padding: 4px 9px; border-radius: 999px; background: #212121; color: #fff; font: 600 11px/1 'Inter Tight', sans-serif; }
`;
const logo = `<span class="logo"><svg viewBox="5.25 6 36.51 36.75"><path d="M8 40 V18 L21 31 L32.37 19.63" fill="none" stroke="#212121" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="42.8" cy="16.6" r="3.53" fill="#12a150"/></svg>etrica<b>seo</b></span>`;

const PIEZAS = {
  sidebar: {
    w: 164,
    h: 314,
    html: `<style>${base}
      body { --w: 164px; --h: 314px; --fs: 21px; background: #f3f3f3;
        background-image: radial-gradient(rgba(33,33,33,.09) 1px, transparent 1px); background-size: 14px 14px; }
      .c { position: absolute; inset: 0; padding: 26px 18px; display: flex; flex-direction: column; gap: 14px; }
      h2 { font: 700 21px/1.06 'Inter Tight', sans-serif; letter-spacing: -0.03em; margin-top: 6px; }
      h2 span { box-shadow: inset 0 -0.38em 0 #74f5a1; }
      p { font-size: 11px; line-height: 1.4; color: #5c5c5c; }
      .pie { position: absolute; left: 18px; bottom: 18px; font-size: 10.5px; color: #5c5c5c; }
      .pie i { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #12a150; margin-right: 6px; vertical-align: 1px; }
    </style><div class="c"><div style="margin-top:8px">${logo}</div><span class="pill" style="align-self:flex-start">Studio</span>
      <h2>Vídeos e imágenes <span>de tu marca.</span></h2>
      <p>Edita tus vídeos y crea posts, carruseles y flyers.</p></div>
      <div class="pie"><i></i>metricaseo.site</div>`,
  },
  header: {
    w: 150,
    h: 57,
    html: `<style>${base}
      body { --w: 150px; --h: 57px; --fs: 17px; background: #ffffff; display: flex; align-items: center; justify-content: flex-end; gap: 6px; padding-right: 10px; }
    </style>${logo}<span class="pill" style="font-size:9.5px;padding:3px 7px">Studio</span>`,
  },
};

mkdirSync(SALIDA, { recursive: true });
const navegador = await puppeteer.launch({ executablePath: CHROME });
const tmp = path.join(SALIDA, '.instalador');
mkdirSync(tmp, { recursive: true });
for (const [nombre, pieza] of Object.entries(PIEZAS)) {
  const p = await navegador.newPage();
  await p.setViewport({ width: pieza.w, height: pieza.h, deviceScaleFactor: 1 });
  await p.setContent(`<!doctype html><html><body>${pieza.html}</body></html>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(tmp, `${nombre}.png`) });
  await p.close();
}
await navegador.close();

// NSIS pide BMP de 24 bits sin transparencia.
const py = `
import sys, shutil
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
for src, dsts in (("sidebar", ("installerSidebar", "uninstallerSidebar")), ("header", ("installerHeader",))):
    im = Image.open(f"{d}/{src}.png").convert("RGB")
    for name in dsts:
        im.save(f"{out}/{name}.bmp", "BMP")
shutil.rmtree(d)
`;
execFileSync('python', ['-c', py, tmp, SALIDA], { stdio: 'inherit' });
console.log('Imágenes del instalador listas en', SALIDA);
