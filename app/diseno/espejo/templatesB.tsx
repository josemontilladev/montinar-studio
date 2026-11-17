// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/** Generated cover illustrations, part 2: browser, ranking and report. Themes and helpers live in templates.tsx. */
import {
  Bar,
  BrandMark,
  C,
  DISPLAY,
  MONO,
  MOVE,
  Panel,
  SANS,
  Tick,
  WindowDots,
} from "./parts";
import {
  WordText,
  fitSize,
  textWidth,
  type ArtProps,
} from "./templates";

/** Navegador: a web page in a browser window and an "indexed" status chip. */
export function BrowserArt({ t, word }: ArtProps) {
  const titleW = 220;
  const markW = word
    ? Math.min(textWidth(word, fitSize(word, titleW, 54)) * 0.92, titleW) + 8
    : 0;
  return (
    <>
      <Panel
        x={84}
        y={72}
        w={472}
        h={264}
        r={20}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <WindowDots x={108} y={96} />
      <rect x={168} y={84} width={272} height={24} rx={12} fill={C.grey} />
      <rect x={180} y={93} width={9} height={7} rx={2} fill={C.green} />
      <Bar x={198} y={92} w={128} h={8} />
      <line
        x1={84}
        x2={556}
        y1={120}
        y2={120}
        stroke={C.line}
        strokeWidth={1.5}
      />
      {word ? (
        <>
          <rect x={106} y={176} width={markW} height={16} fill={C.mint} />
          <WordText
            x={110}
            y={190}
            text={word}
            maxW={titleW}
            maxSize={54}
            fill={C.ink}
          />
        </>
      ) : (
        <>
          <rect x={110} y={164} width={150} height={14} fill={C.mint} />
          <Bar x={110} y={146} w={206} h={16} fill={C.ink} />
          <Bar x={110} y={172} w={146} h={16} fill={C.ink} />
        </>
      )}
      <Bar x={110} y={214} w={214} />
      <Bar x={110} y={230} w={184} />
      <Bar x={110} y={246} w={200} />
      <rect x={110} y={272} width={104} height={32} rx={16} fill={C.ink} />
      <Bar x={128} y={284} w={60} fill={C.mint} />
      <rect
        x={350}
        y={140}
        width={180}
        height={170}
        rx={14}
        fill={C.mintSoft}
      />
      <circle cx={490} cy={180} r={16} fill={C.mint} />
      <path
        d="M350 286 L402 226 L442 268 L470 240 L530 300 a10 10 0 0 1 -10 10 H360 a10 10 0 0 1 -10 -10 Z"
        fill={C.green}
      />
      <g className={MOVE.up}>
        <Panel
          x={398}
          y={296}
          w={176}
          h={52}
          r={26}
          fill={t.card.bg}
          shadow={t.card.shadow}
          depth={6}
        />
        <circle cx={424} cy={322} r={14} fill={t.card.accent} />
        <Tick x={424} y={322} color={t.card.bg} />
        <text
          x={448}
          y={318}
          fontFamily={SANS}
          fontWeight={600}
          fontSize={13}
          fill={t.card.fg}
        >
          Indexada
        </text>
        <Bar x={448} y={328} w={86} h={6} fill={t.card.track} />
      </g>
      <circle cx={584} cy={104} r={8} fill={t.pop} />
    </>
  );
}

/** Ranking: a podium with our page on the top step. */
export function RankingArt({ t, word }: ArtProps) {
  const step = (x: number, y: number, n: number) => (
    <g>
      <Panel
        x={x}
        y={y}
        w={116}
        h={330 - y}
        r={16}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <Bar x={x + 18} y={y + 20} w={58} fill={C.line} />
      <text
        x={x + 58}
        y={y + (330 - y) / 2 + 26}
        textAnchor="middle"
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={44}
        letterSpacing={-1.5}
        fill={C.ink}
      >
        {n}
      </text>
    </g>
  );
  return (
    <>
      <g transform="translate(326 236) scale(1.14) translate(-326 -236)">
        {step(144, 214, 2)}
        {step(390, 250, 3)}
        <g className={MOVE.up}>
          <Panel
            x={264}
            y={146}
            w={122}
            h={184}
            r={16}
            fill={t.card.bg}
            shadow={t.card.shadow}
          />
          <circle cx={325} cy={184} r={18} fill={t.card.accent} />
          <text
            x={325}
            y={190}
            textAnchor="middle"
            fontFamily={MONO}
            fontWeight={700}
            fontSize={16}
            fill={t.card.bg}
          >
            1
          </text>
          <WordText
            x={325}
            y={word ? 262 : 270}
            anchor="middle"
            text={word ?? "#1"}
            maxW={100}
            maxSize={word ? 40 : 56}
            fill={t.card.fg}
          />
          <Bar x={293} y={292} w={64} h={6} fill={t.card.track} />
        </g>
        <path
          d="M470 236 C 476 170, 440 132, 400 130"
          fill="none"
          stroke={t.on}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="1 8"
        />
        <path
          d="M410 122 L398 130 L409 139"
          fill="none"
          stroke={t.on}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={224} cy={170} r={8} fill={t.pop} />
        <rect
          x={212}
          y={112}
          width={12}
          height={12}
          rx={3}
          fill={t.onSoft}
          transform="rotate(20 218 118)"
        />
        <circle cx={268} cy={110} r={4} fill={t.on} />
        <circle cx={522} cy={196} r={6} fill={t.onSoft} />
      </g>
    </>
  );
}

/** Informe: a report page with a bar chart and a KPI card. */
export function ReportArt({ t, word }: ArtProps) {
  const heights = [40, 58, 48, 74, 66, 94];
  const spark = [12, 16, 10, 14, 6, 8, 0];
  return (
    <>
      <rect x={176} y={70} width={214} height={266} rx={16} fill={t.onSoft} />
      <Panel
        x={150}
        y={86}
        w={214}
        h={266}
        r={16}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <BrandMark x={166} y={98} scale={0.62} />
      <Bar x={204} y={110} w={92} fill={C.ink} />
      <Bar x={204} y={124} w={58} h={6} />
      {heights.map((h, i) => (
        <rect
          key={h}
          x={172 + i * 30}
          y={250 - h}
          width={18}
          height={h}
          rx={5}
          fill={i === heights.length - 1 ? C.green : C.mint}
        />
      ))}
      <line
        x1={168}
        x2={346}
        y1={252}
        y2={252}
        stroke={C.line}
        strokeWidth={2}
      />
      <Bar x={172} y={270} w={168} />
      <Bar x={172} y={286} w={136} />
      <Bar x={172} y={302} w={150} />
      <Bar x={172} y={322} w={84} fill={C.ink} />
      <g className={MOVE.up}>
        <Panel
          x={346}
          y={172}
          w={226}
          h={132}
          r={18}
          fill={t.card.bg}
          shadow={t.card.shadow}
        />
        <text
          x={368}
          y={202}
          fontFamily={SANS}
          fontSize={12}
          fill={t.card.soft}
        >
          vs. mes anterior
        </text>
        <WordText
          x={366}
          y={256}
          text={word ?? "+124%"}
          maxW={180}
          maxSize={48}
          fill={t.card.fg}
        />
        <polyline
          points={spark.map((v, i) => `${370 + i * 27},${280 + v}`).join(" ")}
          fill="none"
          stroke={t.card.accent}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={532} cy={280} r={5} fill={t.card.accent} />
      </g>
      <circle cx={552} cy={124} r={10} fill={t.pop} />
      <circle cx={112} cy={296} r={5} fill={t.onSoft} />
    </>
  );
}
