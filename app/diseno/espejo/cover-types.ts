// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Generated blog covers: a post either uses its bespoke illustration (the
 * hand-built ones in postCovers/, keyed by slug) or a cover generated from a
 * template + field colour chosen in the admin's cover studio.
 */

export const COVER_TEMPLATES = [
  "chart",
  "checklist",
  "chat",
  "browser",
  "ranking",
  "report",
  "timeline",
  "bars",
  "url",
  "search",
] as const;
export type CoverTemplate = (typeof COVER_TEMPLATES)[number];

export const COVER_FIELDS = ["ink", "mint", "green", "grey", "white"] as const;
export type CoverField = (typeof COVER_FIELDS)[number];

export type CoverConfig = {
  template: CoverTemplate;
  field: CoverField;
  /** Optional short word or figure drawn large in the illustration
   *  (e.g. "CTR", "+38%"); max ~10 characters. */
  word?: string | null;
};
