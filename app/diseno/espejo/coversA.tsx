// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
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

/** Auditoría técnica: a checklist clipboard and a site-health ring. */
export function AuditCover() {
  const rows = [
    { y: 124, a: 124, b: 70, done: true },
    { y: 168, a: 96, b: 88, done: true },
    { y: 212, a: 132, b: 58, done: true },
    { y: 256, a: 104, b: 80, done: false },
    { y: 300, a: 84, b: 64, done: false },
  ];
  const circumference = 2 * Math.PI * 60;
  return (
    <>
      <Panel x={140} y={80} w={226} h={270} r={20} />
      <rect x={208} y={64} width={90} height={32} rx={12} fill={C.ink} />
      <rect x={238} y={74} width={30} height={8} rx={4} fill={C.mint} />
      {rows.map((row) => (
        <g key={row.y}>
          <rect
            x={164}
            y={row.y - 2}
            width={24}
            height={24}
            rx={7}
            fill={row.done ? C.green : C.white}
            stroke={row.done ? undefined : C.line}
            strokeWidth={row.done ? undefined : 2.5}
          />
          {row.done ? <Tick x={176} y={row.y + 10} /> : null}
          <Bar x={202} y={row.y + 1} w={row.a} fill={C.ink} />
          <Bar x={202} y={row.y + 14} w={row.b} h={6} />
        </g>
      ))}
      <g className={MOVE.up}>
        <circle cx={448} cy={236} r={96} fill={C.ink} />
        <circle
          cx={448}
          cy={236}
          r={60}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={16}
        />
        <circle
          cx={448}
          cy={236}
          r={60}
          fill="none"
          stroke={C.mint}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.92} ${circumference}`}
          transform="rotate(-90 448 236)"
        />
        <text
          x={448}
          y={250}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={46}
          letterSpacing={-2}
          fill={C.white}
        >
          92
        </text>
        <text
          x={448}
          y={274}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={12}
          fill="rgba(255,255,255,0.6)"
        >
          salud
        </text>
        <circle cx={524} cy={160} r={9} fill={C.white} />
      </g>
    </>
  );
}

function Chip({
  x,
  y,
  n,
  active = false,
}: {
  x: number;
  y: number;
  n: number;
  active?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={26}
        height={22}
        rx={7}
        fill={active ? C.mint : C.soft}
      />
      <text
        x={x + 13}
        y={y + 15.5}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={12}
        fill={C.ink}
      >
        {n}
      </text>
    </g>
  );
}

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

/**
 * SEO e IA: a chat with an AI assistant. The user asks, the assistant answers
 * and cites a source — your site, highlighted in mint.
 */
export function AiAnswerCover() {
  return (
    <g transform="translate(22 16)">
      <Panel x={96} y={46} w={448} h={300} r={22} shadow="rgba(0,0,0,0.35)" />
      {/* Header */}
      <Sparkle x={124} y={74} r={13} />
      <text
        x={146}
        y={79}
        fontFamily={SANS}
        fontWeight={700}
        fontSize={14}
        fill={C.ink}
      >
        Asistente IA
      </text>
      <circle cx={244} cy={74} r={4} fill={C.green} />
      <WindowDots x={488} y={74} />
      <line
        x1={96}
        x2={544}
        y1={98}
        y2={98}
        stroke={C.line}
        strokeWidth={1.5}
      />

      {/* User question */}
      <g className={MOVE.left}>
        <path
          d="M300 112 H504 A16 16 0 0 1 520 128 V146 A6 6 0 0 1 514 152 H300 A16 16 0 0 1 284 136 V128 A16 16 0 0 1 300 112 Z"
          fill={C.ink}
        />
        <text
          x={402}
          y={137}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={500}
          fontSize={13}
          fill={C.white}
        >
          ¿Cómo aparezco en ChatGPT?
        </text>
      </g>

      {/* Assistant answer */}
      <Sparkle x={124} y={180} />
      <path
        d="M150 166 H458 A16 16 0 0 1 474 182 V256 A16 16 0 0 1 458 272 H162 A16 16 0 0 1 146 256 V172 A6 6 0 0 1 150 166 Z"
        fill={C.grey}
      />
      <text x={162} y={190} fontFamily={SANS} fontSize={13} fill={C.ink}>
        Haz tu web fácil de rastrear y de
      </text>
      <text x={162} y={210} fontFamily={SANS} fontSize={13} fill={C.ink}>
        citar: respuestas claras, con datos
      </text>
      <text x={162} y={230} fontFamily={SANS} fontSize={13} fill={C.ink}>
        y fuentes propias.
      </text>
      <Chip x={280} y={215} n={1} active />
      <Chip x={310} y={215} n={2} />
      <Bar x={162} y={248} w={150} />

      {/* Cited source: your site */}
      <g className={MOVE.up}>
        <Panel
          x={348}
          y={226}
          w={176}
          h={62}
          r={14}
          shadow="rgba(33,33,33,0.18)"
          depth={6}
        />
        <Chip x={362} y={238} n={1} active />
        <text
          x={396}
          y={254}
          fontFamily={SANS}
          fontWeight={600}
          fontSize={13}
          fill={C.ink}
        >
          tu-web.com
        </text>
        <Bar x={362} y={270} w={140} h={7} />
      </g>

      {/* Composer */}
      <rect
        x={116}
        y={300}
        width={408}
        height={32}
        rx={16}
        fill={C.white}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <text x={136} y={320} fontFamily={SANS} fontSize={12} fill={C.muted}>
        Pregunta lo que quieras…
      </text>
      <circle cx={507} cy={316} r={11} fill={C.ink} />
      <path
        d="M507 321 V311 M502.5 315.5 L507 311 L511.5 315.5"
        fill="none"
        stroke={C.mint}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={566} cy={110} r={7} fill={C.mint} />
      <circle cx={588} cy={134} r={4} fill="rgba(255,255,255,0.4)" />
    </g>
  );
}

/** Left edge of month column i on the roadmap board. */
const col = (i: number) => 104 + 72 * i;

/** Plan SEO a 6 meses: a six-column roadmap with task chips. */
export function PlanCover() {
  const tasks = [
    {
      from: 0,
      span: 2,
      y: 146,
      fill: C.ink,
      text: C.white,
      label: "Auditoría",
      done: true,
    },
    {
      from: 1,
      span: 3,
      y: 192,
      fill: C.green,
      text: C.white,
      label: "Contenidos",
    },
    { from: 2, span: 3, y: 238, fill: C.mint, text: C.ink, label: "Enlaces" },
    {
      from: 4,
      span: 2,
      y: 284,
      fill: C.mintSoft,
      text: C.ink,
      label: "Informe",
    },
  ];
  return (
    <>
      <Panel
        x={80}
        y={74}
        w={480}
        h={264}
        r={20}
        shadow="rgba(33,33,33,0.08)"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          {i > 0 ? (
            <line
              x1={col(i)}
              x2={col(i)}
              y1={96}
              y2={318}
              stroke={C.grey}
              strokeWidth={2}
            />
          ) : null}
          <text
            x={col(i) + 36}
            y={112}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={12}
            fill={C.muted}
          >
            {`M${i + 1}`}
          </text>
        </g>
      ))}
      <line
        x1={100}
        x2={540}
        y1={126}
        y2={126}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <line
        x1={212}
        x2={212}
        y1={126}
        y2={320}
        stroke={C.green}
        strokeWidth={2}
      />
      <circle cx={212} cy={126} r={6} fill={C.green} />
      <g className={MOVE.right}>
        {tasks.map((task) => {
          const x = col(task.from) + 6;
          const w = 72 * task.span - 12;
          return (
            <g key={task.label}>
              <rect
                x={x}
                y={task.y}
                width={w}
                height={30}
                rx={15}
                fill={task.fill}
              />
              <text
                x={x + 15}
                y={task.y + 19.5}
                fontFamily={SANS}
                fontWeight={600}
                fontSize={13}
                fill={task.text}
              >
                {task.label}
              </text>
              {task.done ? (
                <Tick x={x + w - 18} y={task.y + 15} color={C.mint} />
              ) : null}
            </g>
          );
        })}
      </g>
    </>
  );
}
