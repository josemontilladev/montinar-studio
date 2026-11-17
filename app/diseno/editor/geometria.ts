/** Geometría del lienzo: imanes (snapping), redimensionar y rotar. */
import type { Elemento, Tam } from '../esquema';
import { bounds, fitText, type Box } from './operaciones';

export type Point = { x: number; y: number };
export type Guides = { xs: number[]; ys: number[] };

/** Bordes y centros a los que imantar: la página y cada elemento que no se mueve. */
export function snapTargets(elements: Elemento[], exclude: ReadonlySet<string>, tam: Tam): Guides {
  const xs = [0, tam.w / 2, tam.w];
  const ys = [0, tam.h / 2, tam.h];
  for (const el of elements) {
    if (exclude.has(el.id)) continue;
    const b = bounds(el);
    xs.push(b.x, b.x + b.w / 2, b.x + b.w);
    ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  return { xs, ys };
}

function nearest(values: number[], targets: number[], threshold: number): { delta: number; at: number[] } | null {
  let best: { delta: number; at: number[] } | null = null;
  for (const v of values)
    for (const t of targets) {
      const d = t - v;
      if (Math.abs(d) > threshold) continue;
      if (!best || Math.abs(d) < Math.abs(best.delta) - 0.01) best = { delta: d, at: [t] };
      else if (Math.abs(d - best.delta) < 0.01 && !best.at.includes(t)) best.at.push(t);
    }
  return best;
}

export function snapBox(box: Box, targets: Guides, threshold: number): { dx: number; dy: number; guides: Guides } {
  const sx = nearest([box.x, box.x + box.w / 2, box.x + box.w], targets.xs, threshold);
  const sy = nearest([box.y, box.y + box.h / 2, box.y + box.h], targets.ys, threshold);
  return { dx: sx?.delta ?? 0, dy: sy?.delta ?? 0, guides: { xs: sx?.at ?? [], ys: sy?.at ?? [] } };
}

const rot = (p: Point, deg: number): Point => {
  const r = (deg * Math.PI) / 180;
  return { x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) };
};

export type Handle = { hx: -1 | 0 | 1; hy: -1 | 0 | 1 };

export const HANDLES: (Handle & { cursor: string })[] = [
  { hx: -1, hy: -1, cursor: 'nwse-resize' },
  { hx: 0, hy: -1, cursor: 'ns-resize' },
  { hx: 1, hy: -1, cursor: 'nesw-resize' },
  { hx: 1, hy: 0, cursor: 'ew-resize' },
  { hx: 1, hy: 1, cursor: 'nwse-resize' },
  { hx: 0, hy: 1, cursor: 'ns-resize' },
  { hx: -1, hy: 1, cursor: 'nesw-resize' },
  { hx: -1, hy: 0, cursor: 'ew-resize' },
];

/** Tiradores de un elemento: el texto escala desde las esquinas y se estira a los lados. */
export const handlesFor = (el: Elemento) => (el.type === 'text' ? HANDLES.filter((h) => h.hx !== 0) : HANDLES);

const MIN = 6;

/** Redimensiona arrastrando un tirador (dx, dy), con el lado/esquina opuesto fijo aunque esté rotado. */
export function resizeElement(el: Elemento, handle: Handle, delta: Point, opts: { keepRatio: boolean; targets?: Guides; threshold: number }): { el: Elemento; guides: Guides } {
  const { hx, hy } = handle;
  const local = rot(delta, -el.rotation);
  let w = Math.max(MIN, el.w + hx * local.x);
  let h = Math.max(MIN, el.h + hy * local.y);
  const textCorner = el.type === 'text' && hx !== 0 && hy !== 0;
  const keep = opts.keepRatio || textCorner;
  if (keep) {
    const s = hx === 0 ? h / el.h : hy === 0 ? w / el.w : Math.max(w / el.w, h / el.h);
    w = Math.max(MIN, el.w * s);
    h = Math.max(MIN, el.h * s);
  }
  let guides: Guides = { xs: [], ys: [] };
  if (!keep && el.rotation === 0 && opts.targets) {
    const edgeX = hx === 1 ? el.x + w : hx === -1 ? el.x + el.w - w : null;
    const edgeY = hy === 1 ? el.y + h : hy === -1 ? el.y + el.h - h : null;
    const sx = edgeX === null ? null : nearest([edgeX], opts.targets.xs, opts.threshold);
    const sy = edgeY === null ? null : nearest([edgeY], opts.targets.ys, opts.threshold);
    if (sx) w = Math.max(MIN, w + hx * sx.delta);
    if (sy) h = Math.max(MIN, h + hy * sy.delta);
    guides = { xs: sx?.at ?? [], ys: sy?.at ?? [] };
  }
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const a0 = rot({ x: (-hx * el.w) / 2, y: (-hy * el.h) / 2 }, el.rotation);
  const anchor = { x: c.x + a0.x, y: c.y + a0.y };
  const a1 = rot({ x: (-hx * w) / 2, y: (-hy * h) / 2 }, el.rotation);
  const nc = { x: anchor.x - a1.x, y: anchor.y - a1.y };
  const box = { x: nc.x - w / 2, y: nc.y - h / 2, w, h };
  if (el.type === 'text') {
    const fontSize = textCorner ? Math.min(1200, Math.max(4, Math.round(el.fontSize * (w / el.w) * 10) / 10)) : el.fontSize;
    const next = fitText({ ...el, ...box, fontSize });
    return { el: { ...next, y: hy === -1 ? el.y + el.h - next.h : next.y }, guides };
  }
  return { el: { ...el, ...box }, guides };
}

/** Rotación (grados) que apunta el tirador superior a `p`: con Mayús de 15 en 15, imantada a 45° cerca. */
export function rotationTo(center: Point, p: Point, shift: boolean): number {
  let deg = (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI + 90;
  if (shift) deg = Math.round(deg / 15) * 15;
  else {
    const near = Math.round(deg / 45) * 45;
    if (Math.abs(deg - near) < 4) deg = near;
  }
  deg = ((((deg + 180) % 360) + 360) % 360) - 180;
  return Math.round(deg * 10) / 10;
}

export const intersects = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
