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

/** The four-point sparkle used as an AI assistant's avatar. */
function Sparkle({
  x,
  y,
  r = 12,
  bg = C.mint,
  fg = C.ink,
}: {
  x: number;
  y: number;
  r?: number;
  bg?: string;
  fg?: string;
}) {
  const k = r / 12;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={bg} />
      <path
        transform={`scale(${k * 0.7})`}
        d="M0 -9 C1 -2 2 -1 9 0 C2 1 1 2 0 9 C-1 2 -2 1 -9 0 C-2 -1 -1 -2 0 -9 Z"
        fill={fg}
      />
    </g>
  );
}

/** A magnifier glyph centred on (x, y). */
function Magnifier({
  x,
  y,
  color = C.muted,
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    >
      <circle cx={-1.5} cy={-1.5} r={5.5} />
      <path d="M2.5 2.5 L7 7" />
    </g>
  );
}

/**
 * GEO SEO: a classic results list behind, an AI answer in front that cites
 * your site — same base, different result.
 */
function GeoSeoCover() {
  return (
    <>
      {/* Classic SERP */}
      <Panel x={112} y={84} w={250} h={236} r={18} />
      <rect
        x={130}
        y={102}
        width={214}
        height={30}
        rx={15}
        fill={C.white}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <Magnifier x={148} y={117} />
      <Bar x={164} y={113} w={96} h={8} fill={C.line} />
      {[156, 206, 256].map((y, i) => (
        <g key={y}>
          <text
            x={130}
            y={y + 8}
            fontFamily={MONO}
            fontWeight={700}
            fontSize={12}
            fill={C.muted}
          >
            {i + 1}
          </text>
          <Bar x={148} y={y} w={150 - i * 22} fill={i === 0 ? C.ink : C.soft} />
          <Bar x={148} y={y + 16} w={176} h={6} />
          <Bar x={148} y={y + 28} w={128} h={6} />
        </g>
      ))}

      {/* AI answer */}
      <g className={MOVE.up}>
        <Panel
          x={300}
          y={128}
          w={250}
          h={196}
          r={18}
          fill={C.ink}
          shadow="rgba(33,33,33,0.25)"
        />
        <Sparkle x={326} y={156} r={13} />
        <text
          x={348}
          y={161}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={14}
          fill={C.white}
        >
          Respuesta con IA
        </text>
        <Bar x={320} y={186} w={206} fill="rgba(255,255,255,0.28)" />
        <Bar x={320} y={202} w={180} fill="rgba(255,255,255,0.28)" />
        <Bar x={320} y={218} w={194} fill="rgba(255,255,255,0.28)" />
        <Bar x={320} y={234} w={120} fill="rgba(255,255,255,0.28)" />
        <rect x={320} y={260} width={132} height={28} rx={14} fill={C.mint} />
        <text
          x={336}
          y={279}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={13}
          fill={C.ink}
        >
          tu-web.com
        </text>
        <circle cx={438} cy={274} r={6} fill={C.ink} />
        <rect
          x={460}
          y={260}
          width={66}
          height={28}
          rx={14}
          fill="rgba(255,255,255,0.12)"
        />
      </g>
    </>
  );
}

/** llms.txt: a Markdown file at the root of the site, read by an agent. */
function LlmsTxtCover() {
  const lines: Array<{ y: number; mark: string; w: number; strong?: boolean }> =
    [
      { y: 152, mark: "#", w: 150, strong: true },
      { y: 182, mark: ">", w: 200 },
      { y: 222, mark: "##", w: 96, strong: true },
      { y: 250, mark: "-", w: 182 },
      { y: 274, mark: "-", w: 160 },
      { y: 298, mark: "-", w: 172 },
    ];
  return (
    <>
      <Panel x={120} y={80} w={300} h={262} r={18} shadow="rgba(0,0,0,0.35)" />
      <rect x={120} y={80} width={300} height={44} rx={18} fill={C.grey} />
      <rect x={120} y={106} width={300} height={18} fill={C.grey} />
      <WindowDots x={142} y={102} />
      <text
        x={262}
        y={107}
        fontFamily={MONO}
        fontWeight={700}
        fontSize={14}
        fill={C.ink}
      >
        /llms.txt
      </text>
      {lines.map((l) => (
        <g key={l.y}>
          <text
            x={142}
            y={l.y + 8}
            fontFamily={MONO}
            fontWeight={700}
            fontSize={14}
            fill={l.strong ? C.green : C.muted}
          >
            {l.mark}
          </text>
          <Bar
            x={170}
            y={l.y}
            w={l.w}
            h={l.strong ? 10 : 8}
            fill={l.strong ? C.ink : C.line}
          />
        </g>
      ))}
      <rect x={168} y={244} width={58} height={20} rx={6} fill={C.mintSoft} />
      <rect x={168} y={268} width={46} height={20} rx={6} fill={C.mintSoft} />
      <rect x={168} y={292} width={52} height={20} rx={6} fill={C.mintSoft} />

      {/* Agent reading the file */}
      <g className={MOVE.left}>
        <path
          d="M428 202 H452"
          fill="none"
          stroke={C.mint}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="2 8"
        />
        <Panel
          x={458}
          y={150}
          w={100}
          h={104}
          r={26}
          fill={C.mint}
          shadow="rgba(0,0,0,0.35)"
        />
        <Sparkle x={508} y={190} r={22} bg={C.ink} fg={C.mint} />
        <Bar x={480} y={226} w={56} h={8} fill={C.ink} />
      </g>
    </>
  );
}

/**
 * AI Overviews: a results page with the AI summary on top, citing sources,
 * and the organic results pushed down with a falling CTR tag.
 */
function AiOverviewsCover() {
  return (
    <>
      <Panel x={116} y={70} w={408} h={276} r={20} />
      <rect
        x={136}
        y={88}
        width={368}
        height={30}
        rx={15}
        fill={C.white}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <Magnifier x={154} y={103} />
      <Bar x={170} y={99} w={150} h={8} fill={C.ink} />

      {/* The AI Overview block */}
      <g className={MOVE.up}>
        <rect
          x={136}
          y={132}
          width={368}
          height={122}
          rx={14}
          fill={C.mintSoft}
        />
        <Sparkle x={158} y={154} r={11} bg={C.ink} fg={C.mint} />
        <text
          x={176}
          y={159}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={13}
          fill={C.ink}
        >
          Vista creada con IA
        </text>
        <Bar x={152} y={176} w={214} fill="rgba(33,33,33,0.22)" />
        <Bar x={152} y={192} w={196} fill="rgba(33,33,33,0.22)" />
        <Bar x={152} y={208} w={206} fill="rgba(33,33,33,0.22)" />
        <Bar x={152} y={224} w={140} fill="rgba(33,33,33,0.22)" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect
              x={386}
              y={168 + i * 26}
              width={104}
              height={20}
              rx={6}
              fill={i === 0 ? C.green : C.white}
            />
            <Bar
              x={394}
              y={174 + i * 26}
              w={60 + (i % 2) * 18}
              h={8}
              fill={i === 0 ? C.white : C.line}
            />
          </g>
        ))}
      </g>

      {/* Organic results, pushed down */}
      {[272, 306].map((y) => (
        <g key={y}>
          <Bar x={152} y={y} w={170} fill={C.soft} />
          <Bar x={152} y={y + 14} w={240} h={6} />
        </g>
      ))}
      <g className={MOVE.down}>
        <rect x={420} y={274} width={86} height={34} rx={17} fill={C.ink} />
        <text
          x={438}
          y={296}
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={14}
          fill={C.white}
        >
          CTR
        </text>
        <path
          d="M482 284 V298 M476 292 L482 298 L488 292"
          fill="none"
          stroke={C.mint}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </>
  );
}

/**
 * Herramientas GEO: share of voice by assistant, with your brand's bar in
 * mint, and a ring with the overall share.
 */
function GeoToolsCover() {
  const rows = [
    { label: "ChatGPT", you: 0.62, rival: 0.8 },
    { label: "Gemini", you: 0.48, rival: 0.56 },
    { label: "Perplexity", you: 0.74, rival: 0.5 },
    { label: "Copilot", you: 0.36, rival: 0.62 },
  ];
  const circumference = 2 * Math.PI * 44;
  return (
    <>
      <Panel
        x={112}
        y={78}
        w={300}
        h={264}
        r={18}
        stroke={C.line}
        shadow="rgba(33,33,33,0.1)"
      />
      <text
        x={134}
        y={110}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={14}
        fill={C.ink}
      >
        Menciones por asistente
      </text>
      {rows.map((row, i) => {
        const y = 136 + i * 50;
        return (
          <g key={row.label}>
            <text
              x={134}
              y={y + 10}
              fontFamily={SANS}
              fontSize={12}
              fill={C.muted}
            >
              {row.label}
            </text>
            <rect
              x={134}
              y={y + 18}
              width={250 * row.you}
              height={10}
              rx={5}
              fill={C.green}
            />
            <rect
              x={134}
              y={y + 32}
              width={250 * row.rival}
              height={6}
              rx={3}
              fill={C.soft}
            />
          </g>
        );
      })}

      <g className={MOVE.up}>
        <Panel x={432} y={118} w={124} h={176} r={18} fill={C.ink} />
        <circle
          cx={494}
          cy={192}
          r={44}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={12}
        />
        <circle
          cx={494}
          cy={192}
          r={44}
          fill="none"
          stroke={C.mint}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.34} ${circumference}`}
          transform="rotate(-90 494 192)"
        />
        <text
          x={494}
          y={201}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={26}
          letterSpacing={-1}
          fill={C.white}
        >
          34%
        </text>
        <text
          x={494}
          y={266}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={12}
          fill="rgba(255,255,255,0.65)"
        >
          cuota de voz
        </text>
      </g>
    </>
  );
}

/**
 * Tráfico de ChatGPT en GA4: sessions by channel with an "IA" channel in
 * mint, fed by a chatgpt.com source chip.
 */
function AiTrafficCover() {
  const rows = [
    { label: "Orgánico", w: 230, fill: C.ink },
    { label: "Directo", w: 150, fill: C.soft },
    { label: "IA", w: 92, fill: C.mint, on: true },
    { label: "Referral", w: 64, fill: C.soft },
  ];
  return (
    <>
      <Panel
        x={112}
        y={92}
        w={340}
        h={238}
        r={18}
        shadow="rgba(33,33,33,0.22)"
      />
      <text
        x={134}
        y={124}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={14}
        fill={C.ink}
      >
        Sesiones por canal
      </text>
      <Bar x={360} y={115} w={70} h={10} fill={C.grey} />
      {rows.map((row, i) => {
        const y = 148 + i * 42;
        return (
          <g key={row.label}>
            <text
              x={134}
              y={y + 17}
              fontFamily={SANS}
              fontWeight={row.on ? 700 : 400}
              fontSize={12}
              fill={row.on ? C.ink : C.muted}
            >
              {row.label}
            </text>
            <rect
              x={200}
              y={y + 4}
              width={row.w}
              height={18}
              rx={9}
              fill={row.fill}
              stroke={row.on ? C.green : undefined}
              strokeWidth={row.on ? 2 : undefined}
            />
          </g>
        );
      })}

      {/* Source chip feeding the IA channel */}
      <g className={MOVE.left}>
        <path
          d="M300 245 H352"
          fill="none"
          stroke={C.green}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="2 8"
        />
        <Panel
          x={360}
          y={220}
          w={140}
          h={50}
          r={25}
          fill={C.ink}
          shadow="rgba(0,0,0,0.25)"
          depth={6}
        />
        <Sparkle x={386} y={245} r={13} />
        <text
          x={406}
          y={250}
          fontFamily={MONO}
          fontWeight={700}
          fontSize={12}
          fill={C.white}
        >
          chatgpt.com
        </text>
      </g>
    </>
  );
}

/** One MCP server box with a label, at (x, y). */
function ServerBox({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <Panel x={x} y={y} w={150} h={52} r={14} depth={6} />
      <rect
        x={x + 14}
        y={y + 15}
        width={22}
        height={22}
        rx={6}
        fill={C.green}
      />
      <Tick x={x + 25} y={y + 26} size={0.9} />
      <text
        x={x + 46}
        y={y + 31}
        fontFamily={SANS}
        fontWeight={600}
        fontSize={13}
        fill={C.ink}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Qué es MCP: an AI assistant in the middle, connected through one standard
 * plug to several servers (Search Console, audit, keywords).
 */
function McpCover() {
  const servers = [
    { x: 400, y: 82, label: "Search Console" },
    { x: 400, y: 178, label: "Auditoría" },
    { x: 400, y: 274, label: "Keywords" },
  ];
  return (
    <>
      {servers.map((s) => (
        <path
          key={s.y}
          d={`M270 204 C330 204 340 ${s.y + 26} 400 ${s.y + 26}`}
          fill="none"
          stroke={C.ink}
          strokeWidth={2.5}
          strokeDasharray="3 7"
          strokeLinecap="round"
        />
      ))}
      <g className={MOVE.right}>
        {servers.map((s) => (
          <ServerBox key={s.y} {...s} />
        ))}
      </g>

      {/* Host: the assistant */}
      <Panel x={118} y={128} w={152} h={152} r={30} fill={C.ink} />
      <Sparkle x={194} y={186} r={30} />
      <text
        x={194}
        y={250}
        textAnchor="middle"
        fontFamily={SANS}
        fontWeight={700}
        fontSize={13}
        fill={C.white}
      >
        Asistente IA
      </text>

      {/* The standard plug */}
      <g className={MOVE.up}>
        <rect x={284} y={184} width={70} height={40} rx={12} fill={C.mint} />
        <rect x={270} y={196} width={16} height={16} rx={3} fill={C.ink} />
        <text
          x={319}
          y={209}
          textAnchor="middle"
          fontFamily={MONO}
          fontWeight={700}
          fontSize={14}
          fill={C.ink}
        >
          MCP
        </text>
      </g>
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_I: Record<string, { Art: ComponentType; field: Field }> = {
  "geo-seo": { Art: GeoSeoCover, field: "mint" },
  "llms-txt": { Art: LlmsTxtCover, field: "ink" },
  "ai-overviews": { Art: AiOverviewsCover, field: "soft" },
  "herramientas-geo-visibilidad-ia": { Art: GeoToolsCover, field: "white" },
  "trafico-de-chatgpt-en-google-analytics": {
    Art: AiTrafficCover,
    field: "green",
  },
  "que-es-mcp": { Art: McpCover, field: "mintSoft" },
};
