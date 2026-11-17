// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/**
 * Library building blocks, part 4: URL bar, UTM tags, link chain, paper
 * plane, dashed trail, magnifier and cursor.
 */
import {
  C,
  Cursor,
  MONO,
  Panel,
} from "./parts";
import type { PieceProps } from "./libraryTypes";

/** Monospaced text forced to a fixed advance per character. */
function MonoText({
  x,
  y,
  text,
  size,
  fill,
  advance,
  weight = 400,
}: {
  x: number;
  y: number;
  text: string;
  size: number;
  fill: string;
  advance: number;
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={MONO}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      textLength={text.length * advance}
      lengthAdjust="spacingAndGlyphs"
    >
      {text}
    </text>
  );
}

/** Address bar with highlighted UTM parameters (from the UTM cover). */
export function UrlBar({ tint }: PieceProps) {
  return (
    <>
      <Panel x={64} y={84} w={512} h={56} r={28} stroke={C.line} depth={6} />
      <path
        d="M92 111 V106 a4.5 4.5 0 0 1 9 0 V111"
        fill="none"
        stroke={C.ink}
        strokeWidth={2.5}
      />
      <rect x={88} y={110} width={17} height={13} rx={3.5} fill={C.ink} />
      <MonoText
        x={116}
        y={117}
        text="tu-web.com/"
        size={15}
        fill={C.ink}
        advance={8.6}
      />
      <rect
        x={210}
        y={99}
        width={174}
        height={26}
        rx={8}
        fill={tint ?? C.mint}
      />
      <MonoText
        x={217}
        y={117}
        text="?utm_source=google"
        size={15}
        fill={C.ink}
        advance={8.8}
        weight={600}
      />
      <MonoText
        x={388}
        y={117}
        text="&"
        size={15}
        fill={C.muted}
        advance={8.8}
      />
      <rect x={400} y={99} width={142} height={26} rx={8} fill={C.green} />
      <MonoText
        x={407}
        y={117}
        text="utm_medium=cpc"
        size={15}
        fill={C.white}
        advance={9}
        weight={600}
      />
    </>
  );
}

function ParamTag({
  x,
  y,
  name,
  value,
  accent,
}: {
  x: number;
  y: number;
  name: string;
  value: string;
  accent: string;
}) {
  const keyW = name.length * 7.6 + 24;
  const valueW = value.length * 7.6 + 24;
  return (
    <g>
      <Panel
        x={x}
        y={y}
        w={keyW + valueW}
        h={32}
        r={10}
        stroke={C.line}
        depth={5}
      />
      <rect x={x} y={y} width={keyW} height={32} rx={10} fill={C.ink} />
      <rect x={x + keyW - 10} y={y} width={10} height={32} fill={C.ink} />
      <MonoText
        x={x + 12}
        y={y + 20.5}
        text={name}
        size={13}
        fill={accent}
        advance={7.6}
      />
      <MonoText
        x={x + keyW + 12}
        y={y + 20.5}
        text={value}
        size={13}
        fill={C.ink}
        advance={7.6}
      />
    </g>
  );
}

/** The three utm_ parameters unpacked into tags on a tree. */
export function UtmTags({ tint }: PieceProps) {
  const a = tint ?? C.mint;
  const tags = [
    { y: 180, name: "utm_source", value: "google" },
    { y: 230, name: "utm_medium", value: "cpc" },
    { y: 280, name: "utm_campaign", value: "black-friday" },
  ];
  return (
    <>
      <path
        d="M118 140 V296 M118 196 H150 M118 246 H150 M118 296 H150"
        fill="none"
        stroke={C.ink}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={118} cy={140} r={5} fill={C.ink} />
      {tags.map((tag) => (
        <ParamTag key={tag.name} x={152} accent={a} {...tag} />
      ))}
    </>
  );
}

/** Two interlocked chain links. */
export function LinkChain({ tint }: PieceProps) {
  return (
    <>
      <rect
        x={447}
        y={263}
        width={76}
        height={34}
        rx={17}
        fill="none"
        stroke={tint ?? C.green}
        strokeWidth={10}
        transform="rotate(-45 485 280)"
      />
      <rect
        x={483}
        y={227}
        width={76}
        height={34}
        rx={17}
        fill="none"
        stroke={C.ink}
        strokeWidth={10}
        transform="rotate(-45 521 244)"
      />
    </>
  );
}

/** Folded paper plane (from the report cover). */
export function PaperPlane({ tint }: PieceProps) {
  return (
    <>
      <path d="M424 168 L548 112 L466 186 Z" fill="rgba(33,33,33,0.12)" />
      <path d="M424 160 L548 104 L466 178 Z" fill={C.white} />
      <path d="M466 178 L548 104 L490 214 Z" fill={tint ?? C.mint} />
      <path d="M466 178 L476 206 L490 214 Z" fill={C.ink} />
    </>
  );
}

/** Dashed motion trail ending in an arrowhead. */
export function DashedTrail({ tint }: PieceProps) {
  const color = tint ?? C.ink;
  return (
    <>
      <path
        d="M8 92 C 64 92, 66 22, 128 18"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <path
        d="M118.5 9.5 L128 18 L119.5 27.5"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

/** Magnifying glass (from the Search Console cover). */
export function Magnifier({ tint }: PieceProps) {
  return (
    <>
      <circle
        cx={470}
        cy={250}
        r={52}
        fill={tint ?? "rgba(213,252,227,0.55)"}
        stroke={C.ink}
        strokeWidth={15}
      />
      <line
        x1={508}
        y1={288}
        x2={548}
        y2={328}
        stroke={C.ink}
        strokeWidth={22}
        strokeLinecap="round"
      />
    </>
  );
}

/** Pointer clicking, with its three click rays. */
export function ClickCursor({ tint }: PieceProps) {
  return (
    <>
      <g stroke={tint ?? C.green} strokeWidth={3} strokeLinecap="round">
        <line x1={338} y1={168} x2={346} y2={160} />
        <line x1={326} y1={164} x2={326} y2={152} />
        <line x1={342} y1={180} x2={354} y2={180} />
      </g>
      <Cursor x={328} y={180} />
    </>
  );
}
