// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/** Generated cover illustrations, part 3: timeline and channel bars. Themes and helpers live in templates.tsx. */
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
  TrendUp,
  WordText,
  type ArtProps,
} from "./templates";

/** Cronograma: milestones along a track, ending in the goal card. */
export function TimelineArt({ t, word }: ArtProps) {
  const nodes = [
    { x: 104, up: true, state: "done" },
    { x: 196, up: false, state: "done" },
    { x: 288, up: true, state: "now" },
    { x: 380, up: false, state: "next" },
  ] as const;
  const y = 216;
  return (
    <>
      <line
        x1={104}
        x2={480}
        y1={y}
        y2={y}
        stroke={t.onSoft}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={104}
        x2={288}
        y1={y}
        y2={y}
        stroke={t.on}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {nodes.map((n, i) => {
        const cardY = n.up ? 112 : 260;
        return (
          <g key={n.x}>
            <line
              x1={n.x}
              x2={n.x}
              y1={n.up ? cardY + 64 : y + 22}
              y2={n.up ? y - 22 : cardY}
              stroke={t.onSoft}
              strokeWidth={2.5}
            />
            <Panel
              x={n.x - 54}
              y={cardY}
              w={108}
              h={58}
              r={14}
              shadow={t.shadow}
              stroke={t.stroke}
              depth={6}
            />
            <text
              x={n.x - 38}
              y={cardY + 24}
              fontFamily={MONO}
              fontSize={12}
              fill={C.muted}
            >
              {`M${i + 1}`}
            </text>
            {n.state === "done" ? (
              <Tick x={n.x + 32} y={cardY + 20} color={C.green} />
            ) : null}
            <Bar
              x={n.x - 38}
              y={cardY + 36}
              w={i % 2 ? 56 : 72}
              fill={n.state === "next" ? C.line : C.ink}
            />
            {n.state === "now" ? (
              <>
                <circle
                  cx={n.x}
                  cy={y}
                  r={20}
                  fill="none"
                  stroke={t.on}
                  strokeWidth={3}
                />
                <circle cx={n.x} cy={y} r={11} fill={t.pop} />
              </>
            ) : n.state === "done" ? (
              <>
                <circle cx={n.x} cy={y} r={14} fill={t.on} />
                <Tick x={n.x} y={y} color={t.onFg} />
              </>
            ) : (
              <circle
                cx={n.x}
                cy={y}
                r={11}
                fill={t.bg}
                stroke={t.on}
                strokeWidth={3}
                strokeDasharray="4 4"
              />
            )}
          </g>
        );
      })}
      <g className={MOVE.right}>
        <Panel
          x={464}
          y={166}
          w={128}
          h={96}
          r={18}
          fill={t.card.bg}
          shadow={t.card.shadow}
        />
        <text
          x={482}
          y={192}
          fontFamily={SANS}
          fontSize={12}
          fill={t.card.soft}
        >
          objetivo
        </text>
        <WordText
          x={480}
          y={238}
          text={word ?? "Top 3"}
          maxW={96}
          maxSize={34}
          fill={t.card.fg}
        />
        <circle cx={574} cy={186} r={5} fill={t.card.accent} />
      </g>
    </>
  );
}

/** Barras: traffic by channel, with the headline figure in a card. */
export function BarsArt({ t, word }: ArtProps) {
  const rows = [
    { w: 200, fill: C.green, v: "42%" },
    { w: 150, fill: C.mint, v: "28%" },
    { w: 104, fill: C.ink, v: "16%" },
    { w: 64, fill: C.line, v: "9%" },
    { w: 40, fill: C.line, v: "5%" },
  ];
  return (
    <>
      <Panel
        x={250}
        y={96}
        w={322}
        h={232}
        r={20}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <Bar x={286} y={122} w={92} fill={C.ink} />
      <Bar x={286} y={138} w={56} h={6} />
      {rows.map((row, i) => {
        const y = 170 + i * 30;
        return (
          <g key={row.v}>
            <circle
              cx={292}
              cy={y + 6}
              r={5}
              fill={row.fill === C.line ? C.muted : row.fill}
            />
            <rect
              x={306}
              y={y}
              width={row.w}
              height={12}
              rx={6}
              fill={row.fill}
            />
            <text
              x={548}
              y={y + 10.5}
              textAnchor="end"
              fontFamily={MONO}
              fontSize={12}
              fill={C.muted}
            >
              {row.v}
            </text>
          </g>
        );
      })}
      <g className={MOVE.up}>
        <Panel
          x={70}
          y={176}
          w={206}
          h={132}
          r={18}
          fill={t.card.bg}
          shadow={t.card.shadow}
        />
        <text x={92} y={206} fontFamily={SANS} fontSize={12} fill={t.card.soft}>
          sesiones
        </text>
        <WordText
          x={90}
          y={262}
          text={word ?? "12,4k"}
          maxW={164}
          maxSize={50}
          fill={t.card.fg}
        />
        <TrendUp x={246} y={196} color={t.card.accent} />
        <Bar x={92} y={282} w={70} h={6} fill={t.card.accent} />
        <Bar x={168} y={282} w={42} h={6} fill={t.card.track} />
      </g>
      <circle cx={98} cy={128} r={9} fill={t.pop} />
      <circle cx={136} cy={150} r={4} fill={t.onSoft} />
    </>
  );
}
