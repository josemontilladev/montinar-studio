/**
 * Kit de plantillas reutilizables (parte del contrato: se copia a cada proyecto en src/contrato/kit).
 * Solo dependen de `remotion` y del esquema: usan la paleta, las fuentes y la marca de `ajustes`, y trabajan en
 * SEGUNDOS (valen a 30, 60 o cualquier fps). Cada plantilla declara sus `campos` para que el editor muestre un
 * formulario en vez de JSON.
 */
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Freeze, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { TAjustes, TEscena, TToma } from '../esquema';
import { tiempoToma } from '../linea';

/** Lo mínimo que una plantilla del kit necesita de la escena (el proyecto se lo da). */
export type KitEsc = {
  escena: TEscena;
  ajustes: TAjustes;
  /** fotogramas reales desde el origen de la escena hasta s = 0 (su frase), y fps reales */
  preReal: number;
  fpsReal: number;
  p: Record<string, any>;
};

export type Campo = { k: string; et: string; tipo: 'texto' | 'area' | 'lista' | 'numero' | 'color' | 'si' | 'opcion'; ops?: string[]; def?: unknown };

export type PlantillaKit = {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'Gancho' | 'Producto' | 'Contenido' | 'Prueba social' | 'Cierre' | 'Marca';
  roles: string[];
  campos: Campo[];
  componente: React.FC<{ esc: KitEsc }>;
  crear: () => Partial<TEscena>;
};

// ——— utilidades ———
const useT = (esc: KitEsc) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { f, fps, t: f / fps, s: (f - esc.preReal) / fps, dur: esc.escena.duracion / fps };
};
const col = (a: TAjustes, c: string | undefined, def: string) => (c ? (a.paleta[c] ?? c) : (a.paleta[def] ?? def));
const sans = (a: TAjustes) => `"${a.fuentes.sans}", system-ui, sans-serif`;
const serif = (a: TAjustes) => `"${a.fuentes.serif}", Georgia, serif`;
const mono = (a: TAjustes) => `"${a.fuentes.mono}", ui-monospace, monospace`;
const sp = (t: number, fps: number, d = 0, cfg = { damping: 16, stiffness: 140, mass: 0.8 }) => spring({ frame: (t - d) * fps, fps, config: cfg });
const ease = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) });
const toma = (e: TEscena, rol: string) => e.tomas.find((x) => x.rol === rol) ?? (rol === 'principal' ? e.tomas[0] : undefined);
const esImg = (src: string) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(src);

/** Medio (vídeo o imagen) de una toma, a su instante. */
const Medio: React.FC<{ t?: TToma; s: number; fit?: 'cover' | 'contain' }> = ({ t, s, fit = 'cover' }) => {
  const { fps } = useVideoConfig();
  if (!t?.src || t.src.startsWith('falta:'))
    return <AbsoluteFill style={{ background: 'repeating-linear-gradient(45deg,#2a1414 0 22px,#1d0f0f 22px 44px)', color: '#ff8a7a', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>Sin medio</AbsoluteFill>;
  const st: React.CSSProperties = { width: '100%', height: '100%', objectFit: fit };
  if (esImg(t.src)) return <Img src={staticFile(t.src)} style={st} />;
  return (
    <Freeze frame={Math.max(0, tiempoToma(t, s)) * fps}>
      <OffthreadVideo src={staticFile(t.src)} muted style={st} transparent={/\.(webm|mov)$/i.test(t.src)} />
    </Freeze>
  );
};

/** Fondo de marca: color + resplandor suave que se mueve + retícula de puntos. */
const Fondo: React.FC<{ a: TAjustes; tono?: string; t: number; brillo?: string }> = ({ a, tono = 'ink', t, brillo = 'violet' }) => {
  const bg = col(a, tono, '#0A0A0C');
  const gl = col(a, brillo, '#6E4BFF');
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(55% 40% at ${50 + 18 * Math.sin(t * 0.6)}% ${42 + 10 * Math.cos(t * 0.5)}%, ${gl}38, transparent 70%)` }} />
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1.6px, transparent 1.8px)', backgroundSize: '30px 30px', backgroundPosition: `0 ${-t * 10}px` }} />
    </AbsoluteFill>
  );
};

/** Logo de la marca (imagen) o monograma con la inicial. */
const Logo: React.FC<{ a: TAjustes; size: number }> = ({ a, size }) =>
  a.marca?.logo ? (
    <Img src={staticFile(a.marca.logo)} style={{ width: size, height: size, objectFit: 'contain' }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: size * 0.24, background: col(a, 'acid', '#C8FF3B'), color: col(a, 'ink', '#0A0A0C'), display: 'grid', placeItems: 'center', fontFamily: sans(a), fontWeight: 800, fontSize: size * 0.55 }}>
      {(a.marca?.nombre || 'M').trim().charAt(0).toUpperCase()}
    </div>
  );

// ——— 1 · Gancho: titular cinético ———
const Gancho: React.FC<{ esc: KitEsc }> = ({ esc }) => {
  const { t, fps } = useT(esc);
  const a = esc.ajustes;
  const p = esc.p;
  const lineas: string[] = String(p.titulo ?? '¿Tu web te / trae clientes?').split('/').map((x: string) => x.trim());
  const acento = String(p.acento ?? '').toLowerCase();
  let k = 0;
  return (
    <AbsoluteFill>
      <Fondo a={a} tono={p.fondo ?? 'ink'} t={t} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 70px', textAlign: 'center' }}>
        {p.etiqueta && (
          <div style={{ fontFamily: mono(a), fontSize: 30, letterSpacing: '0.14em', textTransform: 'uppercase', color: col(a, 'acid', '#C8FF3B'), opacity: ease(t, 0.05, 0.4), marginBottom: 40 }}>{p.etiqueta}</div>
        )}
        {lineas.map((ln, i) => (
          <div key={i} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.25em', fontFamily: sans(a), fontWeight: 800, fontSize: Number(p.tam ?? 150), lineHeight: 1.0, letterSpacing: '-0.05em', color: col(a, p.color, 'bone') }}>
            {ln.split(' ').map((w, j) => {
              const d = 0.12 + (k++) * Number(p.ritmo ?? 0.11);
              const v = sp(t, fps, d, { damping: 13, stiffness: 190, mass: 0.7 });
              const esA = acento && w.toLowerCase().replace(/[^\p{L}]/gu, '').includes(acento);
              return (
                <span key={j} style={{ display: 'inline-block', transform: `translateY(${(1 - v) * 60}px) scale(${1.35 - 0.35 * v})`, opacity: Math.min(1, v * 1.6), filter: `blur(${Math.max(0, (1 - v) * 10)}px)`, color: esA ? col(a, 'acid', '#C8FF3B') : undefined, fontFamily: esA ? serif(a) : undefined, fontStyle: esA ? 'italic' : undefined, fontWeight: esA ? 400 : undefined }}>
                  {w}
                </span>
              );
            })}
          </div>
        ))}
        {p.sub && <div style={{ marginTop: 44, fontFamily: sans(a), fontSize: 44, color: col(a, 'stone', '#8A867C'), opacity: ease(t, 0.9, 1.4), transform: `translateY(${(1 - ease(t, 0.9, 1.4)) * 20}px)` }}>{p.sub}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ——— 2 · Escaparate de dispositivo (con inclinación 3D) ———
const Dispositivo: React.FC<{ esc: KitEsc }> = ({ esc }) => {
  const { t, s, fps } = useT(esc);
  const a = esc.ajustes;
  const p = esc.p;
  const movil = (p.tipo ?? 'telefono') === 'telefono';
  const w = movil ? 470 : 980;
  const h = movil ? (w * 844) / 390 : (w * 10) / 16;
  const v = sp(t, fps, 0.05, { damping: 18, stiffness: 110, mass: 1 });
  const ry = (1 - v) * 28 + Math.sin(t * 0.8) * 5;
  const rx = 6 + Math.cos(t * 0.6) * 2;
  return (
    <AbsoluteFill>
      <Fondo a={a} tono={p.fondo ?? 'ink'} t={t} />
      <AbsoluteFill style={{ perspective: 1800, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: w, height: h, transform: `translateY(${(1 - v) * 300 + (movil ? 60 : 0)}px) rotateY(${ry}deg) rotateX(${rx}deg)`, transformStyle: 'preserve-3d', borderRadius: movil ? 64 : 22, padding: movil ? 16 : 0, background: '#0d0d10', boxShadow: '0 80px 140px -40px rgba(0,0,0,.75), 0 0 0 2px #2a2a30 inset' }}>
          {!movil && <div style={{ height: 46, background: '#1b1b20', borderRadius: '22px 22px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontFamily: sans(a), fontSize: 20 }}>{a.siteUrl}</div>}
          <div style={{ position: 'relative', width: '100%', height: movil ? '100%' : h - 46, borderRadius: movil ? 50 : '0 0 22px 22px', overflow: 'hidden', background: '#000' }}>
            <Medio t={toma(esc.escena, 'principal')} s={s} />
          </div>
        </div>
      </AbsoluteFill>
      {p.etiqueta && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: movil ? 1640 : 1500, textAlign: 'center', fontFamily: mono(a), fontSize: 30, letterSpacing: '0.12em', textTransform: 'uppercase', color: col(a, 'acid', '#C8FF3B'), opacity: ease(t, 0.5, 0.9) }}>{p.etiqueta}</div>
      )}
    </AbsoluteFill>
  );
};

// ——— 3 · Antes / después (barrido) ———
const AntesDespues: React.FC<{ esc: KitEsc }> = ({ esc }) => {
  const { t, s, dur } = useT(esc);
  const a = esc.ajustes;
  const p = esc.p;
  const m = Number(p.momento ?? Math.max(0.6, dur * 0.4));
  const k = interpolate(t, [m, m + Number(p.duracionBarrido ?? 1.1)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.83, 0, 0.17, 1) });
  const x = k * 100;
  const caja: React.CSSProperties = { position: 'absolute', left: 60, top: 300, width: 960, height: 1200, borderRadius: 32, overflow: 'hidden', boxShadow: '0 60px 120px -40px rgba(0,0,0,.7)' };
  const etq = (txt: string, lado: 'left' | 'right', on: number): React.CSSProperties => ({ position: 'absolute', top: 30, [lado]: 30, padding: '12px 22px', borderRadius: 99, background: 'rgba(10,10,12,.75)', color: '#fff', fontFamily: mono(a), fontSize: 26, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: on }) as React.CSSProperties;
  return (
    <AbsoluteFill>
      <Fondo a={a} tono={p.fondo ?? 'bone'} t={t} brillo="acid" />
      <div style={caja}>
        <Medio t={toma(esc.escena, 'despues')} s={s} />
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - x}% 0 0)` }}>
          <Medio t={toma(esc.escena, 'antes')} s={s} />
        </div>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${x}%`, width: 6, marginLeft: -3, background: col(a, 'acid', '#C8FF3B'), boxShadow: '0 0 30px rgba(200,255,59,.8)', opacity: k > 0 && k < 1 ? 1 : 0 }} />
        <div style={etq('', 'left', k > 0.5 ? 1 : 0)}>{p.antes ?? 'Antes'}</div>
        <div style={etq('', 'right', k < 0.5 ? 1 : 0)}>{p.despues ?? 'Después'}</div>
      </div>
    </AbsoluteFill>
  );
};

// ——— 4 · Lista / pasos ———
const Lista: React.FC<{ esc: KitEsc }> = ({ esc }) => {
  const { t, fps, dur } = useT(esc);
  const a = esc.ajustes;
  const p = esc.p;
  const items: string[] = Array.isArray(p.items) ? p.items.filter(Boolean) : String(p.items ?? 'Descubrimiento\nDiseño\nDesarrollo\nLanzamiento').split('\n').filter(Boolean);
  const ini = 0.6;
  const paso = Math.max(0.35, (dur - ini - 1) / Math.max(1, items.length));
  const numerada = (p.estilo ?? 'numeros') === 'numeros';
  return (
    <AbsoluteFill>
      <Fondo a={a} tono={p.fondo ?? 'ink'} t={t} />
      <div style={{ position: 'absolute', left: 80, right: 80, top: 300, fontFamily: sans(a), fontWeight: 800, fontSize: 96, lineHeight: 1, letterSpacing: '-0.05em', color: col(a, 'bone', '#F2EFE8'), opacity: ease(t, 0, 0.4), transform: `translateY(${(1 - ease(t, 0, 0.5)) * 30}px)` }}>{p.titulo ?? 'Cómo trabajamos'}</div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 560, display: 'flex', flexDirection: 'column', gap: 34 }}>
        {items.map((it, i) => {
          const d = ini + i * paso;
          const v = sp(t, fps, d, { damping: 17, stiffness: 160, mass: 0.8 });
          const on = t >= d + paso * 0.6;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 34, opacity: Math.min(1, v * 1.5), transform: `translateX(${(1 - v) * -80}px)` }}>
              <div style={{ flex: 'none', width: 96, height: 96, borderRadius: 26, display: 'grid', placeItems: 'center', background: on ? col(a, 'acid', '#C8FF3B') : 'rgba(255,255,255,.08)', color: on ? col(a, 'ink', '#0A0A0C') : col(a, 'bone', '#F2EFE8'), fontFamily: mono(a), fontSize: 40, fontWeight: 600 }}>
                {numerada ? String(i + 1).padStart(2, '0') : on ? '✓' : '·'}
              </div>
              <div style={{ fontFamily: sans(a), fontSize: 62, fontWeight: 650, letterSpacing: '-0.03em', color: col(a, 'bone', '#F2EFE8') }}>{it}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ——— 5 · Cita / testimonio ———
const Cita: React.FC<{ esc: KitEsc }> = ({ esc }) => {
  const { t, fps } = useT(esc);
  const a = esc.ajustes;
  const p = esc.p;
  const palabras = String(p.texto ?? 'Mi web por fin trae clientes cada semana.').split(' ');
  const estrellas = Math.max(0, Math.min(5, Number(p.estrellas ?? 5)));
  return (
    <AbsoluteFill>
      <Fondo a={a} tono={p.fondo ?? 'bone'} t={t} brillo="acid" />
      <div style={{ position: 'absolute', left: 80, top: 360, fontFamily: serif(a), fontStyle: 'italic', fontSize: 320, lineHeight: 0.7, color: col(a, 'violet', '#6E4BFF'), opacity: ease(t, 0, 0.4), transform: `scale(${0.6 + 0.4 * sp(t, fps, 0)})`, transformOrigin: 'left top' }}>“</div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 620, fontFamily: sans(a), fontWeight: 650, fontSize: 76, lineHeight: 1.1, letterSpacing: '-0.035em', color: col(a, 'ink', '#0A0A0C') }}>
        {palabras.map((w, i) => (
          <span key={i} style={{ opacity: ease(t, 0.3 + i * 0.06, 0.6 + i * 0.06) }}>{w} </span>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 80, top: 1240, display: 'flex', gap: 12 }}>
        {Array.from({ length: estrellas }, (_, i) => {
          const v = sp(t, fps, 0.9 + palabras.length * 0.06 + i * 0.08, { damping: 10, stiffness: 220, mass: 0.6 });
          return <div key={i} style={{ fontSize: 56, color: col(a, 'amber', '#FF5C2A'), transform: `scale(${v})` }}>★</div>;
        })}
      </div>
      <div style={{ position: 'absolute', left: 80, top: 1340, opacity: ease(t, 1.2, 1.6) }}>
        <div style={{ fontFamily: sans(a), fontWeight: 700, fontSize: 44, color: col(a, 'ink', '#0A0A0C') }}>{p.autor ?? 'Cliente feliz'}</div>
        <div style={{ fontFamily: mono(a), fontSize: 26, letterSpacing: '0.1em', textTransform: 'uppercase', color: col(a, 'smoke', '#5F5C55'), marginTop: 6 }}>{p.cargo ?? ''}</div>
      </div>
    </AbsoluteFill>
  );
};

// ——— 6 · Llamada a la acción (tarjeta final) ———
const Cta: React.FC<{ esc: KitEsc }> = ({ esc }) => {
  const { t, fps } = useT(esc);
  const a = esc.ajustes;
  const p = esc.p;
  const v = (d: number) => sp(t, fps, d);
  const pulso = (t * 0.9) % 1;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: col(a, p.fondo ?? 'acid', '#C8FF3B') }} />
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(10,10,12,.12) 1.6px, transparent 1.8px)', backgroundSize: '30px 30px' }} />
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 330, gap: 0 }}>
        <div style={{ transform: `scale(${v(0.05)})` }}>
          <Logo a={a} size={150} />
        </div>
        <div style={{ marginTop: 60, fontFamily: sans(a), fontWeight: 800, fontSize: Number(p.tam ?? 170), letterSpacing: '-0.06em', lineHeight: 0.95, color: col(a, 'ink', '#0A0A0C'), textAlign: 'center', opacity: v(0.2), transform: `translateY(${(1 - v(0.2)) * 40}px)` }}>
          {String(p.titulo ?? 'Hablemos.').split('/').map((x: string, i: number) => (
            <div key={i}>{x.trim()}</div>
          ))}
        </div>
        <div style={{ marginTop: 40, fontFamily: sans(a), fontSize: 50, color: col(a, 'ink', '#0A0A0C'), opacity: v(0.45) * 0.75 }}>{p.sub ?? a.marca?.eslogan ?? ''}</div>
        <div style={{ position: 'relative', marginTop: 90, transform: `scale(${0.85 + 0.15 * v(0.6)})`, opacity: v(0.6) }}>
          <div style={{ position: 'absolute', inset: -14 - pulso * 40, borderRadius: 999, border: `3px solid ${col(a, 'ink', '#0A0A0C')}`, opacity: (1 - pulso) * 0.5 }} />
          <div style={{ background: col(a, 'ink', '#0A0A0C'), color: col(a, 'acid', '#C8FF3B'), borderRadius: 999, padding: '30px 60px', fontFamily: sans(a), fontWeight: 700, fontSize: 56, letterSpacing: '-0.03em' }}>{p.boton || a.marca?.cta || a.siteUrl || 'Escríbenos'}</div>
        </div>
        {a.whatsapp && p.mostrarWhatsapp !== false && <div style={{ marginTop: 40, fontFamily: mono(a), fontSize: 30, letterSpacing: '0.08em', color: col(a, 'ink', '#0A0A0C'), opacity: v(0.8) * 0.8 }}>WhatsApp · {a.whatsapp}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ——— 7 · Intro de marca (logo) ———
const Intro: React.FC<{ esc: KitEsc }> = ({ esc }) => {
  const { t, fps, dur } = useT(esc);
  const a = esc.ajustes;
  const p = esc.p;
  const nombre = String(p.nombre ?? a.marca?.nombre ?? 'Marca');
  const r = ease(t, 0, 0.7);
  const sal = ease(t, dur - 0.35, dur);
  return (
    <AbsoluteFill style={{ opacity: 1 - sal }}>
      <Fondo a={a} tono={p.fondo ?? 'ink'} t={t} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ clipPath: `circle(${r * 75}% at 50% 50%)`, transform: `scale(${1.25 - 0.25 * sp(t, fps, 0)}) rotate(${(1 - r) * -12}deg)` }}>
          <Logo a={a} size={220} />
        </div>
        <div style={{ marginTop: 56, display: 'flex', fontFamily: sans(a), fontWeight: 800, fontSize: 110, letterSpacing: '-0.05em', color: col(a, 'bone', '#F2EFE8') }}>
          {nombre.split('').map((c, i) => (
            <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: ease(t, 0.45 + i * 0.035, 0.75 + i * 0.035), transform: `translateY(${(1 - ease(t, 0.45 + i * 0.035, 0.8 + i * 0.035)) * 50}px)` }}>{c}</span>
          ))}
        </div>
        {(p.eslogan ?? a.marca?.eslogan) && <div style={{ marginTop: 24, fontFamily: mono(a), fontSize: 30, letterSpacing: '0.14em', textTransform: 'uppercase', color: col(a, 'acid', '#C8FF3B'), opacity: ease(t, 1.0, 1.4) }}>{p.eslogan ?? a.marca?.eslogan}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ——— 8 · Cierre de marca (outro) ———
const Outro: React.FC<{ esc: KitEsc }> = ({ esc }) => {
  const { t, fps } = useT(esc);
  const a = esc.ajustes;
  const p = esc.p;
  return (
    <AbsoluteFill>
      <Fondo a={a} tono={p.fondo ?? 'ink'} t={t} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${sp(t, fps, 0)})` }}>
          <Logo a={a} size={130} />
        </div>
        <div style={{ marginTop: 50, fontFamily: serif(a), fontStyle: 'italic', fontSize: 150, color: col(a, 'bone', '#F2EFE8'), opacity: ease(t, 0.2, 0.6) }}>{p.titulo ?? 'Gracias'}</div>
        <div style={{ marginTop: 30, fontFamily: sans(a), fontWeight: 650, fontSize: 52, color: col(a, 'acid', '#C8FF3B'), opacity: ease(t, 0.5, 0.9) }}>{p.url ?? a.siteUrl}</div>
        {p.usuario && <div style={{ marginTop: 18, fontFamily: mono(a), fontSize: 32, color: col(a, 'stone', '#8A867C'), opacity: ease(t, 0.7, 1.1) }}>{p.usuario}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const base = (o: Partial<TEscena>): Partial<TEscena> => ({ frase: null, preDefecto: 0, textos: [], transicion: { tipo: 'desenfoque', duracion: 12 } as any, ...o });

export const KIT: PlantillaKit[] = [
  {
    id: 'kit-gancho',
    nombre: 'Gancho cinético',
    descripcion: 'Titular grande que entra palabra a palabra con golpe; palabra clave resaltada.',
    categoria: 'Gancho',
    roles: [],
    campos: [
      { k: 'etiqueta', et: 'Etiqueta', tipo: 'texto' },
      { k: 'titulo', et: 'Titular (/ = línea)', tipo: 'area' },
      { k: 'acento', et: 'Palabra clave', tipo: 'texto' },
      { k: 'sub', et: 'Subtítulo', tipo: 'texto' },
      { k: 'tam', et: 'Tamaño', tipo: 'numero' },
      { k: 'ritmo', et: 'Ritmo (s/palabra)', tipo: 'numero' },
      { k: 'fondo', et: 'Fondo', tipo: 'color' },
    ],
    componente: Gancho,
    crear: () => base({ params: { etiqueta: 'Nueva web', titulo: '¿Tu web te / trae clientes?', acento: 'clientes', sub: '', tam: 150, ritmo: 0.11, fondo: 'ink' }, transicion: { tipo: 'corte', duracion: 0 } as any }),
  },
  {
    id: 'kit-dispositivo',
    nombre: 'Escaparate de dispositivo',
    descripcion: 'Teléfono o navegador flotando con inclinación 3D sobre la toma.',
    categoria: 'Producto',
    roles: ['principal'],
    campos: [
      { k: 'tipo', et: 'Dispositivo', tipo: 'opcion', ops: ['telefono', 'navegador'] },
      { k: 'etiqueta', et: 'Etiqueta', tipo: 'texto' },
      { k: 'fondo', et: 'Fondo', tipo: 'color' },
    ],
    componente: Dispositivo,
    crear: () => base({ params: { tipo: 'telefono', etiqueta: 'Diseñada para móvil', fondo: 'ink' }, tomas: [{ rol: 'principal', src: 'footage/m-cierre.mp4', t0: 0.5, velocidad: 1, suave: 'lin' }] }),
  },
  {
    id: 'kit-antes-despues',
    nombre: 'Antes / después',
    descripcion: 'Dos tomas o imágenes con un barrido que revela el después.',
    categoria: 'Producto',
    roles: ['antes', 'despues'],
    campos: [
      { k: 'antes', et: 'Etiqueta antes', tipo: 'texto' },
      { k: 'despues', et: 'Etiqueta después', tipo: 'texto' },
      { k: 'momento', et: 'Barrido en (s)', tipo: 'numero' },
      { k: 'duracionBarrido', et: 'Duración barrido (s)', tipo: 'numero' },
      { k: 'fondo', et: 'Fondo', tipo: 'color' },
    ],
    componente: AntesDespues,
    crear: () => base({ params: { antes: 'Antes', despues: 'Después', momento: 1.2, duracionBarrido: 1.1, fondo: 'bone' }, tomas: [{ rol: 'antes', src: 'footage/m-boceto.mp4', t0: 1.5, velocidad: 0, suave: 'lin' } as any, { rol: 'despues', src: 'footage/m-boceto.mp4', t0: 5.5, velocidad: 0, suave: 'lin' } as any] }),
  },
  {
    id: 'kit-lista',
    nombre: 'Lista / pasos',
    descripcion: 'Título y puntos que aparecen uno a uno, repartidos en la duración.',
    categoria: 'Contenido',
    roles: [],
    campos: [
      { k: 'titulo', et: 'Título', tipo: 'texto' },
      { k: 'items', et: 'Puntos (uno por línea)', tipo: 'lista' },
      { k: 'estilo', et: 'Marcador', tipo: 'opcion', ops: ['numeros', 'checks'] },
      { k: 'fondo', et: 'Fondo', tipo: 'color' },
    ],
    componente: Lista,
    crear: () => base({ params: { titulo: 'Cómo trabajamos', items: ['Descubrimiento', 'Diseño', 'Desarrollo', 'Lanzamiento'], estilo: 'numeros', fondo: 'ink' } }),
  },
  {
    id: 'kit-cita',
    nombre: 'Testimonio',
    descripcion: 'Cita grande con estrellas, nombre y cargo.',
    categoria: 'Prueba social',
    roles: [],
    campos: [
      { k: 'texto', et: 'Cita', tipo: 'area' },
      { k: 'autor', et: 'Autor', tipo: 'texto' },
      { k: 'cargo', et: 'Cargo / empresa', tipo: 'texto' },
      { k: 'estrellas', et: 'Estrellas', tipo: 'numero' },
      { k: 'fondo', et: 'Fondo', tipo: 'color' },
    ],
    componente: Cita,
    crear: () => base({ params: { texto: 'En dos semanas teníamos web nueva y los primeros pedidos.', autor: 'Cliente', cargo: 'Tienda online', estrellas: 5, fondo: 'bone' } }),
  },
  {
    id: 'kit-cta',
    nombre: 'Llamada a la acción',
    descripcion: 'Tarjeta final con logo, titular, botón con pulso y WhatsApp.',
    categoria: 'Cierre',
    roles: [],
    campos: [
      { k: 'titulo', et: 'Titular (/ = línea)', tipo: 'texto' },
      { k: 'sub', et: 'Subtítulo', tipo: 'texto' },
      { k: 'boton', et: 'Botón', tipo: 'texto' },
      { k: 'mostrarWhatsapp', et: 'Mostrar WhatsApp', tipo: 'si' },
      { k: 'fondo', et: 'Fondo', tipo: 'color' },
    ],
    componente: Cta,
    crear: () => base({ params: { titulo: 'Hablemos.', sub: 'Tu web empieza hoy.', boton: '', mostrarWhatsapp: true, fondo: 'acid' } }),
  },
  {
    id: 'kit-intro',
    nombre: 'Intro de marca',
    descripcion: 'Logo que se revela con máscara y el nombre letra a letra.',
    categoria: 'Marca',
    roles: [],
    campos: [
      { k: 'nombre', et: 'Nombre', tipo: 'texto' },
      { k: 'eslogan', et: 'Eslogan', tipo: 'texto' },
      { k: 'fondo', et: 'Fondo', tipo: 'color' },
    ],
    componente: Intro,
    crear: () => base({ params: {}, transicion: { tipo: 'corte', duracion: 0 } as any }),
  },
  {
    id: 'kit-outro',
    nombre: 'Cierre de marca',
    descripcion: 'Logo, «Gracias», web y usuario.',
    categoria: 'Marca',
    roles: [],
    campos: [
      { k: 'titulo', et: 'Titular', tipo: 'texto' },
      { k: 'url', et: 'Web', tipo: 'texto' },
      { k: 'usuario', et: 'Usuario / redes', tipo: 'texto' },
      { k: 'fondo', et: 'Fondo', tipo: 'color' },
    ],
    componente: Outro,
    crear: () => base({ params: { titulo: 'Gracias', usuario: '' } }),
  },
];
