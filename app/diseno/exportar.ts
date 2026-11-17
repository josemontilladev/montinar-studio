/**
 * Rasterizar páginas a PNG/JPG en el navegador, sin dependencias: la página se dibuja como SVG puro
 * (renderToStaticMarkup), con las fuentes de la marca y las imágenes incrustadas como data: (un SVG dentro de <img>
 * no carga nada de fuera), y se pinta en un canvas al tamaño pedido.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Pagina, Tam } from './esquema';
import { Lienzo, RecursoCtx } from './editor/Lienzo';
import { urlRecurso } from './api';
import interLatin from './espejo/fuentes/inter-latin-v1.woff2?url';
import interExt from './espejo/fuentes/inter-latin-ext-v1.woff2?url';
import tightLatin from './espejo/fuentes/inter-tight-latin-v1.woff2?url';
import tightExt from './espejo/fuentes/inter-tight-latin-ext-v1.woff2?url';

const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF';
const CARAS = [
  { familia: 'Inter', pesos: '400 700', url: interLatin, rango: LATIN },
  { familia: 'Inter', pesos: '400 700', url: interExt, rango: EXT },
  { familia: 'Inter Tight', pesos: '500 700', url: tightLatin, rango: LATIN },
  { familia: 'Inter Tight', pesos: '500 700', url: tightExt, rango: EXT },
];

const aDataUrl = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo leer ${url} (${r.status})`);
  const b = await r.blob();
  return new Promise<string>((ok, ko) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result));
    fr.onerror = () => ko(fr.error);
    fr.readAsDataURL(b);
  });
};

let cssFuentes: Promise<string> | null = null;
const fuentes = () =>
  (cssFuentes ??= Promise.all(CARAS.map(async (c) => `@font-face{font-family:'${c.familia}';font-weight:${c.pesos};src:url(${(await aDataUrl(c.url)).replace(/^data:[^;]*/, 'data:font/woff2')}) format('woff2');unicode-range:${c.rango};}`))
    .then((l) => l.join(''))
    .catch((e) => {
      cssFuentes = null;
      throw e;
    }));

const cargar = (src: string) =>
  new Promise<HTMLImageElement>((ok, ko) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error('No se pudo dibujar la página'));
    img.src = src;
  });

/** SVG autónomo de una página (fuentes e imágenes dentro). */
export async function svgAutonomo(pagina: Pagina, tam: Tam, idDiseno: string): Promise<string> {
  const srcs = [...new Set(pagina.elements.flatMap((e) => (e.type === 'image' ? [e.src] : [])))];
  const datos = new Map(await Promise.all(srcs.map(async (s) => [s, await aDataUrl(urlRecurso(idDiseno, s)).catch(() => '')] as const)));
  const markup = renderToStaticMarkup(createElement(RecursoCtx.Provider, { value: (s: string) => datos.get(s) ?? '' }, createElement(Lienzo, { pagina, tam, width: tam.w })));
  return markup.replace(/^<svg([^>]*)>/, `<svg$1><style>${await fuentes()}</style>`);
}

/** Página → data URL (PNG o JPG) de `ancho` px. */
export async function rasterizar(pagina: Pagina, tam: Tam, idDiseno: string, ancho: number, tipo: 'png' | 'jpeg' = 'png'): Promise<string> {
  const svg = await svgAutonomo(pagina, tam, idDiseno);
  const img = await cargar(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  await img.decode().catch(() => undefined);
  // las fuentes data: dentro de un SVG pueden llegar un fotograma después del onload
  await new Promise((r) => setTimeout(r, 120));
  const alto = Math.round((ancho * tam.h) / tam.w);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  if (tipo === 'jpeg') {
    ctx.fillStyle = pagina.background.startsWith('#') ? pagina.background : '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);
  }
  ctx.drawImage(img, 0, 0, ancho, alto);
  return canvas.toDataURL(`image/${tipo}`, 0.92);
}
