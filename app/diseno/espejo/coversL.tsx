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
  WindowDots,
} from "./parts";

/** Google Analytics 4: a sessions chart in an app window and a channel donut. */
function Ga4Cover() {
  const bars = [62, 88, 74, 104, 96, 128, 118, 146];
  const circumference = 2 * Math.PI * 44;
  const slices = [
    { share: 0.48, color: C.mint },
    { share: 0.27, color: C.green },
    { share: 0.25, color: C.white },
  ];
  let offset = 0;
  return (
    <>
      <Panel x={120} y={76} w={330} h={252} r={20} />
      <WindowDots x={144} y={100} />
      <Bar x={300} y={96} w={126} h={8} />
      <line
        x1={120}
        x2={450}
        y1={118}
        y2={118}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <text
        x={144}
        y={150}
        fontFamily={SANS}
        fontSize={12}
        fontWeight={600}
        fill={C.muted}
      >
        Sesiones
      </text>
      <text
        x={144}
        y={182}
        fontFamily={DISPLAY}
        fontSize={30}
        fontWeight={700}
        letterSpacing={-1}
        fill={C.ink}
      >
        12.480
      </text>
      <rect x={270} y={162} width={58} height={24} rx={12} fill={C.mintSoft} />
      <text
        x={299}
        y={178.5}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={12}
        fontWeight={700}
        fill={C.green}
      >
        +18 %
      </text>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={146 + i * 30}
          y={308 - h * 0.72}
          width={20}
          height={h * 0.72}
          rx={6}
          fill={i === bars.length - 1 ? C.green : C.soft}
        />
      ))}
      <g className={MOVE.up}>
        <Panel x={392} y={150} w={164} h={180} r={20} fill={C.ink} />
        {slices.map((s) => {
          const dash = circumference * s.share;
          const el = (
            <circle
              key={s.color}
              cx={474}
              cy={222}
              r={44}
              fill="none"
              stroke={s.color}
              strokeWidth={20}
              strokeDasharray={`${dash - 3} ${circumference}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 474 222)"
            />
          );
          offset += dash;
          return el;
        })}
        <text
          x={474}
          y={226}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={11}
          fontWeight={700}
          fill={C.white}
        >
          canales
        </text>
        <Bar x={414} y={290} w={52} h={7} fill="rgba(255,255,255,0.5)" />
        <Bar x={414} y={306} w={84} h={7} fill="rgba(255,255,255,0.25)" />
      </g>
    </>
  );
}

/** Eventos en GA4: a stream of event chips; the key event is starred. */
function EventsCover() {
  const events = [
    { name: "page_view", y: 92, x: 150 },
    { name: "scroll", y: 146, x: 196 },
    { name: "file_download", y: 254, x: 170 },
    { name: "click", y: 308, x: 214 },
  ];
  return (
    <>
      <line
        x1={130}
        x2={130}
        y1={84}
        y2={340}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={2}
        strokeDasharray="4 7"
      />
      {events.map((e) => (
        <g key={e.name}>
          <circle cx={130} cy={e.y + 14} r={5} fill="rgba(255,255,255,0.35)" />
          <rect
            x={e.x}
            y={e.y}
            width={e.name.length * 9 + 32}
            height={28}
            rx={14}
            fill="rgba(255,255,255,0.1)"
          />
          <text
            x={e.x + 16}
            y={e.y + 18.5}
            fontFamily={MONO}
            fontSize={13}
            fill="rgba(255,255,255,0.8)"
          >
            {e.name}
          </text>
        </g>
      ))}
      <circle cx={130} cy={214} r={8} fill={C.mint} />
      <g className={MOVE.right}>
        <Panel
          x={170}
          y={182}
          w={318}
          h={64}
          r={18}
          fill={C.mint}
          shadow="rgba(0,0,0,0.35)"
        />
        <path
          transform="translate(208 214)"
          d="M0 -14 L4.1 -4.6 L14 -4.3 L6.3 2 L8.8 12 L0 6.3 L-8.8 12 L-6.3 2 L-14 -4.3 L-4.1 -4.6 Z"
          fill={C.ink}
        />
        <text
          x={236}
          y={210}
          fontFamily={MONO}
          fontSize={16}
          fontWeight={700}
          fill={C.ink}
        >
          form_submit
        </text>
        <text
          x={236}
          y={230}
          fontFamily={SANS}
          fontSize={12}
          fontWeight={600}
          fill="rgba(33,33,33,0.7)"
        >
          Evento clave
        </text>
        <rect x={418} y={200} width={50} height={28} rx={14} fill={C.ink} />
        <circle cx={454} cy={214} r={9} fill={C.mint} />
      </g>
    </>
  );
}

/** Search Console y GA4: clicks and sessions panels joined by a link. */
function ScGa4Cover() {
  const bars = [44, 58, 50, 70, 64];
  return (
    <>
      <Panel x={112} y={110} w={168} h={190} r={20} fill={C.ink} />
      <circle
        cx={150}
        cy={146}
        r={11}
        fill="none"
        stroke={C.mint}
        strokeWidth={4}
      />
      <line
        x1={158}
        y1={154}
        x2={168}
        y2={164}
        stroke={C.mint}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <text
        x={136}
        y={206}
        fontFamily={SANS}
        fontSize={12}
        fontWeight={600}
        fill="rgba(255,255,255,0.6)"
      >
        Clics
      </text>
      <text
        x={136}
        y={240}
        fontFamily={DISPLAY}
        fontSize={34}
        fontWeight={700}
        letterSpacing={-1}
        fill={C.white}
      >
        1.240
      </text>
      <Bar x={136} y={262} w={110} h={7} fill="rgba(255,255,255,0.2)" />

      <Panel x={392} y={110} w={168} h={190} r={20} stroke={C.line} />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={416 + i * 22}
          y={172 - h * 0.5}
          width={14}
          height={h * 0.5}
          rx={4}
          fill={i === 3 ? C.green : C.soft}
        />
      ))}
      <text
        x={404}
        y={206}
        fontFamily={SANS}
        fontSize={12}
        fontWeight={600}
        fill={C.muted}
      >
        Sesiones
      </text>
      <text
        x={404}
        y={240}
        fontFamily={DISPLAY}
        fontSize={34}
        fontWeight={700}
        letterSpacing={-1}
        fill={C.ink}
      >
        986
      </text>
      <Bar x={416} y={262} w={110} h={7} />

      <g className={MOVE.up}>
        <rect
          x={298}
          y={190}
          width={42}
          height={26}
          rx={13}
          fill="none"
          stroke={C.green}
          strokeWidth={5}
        />
        <rect
          x={332}
          y={190}
          width={42}
          height={26}
          rx={13}
          fill="none"
          stroke={C.ink}
          strokeWidth={5}
        />
        <circle cx={336} cy={278} r={24} fill={C.mint} />
        <text
          x={336}
          y={287}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontSize={26}
          fontWeight={700}
          fill={C.ink}
        >
          ≠
        </text>
      </g>
    </>
  );
}

/** Palabras clave en Search Console: a query table with the 5–20 band lit. */
function QueriesCover() {
  const rows = [
    { y: 152, w: 150, pos: "2,1", hot: false },
    { y: 194, w: 128, pos: "6,4", hot: true },
    { y: 236, w: 168, pos: "11,8", hot: true },
    { y: 278, w: 110, pos: "17,2", hot: true },
  ];
  return (
    <>
      <Panel x={120} y={84} w={400} h={250} r={20} />
      <text
        x={146}
        y={122}
        fontFamily={SANS}
        fontSize={12}
        fontWeight={700}
        fill={C.muted}
      >
        Consultas
      </text>
      <text
        x={492}
        y={122}
        textAnchor="end"
        fontFamily={SANS}
        fontSize={12}
        fontWeight={700}
        fill={C.muted}
      >
        Posición
      </text>
      <line
        x1={120}
        x2={520}
        y1={136}
        y2={136}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <rect
        x={132}
        y={182}
        width={376}
        height={138}
        rx={12}
        fill={C.mintSoft}
      />
      {rows.map((r) => (
        <g key={r.y}>
          <Bar x={146} y={r.y + 6} w={r.w} fill={r.hot ? C.ink : C.line} />
          <rect
            x={438}
            y={r.y - 4}
            width={54}
            height={26}
            rx={9}
            fill={r.hot ? C.green : C.soft}
          />
          <text
            x={465}
            y={r.y + 13.5}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={13}
            fontWeight={700}
            fill={r.hot ? C.white : C.ink}
          >
            {r.pos}
          </text>
        </g>
      ))}
      <g className={MOVE.upRight}>
        <Panel x={400} y={58} w={150} h={44} r={14} fill={C.ink} depth={6} />
        <text
          x={420}
          y={86}
          fontFamily={MONO}
          fontSize={14}
          fontWeight={700}
          fill={C.mint}
        >
          ^(cómo|qué)
        </text>
      </g>
      <Cursor x={330} y={250} />
    </>
  );
}

/** PageSpeed Insights: a phone being tested and its performance score. */
function PageSpeedCover() {
  const circumference = 2 * Math.PI * 58;
  return (
    <>
      <Panel x={146} y={70} w={150} h={270} r={26} fill={C.ink} />
      <rect x={158} y={84} width={126} height={242} rx={16} fill={C.white} />
      <rect x={200} y={92} width={42} height={8} rx={4} fill={C.ink} />
      <rect x={170} y={112} width={102} height={66} rx={10} fill={C.soft} />
      <Bar x={170} y={192} w={96} fill={C.ink} />
      <Bar x={170} y={208} w={78} h={6} />
      <Bar x={170} y={222} w={88} h={6} />
      <Bar x={170} y={236} w={62} h={6} />
      <rect x={170} y={264} width={70} height={26} rx={13} fill={C.mint} />

      <g className={MOVE.up}>
        <circle cx={430} cy={196} r={92} fill={C.white} />
        <circle
          cx={430}
          cy={196}
          r={58}
          fill="none"
          stroke={C.mintSoft}
          strokeWidth={16}
        />
        <circle
          cx={430}
          cy={196}
          r={58}
          fill="none"
          stroke={C.green}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.92} ${circumference}`}
          transform="rotate(-90 430 196)"
        />
        <text
          x={430}
          y={212}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontSize={44}
          fontWeight={700}
          letterSpacing={-2}
          fill={C.ink}
        >
          92
        </text>
      </g>
      <rect x={350} y={304} width={160} height={34} rx={17} fill={C.ink} />
      <rect x={354} y={308} width={76} height={26} rx={13} fill={C.mint} />
      <text
        x={392}
        y={325}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={12}
        fontWeight={700}
        fill={C.ink}
      >
        Móvil
      </text>
      <text
        x={470}
        y={325}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={12}
        fontWeight={600}
        fill="rgba(255,255,255,0.7)"
      >
        Ordenador
      </text>
    </>
  );
}

/** SEO y SEM: a results page with a paid block on top and organic below. */
function SeoSemCover() {
  const organic = [214, 262, 310];
  return (
    <>
      <Panel x={120} y={70} w={330} h={280} r={20} />
      <rect x={140} y={88} width={290} height={28} rx={14} fill={C.grey} />
      <circle
        cx={158}
        cy={102}
        r={6}
        fill="none"
        stroke={C.muted}
        strokeWidth={2.5}
      />
      <Bar x={174} y={98} w={120} />
      <rect x={140} y={130} width={290} height={62} rx={12} fill={C.ink} />
      <rect x={154} y={142} width={54} height={18} rx={9} fill={C.mint} />
      <text
        x={181}
        y={155}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={10}
        fontWeight={700}
        fill={C.ink}
      >
        Anuncio
      </text>
      <Bar x={218} y={147} w={130} fill="rgba(255,255,255,0.75)" />
      <Bar x={154} y={172} w={220} h={6} fill="rgba(255,255,255,0.3)" />
      {organic.map((y, i) => (
        <g key={y}>
          <rect
            x={140}
            y={y - 6}
            width={24}
            height={24}
            rx={7}
            fill={i === 0 ? C.green : C.soft}
          />
          {i === 0 ? <Tick x={152} y={y + 6} /> : null}
          <Bar x={176} y={y - 2} w={i === 0 ? 170 : 140} fill={C.ink} />
          <Bar x={176} y={y + 12} w={i === 0 ? 220 : 190} h={6} />
        </g>
      ))}
      <g className={MOVE.up}>
        <circle cx={500} cy={150} r={46} fill={C.ink} />
        <circle
          cx={500}
          cy={150}
          r={34}
          fill="none"
          stroke={C.mint}
          strokeWidth={3}
        />
        <text
          x={500}
          y={162}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontSize={34}
          fontWeight={700}
          fill={C.mint}
        >
          $
        </text>
      </g>
      <g className={MOVE.upRight}>
        <Panel x={462} y={232} w={92} h={92} r={18} fill={C.green} depth={6} />
        <path
          d="M480 302 L500 284 L514 294 L538 262"
          fill="none"
          stroke={C.white}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={538} cy={262} r={6} fill={C.mint} />
      </g>
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_L: Record<string, { Art: ComponentType; field: Field }> = {
  "google-analytics-4": { Art: Ga4Cover, field: "mint" },
  "eventos-clave-ga4": { Art: EventsCover, field: "ink" },
  "search-console-y-ga4": { Art: ScGa4Cover, field: "white" },
  "palabras-clave-search-console": { Art: QueriesCover, field: "soft" },
  "pagespeed-insights": { Art: PageSpeedCover, field: "green" },
  "seo-y-sem": { Art: SeoSemCover, field: "mintSoft" },
};
