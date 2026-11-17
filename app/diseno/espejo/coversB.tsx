// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
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

/** CTR orgánico: a Google result being clicked, and the CTR-by-position
 *  curve. */
export function CtrCover() {
  const ctr = [0.9, 0.55, 0.38, 0.27, 0.2, 0.15];
  const points = ctr.map((v, i) => [400 + i * 32, 330 - v * 64] as const);
  return (
    <>
      <Panel
        x={72}
        y={92}
        w={372}
        h={156}
        r={18}
        stroke={C.line}
        shadow="rgba(33,33,33,0.06)"
      />
      <circle cx={104} cy={128} r={15} fill={C.ink} />
      <BrandMark x={92.5} y={115} scale={0.48} color={C.white} dot={C.mint} />
      <text
        x={128}
        y={125}
        fontFamily={SANS}
        fontWeight={600}
        fontSize={13}
        fill={C.ink}
      >
        tu-web.com
      </text>
      <text x={128} y={141} fontFamily={MONO} fontSize={10.5} fill={C.muted}>
        https://tu-web.com › blog
      </text>
      <rect x={90} y={170} width={232} height={12} fill={C.mint} />
      <text
        x={92}
        y={180}
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={24}
        letterSpacing={-0.3}
        fill={C.ink}
      >
        Qué es un buen CTR
      </text>
      <Bar x={92} y={200} w={318} />
      <Bar x={92} y={216} w={236} />
      <Panel x={372} y={196} w={210} h={150} r={18} fill={C.ink} />
      <text
        x={392}
        y={224}
        fontFamily={SANS}
        fontSize={11}
        fill="rgba(255,255,255,0.6)"
      >
        CTR por posición
      </text>
      <text
        x={562}
        y={228}
        textAnchor="end"
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={24}
        letterSpacing={-1}
        fill={C.mint}
      >
        8,4%
      </text>
      <line
        x1={392}
        x2={566}
        y1={330}
        y2={330}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={1.5}
      />
      <polyline
        points={points.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={C.mint}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map(([x, y], i) => (
        <circle
          key={x}
          cx={x}
          cy={y}
          r={i === 0 ? 7 : 4}
          fill={i === 0 ? C.mint : C.ink}
          stroke={i === 0 ? C.white : C.mint}
          strokeWidth={i === 0 ? 3 : 2.5}
        />
      ))}
      <g className={MOVE.down}>
        <g stroke={C.green} strokeWidth={3} strokeLinecap="round">
          <line x1={338} y1={168} x2={346} y2={160} />
          <line x1={326} y1={164} x2={326} y2={152} />
          <line x1={342} y1={180} x2={354} y2={180} />
        </g>
        <Cursor x={328} y={180} />
      </g>
    </>
  );
}

function PageCard({
  x,
  y,
  ghost = false,
  image,
}: {
  x: number;
  y: number;
  ghost?: boolean;
  image: string;
}) {
  const line = ghost ? "rgba(255,255,255,0.25)" : C.line;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={118}
        height={136}
        rx={14}
        fill={ghost ? "rgba(255,255,255,0.06)" : C.white}
        stroke={ghost ? "rgba(255,255,255,0.45)" : undefined}
        strokeWidth={ghost ? 2 : undefined}
        strokeDasharray={ghost ? "6 6" : undefined}
      />
      <Bar
        x={x + 16}
        y={y + 22}
        w={60}
        fill={ghost ? "rgba(255,255,255,0.45)" : C.ink}
      />
      <Bar x={x + 16} y={y + 40} w={86} h={6} fill={line} />
      <Bar x={x + 16} y={y + 52} w={70} h={6} fill={line} />
      <Bar x={x + 16} y={y + 64} w={78} h={6} fill={line} />
      <rect
        x={x + 16}
        y={y + 82}
        width={86}
        height={36}
        rx={8}
        fill={ghost ? "rgba(255,255,255,0.1)" : image}
      />
    </g>
  );
}

/** Errores de indexación: indexed vs not-indexed bar, page cards with a
 *  warning and a canonical pointing back to the original. */
export function IndexingCover() {
  return (
    <>
      <rect
        x={104}
        y={84}
        width={432}
        height={28}
        rx={14}
        fill="rgba(255,255,255,0.14)"
      />
      <rect x={104} y={84} width={272} height={28} rx={14} fill={C.mint} />
      <circle cx={110} cy={136} r={5} fill={C.mint} />
      <text
        x={122}
        y={140}
        fontFamily={SANS}
        fontSize={12}
        fill="rgba(255,255,255,0.75)"
      >
        Indexadas
      </text>
      <circle cx={210} cy={136} r={5} fill="rgba(255,255,255,0.3)" />
      <text
        x={222}
        y={140}
        fontFamily={SANS}
        fontSize={12}
        fill="rgba(255,255,255,0.75)"
      >
        Sin indexar
      </text>
      <text
        x={536}
        y={140}
        textAnchor="end"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={12}
        fill={C.mint}
      >
        64%
      </text>
      <PageCard x={118} y={162} image={C.mintSoft} />
      <PageCard x={262} y={162} ghost image={C.soft} />
      <PageCard x={406} y={162} image={C.soft} />
      <circle cx={232} cy={166} r={15} fill={C.mint} />
      <Tick x={232} y={166} color={C.ink} />
      <g className={MOVE.up}>
        <circle cx={376} cy={166} r={15} fill={C.white} />
        <text
          x={376}
          y={173}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={800}
          fontSize={20}
          fill={C.ink}
        >
          !
        </text>
      </g>
      <path
        d="M465 304 C 440 352, 202 352, 177 306"
        fill="none"
        stroke={C.mint}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <path
        d="M175.8 317.9 L177 306 L187.8 311.2"
        fill="none"
        stroke={C.mint}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={321}
        y={374}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={12}
        fill={C.mint}
      >
        rel=canonical
      </text>
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

/** Informe para clientes: a KPI report sheet flying off as a paper plane. */
export function ReportCover() {
  const bars = [14, 22, 18, 28, 26, 36, 46];
  return (
    <>
      <Panel x={120} y={60} w={262} h={296} r={18} shadow="rgba(0,0,0,0.16)" />
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
          fill={i === bars.length - 1 ? C.green : C.line}
        />
      ))}
      <path
        d="M392 272 C 446 272, 430 206, 452 190"
        fill="none"
        stroke={C.white}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
      <g className={MOVE.upRight}>
        <path d="M424 160 L548 104 L466 178 Z" fill={C.white} />
        <path d="M466 178 L548 104 L490 214 Z" fill={C.mint} />
        <path d="M466 178 L476 206 L490 214 Z" fill={C.ink} />
      </g>
    </>
  );
}
