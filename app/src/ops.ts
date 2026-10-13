/** Operaciones de edición (sobre el borrador de immer). La pista de escenas es magnética: todo va en cadena (ripple). */
import type { Draft } from 'immer';
import type { TEscena, TProyecto, TTexto, TTiempo } from '@contrato/esquema';
import { escenaEn, tiempoLocal, type Linea } from '@contrato/linea';
import { nid } from './estado';
import { TRANSICIONES_INFO } from '@contrato/kit/biblioteca';

type P = Draft<TProyecto>;
const clon = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const idxEscena = (p: TProyecto, id: string) => p.escenas.findIndex((e) => e.id === id);

/** Divide la escena que hay bajo el cursor. Devuelve el id de la nueva (o null). */
export const dividir = (p: P, l: Linea, frame: number): string | null => {
  const i = escenaEn(l, frame);
  const e = p.escenas[i];
  const r = l.escenas[i];
  const k = frame - r.inicio;
  if (!e || k <= 0 || k >= e.duracion) return null;
  const b = clon(e) as TEscena;
  b.id = nid(`${e.id.replace(/-[a-z0-9]{7}$/, '')}-`);
  b.nombre = `${e.nombre || e.id} (2)`;
  b.duracion = e.duracion - k;
  b.recorte = e.recorte + k;
  // la segunda mitad sigue con el mismo «reloj» de la frase
  b.preDefecto = r.pre;
  b.transicion = { tipo: 'corte', duracion: 0 };
  b.textos = b.textos.map((t) => ({ ...t, id: nid('t') }));
  e.duracion = k;
  p.escenas.splice(i + 1, 0, b as any);
  return b.id;
};

/** Borra una escena (y la voz y efectos pegados a ella). */
export const borrarEscena = (p: P, id: string) => {
  if (p.escenas.length <= 1) return false;
  const i = idxEscena(p, id);
  if (i < 0) return false;
  p.escenas.splice(i, 1);
  p.voz.frases = p.voz.frases.filter((f) => f.escena !== id);
  p.sfx = p.sfx.filter((s) => s.escena !== id);
  return true;
};

export const duplicarEscena = (p: P, l: Linea, id: string): string | null => {
  const i = idxEscena(p, id);
  if (i < 0) return null;
  const b = clon(p.escenas[i]) as TEscena;
  b.id = nid(`${p.escenas[i].id.replace(/-[a-z0-9]{7}$/, '')}-`);
  b.nombre = `${p.escenas[i].nombre || p.escenas[i].id} (copia)`;
  b.preDefecto = l.escenas[i].pre;
  b.textos = b.textos.map((t) => ({ ...t, id: nid('t') }));
  p.escenas.splice(i + 1, 0, b as any);
  return b.id;
};

/** Mueve la escena `id` a la posición `a` (índice en el orden final). */
export const moverEscena = (p: P, id: string, a: number) => {
  const i = idxEscena(p, id);
  if (i < 0) return;
  const [e] = p.escenas.splice(i, 1);
  p.escenas.splice(Math.max(0, Math.min(p.escenas.length, a)), 0, e);
};

/** Recorta por un borde: izquierdo cambia el punto de entrada (recorte) y la duración; derecho, la duración. */
export const recortar = (p: P, id: string, lado: 'izq' | 'der', base: { duracion: number; recorte: number }, d: number) => {
  const e = p.escenas[idxEscena(p, id)];
  if (!e) return;
  if (lado === 'der') e.duracion = Math.max(1, base.duracion + d);
  else {
    const dd = Math.max(-base.recorte, Math.min(base.duracion - 1, d));
    e.recorte = base.recorte + dd;
    e.duracion = base.duracion - dd;
  }
};

/** Fotograma local (número) de un tiempo de texto, para poder moverlo (deja de estar anclado a una palabra). */
export const aLocal = (t: TTiempo, pre: number, fps: number, frase?: { palabras: { p: string; ini: number; fin: number }[] }) => tiempoLocal(t, pre, fps, frase);

export const nuevoTexto = (o: Partial<TTexto>): TTexto => ({
  id: nid('t'),
  tipo: 'titulo',
  texto: 'Nuevo *texto*.',
  desde: 0,
  hasta: null,
  x: 60,
  y: 250,
  w: 960,
  tam: 96,
  color: 'bone',
  acento: 'acid',
  alinear: 'center',
  animacion: 'mascara',
  escalonado: 2.5,
  brillo: 0,
  ...o,
}) as TTexto;

export const PRESETS_TEXTO: { id: string; nombre: string; desc: string; t: Partial<TTexto> }[] = [
  { id: 'titular', nombre: 'Titular', desc: 'Máscara palabra a palabra, arriba', t: { texto: 'Un titular *claro*.', tam: 100, y: 250, color: 'bone', acento: 'acid', alinear: 'center', animacion: 'mascara' } },
  { id: 'titular-osc', nombre: 'Titular sobre claro', desc: 'Tinta con acento violeta', t: { texto: 'Un titular *claro*.', tam: 100, y: 250, color: 'ink', acento: 'violet', alinear: 'center', animacion: 'mascara' } },
  { id: 'rotulo', nombre: 'Rótulo grande', desc: 'Dos líneas, centrado', t: { texto: 'Gran / *mensaje*.', tam: 150, y: 700, color: 'bone', acento: 'acid', alinear: 'center', animacion: 'pop', escalonado: 3 } },
  { id: 'nota', nombre: 'Nota mono', desc: 'Etiqueta pequeña con punto', t: { tipo: 'nota', texto: 'Anotación', tam: 24, y: 990, x: 64, color: 'smoke', punto: 'violet', alinear: 'left' } },
  { id: 'fundido', nombre: 'Fundido suave', desc: 'Aparece con fundido', t: { texto: 'Texto con *fundido*.', tam: 84, y: 1180, color: 'bone', acento: 'acid', alinear: 'center', animacion: 'fundido' } },
  { id: 'maquina', nombre: 'Máquina de escribir', desc: 'Palabra a palabra, seco', t: { texto: 'Palabra a palabra.', tam: 72, y: 1200, color: 'bone', alinear: 'center', animacion: 'maquina', escalonado: 4 } },
  { id: 'impacto', nombre: 'Impacto (Anton)', desc: 'Mayúsculas condensadas', t: { texto: 'OFERTA *HOY*', tam: 160, y: 600, color: 'acid', acento: 'bone', alinear: 'center', animacion: 'pop', fuente: 'Anton' } },
];

/** Todas las transiciones de la biblioteca (kit/biblioteca: las 11 originales y las nuevas). */
export const TRANS_INFO: Record<string, { nombre: string; icono: string; desc: string; cat: string }> = Object.fromEntries(
  TRANSICIONES_INFO.map((t) => [t.id, { nombre: t.nombre, icono: t.icono, desc: `${t.cat} · ${t.dur ? `${t.dur.toFixed(2)} s` : 'sin duración'}`, cat: t.cat }]),
);

/** Duración por defecto de cada transición (segundos): tiempos coherentes en todo el vídeo. */
export const DUR_TRANS: Record<string, number> = Object.fromEntries(TRANSICIONES_INFO.map((t) => [t.id, t.dur]));

export const ponerTransicion = (x: { transicion: { tipo: string; duracion: number } }, tipo: string, fps: number) => {
  x.transicion.tipo = tipo;
  x.transicion.duracion = Math.round((DUR_TRANS[tipo] ?? 0.5) * fps);
};
