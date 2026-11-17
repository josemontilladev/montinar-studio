/** Dibujo SVG puro de una página (sin HTML dentro): se muestra, sirve de miniatura y se rasteriza al exportar. */
import { createContext, memo, useContext, useId, type Ref } from 'react';
import type { ElArte, ElForma, Elemento, ElImagen, ElTexto, Pagina, Tam } from '../esquema';
import { DISPLAY, MONO, SANS } from '../espejo/parts';
import { getArt, isDarkColor } from './biblioteca';

export const FONT_STACKS = { display: DISPLAY, body: SANS, mono: MONO } as const;

/** Convierte «recursos/x.png» en una URL que el navegador pueda cargar. */
export const RecursoCtx = createContext<(src: string) => string>((s) => s);

const puntoPorDefecto = (bg: string) => (isDarkColor(bg) ? 'rgba(255,255,255,0.12)' : 'rgba(33,33,33,0.11)');
const baseline = (i: number, fs: number, lh: number) => i * fs * lh + (fs * lh) / 2 + fs * 0.36;

function Texto({ el }: { el: ElTexto }) {
  const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start';
  const x = el.align === 'center' ? el.w / 2 : el.align === 'right' ? el.w : 0;
  return (
    <text fontFamily={FONT_STACKS[el.fontFamily]} fontSize={el.fontSize} fontWeight={el.fontWeight} letterSpacing={el.letterSpacing * el.fontSize} fill={el.color} textAnchor={anchor} xmlSpace="preserve">
      {el.text.split('\n').map((line, i) => (
        <tspan key={i} x={x} y={baseline(i, el.fontSize, el.lineHeight)}>
          {line.length > 0 ? line : ' '}
        </tspan>
      ))}
    </text>
  );
}

function Forma({ el }: { el: ElForma }) {
  if (el.shape === 'line') return <line x1={0} y1={el.h / 2} x2={el.w} y2={el.h / 2} stroke={el.stroke ?? el.fill} strokeWidth={el.strokeWidth > 0 ? el.strokeWidth : el.h} strokeLinecap="round" />;
  const stroke = el.strokeWidth > 0 ? el.stroke : undefined;
  const sw = stroke ? el.strokeWidth : 0;
  if (el.shape === 'ellipse') return <ellipse cx={el.w / 2} cy={el.h / 2} rx={Math.max(0, el.w / 2 - sw / 2)} ry={Math.max(0, el.h / 2 - sw / 2)} fill={el.fill} stroke={stroke} strokeWidth={sw || undefined} />;
  const r = Math.min(el.radius, el.w / 2, el.h / 2);
  return <rect x={sw / 2} y={sw / 2} width={Math.max(0, el.w - sw)} height={Math.max(0, el.h - sw)} rx={Math.max(0, r - sw / 2)} fill={el.fill} stroke={stroke} strokeWidth={sw || undefined} />;
}

function Arte({ el }: { el: ElArte }) {
  const found = getArt(el.art);
  if (!found) return <rect width={el.w} height={el.h} fill="rgba(33,33,33,0.06)" stroke="rgba(33,33,33,0.3)" strokeDasharray="8 8" />;
  const Render = found.item.Render;
  return (
    <svg x={0} y={0} width={el.w} height={el.h} viewBox={found.item.viewBox.join(' ')} preserveAspectRatio="none" overflow="visible">
      <Render tint={el.tint} param={found.param} />
    </svg>
  );
}

function Imagen({ el }: { el: ElImagen }) {
  const url = useContext(RecursoCtx)(el.src);
  const clip = `img-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const r = Math.min(el.radius, el.w / 2, el.h / 2);
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <rect width={el.w} height={el.h} rx={r} />
        </clipPath>
      </defs>
      <image href={url} width={el.w} height={el.h} preserveAspectRatio={el.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'} clipPath={`url(#${clip})`} />
    </>
  );
}

const ElementoSvg = memo(function ElementoSvg({ el }: { el: Elemento }) {
  return (
    <g transform={`translate(${el.x} ${el.y}) rotate(${el.rotation} ${el.w / 2} ${el.h / 2})`} opacity={el.opacity < 1 ? el.opacity : undefined}>
      {el.type === 'text' ? <Texto el={el} /> : el.type === 'shape' ? <Forma el={el} /> : el.type === 'image' ? <Imagen el={el} /> : <Arte el={el} />}
    </g>
  );
});

export function Lienzo({ pagina, tam, width, className, svgRef, hiddenIds }: { pagina: Pagina; tam: Tam; width?: number; className?: string; svgRef?: Ref<SVGSVGElement>; hiddenIds?: ReadonlySet<string> }) {
  const patron = `puntos-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const paso = Math.round(Math.min(tam.w, tam.h) / 40);
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${tam.w} ${tam.h}`} width={width} height={width === undefined ? undefined : (width * tam.h) / tam.w} aria-hidden="true" focusable="false" className={className}>
      {pagina.dots ? (
        <defs>
          <pattern id={patron} width={paso} height={paso} patternUnits="userSpaceOnUse">
            <circle cx={2} cy={2} r={paso * 0.065} fill={pagina.dotColor ?? puntoPorDefecto(pagina.background)} />
          </pattern>
        </defs>
      ) : null}
      <rect x={0} y={0} width={tam.w} height={tam.h} fill={pagina.background} />
      {pagina.dots ? <rect x={0} y={0} width={tam.w} height={tam.h} fill={`url(#${patron})`} /> : null}
      {pagina.elements.map((el) => (hiddenIds?.has(el.id) ? null : <ElementoSvg key={el.id} el={el} />))}
    </svg>
  );
}
