/** Elementos nuevos (piezas de la librería, formas, textos, imágenes), a escala del lienzo. */
import type { Elemento, ElTexto, Pagina, Tam } from '../esquema';
import { C } from '../espejo/parts';
import { textWidth } from '../espejo/templates';
import { BIBLIOTECA, FIELD_COLORS, isDarkColor, tamArte } from './biblioteca';
import { fitText, newId, wrapText } from './operaciones';
import type { Point } from './geometria';

/** Escala de los tamaños por defecto: pensados para 1080 px de ancho. */
export const escala = (tam: Tam) => Math.min(tam.w, tam.h * 1.4) / 1080;

const centrado = <T extends { w: number; h: number }>(el: T, tam: Tam, at?: Point) => {
  const c = at ?? { x: tam.w / 2, y: tam.h / 2 };
  return { ...el, x: Math.round(c.x - el.w / 2), y: Math.round(c.y - el.h / 2) };
};

export function makeArt(p: Pagina, key: string, tam: Tam, at?: Point): Elemento | null {
  const item = Object.hasOwn(BIBLIOTECA, key.split('|')[0]) ? BIBLIOTECA[key.split('|')[0]] : null;
  if (!item) return null;
  const { w, h } = tamArte(item, tam);
  return centrado({ id: newId(p), type: 'art' as const, art: key, x: 0, y: 0, w, h, rotation: 0, opacity: 1 }, tam, at);
}

export type ShapeKind = 'rect' | 'rounded' | 'circle' | 'line';

export function makeShape(p: Pagina, kind: ShapeKind, tam: Tam, at?: Point): Elemento {
  const k = escala(tam);
  const base = { id: newId(p), type: 'shape' as const, x: 0, y: 0, rotation: 0, opacity: 1, fill: isDarkColor(p.background) ? C.mint : C.ink, strokeWidth: 0, radius: 0 };
  if (kind === 'line') return centrado({ ...base, shape: 'line' as const, w: Math.round(360 * k), h: Math.round(14 * k), strokeWidth: Math.round(7 * k) }, tam, at);
  if (kind === 'circle') return centrado({ ...base, shape: 'ellipse' as const, w: Math.round(260 * k), h: Math.round(260 * k), fill: C.mint }, tam, at);
  return centrado({ ...base, shape: 'rect' as const, w: Math.round(380 * k), h: Math.round(240 * k), radius: kind === 'rounded' ? Math.round(32 * k) : 0, fill: kind === 'rounded' ? C.white : base.fill }, tam, at);
}

export type TextPreset = 'title' | 'subtitle' | 'body' | 'label';

export const PRESETS_TEXTO: Record<TextPreset, Pick<ElTexto, 'fontFamily' | 'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'> & { text: string; w: number; nombre: string }> = {
  title: { nombre: 'Título', text: 'Tu titular aquí', fontFamily: 'display', fontSize: 104, fontWeight: 700, letterSpacing: -0.035, lineHeight: 1.02, w: 0.8 },
  subtitle: { nombre: 'Subtítulo', text: 'Un subtítulo que lo explica', fontFamily: 'display', fontSize: 54, fontWeight: 600, letterSpacing: -0.02, lineHeight: 1.1, w: 0.7 },
  body: { nombre: 'Cuerpo', text: 'Texto de apoyo en una o dos líneas\npara dar contexto.', fontFamily: 'body', fontSize: 34, fontWeight: 400, letterSpacing: 0, lineHeight: 1.35, w: 0.6 },
  label: { nombre: 'Etiqueta', text: 'ETIQUETA', fontFamily: 'mono', fontSize: 28, fontWeight: 600, letterSpacing: 0.12, lineHeight: 1.2, w: 0.25 },
};

export function makeText(p: Pagina, preset: TextPreset, tam: Tam, opts: { text?: string; at?: Point; color?: string } = {}): ElTexto {
  const pr = PRESETS_TEXTO[preset];
  const k = escala(tam);
  const fontSize = Math.round(pr.fontSize * k);
  const w = Math.round(tam.w * pr.w);
  const text = opts.text === undefined ? pr.text : wrapText(opts.text, w, fontSize);
  const el = fitText({
    id: newId(p),
    type: 'text',
    x: 0,
    y: 0,
    w,
    h: 10,
    rotation: 0,
    opacity: 1,
    text,
    fontFamily: pr.fontFamily,
    fontSize,
    fontWeight: pr.fontWeight,
    color: opts.color ?? (isDarkColor(p.background) ? C.white : C.ink),
    align: 'left',
    letterSpacing: pr.letterSpacing,
    lineHeight: pr.lineHeight,
  });
  return centrado(el, tam, opts.at);
}

/** Píldora de categoría: un rectángulo redondeado y su texto centrado (dos elementos). */
export function makePill(p: Pagina, o: { label: string; x: number; y: number; fontSize: number; bg?: string; fg?: string }): Elemento[] {
  const h = Math.round(o.fontSize * 2.3);
  const w = Math.ceil(textWidth(o.label, o.fontSize) * 0.98) + o.fontSize * 2.2;
  const shapeId = newId(p);
  const textId = newId(p, [shapeId]);
  const label = fitText({ id: textId, type: 'text', x: o.x, y: 0, w, h: 10, rotation: 0, opacity: 1, text: o.label, fontFamily: 'body', fontSize: o.fontSize, fontWeight: 600, color: o.fg ?? C.white, align: 'center', letterSpacing: 0, lineHeight: 1.2 });
  return [
    { id: shapeId, type: 'shape', shape: 'rect', x: o.x, y: o.y, w, h, rotation: 0, opacity: 1, fill: o.bg ?? C.ink, strokeWidth: 0, radius: h / 2 },
    { ...label, y: Math.round(o.y + (h - label.h) / 2) },
  ];
}

/** Imagen: ocupa como mucho el 70 % del lienzo, con su proporción. */
export function makeImage(p: Pagina, src: string, natural: { w: number; h: number }, tam: Tam, at?: Point): Elemento {
  const k = Math.min(1, (tam.w * 0.7) / natural.w, (tam.h * 0.7) / natural.h);
  return centrado({ id: newId(p), type: 'image' as const, src, fit: 'cover' as const, radius: 0, x: 0, y: 0, w: Math.round(natural.w * k), h: Math.round(natural.h * k), rotation: 0, opacity: 1 }, tam, at);
}

/** Página a partir de la portada de un artículo: su color de campo, la retícula de puntos y la ilustración centrada. */
export function paginaDesdePortada(p: Pagina, key: string, tam: Tam): Pagina {
  const item = BIBLIOTECA[key];
  const campo = item?.field ? FIELD_COLORS[item.field] : null;
  const [, , vw, vh] = item?.viewBox ?? [0, 0, 640, 400];
  const k = Math.min((tam.w * 0.92) / vw, (tam.h * 0.62) / vh);
  const art: Elemento = { id: newId(p), type: 'art', art: key, w: Math.round(vw * k), h: Math.round(vh * k), x: Math.round((tam.w - vw * k) / 2), y: Math.round((tam.h - vh * k) / 2), rotation: 0, opacity: 1 };
  return { ...p, background: campo?.bg ?? p.background, dots: true, dotColor: campo?.dot, elements: [art] };
}
