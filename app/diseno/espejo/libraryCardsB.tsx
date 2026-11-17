// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Library building blocks, part 2: bar chart, AI answer bubble, cited source,
 * browser window and search result.
 */
import {
  Bar,
  BrandMark,
  C,
  DISPLAY,
  MONO,
  Panel,
  SANS,
  WindowDots,
} from "./parts";
import { Sparkle } from "./templates";
import type { PieceProps } from "./libraryTypes";

const SHADOW = "rgba(33,33,33,0.12)";

/** Bar chart card with the last bar highlighted and its growth chip. */
export function BarChartCard({ tint, param }: PieceProps) {
  const a = tint ?? C.green;
  const bars = [48, 70, 62, 96, 88, 128];
  const fills = [C.soft, C.soft, C.soft, C.ink, C.soft, a];
  return (
    <>
      <Panel x={0} y={0} w={300} h={220} r={18} stroke={C.line} />
      <Bar x={22} y={24} w={84} fill={C.ink} />
      <Bar x={22} y={40} w={50} h={6} />
      <text
        x={278}
        y={32}
        textAnchor="end"
        fontFamily={MONO}
        fontSize={11}
        fill={C.muted}
      >
        sesiones
      </text>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={30 + i * 42}
          y={192 - h}
          width={26}
          height={h}
          rx={6}
          fill={fills[i]}
        />
      ))}
      <line
        x1={20}
        x2={280}
        y1={192}
        y2={192}
        stroke={C.line}
        strokeWidth={2}
      />
      <rect x={210} y={34} width={70} height={24} rx={12} fill={C.ink} />
      <text
        x={245}
        y={50.5}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={12}
        fill={C.mint}
      >
        {param ?? "+42%"}
      </text>
    </>
  );
}

function Chip({
  x,
  y,
  n,
  active,
}: {
  x: number;
  y: number;
  n: number;
  active?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={26} height={22} rx={7} fill={active ?? C.soft} />
      <text
        x={x + 13}
        y={y + 15.5}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={12}
        fill={C.ink}
      >
        {n}
      </text>
    </g>
  );
}

/** AI answer bubble citing sources (from the "SEO e IA" cover). */
export function ChatBubble({ tint }: PieceProps) {
  const a = tint ?? C.mint;
  return (
    <>
      <rect x={104} y={92} width={350} height={186} rx={26} fill={SHADOW} />
      <path d="M150 250 L132 304 L204 250 Z" fill={C.white} />
      <rect
        x={104}
        y={84}
        width={350}
        height={186}
        rx={26}
        fill={C.white}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <circle cx={142} cy={122} r={17} fill={a} />
      <Sparkle x={142} y={122} fill={C.ink} />
      <Bar x={170} y={112} w={92} fill={C.ink} />
      <Bar x={170} y={126} w={56} h={6} />
      <Bar x={128} y={162} w={204} h={9} />
      <Chip x={340} y={155} n={1} />
      <Bar x={128} y={190} w={150} h={9} />
      <Chip x={286} y={183} n={2} active={a} />
      <Bar x={128} y={218} w={186} h={9} />
      <Chip x={322} y={211} n={3} />
      <Bar x={128} y={246} w={112} h={9} />
    </>
  );
}

/** The cited source card with the brand mark. */
export function SourceCard({ tint }: PieceProps) {
  return (
    <>
      <Panel x={392} y={198} w={184} h={120} r={18} stroke={C.line} />
      <Chip x={410} y={216} n={2} active={tint ?? C.mint} />
      <text
        x={446}
        y={232}
        fontFamily={SANS}
        fontWeight={600}
        fontSize={14}
        fill={C.ink}
      >
        tu-web.com
      </text>
      <Bar x={410} y={256} w={146} />
      <Bar x={410} y={272} w={118} />
      <Bar x={410} y={288} w={74} fill={C.ink} />
      <BrandMark x={522} y={270} scale={0.75} />
    </>
  );
}

/** Browser window with a landing page sketch. */
export function BrowserWindow({ tint }: PieceProps) {
  const a = tint ?? C.mint;
  return (
    <>
      <Panel x={0} y={0} w={410} h={262} r={18} stroke={C.line} />
      <WindowDots x={22} y={25} />
      <rect x={78} y={15} width={176} height={20} rx={10} fill={C.grey} />
      <text x={92} y={29} fontFamily={MONO} fontSize={10} fill={C.muted}>
        tu-web.com
      </text>
      <line x1={0} x2={410} y1={48} y2={48} stroke={C.line} strokeWidth={1.5} />
      <Bar x={22} y={70} w={168} h={14} fill={C.ink} />
      <Bar x={22} y={92} w={120} h={14} fill={C.ink} />
      <Bar x={22} y={118} w={150} />
      <Bar x={22} y={132} w={112} />
      <rect x={22} y={152} width={96} height={28} rx={14} fill={a} />
      <Bar x={38} y={163} w={64} h={6} fill={C.ink} />
      <rect x={214} y={66} width={174} height={114} rx={12} fill={C.grey} />
      <circle cx={256} cy={100} r={12} fill={a} />
      <path d="M226 168 L280 120 L318 152 L340 134 L376 168 Z" fill={C.line} />
      {[22, 150, 278].map((x) => (
        <g key={x}>
          <rect x={x} y={196} width={110} height={46} rx={10} fill={C.grey} />
          <Bar x={x + 12} y={208} w={56} h={7} fill={C.ink} />
          <Bar x={x + 12} y={222} w={80} h={6} />
        </g>
      ))}
    </>
  );
}

/** Google result with the highlighted title (from the CTR cover). */
export function SerpSnippet({ tint }: PieceProps) {
  return (
    <>
      <Panel x={72} y={92} w={372} h={156} r={18} stroke={C.line} />
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
      <rect x={90} y={170} width={232} height={12} fill={tint ?? C.mint} />
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
    </>
  );
}
