/** Subtítulos automáticos (transcripción), edición de palabras, estilos predefinidos y exportación .srt / .vtt. */
import type { Draft } from 'immer';
import type { TProyecto, TSubtitulos } from '@contrato/esquema';
import type { Linea, PalabraSub } from '@contrato/linea';
import { api, type Trabajo } from './api';
import { useEd } from './estado';

// ——— Transcripción ———

type Pend = { tipo: 'voz' } | { tipo: 'pista'; src: string; inicio: number };
const pendientes = new Map<string, Pend>();

/** Transcribe las frases de voz (con el guion como referencia o no) o un audio cualquiera de public/. */
export const transcribir = async (o: { fuente: 'voz'; usarGuion: boolean; modelo: string } | { fuente: 'pista'; src: string; inicio: number; modelo: string }) => {
  const s = useEd.getState();
  const p = s.proyecto!;
  try {
    const items =
      o.fuente === 'voz'
        ? p.voz.frases.filter((f) => f.archivo).map((f) => ({ id: f.id, src: f.archivo, texto: o.usarGuion ? f.texto : '' }))
        : [{ id: 'pista', src: o.src }];
    const r = await api.subtitulos(items, o.modelo);
    pendientes.set(r.trabajo.id, o.fuente === 'voz' ? { tipo: 'voz' } : { tipo: 'pista', src: o.src, inicio: o.inicio });
    useEd.setState({ trabajos: [r.trabajo, ...useEd.getState().trabajos.filter((t) => t.id !== r.trabajo.id)] });
    s.avisar('Transcribiendo… (faster-whisper, en segundo plano)');
    return r.trabajo.id;
  } catch (e: any) {
    s.avisar(`No se pudo transcribir: ${e.message}`, 'error');
  }
};

export const aplicarSubtitulos = (ts: Trabajo[]) => {
  for (const t of ts) {
    const pend = pendientes.get(t.id);
    if (!pend || t.estado === 'corriendo') continue;
    pendientes.delete(t.id);
    const s = useEd.getState();
    if (t.estado !== 'hecho') {
      if (t.estado === 'error') s.avisar(`La transcripción falló: ${t.error ?? ''}`.slice(0, 200), 'error');
      continue;
    }
    const r = t.resultado as Record<string, { palabras: { p: string; ini: number; fin: number }[] }>;
    let n = 0;
    s.editar('subtitulos-auto', (d) => {
      if (pend.tipo === 'voz') {
        for (const f of d.voz.frases)
          if (r[f.id]) {
            f.palabras = r[f.id].palabras;
            n += f.palabras.length;
          }
        d.subtitulos.origen = 'voz';
      } else {
        d.subtitulos.pista = { src: pend.src, inicio: pend.inicio, palabras: r.pista?.palabras ?? [] };
        d.subtitulos.origen = 'pista';
        n = d.subtitulos.pista.palabras.length;
      }
      d.subtitulos.visible = true;
    });
    s.avisar(`Subtítulos listos · ${n} palabras`, 'ok');
  }
};

// ——— Edición de palabras (línea de tiempo) ———

/** Cambia texto o tiempos (segundos absolutos) de una palabra de subtítulo, venga de una frase o de la pista. */
export const editarPalabra = (d: Draft<TProyecto>, l: Linea, w: PalabraSub, c: { p?: string; ini?: number; fin?: number }) => {
  if (w.ref.tipo === 'frase') {
    const ref = w.ref;
    const f = d.voz.frases.find((x) => x.id === ref.id);
    const fr = l.frases.find((x) => x.id === ref.id);
    const x = f?.palabras[ref.i];
    if (!x || !fr) return;
    if (c.p != null) x.p = c.p;
    if (c.ini != null) x.ini = Math.round((c.ini - fr.inicioSeg) * 1000) / 1000;
    if (c.fin != null) x.fin = Math.round((c.fin - fr.inicioSeg) * 1000) / 1000;
  } else {
    const x = d.subtitulos.pista.palabras[w.ref.i];
    const t0 = d.subtitulos.pista.inicio / d.ajustes.fps;
    if (!x) return;
    if (c.p != null) x.p = c.p;
    if (c.ini != null) x.ini = Math.round((c.ini - t0) * 1000) / 1000;
    if (c.fin != null) x.fin = Math.round((c.fin - t0) * 1000) / 1000;
  }
};

export const borrarPalabra = (d: Draft<TProyecto>, w: PalabraSub) => {
  if (w.ref.tipo === 'frase') {
    const ref = w.ref;
    d.voz.frases.find((x) => x.id === ref.id)?.palabras.splice(ref.i, 1);
  } else d.subtitulos.pista.palabras.splice(w.ref.i, 1);
};

// ——— Estilos ———

export const ESTILOS_SUB: { id: TSubtitulos['estilo']; nombre: string; desc: string; aplicar: Partial<TSubtitulos> }[] = [
  { id: 'resaltado', nombre: 'Resaltado', desc: 'Caja oscura, la palabra que suena con fondo de color', aplicar: { estilo: 'resaltado', mayusculas: false, maxPalabras: 4, maxLetras: 24, maxLetrasLinea: 0, tam: 54 } },
  { id: 'karaoke', nombre: 'Karaoke', desc: 'Cada palabra se rellena de color al decirse', aplicar: { estilo: 'karaoke', mayusculas: false, maxPalabras: 6, maxLetras: 34, maxLetrasLinea: 20, tam: 58 } },
  { id: 'pop', nombre: 'Pop', desc: 'Palabra a palabra, grande y sin caja', aplicar: { estilo: 'pop', mayusculas: true, maxPalabras: 3, maxLetras: 18, maxLetrasLinea: 0, tam: 70 } },
  { id: 'limpio', nombre: 'Limpio', desc: 'Dos líneas, blanco con sombra, sin resaltar', aplicar: { estilo: 'limpio', mayusculas: false, maxPalabras: 10, maxLetras: 44, maxLetrasLinea: 22, tam: 50, sombra: true } },
];

// ——— .srt / .vtt ———

const ts = (s: number, sep: ',' | '.') => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000),
    m = Math.floor((ms % 3600000) / 60000),
    ss = Math.floor((ms % 60000) / 1000),
    r = ms % 1000;
  const p = (n: number, k = 2) => String(n).padStart(k, '0');
  return `${p(h)}:${p(m)}:${p(ss)}${sep}${p(r, 3)}`;
};

/** Texto de un bloque con sus saltos de línea. */
const textoBloque = (b: Linea['bloques'][number], mayus: boolean) => {
  const t = b.lineas.map((ln) => ln.map((i) => b.palabras[i].p).join(' ')).join('\n');
  return mayus ? t.toUpperCase() : t;
};

export const aSrt = (l: Linea, p: TProyecto) =>
  l.bloques.map((b, i) => `${i + 1}\n${ts(Math.max(0, b.desde), ',')} --> ${ts(b.hasta, ',')}\n${textoBloque(b, p.subtitulos.mayusculas)}\n`).join('\n');

export const aVtt = (l: Linea, p: TProyecto) => `WEBVTT\n\n${l.bloques.map((b) => `${ts(Math.max(0, b.desde), '.')} --> ${ts(b.hasta, '.')}\n${textoBloque(b, p.subtitulos.mayusculas)}\n`).join('\n')}`;

export const descargar = (nombre: string, texto: string, tipo = 'text/plain') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
