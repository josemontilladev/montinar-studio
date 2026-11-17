// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/** Generated cover illustrations, part 1: chart, checklist and AI chat. Themes and helpers live in templates.tsx. */
import {
  Bar,
  C,
  MONO,
  MOVE,
  Panel,
  SANS,
  Tick,
} from "./parts";
import {
  Sparkle,
  TrendUp,
  WordText,
  type ArtProps,
} from "./templates";

/** Gráfica: a rising line chart and a stat card with the headline figure. */
export function ChartArt({ t, word }: ArtProps) {
  const values = [0.2, 0.3, 0.25, 0.42, 0.36, 0.55, 0.6, 0.8];
  const pts = values.map((v, i) => [108 + i * 40, 292 - v * 128] as const);
  const line = pts.map((p) => p.join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <>
      <Panel
        x={80}
        y={84}
        w={344}
        h={236}
        r={20}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <Bar x={104} y={108} w={88} fill={C.ink} />
      <Bar x={104} y={124} w={54} h={6} />
      <circle cx={334} cy={112} r={5} fill={C.green} />
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
        stroke={C.green}
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
          stroke={C.green}
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
      <g className={MOVE.up}>
        <Panel
          x={368}
          y={190}
          w={200}
          h={140}
          r={18}
          fill={t.card.bg}
          shadow={t.card.shadow}
        />
        <text
          x={390}
          y={220}
          fontFamily={SANS}
          fontSize={12}
          fill={t.card.soft}
        >
          últimos 28 días
        </text>
        <TrendUp x={538} y={210} color={t.card.accent} />
        <WordText
          x={388}
          y={278}
          text={word ?? "+38%"}
          maxW={160}
          maxSize={52}
          fill={t.card.accent}
        />
        <Bar x={390} y={300} w={156} h={6} fill={t.card.track} />
        <Bar x={390} y={300} w={108} h={6} fill={t.card.fg} />
      </g>
      <circle cx={556} cy={112} r={9} fill={t.pop} />
      <circle cx={586} cy={146} r={4} fill={t.onSoft} />
    </>
  );
}

/** Checklist: a clipboard of tasks and a completion card. */
export function ChecklistArt({ t, word }: ArtProps) {
  const rows = [
    { a: 120, b: 70, state: "done" },
    { a: 94, b: 86, state: "done" },
    { a: 132, b: 58, state: "done" },
    { a: 104, b: 80, state: "now" },
    { a: 84, b: 64, state: "todo" },
  ] as const;
  return (
    <>
      <Panel
        x={112}
        y={82}
        w={236}
        h={266}
        r={20}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <rect x={184} y={66} width={92} height={32} rx={12} fill={C.ink} />
      <rect x={215} y={77} width={30} height={8} rx={4} fill={C.mint} />
      {rows.map((row, i) => {
        const y = 124 + i * 44;
        return (
          <g key={y}>
            <rect
              x={136}
              y={y - 2}
              width={24}
              height={24}
              rx={7}
              fill={
                row.state === "done"
                  ? C.green
                  : row.state === "now"
                    ? C.mint
                    : C.white
              }
              stroke={row.state === "todo" ? C.line : undefined}
              strokeWidth={row.state === "todo" ? 2.5 : undefined}
            />
            {row.state === "done" ? <Tick x={148} y={y + 10} /> : null}
            {row.state === "now" ? (
              <circle cx={148} cy={y + 10} r={4} fill={C.ink} />
            ) : null}
            <Bar
              x={174}
              y={y + 1}
              w={row.a}
              fill={row.state === "todo" ? C.line : C.ink}
            />
            <Bar x={174} y={y + 14} w={row.b} h={6} />
          </g>
        );
      })}
      <g className={MOVE.up}>
        <Panel
          x={376}
          y={150}
          w={186}
          h={158}
          r={20}
          fill={t.card.bg}
          shadow={t.card.shadow}
        />
        <text
          x={398}
          y={182}
          fontFamily={SANS}
          fontSize={12}
          fill={t.card.soft}
        >
          completado
        </text>
        <WordText
          x={396}
          y={246}
          text={word ?? "3/5"}
          maxW={146}
          maxSize={60}
          fill={t.card.fg}
        />
        <Bar x={398} y={272} w={142} h={10} fill={t.card.track} />
        <Bar x={398} y={272} w={86} h={10} fill={t.card.accent} />
        <circle cx={556} cy={152} r={24} fill={t.pop} />
        <Tick x={556} y={152} size={1.6} color={t.popFg} width={3.5} />
      </g>
      <circle cx={420} cy={112} r={6} fill={t.onSoft} />
    </>
  );
}

/** Numbered citation chip, mint when it is ours. */
function Chip({
  x,
  y,
  n,
  on,
}: {
  x: number;
  y: number;
  n: number;
  on?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={26}
        height={22}
        rx={7}
        fill={on ? C.mint : C.soft}
      />
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

/** Chat IA: a question bubble and an AI answer citing sources. */
export function ChatArt({ t, word }: ArtProps) {
  return (
    <>
      <Panel
        x={292}
        y={76}
        w={262}
        h={74}
        r={24}
        fill={t.card.bg}
        shadow={t.card.shadow}
        depth={6}
      />
      <path d="M506 140 L548 178 L530 140 Z" fill={t.card.bg} />
      {word ? (
        <WordText
          x={318}
          y={126}
          text={word}
          maxW={206}
          maxSize={34}
          fill={t.card.fg}
        />
      ) : (
        <>
          <Bar x={318} y={102} w={178} h={9} fill={t.card.fg} />
          <Bar x={318} y={120} w={118} h={8} fill={t.card.track} />
        </>
      )}
      <circle cx={522} cy={113} r={12} fill={t.card.accent} />
      <path
        d="M516 113 H527 M523 108.5 L527.5 113 L523 117.5"
        fill="none"
        stroke={t.card.bg}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Panel
        x={84}
        y={172}
        w={366}
        h={160}
        r={24}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <path
        d="M126 326 L104 370 L184 326"
        fill={C.white}
        stroke={t.stroke}
        strokeWidth={t.stroke ? 1.5 : undefined}
        strokeLinejoin="round"
      />
      <circle cx={122} cy={208} r={17} fill={C.mint} />
      <Sparkle x={122} y={208} fill={C.ink} />
      <Bar x={150} y={198} w={92} fill={C.ink} />
      <Bar x={150} y={212} w={56} h={6} />
      <Bar x={108} y={248} w={212} h={9} />
      <Chip x={328} y={241} n={1} />
      <Bar x={108} y={276} w={156} h={9} />
      <Chip x={272} y={269} n={2} on />
      <Bar x={108} y={304} w={118} h={9} />
      <g className={MOVE.up}>
        <Panel
          x={404}
          y={232}
          w={168}
          h={104}
          r={16}
          shadow={t.shadow}
          stroke={t.stroke}
        />
        <Chip x={420} y={248} n={2} on />
        <text
          x={454}
          y={264}
          fontFamily={SANS}
          fontWeight={600}
          fontSize={13}
          fill={C.ink}
        >
          tu-web.com
        </text>
        <Bar x={420} y={286} w={134} />
        <Bar x={420} y={302} w={96} />
        <Bar x={420} y={318} w={60} fill={C.ink} />
      </g>
      <circle cx={92} cy={118} r={8} fill={t.pop} />
      <circle cx={120} cy={142} r={4} fill={t.onSoft} />
    </>
  );
}
