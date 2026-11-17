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

/** A magnifying glass centred on (x, y). */
function Lens({
  x,
  y,
  r,
  color,
}: {
  x: number;
  y: number;
  r: number;
  color: string;
}) {
  const k = r * 0.72;
  return (
    <g fill="none" stroke={color} strokeLinecap="round">
      <circle cx={x} cy={y} r={r} strokeWidth={4} />
      <line
        x1={x + k}
        y1={y + k}
        x2={x + k + r * 0.7}
        y2={y + k + r * 0.7}
        strokeWidth={5}
      />
    </g>
  );
}

/** Herramientas para Google Ads: a toolbox of six tool tiles. */
function ToolsCover() {
  const tiles = [
    { x: 148, y: 110 },
    { x: 266, y: 110 },
    { x: 384, y: 110 },
    { x: 148, y: 222 },
    { x: 266, y: 222 },
    { x: 384, y: 222 },
  ];
  return (
    <>
      <Panel x={128} y={86} w={384} h={248} r={22} shadow="rgba(0,0,0,0.35)" />
      {tiles.map((t) => (
        <rect
          key={`${t.x}-${t.y}`}
          x={t.x}
          y={t.y}
          width={108}
          height={92}
          rx={14}
          fill={C.grey}
        />
      ))}
      {/* Keyword planner: lens */}
      <Lens x={196} y={150} r={16} color={C.ink} />
      {/* Reports: bars */}
      <g fill={C.ink} transform="translate(-17 0)">
        <rect x={304} y={160} width={12} height={22} rx={3} />
        <rect x={322} y={146} width={12} height={36} rx={3} />
        <rect x={340} y={134} width={12} height={48} rx={3} fill={C.green} />
        <rect x={358} y={152} width={12} height={30} rx={3} />
      </g>
      {/* Scripts: code brackets */}
      <text
        x={438}
        y={166}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={30}
        fill={C.ink}
      >
        {"</>"}
      </text>
      {/* Editor: download arrow into a tray */}
      <g
        fill="none"
        stroke={C.ink}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M204 244 V280 M190 266 L204 280 L218 266" />
        <path d="M180 284 V294 H228 V284" />
      </g>
      {/* Transparency: eye */}
      <g transform="translate(320 268)">
        <path
          d="M-30 0 C-18 -18 18 -18 30 0 C18 18 -18 18 -30 0 Z"
          fill={C.white}
          stroke={C.ink}
          strokeWidth={4}
        />
        <circle r={9} fill={C.ink} />
      </g>
      {/* Highlighted tile: manager account tree */}
      <g className={MOVE.up} transform="translate(-22 0)">
        <rect
          x={406}
          y={222}
          width={108}
          height={92}
          rx={14}
          fill={C.mint}
          stroke={C.ink}
          strokeWidth={2.5}
        />
        <g stroke={C.ink} strokeWidth={3} fill="none">
          <path d="M460 254 V266 M432 266 H488 M432 266 V276 M460 266 V276 M488 266 V276" />
        </g>
        <rect x={446} y={238} width={28} height={16} rx={5} fill={C.ink} />
        <rect x={422} y={276} width={20} height={16} rx={5} fill={C.white} />
        <rect x={450} y={276} width={20} height={16} rx={5} fill={C.white} />
        <rect x={478} y={276} width={20} height={16} rx={5} fill={C.white} />
      </g>
      <Cursor x={456} y={290} />
    </>
  );
}

/** Planificador de palabras clave: ideas with volume bars and a range pill. */
function PlannerCover() {
  const rows = [
    { y: 168, w: 132, v: 190, range: false },
    { y: 210, w: 104, v: 120, range: true },
    { y: 252, w: 148, v: 84, range: false },
    { y: 294, w: 92, v: 46, range: false },
  ];
  return (
    <>
      <Panel x={120} y={70} w={400} h={272} r={22} />
      <rect
        x={144}
        y={94}
        width={352}
        height={40}
        rx={20}
        fill={C.white}
        stroke={C.ink}
        strokeWidth={2}
      />
      <Lens x={168} y={112} r={7} color={C.muted} />
      <text x={190} y={119} fontFamily={SANS} fontSize={15} fill={C.ink}>
        implantes dentales
      </text>
      <rect x={426} y={102} width={60} height={24} rx={12} fill={C.ink} />
      <text
        x={456}
        y={118.5}
        textAnchor="middle"
        fontFamily={SANS}
        fontWeight={700}
        fontSize={11}
        fill={C.white}
      >
        Ideas
      </text>
      <line
        x1={144}
        x2={496}
        y1={150}
        y2={150}
        stroke={C.line}
        strokeWidth={1.5}
      />
      {rows.map((row) => (
        <g key={row.y}>
          <Bar x={144} y={row.y} w={row.w} h={9} fill={C.ink} />
          <Bar x={144} y={row.y + 16} w={row.w * 0.6} h={6} />
          <rect
            x={304}
            y={row.y - 2}
            width={row.v}
            height={14}
            rx={4}
            fill={row.range ? C.green : C.soft}
          />
        </g>
      ))}
      <g className={MOVE.upRight}>
        <Panel
          x={392}
          y={186}
          w={128}
          h={46}
          r={23}
          fill={C.ink}
          shadow="rgba(33,33,33,0.25)"
          depth={6}
        />
        <text
          x={456}
          y={216}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={21}
          letterSpacing={-0.5}
          fill={C.mint}
        >
          1K–10K
        </text>
      </g>
    </>
  );
}

/** Google Ads Editor: a desktop app with pending changes and a publish button. */
function EditorCover() {
  const rows = [
    { y: 150, changed: true },
    { y: 182, changed: true },
    { y: 214, changed: false },
    { y: 246, changed: true },
    { y: 278, changed: false },
  ];
  return (
    <>
      <Panel x={112} y={66} w={416} h={278} r={18} />
      <WindowDots x={136} y={90} />
      <line
        x1={112}
        x2={528}
        y1={110}
        y2={110}
        stroke={C.line}
        strokeWidth={1.5}
      />
      {/* Sidebar tree */}
      <rect x={112} y={110} width={112} height={214} fill={C.grey} />
      <g>
        <Bar x={130} y={132} w={72} h={8} fill={C.ink} />
        <Bar x={142} y={156} w={60} h={7} />
        <Bar x={142} y={178} w={52} h={7} />
        <Bar x={130} y={204} w={66} h={8} fill={C.ink} />
        <Bar x={142} y={228} w={58} h={7} />
        <Bar x={142} y={250} w={44} h={7} />
      </g>
      {/* Table */}
      {rows.map((row) => (
        <g key={row.y}>
          <rect
            x={240}
            y={row.y - 10}
            width={272}
            height={28}
            rx={7}
            fill={row.changed ? C.mintSoft : C.white}
          />
          <circle
            cx={254}
            cy={row.y + 4}
            r={5}
            fill={row.changed ? C.green : C.line}
          />
          <Bar x={268} y={row.y} w={110} h={8} fill={C.ink} />
          <Bar x={392} y={row.y} w={44} h={8} />
          <Bar x={448} y={row.y} w={48} h={8} />
        </g>
      ))}
      <text
        x={240}
        y={134}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={12}
        fill={C.muted}
      >
        3 cambios pendientes
      </text>
      <g className={MOVE.up}>
        <Panel
          x={388}
          y={298}
          w={124}
          h={38}
          r={12}
          fill={C.ink}
          shadow="rgba(33,33,33,0.25)"
          depth={5}
        />
        <path
          d="M410 325 V309 M403 316 L410 309 L417 316"
          fill="none"
          stroke={C.mint}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x={428}
          y={322}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={14}
          fill={C.white}
        >
          Publicar
        </text>
      </g>
    </>
  );
}

/** Auditoría de Google Ads: a checklist and a CPA-by-campaign card. */
function AdsAuditCover() {
  const rows = [
    { y: 120, w: 112, done: true },
    { y: 162, w: 90, done: true },
    { y: 204, w: 124, done: true },
    { y: 246, w: 98, done: false },
    { y: 288, w: 80, done: false },
  ];
  const bars = [
    { x: 406, h: 52 },
    { x: 436, h: 100, alert: true },
    { x: 466, h: 70 },
    { x: 496, h: 40 },
  ];
  return (
    <>
      <Panel x={124} y={82} w={236} h={256} r={20} shadow="rgba(0,0,0,0.22)" />
      <rect x={196} y={68} width={92} height={30} rx={11} fill={C.ink} />
      <rect x={226} y={78} width={32} height={8} rx={4} fill={C.mint} />
      {rows.map((row) => (
        <g key={row.y}>
          <rect
            x={146}
            y={row.y}
            width={24}
            height={24}
            rx={7}
            fill={row.done ? C.green : C.white}
            stroke={row.done ? undefined : C.line}
            strokeWidth={row.done ? undefined : 2.5}
          />
          {row.done ? <Tick x={158} y={row.y + 12} /> : null}
          <Bar x={184} y={row.y + 3} w={row.w} fill={C.ink} />
          <Bar x={184} y={row.y + 16} w={row.w * 0.6} h={6} />
        </g>
      ))}
      <g className={MOVE.up}>
        <Panel
          x={380}
          y={118}
          w={150}
          h={196}
          r={18}
          shadow="rgba(0,0,0,0.22)"
        />
        <text
          x={398}
          y={146}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={13}
          fill={C.ink}
        >
          CPA por campaña
        </text>
        <line
          x1={398}
          x2={514}
          y1={218}
          y2={218}
          stroke={C.green}
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        {bars.map((b) => (
          <rect
            key={b.x}
            x={b.x}
            y={292 - b.h}
            width={20}
            height={b.h}
            rx={4}
            fill={b.alert ? C.ink : C.mint}
          />
        ))}
        <circle cx={446} cy={176} r={9} fill={C.ink} />
        <text
          x={446}
          y={180.5}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={800}
          fontSize={12}
          fill={C.mint}
        >
          !
        </text>
      </g>
    </>
  );
}

/** One client account card under the manager account. */
function ClientCard({
  x,
  id,
  active = false,
}: {
  x: number;
  id: string;
  active?: boolean;
}) {
  return (
    <g className={active ? MOVE.up : undefined}>
      <Panel
        x={x}
        y={234}
        w={124}
        h={92}
        r={14}
        fill={active ? C.mint : C.white}
        stroke={C.ink}
        depth={6}
      />
      <Bar x={x + 16} y={254} w={70} h={9} fill={C.ink} />
      <Bar x={x + 16} y={272} w={52} h={7} fill={active ? C.white : C.line} />
      <text
        x={x + 16}
        y={308}
        fontFamily={MONO}
        fontWeight={700}
        fontSize={11}
        fill={C.ink}
      >
        {id}
      </text>
    </g>
  );
}

/** MCC de Google Ads: a manager account linked to three client accounts. */
function MccCover() {
  return (
    <>
      <g fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round">
        <path d="M320 150 V192 M180 192 H460 M180 192 V230 M320 192 V230 M460 192 V230" />
      </g>
      <Panel
        x={226}
        y={74}
        w={188}
        h={76}
        r={18}
        fill={C.ink}
        shadow="rgba(33,33,33,0.18)"
      />
      <rect x={248} y={96} width={32} height={32} rx={9} fill={C.mint} />
      <g fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round">
        <path d="M264 104 V110 M256 110 H272 M256 110 V118 M272 110 V118" />
      </g>
      <text
        x={292}
        y={108}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={14}
        fill={C.white}
      >
        Administrador
      </text>
      <Bar x={292} y={118} w={88} h={7} fill="rgba(255,255,255,0.35)" />
      <ClientCard x={118} id="123-456-7890" />
      <ClientCard x={258} id="234-567-8901" active />
      <ClientCard x={398} id="345-678-9012" />
    </>
  );
}

/** A luggage-style tag holding one campaign name. */
function NameTag({
  x,
  y,
  w,
  text,
  fill,
  color,
}: {
  x: number;
  y: number;
  w: number;
  text: string;
  fill: string;
  color: string;
}) {
  return (
    <g>
      <path
        transform={`translate(${x} ${y + 6})`}
        d={`M0 22 L22 0 H${w} A10 10 0 0 1 ${w + 10} 10 V34 A10 10 0 0 1 ${w} 44 H22 Z`}
        fill="rgba(33,33,33,0.14)"
      />
      <path
        transform={`translate(${x} ${y})`}
        d={`M0 22 L22 0 H${w} A10 10 0 0 1 ${w + 10} 10 V34 A10 10 0 0 1 ${w} 44 H22 Z`}
        fill={fill}
        stroke={C.ink}
        strokeWidth={2}
      />
      <circle cx={x + 20} cy={y + 22} r={5} fill={C.mintSoft} stroke={C.ink} />
      <text
        x={x + 36}
        y={y + 27}
        fontFamily={MONO}
        fontWeight={700}
        fontSize={14}
        fill={color}
      >
        {text}
      </text>
    </g>
  );
}

/** Nomenclatura de campañas: campaign names on tags, split into fields. */
function NamingCover() {
  return (
    <>
      <NameTag
        x={134}
        y={92}
        w={300}
        text="SEM_LEADS_ES-es_MARCA"
        fill={C.white}
        color={C.ink}
      />
      <g className={MOVE.right}>
        <NameTag
          x={154}
          y={160}
          w={344}
          text="SEM_LEADS_ES-es_IMPLANTES"
          fill={C.ink}
          color={C.mint}
        />
      </g>
      <NameTag
        x={134}
        y={228}
        w={326}
        text="PMAX_LEADS_MX-es_ORTODONCIA"
        fill={C.white}
        color={C.ink}
      />
      {/* Field brackets under the highlighted name */}
      <g fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round">
        <path d="M170 288 V296 H204 V288" />
        <path d="M212 288 V296 H254 V288" />
        <path d="M263 288 V296 H305 V288" />
        <path d="M313 288 V296 H398 V288" />
      </g>
      <g
        fontFamily={SANS}
        fontWeight={600}
        fontSize={11}
        fill={C.ink}
        textAnchor="middle"
      >
        <text x={187} y={314}>
          red
        </text>
        <text x={233} y={314}>
          objetivo
        </text>
        <text x={284} y={314}>
          mercado
        </text>
        <text x={355} y={314}>
          producto
        </text>
      </g>
    </>
  );
}

/** Palabras clave negativas: search terms with irrelevant ones struck out. */
function NegativesCover() {
  const terms = [
    { y: 140, text: "implantes dentales precio", bad: false },
    { y: 184, text: "curso de implantología", bad: true },
    { y: 228, text: "implantes seguridad social", bad: true },
    { y: 272, text: "clínica dental valencia", bad: false },
  ];
  return (
    <>
      <Panel x={116} y={70} w={380} h={268} r={20} shadow="rgba(0,0,0,0.35)" />
      <text
        x={140}
        y={104}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={14}
        fill={C.ink}
      >
        Términos de búsqueda
      </text>
      <line
        x1={116}
        x2={496}
        y1={120}
        y2={120}
        stroke={C.line}
        strokeWidth={1.5}
      />
      {terms.map((t) => (
        <g key={t.y}>
          <rect
            x={136}
            y={t.y - 6}
            width={340}
            height={34}
            rx={9}
            fill={t.bad ? C.grey : C.white}
          />
          <circle cx={156} cy={t.y + 11} r={9} fill={t.bad ? C.ink : C.green} />
          {t.bad ? (
            <rect x={151} y={t.y + 9.5} width={10} height={3} fill={C.white} />
          ) : (
            <Tick x={156} y={t.y + 11} size={0.8} width={2.5} />
          )}
          <text
            x={176}
            y={t.y + 16}
            fontFamily={SANS}
            fontSize={14}
            fill={t.bad ? C.muted : C.ink}
          >
            {t.text}
          </text>
          {t.bad ? (
            <line
              x1={174}
              x2={176 + t.text.length * 6.9}
              y1={t.y + 11}
              y2={t.y + 11}
              stroke={C.ink}
              strokeWidth={2}
            />
          ) : null}
        </g>
      ))}
      <g className={MOVE.up}>
        <Panel
          x={432}
          y={196}
          w={124}
          h={64}
          r={16}
          fill={C.mint}
          stroke={C.ink}
          shadow="rgba(0,0,0,0.3)"
          depth={6}
        />
        <circle cx={458} cy={228} r={14} fill={C.ink} />
        <rect x={450} y={226} width={16} height={4} rx={2} fill={C.mint} />
        <text
          x={480}
          y={224}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={13}
          fill={C.ink}
        >
          Negativa
        </text>
        <Bar x={480} y={234} w={56} h={6} fill={C.ink} />
      </g>
    </>
  );
}

/** Bespoke covers for this batch of posts, keyed by slug. */
export const COVERS_K: Record<string, { Art: ComponentType; field: Field }> = {
  "herramientas-google-ads": { Art: ToolsCover, field: "ink" },
  "planificador-de-palabras-clave": { Art: PlannerCover, field: "mint" },
  "google-ads-editor": { Art: EditorCover, field: "soft" },
  "auditoria-google-ads": { Art: AdsAuditCover, field: "green" },
  "mcc-google-ads": { Art: MccCover, field: "white" },
  "nomenclatura-campanas-google-ads": { Art: NamingCover, field: "mintSoft" },
  "palabras-clave-negativas-google-ads": { Art: NegativesCover, field: "ink" },
};
