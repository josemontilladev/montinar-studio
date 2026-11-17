// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/** Whole-cover pieces of the designer library: the bespoke covers (with the
 *  field colour each is drawn on) and the template illustrations. */
import type { ComponentType } from "react";
import type { CoverTemplate } from "./cover-types";
import { C } from "./parts";
import {
  THEMES,
  type CoverTheme,
} from "./templates";
import {
  AiAnswerCover,
  AuditCover,
  PlanCover,
} from "./coversA";
import {
  CtrCover,
  IndexingCover,
  ReportCover,
} from "./coversB";
import {
  SearchConsoleCover,
  UtmCover,
} from "./coversC";
import {
  GenericCover,
  RankingCover,
  UnassignedCover,
} from "./coversD";

export type VB = [number, number, number, number];

/** Field colours the bespoke covers are drawn on. */
export const FIELD_COLORS = {
  ink: {
    bg: C.ink,
    dot: "rgba(255,255,255,0.11)",
    pillBg: C.mint,
    pillFg: C.ink,
    number: "rgba(255,255,255,0.6)",
  },
  green: {
    bg: C.green,
    dot: "rgba(255,255,255,0.2)",
    pillBg: C.white,
    pillFg: C.ink,
    number: "rgba(255,255,255,0.75)",
  },
  mint: {
    bg: C.mint,
    dot: "rgba(33,33,33,0.13)",
    pillBg: C.ink,
    pillFg: C.white,
    number: "rgba(33,33,33,0.65)",
  },
  mintSoft: {
    bg: C.mintSoft,
    dot: "rgba(18,161,80,0.2)",
    pillBg: C.white,
    pillFg: C.ink,
    number: "rgba(33,33,33,0.55)",
  },
  soft: {
    bg: C.soft,
    dot: "rgba(33,33,33,0.12)",
    pillBg: C.white,
    pillFg: C.ink,
    number: "rgba(33,33,33,0.55)",
  },
  white: {
    bg: C.white,
    dot: "rgba(33,33,33,0.09)",
    pillBg: C.ink,
    pillFg: C.white,
    number: "rgba(33,33,33,0.55)",
  },
} as const;
type FieldName = keyof typeof FIELD_COLORS;

/** Bespoke covers: library key, slug, field and the content's box in the
 *  cover's 640×400 viewBox. */
export const BESPOKE: Record<
  string,
  {
    slug: string;
    label: string;
    field: FieldName;
    viewBox: VB;
    Art: ComponentType;
  }
> = {
  "cover-audit": {
    slug: "auditoria-seo-tecnica-checklist",
    label: "Auditoría técnica",
    field: "mint",
    viewBox: [134, 58, 416, 306],
    Art: AuditCover,
  },
  "cover-ai": {
    slug: "posicionar-en-chatgpt-y-ia",
    label: "SEO e IA",
    field: "ink",
    viewBox: [112, 56, 508, 320],
    Art: AiAnswerCover,
  },
  "cover-plan": {
    slug: "plan-seo-6-meses",
    label: "Plan a 6 meses",
    field: "soft",
    viewBox: [74, 68, 492, 284],
    Art: PlanCover,
  },
  "cover-report": {
    slug: "informe-seo-para-clientes",
    label: "Informe para clientes",
    field: "green",
    viewBox: [114, 54, 440, 316],
    Art: ReportCover,
  },
  "cover-ctr": {
    slug: "ctr-organico",
    label: "CTR orgánico",
    field: "white",
    viewBox: [66, 86, 522, 274],
    Art: CtrCover,
  },
  "cover-indexing": {
    slug: "errores-de-indexacion-search-console",
    label: "Indexación",
    field: "ink",
    viewBox: [98, 78, 454, 302],
    Art: IndexingCover,
  },
  "cover-gsc": {
    slug: "guia-google-search-console",
    label: "Search Console",
    field: "mint",
    viewBox: [76, 64, 488, 288],
    Art: SearchConsoleCover,
  },
  "cover-utm": {
    slug: "parametros-utm",
    label: "Parámetros UTM",
    field: "mintSoft",
    viewBox: [58, 78, 524, 248],
    Art: UtmCover,
  },
  "cover-ranking": {
    slug: "seguimiento-de-posiciones-google",
    label: "Posiciones",
    field: "green",
    viewBox: [69, 64, 497, 288],
    Art: RankingCover,
  },
  "cover-unassigned": {
    slug: "ga4-trafico-unassigned",
    label: "GA4 Unassigned",
    field: "soft",
    viewBox: [98, 60, 444, 292],
    Art: UnassignedCover,
  },
  "cover-generic": {
    slug: "",
    label: "Marca en tarjeta",
    field: "mintSoft",
    viewBox: [214, 74, 212, 272],
    Art: GenericCover,
  },
};

export const TEMPLATE_LABELS: Record<CoverTemplate, string> = {
  chart: "Gráfica (plantilla)",
  checklist: "Checklist (plantilla)",
  chat: "Chat IA (plantilla)",
  browser: "Navegador (plantilla)",
  ranking: "Ranking (plantilla)",
  report: "Informe (plantilla)",
  timeline: "Cronograma (plantilla)",
  bars: "Barras (plantilla)",
  url: "URL (plantilla)",
  search: "Búsqueda (plantilla)",
};

/** Content box of each template illustration in its 640×400 viewBox. */
export const TEMPLATE_VIEWBOX: Record<CoverTemplate, VB> = {
  chart: [74, 78, 522, 266],
  checklist: [106, 60, 480, 302],
  chat: [78, 70, 500, 306],
  browser: [78, 66, 520, 294],
  ranking: [112, 81, 451, 278],
  report: [101, 64, 477, 302],
  timeline: [44, 106, 554, 224],
  bars: [64, 90, 514, 252],
  url: [66, 76, 508, 268],
  search: [74, 76, 520, 278],
};

/** Template theme for a tint: the field theme with that colour, else white
 *  (light fields) or ink (dark ones). */
export function themeForTint(tint: string | undefined): CoverTheme {
  const t = (tint ?? "").toLowerCase();
  const match = Object.values(THEMES).find((th) => th.bg.toLowerCase() === t);
  if (match) return match;
  return isDarkColor(t) ? THEMES.ink : THEMES.white;
}

/** Rough luminance test for #rgb / #rrggbb colours. */
export function isDarkColor(color: string): boolean {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return false;
  const hex = m[1].length === 3 ? m[1].replaceAll(/./g, "$&$&") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) =>
    Number.parseInt(hex.slice(i, i + 2), 16),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}
