// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Library brand pieces (the MétricaSEO M, lockups, accent dot, marker) and a
 * few line icons in the same stroke style.
 */
import type { JSX } from "react";
import {
  C,
  DISPLAY,
} from "./parts";
import type { PieceProps } from "./libraryTypes";

const M_PATH = "M8 40 V18 L21 31 L32.37 19.63";

function MStroke({ color }: { color: string }) {
  return (
    <path
      d={M_PATH}
      fill="none"
      stroke={color}
      strokeWidth={5.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** The single-stroke M with its accent dot on the rising stroke. */
export function BrandM({ tint }: PieceProps) {
  return (
    <>
      <MStroke color={tint ?? C.ink} />
      <circle cx={38.23} cy={13.77} r={4.2} fill={C.green} />
    </>
  );
}

/** The app icon: the M on an ink tile. */
export function BrandTile({ tint }: PieceProps) {
  return (
    <>
      <rect width={48} height={48} rx={11} fill={tint ?? C.ink} />
      <g transform="translate(5.44 3.56) scale(0.78)">
        <MStroke
          color={tint === C.white || tint === C.mint ? C.ink : C.white}
        />
        <circle
          cx={38.23}
          cy={13.77}
          r={4.2}
          fill={tint === C.mint ? C.green : C.mint}
        />
      </g>
    </>
  );
}

/** Logo lockup: the M is the first letter, "etricaseo" follows and the dot
 *  lands over the "e" as its accent. */
export function BrandLogo({ tint }: PieceProps) {
  const ink = tint ?? C.ink;
  const accent = ink === C.ink ? C.green : C.mint;
  return (
    <>
      <MStroke color={ink} />
      <circle cx={46.6} cy={16.2} r={3.6} fill={accent} />
      <text
        x={36.4}
        y={42.6}
        fontFamily={DISPLAY}
        fontWeight={600}
        fontSize={36}
        letterSpacing={-0.6}
        fill={ink}
      >
        etrica<tspan fill={accent}>seo</tspan>
      </text>
    </>
  );
}

/** Compact wordmark: M tile + "MétricaSEO" (as on the social images). */
export function BrandWordmark({ tint }: PieceProps) {
  const ink = tint ?? C.ink;
  const dark = ink !== C.ink;
  return (
    <>
      <rect
        x={0}
        y={0}
        width={40}
        height={40}
        rx={10}
        fill={dark ? C.mint : C.ink}
      />
      <g transform="translate(4.5 3) scale(0.66)">
        <MStroke color={dark ? C.ink : C.white} />
        <circle cx={38.23} cy={13.77} r={4.2} fill={dark ? C.ink : C.mint} />
      </g>
      <text
        x={52}
        y={29}
        fontFamily={DISPLAY}
        fontWeight={600}
        fontSize={24}
        letterSpacing={-0.5}
        fill={ink}
      >
        Métrica<tspan fill={dark ? C.mint : C.green}>SEO</tspan>
      </text>
    </>
  );
}

export function BrandDot({ tint }: PieceProps) {
  return <circle cx={10} cy={10} r={10} fill={tint ?? C.green} />;
}

/** Flat highlighter stroke to set under a word. */
export function MarkerUnderline({ tint }: PieceProps) {
  return <path d="M5 3 L200 0 L197 26 L0 30 Z" fill={tint ?? C.mint} />;
}

function icon(children: JSX.Element) {
  return function Icon({ tint }: PieceProps) {
    return (
      <g
        fill="none"
        stroke={tint ?? C.ink}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    );
  };
}

export const ICONS: Record<
  string,
  { label: string; Render: (p: PieceProps) => JSX.Element }
> = {
  "icon-search": {
    label: "Buscar",
    Render: icon(
      <>
        <circle cx={10.5} cy={10.5} r={7} />
        <path d="M15.6 15.6 L21 21" />
      </>,
    ),
  },
  "icon-target": {
    label: "Objetivo",
    Render: icon(
      <>
        <circle cx={12} cy={12} r={9} />
        <circle cx={12} cy={12} r={5} />
        <circle cx={12} cy={12} r={1.2} />
      </>,
    ),
  },
  "icon-bolt": {
    label: "Rayo",
    Render: icon(<path d="M13 2.5 L4.5 13.5 H12 L11 21.5 L19.5 10.5 H12 Z" />),
  },
  "icon-globe": {
    label: "Web",
    Render: icon(
      <>
        <circle cx={12} cy={12} r={9} />
        <ellipse cx={12} cy={12} rx={4} ry={9} />
        <path d="M3 12 H21" />
      </>,
    ),
  },
  "icon-star": {
    label: "Estrella",
    Render: icon(
      <path d="M12 2.8 L14.8 8.6 L21.2 9.4 L16.5 13.8 L17.7 20.2 L12 17.1 L6.3 20.2 L7.5 13.8 L2.8 9.4 L9.2 8.6 Z" />,
    ),
  },
  "icon-mail": {
    label: "Correo",
    Render: icon(
      <>
        <rect x={3} y={5} width={18} height={14} rx={2.5} />
        <path d="M3.8 6.5 L12 12.8 L20.2 6.5" />
      </>,
    ),
  },
  "icon-lock": {
    label: "Candado",
    Render: icon(
      <>
        <rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} />
        <path d="M8 10.5 V7.5 a4 4 0 0 1 8 0 V10.5" />
      </>,
    ),
  },
  "icon-arrow": {
    label: "Flecha",
    Render: icon(<path d="M4 12 H20 M14 6 L20 12 L14 18" />),
  },
  "icon-chart": {
    label: "Gráfica",
    Render: icon(
      <path d="M3.5 3.5 V20.5 H20.5 M7.5 15 L11 11 L14 13.5 L19.5 7.5" />,
    ),
  },
  "icon-users": {
    label: "Usuarios",
    Render: icon(
      <>
        <circle cx={9} cy={8} r={3.5} />
        <path d="M2.5 20 a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.6 a3.5 3.5 0 0 1 0 6.8 M18 14.2 a6.5 6.5 0 0 1 3.5 5.8" />
      </>,
    ),
  },
};
