/** Lo que se dibuja encima del lienzo al editar: zonas de clic, selección, tiradores, marco de selección y guías. */
import type { Elemento, Tam } from '../esquema';
import { bounds, unionBox, type Box } from './operaciones';
import { handlesFor, type Guides } from './geometria';

export const SEL = '#12a150';
const GUIDE = '#e0457b';
const tr = (el: Elemento) => `translate(${el.x} ${el.y}) rotate(${el.rotation} ${el.w / 2} ${el.h / 2})`;

/** Zonas de clic invisibles, una por elemento, en orden de apilado. */
export function HitTargets({ elements, selected, u }: { elements: Elemento[]; selected: string[]; u: number }) {
  return (
    <>
      {elements.map((el) => {
        const linea = el.type === 'shape' && el.shape === 'line';
        const h = linea ? Math.max(el.h, 16 * u) : el.h;
        return (
          <g key={el.id} data-hit={el.id} transform={tr(el)} className="group/hit" style={{ cursor: el.locked ? 'default' : 'move' }}>
            <rect x={0} y={linea ? el.h / 2 - h / 2 : 0} width={el.w} height={h} fill="transparent" stroke={selected.includes(el.id) ? 'none' : SEL} strokeOpacity={0} strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="group-hover/hit:[stroke-opacity:0.9]" />
          </g>
        );
      })}
    </>
  );
}

export function SelectionChrome({ sel, u, tam, editingId, marquee, guides }: { sel: Elemento[]; u: number; tam: Tam; editingId: string | null; marquee: Box | null; guides: Guides }) {
  const single = sel.length === 1 ? sel[0] : null;
  const multiBox = sel.length > 1 ? unionBox(sel.map((el) => bounds(el))) : null;
  const hs = 10 * u;
  return (
    <>
      {sel.map((el) => (
        <g key={el.id} transform={tr(el)} pointerEvents="none">
          <rect width={el.w} height={el.h} fill="none" stroke={SEL} strokeWidth={1.5} strokeDasharray={el.locked ? '4 4' : undefined} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      {single && !single.locked && editingId !== single.id ? (
        <g transform={tr(single)}>
          <line x1={single.w / 2} x2={single.w / 2} y1={0} y2={-26 * u} stroke={SEL} strokeWidth={1.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          <circle data-handle="rotate" cx={single.w / 2} cy={-30 * u} r={7 * u} fill="#fff" stroke={SEL} strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ cursor: 'grab' }} />
          {handlesFor(single).map((h) => (
            <rect
              key={`${h.hx},${h.hy}`}
              data-handle={`${h.hx},${h.hy}`}
              x={((h.hx + 1) / 2) * single.w - hs / 2}
              y={((h.hy + 1) / 2) * single.h - hs / 2}
              width={hs}
              height={hs}
              rx={2 * u}
              fill="#fff"
              stroke={SEL}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: h.cursor }}
            />
          ))}
        </g>
      ) : null}
      {multiBox ? <rect {...multiBox} fill="none" stroke={SEL} strokeDasharray="6 4" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null}
      {marquee ? <rect {...marquee} fill="rgba(18,161,80,0.1)" stroke={SEL} strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null}
      <g pointerEvents="none" stroke={GUIDE} strokeWidth={1}>
        {guides.xs.map((x) => (
          <line key={`x${x}`} x1={x} x2={x} y1={0} y2={tam.h} vectorEffect="non-scaling-stroke" />
        ))}
        {guides.ys.map((y) => (
          <line key={`y${y}`} x1={0} x2={tam.w} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </>
  );
}

/** Tamaño y ángulo mientras se arrastra (junto al elemento). */
export function Medidas({ el, u }: { el: Elemento; u: number }) {
  const b = bounds(el);
  const txt = el.rotation ? `${Math.round(el.rotation)}°` : `${Math.round(el.w)} × ${Math.round(el.h)}`;
  const w = (txt.length * 7 + 16) * u;
  return (
    <g pointerEvents="none" transform={`translate(${b.x + b.w / 2 - w / 2} ${b.y + b.h + 12 * u})`}>
      <rect width={w} height={22 * u} rx={11 * u} fill="#212121" />
      <text x={w / 2} y={15 * u} fontSize={11.5 * u} fontFamily="Inter, sans-serif" fontWeight={600} fill="#ffffff" textAnchor="middle">
        {txt}
      </text>
    </g>
  );
}
