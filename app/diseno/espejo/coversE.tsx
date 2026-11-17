// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/* eslint-disable max-lines -- Static SVG drawings for one batch of blog covers; splitting them would only scatter the batch. */
import type { ComponentType } from "react";
import type { Field } from "./PostCover";
import {
  Bar,
  C,
  Cursor,
  DISPLAY,
  MONO,
  MOVE,
  Panel,
  SANS,
  Tick,
} from "./parts";

/** A magnifying glass centred on (x, y). */
function Magnifier({
  x,
  y,
  r,
  color,
  width,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
  width: number;
}) {
  const k = r * 0.72;
  return (
    <g fill="none" stroke={color} strokeLinecap="round">
      <circle cx={x} cy={y} r={r} strokeWidth={width} />
      <line
        x1={x + k}
        y1={y + k}
        x2={x + k + r * 0.7}
        y2={y + k + r * 0.7}
        strokeWidth={width * 1.3}
      />
    </g>
  );
}

/** Five-point star centred on (x, y). */
function Star({
  x,
  y,
  r,
  fill,
}: {
  x: number;
  y: number;
  r: number;
  fill: string;
}) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(x + radius * Math.cos(angle)).toFixed(2)},${(y + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={points} fill={fill} />;
}

/** A plain search result: favicon, title line and description lines. */
function PlainResult({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x + 10} cy={y + 10} r={10} fill={C.soft} />
      <Bar x={x + 28} y={y + 6} w={92} h={7} />
      <Bar x={x} y={y + 28} w={230} h={9} fill={C.soft} />
      <Bar x={x} y={y + 44} w={300} h={6} />
    </g>
  );
}

/** Cómo aparecer en Google: a results page where your site shows up. */
function AppearOnGoogleCover() {
  return (
    <>
      <Panel x={112} y={66} w={420} h={276} r={20} />
      <rect
        x={134}
        y={88}
        width={376}
        height={38}
        rx={19}
        fill={C.white}
        stroke={C.line}
        strokeWidth={2}
      />
      <Magnifier x={156} y={105} r={7} color={C.muted} width={2.5} />
      <text x={176} y={112} fontFamily={SANS} fontSize={14} fill={C.ink}>
        cómo aparecer en google
      </text>
      <PlainResult x={140} y={146} />
      <PlainResult x={140} y={276} />
      <g className={MOVE.up}>
        <Panel
          x={150}
          y={204}
          w={398}
          h={62}
          r={14}
          stroke={C.ink}
          shadow="rgba(33,33,33,0.22)"
          depth={6}
        />
        <circle cx={176} cy={224} r={11} fill={C.mint} />
        <circle cx={176} cy={224} r={4} fill={C.ink} />
        <text
          x={196}
          y={228}
          fontFamily={MONO}
          fontSize={12}
          fontWeight={700}
          fill={C.ink}
        >
          tu-web.com
        </text>
        <Bar x={166} y={244} w={250} h={8} fill={C.ink} />
        <rect x={438} y={214} width={94} height={26} rx={13} fill={C.green} />
        <Tick x={455} y={227} />
        <text
          x={468}
          y={231.5}
          fontFamily={SANS}
          fontWeight={600}
          fontSize={12}
          fill={C.white}
        >
          Indexada
        </text>
      </g>
      <g className={MOVE.upRight}>
        <Cursor x={414} y={252} />
      </g>
    </>
  );
}

/** Por qué mi web no aparece: an empty site: search and a checklist of fixes. */
function NotOnGoogleCover() {
  const fixes = [
    { y: 180, label: "quitar noindex", done: true },
    { y: 216, label: "revisar robots.txt", done: true },
    { y: 252, label: "enviar sitemap", done: true },
    { y: 288, label: "pedir indexación", done: false },
  ];
  return (
    <>
      <Panel x={112} y={74} w={268} h={250} r={20} shadow="rgba(0,0,0,0.35)" />
      <rect
        x={130}
        y={92}
        width={232}
        height={34}
        rx={17}
        fill={C.white}
        stroke={C.line}
        strokeWidth={2}
      />
      <text x={148} y={114} fontFamily={MONO} fontSize={12} fill={C.ink}>
        site:tu-web.com
      </text>
      <Magnifier x={236} y={196} r={40} color={C.soft} width={12} />
      <g stroke={C.muted} strokeWidth={6} strokeLinecap="round">
        <line x1={222} y1={182} x2={250} y2={210} />
        <line x1={250} y1={182} x2={222} y2={210} />
      </g>
      <text
        x={246}
        y={300}
        textAnchor="middle"
        fontFamily={SANS}
        fontWeight={600}
        fontSize={13}
        fill={C.muted}
      >
        0 resultados
      </text>
      <g className={MOVE.up}>
        <Panel
          x={336}
          y={128}
          w={212}
          h={196}
          r={18}
          fill={C.mint}
          shadow="rgba(0,0,0,0.35)"
        />
        <text
          x={356}
          y={160}
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={16}
          fill={C.ink}
        >
          Cómo arreglarlo
        </text>
        {fixes.map((fix) => (
          <g key={fix.y}>
            <rect
              x={356}
              y={fix.y - 2}
              width={22}
              height={22}
              rx={6}
              fill={fix.done ? C.ink : C.mint}
              stroke={fix.done ? undefined : C.ink}
              strokeWidth={fix.done ? undefined : 2}
            />
            {fix.done ? <Tick x={367} y={fix.y + 9} color={C.mint} /> : null}
            <text
              x={390}
              y={fix.y + 14}
              fontFamily={MONO}
              fontSize={12}
              fill={C.ink}
            >
              {fix.label}
            </text>
          </g>
        ))}
      </g>
    </>
  );
}

/** Cuánto tarda Google en indexar: a clock and the discover → index steps. */
function IndexTimeCover() {
  const steps = [
    { y: 138, label: "Descubierta", tag: "sitemap", state: "done" },
    { y: 202, label: "Rastreada", tag: "Googlebot", state: "done" },
    { y: 266, label: "Indexada", tag: "en Google", state: "now" },
  ] as const;
  const ticks = Array.from({ length: 12 }, (_, i) => (Math.PI / 6) * i);
  return (
    <>
      <g className={MOVE.up}>
        <circle cx={214} cy={212} r={92} fill="rgba(33,33,33,0.12)" />
        <circle cx={214} cy={204} r={92} fill={C.ink} />
        <circle
          cx={214}
          cy={204}
          r={70}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={10}
        />
        <circle
          cx={214}
          cy={204}
          r={70}
          fill="none"
          stroke={C.mint}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 70 * 0.62} ${2 * Math.PI * 70}`}
          transform="rotate(-90 214 204)"
        />
        {ticks.map((a) => (
          <circle
            key={a}
            cx={214 + 52 * Math.cos(a)}
            cy={204 + 52 * Math.sin(a)}
            r={2.5}
            fill="rgba(255,255,255,0.45)"
          />
        ))}
        <line
          x1={214}
          y1={204}
          x2={214}
          y2={164}
          stroke={C.white}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <line
          x1={214}
          y1={204}
          x2={244}
          y2={222}
          stroke={C.mint}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <circle cx={214} cy={204} r={7} fill={C.white} />
      </g>
      <Panel x={330} y={92} w={222} h={232} r={18} />
      <line
        x1={356}
        x2={356}
        y1={150}
        y2={278}
        stroke={C.line}
        strokeWidth={3}
      />
      <g className={MOVE.right}>
        {steps.map((step) => {
          const now = step.state === "now";
          return (
            <g key={step.y}>
              {now ? (
                <rect
                  x={342}
                  y={step.y - 8}
                  width={198}
                  height={44}
                  rx={12}
                  fill={C.mintSoft}
                />
              ) : null}
              <circle
                cx={356}
                cy={step.y + 12}
                r={11}
                fill={now ? C.green : C.ink}
              />
              <Tick x={356} y={step.y + 12} size={0.8} />
              <text
                x={378}
                y={step.y + 10}
                fontFamily={SANS}
                fontWeight={700}
                fontSize={14}
                fill={C.ink}
              >
                {step.label}
              </text>
              <text
                x={378}
                y={step.y + 27}
                fontFamily={MONO}
                fontSize={11}
                fill={C.muted}
              >
                {step.tag}
              </text>
            </g>
          );
        })}
      </g>
    </>
  );
}

/** Cómo posicionar en Google: a podium with your site on the top step. */
function FirstPlaceCover() {
  const steps = [
    { x: 150, y: 226, w: 112, n: "2", fill: C.white, text: C.ink },
    { x: 262, y: 170, w: 120, n: "1", fill: C.ink, text: C.mint },
    { x: 382, y: 256, w: 112, n: "3", fill: C.mintSoft, text: C.ink },
  ];
  return (
    <>
      {steps.map((step) => (
        <g key={step.n}>
          <rect
            x={step.x + 8}
            y={step.y + 8}
            width={step.w}
            height={340 - step.y}
            fill="rgba(0,0,0,0.16)"
          />
          <rect
            x={step.x}
            y={step.y}
            width={step.w}
            height={340 - step.y}
            fill={step.fill}
          />
          <text
            x={step.x + step.w / 2}
            y={step.y + 62}
            textAnchor="middle"
            fontFamily={DISPLAY}
            fontWeight={700}
            fontSize={step.n === "1" ? 56 : 42}
            letterSpacing={-2}
            fill={step.text}
          >
            {step.n}
          </text>
        </g>
      ))}
      <g className={MOVE.up}>
        <Panel
          x={224}
          y={94}
          w={196}
          h={56}
          r={14}
          shadow="rgba(0,0,0,0.22)"
          depth={6}
        />
        <circle cx={248} cy={112} r={10} fill={C.mint} />
        <circle cx={248} cy={112} r={3.5} fill={C.ink} />
        <text
          x={266}
          y={116}
          fontFamily={MONO}
          fontWeight={700}
          fontSize={12}
          fill={C.ink}
        >
          tu-web.com
        </text>
        <Bar x={238} y={132} w={164} h={7} />
      </g>
      <g className={MOVE.upRight}>
        <circle cx={520} cy={150} r={30} fill={C.mint} />
        <path
          d="M520 166 V134 M507 147 L520 134 L533 147"
          fill="none"
          stroke={C.ink}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle cx={140} cy={128} r={8} fill={C.white} />
      <circle cx={170} cy={98} r={4} fill="rgba(255,255,255,0.5)" />
    </>
  );
}

/** A map pin with its tip at (x, y). */
function Pin({
  x,
  y,
  size = 1,
  fill,
  dot = C.white,
}: {
  x: number;
  y: number;
  size?: number;
  fill: string;
  dot?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path
        d="M0 0 C-6 -14 -22 -26 -22 -44 A22 22 0 0 1 22 -44 C22 -26 6 -14 0 0 Z"
        fill={fill}
      />
      <circle cx={0} cy={-44} r={8.5} fill={dot} />
    </g>
  );
}

/** Cómo aparecer en Google Maps: a map, your pin and the business card. */
function MapsCover() {
  return (
    <>
      <Panel
        x={110}
        y={68}
        w={440}
        h={272}
        r={20}
        fill={C.grey}
        stroke={C.line}
        shadow="rgba(33,33,33,0.08)"
      />
      <rect x={140} y={92} width={96} height={86} rx={8} fill={C.mintSoft} />
      <rect x={136} y={248} width={96} height={74} rx={8} fill={C.soft} />
      <rect x={350} y={250} width={120} height={70} rx={8} fill={C.soft} />
      <g stroke={C.white} strokeLinecap="butt" fill="none">
        <line x1={111} y1={212} x2={549} y2={212} strokeWidth={18} />
        <line x1={300} y1={69} x2={300} y2={339} strokeWidth={18} />
        <path d="M111 120 L250 230 L330 339" strokeWidth={10} />
        <line x1={490} y1={69} x2={490} y2={339} strokeWidth={10} />
      </g>
      <Pin x={184} y={292} size={0.55} fill={C.muted} />
      <Pin x={440} y={300} size={0.55} fill={C.muted} />
      <g className={MOVE.up}>
        <ellipse cx={300} cy={214} rx={20} ry={6} fill="rgba(33,33,33,0.18)" />
        <Pin x={300} y={212} fill={C.green} />
      </g>
      <g className={MOVE.right}>
        <Panel
          x={340}
          y={90}
          w={192}
          h={112}
          r={14}
          shadow="rgba(33,33,33,0.18)"
          depth={6}
        />
        <text
          x={358}
          y={120}
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={16}
          fill={C.ink}
        >
          Tu negocio
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} x={364 + i * 17} y={140} r={7} fill={C.green} />
        ))}
        <Bar x={358} y={160} w={140} h={7} />
        <rect x={358} y={174} width={70} height={20} rx={10} fill={C.mint} />
        <text
          x={393}
          y={188}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={600}
          fontSize={11}
          fill={C.ink}
        >
          Abierto
        </text>
      </g>
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_E: Record<string, { Art: ComponentType; field: Field }> = {
  "como-aparecer-en-google": { Art: AppearOnGoogleCover, field: "soft" },
  "por-que-mi-web-no-aparece-en-google": {
    Art: NotOnGoogleCover,
    field: "ink",
  },
  "cuanto-tarda-google-en-indexar": { Art: IndexTimeCover, field: "mintSoft" },
  "como-posicionar-en-google": { Art: FirstPlaceCover, field: "green" },
  "como-aparecer-en-google-maps": { Art: MapsCover, field: "white" },
};
