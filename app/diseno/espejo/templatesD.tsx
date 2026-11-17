// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/** Generated cover illustrations, part 4: URL and search. Themes and helpers live in templates.tsx. */
import {
  Bar,
  BrandMark,
  C,
  MONO,
  MOVE,
  Panel,
} from "./parts";
import {
  WordText,
  fitSize,
  textWidth,
  type ArtProps,
} from "./templates";

/** A chain-link glyph centred on (x, y). */
function LinkGlyph({
  x,
  y,
  color,
  scale = 1,
}: {
  x: number;
  y: number;
  color: string;
  scale?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(-45) scale(${scale})`}
      fill="none"
      stroke={color}
      strokeWidth={6 / scale}
    >
      <rect x={-34} y={-11} width={40} height={22} rx={11} />
      <rect x={-6} y={-11} width={40} height={22} rx={11} />
    </g>
  );
}

/** URL: an address bar, the site structure under it and a link card. */
export function UrlArt({ t, word }: ArtProps) {
  const branch = (y: number, label: string, active: boolean) => (
    <g>
      <path
        d={`M128 ${y - 40} V${y - 8} a8 8 0 0 0 8 8 H160`}
        fill="none"
        stroke={t.onSoft}
        strokeWidth={2.5}
      />
      <Panel
        x={160}
        y={y - 20}
        w={150}
        h={40}
        r={12}
        shadow={t.shadow}
        stroke={t.stroke}
        depth={5}
      />
      <circle cx={180} cy={y} r={5} fill={active ? C.green : C.line} />
      <text x={194} y={y + 5} fontFamily={MONO} fontSize={14} fill={C.ink}>
        {label}
      </text>
    </g>
  );
  return (
    <>
      <Panel
        x={72}
        y={82}
        w={496}
        h={56}
        r={28}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <path
        d="M96 109 V104 a4.5 4.5 0 0 1 9 0 V109"
        fill="none"
        stroke={C.ink}
        strokeWidth={2.5}
      />
      <rect x={92} y={108} width={17} height={13} rx={3.5} fill={C.ink} />
      <text
        x={120}
        y={115}
        fontFamily={MONO}
        fontSize={15}
        fill={C.ink}
        textLength={10 * 8.6}
        lengthAdjust="spacingAndGlyphs"
      >
        tu-web.com
      </text>
      <rect x={210} y={97} width={62} height={26} rx={8} fill={C.grey} />
      <text
        x={217}
        y={115}
        fontFamily={MONO}
        fontSize={15}
        fill={C.ink}
        textLength={48}
        lengthAdjust="spacingAndGlyphs"
      >
        /blog
      </text>
      <rect x={276} y={97} width={110} height={26} rx={8} fill={C.mint} />
      <text
        x={283}
        y={115}
        fontFamily={MONO}
        fontWeight={600}
        fontSize={15}
        fill={C.ink}
        textLength={96}
        lengthAdjust="spacingAndGlyphs"
      >
        /guia-seo
      </text>
      <circle cx={538} cy={110} r={16} fill={C.ink} />
      <path
        d="M531 110 H544 M539 104.5 L544.5 110 L539 115.5"
        fill="none"
        stroke={C.mint}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={96} y={168} width={64} height={38} rx={12} fill={t.on} />
      <text
        x={128}
        y={193}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={16}
        fill={t.bg}
      >
        /
      </text>
      {branch(246, "/blog", true)}
      <path d="M128 246 V286" fill="none" stroke={t.onSoft} strokeWidth={2.5} />
      {branch(306, "/precios", false)}
      <g className={MOVE.up}>
        <Panel
          x={358}
          y={184}
          w={210}
          h={146}
          r={20}
          fill={t.card.bg}
          shadow={t.card.shadow}
        />
        {word ? (
          <>
            <LinkGlyph x={396} y={222} color={t.card.accent} scale={0.5} />
            <WordText
              x={380}
              y={300}
              text={word}
              maxW={164}
              maxSize={52}
              fill={t.card.fg}
            />
          </>
        ) : (
          <LinkGlyph x={463} y={257} color={t.card.accent} scale={1.15} />
        )}
      </g>
    </>
  );
}

/** Búsqueda: a search box with the query, results and a magnifier. */
export function SearchArt({ t, word }: ArtProps) {
  const size = word ? fitSize(word, 290, 28) : 0;
  const caret = word ? 146 + Math.min(textWidth(word, size), 290) + 6 : 300;
  const results = [192, 240, 288];
  return (
    <>
      <Panel
        x={80}
        y={82}
        w={424}
        h={64}
        r={32}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      <circle
        cx={116}
        cy={112}
        r={9}
        fill="none"
        stroke={C.ink}
        strokeWidth={3}
      />
      <line
        x1={122.5}
        y1={118.5}
        x2={130}
        y2={126}
        stroke={C.ink}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {word ? (
        <WordText
          x={146}
          y={124}
          text={word}
          maxW={290}
          maxSize={28}
          fill={C.ink}
        />
      ) : (
        <Bar x={146} y={109} w={146} h={10} fill={C.ink} />
      )}
      <rect x={caret} y={100} width={2.5} height={26} rx={1} fill={C.green} />
      <Panel
        x={80}
        y={168}
        w={384}
        h={172}
        r={20}
        shadow={t.shadow}
        stroke={t.stroke}
      />
      {results.map((y, i) => (
        <g key={y}>
          <circle cx={108} cy={y + 12} r={10} fill={i === 0 ? C.ink : C.grey} />
          {i === 0 ? (
            <BrandMark
              x={100.5}
              y={y + 4.5}
              scale={0.31}
              color={C.white}
              dot={C.mint}
            />
          ) : null}
          {i === 0 ? (
            <rect x={128} y={y + 8} width={190} height={10} fill={C.mint} />
          ) : null}
          <Bar
            x={128}
            y={y + 2}
            w={i === 0 ? 186 : 160 - i * 18}
            h={10}
            fill={i === 0 ? C.ink : C.muted}
          />
          <Bar x={128} y={y + 22} w={252 - i * 30} h={6} />
        </g>
      ))}
      <g className={MOVE.upRight}>
        <circle
          cx={492}
          cy={250}
          r={60}
          fill="none"
          stroke={t.card.shadow}
          strokeWidth={18}
          transform="translate(0 8)"
        />
        <path
          d="M534 292 L578 336"
          stroke={t.card.shadow}
          strokeWidth={24}
          strokeLinecap="round"
          transform="translate(0 8)"
        />
        <circle
          cx={492}
          cy={250}
          r={60}
          fill="rgba(255,255,255,0.4)"
          stroke={t.card.bg}
          strokeWidth={18}
        />
        <path
          d="M534 292 L578 336"
          stroke={t.card.bg}
          strokeWidth={24}
          strokeLinecap="round"
        />
        <path
          d="M462 222 a40 40 0 0 1 30 -12"
          fill="none"
          stroke={C.white}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </g>
      <circle cx={556} cy={116} r={8} fill={t.pop} />
      <circle cx={584} cy={146} r={4} fill={t.onSoft} />
    </>
  );
}
