// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Shared pieces for the blog cover illustrations: the brand palette, font
 * stacks, hover motion classes and a few drawn primitives. Every cover is
 * drawn in a 640×400 viewBox, flat colour only (no gradients), with a hard
 * offset "shadow" for depth instead of blur.
 */

export const C = {
  ink: "#212121",
  mint: "#74f5a1",
  green: "#12a150",
  grey: "#f3f3f3",
  white: "#ffffff",
  line: "#e2e2e2",
  muted: "#5c5c5c",
  mintSoft: "#d5fce3",
  soft: "#e9e9e9",
} as const;

export const DISPLAY =
  "'Inter Tight', Inter, ui-sans-serif, system-ui, sans-serif";
export const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Hover motion for a shape inside a `.group` card. Transforms only, and
 *  only when the visitor has not asked for reduced motion. */
const EASE =
  "transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]";
export const MOVE = {
  up: `${EASE} motion-safe:group-hover:-translate-y-2`,
  upRight: `${EASE} motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:translate-x-2`,
  right: `${EASE} motion-safe:group-hover:translate-x-2`,
  left: `${EASE} motion-safe:group-hover:-translate-x-2`,
  down: `${EASE} motion-safe:group-hover:translate-y-1.5`,
} as const;

/** A rounded panel with a flat offset shadow under it. */
export function Panel({
  x,
  y,
  w,
  h,
  r = 16,
  fill = C.white,
  stroke,
  shadow = "rgba(33,33,33,0.12)",
  depth = 8,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  fill?: string;
  stroke?: string;
  shadow?: string;
  depth?: number;
}) {
  return (
    <>
      <rect x={x} y={y + depth} width={w} height={h} rx={r} fill={shadow} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1.5 : undefined}
      />
    </>
  );
}

/** A text placeholder line. */
export function Bar({
  x,
  y,
  w,
  h = 8,
  fill = C.line,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  fill?: string;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />;
}

/** Mouse pointer with its tip at (x, y). */
export function Cursor({
  x,
  y,
  fill = C.ink,
  stroke = C.white,
}: {
  x: number;
  y: number;
  fill?: string;
  stroke?: string;
}) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0 0 V30 L8 23 L13.5 35 L19 32.5 L13.5 21 H24 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  );
}

/** A tick centred on (x, y). */
export function Tick({
  x,
  y,
  size = 1,
  color = C.white,
  width = 3,
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  width?: number;
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M-5.5 0.5 L-1.8 4.2 L5.5 -3.8"
      fill="none"
      stroke={color}
      strokeWidth={width / size}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** The logo's M stroke (48-unit artboard) with its accent dot. */
export function BrandMark({
  x,
  y,
  scale = 1,
  color = C.ink,
  dot = C.green,
}: {
  x: number;
  y: number;
  scale?: number;
  color?: string;
  dot?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M8 40 V18 L21 31 L32.37 19.63"
        fill="none"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38.23" cy="13.77" r="4.2" fill={dot} />
    </g>
  );
}

/** Three window dots for a browser/app chrome bar starting at (x, y). */
export function WindowDots({
  x,
  y,
  fill = C.line,
}: {
  x: number;
  y: number;
  fill?: string;
}) {
  return (
    <g fill={fill}>
      <circle cx={x} cy={y} r="5" />
      <circle cx={x + 16} cy={y} r="5" />
      <circle cx={x + 32} cy={y} r="5" />
    </g>
  );
}
