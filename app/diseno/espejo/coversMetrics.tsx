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
  Tick,
} from "./parts";

/** Point on a circle, angle in turns from 12 o'clock, clockwise. */
function polar(cx: number, cy: number, r: number, turn: number) {
  const a = turn * Math.PI * 2 - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

/** A donut slice from `from` to `to` (turns). */
function slice(
  [cx, cy]: readonly [number, number],
  r: number,
  inner: number,
  from: number,
  to: number,
) {
  const large = to - from > 0.5 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const [x3, y3] = polar(cx, cy, inner, to);
  const [x4, y4] = polar(cx, cy, inner, from);
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
}

/** Share of voice: a donut split between four brands, the client's slice
 *  (mint) pulled out, next to a mini leaderboard and an AI answer bubble
 *  naming the brand. */
function ShareOfVoiceCover() {
  // Runzone, Montañapro, Trailfit (client), Pisaleve — the post's example.
  const parts = [0.379, 0.291, 0.211, 0.119];
  const fills = [C.ink, C.muted, C.mint, C.line];
  let at = 0;
  const cx = 214;
  const cy = 206;
  return (
    <>
      <circle cx={cx} cy={cy + 8} r={124} fill="rgba(33,33,33,0.12)" />
      {parts.map((share, i) => {
        const from = at;
        at += share;
        const client = i === 2;
        const [dx, dy] = polar(0, 0, client ? 12 : 0, from + share / 2);
        return (
          <path
            key={share}
            d={slice([cx, cy], 124, 64, from + 0.004, at - 0.004)}
            fill={fills[i]}
            stroke={client ? C.ink : undefined}
            strokeWidth={client ? 2.5 : undefined}
            transform={`translate(${dx} ${dy})`}
            className={client ? MOVE.upRight : undefined}
          />
        );
      })}
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontFamily={DISPLAY}
        fontSize={30}
        fontWeight={700}
        letterSpacing={-1}
        fill={C.ink}
      >
        21 %
      </text>
      <text
        x={cx}
        y={cy + 26}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={12}
        fontWeight={600}
        fill={C.muted}
      >
        tu marca
      </text>

      <g className={MOVE.up}>
        <Panel x={376} y={92} w={196} h={150} r={16} />
        {[0.379, 0.291, 0.211, 0.119].map((share, i) => (
          <g key={share}>
            <circle
              cx={398}
              cy={124 + i * 30}
              r={6}
              fill={fills[i]}
              stroke={i === 3 ? C.muted : undefined}
            />
            <Bar
              x={414}
              y={120 + i * 30}
              w={Math.round(share * 300)}
              h={9}
              fill={i === 2 ? C.green : C.line}
            />
          </g>
        ))}
      </g>

      <g className={MOVE.right}>
        <Panel x={376} y={262} w={196} h={64} r={16} fill={C.ink} depth={6} />
        <circle cx={402} cy={294} r={11} fill={C.mint} />
        <Tick x={402} y={294} size={1} color={C.ink} width={2.6} />
        <Bar x={422} y={282} w={124} h={8} fill="rgba(255,255,255,0.35)" />
        <Bar x={422} y={298} w={86} h={8} fill={C.mint} />
      </g>
    </>
  );
}

/** KPIs SEO: three KPI tiles with a value and a progress bar towards a
 *  target flag, and a rising sparkline. */
function KpiCover() {
  const tiles = [
    { x: 110, value: "6.420", fill: 0.86 },
    { x: 262, value: "74", fill: 0.82 },
    { x: 414, value: "21 %", fill: 0.84 },
  ];
  return (
    <>
      <Panel x={92} y={70} w={456} h={268} r={22} />
      <Bar x={116} y={96} w={120} h={12} fill={C.ink} />
      <Bar x={116} y={118} w={70} fill={C.line} />
      {tiles.map((tile, i) => (
        <g key={tile.x} className={i === 1 ? MOVE.up : undefined}>
          <rect
            x={tile.x}
            y={146}
            width={132}
            height={98}
            rx={14}
            fill={i === 1 ? C.mintSoft : C.grey}
            stroke={i === 1 ? C.ink : undefined}
            strokeWidth={i === 1 ? 2 : undefined}
          />
          <Bar x={tile.x + 14} y={162} w={60} h={7} fill={C.muted} />
          <text
            x={tile.x + 14}
            y={204}
            fontFamily={DISPLAY}
            fontSize={28}
            fontWeight={700}
            letterSpacing={-1}
            fill={C.ink}
          >
            {tile.value}
          </text>
          <rect
            x={tile.x + 14}
            y={222}
            width={104}
            height={8}
            rx={4}
            fill={C.white}
          />
          <rect
            x={tile.x + 14}
            y={222}
            width={104 * tile.fill}
            height={8}
            rx={4}
            fill={C.green}
          />
          <rect x={tile.x + 116} y={214} width={2.5} height={24} fill={C.ink} />
          <path d={`M${tile.x + 118} 214 h12 l-4 5 l4 5 h-12 z`} fill={C.ink} />
        </g>
      ))}
      <path
        d="M116 314 C 170 306, 200 296, 250 298 S 330 284, 380 276 S 470 262, 524 256"
        fill="none"
        stroke={C.green}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle
        cx={524}
        cy={256}
        r={7}
        fill={C.mint}
        stroke={C.ink}
        strokeWidth={2.5}
      />
    </>
  );
}

/** Bespoke covers for the measurement batch (meta-m). */
export const COVERS_METRICS: Record<
  string,
  { Art: ComponentType; field: Field }
> = {
  "share-of-voice": { Art: ShareOfVoiceCover, field: "soft" },
  "kpis-seo": { Art: KpiCover, field: "mint" },
};
