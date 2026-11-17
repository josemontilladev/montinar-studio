// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/* eslint-disable max-lines -- Static SVG drawings for one batch of blog covers; splitting them would only scatter the batch. */
import type { ComponentType } from "react";
import type { Field } from "./PostCover";
import {
  Bar,
  C,
  DISPLAY,
  MONO,
  MOVE,
  Panel,
  SANS,
  Tick,
  WindowDots,
} from "./parts";

/** Small arrow pointing right, from (x, y) with the given length. */
function Arrow({
  x,
  y,
  length,
  color = C.ink,
}: {
  x: number;
  y: number;
  length: number;
  color?: string;
}) {
  const end = x + length;
  return (
    <path
      d={`M${x} ${y} H${end} M${end - 9} ${y - 8} L${end} ${y} L${end - 9} ${y + 8}`}
      fill="none"
      stroke={color}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Stage caption under the crawl → index → rank flow. */
function Stage({ x, n, label }: { x: number; n: number; label: string }) {
  return (
    <g>
      <circle cx={x - 34} cy={318} r={11} fill={C.ink} />
      <text
        x={x - 34}
        y={322.5}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={12}
        fill={C.mint}
      >
        {n}
      </text>
      <text
        x={x - 17}
        y={323}
        fontFamily={SANS}
        fontWeight={600}
        fontSize={14}
        fill={C.ink}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Qué es el SEO: Googlebot crawls a page, the page goes into the index and
 * comes out as the first of the search results.
 */
function CrawlIndexRankCover() {
  return (
    <>
      {/* 1 · The page being crawled, with the bot on its corner */}
      <Panel x={112} y={118} w={126} h={160} r={16} />
      <rect x={112} y={118} width={126} height={30} rx={16} fill={C.soft} />
      <rect x={112} y={134} width={126} height={14} fill={C.soft} />
      <WindowDots x={128} y={133} fill={C.white} />
      <Bar x={128} y={166} w={84} h={10} fill={C.ink} />
      <Bar x={128} y={188} w={92} />
      <Bar x={128} y={204} w={70} />
      <rect x={128} y={222} width={94} height={38} rx={8} fill={C.mintSoft} />
      <path d="M134 254 L156 234 L172 248 L184 238 L216 254 Z" fill={C.green} />
      <g className={MOVE.up}>
        <line
          x1={232}
          x2={232}
          y1={88}
          y2={100}
          stroke={C.ink}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={232} cy={86} r={4.5} fill={C.green} />
        <rect x={206} y={100} width={52} height={40} rx={14} fill={C.ink} />
        <circle cx={222} cy={120} r={5.5} fill={C.mint} />
        <circle cx={242} cy={120} r={5.5} fill={C.mint} />
      </g>

      <Arrow x={250} y={198} length={30} />

      {/* 2 · The index: a stack of stored pages */}
      <ellipse cx={346} cy={268} rx={56} ry={17} fill="rgba(33,33,33,0.14)" />
      <rect x={290} y={142} width={112} height={118} fill={C.ink} />
      <ellipse cx={346} cy={260} rx={56} ry={17} fill={C.ink} />
      <ellipse cx={346} cy={142} rx={56} ry={17} fill={C.muted} />
      <path
        d="M290 182 A56 17 0 0 0 402 182 M290 222 A56 17 0 0 0 402 222"
        fill="none"
        stroke={C.mint}
        strokeWidth={2.5}
      />
      <rect x={322} y={140} width={48} height={7} rx={3.5} fill={C.ink} />
      <rect x={316} y={210} width={18} height={5} rx={2.5} fill={C.mint} />

      <Arrow x={414} y={198} length={30} />

      {/* 3 · The results page, our page first */}
      <Panel x={456} y={104} w={108} h={188} r={16} />
      <g className={MOVE.right}>
        <rect x={466} y={118} width={88} height={52} rx={11} fill={C.mint} />
        <text
          x={478}
          y={152}
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={26}
          fill={C.ink}
        >
          1
        </text>
        <Bar x={500} y={134} w={44} h={8} fill={C.ink} />
        <Bar x={500} y={150} w={34} h={6} fill={C.green} />
      </g>
      {[192, 238].map((y, i) => (
        <g key={y}>
          <text
            x={478}
            y={y + 17}
            fontFamily={MONO}
            fontWeight={700}
            fontSize={14}
            fill={C.muted}
          >
            {i + 2}
          </text>
          <Bar x={500} y={y + 4} w={44} h={8} fill={C.line} />
          <Bar x={500} y={y + 20} w={30} h={6} fill={C.soft} />
        </g>
      ))}

      <Stage x={170} n={1} label="Rastreo" />
      <Stage x={362} n={2} label="Índice" />
      <Stage x={526} n={3} label="Ranking" />
    </>
  );
}

/**
 * Cómo elegir palabras clave: three keyword cards with their volume bar and
 * difficulty; the long-tail one is the pick.
 */
function KeywordCardsCover() {
  const cards = [
    { y: 92, kw: "zapatillas", vol: "Muy alto", share: 0.92, kd: "Difícil" },
    {
      y: 170,
      kw: "zapatillas running mujer",
      vol: "Medio",
      share: 0.52,
      kd: "Media",
    },
    {
      y: 248,
      kw: "running mujer pronadora asfalto",
      vol: "Bajo",
      share: 0.2,
      kd: "Fácil",
      pick: true,
    },
  ];
  return (
    <>
      {cards.map((card) => {
        const pick = Boolean(card.pick);
        return (
          <g key={card.kw} className={pick ? MOVE.right : undefined}>
            <Panel
              x={118}
              y={card.y}
              w={368}
              h={64}
              r={16}
              fill={pick ? C.mint : C.white}
              shadow="rgba(0,0,0,0.35)"
              depth={6}
            />
            <text
              x={140}
              y={card.y + 27}
              fontFamily={SANS}
              fontWeight={700}
              fontSize={15}
              fill={C.ink}
            >
              {card.kw}
            </text>
            <rect
              x={140}
              y={card.y + 40}
              width={200}
              height={10}
              rx={5}
              fill={pick ? "rgba(33,33,33,0.14)" : C.soft}
            />
            <rect
              x={140}
              y={card.y + 40}
              width={200 * card.share}
              height={10}
              rx={5}
              fill={pick ? C.ink : C.green}
            />
            <text
              x={352}
              y={card.y + 49}
              fontFamily={MONO}
              fontSize={11}
              fill={pick ? C.ink : C.muted}
            >
              {card.vol}
            </text>
            <rect
              x={406}
              y={card.y + 18}
              width={64}
              height={28}
              rx={14}
              fill={pick ? C.ink : C.soft}
            />
            <text
              x={438}
              y={card.y + 36.5}
              textAnchor="middle"
              fontFamily={SANS}
              fontWeight={600}
              fontSize={12}
              fill={pick ? C.mint : C.ink}
            >
              {card.kd}
            </text>
            {pick ? (
              <>
                <circle cx={486} cy={card.y} r={14} fill={C.green} />
                <Tick x={486} y={card.y} />
              </>
            ) : null}
          </g>
        );
      })}
      {/* Magnifier */}
      <g className={MOVE.up}>
        <circle
          cx={530}
          cy={112}
          r={24}
          fill="none"
          stroke={C.mint}
          strokeWidth={9}
        />
        <path
          d="M547 129 L562 144"
          stroke={C.mint}
          strokeWidth={11}
          strokeLinecap="round"
        />
      </g>
      <circle cx={540} cy={198} r={6} fill="rgba(255,255,255,0.35)" />
    </>
  );
}

/** Annotation pill on the right of the page anatomy, with its leader line. */
function Note({ y, from, label }: { y: number; from: number; label: string }) {
  return (
    <g>
      <line
        x1={from}
        x2={452}
        y1={y}
        y2={y}
        stroke={C.ink}
        strokeWidth={2}
        strokeDasharray="4 5"
      />
      <circle cx={from} cy={y} r={4.5} fill={C.ink} />
      <rect x={452} y={y - 15} width={100} height={30} rx={15} fill={C.ink} />
      <text
        x={502}
        y={y + 5}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={13}
        fill={C.mint}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * SEO on-page: a page laid open with its parts labelled — title, H1, the
 * image's alt text and an internal link.
 */
function PageAnatomyCover() {
  return (
    <>
      <Panel x={116} y={70} w={300} h={276} r={18} />
      {/* Chrome with the <title> tab */}
      <WindowDots x={136} y={92} />
      <rect x={190} y={80} width={150} height={24} rx={8} fill={C.grey} />
      <text x={202} y={96} fontFamily={SANS} fontSize={11} fill={C.ink}>
        Implantes dentales…
      </text>
      <line
        x1={116}
        x2={416}
        y1={110}
        y2={110}
        stroke={C.line}
        strokeWidth={1.5}
      />
      {/* H1 + intro */}
      <Bar x={136} y={126} w={206} h={16} fill={C.ink} />
      <Bar x={136} y={150} w={140} h={16} fill={C.ink} />
      <Bar x={136} y={180} w={256} />
      <Bar x={136} y={194} w={232} />
      {/* Image with alt */}
      <rect x={136} y={216} width={124} height={86} rx={10} fill={C.mintSoft} />
      <circle cx={234} cy={236} r={9} fill={C.mint} />
      <path d="M144 294 L180 254 L204 278 L222 262 L252 294 Z" fill={C.green} />
      {/* Text with an internal link */}
      <Bar x={276} y={222} w={116} />
      <Bar x={276} y={238} w={98} />
      <Bar x={276} y={254} w={110} />
      <Bar x={276} y={278} w={76} h={8} fill={C.green} />
      <rect x={276} y={290} width={76} height={2.5} rx={1} fill={C.green} />
      <Bar x={136} y={318} w={200} />

      <g className={MOVE.right}>
        <Note y={92} from={340} label="title" />
        <Note y={140} from={342} label="H1" />
        <Note y={250} from={260} label="alt" />
        <Note y={282} from={352} label="enlace" />
      </g>
    </>
  );
}

/** A five-point star centred on (x, y). */
function Star({
  x,
  y,
  r = 9,
  fill,
}: {
  x: number;
  y: number;
  r?: number;
  fill: string;
}) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(x + radius * Math.cos(angle)).toFixed(2)},${(y + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={points} fill={fill} />;
}

/**
 * Datos estructurados: a JSON-LD card and the rich result it makes possible,
 * with stars, rating and price.
 */
function SchemaCover() {
  const key = "rgba(255,255,255,0.62)";
  const lines: Array<[string, string, string]> = [
    ["", "{", ""],
    ["  ", '"@type": ', '"Product",'],
    ["  ", '"name": ', '"Zapatilla X",'],
    ["  ", '"price": ', '"49.00",'],
    ["  ", '"priceCurrency": ', '"USD",'],
    ["  ", '"ratingValue": ', '"4.6"'],
    ["", "}", ""],
  ];
  return (
    <>
      <Panel
        x={110}
        y={78}
        w={262}
        h={252}
        r={18}
        fill={C.ink}
        shadow="rgba(0,0,0,0.25)"
      />
      <WindowDots x={132} y={102} fill="rgba(255,255,255,0.22)" />
      <text
        x={352}
        y={106}
        textAnchor="end"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={11}
        fill={C.mint}
      >
        JSON-LD
      </text>
      {lines.map(([indent, k, v], i) => (
        <text
          key={k + v}
          x={132}
          y={146 + i * 24}
          fontFamily={MONO}
          fontSize={13}
          xmlSpace="preserve"
          fill={key}
        >
          {indent}
          <tspan fill={v ? key : C.white}>{k}</tspan>
          <tspan fill={C.mint}>{v}</tspan>
        </text>
      ))}

      {/* Rich result */}
      <g className={MOVE.up}>
        <Panel x={392} y={128} w={170} h={164} r={16} />
        <circle cx={412} cy={152} r={8} fill={C.soft} />
        <Bar x={426} y={148} w={80} h={7} />
        <text
          x={406}
          y={186}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={16}
          fill={C.ink}
        >
          Zapatilla X
        </text>
        <Bar x={406} y={198} w={136} h={7} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            x={414 + i * 20}
            y={228}
            fill={i < 4 ? C.green : C.line}
          />
        ))}
        <text
          x={512}
          y={233}
          fontFamily={MONO}
          fontWeight={700}
          fontSize={13}
          fill={C.ink}
        >
          4,6
        </text>
        <rect x={406} y={250} width={84} height={26} rx={13} fill={C.mint} />
        <text
          x={448}
          y={267.5}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={700}
          fontSize={12}
          fill={C.ink}
        >
          49 USD
        </text>
        <circle cx={510} cy={263} r={5} fill={C.green} />
      </g>
      <circle cx={382} cy={212} r={14} fill={C.white} />
      <path
        d="M376 212 H388 M383 207 L388 212 L383 217"
        fill="none"
        stroke={C.ink}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_G: Record<string, { Art: ComponentType; field: Field }> = {
  "que-es-el-seo": { Art: CrawlIndexRankCover, field: "mint" },
  "como-elegir-palabras-clave": { Art: KeywordCardsCover, field: "ink" },
  "seo-on-page": { Art: PageAnatomyCover, field: "soft" },
  "datos-estructurados-schema": { Art: SchemaCover, field: "green" },
};
