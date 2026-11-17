/**
 * Librería del estudio: la del diseñador de portadas de MétricaSEO (copia en ../espejo) más todas las portadas
 * del blog (PORTADAS_BLOG, que la sincronización regenera), con categorías para el panel.
 */
import { COVER_LIBRARY, parseArtKey, artKey } from '../espejo/coverLibrary';
import { BESPOKE, FIELD_COLORS, isDarkColor } from '../espejo/libraryCovers';
import { PORTADAS_BLOG } from '../espejo/portadasBlog';
import type { LibraryItem } from '../espejo/libraryTypes';
import type { Tam } from '../esquema';

export { parseArtKey, artKey, isDarkColor, FIELD_COLORS };

export type Grupo = 'Portadas del blog' | 'Ilustraciones' | 'Piezas' | 'Iconos' | 'Marca';
export type Item = Omit<LibraryItem, 'group'> & { group: Grupo; slug?: string; field?: keyof typeof FIELD_COLORS };

export const GRUPOS: { grupo: Grupo; titulo: string; ancho: boolean; cols: number }[] = [
  { grupo: 'Portadas del blog', titulo: 'Portadas del blog', ancho: true, cols: 2 },
  { grupo: 'Ilustraciones', titulo: 'Ilustraciones y plantillas', ancho: true, cols: 2 },
  { grupo: 'Piezas', titulo: 'Piezas para componer', ancho: false, cols: 3 },
  { grupo: 'Iconos', titulo: 'Iconos', ancho: false, cols: 4 },
  { grupo: 'Marca', titulo: 'Marca', ancho: false, cols: 3 },
];

const humano = (slug: string) => {
  const s = slug.replace(/-/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const conocidos = new Set(Object.values(BESPOKE).map((b) => b.slug));
const blog: [string, Item][] = Object.entries(PORTADAS_BLOG)
  .filter(([slug]) => !conocidos.has(slug))
  .map(([slug, { Art, field }]) => [
    `blog-${slug}`,
    { label: humano(slug), group: 'Portadas del blog', viewBox: [0, 0, 640, 400], thumbBg: FIELD_COLORS[field].bg, tags: `${slug.replace(/-/g, ' ')} articulo blog`, slug, field, Render: () => <Art /> },
  ]);

// las portadas propias de coversA–D también son «del blog»
const base: [string, Item][] = Object.entries(COVER_LIBRARY).map(([k, it]) => {
  const b = BESPOKE[k];
  return [k, b?.slug ? { ...it, group: 'Portadas del blog', slug: b.slug, field: b.field } : (it as Item)];
});

export const BIBLIOTECA: Record<string, Item> = Object.fromEntries([...base, ...blog]);

export const getArt = (key: string): { item: Item; param: string | null } | null => {
  const { base: b, param } = parseArtKey(key);
  const item = Object.hasOwn(BIBLIOTECA, b) ? BIBLIOTECA[b] : null;
  return item ? { item, param } : null;
};

/** Tamaño al añadir una pieza: la escala de las portadas (640 → 1200) adaptada al lienzo y sin salirse de él. */
export const tamArte = (item: Item, tam: Tam): { w: number; h: number } => {
  const [, , vw, vh] = item.viewBox;
  const k0 = Math.min(tam.w, tam.h * 1.6) / 1200;
  let w = (item.size ?? vw * (1200 / 640)) * k0;
  let h = (w * vh) / vw;
  const k = Math.min(1, (tam.w * 0.8) / w, (tam.h * 0.8) / h);
  w *= k;
  h *= k;
  return { w: Math.round(w), h: Math.round(h) };
};
