/** Pegatinas y elementos gráficos: SVG originales, recoloreables (color/color2 admiten claves de la paleta). */
import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { TAjustes, TElemento } from '../esquema';
import { desplazamiento } from './seguir';

const col = (a: TAjustes, c: string) => (c === 'transparent' ? c : a.paleta[c] ?? c);

/** Dibujo de cada elemento en una caja w×h. `p` = progreso de la entrada (0..1) para los que se dibujan solos. */
export function dibujoElemento(tipo: string, w: number, h: number, c1: string, c2: string, texto: string, fuente: string, p = 1, t = 0): React.ReactNode {
  const S = (ch: React.ReactNode, vb = `0 0 ${w} ${h}`) => (
    <svg width={w} height={h} viewBox={vb} style={{ overflow: 'visible', display: 'block' }}>
      {ch}
    </svg>
  );
  const m = Math.min(w, h);
  const [t1, t2] = (texto || '').split('|');
  const txt = (s: string, x: number, y: number, size: number, fill: string, peso = 800, anchor: 'middle' | 'start' = 'middle') => (
    <text x={x} y={y} fontSize={size} fill={fill} fontFamily={fuente} fontWeight={peso} textAnchor={anchor} dominantBaseline="central">
      {s}
    </text>
  );
  const dash = (len: number) => ({ strokeDasharray: len, strokeDashoffset: len * (1 - p) });
  const estrella = (cx: number, cy: number, R: number, r: number, n = 5) =>
    Array.from({ length: n * 2 }, (_, i) => {
      const a = (Math.PI * i) / n - Math.PI / 2;
      const rr = i % 2 ? r : R;
      return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
    }).join(' ');
  const pastilla = (icono: React.ReactNode) =>
    S(
      <>
        <rect x={0} y={0} width={w} height={h} rx={h / 2} fill={c1} />
        <circle cx={h / 2} cy={h / 2} r={h / 2 - 12} fill={c2} />
        <g transform={`translate(${h / 2 - 22}, ${h / 2 - 22})`}>{icono}</g>
        {txt(texto, h + (w - h) / 2 - 10, h / 2, h * 0.36, c2, 700)}
      </>,
    );
  const ico = (d: React.ReactNode) => (
    <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={c1} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
  switch (tipo) {
    case 'circulo':
      return S(<ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={c1} />);
    case 'cuadrado':
      return S(<rect width={w} height={h} fill={c1} />);
    case 'redondeado':
      return S(<rect width={w} height={h} rx={m * 0.18} fill={c1} />);
    case 'triangulo':
      return S(<polygon points={`${w / 2},0 ${w},${h} 0,${h}`} fill={c1} />);
    case 'estrella':
      return S(<polygon points={estrella(w / 2, h / 2, m / 2, m / 4.6)} fill={c1} />);
    case 'corazon':
      return S(<path d="M50 88 C20 66 4 50 4 30 C4 14 16 4 29 4 C39 4 46 10 50 18 C54 10 61 4 71 4 C84 4 96 14 96 30 C96 50 80 66 50 88Z" fill={c1} />, '0 0 100 92');
    case 'hexagono':
      return S(<polygon points="50,2 93,26 93,74 50,98 7,74 7,26" fill={c1} />, '0 0 100 100');
    case 'rombo':
      return S(<polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} fill={c1} />);
    case 'gota':
      return S(<path d="M50 2 C70 34 90 52 90 74 C90 96 72 108 50 108 C28 108 10 96 10 74 C10 52 30 34 50 2Z" fill={c1} />, '0 0 100 110');
    case 'mancha':
      return S(<path d="M62 6 C86 4 108 22 112 46 C116 70 100 96 74 104 C50 112 18 104 8 80 C-2 56 10 30 30 16 C40 9 50 7 62 6Z" fill={c1} />, '0 0 120 110');
    case 'anillo':
      return S(<circle cx={w / 2} cy={h / 2} r={m / 2 - m * 0.06} fill="none" stroke={c1} strokeWidth={m * 0.12} {...dash(Math.PI * m)} />);
    case 'chispa':
      return S(<path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0Z" fill={c1} transform={`rotate(${t * 40} 50 50)`} />, '0 0 100 100');
    case 'nube':
      return S(<path d="M30 92 C12 92 2 80 2 66 C2 52 13 42 27 42 C29 24 44 10 62 10 C78 10 91 20 96 34 C100 32 104 31 108 31 C126 31 140 45 140 62 C140 79 126 92 108 92Z" fill={c1} />, '0 0 142 96');
    case 'flecha':
      return S(<path d="M0 45 H70 V20 L100 50 L70 80 V55 H0Z" fill={c1} />, '0 0 100 100');
    case 'flecha-curva':
      return S(
        <>
          <path d="M10 90 C20 30 60 15 82 30" fill="none" stroke={c1} strokeWidth={9} strokeLinecap="round" {...dash(120)} />
          {p > 0.9 && <path d="M68 16 L88 32 L66 44" fill="none" stroke={c1} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />}
        </>,
        '0 0 100 100',
      );
    case 'flecha-doble':
      return S(<path d="M0 50 L25 20 V40 H75 V20 L100 50 L75 80 V60 H25 V80Z" fill={c1} />, '0 0 100 100');
    case 'flecha-mano':
      return S(
        <>
          <path d="M6 70 C24 40 40 78 58 52 C68 38 76 34 90 30" fill="none" stroke={c1} strokeWidth={6} strokeLinecap="round" {...dash(130)} />
          {p > 0.9 && <path d="M78 20 L92 30 L80 44" fill="none" stroke={c1} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />}
        </>,
        '0 0 100 100',
      );
    case 'flecha-circular':
      return S(
        <>
          <path d="M80 50 A30 30 0 1 1 64 23" fill="none" stroke={c1} strokeWidth={9} strokeLinecap="round" {...dash(170)} />
          <path d="M56 12 L68 24 L54 34" fill="none" stroke={c1} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        </>,
        '0 0 100 100',
      );
    case 'chevron':
      return S(
        <>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${10 + i * 30} 15 L${35 + i * 30} 50 L${10 + i * 30} 85`} fill="none" stroke={c1} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.35 + 0.65 * ((Math.sin(t * 6 - i) + 1) / 2)} />
          ))}
        </>,
        '0 0 100 100',
      );
    case 'dedo':
      return S(
        <g transform={`translate(0 ${Math.sin(t * 6) * 4})`}>
          <path d="M40 92 V40 a8 8 0 0 1 16 0 V60 h4 V52 a7 7 0 0 1 14 0 V62 h3 V56 a7 7 0 0 1 14 0 V76 C91 88 82 96 70 96 H50 C44 96 40 94 40 92Z" fill={c1} stroke={c2} strokeWidth={3} strokeLinejoin="round" />
          <path d="M48 10 V22 M30 18 L36 28 M66 18 L60 28" stroke={c1} strokeWidth={4} strokeLinecap="round" />
        </g>,
        '0 0 100 100',
      );
    case 'linea':
      return S(<line x1={0} y1={h / 2} x2={w * p} y2={h / 2} stroke={c1} strokeWidth={h * 0.5} strokeLinecap="round" />);
    case 'linea-discontinua':
      return S(<line x1={0} y1={h / 2} x2={w * p} y2={h / 2} stroke={c1} strokeWidth={h * 0.4} strokeDasharray={`${h * 1.4} ${h}`} strokeLinecap="round" />);
    case 'subrayado':
      return S(<path d="M4 40 C60 18 120 22 196 28" fill="none" stroke={c1} strokeWidth={14} strokeLinecap="round" {...dash(200)} />, '0 0 200 60');
    case 'onda':
      return S(<path d="M4 30 Q29 4 54 30 T104 30 T154 30 T204 30" fill="none" stroke={c1} strokeWidth={8} strokeLinecap="round" {...dash(260)} />, '0 0 208 60');
    case 'marcador':
      return S(<path d="M110 14 C60 8 12 30 10 60 C8 92 70 106 130 102 C186 98 214 74 206 48 C198 22 150 8 92 18" fill="none" stroke={c1} strokeWidth={6} strokeLinecap="round" {...dash(560)} />, '0 0 220 115');
    case 'insignia-nuevo':
      return S(
        <>
          <polygon points={estrella(50, 50, 50, 42, 14)} fill={c1} transform={`rotate(${t * 20} 50 50)`} />
          {txt(texto || 'NUEVO', 50, 51, 17, c2, 900)}
        </>,
        '0 0 100 100',
      );
    case 'insignia-oferta':
      return S(
        <>
          <path d={`M0 0 H${w - h / 2} L${w} ${h / 2} L${w - h / 2} ${h} H0Z`} fill={c1} />
          <circle cx={w - h / 2 - 6} cy={h / 2} r={h * 0.09} fill={c2} />
          {txt(texto || 'OFERTA', (w - h / 2) / 2, h / 2, h * 0.42, c2, 900)}
        </>,
      );
    case 'insignia-descuento':
      return S(
        <>
          <circle cx={50} cy={50} r={48} fill={c1} />
          <circle cx={50} cy={50} r={41} fill="none" stroke={c2} strokeWidth={2} strokeDasharray="4 4" />
          {txt(texto || '-50%', 50, 51, 26, c2, 900)}
        </>,
        '0 0 100 100',
      );
    case 'estrellas':
      return S(
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <polygon key={i} points={estrella(40 + i * 70, 40, 34, 15)} fill={p * 5 > i ? c1 : 'none'} stroke={c1} strokeWidth={3} />
          ))}
        </>,
        '0 0 360 80',
      );
    case 'verificado':
      return S(
        <>
          <polygon points={estrella(50, 50, 48, 42, 12)} fill={c1} />
          <path d="M32 51 L45 63 L69 38" fill="none" stroke={c2} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" {...dash(60)} />
        </>,
        '0 0 100 100',
      );
    case 'check':
      return S(
        <>
          <circle cx={50} cy={50} r={47} fill={c1} />
          <path d="M28 52 L44 67 L73 36" fill="none" stroke={c2} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" {...dash(70)} />
        </>,
        '0 0 100 100',
      );
    case 'sello':
      return S(
        <>
          <defs>
            <path id="sello-c" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
          </defs>
          <circle cx={50} cy={50} r={48} fill={c1} />
          <g transform={`rotate(${t * 30} 50 50)`}>
            <text fontSize={10.5} fontWeight={800} fill={c2} fontFamily={fuente} letterSpacing={1}>
              <textPath href="#sello-c">{(texto || 'GARANTÍA · CALIDAD · ').repeat(2)}</textPath>
            </text>
          </g>
          <polygon points={estrella(50, 50, 14, 6)} fill={c2} />
        </>,
        '0 0 100 100',
      );
    case 'bocadillo':
    case 'bocadillo-der': {
      const der = tipo === 'bocadillo-der';
      const cuerpo = h * 0.78;
      return S(
        <>
          <rect x={0} y={0} width={w} height={cuerpo} rx={cuerpo * 0.3} fill={c1} />
          <path d={der ? `M${w * 0.72} ${cuerpo - 2} L${w * 0.86} ${h} L${w * 0.86 - 70} ${cuerpo - 2}Z` : `M${w * 0.18} ${cuerpo - 2} L${w * 0.12} ${h} L${w * 0.18 + 70} ${cuerpo - 2}Z`} fill={c1} />
          {txt(texto, w / 2, cuerpo / 2, cuerpo * 0.36, c2, 800)}
        </>,
      );
    }
    case 'pensamiento':
      return S(
        <>
          <ellipse cx={w / 2} cy={h * 0.38} rx={w / 2} ry={h * 0.38} fill={c1} />
          <circle cx={w * 0.22} cy={h * 0.84} r={h * 0.07} fill={c1} />
          <circle cx={w * 0.14} cy={h * 0.96} r={h * 0.04} fill={c1} />
          {txt(texto, w / 2, h * 0.38, h * 0.22, c2, 800)}
        </>,
      );
    case 'pastilla':
      return S(
        <>
          <rect width={w} height={h} rx={h / 2} fill={c1} />
          {txt(texto, w / 2, h / 2, h * 0.4, c2, 800)}
        </>,
      );
    case 'progreso':
      return S(
        <>
          <rect width={w} height={h} rx={h / 2} fill={c2} opacity={0.35} />
          <rect width={Math.max(h, w * p)} height={h} rx={h / 2} fill={c1} />
        </>,
      );
    case 'progreso-circular': {
      const v = parseFloat(texto) / 100 || 0.75;
      return S(
        <>
          <circle cx={50} cy={50} r={42} fill="none" stroke={c2} strokeWidth={10} opacity={0.3} />
          <circle cx={50} cy={50} r={42} fill="none" stroke={c1} strokeWidth={10} strokeLinecap="round" strokeDasharray={264} strokeDashoffset={264 * (1 - v * p)} transform="rotate(-90 50 50)" />
          {txt(`${Math.round(v * 100 * p)}%`, 50, 51, 22, c1, 800)}
        </>,
        '0 0 100 100',
      );
    }
    case 'pasos':
      return S(
        <>
          <line x1={40} y1={40} x2={560} y2={40} stroke={c2} strokeWidth={6} opacity={0.4} />
          <line x1={40} y1={40} x2={40 + 520 * p} y2={40} stroke={c1} strokeWidth={6} />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <circle cx={40 + i * 173} cy={40} r={30} fill={p * 3 + 0.01 >= i ? c1 : c2} />
              {txt(String(i + 1), 40 + i * 173, 41, 28, p * 3 + 0.01 >= i ? c2 : c1, 800)}
            </g>
          ))}
        </>,
        '0 0 600 80',
      );
    case 'rotulo':
      return S(
        <>
          <rect x={0} y={0} width={w * p} height={h * 0.6} fill={c1} />
          <rect x={0} y={h * 0.6} width={w * 0.7 * Math.max(0, p * 1.4 - 0.4)} height={h * 0.4} fill={c2} />
          {p > 0.5 && txt(t1 ?? '', 30, h * 0.3, h * 0.3, c2, 800, 'start')}
          {p > 0.8 && txt(t2 ?? '', 30, h * 0.8, h * 0.2, c1, 600, 'start')}
        </>,
      );
    case 'rotulo-linea':
      return S(
        <>
          <rect x={0} y={0} width={10} height={h * p} fill={c1} />
          {txt(t1 ?? '', 34, h * 0.32, h * 0.32, '#ffffff', 800, 'start')}
          {txt(t2 ?? '', 34, h * 0.74, h * 0.2, c1, 600, 'start')}
        </>,
      );
    case 'rotulo-caja':
      return S(
        <>
          <rect x={0} y={0} width={w} height={h} rx={18} fill={c2} opacity={0.88} />
          <rect x={0} y={0} width={w * p} height={8} rx={4} fill={c1} />
          {txt(t1 ?? '', 32, h * 0.4, h * 0.27, '#ffffff', 800, 'start')}
          {txt(t2 ?? '', 32, h * 0.74, h * 0.18, c1, 600, 'start')}
        </>,
      );
    case 'red-usuario':
      return pastilla(ico(<><circle cx="12" cy="8" r="4" /><path d="M4 21 c0-4 4-7 8-7 s8 3 8 7" /></>));
    case 'red-web':
      return pastilla(ico(<><circle cx="12" cy="12" r="9" /><path d="M3 12 h18 M12 3 c3 3 3 15 0 18 M12 3 c-3 3 -3 15 0 18" /></>));
    case 'red-mensaje':
      return pastilla(ico(<path d="M4 5 h16 v11 h-9 l-5 4 v-4 h-2z" />));
    case 'red-telefono':
      return pastilla(ico(<path d="M5 3 h4 l2 5 -3 2 c1 3 3 5 6 6 l2 -3 5 2 v4 c0 1 -1 2 -2 2 C10 21 3 14 3 5 c0 -1 1 -2 2 -2z" />));
    case 'red-ubicacion':
      return pastilla(ico(<><path d="M12 21 s-7 -6 -7 -12 a7 7 0 0 1 14 0 c0 6 -7 12 -7 12z" /><circle cx="12" cy="9" r="2.5" /></>));
    case 'red-me-gusta':
      return S(
        <>
          <circle cx={50} cy={50} r={48} fill={c1} />
          <path d="M50 76 C30 62 22 52 22 40 C22 30 30 24 38 24 C44 24 48 28 50 32 C52 28 56 24 62 24 C70 24 78 30 78 40 C78 52 70 62 50 76Z" fill={c2} transform={`translate(50 50) scale(${1 + 0.08 * Math.max(0, Math.sin(t * 7))}) translate(-50 -50)`} />
        </>,
        '0 0 100 100',
      );
    case 'red-seguir':
      return S(
        <>
          <rect width={w} height={h} rx={h / 2} fill={c1} />
          {txt(`+ ${texto || 'Seguir'}`, w / 2, h / 2, h * 0.4, c2, 800)}
        </>,
      );
    case 'red-campana':
      return S(
        <>
          <circle cx={50} cy={50} r={48} fill={c1} />
          <g transform={`rotate(${Math.sin(t * 10) * 14} 50 26)`}>
            <path d="M30 66 C34 60 34 52 34 44 C34 34 41 27 50 27 C59 27 66 34 66 44 C66 52 66 60 70 66Z" fill={c2} />
            <circle cx={50} cy={72} r={6} fill={c2} />
          </g>
        </>,
        '0 0 100 100',
      );
    default:
      return S(<rect width={w} height={h} fill={c1} opacity={0.5} />);
  }
}

/** Un elemento colocado en la escena. `at`/`out` en fotogramas reales locales a la escena. */
export const ElementoEsc: React.FC<{ el: TElemento; ajustes: TAjustes; at: number; out: number | null; fuente: string }> = ({ el, ajustes, at, out, fuente }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at || (out != null && f >= out)) return null;
  const dur = Math.round(fps * 0.45);
  const p = el.entrada === 'ninguna' ? 1 : interpolate(f - at, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.9, 0.2, 1) });
  const salida = out != null ? interpolate(f, [out - Math.round(fps * 0.25), out], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  let tr = '';
  let op = el.opacidad * salida;
  if (el.entrada === 'pop') tr = `scale(${interpolate(p, [0, 0.7, 1], [0.3, 1.08, 1])})`;
  if (el.entrada === 'fundido') op *= p;
  if (el.entrada === 'subir') tr = `translateY(${(1 - p) * 80}px)`;
  if (el.entrada === 'girar') tr = `rotate(${(1 - p) * -180}deg) scale(${p})`;
  if (el.entrada === 'pop' || el.entrada === 'subir') op *= Math.min(1, p * 3);
  const dibujar = el.entrada === 'dibujar' || el.entrada === 'pop' ? p : 1;
  const t = (f - at) / fps;
  return (
    <div style={{ position: 'absolute', left: el.x + desplazamiento(el.seguir, f).x, top: el.y + desplazamiento(el.seguir, f).y, width: el.w, height: el.h, transform: `rotate(${el.rot}deg) ${tr}`, opacity: op, transformOrigin: 'center' }}>
      {dibujoElemento(el.tipo, el.w, el.h, col(ajustes, el.color), col(ajustes, el.color2), el.texto, fuente, el.entrada === 'dibujar' ? dibujar : 1, t)}
    </div>
  );
};
