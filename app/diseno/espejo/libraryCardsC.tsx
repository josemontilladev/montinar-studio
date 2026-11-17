// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Library building blocks, part 3: ranking list, position chart, report
 * sheet, six-month roadmap and page card.
 */
import {
  Bar,
  BrandMark,
  C,
  DISPLAY,
  MONO,
  Panel,
  SANS,
  Tick,
} from "./parts";
import type { PieceProps } from "./libraryTypes";

/** Ranking list where our page sits at #2 (from the rankings cover). */
export function RankingList({ tint }: PieceProps) {
  const rows = [
    { n: 1, w: 120 },
    { n: 2, w: 0, ours: true },
    { n: 3, w: 98 },
    { n: 4, w: 128 },
  ];
  return (
    <>
      <Panel x={96} y={70} w={270} h={262} r={20} stroke={C.line} />
      <Bar x={120} y={96} w={90} fill={C.ink} />
      <text
        x={342}
        y={104}
        textAnchor="end"
        fontFamily={MONO}
        fontSize={11}
        fill={C.muted}
      >
        posición
      </text>
      {rows.map((row, i) => {
        const y = 124 + i * 50;
        return (
          <g key={row.n}>
            <rect
              x={112}
              y={y}
              width={238}
              height={40}
              rx={12}
              fill={row.ours ? (tint ?? C.mint) : C.grey}
            />
            <text
              x={128}
              y={y + 27}
              fontFamily={DISPLAY}
              fontWeight={700}
              fontSize={18}
              letterSpacing={-0.5}
              fill={C.ink}
            >
              {`#${row.n}`}
            </text>
            {row.ours ? (
              <>
                <text
                  x={166}
                  y={y + 25}
                  fontFamily={SANS}
                  fontWeight={600}
                  fontSize={13}
                  fill={C.ink}
                >
                  tu-web.com
                </text>
                <rect
                  x={288}
                  y={y + 10}
                  width={40}
                  height={20}
                  rx={10}
                  fill={C.ink}
                />
                <text
                  x={308}
                  y={y + 24}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontWeight={700}
                  fontSize={11}
                  fill={C.mint}
                >
                  ▲2
                </text>
              </>
            ) : (
              <Bar x={166} y={y + 16} w={row.w} fill={C.line} />
            )}
          </g>
        );
      })}
    </>
  );
}

/** Dark "average position" chart card. */
export function PositionCard({ tint, param }: PieceProps) {
  const a = tint ?? C.mint;
  const ys = [318, 310, 300, 294, 276, 262, 242];
  const points = ys.map((y, i) => `${356 + i * 30},${y}`).join(" ");
  return (
    <>
      <Panel x={334} y={178} w={226} h={160} r={18} fill={C.ink} />
      <text
        x={354}
        y={206}
        fontFamily={SANS}
        fontSize={11}
        fill="rgba(255,255,255,0.6)"
      >
        Posición media
      </text>
      <text
        x={540}
        y={210}
        textAnchor="end"
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={26}
        letterSpacing={-1}
        fill={a}
      >
        {param ?? "#2"}
      </text>
      {[250, 280, 310].map((y) => (
        <line
          key={y}
          x1={354}
          x2={540}
          y1={y}
          y2={y}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1.5}
        />
      ))}
      <polyline
        points={points}
        fill="none"
        stroke={a}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={536}
        cy={242}
        r={6}
        fill={a}
        stroke={C.white}
        strokeWidth={3}
      />
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
}: {
  x: number;
  y: number;
  label: string;
  value: string;
  fill: string;
  dark?: boolean;
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
        fill={dark ? C.mint : C.ink}
      >
        {value}
      </text>
    </g>
  );
}

/** Client report sheet with KPIs and a bar strip. */
export function ReportSheet({ tint }: PieceProps) {
  const bars = [14, 22, 18, 28, 26, 36, 46];
  return (
    <>
      <Panel x={120} y={60} w={262} h={296} r={18} stroke={C.line} />
      <BrandMark x={134} y={70} scale={0.66} />
      <Bar x={180} y={88} w={112} h={10} fill={C.ink} />
      <Bar x={180} y={104} w={70} h={6} />
      <Kpi x={140} y={128} label="Clics" value="+38%" fill={C.ink} dark />
      <Kpi x={254} y={128} label="Posición" value="4,2" fill={C.grey} />
      <Kpi x={140} y={206} label="CTR" value="5,1%" fill={C.grey} />
      <Kpi x={254} y={206} label="Leads" value="126" fill={C.mintSoft} />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={142 + i * 31}
          y={334 - h}
          width={18}
          height={h}
          rx={4}
          fill={i === bars.length - 1 ? (tint ?? C.green) : C.line}
        />
      ))}
    </>
  );
}

const col = (i: number) => 104 + 72 * i;

/** Six-month roadmap with task chips (from the SEO plan cover). */
export function TimelineBoard({ tint }: PieceProps) {
  const tasks = [
    {
      from: 0,
      span: 2,
      y: 146,
      fill: C.ink,
      text: C.white,
      label: "Auditoría",
    },
    {
      from: 1,
      span: 3,
      y: 192,
      fill: tint ?? C.green,
      text: C.white,
      label: "Contenidos",
    },
    { from: 2, span: 3, y: 238, fill: C.mint, text: C.ink, label: "Enlaces" },
    {
      from: 4,
      span: 2,
      y: 284,
      fill: C.mintSoft,
      text: C.ink,
      label: "Informe",
    },
  ];
  return (
    <>
      <Panel x={80} y={74} w={480} h={264} r={20} stroke={C.line} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          {i > 0 ? (
            <line
              x1={col(i)}
              x2={col(i)}
              y1={96}
              y2={318}
              stroke={C.grey}
              strokeWidth={2}
            />
          ) : null}
          <text
            x={col(i) + 36}
            y={112}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={12}
            fill={C.muted}
          >
            {`M${i + 1}`}
          </text>
        </g>
      ))}
      <line
        x1={100}
        x2={540}
        y1={126}
        y2={126}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <line
        x1={212}
        x2={212}
        y1={126}
        y2={320}
        stroke={C.green}
        strokeWidth={2}
      />
      <circle cx={212} cy={126} r={6} fill={C.green} />
      {tasks.map((task) => {
        const x = col(task.from) + 6;
        const w = 72 * task.span - 12;
        return (
          <g key={task.label}>
            <rect
              x={x}
              y={task.y}
              width={w}
              height={30}
              rx={15}
              fill={task.fill}
            />
            <text
              x={x + 15}
              y={task.y + 19.5}
              fontFamily={SANS}
              fontWeight={600}
              fontSize={13}
              fill={task.text}
            >
              {task.label}
            </text>
            {task.y === 146 ? (
              <Tick x={x + w - 18} y={task.y + 15} color={C.mint} />
            ) : null}
          </g>
        );
      })}
    </>
  );
}

/** A page card (from the indexing cover). */
export function PageCard({ tint }: PieceProps) {
  return (
    <>
      <rect
        x={0}
        y={8}
        width={118}
        height={136}
        rx={14}
        fill="rgba(33,33,33,0.12)"
      />
      <rect
        x={0}
        y={0}
        width={118}
        height={136}
        rx={14}
        fill={C.white}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <Bar x={16} y={22} w={60} fill={C.ink} />
      <Bar x={16} y={40} w={86} h={6} />
      <Bar x={16} y={52} w={70} h={6} />
      <Bar x={16} y={64} w={78} h={6} />
      <rect
        x={16}
        y={82}
        width={86}
        height={36}
        rx={8}
        fill={tint ?? C.mintSoft}
      />
    </>
  );
}
