// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
import type { JSX } from "react";

/** Props every library piece takes: an optional colour override and, for the
 *  template illustrations, the optional big word ("CTR", "+38%"). */
export type PieceProps = { tint?: string; param?: string | null };

export type LibraryGroup = "Ilustraciones" | "Piezas" | "Marca" | "Iconos";

export type LibraryItem = {
  label: string;
  group: LibraryGroup;
  /** Box of the drawing in its own units: [x, y, width, height]. */
  viewBox: [number, number, number, number];
  /** Supports the element's `tint` (recolours the piece's accent). */
  tintable?: boolean;
  /** Takes a short word (template illustrations), stored in the art key. */
  wordSlot?: boolean;
  /** Field colour the piece was drawn for (thumbnail background). */
  thumbBg?: string;
  /** Default width on the 1200-unit artboard when added. */
  size?: number;
  /** Extra search terms. */
  tags?: string;
  Render: (props: PieceProps) => JSX.Element;
};
