// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/* eslint-disable max-lines -- Static SVG drawings for one batch of blog covers; splitting them would only scatter the batch. */
import type { ComponentType } from "react";
import type { Field } from "./PostCover";
import {
  Bar,
  BrandMark,
  C,
  Cursor,
  DISPLAY,
  MONO,
  MOVE,
  Panel,
  SANS,
  Tick,
} from "./parts";

/** Precios: three plan cards with their monthly price and a "$" price tag. */
function PricingCover() {
  const plans = [
    { x: 120, y: 120, price: "$0", rows: [70, 54, 62], featured: false },
    { x: 262, y: 84, price: "$29", rows: [72, 60, 66, 50], featured: true },
    { x: 404, y: 120, price: "$129", rows: [64, 72, 48], featured: false },
  ];
  return (
    <>
      {plans.map((plan) => {
        const f = plan.featured;
        const h = f ? 250 : 214;
        return (
          <g key={plan.x} className={f ? MOVE.up : undefined}>
            <Panel
              x={plan.x}
              y={plan.y}
              w={124}
              h={h}
              r={16}
              fill={f ? C.ink : C.white}
              shadow={f ? "rgba(33,33,33,0.22)" : "rgba(33,33,33,0.1)"}
            />
            <Bar
              x={plan.x + 18}
              y={plan.y + 22}
              w={44}
              fill={f ? C.mint : C.ink}
            />
            <text
              x={plan.x + 18}
              y={plan.y + 76}
              fontFamily={DISPLAY}
              fontWeight={700}
              fontSize={34}
              letterSpacing={-1.5}
              fill={f ? C.white : C.ink}
            >
              {plan.price}
            </text>
            <text
              x={plan.x + 18}
              y={plan.y + 96}
              fontFamily={SANS}
              fontSize={11}
              fill={f ? "rgba(255,255,255,0.6)" : C.muted}
            >
              /mes
            </text>
            <line
              x1={plan.x + 18}
              x2={plan.x + 106}
              y1={plan.y + 112}
              y2={plan.y + 112}
              stroke={f ? "rgba(255,255,255,0.18)" : C.line}
              strokeWidth={1.5}
            />
            {plan.rows.map((w, i) => (
              <g key={w + i}>
                <circle
                  cx={plan.x + 26}
                  cy={plan.y + 134 + i * 24}
                  r={7}
                  fill={f ? C.mint : C.green}
                />
                <Tick
                  x={plan.x + 26}
                  y={plan.y + 134 + i * 24}
                  size={0.62}
                  color={f ? C.ink : C.white}
                />
                <Bar
                  x={plan.x + 40}
                  y={plan.y + 130 + i * 24}
                  w={w * 0.85}
                  fill={f ? "rgba(255,255,255,0.28)" : C.line}
                />
              </g>
            ))}
          </g>
        );
      })}
      {/* Price tag hanging from the corner of the last card */}
      <g className={MOVE.upRight}>
        <g transform="translate(-14 6) rotate(14 512 96)">
          <path
            d="M486 74 H548 A8 8 0 0 1 556 82 V126 A8 8 0 0 1 548 134 H486 L466 104 Z"
            fill="rgba(33,33,33,0.18)"
            transform="translate(0 6)"
          />
          <path
            d="M486 74 H548 A8 8 0 0 1 556 82 V126 A8 8 0 0 1 548 134 H486 L466 104 Z"
            fill={C.mint}
          />
          <circle cx={484} cy={104} r={5} fill={C.ink} />
          <text
            x={522}
            y={118}
            textAnchor="middle"
            fontFamily={DISPLAY}
            fontWeight={800}
            fontSize={38}
            fill={C.ink}
          >
            $
          </text>
        </g>
      </g>
    </>
  );
}

/** Alternativas: a comparison table of three generic tools with ticks; one
 *  column is highlighted as the pick. */
function ComparisonCover() {
  const cols = [300, 380, 460];
  const rows = [
    { y: 170, w: 112, marks: [true, true, true] },
    { y: 210, w: 88, marks: [true, false, true] },
    { y: 250, w: 120, marks: [false, true, true] },
    { y: 290, w: 96, marks: [true, false, true] },
  ];
  return (
    <>
      <Panel x={116} y={76} w={420} h={262} r={20} shadow="rgba(0,0,0,0.35)" />
      {/* Highlighted column */}
      <g className={MOVE.up}>
        <rect x={428} y={92} width={64} height={230} rx={14} fill={C.mint} />
      </g>
      {/* Header: generic tool badges */}
      {cols.map((x, i) => (
        <g key={x}>
          <rect
            x={x - 18}
            y={106}
            width={36}
            height={36}
            rx={10}
            fill={i === 2 ? C.ink : C.soft}
          />
          <text
            x={x}
            y={130}
            textAnchor="middle"
            fontFamily={DISPLAY}
            fontWeight={700}
            fontSize={16}
            fill={i === 2 ? C.mint : C.ink}
          >
            {["A", "B", "C"][i]}
          </text>
        </g>
      ))}
      <text
        x={140}
        y={130}
        fontFamily={MONO}
        fontWeight={700}
        fontSize={12}
        letterSpacing={1}
        fill={C.muted}
      >
        COMPARAR
      </text>
      {rows.map((row) => (
        <g key={row.y}>
          <line
            x1={136}
            x2={516}
            y1={row.y - 18}
            y2={row.y - 18}
            stroke={C.line}
            strokeWidth={1.5}
          />
          <Bar x={140} y={row.y - 4} w={row.w} fill={C.ink} />
          {cols.map((x, i) =>
            row.marks[i] ? (
              <g key={x}>
                <circle cx={x} cy={row.y} r={11} fill={C.green} />
                <Tick x={x} y={row.y} size={0.85} />
              </g>
            ) : (
              <path
                key={x}
                d={`M${x - 6} ${row.y - 6} L${x + 6} ${row.y + 6} M${x + 6} ${row.y - 6} L${x - 6} ${row.y + 6}`}
                stroke={C.muted}
                strokeWidth={3}
                strokeLinecap="round"
              />
            ),
          )}
        </g>
      ))}
      <g className={MOVE.left}>
        <Cursor x={474} y={300} />
      </g>
    </>
  );
}

/** Herramientas SEO: an open toolbox with SEO tools sticking out and a
 *  "mejores" tag. */
function FreeToolboxCover() {
  return (
    <>
      {/* Tools sticking out of the box */}
      <g className={MOVE.up}>
        {/* Magnifier */}
        <circle
          cx={214}
          cy={146}
          r={34}
          fill={C.white}
          stroke={C.ink}
          strokeWidth={10}
        />
        <path
          d="M238 172 L262 214"
          stroke={C.ink}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <circle cx={214} cy={146} r={14} fill={C.mint} />
      </g>
      <g className={MOVE.up}>
        {/* Bar chart card */}
        <Panel x={280} y={90} w={110} h={130} r={14} />
        <rect x={298} y={160} width={16} height={40} rx={4} fill={C.soft} />
        <rect x={322} y={140} width={16} height={60} rx={4} fill={C.green} />
        <rect x={346} y={116} width={16} height={84} rx={4} fill={C.ink} />
        <Bar x={298} y={104} w={50} h={7} fill={C.ink} />
      </g>
      <g className={MOVE.upRight}>
        {/* Speed gauge */}
        <circle cx={448} cy={168} r={46} fill={C.ink} />
        <path
          d="M414 176 A34 34 0 0 1 482 176"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <path
          d="M414 176 A34 34 0 0 1 470 148"
          fill="none"
          stroke={C.mint}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <path
          d="M448 176 L468 152"
          stroke={C.white}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={448} cy={176} r={6} fill={C.white} />
      </g>
      {/* Box */}
      <rect
        x={150}
        y={232}
        width={360}
        height={118}
        rx={18}
        fill="rgba(33,33,33,0.22)"
      />
      <rect x={150} y={222} width={360} height={118} rx={18} fill={C.ink} />
      <rect
        x={150}
        y={222}
        width={360}
        height={26}
        rx={10}
        fill="rgba(255,255,255,0.1)"
      />
      <rect x={300} y={262} width={60} height={22} rx={8} fill={C.mint} />
      <rect x={316} y={270} width={28} height={6} rx={3} fill={C.ink} />
      <Bar x={180} y={306} w={90} fill="rgba(255,255,255,0.22)" />
      <Bar x={390} y={306} w={90} fill="rgba(255,255,255,0.22)" />
      {/* "Mejores" tag */}
      <g className={MOVE.right}>
        <g transform="rotate(-8 472 252)">
          <rect
            x={414}
            y={238}
            width={120}
            height={44}
            rx={22}
            fill="rgba(33,33,33,0.25)"
            transform="translate(0 5)"
          />
          <rect
            x={414}
            y={238}
            width={120}
            height={44}
            rx={22}
            fill={C.white}
          />
          <text
            x={482}
            y={267}
            textAnchor="middle"
            fontFamily={DISPLAY}
            fontWeight={800}
            fontSize={19}
            letterSpacing={-0.3}
            fill={C.ink}
          >
            mejores
          </text>
          <circle cx={432} cy={260} r={6} fill={C.green} />
        </g>
      </g>
    </>
  );
}

/** Informes: a messy spreadsheet versus a clean branded client report. */
function ReportVsSheetCover() {
  const cols = [140, 194, 248, 302];
  return (
    <>
      {/* Spreadsheet */}
      <Panel x={116} y={86} w={240} h={230} r={14} stroke={C.line} />
      <rect x={116} y={86} width={240} height={30} rx={14} fill={C.soft} />
      <rect x={116} y={102} width={240} height={14} fill={C.soft} />
      {cols.map((x, i) => (
        <text
          key={x}
          x={x + 10}
          y={106}
          fontFamily={MONO}
          fontWeight={700}
          fontSize={11}
          fill={C.muted}
        >
          {["A", "B", "C", "D"][i]}
        </text>
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((r) => (
        <g key={r}>
          <line
            x1={116}
            x2={356}
            y1={144 + r * 26}
            y2={144 + r * 26}
            stroke={C.line}
            strokeWidth={1.2}
          />
          {cols.map((x, i) => (
            <Bar
              key={x}
              x={x}
              y={126 + r * 26}
              w={[34, 26, 30, 20][(r + i) % 4]}
              h={7}
              fill={r === 3 && i === 2 ? C.muted : C.line}
            />
          ))}
        </g>
      ))}
      {cols.slice(1).map((x) => (
        <line
          key={x}
          x1={x - 8}
          x2={x - 8}
          y1={116}
          y2={316}
          stroke={C.line}
          strokeWidth={1.2}
        />
      ))}
      {/* Report */}
      <g className={MOVE.upRight}>
        <Panel
          x={330}
          y={70}
          w={226}
          h={276}
          r={18}
          fill={C.white}
          shadow="rgba(33,33,33,0.18)"
          depth={10}
        />
        <circle cx={360} cy={102} r={14} fill={C.ink} />
        <BrandMark x={349} y={90} scale={0.46} color={C.white} dot={C.mint} />
        <Bar x={384} y={92} w={90} fill={C.ink} />
        <Bar x={384} y={106} w={60} h={6} />
        <text
          x={350}
          y={160}
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={34}
          letterSpacing={-1.5}
          fill={C.ink}
        >
          +18%
        </text>
        <text x={350} y={178} fontFamily={SANS} fontSize={11} fill={C.muted}>
          clics orgánicos
        </text>
        <rect x={350} y={192} width={186} height={74} rx={10} fill={C.grey} />
        <polyline
          points="362,252 392,240 422,244 452,224 482,214 512,200 526,204"
          fill="none"
          stroke={C.green}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={512}
          cy={200}
          r={5}
          fill={C.mint}
          stroke={C.ink}
          strokeWidth={2}
        />
        <rect
          x={350}
          y={282}
          width={186}
          height={44}
          rx={10}
          fill={C.mintSoft}
        />
        <Bar x={364} y={296} w={120} fill={C.ink} />
        <Bar x={364} y={310} w={86} h={6} fill={C.green} />
      </g>
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_F: Record<string, { Art: ComponentType; field: Field }> = {
  "precios-herramientas-seo": { Art: PricingCover, field: "mintSoft" },
  "alternativas-a-semrush": { Art: ComparisonCover, field: "ink" },
  "herramientas-seo": { Art: FreeToolboxCover, field: "mint" },
  "metricaseo-vs-looker-studio": { Art: ReportVsSheetCover, field: "soft" },
};
