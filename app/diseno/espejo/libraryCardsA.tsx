// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Library building blocks, part 1: checklist, health ring, line chart, stat
 * card and KPI tiles. Each piece keeps the coordinates of the bespoke cover
 * it comes from (640×400 space); the registry crops it with its viewBox.
 */
import {
  Bar,
  C,
  DISPLAY,
  Panel,
  SANS,
  Tick,
} from "./parts";
import {
  TrendUp,
  WordText,
} from "./templates";
import type { PieceProps } from "./libraryTypes";

const SHADOW = "rgba(33,33,33,0.12)";

/** Clipboard checklist (from the technical audit cover). */
export function ChecklistCard({ tint }: PieceProps) {
  const a = tint ?? C.green;
  const rows = [
    { y: 124, a: 124, b: 70, done: true },
    { y: 168, a: 96, b: 88, done: true },
    { y: 212, a: 132, b: 58, done: true },
    { y: 256, a: 104, b: 80, done: false },
    { y: 300, a: 84, b: 64, done: false },
  ];
  return (
    <>
      <Panel x={140} y={80} w={226} h={270} r={20} stroke={C.line} />
      <rect x={208} y={64} width={90} height={32} rx={12} fill={C.ink} />
      <rect x={238} y={74} width={30} height={8} rx={4} fill={C.mint} />
      {rows.map((row) => (
        <g key={row.y}>
          <rect
            x={164}
            y={row.y - 2}
            width={24}
            height={24}
            rx={7}
            fill={row.done ? a : C.white}
            stroke={row.done ? undefined : C.line}
            strokeWidth={row.done ? undefined : 2.5}
          />
          {row.done ? <Tick x={176} y={row.y + 10} /> : null}
          <Bar x={202} y={row.y + 1} w={row.a} fill={C.ink} />
          <Bar x={202} y={row.y + 14} w={row.b} h={6} />
        </g>
      ))}
    </>
  );
}

/** Site-health ring with its score. */
export function HealthRing({ tint, param }: PieceProps) {
  const circumference = 2 * Math.PI * 60;
  return (
    <>
      <circle cx={448} cy={244} r={96} fill={SHADOW} />
      <circle cx={448} cy={236} r={96} fill={C.ink} />
      <circle
        cx={448}
        cy={236}
        r={60}
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={16}
      />
      <circle
        cx={448}
        cy={236}
        r={60}
        fill="none"
        stroke={tint ?? C.mint}
        strokeWidth={16}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.92} ${circumference}`}
        transform="rotate(-90 448 236)"
      />
      <WordText
        x={448}
        y={250}
        text={param ?? "92"}
        maxW={84}
        maxSize={46}
        fill={C.white}
        anchor="middle"
      />
      <text
        x={448}
        y={274}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={12}
        fill="rgba(255,255,255,0.6)"
      >
        salud
      </text>
      <circle cx={524} cy={160} r={9} fill={C.white} />
    </>
  );
}

/** Rising line chart on a white card (from the chart template). */
export function LineChartCard({ tint }: PieceProps) {
  const a = tint ?? C.green;
  const values = [0.2, 0.3, 0.25, 0.42, 0.36, 0.55, 0.6, 0.8];
  const pts = values.map((v, i) => [108 + i * 40, 292 - v * 128] as const);
  const line = pts.map((p) => p.join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <>
      <Panel x={80} y={84} w={344} h={236} r={20} stroke={C.line} />
      <Bar x={104} y={108} w={88} fill={C.ink} />
      <Bar x={104} y={124} w={54} h={6} />
      <circle cx={334} cy={112} r={5} fill={a} />
      <Bar x={346} y={108} w={52} />
      {[164, 207, 250].map((y) => (
        <line
          key={y}
          x1={104}
          x2={396}
          y1={y}
          y2={y}
          stroke={C.grey}
          strokeWidth={2}
        />
      ))}
      <line
        x1={104}
        x2={396}
        y1={292}
        y2={292}
        stroke={C.line}
        strokeWidth={2}
      />
      <polygon points={`108,292 ${line} ${lx},292`} fill={C.mintSoft} />
      <line
        x1={lx}
        x2={lx}
        y1={ly}
        y2={292}
        stroke={C.ink}
        strokeWidth={1.5}
        strokeDasharray="3 5"
      />
      <polyline
        points={line}
        fill="none"
        stroke={a}
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.slice(0, -1).map(([x, y]) => (
        <circle
          key={x}
          cx={x}
          cy={y}
          r={4}
          fill={C.white}
          stroke={a}
          strokeWidth={2.5}
        />
      ))}
      <circle
        cx={lx}
        cy={ly}
        r={8}
        fill={C.mint}
        stroke={C.ink}
        strokeWidth={3}
      />
    </>
  );
}

/** Dark stat card with the headline figure (from the chart template). */
export function StatCard({ tint, param }: PieceProps) {
  const a = tint ?? C.mint;
  return (
    <>
      <Panel x={368} y={190} w={200} h={140} r={18} fill={C.ink} />
      <text x={390} y={220} fontFamily={SANS} fontSize={12} fill="#ffffff99">
        últimos 28 días
      </text>
      <TrendUp x={538} y={210} color={a} />
      <WordText
        x={388}
        y={278}
        text={param ?? "+38%"}
        maxW={160}
        maxSize={52}
        fill={a}
      />
      <Bar x={390} y={300} w={156} h={6} fill="rgba(255,255,255,0.16)" />
      <Bar x={390} y={300} w={108} h={6} fill={C.white} />
    </>
  );
}

function Kpi({
  x,
  y,
  label,
  value,
  fill,
  dark = false,
  accent,
}: {
  x: number;
  y: number;
  label: string;
  value: string;
  fill: string;
  dark?: boolean;
  accent: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={106} height={70} rx={12} fill={fill} />
      <text
        x={x + 12}
        y={y + 22}
        fontFamily={SANS}
        fontSize={11}
        fill={dark ? "rgba(255,255,255,0.6)" : C.muted}
      >
        {label}
      </text>
      <text
        x={x + 12}
        y={y + 53}
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={24}
        letterSpacing={-1}
        fill={dark ? accent : C.ink}
      >
        {value}
      </text>
    </g>
  );
}

/** Four KPI tiles on a white card (from the client report cover). */
export function KpiGrid({ tint }: PieceProps) {
  const a = tint ?? C.mint;
  return (
    <>
      <Panel x={126} y={114} w={248} h={176} r={18} stroke={C.line} />
      <Kpi
        x={140}
        y={128}
        label="Clics"
        value="+38%"
        fill={C.ink}
        dark
        accent={a}
      />
      <Kpi
        x={254}
        y={128}
        label="Posición"
        value="4,2"
        fill={C.grey}
        accent={a}
      />
      <Kpi x={140} y={206} label="CTR" value="5,1%" fill={C.grey} accent={a} />
      <Kpi
        x={254}
        y={206}
        label="Leads"
        value="126"
        fill={C.mintSoft}
        accent={a}
      />
    </>
  );
}

/** One KPI tile with a trend arrow. */
export function KpiTile({ tint, param }: PieceProps) {
  const a = tint ?? C.mint;
  return (
    <>
      <rect x={0} y={8} width={180} height={112} rx={16} fill={SHADOW} />
      <rect x={0} y={0} width={180} height={112} rx={16} fill={C.ink} />
      <text x={18} y={30} fontFamily={SANS} fontSize={13} fill="#ffffff99">
        Clics orgánicos
      </text>
      <TrendUp x={150} y={26} color={a} />
      <WordText
        x={16}
        y={82}
        text={param ?? "12,4k"}
        maxW={150}
        maxSize={40}
        fill={C.white}
      />
      <Bar x={18} y={94} w={144} h={5} fill="rgba(255,255,255,0.16)" />
      <Bar x={18} y={94} w={98} h={5} fill={a} />
    </>
  );
}
