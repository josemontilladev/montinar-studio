/**
 * Texto con estilo y animaciones de la biblioteca (entrada por palabra/letra, salida y bucle). Trabaja en
 * fotogramas reales y segundos, así vale para cualquier proyecto y fps.
 */
import React from 'react';
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { TAjustes, TTexto } from '../esquema';
import { desplazamiento } from './seguir';

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const salida = Easing.bezier(0.16, 1, 0.3, 1);
const rebote = (x: number) => {
  const n1 = 7.5625,
    d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};
const elastico = (x: number) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);

type Tok = { w: string; it: boolean };
/** «Una web que / *se siente*.» → líneas de palabras; *…* = palabra de acento. */
export const parseTexto = (txt: string): Tok[][] => {
  let it = false;
  return txt.split(' / ').map((line) =>
    line.split(' ').map((raw) => {
      let w = raw;
      if (w.startsWith('*')) {
        it = true;
        w = w.slice(1);
      }
      const tok = { w: '', it };
      if (w.includes('*')) {
        w = w.replace('*', '');
        tok.it = true;
        it = false;
      }
      tok.w = w;
      return tok;
    }),
  );
};

export type PropsTextoPro = {
  t: TTexto;
  ajustes: TAjustes;
  /** fotograma local (real) de entrada y de salida (null = no sale) */
  at: number;
  out: number | null;
  /** entrada de cada palabra (fotogramas reales), si va sincronizado con la voz */
  times?: number[];
  /** familias ya resueltas */
  familia: string;
  familiaAcento: string;
  /** y corregida (reencuadre) */
  y?: number;
};

export const TextoPro: React.FC<PropsTextoPro> = ({ t, ajustes, at, out, times, familia, familiaAcento, y }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const col = (c: string | undefined, def: string) => (c ? (ajustes.paleta[c] ?? c) : def);
  const e = t.estilo ?? {};
  const size = t.tam;
  const lh = t.interlineado ?? (e.fondo ? 1.18 : 0.98);
  const anim = t.animacion ?? 'mascara';
  const dEnt = Math.max(1, (t.durEntrada ?? 0.5) * fps);
  const dSal = Math.max(1, (t.durSalida ?? 0.4) * fps);
  const stagger = t.escalonado ?? 2.5;
  const color = col(t.color, '#ffffff');
  const acento = t.acento ? col(t.acento, color) : null;
  const lines = parseTexto(t.texto);
  const nPal = lines.reduce((a, l) => a + l.length, 0);
  const seg = (f - at) / fps;
  if (f < at - 1) return null;

  // salida (de bloque)
  let q = 0;
  if (out != null && t.salida !== null) q = clamp((f - out) / dSal);
  const tipoSal = t.salida ?? (anim === 'mascara' ? 'mascara' : 'fundido');
  if (out != null && f >= out + dSal + 12) return null;
  let bloqueTr = '';
  let bloqueOp = 1;
  let bloqueFiltro = '';
  let bloqueClip: string | undefined;
  if (q > 0) {
    const s = salida(q);
    if (tipoSal === 'fundido') bloqueOp = 1 - s;
    else if (tipoSal === 'subir') (bloqueTr += ` translateY(${-s * 60}%)`), (bloqueOp = 1 - s);
    else if (tipoSal === 'bajar') (bloqueTr += ` translateY(${s * 60}%)`), (bloqueOp = 1 - s);
    else if (tipoSal === 'pop') (bloqueTr += ` scale(${1 - 0.6 * s})`), (bloqueOp = 1 - s);
    else if (tipoSal === 'zoom') (bloqueTr += ` scale(${1 + 0.6 * s})`), (bloqueOp = 1 - s);
    else if (tipoSal === 'desenfoque') (bloqueFiltro = `blur(${s * 16}px)`), (bloqueOp = 1 - s);
    else if (tipoSal === 'barrido') bloqueClip = `inset(0 0 0 ${s * 100}%)`;
    else if (tipoSal === 'izquierda') (bloqueTr += ` translateX(${-s * 60}%)`), (bloqueOp = 1 - s);
    else if (tipoSal === 'derecha') (bloqueTr += ` translateX(${s * 60}%)`), (bloqueOp = 1 - s);
    else if (tipoSal === 'mascara') (bloqueTr += ` translateY(${-s * 30}%)`), (bloqueOp = 1 - s);
  }
  // bucle (después de entrar)
  const bucle = t.bucle ?? null;
  if (bucle === 'pulso') bloqueTr += ` scale(${1 + 0.04 * Math.sin(seg * 5)})`;
  if (bucle === 'temblor') bloqueTr += ` translate(${(random(`tx${f}`) - 0.5) * 6}px, ${(random(`ty${f}`) - 0.5) * 6}px)`;
  if (bucle === 'flotar') bloqueTr += ` translateY(${Math.sin(seg * 2) * 10}px)`;
  if (bucle === 'balanceo') bloqueTr += ` rotate(${Math.sin(seg * 2.2) * 3}deg)`;
  if (bucle === 'parpadeo') bloqueOp *= random(`p${Math.floor(f / 3)}`) > 0.12 ? 1 : 0.55;
  if (bucle === 'arcoiris') bloqueFiltro += ` hue-rotate(${(seg * 120) % 360}deg)`;
  if (anim === 'barrido' && f < at + dEnt) bloqueClip = `inset(0 ${(1 - salida(clamp((f - at) / dEnt))) * 100}% 0 0)`;

  // sombras / brillo
  const sombras: string[] = [];
  if (e.sombra) sombras.push(`${e.sombra.x}px ${e.sombra.y}px ${e.sombra.blur}px ${col(e.sombra.color, '#000')}`);
  if (e.sombra2) sombras.push(`${e.sombra2.x}px ${e.sombra2.y}px ${e.sombra2.blur}px ${col(e.sombra2.color, '#000')}`);
  const brillo = (t.brillo ?? 0) > 0 || e.brilloColor || bucle === 'brillo';
  if (brillo) {
    const g = (t.brillo || 0.6) * (bucle === 'brillo' ? 0.7 + 0.3 * Math.sin(seg * 4) : 1);
    const bc = col(e.brilloColor, color);
    sombras.push(`0 0 ${size * 0.12 * g}px ${bc}`, `0 0 ${size * 0.4 * g}px ${bc}`);
  }
  const fondo = e.fondo;

  let k = 0;
  let letraGlobal = 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: t.x,
        top: y ?? t.y,
        width: t.w,
        textAlign: t.alinear,
        pointerEvents: 'none',
        transform: `${t.seguir?.length ? `translate(${desplazamiento(t.seguir, f).x}px, ${desplazamiento(t.seguir, f).y}px) ` : ''}${t.rot ? `rotate(${t.rot}deg)` : ''}${bloqueTr}`,
        transformOrigin: '50% 50%',
        opacity: bloqueOp,
        filter: bloqueFiltro || undefined,
        clipPath: bloqueClip,
      }}
    >
      {lines.map((ln, li) => {
        const lineaStyle: React.CSSProperties = { display: 'block', whiteSpace: 'nowrap', fontSize: size, lineHeight: lh, minHeight: size * lh, overflow: 'visible' };
        const caja: React.CSSProperties | null =
          fondo && fondo.tipo !== 'subrayado'
            ? {
                display: 'inline-block',
                background: fondo.tipo === 'marco' ? 'transparent' : col(fondo.color, '#000'),
                border: fondo.tipo === 'marco' ? `${Math.max(2, size * 0.035)}px solid ${col(t.estilo?.trazo?.color ?? t.color, '#fff')}` : undefined,
                borderRadius: fondo.radio,
                padding: `${size * fondo.pad * 0.5}px ${size * fondo.pad}px`,
                marginBottom: fondo.tipo === 'cinta' ? size * 0.08 : size * 0.04,
              }
            : null;
        const contenido = ln.map((tok, wi) => {
          const i = k++;
          const inicio = times?.[i] ?? at + i * stagger;
          const p = clamp((f - inicio) / dEnt);
          const pe = salida(p);
          const sp = spring({ frame: f - inicio, fps, config: { damping: 19, stiffness: 170, mass: 0.7 } });
          let tr = '';
          let op = 1;
          let fil = '';
          let envoltura = false;
          let letras = false;
          let extraSombra = '';
          if (anim === 'mascara') {
            envoltura = true;
            tr = `translateY(${(1 - sp) * 112}%) rotate(${(1 - sp) * 4}deg)`;
          } else if (anim === 'fundido') (tr = `translateY(${(1 - pe) * 12}%)`), (op = pe);
          else if (anim === 'subir') (tr = `translateY(${(1 - pe) * 60}%)`), (op = pe);
          else if (anim === 'bajar') (tr = `translateY(${-(1 - pe) * 60}%)`), (op = pe);
          else if (anim === 'izquierda') (tr = `translateX(${-(1 - pe) * 80}%)`), (op = pe);
          else if (anim === 'derecha') (tr = `translateX(${(1 - pe) * 80}%)`), (op = pe);
          else if (anim === 'pop') {
            const s2 = spring({ frame: f - inicio, fps, config: { damping: 11, stiffness: 220, mass: 0.6 } });
            (tr = `scale(${Math.max(0, s2)})`), (op = clamp(s2 * 2));
          } else if (anim === 'zoom-in') (tr = `scale(${0.3 + 0.7 * pe})`), (op = pe);
          else if (anim === 'zoom-out') (tr = `scale(${1.8 - 0.8 * pe})`), (op = pe);
          else if (anim === 'palabra') op = f >= inicio ? 1 : 0;
          else if (anim === 'rebote') {
            const s2 = spring({ frame: f - inicio, fps, config: { damping: 7, stiffness: 160, mass: 0.8 } });
            (tr = `translateY(${(1 - s2) * -80}%)`), (op = clamp(s2 * 3));
          } else if (anim === 'desenfoque') (fil = `blur(${(1 - pe) * 14}px)`), (op = pe);
          else if (anim === 'glitch') {
            const j = 1 - p;
            if (p < 1) {
              tr = `translate(${(random(`g${i}-${f}`) - 0.5) * 30 * j}px, ${(random(`h${i}-${f}`) - 0.5) * 10 * j}px)`;
              extraSombra = `${-6 * j}px 0 0 #ff2d6f, ${6 * j}px 0 0 #22d3e6`;
            }
            op = p > 0 ? (random(`o${i}-${Math.floor(f / 2)}`) > 0.25 * j ? 1 : 0.2) : 0;
          } else if (anim === 'giro') (tr = `rotate(${(1 - pe) * -120}deg) scale(${0.5 + 0.5 * pe})`), (op = pe);
          else if (anim === 'voltear') (tr = `perspective(800px) rotateX(${(1 - pe) * 90}deg)`), (op = clamp(pe * 2));
          else if (anim === 'caer') (tr = `translateY(${-(1 - rebote(p)) * 150}%)`), (op = p > 0 ? 1 : 0);
          else if (anim === 'elastico') (tr = `scaleX(${elastico(p)})`), (op = p > 0 ? 1 : 0);
          else if (anim === 'escala-x') (tr = `scaleX(${pe})`), (op = p > 0 ? 1 : 0);
          else if (anim === 'maquina' || anim === 'letras-onda') letras = true;
          else if (anim === 'ninguna') op = f >= at ? 1 : 0;
          // bucle por palabra
          if (bucle === 'onda' && p >= 1) tr += ` translateY(${Math.sin(seg * 4 + i * 0.7) * 7}%)`;
          let colorPal = tok.it && acento ? acento : color;
          if (bucle === 'karaoke') {
            const fin = out ?? at + Math.max(nPal, 1) * fps * 0.35;
            const umbral = at + ((fin - at) * i) / Math.max(1, nPal);
            colorPal = f >= umbral ? col(t.acento ?? 'acid', '#C8FF3B') : color;
          }
          const estiloLetra: React.CSSProperties = {
            fontFamily: tok.it ? familiaAcento : familia,
            fontStyle: tok.it || e.cursiva ? 'italic' : 'normal',
            fontWeight: tok.it ? 400 : (e.peso ?? 650),
            fontSize: tok.it ? size * 1.1 : size,
            letterSpacing: e.espaciado != null ? `${e.espaciado}em` : tok.it ? '-0.02em' : '-0.045em',
            textTransform: e.mayusculas ? 'uppercase' : undefined,
            color: e.degradado ? 'transparent' : colorPal,
            backgroundImage: e.degradado ? `linear-gradient(${e.degradado.angulo}deg, ${col(e.degradado.de, '#fff')}, ${col(e.degradado.a, '#fff')})` : undefined,
            WebkitBackgroundClip: e.degradado ? 'text' : undefined,
            backgroundClip: e.degradado ? 'text' : undefined,
            WebkitTextStroke: e.trazo ? `${e.trazo.ancho}px ${col(e.trazo.color, '#000')}` : undefined,
            paintOrder: e.trazo ? 'stroke fill' : undefined,
            textShadow: [...sombras, extraSombra].filter(Boolean).join(', ') || undefined,
          } as React.CSSProperties;
          const ultima = wi === ln.length - 1;
          const sep = ultima ? 0 : size * 0.24;
          let interior: React.ReactNode = tok.w;
          if (letras) {
            const ls = [...tok.w];
            const pasoL = Math.max(0.6, stagger * 0.45);
            interior = ls.map((c, ci) => {
              const ini = (times?.[i] ?? at + letraGlobal * pasoL) + (times ? ci * pasoL : 0);
              letraGlobal++;
              const pl = clamp((f - ini) / Math.max(1, dEnt * 0.5));
              if (anim === 'maquina') return <span key={ci} style={{ opacity: f >= ini ? 1 : 0 }}>{c}</span>;
              return (
                <span key={ci} style={{ display: 'inline-block', transform: `translateY(${(1 - salida(pl)) * 70}%)`, opacity: pl }}>
                  {c}
                </span>
              );
            });
            letraGlobal++;
          }
          const span = (
            <span style={{ display: 'inline-block', transform: tr || undefined, opacity: op, filter: fil || undefined, transformOrigin: anim === 'escala-x' || anim === 'elastico' ? 'left center' : 'center bottom', ...estiloLetra }}>{interior}</span>
          );
          return (
            <span key={wi} style={{ display: 'inline-block', overflow: envoltura ? 'hidden' : 'visible', verticalAlign: 'top', padding: `0 ${size * 0.04}px ${size * 0.14}px`, margin: `0 -${size * 0.04}px -${size * 0.14}px`, marginRight: ultima ? -size * 0.04 : sep }}>
              {span}
            </span>
          );
        });
        return (
          <div key={li} style={lineaStyle}>
            {caja ? <span style={caja}>{contenido}</span> : fondo?.tipo === 'subrayado' ? <span style={{ backgroundImage: `linear-gradient(${col(fondo.color, '#C8FF3B')}, ${col(fondo.color, '#C8FF3B')})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 28%', backgroundPosition: '0 88%', padding: `0 ${size * 0.08}px` }}>{contenido}</span> : contenido}
          </div>
        );
      })}
    </div>
  );
};

/** Animaciones de entrada que el titular clásico (Kinetic del proyecto) ya sabe dibujar igual. */
export const ANIM_CLASICAS = ['mascara', 'fundido', 'pop', 'maquina', 'ninguna'];
/** ¿Hace falta el motor nuevo para este texto? (si no, se usa el de siempre y el vídeo no cambia). */
export const necesitaTextoPro = (t: TTexto) => !!t.seguir?.length || !!t.estilo || !!t.salida || !!t.bucle || !!t.rot || t.durEntrada != null || !ANIM_CLASICAS.includes(t.animacion ?? 'mascara');
