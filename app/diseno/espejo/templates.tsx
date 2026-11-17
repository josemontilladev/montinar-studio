// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Shared kit for the generated (template-based) blog covers: one colour theme
 * per field so every template reads on any background, plus the helpers that
 * set the optional large `word`. The illustrations themselves live in
 * templatesA.tsx / templatesB.tsx and are drawn in the same 640×400 viewBox,
 * flat colour and offset "shadows" as the bespoke covers in this folder.
 */
import type { CoverField } from "./cover-types";
import {
  C,
  DISPLAY,
} from "./parts";

export type CoverTheme = {
  /** Field (background) colour and its dot grid. */
  bg: string;
  dot: string;
  /** Category pill and index number. */
  pillBg: string;
  pillFg: string;
  number: string;
  /** Hairline ring on the frame (white field only). */
  edge: boolean;
  /** Ink drawn straight on the field, and a faded version of it. */
  on: string;
  onSoft: string;
  /** Colour that reads on top of `on` (ticks on a filled node). */
  onFg: string;
  /** Small accent shapes on the field, and what reads on top of them. */
  pop: string;
  popFg: string;
  /** Offset shadow under white panels, and their outline if needed. */
  shadow: string;
  stroke?: string;
  /** The contrasting "dark" card each template overlaps its white panel
   *  with — ink everywhere except on the ink field, where it turns mint. */
  card: {
    bg: string;
    fg: string;
    soft: string;
    accent: string;
    track: string;
    shadow: string;
  };
};

const INK_CARD = {
  bg: C.ink,
  fg: C.white,
  soft: "rgba(255,255,255,0.6)",
  accent: C.mint,
  track: "rgba(255,255,255,0.16)",
};

export const THEMES: Record<CoverField, CoverTheme> = {
  ink: {
    bg: C.ink,
    dot: "rgba(255,255,255,0.11)",
    pillBg: C.mint,
    pillFg: C.ink,
    number: "rgba(255,255,255,0.6)",
    edge: false,
    on: C.white,
    onSoft: "rgba(255,255,255,0.3)",
    onFg: C.ink,
    pop: C.mint,
    popFg: C.ink,
    shadow: "rgba(0,0,0,0.38)",
    card: {
      bg: C.mint,
      fg: C.ink,
      soft: "rgba(33,33,33,0.62)",
      accent: C.ink,
      track: "rgba(33,33,33,0.18)",
      shadow: "rgba(0,0,0,0.38)",
    },
  },
  mint: {
    bg: C.mint,
    dot: "rgba(33,33,33,0.13)",
    pillBg: C.ink,
    pillFg: C.white,
    number: "rgba(33,33,33,0.65)",
    edge: false,
    on: C.ink,
    onSoft: "rgba(33,33,33,0.28)",
    onFg: C.mint,
    pop: C.white,
    popFg: C.ink,
    shadow: "rgba(33,33,33,0.14)",
    card: { ...INK_CARD, shadow: "rgba(33,33,33,0.2)" },
  },
  green: {
    bg: C.green,
    dot: "rgba(255,255,255,0.2)",
    pillBg: C.white,
    pillFg: C.ink,
    number: "rgba(255,255,255,0.75)",
    edge: false,
    on: C.white,
    onSoft: "rgba(255,255,255,0.4)",
    onFg: C.green,
    pop: C.mint,
    popFg: C.ink,
    shadow: "rgba(0,0,0,0.16)",
    card: { ...INK_CARD, shadow: "rgba(0,0,0,0.2)" },
  },
  grey: {
    bg: C.soft,
    dot: "rgba(33,33,33,0.12)",
    pillBg: C.white,
    pillFg: C.ink,
    number: "rgba(33,33,33,0.55)",
    edge: false,
    on: C.ink,
    onSoft: "rgba(33,33,33,0.22)",
    onFg: C.mint,
    pop: C.green,
    popFg: C.white,
    shadow: "rgba(33,33,33,0.1)",
    card: { ...INK_CARD, shadow: "rgba(33,33,33,0.16)" },
  },
  white: {
    bg: C.white,
    dot: "rgba(33,33,33,0.09)",
    pillBg: C.ink,
    pillFg: C.white,
    number: "rgba(33,33,33,0.55)",
    edge: true,
    on: C.ink,
    onSoft: "rgba(33,33,33,0.18)",
    onFg: C.mint,
    pop: C.mint,
    popFg: C.ink,
    shadow: "rgba(33,33,33,0.06)",
    stroke: C.line,
    card: { ...INK_CARD, shadow: "rgba(33,33,33,0.12)" },
  },
};

/** Props every template illustration takes. `word` is already trimmed and
 *  capped, or null. */
export type ArtProps = { t: CoverTheme; word: string | null };

/** Trim and cap the optional cover word; empty means "no word". */
export function cleanWord(word: string | null | undefined): string | null {
  const w = (word ?? "").trim().slice(0, 10);
  return w.length > 0 ? w : null;
}

/** Rough advance of a string set in Inter Tight bold, in px — generous on
 *  purpose so a fitted word never overflows its slot, whatever the font. */
export function textWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) {
    if (/[MWmw%@]/.test(ch)) units += 0.84;
    else if (/[A-ZÁÉÍÓÚÑ0-9#+?&]/.test(ch)) units += 0.64;
    else if (/[ijlIt.,:;!'|1]/.test(ch)) units += 0.32;
    else if (ch === " ") units += 0.26;
    else units += 0.55;
  }
  return units * size;
}

/** Largest size (≤ maxSize) at which `text` fits in maxW. */
export function fitSize(text: string, maxW: number, maxSize: number): number {
  const w = textWidth(text, maxSize);
  return w <= maxW ? maxSize : Math.floor((maxSize * maxW) / w);
}

/** A display word or figure, shrunk to fit its slot. */
export function WordText({
  x,
  y,
  text,
  maxW,
  maxSize,
  fill,
  anchor = "start",
}: {
  x: number;
  y: number;
  text: string;
  maxW: number;
  maxSize: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
}) {
  const size = fitSize(text, maxW, maxSize);
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={DISPLAY}
      fontWeight={700}
      fontSize={size}
      letterSpacing={-size * 0.03}
      fill={fill}
    >
      {text}
    </text>
  );
}

/** Four-point sparkle centred on (x, y), the "AI" glyph of the set. */
export function Sparkle({
  x,
  y,
  r = 9,
  fill,
}: {
  x: number;
  y: number;
  r?: number;
  fill: string;
}) {
  const k = r / 9;
  return (
    <path
      transform={`translate(${x} ${y}) scale(${k})`}
      d="M0 -9 C1 -2 2 -1 9 0 C2 1 1 2 0 9 C-1 2 -2 1 -9 0 C-2 -1 -1 -2 0 -9 Z"
      fill={fill}
    />
  );
}

/** Small upward trend arrow drawn around (x, y), its tip up and right. */
export function TrendUp({
  x,
  y,
  color,
  size = 1,
}: {
  x: number;
  y: number;
  color: string;
  size?: number;
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M-12 12 L-3 3 L2 8 L9 1 M2 0 H9 V7"
      fill="none"
      stroke={color}
      strokeWidth={3 / size}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
