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

/** The four-point sparkle used as the AI assistant's avatar. */
function Sparkle({ x, y, r = 12 }: { x: number; y: number; r?: number }) {
  const k = r / 12;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={C.mint} />
      <path
        transform={`scale(${k * 0.7})`}
        d="M0 -9 C1 -2 2 -1 9 0 C2 1 1 2 0 9 C-1 2 -2 1 -9 0 C-2 -1 -1 -2 0 -9 Z"
        fill={C.ink}
      />
    </g>
  );
}

/** A small toggle switch, on or off, left edge at (x, y - 11). */
function Toggle({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y - 11}
        width={38}
        height={22}
        rx={11}
        fill={on ? C.green : C.line}
      />
      <circle cx={on ? x + 27 : x + 11} cy={y} r={8} fill={C.white} />
    </g>
  );
}

/** A padlock centred on (x, y). */
function Lock({
  x,
  y,
  color = C.ink,
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M-11 -4 V-12 A11 11 0 0 1 11 -12 V-4"
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <rect x={-17} y={-6} width={34} height={28} rx={7} fill={color} />
      <circle cx={0} cy={6} r={4} fill={C.mint} />
    </g>
  );
}

/**
 * Claude MCP: an AI chat window with its connectors menu open — the SEO data
 * connector switched on — wired to a stack of data sources.
 */
function ClaudeMcpCover() {
  const sources = [
    { y: 112, label: "Search Console", w: 88 },
    { y: 186, label: "Auditoría", w: 64 },
    { y: 260, label: "Keywords", w: 72 },
  ];
  return (
    <>
      <Panel x={112} y={70} w={262} h={270} r={20} shadow="rgba(0,0,0,0.35)" />
      <Sparkle x={140} y={100} r={13} />
      <text
        x={162}
        y={105}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={14}
        fill={C.ink}
      >
        Asistente IA
      </text>
      <WindowDots x={318} y={100} />
      <line
        x1={112}
        x2={374}
        y1={124}
        y2={124}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <text
        x={136}
        y={152}
        fontFamily={SANS}
        fontWeight={600}
        fontSize={11}
        letterSpacing={0.8}
        fill={C.muted}
      >
        CONECTORES
      </text>
      {[
        { y: 182, on: true, w: 92, strong: true },
        { y: 222, on: false, w: 70, strong: false },
        { y: 262, on: false, w: 82, strong: false },
      ].map((row) => (
        <g key={row.y}>
          <rect
            x={136}
            y={row.y - 15}
            width={30}
            height={30}
            rx={8}
            fill={row.strong ? C.ink : C.soft}
          />
          {row.strong ? (
            <circle cx={151} cy={row.y} r={5} fill={C.mint} />
          ) : null}
          <Bar
            x={178}
            y={row.y - 4}
            w={row.w}
            fill={row.strong ? C.ink : C.line}
          />
          <Toggle x={312} y={row.y} on={row.on} />
        </g>
      ))}
      <rect x={136} y={296} width={214} height={28} rx={14} fill={C.grey} />
      <Bar x={152} y={306} w={120} fill={C.line} />
      <circle cx={334} cy={310} r={10} fill={C.ink} />

      {/* Wire from the chat to the sources */}
      <path
        d="M374 182 H408 V112 H436 M408 182 V186 H436 M408 186 V260 H436"
        fill="none"
        stroke={C.mint}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={408} cy={186} r={7} fill={C.mint} />

      <g className={MOVE.right}>
        {sources.map((s) => (
          <g key={s.y}>
            <Panel
              x={436}
              y={s.y - 26}
              w={124}
              h={52}
              r={14}
              shadow="rgba(0,0,0,0.35)"
            />
            <rect
              x={450}
              y={s.y - 12}
              width={24}
              height={24}
              rx={7}
              fill={C.mintSoft}
            />
            <Tick x={462} y={s.y} color={C.green} />
            <text
              x={482}
              y={s.y + 4}
              fontFamily={SANS}
              fontWeight={600}
              fontSize={s.label.length > 10 ? 9.5 : 11.5}
              fill={C.ink}
            >
              {s.label}
            </text>
          </g>
        ))}
      </g>
    </>
  );
}

/** Line path for the Search Console mini chart, one point every 30 units. */
const toPath = (ys: number[]) =>
  ys.map((y, i) => `${i === 0 ? "M" : "L"}${150 + i * 30} ${y}`).join(" ");

/**
 * MCP de Search Console: a question to the assistant, answered with a
 * Search Console performance chart and a striking-distance shortlist.
 */
function SearchConsoleMcpCover() {
  const clicks = [262, 254, 258, 244, 236, 240, 222, 214, 206, 196];
  const impr = [236, 222, 230, 206, 200, 186, 178, 160, 152, 140];
  return (
    <>
      <Panel x={120} y={92} w={330} h={240} r={20} />
      <text
        x={146}
        y={126}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={14}
        fill={C.ink}
      >
        Rendimiento
      </text>
      <g>
        <rect x={146} y={142} width={86} height={34} rx={9} fill={C.ink} />
        <text
          x={156}
          y={164}
          fontFamily={MONO}
          fontSize={12}
          fontWeight={700}
          fill={C.mint}
        >
          4,8 mil
        </text>
        <rect x={242} y={142} width={86} height={34} rx={9} fill={C.mintSoft} />
        <text
          x={252}
          y={164}
          fontFamily={MONO}
          fontSize={12}
          fontWeight={700}
          fill={C.green}
        >
          92 mil
        </text>
      </g>
      {[200, 236, 272].map((y) => (
        <line
          key={y}
          x1={146}
          x2={424}
          y1={y}
          y2={y}
          stroke={C.line}
          strokeWidth={1}
        />
      ))}
      <path
        d={toPath(impr)}
        fill="none"
        stroke={C.green}
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={toPath(clicks)}
        fill="none"
        stroke={C.ink}
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={420} cy={196} r={6} fill={C.ink} />
      <circle cx={420} cy={140} r={6} fill={C.green} />
      <Bar x={146} y={300} w={110} fill={C.line} />
      <Bar x={270} y={300} w={70} fill={C.line} />

      {/* The question */}
      <g className={MOVE.left}>
        <path
          d="M300 62 H540 A16 16 0 0 1 556 78 V100 A6 6 0 0 1 550 106 H300 A16 16 0 0 1 284 90 V78 A16 16 0 0 1 300 62 Z"
          fill={C.ink}
        />
        <text
          x={420}
          y={89}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={500}
          fontSize={12.5}
          fill={C.white}
        >
          ¿Qué consultas están en el puesto 8–15?
        </text>
      </g>

      {/* Shortlist answer */}
      <g className={MOVE.up}>
        <Panel
          x={402}
          y={200}
          w={158}
          h={128}
          r={16}
          shadow="rgba(33,33,33,0.18)"
        />
        <Sparkle x={424} y={224} r={11} />
        <Bar x={442} y={220} w={70} fill={C.ink} />
        {[252, 278, 304].map((y, i) => (
          <g key={y}>
            <rect
              x={418}
              y={y - 9}
              width={30}
              height={18}
              rx={6}
              fill={C.mint}
            />
            <text
              x={433}
              y={y + 4}
              textAnchor="middle"
              fontFamily={MONO}
              fontWeight={700}
              fontSize={10}
              fill={C.ink}
            >
              {[9, 11, 14][i]}
            </text>
            <Bar x={456} y={y - 4} w={[80, 64, 72][i]} />
          </g>
        ))}
      </g>
    </>
  );
}

/**
 * Google Ads MCP: campaign spend bars read by the assistant through a
 * padlocked, read-only connection.
 */
function AdsMcpCover() {
  const bars = [
    { h: 150, fill: C.ink },
    { h: 108, fill: C.ink },
    { h: 156, fill: C.green },
    { h: 82, fill: C.ink },
    { h: 126, fill: C.ink },
  ];
  return (
    <>
      <Panel x={112} y={78} w={290} h={262} r={20} />
      <text
        x={136}
        y={112}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={14}
        fill={C.ink}
      >
        Costo por campaña
      </text>
      <Bar x={136} y={124} w={92} h={6} />
      {bars.map((b, i) => (
        <rect
          key={i}
          x={140 + i * 50}
          y={310 - b.h}
          width={32}
          height={b.h}
          rx={8}
          fill={b.fill}
        />
      ))}
      <line
        x1={130}
        x2={386}
        y1={312}
        y2={312}
        stroke={C.line}
        strokeWidth={2}
      />
      <rect x={232} y={118} width={64} height={22} rx={11} fill={C.mint} />
      <text
        x={264}
        y={133}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={11}
        fill={C.ink}
      >
        CPA ↑
      </text>

      {/* Read-only link */}
      <path
        d="M402 200 H448"
        stroke={C.ink}
        strokeWidth={4}
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <g className={MOVE.up}>
        <Panel
          x={448}
          y={96}
          w={112}
          h={214}
          r={20}
          fill={C.ink}
          shadow="rgba(33,33,33,0.25)"
        />
        <Lock x={504} y={150} color={C.white} />
        <text
          x={504}
          y={206}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={700}
          fontSize={12}
          fill={C.white}
        >
          Solo
        </text>
        <text
          x={504}
          y={222}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={700}
          fontSize={12}
          fill={C.white}
        >
          lectura
        </text>
        <Sparkle x={504} y={272} r={16} />
      </g>
    </>
  );
}

/**
 * MCP de Google Analytics: a terminal launching the analytics server next
 * to a GA4-style sessions-by-channel card.
 */
function AnalyticsMcpCover() {
  const channels = [
    { label: "Orgánico", w: 150, fill: C.mint },
    { label: "Directo", w: 104, fill: C.ink },
    { label: "Referencia", w: 70, fill: C.ink },
    { label: "Email", w: 44, fill: C.ink },
  ];
  return (
    <>
      {/* Terminal */}
      <Panel
        x={112}
        y={72}
        w={250}
        h={150}
        r={16}
        fill={C.ink}
        shadow="rgba(0,0,0,0.25)"
      />
      <WindowDots x={134} y={94} fill="rgba(255,255,255,0.25)" />
      <text x={132} y={132} fontFamily={MONO} fontSize={12} fill={C.mint}>
        $ pipx run
      </text>
      <text x={132} y={152} fontFamily={MONO} fontSize={12} fill={C.white}>
        analytics-mcp
      </text>
      <text
        x={132}
        y={182}
        fontFamily={MONO}
        fontSize={11}
        fill="rgba(255,255,255,0.55)"
      >
        scope: readonly
      </text>
      <rect x={132} y={194} width={10} height={14} fill={C.mint} />

      {/* Channel card */}
      <g className={MOVE.upRight}>
        <Panel x={290} y={150} w={270} h={196} r={20} />
        <text
          x={314}
          y={184}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={14}
          fill={C.ink}
        >
          Sesiones por canal
        </text>
        {channels.map((c, i) => {
          const y = 212 + i * 32;
          return (
            <g key={c.label}>
              <text
                x={314}
                y={y + 11}
                fontFamily={SANS}
                fontSize={11}
                fill={C.muted}
              >
                {c.label}
              </text>
              <rect
                x={384}
                y={y}
                width={c.w}
                height={14}
                rx={7}
                fill={c.fill}
              />
            </g>
          );
        })}
      </g>
      <g className={MOVE.left}>
        <Sparkle x={150} y={290} r={22} />
        <path
          d="M180 290 C220 290 240 270 280 262"
          fill="none"
          stroke={C.white}
          strokeWidth={3}
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

/**
 * Herramientas SEO para agencias: a wall of client project cards, each with
 * its own trend, and a branded report flying out to the client.
 */
function AgencyToolsCover() {
  const cards = [
    { x: 118, y: 78, trend: "M0 26 L18 20 L36 22 L54 10 L72 4", up: true },
    { x: 246, y: 78, trend: "M0 8 L18 12 L36 10 L54 20 L72 26", up: false },
    { x: 118, y: 186, trend: "M0 22 L18 24 L36 14 L54 12 L72 6", up: true },
    { x: 246, y: 186, trend: "M0 18 L18 12 L36 16 L54 10 L72 8", up: true },
  ];
  return (
    <>
      {cards.map((c, i) => (
        <g key={i}>
          <Panel
            x={c.x}
            y={c.y}
            w={114}
            h={94}
            r={14}
            stroke={C.line}
            shadow="rgba(33,33,33,0.06)"
          />
          <rect
            x={c.x + 14}
            y={c.y + 14}
            width={22}
            height={22}
            rx={6}
            fill={i === 1 ? C.ink : C.mintSoft}
          />
          <Bar x={c.x + 44} y={c.y + 21} w={52} fill={C.ink} h={7} />
          <path
            transform={`translate(${c.x + 20} ${c.y + 48})`}
            d={c.trend}
            fill="none"
            stroke={c.up ? C.green : C.ink}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {!c.up ? (
            <circle cx={c.x + 92} cy={c.y + 74} r={6} fill={C.ink} />
          ) : null}
        </g>
      ))}
      <text
        x={118}
        y={318}
        fontFamily={MONO}
        fontSize={12}
        fontWeight={700}
        fill={C.muted}
      >
        4 clientes · 1 panel
      </text>

      {/* Branded report */}
      <g className={MOVE.upRight}>
        <Panel
          x={404}
          y={96}
          w={150}
          h={204}
          r={16}
          shadow="rgba(33,33,33,0.16)"
        />
        <rect x={404} y={96} width={150} height={44} rx={16} fill={C.ink} />
        <rect x={404} y={124} width={150} height={16} fill={C.ink} />
        <circle cx={428} cy={118} r={10} fill={C.mint} />
        <Bar x={446} y={114} w={60} fill="rgba(255,255,255,0.75)" />
        <text
          x={422}
          y={170}
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={28}
          letterSpacing={-1}
          fill={C.ink}
        >
          +18 %
        </text>
        <Bar x={422} y={184} w={74} h={6} />
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={424 + i * 38}
            y={256 - [22, 36, 52][i]}
            width={24}
            height={[22, 36, 52][i]}
            rx={5}
            fill={i === 2 ? C.green : C.soft}
          />
        ))}
        <Bar x={422} y={270} w={110} h={6} />
      </g>
    </>
  );
}

/**
 * Semrush vs Ahrefs: a balance weighing two price tags, with a feature
 * checklist under each pan.
 */
function SuiteCompareCover() {
  const tags = [
    { cx: 214, label: "Semrush", price: "139", fill: C.ink, text: C.white },
    { cx: 456, label: "Ahrefs", price: "129", fill: C.white, text: C.ink },
  ];
  return (
    <>
      {/* Stand */}
      <rect x={329} y={104} width={12} height={196} rx={6} fill={C.ink} />
      <rect x={295} y={296} width={80} height={18} rx={9} fill={C.ink} />
      <circle
        cx={335}
        cy={100}
        r={12}
        fill={C.mint}
        stroke={C.ink}
        strokeWidth={4}
      />
      <g className={MOVE.down}>
        <line
          x1={190}
          x2={480}
          y1={112}
          y2={96}
          stroke={C.ink}
          strokeWidth={6}
          strokeLinecap="round"
        />
        {tags.map((t, i) => {
          const topY = i === 0 ? 113 : 97;
          return (
            <g key={t.label}>
              <line
                x1={t.cx}
                x2={t.cx}
                y1={topY}
                y2={topY + 36}
                stroke={C.ink}
                strokeWidth={3}
              />
              <Panel
                x={t.cx - 74}
                y={topY + 36}
                w={148}
                h={92}
                r={16}
                fill={t.fill}
                stroke={t.fill === C.white ? C.line : undefined}
                shadow="rgba(33,33,33,0.18)"
              />
              <text
                x={t.cx}
                y={topY + 64}
                textAnchor="middle"
                fontFamily={SANS}
                fontWeight={700}
                fontSize={13}
                fill={t.text}
              >
                {t.label}
              </text>
              <text
                x={t.cx}
                y={topY + 104}
                textAnchor="middle"
                fontFamily={DISPLAY}
                fontWeight={700}
                fontSize={32}
                letterSpacing={-1.5}
                fill={t.text}
              >
                {t.price}
                <tspan
                  fontFamily={SANS}
                  fontSize={12}
                  fontWeight={600}
                  letterSpacing={0}
                  dx={4}
                >
                  USD
                </tspan>
              </text>
            </g>
          );
        })}
      </g>
      {/* Checklists */}
      {tags.map((t, i) =>
        [0, 1].map((r) => {
          const y = 272 + r * 30;
          const x = t.cx - 70;
          const on = i === 0 ? r === 0 || r === 1 : r === 0;
          return (
            <g key={`${t.label}-${r}`}>
              <rect
                x={x}
                y={y - 10}
                width={20}
                height={20}
                rx={6}
                fill={on ? C.green : C.white}
                stroke={on ? undefined : C.line}
                strokeWidth={on ? undefined : 2}
              />
              {on ? <Tick x={x + 10} y={y} size={0.85} /> : null}
              <Bar x={x + 28} y={y - 4} w={[64, 48][r]} fill={C.ink} />
            </g>
          );
        }),
      )}
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_J: Record<string, { Art: ComponentType; field: Field }> = {
  "claude-mcp-seo": { Art: ClaudeMcpCover, field: "ink" },
  "mcp-search-console": { Art: SearchConsoleMcpCover, field: "mint" },
  "google-ads-mcp": { Art: AdsMcpCover, field: "soft" },
  "mcp-google-analytics": { Art: AnalyticsMcpCover, field: "green" },
  "herramientas-seo-para-agencias": { Art: AgencyToolsCover, field: "white" },
  "semrush-vs-ahrefs": { Art: SuiteCompareCover, field: "mintSoft" },
};
