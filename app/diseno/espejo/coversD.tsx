// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
import {
  Bar,
  BrandMark,
  C,
  DISPLAY,
  MONO,
  MOVE,
  Panel,
  SANS,
} from "./parts";

/** Seguimiento de posiciones: a ranking list where our page climbs to #2,
 *  and its position chart. */
export function RankingCover() {
  const rows = [
    { n: 1, w: 120 },
    { n: 2, w: 0, ours: true },
    { n: 3, w: 98 },
    { n: 4, w: 128 },
  ];
  const ys = [318, 310, 300, 294, 276, 262, 242];
  const points = ys.map((y, i) => `${356 + i * 30},${y}`).join(" ");
  return (
    <>
      <Panel x={96} y={70} w={270} h={262} r={20} shadow="rgba(0,0,0,0.16)" />
      <Bar x={120} y={96} w={90} fill={C.ink} />
      <text
        x={342}
        y={104}
        textAnchor="end"
        fontFamily={MONO}
        fontSize={11}
        fill={C.muted}
      >
        posición
      </text>
      {rows.map((row, i) => {
        const y = 124 + i * 50;
        return (
          <g key={row.n}>
            <rect
              x={112}
              y={y}
              width={238}
              height={40}
              rx={12}
              fill={row.ours ? C.mint : C.grey}
            />
            <text
              x={128}
              y={y + 27}
              fontFamily={DISPLAY}
              fontWeight={700}
              fontSize={18}
              letterSpacing={-0.5}
              fill={C.ink}
            >
              {`#${row.n}`}
            </text>
            {row.ours ? (
              <>
                <text
                  x={166}
                  y={y + 25}
                  fontFamily={SANS}
                  fontWeight={600}
                  fontSize={13}
                  fill={C.ink}
                >
                  tu-web.com
                </text>
                <rect
                  x={288}
                  y={y + 10}
                  width={40}
                  height={20}
                  rx={10}
                  fill={C.ink}
                />
                <text
                  x={308}
                  y={y + 24}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontWeight={700}
                  fontSize={11}
                  fill={C.mint}
                >
                  ▲2
                </text>
              </>
            ) : (
              <Bar x={166} y={y + 16} w={row.w} fill={C.line} />
            )}
          </g>
        );
      })}
      <path
        d="M104 304 C 66 290, 66 212, 100 196"
        fill="none"
        stroke={C.white}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1 8"
      />
      <path
        d="M88.2 193.9 L100 196 L94 206.4"
        fill="none"
        stroke={C.white}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className={MOVE.up}>
        <Panel
          x={334}
          y={178}
          w={226}
          h={160}
          r={18}
          fill={C.ink}
          shadow="rgba(0,0,0,0.2)"
        />
        <text
          x={354}
          y={206}
          fontFamily={SANS}
          fontSize={11}
          fill="rgba(255,255,255,0.6)"
        >
          Posición media
        </text>
        <text
          x={540}
          y={210}
          textAnchor="end"
          fontFamily={DISPLAY}
          fontWeight={700}
          fontSize={26}
          letterSpacing={-1}
          fill={C.mint}
        >
          #2
        </text>
        {[250, 280, 310].map((y) => (
          <line
            key={y}
            x1={354}
            x2={540}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1.5}
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke={C.mint}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={536}
          cy={242}
          r={6}
          fill={C.mint}
          stroke={C.white}
          strokeWidth={3}
        />
      </g>
    </>
  );
}

/** Tráfico Unassigned en GA4: channel bars where the last one is unknown. */
export function UnassignedCover() {
  const bars = [
    { h: 150, fill: C.ink, label: "Orgánico" },
    { h: 104, fill: C.green, label: "Directo" },
    { h: 78, fill: C.mint, label: "Referido" },
    { h: 52, fill: C.soft, label: "Social" },
  ];
  return (
    <>
      <Panel
        x={104}
        y={66}
        w={432}
        h={272}
        r={20}
        shadow="rgba(33,33,33,0.08)"
      />
      <text
        x={128}
        y={100}
        fontFamily={SANS}
        fontWeight={600}
        fontSize={13}
        fill={C.ink}
      >
        Canales
      </text>
      <text
        x={512}
        y={100}
        textAnchor="end"
        fontFamily={MONO}
        fontSize={11}
        fill={C.muted}
      >
        GA4 · sesiones
      </text>
      {bars.map((bar, i) => (
        <g key={bar.label}>
          <rect
            x={140 + i * 76}
            y={296 - bar.h}
            width={48}
            height={bar.h}
            rx={8}
            fill={bar.fill}
          />
          <text
            x={164 + i * 76}
            y={318}
            textAnchor="middle"
            fontFamily={SANS}
            fontSize={11}
            fill={C.muted}
          >
            {bar.label}
          </text>
        </g>
      ))}
      <rect
        x={445}
        y={177}
        width={46}
        height={118}
        rx={8}
        fill={C.grey}
        stroke={C.ink}
        strokeWidth={2}
        strokeDasharray="5 6"
      />
      <text
        x={468}
        y={318}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={11}
        fill={C.ink}
      >
        Unassigned
      </text>
      <line
        x1={128}
        x2={512}
        y1={296}
        y2={296}
        stroke={C.line}
        strokeWidth={1.5}
      />
      <g className={MOVE.up}>
        <circle cx={468} cy={236} r={20} fill={C.mint} />
        <text
          x={468}
          y={246}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontWeight={800}
          fontSize={26}
          fill={C.ink}
        >
          ?
        </text>
      </g>
    </>
  );
}

/** Any post without its own illustration: the brand mark on a card. */
export function GenericCover() {
  return (
    <>
      <Panel
        x={220}
        y={80}
        w={200}
        h={200}
        r={36}
        shadow="rgba(33,33,33,0.1)"
      />
      <BrandMark x={226} y={82} scale={3.6} />
      <Bar x={250} y={312} w={140} h={10} fill={C.ink} />
      <Bar x={276} y={332} w={88} h={8} fill={C.mint} />
    </>
  );
}
