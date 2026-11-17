// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Illustration library of the cover designer: the bespoke blog covers and
 * the template illustrations as whole pieces, plus building blocks, brand
 * pieces and icons to compose new covers. Every entry returns SVG content
 * (no outer <svg>) drawn inside its own viewBox.
 *
 * An element's `art` key may carry a word for pieces with a word slot:
 * "tpl-chart|CTR" (see parseArtKey / artKey).
 */
import { COVER_TEMPLATES } from "./cover-types";
import { COVER_ART } from "./GeneratedCover";
import { cleanWord } from "./templates";
import { ICONS } from "./libraryBrand";
import {
  BESPOKE,
  FIELD_COLORS,
  TEMPLATE_LABELS,
  TEMPLATE_VIEWBOX,
  themeForTint,
} from "./libraryCovers";
import {
  BRAND,
  PIECES,
  type Piece,
} from "./libraryPieces";
import type { LibraryItem } from "./libraryTypes";

export type { LibraryItem };
export {
  BESPOKE,
  FIELD_COLORS,
  TEMPLATE_VIEWBOX,
  isDarkColor,
} from "./libraryCovers";

const ART_PARAM_SEP = "|";

export function parseArtKey(key: string): {
  base: string;
  param: string | null;
} {
  const i = key.indexOf(ART_PARAM_SEP);
  if (i === -1) return { base: key, param: null };
  return { base: key.slice(0, i), param: cleanWord(key.slice(i + 1)) };
}

export function artKey(base: string, param: string | null | undefined): string {
  const word = cleanWord(param);
  return word ? `${base}${ART_PARAM_SEP}${word}` : base;
}

function bespokeEntries(): [string, LibraryItem][] {
  return Object.entries(BESPOKE).map(([key, b]) => {
    const Art = b.Art;
    return [
      key,
      {
        label: b.label,
        group: "Ilustraciones",
        viewBox: b.viewBox,
        thumbBg: FIELD_COLORS[b.field].bg,
        tags: b.slug.replaceAll("-", " "),
        Render: () => <Art />,
      },
    ];
  });
}

function templateEntries(): [string, LibraryItem][] {
  return COVER_TEMPLATES.map((template) => {
    const Art = COVER_ART[template];
    return [
      `tpl-${template}`,
      {
        label: TEMPLATE_LABELS[template],
        group: "Ilustraciones",
        viewBox: TEMPLATE_VIEWBOX[template],
        tintable: true,
        wordSlot: true,
        tags: `plantilla ${template}`,
        Render: ({ tint, param }) => (
          <Art t={themeForTint(tint)} word={cleanWord(param)} />
        ),
      },
    ];
  });
}

function pieceEntries(
  pieces: Piece[],
  group: LibraryItem["group"],
): [string, LibraryItem][] {
  return pieces.map(([key, label, Render, viewBox, opts]) => [
    key,
    { label, group, viewBox, Render, tintable: true, ...opts },
  ]);
}

function iconEntries(): [string, LibraryItem][] {
  return Object.entries(ICONS).map(([key, i]) => [
    key,
    {
      label: i.label,
      group: "Iconos",
      viewBox: [0, 0, 24, 24],
      tintable: true,
      size: 120,
      Render: i.Render,
    },
  ]);
}

export const COVER_LIBRARY: Record<string, LibraryItem> = Object.fromEntries([
  ...bespokeEntries(),
  ...templateEntries(),
  ...pieceEntries(PIECES, "Piezas"),
  ...pieceEntries(BRAND, "Marca"),
  ...iconEntries(),
]);

/** Library entry and word of an element's art key (null if unknown). */
export function getArt(
  key: string,
): { item: LibraryItem; param: string | null } | null {
  const { base, param } = parseArtKey(key);
  const item = Object.hasOwn(COVER_LIBRARY, base) ? COVER_LIBRARY[base] : null;
  return item ? { item, param } : null;
}

/** Default size of a library piece on the 1200×750 artboard: the covers'
 *  own scale (640 → 1200), capped to fit. */
export function defaultArtSize(item: LibraryItem): { w: number; h: number } {
  const [, , vw, vh] = item.viewBox;
  let w = item.size ?? vw * (1200 / 640);
  let h = (w * vh) / vw;
  const k = Math.min(1, 960 / w, 600 / h);
  w *= k;
  h *= k;
  return { w: Math.round(w), h: Math.round(h) };
}
