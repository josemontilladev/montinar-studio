/**
 * Revisión de calidad antes de exportar: zonas seguras por plataforma, contraste, velocidad de lectura, duración por
 * plataforma, medios que faltan, sonoridad y fluidez (de la última medición / exportación). Con arreglo en un clic
 * cuando se puede.
 */
import React, { useMemo, useState } from 'react';
import type { TProyecto, TTexto } from '@contrato/esquema';
import { tiempoLocal, type Linea } from '@contrato/linea';
import { FUENTES } from '@proyecto';
import { irA, useEd } from './estado';
import { faltantes } from './Visor';
import { Ico } from './iconos';
import { Fluidez } from './Dialogos';

/** Zonas que tapa la interfaz de cada plataforma (px sobre 1080 × 1920) y duración máxima recomendada. */
export const PLATAFORMAS = {
  reels: { nombre: 'Instagram Reels', arriba: 220, abajo: 420, der: 130, izq: 40, max: 90 },
  tiktok: { nombre: 'TikTok', arriba: 160, abajo: 480, der: 150, izq: 40, max: 600 },
  shorts: { nombre: 'YouTube Shorts', arriba: 200, abajo: 400, der: 140, izq: 40, max: 60 },
  stories: { nombre: 'Stories', arriba: 250, abajo: 250, der: 40, izq: 40, max: 60 },
} as const;
export type Plataforma = keyof typeof PLATAFORMAS;

export type Problema = { id: string; nivel: 'error' | 'aviso' | 'info'; titulo: string; detalle?: string; frame?: number; arreglo?: { et: string; fn: () => void } };

const lum = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contraste = (a: string, b: string) => {
  const x = lum(a),
    y = lum(b);
  if (x == null || y == null) return null;
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

let lienzo: CanvasRenderingContext2D | null = null;
/** Caja aproximada de un texto (px del lienzo) midiendo con las fuentes reales. */
export const cajaTexto = (t: TTexto, p: TProyecto) => {
  lienzo ??= document.createElement('canvas').getContext('2d');
  const lineas = t.tipo === 'nota' ? [t.texto] : t.texto.split(' / ');
  const fam = (k: string) => (FUENTES as Record<string, string>)[k] ?? k;
  let ancho = 0;
  for (const l of lineas) {
    let w = 0;
    let it = false;
    for (const raw of l.split(' ')) {
      if (raw.startsWith('*')) it = true;
      const pal = raw.replace(/\*/g, '');
      const tam = it ? t.tam * 1.1 : t.tam;
      lienzo!.font = it ? `italic 400 ${tam}px "${fam(p.ajustes.fuentes.serif)}"` : t.tipo === 'nota' ? `500 ${t.tam}px "${fam(p.ajustes.fuentes.mono)}"` : `650 ${tam}px "${fam(t.fuente ?? p.ajustes.fuentes.sans)}"`;
      w += lienzo!.measureText(pal).width * (t.tipo === 'nota' ? 1.25 : 0.95) + t.tam * 0.2;
      if (raw.includes('*') && !raw.startsWith('*')) it = false;
      if (raw.endsWith('*')) it = false;
    }
    ancho = Math.max(ancho, w);
  }
  const alto = t.tipo === 'nota' ? t.tam * 1.2 : lineas.length * t.tam * (t.interlineado ?? 0.98) + t.tam * 0.2;
  const x0 = t.alinear === 'center' ? t.x + (t.w - ancho) / 2 : t.alinear === 'right' ? t.x + t.w - ancho : t.x;
  return { x: x0, y: t.y, w: ancho, h: alto };
};

const tono = (p: TProyecto, f?: string) => {
  const k = f ?? 'ink';
  return p.ajustes.paleta[k] ?? ({ bone: '#F2EFE8', bone2: '#E8E4DA', ink: '#0A0A0C', acid: '#C8FF3B' } as Record<string, string>)[k] ?? k;
};

export const revisar = (p: TProyecto, l: Linea, pl: Plataforma, medios: { ruta: string }[], ctx: { sonoridad?: { lufs: number; pico: number } | null; fluidez?: any }): Problema[] => {
  const out: Problema[] = [];
  const z = PLATAFORMAS[pl];
  const fps = l.fps;
  const ed = useEd.getState().editar;
  const H = p.ajustes.alto,
    W = p.ajustes.ancho;
  // 1 · textos fuera de la zona segura y contraste
  p.escenas.forEach((e, i) => {
    const r = l.escenas[i];
    for (const t of e.textos) {
      const c = cajaTexto(t, p);
      const f = r.origen + tiempoLocal(t.desde, r.pre, fps, r.frase) + 8;
      const nombre = `«${t.texto.replace(/\*/g, '').replace(/ \/ /g, ' ').slice(0, 40)}» (${e.nombre || e.id})`;
      const fuera: string[] = [];
      if (c.y < z.arriba) fuera.push(`${Math.round(z.arriba - c.y)} px arriba`);
      if (c.y + c.h > H - z.abajo) fuera.push(`${Math.round(c.y + c.h - (H - z.abajo))} px abajo`);
      if (c.x < z.izq) fuera.push('borde izquierdo');
      if (c.x + c.w > W - z.der) fuera.push(`${Math.round(c.x + c.w - (W - z.der))} px bajo los botones`);
      if (fuera.length)
        out.push({
          id: `zona-${e.id}-${t.id}`,
          nivel: 'aviso',
          titulo: `Texto fuera de la zona segura de ${z.nombre}`,
          detalle: `${nombre}: ${fuera.join(', ')}`,
          frame: f,
          arreglo: {
            et: 'Meter en la zona',
            fn: () =>
              ed('revision', (d) => {
                const tx = d.escenas.find((x) => x.id === e.id)!.textos.find((x) => x.id === t.id)!;
                tx.y = Math.max(z.arriba + 10, Math.min(H - z.abajo - c.h - 10, tx.y));
                if (c.x + c.w > W - z.der || c.x < z.izq) {
                  tx.x = z.izq + 20;
                  tx.w = W - z.izq - z.der - 40;
                  if (c.w > tx.w) tx.tam = Math.floor(tx.tam * (tx.w / c.w));
                }
              }),
          },
        });
      const fondo = tono(p, e.fondo);
      const color = p.ajustes.paleta[t.color] ?? t.color;
      const k = contraste(color, fondo);
      if (k != null && k < 3 && e.plantilla !== 'completa')
        out.push({
          id: `contraste-${e.id}-${t.id}`,
          nivel: 'aviso',
          titulo: 'Poco contraste',
          detalle: `${nombre}: ${k.toFixed(1)}:1 sobre el fondo (mínimo recomendado 3:1, ideal 4,5:1)`,
          frame: f,
          arreglo: {
            et: 'Usar color legible',
            fn: () =>
              ed('revision', (d) => {
                const tx = d.escenas.find((x) => x.id === e.id)!.textos.find((x) => x.id === t.id)!;
                const kb = contraste(tono(p, 'bone'), fondo) ?? 0;
                const ki = contraste(tono(p, 'ink'), fondo) ?? 0;
                tx.color = kb >= ki ? 'bone' : 'ink';
              }),
          },
        });
      const dur = (l.textos.find((x) => x.escena === e.id && x.texto.id === t.id)?.fin ?? 0) - (l.textos.find((x) => x.escena === e.id && x.texto.id === t.id)?.inicio ?? 0);
      const palabras = t.texto.split(/\s+/).length;
      if (dur > 0 && dur / fps < Math.max(0.6, palabras * 0.18))
        out.push({ id: `corto-${e.id}-${t.id}`, nivel: 'info', titulo: 'Texto muy breve', detalle: `${nombre}: ${(dur / fps).toFixed(1)} s en pantalla para ${palabras} palabras`, frame: f });
    }
  });
  // 2 · subtítulos: zona segura y velocidad de lectura
  const s = p.subtitulos;
  if (s.visible && l.bloques.length) {
    const y = s.posicion === 'auto' ? H - p.ajustes.zonas.abajo - s.alto - 10 : s.y;
    if (y + s.alto > H - z.abajo || y < z.arriba)
      out.push({
        id: 'sub-zona',
        nivel: 'aviso',
        titulo: `Subtítulos bajo la interfaz de ${z.nombre}`,
        detalle: `La banda va de ${Math.round(y)} a ${Math.round(y + s.alto)} px; la zona libre acaba en ${H - z.abajo} px.`,
        arreglo: { et: 'Subir los subtítulos', fn: () => ed('revision', (d) => void ((d.subtitulos.posicion = 'manual'), (d.subtitulos.y = H - z.abajo - s.alto - 10))) },
      });
    const rapidos = l.bloques.map((b) => ({ b, cps: b.palabras.map((w) => w.p).join(' ').length / Math.max(0.2, b.hasta - b.desde) })).filter((x) => x.cps > 17);
    if (rapidos.length)
      out.push({
        id: 'sub-cps',
        nivel: rapidos.some((x) => x.cps > 22) ? 'aviso' : 'info',
        titulo: `Subtítulos rápidos de leer (${rapidos.length} bloque(s) > 17 car./s)`,
        detalle: rapidos
          .slice(0, 4)
          .map((x) => `«${x.b.palabras.map((w) => w.p).join(' ')}» ${x.cps.toFixed(0)} car./s`)
          .join(' · '),
        frame: Math.round(rapidos[0].b.desde * fps) + 3,
        arreglo: s.estilo !== 'pop' ? { et: 'Estilo palabra a palabra', fn: () => ed('revision', (d) => void ((d.subtitulos.estilo = 'pop'), (d.subtitulos.maxPalabras = 3), (d.subtitulos.maxLetras = 18))) } : undefined,
      });
  }
  // 3 · duración por plataforma
  const dur = l.total / fps;
  if (dur > z.max) out.push({ id: 'duracion', nivel: 'aviso', titulo: `Dura ${dur.toFixed(1)} s: más de lo recomendado para ${z.nombre} (${z.max} s)` });
  // 4 · medios que faltan y frases sin audio
  const fl = faltantes(p, medios as any);
  if (fl.length) out.push({ id: 'faltan', nivel: 'error', titulo: `Faltan ${fl.length} medio(s)`, detalle: fl.join(' · ') });
  for (const f of p.voz.frases) if (!f.archivo) out.push({ id: `sinaudio-${f.id}`, nivel: 'error', titulo: `La frase «${f.id}» no tiene audio`, detalle: 'Pulsa «Regenerar voz» en su inspector.', arreglo: { et: 'Abrir', fn: () => useEd.setState({ sel: { tipo: 'frase', id: f.id } }) } });
  // 5 · sonoridad (última medición)
  const so = ctx.sonoridad;
  if (!so) out.push({ id: 'lufs-sin', nivel: 'info', titulo: 'Sonoridad sin medir', detalle: 'Música → «Medir la mezcla (LUFS)».', arreglo: { et: 'Ir a Música', fn: () => useEd.setState({ sel: { tipo: 'musica' } }) } });
  else {
    const obj = p.ajustes.audio.objetivo;
    if (Math.abs(so.lufs - obj) > 1)
      out.push({
        id: 'lufs',
        nivel: 'aviso',
        titulo: `Sonoridad ${so.lufs} LUFS (objetivo ${obj})`,
        arreglo: { et: `Normalizar (${(obj - so.lufs > 0 ? '+' : '') + (Math.min(obj - so.lufs, -1 - so.pico)).toFixed(1)} dB)`, fn: () => ed('revision', (d) => void (d.ajustes.audio.ganancia = Math.round((d.ajustes.audio.ganancia + Math.min(obj - so.lufs, -1 - so.pico)) * 10) / 10)) },
      });
    if (so.pico > -1) out.push({ id: 'pico', nivel: 'aviso', titulo: `Picos de audio a ${so.pico} dBFS (riesgo de saturar)`, detalle: 'Deja al menos 1 dB de margen.' });
  }
  // 6 · fluidez (última exportación)
  if (ctx.fluidez) {
    const fz = ctx.fluidez;
    if (fz.tirones) out.push({ id: 'tirones', nivel: 'aviso', titulo: `${fz.tirones} fotograma(s) repetido(s) en movimiento en la última exportación`, detalle: fz.zonasTirones.slice(0, 6).map((x: any) => `${x.desde.toFixed(1)} s`).join(' · '), frame: Math.round((fz.zonasTirones[0]?.desde ?? 0) * fps) });
    if (fz.negros.length) out.push({ id: 'negros', nivel: 'aviso', titulo: `${fz.negros.length} tramo(s) en negro`, detalle: fz.negros.map((x: any) => `${x.desde.toFixed(1)}–${x.hasta.toFixed(1)} s`).join(' · '), frame: Math.round(fz.negros[0].desde * fps) });
  } else out.push({ id: 'fluidez-sin', nivel: 'info', titulo: 'Fluidez sin comprobar', detalle: 'Se comprueba sola al exportar (fotogramas repetidos, pausas y negros).' });
  // 7 · escenas más cortas que su transición
  p.escenas.forEach((e) => {
    if (e.transicion.tipo !== 'corte' && e.transicion.duracion >= e.duracion) out.push({ id: `trans-${e.id}`, nivel: 'aviso', titulo: `La transición de «${e.nombre || e.id}» dura más que la escena`, frame: l.escenas.find((x) => x.id === e.id)!.inicio });
  });
  return out;
};

export const ultimoResultado = (tipo: 'sonoridad' | 'fluidez') => {
  const ts = useEd.getState().trabajos.filter((t) => t.estado === 'hecho');
  if (tipo === 'sonoridad') return ts.find((t) => t.titulo === 'Medir sonoridad de la mezcla')?.resultado ?? null;
  return ts.find((t) => t.tipo === 'exportar' && t.resultado?.fluidez)?.resultado?.fluidez ?? null;
};

export const PanelRevision: React.FC<{ compacto?: boolean; plataforma?: Plataforma }> = ({ compacto, plataforma }) => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const medios = useEd((s) => s.medios);
  const trabajos = useEd((s) => s.trabajos);
  const [pl, setPl] = useState<Plataforma>(plataforma ?? 'reels');
  const plat = plataforma ?? pl;
  const ps = useMemo(() => revisar(p, l, plat, medios, { sonoridad: ultimoResultado('sonoridad'), fluidez: ultimoResultado('fluidez') }), [p, l, plat, medios, trabajos]);
  const n = { error: ps.filter((x) => x.nivel === 'error').length, aviso: ps.filter((x) => x.nivel === 'aviso').length };
  const fz = ultimoResultado('fluidez');
  return (
    <div data-prueba="revision">
      {!plataforma && (
        <div className="seg" style={{ marginBottom: 12 }}>
          {(Object.keys(PLATAFORMAS) as Plataforma[]).map((k) => (
            <button key={k} className={pl === k ? 'on' : ''} onClick={() => setPl(k)} data-plataforma={k}>
              {PLATAFORMAS[k].nombre}
            </button>
          ))}
        </div>
      )}
      <div className={`chip ${n.error ? 'error' : n.aviso ? 'aviso' : ''}`} style={{ marginBottom: 10 }} data-prueba="revision-resumen">
        {n.error ? `${n.error} error(es) · ` : ''}
        {n.aviso} aviso(s) · {ps.length - n.error - n.aviso} nota(s)
      </div>
      {fz && !compacto && <Fluidez f={fz} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {ps.map((x) => (
          <div key={x.id} className="v" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, background: 'var(--panel2)', borderLeft: `3px solid ${x.nivel === 'error' ? 'var(--rojo)' : x.nivel === 'aviso' ? 'var(--ambar)' : 'var(--borde2)'}` }} data-problema={x.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{x.titulo}</div>
              {x.detalle && <div style={{ color: 'var(--suave)', fontSize: 11.5, marginTop: 2 }}>{x.detalle}</div>}
            </div>
            {x.frame != null && (
              <button className="btn chico" onClick={() => irA(x.frame!)} title="Ir al momento">
                Ver
              </button>
            )}
            {x.arreglo && (
              <button className="btn chico prim" onClick={x.arreglo.fn} data-arreglo={x.id}>
                <Ico n="ajustes" s={13} /> {x.arreglo.et}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
