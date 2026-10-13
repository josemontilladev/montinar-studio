/**
 * Transiciones de entrada nuevas de la biblioteca (la escena nueva se dibuja encima de la anterior). Las 11 originales
 * (corte, fundido, desenfoque, circulo, cortina, empuje, barrido, deslizar, zoom, match, scroll) las dibuja cada vídeo
 * con su propio componente, para que lo ya hecho se vea idéntico.
 */
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';

export const TRANS_ORIGINALES = ['corte', 'fundido', 'desenfoque', 'circulo', 'cortina', 'empuje', 'barrido', 'deslizar', 'zoom', 'match', 'scroll'];
export const esTransicionKit = (tipo: string) => !TRANS_ORIGINALES.includes(tipo);

export const EntradaKit: React.FC<{ tipo: string; dur: number; w: number; h: number; ox?: number; oy?: number; acento?: string; children: React.ReactNode }> = ({ tipo, dur, w: W, h: H, ox = W / 2, oy = H / 2, acento = '#c8ff3b', children }) => {
  const f = useCurrentFrame();
  const curva: [number, number, number, number] = tipo.startsWith('barrido') ? [0.7, 0, 0.2, 1] : tipo === 'rebote' ? [0.3, 1.5, 0.5, 1] : [0.65, 0, 0.35, 1];
  const p = dur > 0 ? interpolate(f, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(...curva) }) : 1;
  const lin = dur > 0 ? Math.max(0, Math.min(1, f / dur)) : 1;
  if (dur <= 0 || lin >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const A = (st: React.CSSProperties, extra?: React.ReactNode) => (
    <>
      <AbsoluteFill style={st}>{children}</AbsoluteFill>
      {extra}
    </>
  );
  switch (tipo) {
    case 'negro':
    case 'blanco':
    case 'flash': {
      const c = tipo === 'negro' ? '#000' : '#fff';
      if (tipo === 'flash') return A({}, <AbsoluteFill style={{ background: c, opacity: 1 - lin, pointerEvents: 'none' }} />);
      return A({ opacity: lin < 0.5 ? 0 : 1 }, <AbsoluteFill style={{ background: c, opacity: lin < 0.5 ? lin * 2 : (1 - lin) * 2 }} />);
    }
    case 'desenfoque-zoom':
      return A({ opacity: Math.min(1, p * 2), transform: `scale(${0.85 + 0.15 * p})`, filter: `blur(${(1 - p) * 24}px)` });
    case 'zoom-salida':
      return A({ opacity: Math.min(1, p * 1.6), transform: `scale(${0.7 + 0.3 * p})` });
    case 'giro':
      return A({ opacity: Math.min(1, p * 2), transform: `rotate(${(1 - p) * -90}deg) scale(${0.6 + 0.4 * p})` });
    case 'rebote':
      return A({ transform: `scale(${p})`, opacity: Math.min(1, lin * 4) });
    case 'empuje-arriba':
      return A({ transform: `translateY(${(1 - p) * H}px)` });
    case 'empuje-abajo':
      return A({ transform: `translateY(${-(1 - p) * H}px)` });
    case 'deslizar-izq':
      return A({ transform: `translateX(${(1 - p) * W * 0.4}px)`, opacity: Math.min(1, p * 2.2) });
    case 'deslizar-der':
      return A({ transform: `translateX(${-(1 - p) * W * 0.4}px)`, opacity: Math.min(1, p * 2.2) });
    case 'barrido-vertical':
      return A({ transform: `translateY(${(1 - p) * H}px)`, filter: lin < 0.85 ? `blur(${(1 - p) * 10}px)` : undefined });
    case 'iris-cuadrado': {
      const s = Math.max(ox, W - ox, oy, H - oy) * p;
      return A({ clipPath: `inset(${Math.max(0, oy - s)}px ${Math.max(0, W - ox - s)}px ${Math.max(0, H - oy - s)}px ${Math.max(0, ox - s)}px)` });
    }
    case 'rombo': {
      const r = (W + H) * p;
      return A({ clipPath: `polygon(${ox}px ${oy - r}px, ${ox + r}px ${oy}px, ${ox}px ${oy + r}px, ${ox - r}px ${oy}px)` });
    }
    case 'cortina-baja': {
      const b = (1 - p) * H;
      return A({ clipPath: `inset(0 0 ${b}px 0)` }, <div style={{ position: 'absolute', left: 0, width: W, top: H - b, height: 26, background: acento }} />);
    }
    case 'cortina-lateral': {
      const x = (1 - p) * W;
      return A({ clipPath: `inset(0 0 0 ${x}px)` }, <div style={{ position: 'absolute', top: 0, height: H, left: x - 26, width: 26, background: acento }} />);
    }
    case 'diagonal': {
      const d = (W + H) * p;
      return A({ clipPath: `polygon(0 0, ${d}px 0, 0 ${d}px)` });
    }
    case 'persiana': {
      const banda = 120;
      const m = `repeating-linear-gradient(180deg, #000 0 ${p * banda}px, transparent ${p * banda}px ${banda}px)`;
      return A({ WebkitMaskImage: m, maskImage: m } as React.CSSProperties);
    }
    case 'cubo':
      return (
        <AbsoluteFill style={{ perspective: 2400 }}>
          <AbsoluteFill style={{ transformOrigin: '0% 50%', transform: `translateX(${(1 - p) * W}px) rotateY(${(1 - p) * 80}deg)` }}>{children}</AbsoluteFill>
        </AbsoluteFill>
      );
    case 'voltear':
      return (
        <AbsoluteFill style={{ perspective: 2400 }}>
          <AbsoluteFill style={{ transform: `rotateY(${(1 - p) * 90}deg)`, opacity: lin < 0.02 ? 0 : 1 }}>{children}</AbsoluteFill>
        </AbsoluteFill>
      );
    case 'doblar':
      return (
        <AbsoluteFill style={{ perspective: 2000 }}>
          <AbsoluteFill style={{ transformOrigin: '50% 0%', transform: `rotateX(${(1 - p) * -85}deg)`, opacity: Math.min(1, lin * 3) }}>{children}</AbsoluteFill>
        </AbsoluteFill>
      );
    default:
      return A({ opacity: p });
  }
};
