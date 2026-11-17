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

/** Monospaced text forced to a fixed advance per character, so widths hold
 *  whatever monospace font the visitor's system has. */
function Mono({
  x,
  y,
  text,
  size = 13,
  fill = C.ink,
  advance = 7.8,
  weight = 400,
  anchor = "start",
}: {
  x: number;
  y: number;
  text: string;
  size?: number;
  fill?: string;
  advance?: number;
  weight?: number;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={MONO}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      textAnchor={anchor}
      textLength={text.length * advance}
      lengthAdjust="spacingAndGlyphs"
    >
      {text}
    </text>
  );
}

/** Small rounded tag with monospaced text, centred on its own width. */
function Tag({
  x,
  y,
  text,
  fill = C.ink,
  color = C.white,
  advance = 7.4,
  h = 26,
}: {
  x: number;
  y: number;
  text: string;
  fill?: string;
  color?: string;
  advance?: number;
  h?: number;
}) {
  const w = text.length * advance + 22;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />
      <Mono
        x={x + w / 2}
        y={y + h / 2 + 4.5}
        text={text}
        size={12.5}
        advance={advance}
        fill={color}
        weight={700}
        anchor="middle"
      />
    </g>
  );
}

/** Sitemap XML: an XML file listing URLs, with an index of sitemaps behind. */
function SitemapCover() {
  const rows = [
    { y: 152, w: 150, ok: true },
    { y: 190, w: 128, ok: true },
    { y: 228, w: 164, ok: true },
    { y: 266, w: 112, ok: false },
  ];
  return (
    <>
      {/* Index of sitemaps: stacked files behind */}
      <g className={MOVE.upRight}>
        <Panel x={416} y={96} w={144} h={206} r={16} fill={C.ink} />
        <Mono
          x={432}
          y={128}
          text="sitemap_index"
          size={12}
          fill={C.mint}
          advance={7.6}
          weight={700}
        />
        {[148, 184, 220, 256].map((y, i) => (
          <g key={y}>
            <rect
              x={432}
              y={y - 4}
              width={112}
              height={24}
              rx={7}
              fill="rgba(255,255,255,0.1)"
            />
            <rect
              x={440}
              y={y + 3}
              width={10}
              height={10}
              rx={2}
              fill={i === 0 ? C.mint : "rgba(255,255,255,0.45)"}
            />
            <Bar
              x={458}
              y={y + 4}
              w={[64, 76, 52, 70][i]}
              h={8}
              fill="rgba(255,255,255,0.55)"
            />
          </g>
        ))}
      </g>
      {/* Main sitemap file */}
      <Panel x={116} y={72} w={284} h={270} r={18} />
      <rect x={116} y={72} width={284} height={46} rx={18} fill={C.grey} />
      <rect x={116} y={100} width={284} height={18} fill={C.grey} />
      <WindowDots x={142} y={95} />
      <Mono
        x={196}
        y={100}
        text="sitemap.xml"
        size={13}
        advance={7.6}
        weight={700}
      />
      <Mono
        x={140}
        y={140}
        text="<urlset>"
        size={12}
        fill={C.muted}
        advance={7}
      />
      {rows.map((row) => (
        <g key={row.y}>
          <Mono
            x={154}
            y={row.y + 12}
            text="<loc>"
            size={12}
            fill={C.green}
            advance={7}
            weight={700}
          />
          <Bar
            x={196}
            y={row.y + 4}
            w={row.w - 14}
            h={9}
            fill={row.ok ? C.ink : C.line}
          />
          {row.ok ? (
            <g>
              <circle cx={372} cy={row.y + 8} r={10} fill={C.green} />
              <Tick x={372} y={row.y + 8} size={0.8} />
            </g>
          ) : (
            <circle
              cx={372}
              cy={row.y + 8}
              r={10}
              fill="none"
              stroke={C.line}
              strokeWidth={2.5}
            />
          )}
        </g>
      ))}
      <Mono
        x={140}
        y={314}
        text="</urlset>"
        size={12}
        fill={C.muted}
        advance={7}
      />
      <g className={MOVE.up}>
        <rect x={282} y={298} width={98} height={28} rx={14} fill={C.mint} />
        <Mono
          x={331}
          y={317}
          text="50.000"
          size={13}
          advance={7.6}
          weight={700}
          anchor="middle"
        />
      </g>
    </>
  );
}

/** Robots.txt: the file's rules next to a crawler that stops at a barrier. */
function RobotsCover() {
  const lines = [
    { t: "User-agent: *", c: C.mint },
    { t: "Disallow: /carrito/", c: C.white },
    { t: "Allow: /", c: C.white },
    { t: "", c: C.white },
    { t: "User-agent: GPTBot", c: C.mint },
    { t: "Disallow: /", c: C.white },
  ];
  return (
    <>
      <Panel x={116} y={78} w={290} h={256} r={18} shadow="rgba(0,0,0,0.35)" />
      <Mono
        x={140}
        y={114}
        text="robots.txt"
        size={15}
        advance={8.6}
        weight={700}
      />
      <rect x={140} y={128} width={242} height={182} rx={12} fill={C.ink} />
      {lines.map((line, i) =>
        line.t ? (
          <Mono
            key={line.t}
            x={156}
            y={158 + i * 26}
            text={line.t}
            size={12.5}
            fill={line.c}
            advance={7.4}
            weight={line.c === C.mint ? 700 : 400}
          />
        ) : null,
      )}
      {/* Crawler */}
      <g className={MOVE.right}>
        <rect x={438} y={150} width={92} height={78} rx={20} fill={C.mint} />
        <rect x={480} y={128} width={8} height={22} rx={4} fill={C.mint} />
        <circle cx={484} cy={124} r={8} fill={C.mint} />
        <circle cx={466} cy={186} r={10} fill={C.ink} />
        <circle cx={502} cy={186} r={10} fill={C.ink} />
        <circle cx={469} cy={183} r={3} fill={C.white} />
        <circle cx={505} cy={183} r={3} fill={C.white} />
        <rect x={470} y={208} width={28} height={6} rx={3} fill={C.ink} />
        <rect x={452} y={236} width={64} height={30} rx={10} fill={C.mint} />
      </g>
      {/* Barrier */}
      <g>
        <rect x={428} y={284} width={8} height={52} rx={3} fill={C.white} />
        <rect x={536} y={284} width={8} height={52} rx={3} fill={C.white} />
        <rect x={420} y={282} width={132} height={22} rx={6} fill={C.white} />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M${432 + i * 30} 282 l16 0 l-12 22 l-16 0 Z`}
            fill={C.green}
          />
        ))}
      </g>
    </>
  );
}

/** Redirecciones 301: an old URL sends you, through a 301, to the new one. */
function RedirectCover() {
  return (
    <>
      {/* Old URL */}
      <Panel x={120} y={84} w={300} h={64} r={16} fill={C.white} />
      <circle cx={148} cy={116} r={10} fill={C.line} />
      <Mono
        x={170}
        y={121}
        text="/servicios/implantes"
        size={14}
        fill={C.muted}
        advance={8.2}
      />
      <line
        x1={168}
        x2={336}
        y1={116}
        y2={116}
        stroke={C.muted}
        strokeWidth={2.5}
      />
      {/* Arrow path */}
      <path
        d="M270 156 V250"
        fill="none"
        stroke={C.ink}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="2 12"
      />
      <path
        d="M259 243 L270 255 L281 243"
        fill="none"
        stroke={C.ink}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={318}
        y={200}
        fontFamily={SANS}
        fontWeight={600}
        fontSize={15}
        fill={C.ink}
      >
        permanente
      </text>
      <g className={MOVE.up}>
        <circle cx={270} cy={194} r={34} fill={C.ink} />
        <text
          x={270}
          y={205}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={30}
          letterSpacing={-1}
          fill={C.mint}
        >
          301
        </text>
      </g>
      {/* New URL */}
      <g className={MOVE.right}>
        <Panel x={220} y={262} w={340} h={70} r={18} fill={C.mint} />
        <circle cx={250} cy={297} r={13} fill={C.green} />
        <Tick x={250} y={297} size={0.9} />
        <Mono
          x={274}
          y={302}
          text="/implantes-dentales/"
          size={15}
          advance={8.6}
          weight={700}
        />
      </g>
      <Tag
        x={436}
        y={103}
        text="antigua"
        fill={C.ink}
        color={C.white}
        advance={7.6}
      />
    </>
  );
}

/** URL canónica: duplicate variants all point to one canonical page. */
function CanonicalCover() {
  const dupes = [
    { y: 84, t: "?orden=precio" },
    { y: 172, t: "?utm_source=mail" },
    { y: 260, t: "http://" },
  ];
  return (
    <>
      {dupes.map((d) => (
        <g key={d.y}>
          <Panel
            x={116}
            y={d.y}
            w={190}
            h={64}
            r={14}
            fill={C.white}
            shadow="rgba(0,0,0,0.18)"
            depth={6}
          />
          <Bar x={134} y={d.y + 16} w={92} h={8} fill={C.line} />
          <Mono
            x={134}
            y={d.y + 46}
            text={d.t}
            size={12.5}
            fill={C.muted}
            advance={7.4}
          />
          <path
            d={`M314 ${d.y + 32} C360 ${d.y + 32} 360 206 404 206`}
            fill="none"
            stroke={C.white}
            strokeWidth={3.5}
            strokeDasharray="3 9"
            strokeLinecap="round"
          />
        </g>
      ))}
      <g className={MOVE.up}>
        <Panel
          x={404}
          y={116}
          w={156}
          h={190}
          r={18}
          fill={C.ink}
          shadow="rgba(0,0,0,0.3)"
        />
        <rect
          x={424}
          y={138}
          width={116}
          height={64}
          rx={10}
          fill="rgba(255,255,255,0.08)"
        />
        <path
          d="M482 148 l7 14 l15 2 l-11 11 l3 15 l-14 -7 l-14 7 l3 -15 l-11 -11 l15 -2 Z"
          fill={C.mint}
        />
        <Bar x={424} y={218} w={96} h={8} fill="rgba(255,255,255,0.6)" />
        <Bar x={424} y={236} w={74} h={8} fill="rgba(255,255,255,0.3)" />
        <rect x={424} y={260} width={116} height={28} rx={14} fill={C.mint} />
        <text
          x={482}
          y={279}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={700}
          fontSize={12.5}
          fill={C.ink}
        >
          canonical
        </text>
      </g>
    </>
  );
}

/** Hreflang: one page in several language/country versions, linked both ways. */
function HreflangCover() {
  const nodes = [
    { x: 150, y: 96, code: "es-ES", fill: C.white },
    { x: 410, y: 96, code: "es-MX", fill: C.white },
    { x: 150, y: 262, code: "es", fill: C.white },
    { x: 410, y: 262, code: "x-default", fill: C.mint },
  ];
  const cx = 340;
  const cy = 212;
  return (
    <>
      {/* Reciprocal links */}
      {nodes.map((n) => (
        <line
          key={n.code}
          x1={n.x + 70}
          y1={n.y + 34}
          x2={cx}
          y2={cy}
          stroke={C.ink}
          strokeWidth={3}
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
      ))}
      <line
        x1={290}
        x2={410}
        y1={130}
        y2={130}
        stroke={C.green}
        strokeWidth={3}
      />
      <path
        d="M298 122 L288 130 L298 138"
        fill="none"
        stroke={C.green}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M402 122 L412 130 L402 138"
        fill="none"
        stroke={C.green}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {nodes.map((n) => (
        <g
          key={n.code}
          className={n.code === "x-default" ? MOVE.upRight : undefined}
        >
          <Panel
            x={n.x}
            y={n.y}
            w={140}
            h={68}
            r={16}
            fill={n.fill}
            depth={6}
          />
          <circle
            cx={n.x + 26}
            cy={n.y + 34}
            r={11}
            fill={n.fill === C.mint ? C.ink : C.mintSoft}
          />
          <Mono
            x={n.x + 46}
            y={n.y + 39}
            text={n.code}
            size={14}
            advance={n.code.length > 6 ? 7.6 : 8.4}
            weight={700}
          />
        </g>
      ))}
      <g className={MOVE.up}>
        <circle cx={cx} cy={cy} r={34} fill={C.ink} />
        <ellipse
          cx={cx}
          cy={cy}
          rx={13}
          ry={22}
          fill="none"
          stroke={C.mint}
          strokeWidth={2.5}
        />
        <line
          x1={cx - 22}
          x2={cx + 22}
          y1={cy}
          y2={cy}
          stroke={C.mint}
          strokeWidth={2.5}
        />
        <circle
          cx={cx}
          cy={cy}
          r={22}
          fill="none"
          stroke={C.mint}
          strokeWidth={2.5}
        />
      </g>
    </>
  );
}

/** Canibalización SEO: two of your pages fight over the same query. */
function CannibalCover() {
  return (
    <>
      {/* Search box */}
      <Panel
        x={170}
        y={72}
        w={300}
        h={50}
        r={25}
        fill={C.white}
        stroke={C.line}
        depth={6}
      />
      <circle
        cx={202}
        cy={97}
        r={9}
        fill="none"
        stroke={C.ink}
        strokeWidth={3}
      />
      <line
        x1={209}
        y1={104}
        x2={216}
        y2={111}
        stroke={C.ink}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <text
        x={228}
        y={102}
        fontFamily={SANS}
        fontSize={15}
        fontWeight={500}
        fill={C.ink}
      >
        implantes dentales
      </text>
      {/* Two competing pages */}
      <g className={MOVE.left}>
        <Panel x={120} y={166} w={176} h={158} r={18} fill={C.white} />
        <Mono
          x={140}
          y={196}
          text="/implantes/"
          size={12.5}
          advance={7.4}
          weight={700}
        />
        <Bar x={140} y={212} w={120} h={8} fill={C.line} />
        <Bar x={140} y={228} w={96} h={8} fill={C.line} />
        <rect x={140} y={262} width={64} height={40} rx={10} fill={C.soft} />
        <text
          x={172}
          y={289}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={20}
          fill={C.ink}
        >
          #9
        </text>
      </g>
      <g className={MOVE.right}>
        <Panel x={344} y={166} w={176} h={158} r={18} fill={C.white} />
        <Mono
          x={364}
          y={196}
          text="/blog/guia/"
          size={12.5}
          advance={7.4}
          weight={700}
        />
        <Bar x={364} y={212} w={120} h={8} fill={C.line} />
        <Bar x={364} y={228} w={96} h={8} fill={C.line} />
        <rect x={364} y={262} width={64} height={40} rx={10} fill={C.soft} />
        <text
          x={396}
          y={289}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={20}
          fill={C.ink}
        >
          #8
        </text>
      </g>
      {/* Clash */}
      <path
        d="M208 124 L208 160"
        stroke={C.ink}
        strokeWidth={3}
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <path
        d="M432 124 L432 160"
        stroke={C.ink}
        strokeWidth={3}
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <g className={MOVE.up}>
        <circle cx={320} cy={245} r={26} fill={C.ink} />
        <path
          d="M309 234 L331 256 M331 234 L309 256"
          stroke={C.mint}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

/** Noindex: the robots meta tag keeps a page out of the search results. */
function NoindexCover() {
  return (
    <>
      {/* Code card */}
      <Panel x={116} y={74} w={300} h={130} r={18} shadow="rgba(0,0,0,0.35)" />
      <Mono
        x={138}
        y={106}
        text="<head>"
        size={12.5}
        fill={C.muted}
        advance={7.4}
      />
      <Mono
        x={150}
        y={136}
        text='<meta name="robots"'
        size={12.5}
        advance={7.3}
        weight={700}
      />
      <rect x={146} y={150} width={180} height={32} rx={9} fill={C.mintSoft} />
      <Mono
        x={158}
        y={171}
        text='content="noindex">'
        size={12.5}
        fill={C.green}
        advance={7.3}
        weight={700}
      />
      {/* Results list with one page removed */}
      <Panel
        x={196}
        y={220}
        w={364}
        h={124}
        r={18}
        fill={C.white}
        shadow="rgba(0,0,0,0.35)"
      />
      {[246, 282, 318].map((y, i) => (
        <g key={y}>
          {i === 1 ? (
            <g>
              <rect
                x={214}
                y={y - 14}
                width={328}
                height={28}
                rx={8}
                fill="none"
                stroke={C.line}
                strokeWidth={2}
                strokeDasharray="5 6"
              />
              <Bar x={228} y={y - 4} w={150} h={8} fill={C.line} />
            </g>
          ) : (
            <g>
              <circle cx={226} cy={y} r={7} fill={C.line} />
              <Bar
                x={242}
                y={y - 9}
                w={i === 0 ? 180 : 150}
                h={8}
                fill={C.ink}
              />
              <Bar x={242} y={y + 3} w={i === 0 ? 220 : 200} h={6} />
            </g>
          )}
        </g>
      ))}
      {/* Hidden-eye badge */}
      <g className={MOVE.upRight}>
        <circle cx={492} cy={150} r={46} fill={C.mint} />
        <path
          d="M462 150 Q492 122 522 150 Q492 178 462 150 Z"
          fill="none"
          stroke={C.ink}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <circle cx={492} cy={150} r={8} fill={C.ink} />
        <line
          x1={466}
          y1={124}
          x2={518}
          y2={176}
          stroke={C.ink}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

/** URL amigable: a messy address next to the clean, readable one. */
function FriendlyUrlCover() {
  return (
    <>
      {/* Browser */}
      <Panel x={116} y={76} w={444} h={268} r={20} />
      <rect x={116} y={76} width={444} height={48} rx={20} fill={C.grey} />
      <rect x={116} y={104} width={444} height={20} fill={C.grey} />
      <WindowDots x={140} y={100} />
      {/* Bad URL */}
      <rect x={140} y={146} width={396} height={44} rx={12} fill={C.grey} />
      <Mono
        x={158}
        y={173}
        text="/index.php?id=27&cat=4"
        size={14}
        fill={C.muted}
        advance={8}
      />
      <line
        x1={156}
        x2={338}
        y1={168}
        y2={168}
        stroke={C.muted}
        strokeWidth={2.5}
      />
      <circle cx={512} cy={168} r={12} fill={C.soft} />
      <path
        d="M506 162 L518 174 M518 162 L506 174"
        stroke={C.muted}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Good URL */}
      <g className={MOVE.right}>
        <rect x={140} y={210} width={396} height={50} rx={12} fill={C.mint} />
        <Mono
          x={158}
          y={241}
          text="/servicios/implantes-dentales/"
          size={14}
          advance={8.1}
          weight={700}
        />
        <circle cx={512} cy={235} r={12} fill={C.green} />
        <Tick x={512} y={235} size={0.85} />
      </g>
      {/* Rules */}
      {[
        { x: 140, t: "minúsculas" },
        { x: 268, t: "guiones" },
        { x: 372, t: "sin fechas" },
      ].map((r) => (
        <g key={r.t}>
          <rect
            x={r.x}
            y={284}
            width={r.t.length * 8 + 26}
            height={32}
            rx={16}
            fill={C.ink}
          />
          <text
            x={r.x + (r.t.length * 8 + 26) / 2}
            y={305}
            textAnchor="middle"
            fontFamily={SANS}
            fontWeight={600}
            fontSize={13}
            fill={C.white}
          >
            {r.t}
          </text>
        </g>
      ))}
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_M: Record<string, { Art: ComponentType; field: Field }> = {
  "sitemap-xml": { Art: SitemapCover, field: "mint" },
  "robots-txt": { Art: RobotsCover, field: "ink" },
  "redirecciones-301": { Art: RedirectCover, field: "soft" },
  "url-canonica": { Art: CanonicalCover, field: "green" },
  hreflang: { Art: HreflangCover, field: "mintSoft" },
  "canibalizacion-de-palabras-clave": { Art: CannibalCover, field: "white" },
  noindex: { Art: NoindexCover, field: "ink" },
  "url-amigable": { Art: FriendlyUrlCover, field: "soft" },
};
