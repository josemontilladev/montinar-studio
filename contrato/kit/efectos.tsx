/** Filtros de color y efectos de la biblioteca (capas encima de la escena o envolturas que la mueven). */
import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import type { TAjustes } from '../esquema';
import { EFECTOS, FILTROS } from './biblioteca';

const col = (a: TAjustes, c: string) => a.paleta[c] ?? c;

/** Envuelve el contenido con el filtro de color elegido (y su tinte). */
export const ConFiltro: React.FC<{ filtro: { id: string; intensidad: number } | null | undefined; ajustes: TAjustes; children: React.ReactNode }> = ({ filtro, ajustes, children }) => {
  const def = filtro ? FILTROS.find((x) => x.id === filtro.id) : null;
  if (!def || !filtro) return <>{children}</>;
  const k = filtro.intensidad ?? 1;
  return (
    <AbsoluteFill style={{ filter: def.css(k) }}>
      {children}
      {def.tinte && <AbsoluteFill style={{ background: col(ajustes, def.tinte.color), mixBlendMode: def.tinte.mezcla as any, opacity: def.tinte.opacidad * k, pointerEvents: 'none' }} />}
    </AbsoluteFill>
  );
};

/** Efectos que transforman el contenido (temblor, latido, aberración…). */
export const ConEnvolturas: React.FC<{ extras: { id: string; intensidad: number }[]; children: React.ReactNode }> = ({ extras, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  let tr = '';
  let fil = '';
  for (const x of extras) {
    const d = EFECTOS.find((e) => e.id === x.id);
    if (!d || d.tipo !== 'envoltura') continue;
    const k = x.intensidad ?? 0.7;
    if (x.id === 'temblor') tr += ` translate(${(random(`a${f}`) - 0.5) * 14 * k}px, ${(random(`b${f}`) - 0.5) * 14 * k}px)`;
    if (x.id === 'latido') {
      const fase = (t * 100) / 60;
      const p = fase - Math.floor(fase);
      tr += ` scale(${1 + 0.035 * k * Math.exp(-p * 7)})`;
    }
    if (x.id === 'respirar') tr += ` scale(${1 + 0.03 * k * (0.5 - 0.5 * Math.cos(t * 1.4))})`;
    if (x.id === 'balanceo') tr += ` rotate(${Math.sin(t * 1.6) * 1.6 * k}deg)`;
    if (x.id === 'sacudida' && t < 0.5) tr += ` translate(${(random(`c${f}`) - 0.5) * 40 * k * (1 - t * 2)}px, ${(random(`d${f}`) - 0.5) * 40 * k * (1 - t * 2)}px)`;
    if (x.id === 'desenfoque-entrada' && t < 0.6) fil += ` blur(${(1 - t / 0.6) * 18 * k}px)`;
    if (x.id === 'aberracion') fil += ` drop-shadow(${4 * k}px 0 0 rgba(255,0,60,0.6)) drop-shadow(${-4 * k}px 0 0 rgba(0,220,255,0.6))`;
    if (x.id === 'espejo') tr += ' scaleX(-1)';
  }
  if (!tr && !fil) return <>{children}</>;
  return <AbsoluteFill style={{ transform: tr || undefined, filter: fil || undefined }}>{children}</AbsoluteFill>;
};

/** Partículas deterministas (bokeh, confeti, nieve…). */
const Particulas: React.FC<{ n: number; semilla: string; dibujar: (i: number, r: (s: string) => number, t: number) => React.ReactNode }> = ({ n, semilla, dibujar }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>{Array.from({ length: n }, (_, i) => dibujar(i, (s) => random(`${semilla}-${i}-${s}`), t))}</AbsoluteFill>;
};

/** Capas de efecto encima de la escena. */
export const CapasEfectos: React.FC<{ extras: { id: string; intensidad: number }[]; ajustes: TAjustes }> = ({ extras, ajustes }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = f / fps;
  return (
    <>
      {extras.map((x, idx) => {
        const k = x.intensidad ?? 0.7;
        const key = `${x.id}-${idx}`;
        const acido = col(ajustes, 'acid');
        const violeta = col(ajustes, 'violet');
        switch (x.id) {
          case 'luz-calida':
          case 'luz-fria':
          case 'luz-neon':
          case 'arcoiris': {
            const [a, b] = x.id === 'luz-calida' ? ['255,150,60', '255,214,120'] : x.id === 'luz-fria' ? ['90,170,255', '150,120,255'] : x.id === 'luz-neon' ? ['200,255,59', '110,75,255'] : ['255,80,120', '80,200,255'];
            return (
              <AbsoluteFill key={key} style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: (0.55 + 0.15 * Math.sin(t * 1.3)) * k, background: `radial-gradient(45% 35% at ${15 + 25 * Math.sin(t * 0.45)}% ${20 + 15 * Math.cos(t * 0.31)}%, rgba(${a},0.85), transparent 70%), radial-gradient(40% 30% at ${85 - 20 * Math.sin(t * 0.37 + 1)}% ${75 + 12 * Math.sin(t * 0.52)}%, rgba(${b},0.7), transparent 70%)` }} />
            );
          }
          case 'destello-lente':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: k, background: `radial-gradient(circle at ${70 + 6 * Math.sin(t)}% 18%, rgba(255,255,230,.9) 0, rgba(255,220,150,.35) 6%, transparent 22%), radial-gradient(circle at 40% 60%, rgba(120,180,255,.25) 0, transparent 8%), radial-gradient(circle at 30% 75%, rgba(255,140,200,.2) 0, transparent 5%)` }} />;
          case 'barrido-luz': {
            const p = (t * 0.6) % 1.6;
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: 0.7 * k, background: `linear-gradient(115deg, transparent ${(p - 0.3) * 100}%, rgba(255,255,255,.55) ${p * 100}%, transparent ${(p + 0.12) * 100}%)` }} />;
          }
          case 'foco':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', background: `radial-gradient(38% 30% at ${50 + 10 * Math.sin(t * 0.8)}% ${45 + 8 * Math.cos(t * 0.6)}%, transparent 0, rgba(0,0,0,${0.75 * k}) 100%)` }} />;
          case 'flash':
            return t < 0.35 ? <AbsoluteFill key={key} style={{ background: '#fff', opacity: (1 - t / 0.35) * k, pointerEvents: 'none' }} /> : null;
          case 'vineta':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', background: `radial-gradient(110% 80% at 50% 45%, transparent 45%, rgba(0,0,0,${0.85 * k}) 100%)` }} />;
          case 'grano':
            return (
              <AbsoluteFill key={key} style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.35 * k }}>
                <svg width={W} height={H}>
                  <filter id={`gr${f}`}>
                    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed={Math.floor(random(`gr${f}`) * 999)} />
                    <feColorMatrix type="saturate" values="0" />
                  </filter>
                  <rect width={W} height={H} filter={`url(#gr${f})`} />
                </svg>
              </AbsoluteFill>
            );
          case 'rayas':
            return (
              <Particulas key={key} n={4} semilla={`ry${Math.floor(f / 2)}`} dibujar={(i, r) => (r('v') < 0.7 ? <div key={i} style={{ position: 'absolute', left: `${r('x') * 100}%`, top: 0, bottom: 0, width: 1 + r('w') * 2, background: `rgba(255,255,255,${0.25 * k})` }} /> : null)} />
            );
          case 'polvo':
            return <Particulas key={key} n={26} semilla={`po${Math.floor(f / 3)}`} dibujar={(i, r) => <div key={i} style={{ position: 'absolute', left: `${r('x') * 100}%`, top: `${r('y') * 100}%`, width: 2 + r('s') * 4, height: 2 + r('s') * 4, borderRadius: '50%', background: `rgba(255,255,255,${0.5 * k})` }} />} />;
          case 'bandas-cine':
            return (
              <AbsoluteFill key={key} style={{ pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H * 0.11 * k, background: '#000' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.11 * k, background: '#000' }} />
              </AbsoluteFill>
            );
          case 'vhs':
          case 'lineas-tv':
            return (
              <AbsoluteFill key={key} style={{ pointerEvents: 'none', opacity: k, background: `repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 2px, transparent 2px 5px)` }}>
                {x.id === 'vhs' && <div style={{ position: 'absolute', left: 0, right: 0, top: `${((t * 0.25) % 1) * 100}%`, height: 40, background: 'rgba(255,255,255,.12)', filter: 'blur(4px)' }} />}
                {x.id === 'vhs' && <div style={{ position: 'absolute', left: 40, bottom: 60, color: '#fff', fontFamily: 'monospace', fontSize: 40, textShadow: '2px 0 #f0f, -2px 0 #0ff' }}>PLAY ▶</div>}
              </AbsoluteFill>
            );
          case 'ruido-tv':
            return (
              <AbsoluteFill key={key} style={{ pointerEvents: 'none', opacity: 0.25 * k, mixBlendMode: 'screen' }}>
                <svg width={W} height={H}>
                  <filter id={`tv${f}`}>
                    <feTurbulence type="turbulence" baseFrequency="0.9 0.02" numOctaves="1" seed={Math.floor(random(`tv${f}`) * 999)} />
                    <feColorMatrix type="saturate" values="0" />
                  </filter>
                  <rect width={W} height={H} filter={`url(#tv${f})`} />
                </svg>
              </AbsoluteFill>
            );
          case 'rec': {
            const s = Math.floor(t);
            return (
              <AbsoluteFill key={key} style={{ pointerEvents: 'none', opacity: k }}>
                <div style={{ position: 'absolute', top: 260, left: 70, display: 'flex', alignItems: 'center', gap: 14, color: '#fff', fontFamily: 'monospace', fontSize: 40 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#ff3b3b', opacity: Math.floor(t * 2) % 2 ? 1 : 0.2 }} /> REC
                </div>
                <div style={{ position: 'absolute', top: 260, right: 70, color: '#fff', fontFamily: 'monospace', fontSize: 40 }}>00:{String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</div>
              </AbsoluteFill>
            );
          }
          case 'bokeh':
            return <Particulas key={key} n={18} semilla="bk" dibujar={(i, r, tt) => <div key={i} style={{ position: 'absolute', left: `${(r('x') * 110 - 5 + Math.sin(tt * 0.3 + i) * 3) % 110}%`, top: `${(r('y') * 100 + tt * (2 + r('v') * 3)) % 110 - 5}%`, width: 60 + r('s') * 140, height: 60 + r('s') * 140, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,240,200,${0.35 * k}) 0, transparent 70%)`, mixBlendMode: 'screen' }} />} />;
          case 'confeti':
            return <Particulas key={key} n={60} semilla="cf" dibujar={(i, r, tt) => <div key={i} style={{ position: 'absolute', left: `${r('x') * 100 + Math.sin(tt * 2 + i) * 2}%`, top: `${((r('y') * 120 + tt * (25 + r('v') * 30)) % 120) - 10}%`, width: 14, height: 22, background: [acido, violeta, '#ff5c2a', '#22d3e6', '#fff'][i % 5], transform: `rotate(${tt * 200 * (r('r') - 0.5)}deg)`, opacity: k }} />} />;
          case 'estrellas':
            return <Particulas key={key} n={22} semilla="es" dibujar={(i, r, tt) => <div key={i} style={{ position: 'absolute', left: `${r('x') * 100}%`, top: `${r('y') * 100}%`, color: '#fff', fontSize: 20 + r('s') * 30, opacity: k * Math.max(0, Math.sin(tt * (2 + r('v') * 3) + i)), textShadow: '0 0 12px #fff' }}>✦</div>} />;
          case 'nieve':
            return <Particulas key={key} n={70} semilla="nv" dibujar={(i, r, tt) => <div key={i} style={{ position: 'absolute', left: `${(r('x') * 100 + Math.sin(tt + i) * 2) % 100}%`, top: `${((r('y') * 110 + tt * (6 + r('v') * 8)) % 110) - 5}%`, width: 4 + r('s') * 8, height: 4 + r('s') * 8, borderRadius: '50%', background: '#fff', opacity: 0.8 * k }} />} />;
          case 'lluvia':
            return <Particulas key={key} n={80} semilla="ll" dibujar={(i, r, tt) => <div key={i} style={{ position: 'absolute', left: `${r('x') * 100}%`, top: `${((r('y') * 110 + tt * (90 + r('v') * 60)) % 110) - 10}%`, width: 2, height: 40 + r('s') * 40, background: 'rgba(200,220,255,.55)', transform: 'rotate(12deg)', opacity: k }} />} />;
          case 'rejilla':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', opacity: 0.35 * k, backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '90px 90px' }} />;
          case 'puntos':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', opacity: 0.4 * k, mixBlendMode: 'overlay', backgroundImage: 'radial-gradient(#000 2px, transparent 2.5px)', backgroundSize: '12px 12px' }} />;
          case 'degradado-arriba':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', background: `linear-gradient(180deg, rgba(0,0,0,${0.75 * k}) 0, transparent 35%)` }} />;
          case 'degradado-abajo':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', background: `linear-gradient(0deg, rgba(0,0,0,${0.75 * k}) 0, transparent 40%)` }} />;
          case 'marco-neon':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', boxShadow: `inset 0 0 0 ${10 * k}px ${acido}, inset 0 0 ${60 * k}px ${acido}`, opacity: 0.8 + 0.2 * Math.sin(t * 4) }} />;
          case 'esquinas':
            return (
              <AbsoluteFill key={key} style={{ pointerEvents: 'none', opacity: k }}>
                {[
                  [0, 0],
                  [1, 0],
                  [0, 1],
                  [1, 1],
                ].map(([a, b], i) => (
                  <div key={i} style={{ position: 'absolute', width: 90, height: 90, [a ? 'right' : 'left']: 60, [b ? 'bottom' : 'top']: 240, [`border${b ? 'Bottom' : 'Top'}`]: '6px solid #fff', [`border${a ? 'Right' : 'Left'}`]: '6px solid #fff' } as any} />
                ))}
              </AbsoluteFill>
            );
          case 'marco-blanco':
            return <AbsoluteFill key={key} style={{ pointerEvents: 'none', boxShadow: `inset 0 0 0 ${36 * k}px #f6f4ef` }} />;
          default:
            return null;
        }
      })}
    </>
  );
};
