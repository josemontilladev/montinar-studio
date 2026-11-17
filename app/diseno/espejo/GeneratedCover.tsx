// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
import { useId, type ComponentType, type ReactNode, type Ref } from "react";
import {
  COVER_FIELDS,
  COVER_TEMPLATES,
  type CoverConfig,
  type CoverTemplate,
} from "./cover-types";
import {
  C,
  DISPLAY,
  MONO,
  SANS,
} from "./parts";
import {
  THEMES,
  cleanWord,
  textWidth,
  type ArtProps,
  type CoverTheme,
} from "./templates";
import {
  ChartArt,
  ChatArt,
  ChecklistArt,
} from "./templatesA";
import {
  BrowserArt,
  RankingArt,
  ReportArt,
} from "./templatesB";
import {
  BarsArt,
  TimelineArt,
} from "./templatesC";
import {
  SearchArt,
  UrlArt,
} from "./templatesD";

/** The illustration drawn for each template (640×400 viewBox). */
export const COVER_ART: Record<CoverTemplate, ComponentType<ArtProps>> = {
  chart: ChartArt,
  checklist: ChecklistArt,
  chat: ChatArt,
  browser: BrowserArt,
  ranking: RankingArt,
  report: ReportArt,
  timeline: TimelineArt,
  bars: BarsArt,
  url: UrlArt,
  search: SearchArt,
};

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Cover generated from a template + field colour. Same frame as PostCover
 * (dot grid, category pill, mono index number); "og" is a self-contained
 * 1200×630 SVG — no HTML inside — so it can be rasterized to a PNG.
 * Purely decorative: the post title stays real text next to it.
 */
export function GeneratedCover({
  config,
  category,
  index,
  size,
  className = "",
  svgRef,
}: {
  config: CoverConfig;
  category: string;
  /** 1-based position of the post, shown as "01"; omitted when undefined. */
  index?: number;
  size: "card" | "hero" | "og";
  className?: string;
  /** Root <svg> of the "og" variant (to rasterize it). */
  svgRef?: Ref<SVGSVGElement>;
}) {
  const patternId = `gdots-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const t = THEMES[config.field] ?? THEMES.mint;
  const Art = COVER_ART[config.template] ?? ChartArt;
  const word = cleanWord(config.word);
  if (size === "og") {
    return (
      <OgCover
        t={t}
        art={<Art t={t} word={word} />}
        category={category}
        index={index}
        patternId={patternId}
        className={className}
        svgRef={svgRef}
      />
    );
  }
  const hero = size === "hero";
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-2xl ${
        hero ? "aspect-[16/10] md:aspect-[21/9]" : "aspect-[16/10]"
      } ${t.edge ? "ring-1 ring-inset ring-[#e2e2e2]" : ""} ${className}`}
      style={{ backgroundColor: t.bg }}
    >
      <svg aria-hidden="true" className="absolute inset-0 size-full">
        <defs>
          <pattern
            id={patternId}
            width={hero ? 22 : 18}
            height={hero ? 22 : 18}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={2} cy={2} r={1.25} fill={t.dot} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid meet"
        className={`absolute inset-0 size-full ${hero ? "md:py-[2%]" : ""}`}
      >
        <Art t={t} word={word} />
      </svg>
      <span
        className={`absolute left-[4%] top-[6%] rounded-full font-semibold leading-none ${
          hero ? "px-3.5 py-2 text-xs sm:text-sm" : "px-3 py-1.5 text-[0.7rem]"
        }`}
        style={{ backgroundColor: t.pillBg, color: t.pillFg }}
      >
        {category}
      </span>
      {index === undefined ? null : (
        <span
          className={`absolute bottom-[5%] right-[4%] font-mono leading-none tracking-wider ${
            hero ? "text-xs sm:text-sm" : "text-[0.7rem]"
          }`}
          style={{ color: t.number }}
        >
          {String(index).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

/** Pure-SVG social image: field, dot grid, art, pill, number, wordmark. */
function OgCover({
  t,
  art,
  category,
  index,
  patternId,
  className,
  svgRef,
}: {
  t: CoverTheme;
  art: ReactNode;
  category: string;
  index?: number;
  patternId: string;
  className: string;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const pillW = Math.ceil(textWidth(category, 20) * 1.04) + 44;
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={OG_WIDTH}
      height={OG_HEIGHT}
      viewBox={`0 0 ${OG_WIDTH} ${OG_HEIGHT}`}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <pattern
          id={patternId}
          width={26}
          height={26}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={2} cy={2} r={1.6} fill={t.dot} />
        </pattern>
      </defs>
      <rect width={OG_WIDTH} height={OG_HEIGHT} fill={t.bg} />
      <rect width={OG_WIDTH} height={OG_HEIGHT} fill={`url(#${patternId})`} />
      {t.edge ? (
        <rect
          x={1}
          y={1}
          width={OG_WIDTH - 2}
          height={OG_HEIGHT - 2}
          fill="none"
          stroke={C.line}
          strokeWidth={2}
        />
      ) : null}
      <g transform="translate(120 18) scale(1.5)">{art}</g>
      <rect x={56} y={52} width={pillW} height={44} rx={22} fill={t.pillBg} />
      <text
        x={78}
        y={80.5}
        fontFamily={SANS}
        fontWeight={600}
        fontSize={20}
        fill={t.pillFg}
      >
        {category}
      </text>
      {index === undefined ? null : (
        <text
          x={1144}
          y={584}
          textAnchor="end"
          fontFamily={MONO}
          fontSize={20}
          letterSpacing={2}
          fill={t.number}
        >
          {String(index).padStart(2, "0")}
        </text>
      )}
      <OgWordmark t={t} />
    </svg>
  );
}

/** Small MétricaSEO lockup for the social image: the M tile + name. */
function OgWordmark({ t }: { t: CoverTheme }) {
  const tile = t.card;
  const ink = t.on;
  const accent =
    t.bg === C.green || t.bg === C.mint
      ? t.on
      : t.bg === C.ink
        ? C.mint
        : C.green;
  return (
    <g>
      <rect x={56} y={552} width={40} height={40} rx={10} fill={tile.bg} />
      <g transform="translate(60.5 555) scale(0.66)">
        <path
          d="M8 40 V18 L21 31 L32.37 19.63"
          fill="none"
          stroke={tile.fg}
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={38.23} cy={13.77} r={4.2} fill={tile.accent} />
      </g>
      <text
        x={108}
        y={581}
        fontFamily={DISPLAY}
        fontWeight={600}
        fontSize={24}
        letterSpacing={-0.5}
        fill={ink}
      >
        Métrica
        <tspan fill={accent}>SEO</tspan>
      </text>
    </g>
  );
}

const KEYWORDS: { re: RegExp; template: CoverTemplate }[] = [
  { re: /\bctr\b|\bclics?\b|\bclicks?\b/, template: "chart" },
  { re: /auditori|checklist|lista de/, template: "checklist" },
  { re: /\bia\b|chatgpt|gemini|perplexity|\bllm|\bgeo\b/, template: "chat" },
  { re: /\butm\b|\burls?\b|enlace|parametro|redirec/, template: "url" },
  { re: /posicion|ranking|\btop\b/, template: "ranking" },
  { re: /informe|reporte|report/, template: "report" },
  {
    re: /\bplan\b|\bmeses\b|hoja de ruta|calendario|estrategia/,
    template: "timeline",
  },
  { re: /\bga4\b|canal|trafico|analytics|sesiones/, template: "bars" },
  { re: /indexa|rastreo|sitemap|robots|search console/, template: "browser" },
  {
    re: /search console|busqueda|keyword|palabra clave|consulta/,
    template: "search",
  },
];

const STRONG_WORDS = ["CTR", "UTM", "GA4", "SEO"];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function hash(text: string): number {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Template, field colour and word suggested for a post. Deterministic for
 *  a given input; a different `seed` cycles the field colour and, when the
 *  title matches several templates, which one is used. */
export function suggestCoverConfig(input: {
  title: string;
  category: string;
  seed?: number;
}): CoverConfig {
  const seed = Math.abs(Math.trunc(input.seed ?? 0));
  const title = normalize(input.title);
  const category = normalize(input.category);
  const matches = (text: string) =>
    KEYWORDS.filter((k) => k.re.test(text)).map((k) => k.template);
  const found = [...new Set([...matches(title), ...matches(category)])];
  const base = hash(`${title}|${category}`);
  const template =
    found.length > 0
      ? found[seed % found.length]
      : COVER_TEMPLATES[(base + seed) % COVER_TEMPLATES.length];
  const field = COVER_FIELDS[(base + seed * 2) % COVER_FIELDS.length];
  const word =
    STRONG_WORDS.find((w) =>
      new RegExp(`\\b${w.toLowerCase()}\\b`).test(title),
    ) ?? null;
  return { template, field, word };
}
