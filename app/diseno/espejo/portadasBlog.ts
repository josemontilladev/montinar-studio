// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
import type { ComponentType } from "react";
import type { Field } from "./PostCover";
import { COVERS_E } from "./coversE";
import { COVERS_F } from "./coversF";
import { COVERS_G } from "./coversG";
import { COVERS_H } from "./coversH";
import { COVERS_I } from "./coversI";
import { COVERS_J } from "./coversJ";
import { COVERS_K } from "./coversK";
import { COVERS_L } from "./coversL";
import { COVERS_M } from "./coversM";
import { COVERS_METRICS } from "./coversMetrics";
import { COVERS_N } from "./coversN";
import { COVERS_SECTORES } from "./coversSectores";

/** Portadas del blog por slug (las de coversA–D están en BESPOKE de libraryCovers). */
export const PORTADAS_BLOG: Record<string, { Art: ComponentType; field: Field }> = {
  ...COVERS_E,
  ...COVERS_F,
  ...COVERS_G,
  ...COVERS_H,
  ...COVERS_I,
  ...COVERS_J,
  ...COVERS_K,
  ...COVERS_L,
  ...COVERS_M,
  ...COVERS_METRICS,
  ...COVERS_N,
  ...COVERS_SECTORES,
};
