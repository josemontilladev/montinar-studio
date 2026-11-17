// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/* eslint-disable max-lines -- Static SVG drawings for one batch of blog covers; splitting them would only scatter the batch. */
import type { ComponentType } from "react";
import type { Field } from "./PostCover";
import {
  Bar,
  C,
  DISPLAY,
  MOVE,
  Panel,
  SANS,
  Tick,
} from "./parts";

/** A map pin with its tip at (x, y). */
function Pin({
  x,
  y,
  fill = C.green,
  dot = C.white,
}: {
  x: number;
  y: number;
  fill?: string;
  dot?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={2} rx={14} ry={5} fill="rgba(33,33,33,0.18)" />
      <path
        d="M0 0 C-6 -14 -26 -30 -26 -50 A26 26 0 0 1 26 -50 C26 -30 6 -14 0 0 Z"
        fill={fill}
        stroke={C.ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <circle cx={0} cy={-50} r={10} fill={dot} />
    </g>
  );
}

/** Five rating stars starting at (x, y). */
function Stars({
  x,
  y,
  filled = 5,
  size = 1,
}: {
  x: number;
  y: number;
  filled?: number;
  size?: number;
}) {
  const star =
    "M0 -8 L2.4 -2.6 L8 -2.5 L3.6 1.2 L5 7 L0 3.8 L-5 7 L-3.6 1.2 L-8 -2.5 L-2.4 -2.6 Z";
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={star}
          transform={`translate(${i * 20} 0)`}
          fill={i < filled ? "#f5b400" : C.line}
        />
      ))}
    </g>
  );
}

/** Restaurantes: a menu card with dishes and prices, a map pin and a rating. */
function RestaurantCover() {
  const dishes = [
    { w: 110, price: "14 USD" },
    { w: 86, price: "9 USD" },
    { w: 124, price: "18 USD" },
    { w: 96, price: "12 USD" },
  ];
  return (
    <>
      <Panel x={140} y={62} w={240} h={286} r={20} />
      <text
        x={260}
        y={104}
        textAnchor="middle"
        fontFamily={DISPLAY}
        fontSize={24}
        fontWeight={700}
        letterSpacing={-0.5}
        fill={C.ink}
      >
        Carta
      </text>
      <line
        x1={200}
        x2={320}
        y1={120}
        y2={120}
        stroke={C.green}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {dishes.map((d, i) => (
        <g key={d.price}>
          <Bar x={166} y={146 + i * 44} w={d.w} h={9} fill={C.ink} />
          <Bar x={166} y={162 + i * 44} w={d.w - 30} h={7} />
          <text
            x={354}
            y={156 + i * 44}
            textAnchor="end"
            fontFamily={SANS}
            fontSize={14}
            fontWeight={700}
            fill={C.green}
          >
            {d.price}
          </text>
        </g>
      ))}
      <g className={MOVE.upRight}>
        <Pin x={456} y={210} fill={C.white} dot={C.white} />
        <path
          d="M449 146 V170 M456 146 V170 M463 146 V170 M449 166 H463 M456 170 V184"
          fill="none"
          stroke={C.ink}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </g>
      <g className={MOVE.up}>
        <Panel x={390} y={258} w={150} h={58} r={14} fill={C.ink} depth={6} />
        <Stars x={412} y={287} filled={5} size={0.9} />
        <text
          x={526}
          y={292}
          textAnchor="end"
          fontFamily={SANS}
          fontSize={14}
          fontWeight={700}
          fill={C.white}
        >
          4,8
        </text>
      </g>
    </>
  );
}

/** Abogados: scales of justice beside a signed document and a pin. */
function LawCover() {
  return (
    <>
      <Panel x={300} y={70} w={210} h={262} r={18} />
      <Bar x={326} y={100} w={120} h={11} fill={C.ink} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Bar key={i} x={326} y={130 + i * 22} w={i % 2 ? 140 : 158} />
      ))}
      <path
        d="M330 286 C344 270 352 300 366 284 S392 270 404 288"
        fill="none"
        stroke={C.ink}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <g className={MOVE.up}>
        <circle cx={466} cy={286} r={24} fill={C.green} />
        <Tick x={466} y={286} size={1.6} />
      </g>
      <g className={MOVE.left}>
        <line
          x1={190}
          x2={190}
          y1={104}
          y2={300}
          stroke={C.white}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <rect x={150} y={296} width={80} height={14} rx={7} fill={C.white} />
        <line
          x1={116}
          x2={264}
          y1={128}
          y2={128}
          stroke={C.white}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <circle cx={190} cy={104} r={10} fill={C.mint} />
        <path
          d="M116 128 L94 206 M116 128 L138 206 M264 128 L242 206 M264 128 L286 206"
          stroke={C.white}
          strokeWidth={2}
        />
        <path d="M88 206 H144 A28 18 0 0 1 88 206 Z" fill={C.mint} />
        <path d="M236 206 H292 A28 18 0 0 1 236 206 Z" fill={C.mint} />
      </g>
    </>
  );
}

/** Dentistas: a tooth with a tick, an appointment card and a rating. */
function DentalCover() {
  return (
    <>
      <g className={MOVE.up}>
        <path
          d="M150 140 C150 104 186 96 210 110 C234 96 270 104 270 140 C270 176 256 196 252 232 C249 262 236 280 226 260 C220 246 218 226 210 226 C202 226 200 246 194 260 C184 280 171 262 168 232 C164 196 150 176 150 140 Z"
          fill={C.white}
          stroke={C.ink}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path
          d="M176 132 C180 120 192 116 200 120"
          fill="none"
          stroke={C.mint}
          strokeWidth={6}
          strokeLinecap="round"
        />
      </g>
      <Panel x={312} y={92} w={210} h={168} r={18} />
      <rect x={312} y={92} width={210} height={40} rx={18} fill={C.ink} />
      <rect x={312} y={114} width={210} height={18} fill={C.ink} />
      <text
        x={334}
        y={118}
        fontFamily={SANS}
        fontSize={13}
        fontWeight={700}
        fill={C.white}
      >
        Primera visita
      </text>
      {[0, 1, 2, 3, 4].map((col) =>
        [0, 1].map((row) => (
          <rect
            key={`${col}-${row}`}
            x={334 + col * 36}
            y={152 + row * 40}
            width={28}
            height={28}
            rx={8}
            fill={col === 2 && row === 0 ? C.green : C.grey}
          />
        )),
      )}
      <Tick x={420} y={166} size={1.2} />
      <g className={MOVE.upRight}>
        <Panel x={360} y={282} w={150} h={50} r={14} fill={C.white} depth={6} />
        <Stars x={380} y={307} filled={5} size={0.85} />
        <text
          x={496}
          y={312}
          textAnchor="end"
          fontFamily={SANS}
          fontSize={13}
          fontWeight={700}
          fill={C.ink}
        >
          4,9
        </text>
      </g>
    </>
  );
}

/** Hoteles: a room card with a bed, a key card and a "Reservar" button. */
function HotelCover() {
  return (
    <>
      <Panel x={120} y={70} w={290} h={250} r={20} />
      <rect x={140} y={90} width={250} height={130} rx={12} fill={C.mintSoft} />
      <rect x={168} y={150} width={194} height={46} rx={10} fill={C.white} />
      <rect x={168} y={128} width={194} height={26} rx={8} fill={C.green} />
      <rect x={182} y={136} width={54} height={14} rx={7} fill={C.white} />
      <rect x={294} y={136} width={54} height={14} rx={7} fill={C.white} />
      <rect x={168} y={196} width={10} height={14} fill={C.ink} />
      <rect x={352} y={196} width={10} height={14} fill={C.ink} />
      <Bar x={140} y={240} w={150} h={11} fill={C.ink} />
      <Bar x={140} y={262} w={110} />
      <rect x={290} y={276} width={100} height={30} rx={15} fill={C.ink} />
      <text
        x={340}
        y={296}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={12}
        fontWeight={700}
        fill={C.white}
      >
        Reservar
      </text>
      <g className={MOVE.upRight}>
        <g transform="rotate(-12 486 180)">
          <Panel
            x={420}
            y={130}
            w={132}
            h={86}
            r={12}
            fill={C.mint}
            depth={7}
          />
          <rect x={420} y={150} width={132} height={14} fill={C.ink} />
          <Bar x={436} y={184} w={60} h={8} fill={C.ink} />
          <circle cx={528} cy={192} r={10} fill={C.white} />
        </g>
      </g>
      <g className={MOVE.up}>
        <Panel x={428} y={252} w={110} h={52} r={14} fill={C.white} depth={6} />
        <text
          x={483}
          y={284}
          textAnchor="middle"
          fontFamily={DISPLAY}
          fontSize={20}
          fontWeight={700}
          fill={C.ink}
        >
          120 USD
        </text>
      </g>
    </>
  );
}

/** Clínicas: a medical cross badge and a reviewed-article card. */
function ClinicCover() {
  return (
    <>
      <Panel x={250} y={78} w={260} h={250} r={20} />
      <circle cx={290} cy={122} r={20} fill={C.mintSoft} />
      <circle cx={290} cy={116} r={7} fill={C.green} />
      <path d="M277 134 A13 10 0 0 1 303 134 Z" fill={C.green} />
      <Bar x={322} y={110} w={110} h={10} fill={C.ink} />
      <Bar x={322} y={128} w={76} />
      {[0, 1, 2, 3].map((i) => (
        <Bar key={i} x={274} y={168 + i * 22} w={i === 3 ? 140 : 210} />
      ))}
      <rect x={274} y={262} width={150} height={34} rx={17} fill={C.mintSoft} />
      <circle cx={292} cy={279} r={10} fill={C.green} />
      <Tick x={292} y={279} size={0.9} />
      <text
        x={310}
        y={284}
        fontFamily={SANS}
        fontSize={12}
        fontWeight={700}
        fill={C.green}
      >
        Revisado
      </text>
      <g className={MOVE.left}>
        <Panel
          x={110}
          y={134}
          w={130}
          h={130}
          r={28}
          fill={C.white}
          depth={8}
        />
        <rect x={158} y={156} width={34} height={86} rx={8} fill={C.green} />
        <rect x={132} y={182} width={86} height={34} rx={8} fill={C.green} />
      </g>
      <g className={MOVE.upRight}>
        <rect x={452} y={56} width={84} height={30} rx={15} fill={C.ink} />
        <text
          x={494}
          y={76}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={12}
          fontWeight={700}
          fill={C.mint}
        >
          YMYL
        </text>
      </g>
    </>
  );
}

/** Inmobiliarias: a house, a listing card with price and a "Vendido" tag. */
function RealEstateCover() {
  return (
    <>
      <g className={MOVE.up}>
        <path
          d="M110 214 L196 136 L282 214"
          fill="none"
          stroke={C.ink}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x={130}
          y={204}
          width={132}
          height={110}
          fill={C.white}
          stroke={C.ink}
          strokeWidth={4}
        />
        <rect x={150} y={226} width={34} height={30} rx={4} fill={C.mint} />
        <rect x={208} y={226} width={34} height={30} rx={4} fill={C.mint} />
        <rect x={180} y={266} width={32} height={48} rx={4} fill={C.green} />
      </g>
      <Panel x={318} y={88} w={210} h={226} r={18} />
      <rect x={334} y={104} width={178} height={96} rx={10} fill={C.mintSoft} />
      <Pin x={423} y={176} />
      <text
        x={334}
        y={232}
        fontFamily={DISPLAY}
        fontSize={24}
        fontWeight={700}
        letterSpacing={-0.5}
        fill={C.ink}
      >
        385.000 USD
      </text>
      <Bar x={334} y={248} w={150} />
      <Bar x={334} y={266} w={110} />
      <g className={MOVE.upRight}>
        <g transform="rotate(8 470 300)">
          <rect x={420} y={282} width={104} height={34} rx={8} fill={C.ink} />
          <text
            x={472}
            y={304}
            textAnchor="middle"
            fontFamily={SANS}
            fontSize={13}
            fontWeight={700}
            fill={C.mint}
          >
            Vendido
          </text>
        </g>
      </g>
    </>
  );
}

/** Ecommerce: a category grid, a product card with price and a bag. */
function EcommerceCover() {
  return (
    <>
      <Panel x={110} y={70} w={260} h={260} r={20} />
      {[0, 1].map((row) =>
        [0, 1, 2].map((col) => (
          <g key={`${row}-${col}`}>
            <rect
              x={130 + col * 78}
              y={92 + row * 116}
              width={66}
              height={66}
              rx={10}
              fill={row === 0 && col === 1 ? C.mint : C.grey}
            />
            <Bar x={130 + col * 78} y={166 + row * 116} w={50} h={7} />
            <Bar
              x={130 + col * 78}
              y={180 + row * 116}
              w={30}
              h={7}
              fill={C.green}
            />
          </g>
        )),
      )}
      <g className={MOVE.up}>
        <Panel x={330} y={120} w={160} h={196} r={18} fill={C.white} />
        <rect x={346} y={136} width={128} height={96} rx={10} fill={C.mint} />
        <path d="M376 206 C392 178 428 170 452 186 L452 206 Z" fill={C.ink} />
        <Bar x={346} y={248} w={100} h={9} fill={C.ink} />
        <Stars x={354} y={274} filled={4} size={0.7} />
        <text
          x={474}
          y={302}
          textAnchor="end"
          fontFamily={DISPLAY}
          fontSize={20}
          fontWeight={700}
          fill={C.ink}
        >
          119,90 USD
        </text>
      </g>
      <g className={MOVE.upRight}>
        <path
          d="M500 118 C500 96 540 96 540 118"
          fill="none"
          stroke={C.ink}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <rect
          x={486}
          y={114}
          width={68}
          height={70}
          rx={10}
          fill={C.green}
          stroke={C.ink}
          strokeWidth={3}
        />
        <Tick x={520} y={150} size={1.6} />
      </g>
    </>
  );
}

/** Bespoke covers for the guías de SEO por sector. */
export const COVERS_SECTORES: Record<
  string,
  { Art: ComponentType; field: Field }
> = {
  "seo-para-restaurantes": { Art: RestaurantCover, field: "mint" },
  "seo-para-abogados": { Art: LawCover, field: "ink" },
  "seo-para-dentistas": { Art: DentalCover, field: "soft" },
  "seo-para-hoteles": { Art: HotelCover, field: "white" },
  "seo-para-clinicas": { Art: ClinicCover, field: "mintSoft" },
  "seo-para-inmobiliarias": { Art: RealEstateCover, field: "green" },
  "seo-para-ecommerce": { Art: EcommerceCover, field: "soft" },
};
