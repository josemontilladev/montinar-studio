// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
import {
  C,
  DISPLAY,
  MONO,
  MOVE,
  Panel,
  SANS,
  WindowDots,
} from "./parts";

/** Monospaced text forced to a fixed advance per character, so chip widths
 *  hold whatever monospace font the visitor's system has. */
function MonoText({
  x,
  y,
  text,
  size,
  fill,
  advance,
  weight = 400,
}: {
  x: number;
  y: number;
  text: string;
  size: number;
  fill: string;
  advance: number;
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={MONO}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      textLength={text.length * advance}
      lengthAdjust="spacingAndGlyphs"
    >
      {text}
    </text>
  );
}

function ParamTag({
  x,
  y,
  name,
  value,
}: {
  x: number;
  y: number;
  name: string;
  value: string;
}) {
  const keyW = name.length * 7.6 + 24;
  const valueW = value.length * 7.6 + 24;
  return (
    <g>
      <Panel
        x={x}
        y={y}
        w={keyW + valueW}
        h={32}
        r={10}
        shadow="rgba(33,33,33,0.08)"
        depth={5}
      />
      <rect x={x} y={y} width={keyW} height={32} rx={10} fill={C.ink} />
      <rect x={x + keyW - 10} y={y} width={10} height={32} fill={C.ink} />
      <MonoText
        x={x + 12}
        y={y + 20.5}
        text={name}
        size={13}
        fill={C.mint}
        advance={7.6}
      />
      <MonoText
        x={x + keyW + 12}
        y={y + 20.5}
        text={value}
        size={13}
        fill={C.ink}
        advance={7.6}
      />
    </g>
  );
}

/** Parámetros UTM: a URL with its utm_ parameters highlighted, unpacked
 *  into tags, and a link chain. */
export function UtmCover() {
  const tags = [
    { y: 180, x: 152, name: "utm_source", value: "google" },
    { y: 230, x: 152, name: "utm_medium", value: "cpc" },
    { y: 280, x: 152, name: "utm_campaign", value: "black-friday" },
  ];
  return (
    <>
      <Panel x={64} y={84} w={512} h={56} r={28} shadow="rgba(33,33,33,0.08)" />
      <path
        d="M92 111 V106 a4.5 4.5 0 0 1 9 0 V111"
        fill="none"
        stroke={C.ink}
        strokeWidth={2.5}
      />
      <rect x={88} y={110} width={17} height={13} rx={3.5} fill={C.ink} />
      <MonoText
        x={116}
        y={117}
        text="tu-web.com/"
        size={15}
        fill={C.ink}
        advance={8.6}
      />
      <rect x={210} y={99} width={174} height={26} rx={8} fill={C.mint} />
      <MonoText
        x={217}
        y={117}
        text="?utm_source=google"
        size={15}
        fill={C.ink}
        advance={8.8}
        weight={600}
      />
      <MonoText
        x={388}
        y={117}
        text="&"
        size={15}
        fill={C.muted}
        advance={8.8}
      />
      <rect x={400} y={99} width={142} height={26} rx={8} fill={C.green} />
      <MonoText
        x={407}
        y={117}
        text="utm_medium=cpc"
        size={15}
        fill={C.white}
        advance={9}
        weight={600}
      />
      <path
        d="M118 140 V296 M118 196 H150 M118 246 H150 M118 296 H150"
        fill="none"
        stroke={C.ink}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={118} cy={140} r={5} fill={C.ink} />
      {tags.map((tag) => (
        <ParamTag key={tag.name} {...tag} />
      ))}
      <g className={MOVE.up}>
        <rect
          x={447}
          y={263}
          width={76}
          height={34}
          rx={17}
          fill="none"
          stroke={C.green}
          strokeWidth={10}
          transform="rotate(-45 485 280)"
        />
        <rect
          x={483}
          y={227}
          width={76}
          height={34}
          rx={17}
          fill="none"
          stroke={C.ink}
          strokeWidth={10}
          transform="rotate(-45 521 244)"
        />
      </g>
    </>
  );
}

/** Guía de Search Console: the performance report with clicks and
 *  impressions lines, under a magnifier. */
export function SearchConsoleCover() {
  const xs = Array.from({ length: 9 }, (_, i) => 104 + i * 46);
  const impressions = [290, 282, 286, 270, 262, 266, 248, 236, 222];
  const clicks = [306, 302, 304, 296, 292, 294, 284, 278, 270];
  const line = (ys: number[]) => ys.map((y, i) => `${xs[i]},${y}`).join(" ");
  return (
    <>
      <Panel
        x={84}
        y={72}
        w={410}
        h={262}
        r={18}
        shadow="rgba(33,33,33,0.14)"
      />
      <WindowDots x={106} y={98} />
      <rect x={162} y={88} width={176} height={20} rx={10} fill={C.grey} />
      <text x={176} y={102} fontFamily={MONO} fontSize={10} fill={C.muted}>
        search.google.com
      </text>
      <line
        x1={84}
        x2={494}
        y1={120}
        y2={120}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <rect x={104} y={136} width={150} height={54} rx={12} fill={C.ink} />
      <text
        x={118}
        y={155}
        fontFamily={SANS}
        fontSize={11}
        fill="rgba(255,255,255,0.6)"
      >
        Clics
      </text>
      <text
        x={118}
        y={180}
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={20}
        letterSpacing={-0.3}
        fill={C.white}
      >
        12,4 mil
      </text>
      <rect x={262} y={136} width={150} height={54} rx={12} fill={C.green} />
      <text
        x={276}
        y={155}
        fontFamily={SANS}
        fontSize={11}
        fill="rgba(255,255,255,0.75)"
      >
        Impresiones
      </text>
      <text
        x={276}
        y={180}
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={20}
        letterSpacing={-0.3}
        fill={C.white}
      >
        386 mil
      </text>
      {[230, 262, 294].map((y) => (
        <line
          key={y}
          x1={104}
          x2={474}
          y1={y}
          y2={y}
          stroke={C.grey}
          strokeWidth={2}
        />
      ))}
      <polyline
        points={line(impressions)}
        fill="none"
        stroke={C.green}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={line(clicks)}
        fill="none"
        stroke={C.ink}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={xs[8]}
        cy={impressions[8]}
        r={6}
        fill={C.green}
        stroke={C.white}
        strokeWidth={3}
      />
      <g className={MOVE.up}>
        <circle
          cx={470}
          cy={250}
          r={52}
          fill="rgba(213,252,227,0.55)"
          stroke={C.ink}
          strokeWidth={15}
        />
        <line
          x1={508}
          y1={288}
          x2={548}
          y2={328}
          stroke={C.ink}
          strokeWidth={22}
          strokeLinecap="round"
        />
      </g>
    </>
  );
}
