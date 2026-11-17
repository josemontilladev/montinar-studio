// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
import type { ComponentType } from "react";
import type { Field } from "./PostCover";
import {
  Bar,
  C,
  DISPLAY,
  MOVE,
  Panel,
  SANS,
} from "./parts";

/** Presupuesto SEO: a quote sheet with line items and a total, a dollar coin
 *  and a downloadable spreadsheet tab. */
function BudgetCover() {
  const rows = [
    { w: 120, price: 64 },
    { w: 96, price: 52 },
    { w: 132, price: 58 },
    { w: 84, price: 46 },
  ];
  return (
    <>
      <Panel x={150} y={58} w={250} h={290} r={20} />
      <Bar x={176} y={86} w={90} h={12} fill={C.ink} />
      <Bar x={176} y={108} w={140} fill={C.line} />
      {rows.map((row, i) => (
        <g key={row.w}>
          <circle cx={182} cy={150 + i * 34} r={5} fill={C.green} />
          <Bar x={196} y={146 + i * 34} w={row.w} />
          <Bar
            x={374 - row.price}
            y={146 + i * 34}
            w={row.price}
            fill={C.muted}
          />
        </g>
      ))}
      <line
        x1={176}
        x2={374}
        y1={286}
        y2={286}
        stroke={C.ink}
        strokeWidth={2}
      />
      <text
        x={176}
        y={322}
        fontFamily={SANS}
        fontSize={14}
        fontWeight={600}
        fill={C.muted}
      >
        Total
      </text>
      <text
        x={374}
        y={324}
        textAnchor="end"
        fontFamily={DISPLAY}
        fontSize={28}
        fontWeight={700}
        letterSpacing={-1}
        fill={C.ink}
      >
        6.930 USD
      </text>
      <g className={MOVE.upRight}>
        <circle cx={448} cy={132} r={48} fill="rgba(33,33,33,0.18)" />
        <circle
          cx={444}
          cy={124}
          r={48}
          fill={C.mint}
          stroke={C.ink}
          strokeWidth={3}
        />
        <text
          x={444}
          y={139}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontSize={26}
          fontWeight={700}
          fill={C.ink}
        >
          USD
        </text>
      </g>
      <g className={MOVE.up}>
        <Panel x={404} y={236} w={104} h={84} r={14} fill={C.green} depth={6} />
        <text
          x={456}
          y={276}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontSize={20}
          fontWeight={700}
          fill={C.white}
        >
          .xlsx
        </text>
        <path
          d="M444 290 L456 302 L468 290 M456 284 V302"
          fill="none"
          stroke={C.white}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </>
  );
}

/** Bespoke covers for posts published straight from the code. */
export const COVERS_N: Record<string, { Art: ComponentType; field: Field }> = {
  "presupuesto-seo": { Art: BudgetCover, field: "mintSoft" },
};
