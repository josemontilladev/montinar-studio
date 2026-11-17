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

/** A small page thumbnail: header strip and two text lines. */
function PageCard({
  x,
  y,
  fill = C.white,
  ink = C.ink,
}: {
  x: number;
  y: number;
  fill?: string;
  ink?: string;
}) {
  return (
    <g>
      <Panel x={x} y={y} w={56} h={56} r={10} fill={fill} depth={6} />
      <rect x={x + 10} y={y + 10} width={20} height={6} rx={3} fill={ink} />
      <Bar x={x + 10} y={y + 25} w={36} h={6} fill={C.line} />
      <Bar x={x + 10} y={y + 37} w={26} h={6} fill={C.line} />
    </g>
  );
}

/**
 * Arquitectura web: the site as a pyramid. Home on top, three sections and
 * their pages below; one branch is highlighted from home down to a page.
 */
function SiteTreeCover() {
  const sections = [
    { c: 180, label: "Servicios" },
    { c: 320, label: "Productos" },
    { c: 460, label: "Blog" },
  ];
  return (
    <>
      {/* Connectors */}
      <g fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round">
        <path d="M320 118 V142 M180 142 H460 M180 142 V166 M460 142 V166" />
        {sections.map((s) => (
          <path
            key={s.c}
            d={`M${s.c} 210 V236 M${s.c - 34} 236 H${s.c + 34} M${s.c - 34} 236 V262 M${s.c + 34} 236 V262`}
          />
        ))}
      </g>
      {/* Highlighted path: home → Productos → page */}
      <path
        d="M320 118 V166 M320 210 V236 H354 V262"
        fill="none"
        stroke={C.green}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Home */}
      <Panel x={260} y={70} w={120} h={48} r={14} fill={C.ink} />
      <path
        d="M284 98 L294 89 L304 98 V106 H284 Z"
        fill="none"
        stroke={C.mint}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <text
        x={314}
        y={100}
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={15}
        fill={C.white}
      >
        Inicio
      </text>

      {/* Sections */}
      {sections.map((s) => (
        <g key={s.label}>
          <Panel
            x={s.c - 58}
            y={166}
            w={116}
            h={44}
            r={12}
            fill={s.c === 320 ? C.mint : C.white}
            depth={6}
          />
          <text
            x={s.c}
            y={193}
            textAnchor="middle"
            fontFamily={SANS}
            fontWeight={600}
            fontSize={14}
            fill={C.ink}
          >
            {s.label}
          </text>
        </g>
      ))}

      {/* Pages */}
      {sections.map((s) =>
        s.c === 320 ? (
          <g key={s.c}>
            <PageCard x={s.c - 62} y={262} />
            <g className={MOVE.up}>
              <PageCard x={s.c + 6} y={262} fill={C.green} ink={C.white} />
              <circle cx={s.c + 60} cy={262} r={12} fill={C.ink} />
              <Tick x={s.c + 60} y={262} size={0.9} color={C.mint} />
            </g>
          </g>
        ) : (
          <g key={s.c}>
            <PageCard x={s.c - 62} y={262} />
            <PageCard x={s.c + 6} y={262} />
          </g>
        ),
      )}

      {/* Click depth */}
      <g fontFamily={MONO} fontWeight={700} fontSize={11} fill={C.muted}>
        <text x={548} y={98} textAnchor="end">
          1
        </text>
        <text x={548} y={194} textAnchor="end">
          2
        </text>
        <text x={548} y={294} textAnchor="end">
          3
        </text>
      </g>
    </>
  );
}

/** Straight link arrow from (x1, y1) to (x2, y2) with a solid head. */
function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}) {
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const len = Math.hypot(x2 - x1, y2 - y1);
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${angle})`}>
      <line
        x1={0}
        y1={0}
        x2={len - 10}
        y2={0}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1 8"
      />
      <path d={`M${len} 0 L${len - 13} -7 L${len - 13} 7 Z`} fill={color} />
    </g>
  );
}

/** A cluster page around the pillar. */
function ClusterCard({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Panel
        x={x}
        y={y}
        w={100}
        h={80}
        r={14}
        shadow="rgba(0,0,0,0.35)"
        depth={6}
      />
      <rect x={x + 14} y={y + 14} width={34} height={8} rx={4} fill={C.ink} />
      <Bar x={x + 14} y={y + 32} w={72} h={6} />
      <Bar x={x + 14} y={y + 44} w={56} h={6} />
      <Bar x={x + 14} y={y + 58} w={40} h={6} fill={C.green} />
    </g>
  );
}

/**
 * Enlazado interno: a pillar page in the middle and four cluster pages that
 * link to it, plus the anchor text of one of those links.
 */
function InternalLinksCover() {
  return (
    <>
      <Arrow x1={220} y1={122} x2={262} y2={158} color={C.mint} />
      <Arrow x1={220} y1={262} x2={262} y2={228} color={C.mint} />
      <Arrow x1={420} y1={122} x2={378} y2={158} color={C.mint} />
      <Arrow x1={378} y1={228} x2={420} y2={262} color={C.white} />

      <ClusterCard x={118} y={80} />
      <ClusterCard x={118} y={222} />
      <ClusterCard x={422} y={80} />
      <g className={MOVE.right}>
        <ClusterCard x={422} y={222} />
      </g>

      {/* Pillar page */}
      <g className={MOVE.up}>
        <Panel
          x={262}
          y={118}
          w={116}
          h={150}
          r={18}
          fill={C.mint}
          shadow="rgba(0,0,0,0.35)"
        />
        <rect x={280} y={136} width={52} height={10} rx={5} fill={C.ink} />
        <Bar x={280} y={158} w={80} h={7} fill="rgba(33,33,33,0.25)" />
        <Bar x={280} y={172} w={64} h={7} fill="rgba(33,33,33,0.25)" />
        <Bar x={280} y={186} w={74} h={7} fill="rgba(33,33,33,0.25)" />
        <text
          x={320}
          y={240}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={16}
          fill={C.ink}
        >
          Pilar
        </text>
      </g>

      {/* Anchor text of a link */}
      <g className={MOVE.down}>
        <rect x={214} y={300} width={212} height={34} rx={17} fill={C.white} />
        <text
          x={320}
          y={322}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={600}
          fontSize={13}
          fill={C.green}
          textDecoration="underline"
        >
          precios de implantes dentales
        </text>
      </g>
    </>
  );
}

/** A five-point star centred on (x, y). */
function Star({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0 -7 L2 -2.2 L7 -2.2 L3 1 L4.5 6 L0 3 L-4.5 6 L-3 1 L-7 -2.2 L-2 -2.2 Z"
      fill={fill}
    />
  );
}

/**
 * Web que convierte: a landing page with a clear value proposition, reviews
 * and a big call-to-action, next to a funnel that ends in new clients.
 */
function ConversionCover() {
  const funnel = [
    { y: 152, w: 110, label: "Visitas", fill: "rgba(255,255,255,0.18)" },
    { y: 196, w: 88, label: "Clics", fill: "rgba(255,255,255,0.32)" },
    { y: 240, w: 66, label: "Clientes", fill: C.mint },
  ];
  return (
    <>
      {/* Landing page */}
      <Panel x={116} y={70} w={290} h={264} r={18} />
      <WindowDots x={138} y={92} />
      <line
        x1={116}
        x2={406}
        y1={110}
        y2={110}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <Bar x={140} y={130} w={210} h={14} fill={C.ink} />
      <Bar x={140} y={152} w={160} h={14} fill={C.ink} />
      <Bar x={140} y={178} w={190} h={7} />
      <Bar x={140} y={192} w={150} h={7} />
      <g>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} x={148 + i * 17} y={222} fill={C.green} />
        ))}
        <Bar x={240} y={218} w={60} h={7} />
      </g>
      <g className={MOVE.up}>
        <rect x={140} y={256} width={190} height={48} rx={14} fill={C.green} />
        <text
          x={222}
          y={286}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={16}
          fill={C.white}
        >
          Pide presupuesto
        </text>
        <Cursor x={310} y={290} />
      </g>

      {/* Funnel */}
      <Panel
        x={426}
        y={100}
        w={134}
        h={214}
        r={18}
        fill={C.ink}
        shadow="rgba(33,33,33,0.18)"
      />
      {funnel.map((step) => (
        <g key={step.label}>
          <rect
            x={493 - step.w / 2}
            y={step.y - 22}
            width={step.w}
            height={30}
            rx={8}
            fill={step.fill}
          />
          <text
            x={493}
            y={step.y - 2}
            textAnchor="middle"
            fontFamily={SANS}
            fontWeight={600}
            fontSize={11}
            fill={step.fill === C.mint ? C.ink : C.white}
          >
            {step.label}
          </text>
        </g>
      ))}
      <g className={MOVE.upRight}>
        <text
          x={493}
          y={296}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={30}
          letterSpacing={-1}
          fill={C.mint}
        >
          +36
        </text>
      </g>
    </>
  );
}

/** A half-circle gauge for one Core Web Vital, good value shown in green. */
function Gauge({
  cx,
  label,
  value,
  share,
  lift = false,
}: {
  cx: number;
  label: string;
  value: string;
  share: number;
  lift?: boolean;
}) {
  const cy = 206;
  const r = 40;
  const half = Math.PI * r;
  const angle = Math.PI * (1 - share);
  const nx = cx + Math.cos(angle) * (r - 12);
  const ny = cy - Math.sin(angle) * (r - 12);
  return (
    <g className={lift ? MOVE.up : undefined}>
      <Panel
        x={cx - 62}
        y={112}
        w={124}
        h={196}
        r={18}
        fill={lift ? C.ink : C.white}
        stroke={lift ? undefined : C.line}
      />
      <text
        x={cx}
        y={150}
        textAnchor="middle"
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={20}
        fill={lift ? C.white : C.ink}
      >
        {label}
      </text>
      <path
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={lift ? "rgba(255,255,255,0.16)" : C.soft}
        strokeWidth={12}
        strokeLinecap="round"
      />
      <path
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={lift ? C.mint : C.green}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${half * share} ${half}`}
      />
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke={lift ? C.white : C.ink}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={5} fill={lift ? C.white : C.ink} />
      <text
        x={cx}
        y={246}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={15}
        fill={lift ? C.white : C.ink}
      >
        {value}
      </text>
      <rect
        x={cx - 30}
        y={262}
        width={60}
        height={24}
        rx={12}
        fill={lift ? C.mint : C.mintSoft}
      />
      <text
        x={cx}
        y={278}
        textAnchor="middle"
        fontFamily={SANS}
        fontWeight={600}
        fontSize={11}
        fill={C.ink}
      >
        Bueno
      </text>
    </g>
  );
}

/** Core Web Vitals: three gauges, LCP, INP and CLS, all in the good range. */
function CoreWebVitalsCover() {
  return (
    <>
      <Gauge cx={182} label="LCP" value="2,1 s" share={0.42} />
      <Gauge cx={320} label="INP" value="160 ms" share={0.3} lift />
      <Gauge cx={458} label="CLS" value="0,05" share={0.22} />
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_H: Record<string, { Art: ComponentType; field: Field }> = {
  "arquitectura-web-seo": { Art: SiteTreeCover, field: "soft" },
  "enlazado-interno": { Art: InternalLinksCover, field: "ink" },
  "web-que-convierte": { Art: ConversionCover, field: "mintSoft" },
  "core-web-vitals": { Art: CoreWebVitalsCover, field: "white" },
};
