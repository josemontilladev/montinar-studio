// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Library building blocks, part 5: small accents — sparkle, trend arrow,
 * warning and check badges, calendar, tag and pill.
 */
import {
  Bar,
  C,
  DISPLAY,
  MONO,
  Panel,
  Tick,
} from "./parts";
import { Sparkle } from "./templates";
import type { PieceProps } from "./libraryTypes";

const SHADOW = "rgba(33,33,33,0.12)";

/** A big and a small four-point sparkle (the set's "AI" glyph). */
export function Sparkles({ tint }: PieceProps) {
  const fill = tint ?? C.green;
  return (
    <>
      <Sparkle x={34} y={42} r={32} fill={fill} />
      <Sparkle x={78} y={12} r={11} fill={fill} />
    </>
  );
}

/** Bold rising trend arrow. */
export function TrendArrow({ tint }: PieceProps) {
  return (
    <path
      d="M6 66 L40 32 L60 52 L96 16 M70 14 H98 V42"
      fill="none"
      stroke={tint ?? C.green}
      strokeWidth={11}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Round warning badge with an exclamation mark. */
export function WarningBadge({ tint }: PieceProps) {
  const fill = tint ?? C.ink;
  return (
    <>
      <circle cx={32} cy={38} r={30} fill={SHADOW} />
      <circle cx={32} cy={32} r={30} fill={fill} />
      <text
        x={32}
        y={45}
        textAnchor="middle"
        fontFamily={DISPLAY}
        fontWeight={700}
        fontSize={38}
        fill={fill === C.mint || fill === C.white ? C.ink : C.mint}
      >
        !
      </text>
    </>
  );
}

/** Round check badge. */
export function CheckBadge({ tint }: PieceProps) {
  const fill = tint ?? C.mint;
  return (
    <>
      <circle cx={32} cy={38} r={30} fill={SHADOW} />
      <circle cx={32} cy={32} r={30} fill={fill} />
      <Tick
        x={32}
        y={32}
        size={2.4}
        width={6}
        color={fill === C.ink || fill === C.green ? C.white : C.ink}
      />
    </>
  );
}

/** Month calendar with one highlighted day. */
export function CalendarCard({ tint }: PieceProps) {
  const a = tint ?? C.mint;
  const days = Array.from({ length: 28 }, (_, i) => i);
  return (
    <>
      <Panel x={0} y={12} w={204} h={196} r={18} stroke={C.line} />
      <path
        d="M0 30 a18 18 0 0 1 18 -18 H186 a18 18 0 0 1 18 18 V58 H0 Z"
        fill={C.ink}
      />
      <rect x={44} y={0} width={10} height={28} rx={5} fill={C.ink} />
      <rect x={150} y={0} width={10} height={28} rx={5} fill={C.ink} />
      <rect x={46} y={2} width={6} height={18} rx={3} fill={C.mint} />
      <rect x={152} y={2} width={6} height={18} rx={3} fill={C.mint} />
      <text
        x={102}
        y={43}
        textAnchor="middle"
        fontFamily={MONO}
        fontWeight={700}
        fontSize={14}
        letterSpacing={2}
        fill={C.white}
      >
        NOV
      </text>
      {days.map((d) => {
        const x = 18 + (d % 7) * 25;
        const y = 74 + Math.floor(d / 7) * 30;
        const on = d === 17;
        return (
          <g key={d}>
            <rect
              x={x}
              y={y}
              width={19}
              height={22}
              rx={6}
              fill={on ? a : d % 7 > 4 ? C.soft : C.grey}
            />
            {on ? (
              <Tick x={x + 9.5} y={y + 11} color={C.ink} width={2.5} />
            ) : null}
          </g>
        );
      })}
    </>
  );
}

/** Price-tag style label with a hole. */
export function TagShape({ tint }: PieceProps) {
  const fill = tint ?? C.mint;
  const d = "M18 0 H118 a14 14 0 0 1 14 14 V50 a14 14 0 0 1 -14 14 H18 L0 32 Z";
  return (
    <>
      <path d={d} transform="translate(0 6)" fill={SHADOW} />
      <path d={d} fill={fill} />
      <circle cx={26} cy={32} r={6} fill={C.white} />
      <Bar x={44} y={22} w={68} h={9} fill={C.ink} />
      <Bar x={44} y={37} w={44} h={7} fill="rgba(33,33,33,0.35)" />
    </>
  );
}

/** Rounded pill with a status dot and a label bar. */
export function PillShape({ tint }: PieceProps) {
  const fill = tint ?? C.ink;
  const light = fill === C.white || fill === C.mint || fill === C.mintSoft;
  return (
    <>
      <rect x={0} y={5} width={150} height={44} rx={22} fill={SHADOW} />
      <rect x={0} y={0} width={150} height={44} rx={22} fill={fill} />
      <circle cx={24} cy={22} r={7} fill={light ? C.green : C.mint} />
      <Bar x={40} y={18} w={90} h={9} fill={light ? C.ink : C.white} />
    </>
  );
}
