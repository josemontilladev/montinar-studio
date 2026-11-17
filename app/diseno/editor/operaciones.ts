/** Operaciones puras e inmutables sobre una página (y el documento) del estudio. */
import type { Diseno, Elemento, ElTexto, Pagina, Tam } from '../esquema';
import { textWidth } from '../espejo/templates';

export type Box = { x: number; y: number; w: number; h: number };
export const MAX_ELEMENTOS = 300;

const azar = () => (crypto.randomUUID?.() ?? Math.random().toString(16).slice(2) + Date.now().toString(16)).replace(/-/g, '').slice(0, 8);

/** Id nuevo que no usa ningún elemento de la página. */
export function newId(p?: Pagina | null, extra: string[] = []): string {
  const usados = new Set([...(p?.elements.map((e) => e.id) ?? []), ...extra]);
  let id = azar();
  while (usados.has(id)) id = azar();
  return id;
}

/** Caja alineada a los ejes de un elemento (rotado o no). */
export function bounds(el: Box & { rotation?: number }): Box {
  const r = ((el.rotation ?? 0) * Math.PI) / 180;
  if (Math.abs(r) < 1e-6) return { x: el.x, y: el.y, w: el.w, h: el.h };
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  const w = el.w * cos + el.h * sin;
  const h = el.w * sin + el.h * cos;
  return { x: el.x + el.w / 2 - w / 2, y: el.y + el.h / 2 - h / 2, w, h };
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const x1 = Math.min(...boxes.map((b) => b.x));
  const y1 = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

const textHeight = (el: Pick<ElTexto, 'text' | 'fontSize' | 'lineHeight'>) => Math.max(1, Math.round(el.text.split('\n').length * el.fontSize * el.lineHeight));

/** Ancho aproximado de la línea más larga de un texto. */
export function textContentWidth(el: Pick<ElTexto, 'text' | 'fontSize' | 'letterSpacing'>): number {
  const widest = Math.max(...el.text.split('\n').map((l) => textWidth(l, el.fontSize) * 0.94 + l.length * el.letterSpacing * el.fontSize));
  return Math.max(20, Math.ceil(widest));
}

/** Corte de líneas voraz de un texto a un ancho. */
export function wrapText(text: string, maxW: number, fontSize: number): string {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, fontSize) * 0.94 > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

/** La altura de la caja de un texto sigue a su contenido. */
export const fitText = (el: ElTexto): ElTexto => ({ ...el, h: textHeight(el) });

export function mapElements(p: Pagina, ids: ReadonlySet<string> | string[], fn: (el: Elemento) => Elemento): Pagina {
  const set = Array.isArray(ids) ? new Set(ids) : ids;
  return { ...p, elements: p.elements.map((el) => (set.has(el.id) ? fn(el) : el)) };
}

export const addElements = (p: Pagina, els: Elemento[]): Pagina => ({ ...p, elements: [...p.elements, ...els].slice(-MAX_ELEMENTOS) });

export function removeElements(p: Pagina, ids: string[]): Pagina {
  const set = new Set(ids);
  return { ...p, elements: p.elements.filter((e) => !set.has(e.id)) };
}

/** Copias de unos elementos (con ids nuevos), desplazadas un poco. */
export function clonar(p: Pagina, els: Elemento[], d: number): Elemento[] {
  const nuevos: string[] = [];
  return els.map((el) => {
    const id = newId(p, nuevos);
    nuevos.push(id);
    return { ...el, id, x: el.x + d, y: el.y + d, locked: undefined };
  });
}

export function duplicateElements(p: Pagina, ids: string[]): { page: Pagina; ids: string[] } {
  const copias = clonar(p, p.elements.filter((e) => ids.includes(e.id)), 24);
  return { page: addElements(p, copias), ids: copias.map((e) => e.id) };
}

export type LayerMove = 'front' | 'forward' | 'backward' | 'back';

export function reorder(p: Pagina, ids: string[], move: LayerMove): Pagina {
  const set = new Set(ids);
  const els = [...p.elements];
  const picked = els.filter((e) => set.has(e.id));
  const rest = els.filter((e) => !set.has(e.id));
  if (move === 'front') return { ...p, elements: [...rest, ...picked] };
  if (move === 'back') return { ...p, elements: [...picked, ...rest] };
  if (move === 'forward') {
    for (let i = els.length - 2; i >= 0; i--) if (set.has(els[i].id) && !set.has(els[i + 1].id)) [els[i], els[i + 1]] = [els[i + 1], els[i]];
  } else {
    for (let i = 1; i < els.length; i++) if (set.has(els[i].id) && !set.has(els[i - 1].id)) [els[i], els[i - 1]] = [els[i - 1], els[i]];
  }
  return { ...p, elements: els };
}

/** Lleva un elemento a una posición de apilado (0 = abajo). */
export function moveToIndex(p: Pagina, id: string, index: number): Pagina {
  const from = p.elements.findIndex((e) => e.id === id);
  if (from === -1) return p;
  const els = [...p.elements];
  const [el] = els.splice(from, 1);
  els.splice(Math.max(0, Math.min(index, els.length)), 0, el);
  return { ...p, elements: els };
}

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' | 'bottom';

/** Alinea: un elemento, a la página; varios, a la caja que forman entre todos. */
export function alinear(p: Pagina, ids: string[], mode: AlignMode, tam: Tam): Pagina {
  const sel = p.elements.filter((e) => ids.includes(e.id) && !e.locked);
  const ref = sel.length > 1 ? unionBox(sel.map(bounds))! : { x: 0, y: 0, w: tam.w, h: tam.h };
  return mapElements(p, sel.map((e) => e.id), (el) => {
    const b = bounds(el);
    let dx = 0;
    let dy = 0;
    if (mode === 'left') dx = ref.x - b.x;
    if (mode === 'hcenter') dx = ref.x + (ref.w - b.w) / 2 - b.x;
    if (mode === 'right') dx = ref.x + ref.w - b.w - b.x;
    if (mode === 'top') dy = ref.y - b.y;
    if (mode === 'vmiddle') dy = ref.y + (ref.h - b.h) / 2 - b.y;
    if (mode === 'bottom') dy = ref.y + ref.h - b.h - b.y;
    return { ...el, x: Math.round(el.x + dx), y: Math.round(el.y + dy) };
  });
}

/** Reparte el espacio entre 3 o más elementos por igual (en horizontal o vertical). */
export function distribuir(p: Pagina, ids: string[], eje: 'h' | 'v'): Pagina {
  const sel = p.elements.filter((e) => ids.includes(e.id) && !e.locked).map((el) => ({ el, b: bounds(el) }));
  if (sel.length < 3) return p;
  const k = eje === 'h' ? 'x' : 'y';
  const d = eje === 'h' ? 'w' : 'h';
  sel.sort((a, b) => a.b[k] - b.b[k]);
  const ini = sel[0].b[k];
  const fin = Math.max(...sel.map((s) => s.b[k] + s.b[d]));
  const hueco = (fin - ini - sel.reduce((a, s) => a + s.b[d], 0)) / (sel.length - 1);
  const mov = new Map<string, number>();
  let pos = ini;
  for (const s of sel) {
    mov.set(s.el.id, pos - s.b[k]);
    pos += s.b[d] + hueco;
  }
  return mapElements(p, [...mov.keys()], (el) => ({ ...el, [k]: Math.round(el[k] + (mov.get(el.id) ?? 0)) }));
}

export const translate = (p: Pagina, ids: string[], dx: number, dy: number): Pagina => mapElements(p, ids, (el) => (el.locked ? el : { ...el, x: el.x + dx, y: el.y + dy }));

/** Cambia el tamaño del documento; con «escalar», los elementos se escalan y se centran en el nuevo lienzo. */
export function cambiarTamano(doc: Diseno, ancho: number, alto: number, escalar: boolean): Diseno {
  if (!escalar) return { ...doc, ancho, alto };
  const s = Math.min(ancho / doc.ancho, alto / doc.alto);
  const ox = (ancho - doc.ancho * s) / 2;
  const oy = (alto - doc.alto * s) / 2;
  const r = (n: number) => Math.round(n * 10) / 10;
  const esc = (el: Elemento): Elemento => {
    const g = { ...el, x: r(ox + el.x * s), y: r(oy + el.y * s), w: Math.max(1, r(el.w * s)), h: Math.max(1, r(el.h * s)) };
    if (g.type === 'text') return fitText({ ...g, fontSize: Math.max(4, r(g.fontSize * s)) });
    if (g.type === 'shape') return { ...g, strokeWidth: r(g.strokeWidth * s), radius: r(g.radius * s) };
    if (g.type === 'image') return { ...g, radius: r(g.radius * s) };
    return g;
  };
  return { ...doc, ancho, alto, paginas: doc.paginas.map((p) => ({ ...p, elements: p.elements.map(esc) })) };
}
