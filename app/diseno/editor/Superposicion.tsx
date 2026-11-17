/** Capa de interacción sobre la página: seleccionar, mover, redimensionar, rotar, marco de selección e imanes. */
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Elemento, Pagina, Tam } from '../esquema';
import { bounds, translate, unionBox, type Box } from './operaciones';
import { HANDLES, intersects, resizeElement, rotationTo, snapBox, snapTargets, type Guides, type Handle, type Point } from './geometria';
import { HitTargets, Medidas, SelectionChrome } from './Marcas';

/** Historial visto desde una página: la página actual y gestos continuos. */
export type HistPagina = { current: () => Pagina; preview: (p: Pagina) => void; begin: () => void; end: () => void };

type Gesture =
  | { kind: 'move'; ids: string[]; start: Point; base: Pagina; box: Box; moved: boolean; clickId: string }
  | { kind: 'resize'; id: string; handle: Handle; start: Point; orig: Elemento; base: Pagina }
  | { kind: 'rotate'; id: string; center: Point; base: Pagina }
  | { kind: 'marquee'; start: Point; current: Point; base: string[] };

const byId = (p: Pagina, id: string) => p.elements.find((e) => e.id === id);

export function Superposicion(props: { pagina: Pagina; tam: Tam; scale: number; selected: string[]; onSelect: (ids: string[]) => void; hist: HistPagina; onEditText: (id: string) => void; editingId: string | null; snap: boolean }) {
  const { pagina, tam, scale, selected, onSelect, hist } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const lastHit = useRef<string | null>(null);
  const frame = useRef<number | null>(null);
  const latest = useRef<{ p: Point; shift: boolean; alt: boolean } | null>(null);
  const [guides, setGuides] = useState<Guides>({ xs: [], ys: [] });
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [activo, setActivo] = useState<string | null>(null);
  const u = 1 / scale;

  const toPoint = (e: { clientX: number; clientY: number }): Point => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return { x: 0, y: 0 };
    return { x: ((e.clientX - r.left) * tam.w) / r.width, y: ((e.clientY - r.top) * tam.h) / r.height };
  };

  function apply(p: Point, shift: boolean, alt: boolean) {
    const g = gesture.current;
    if (!g) return;
    const threshold = props.snap && !alt ? 6 * u : 0;
    if (g.kind === 'move') {
      let dx = p.x - g.start.x;
      let dy = p.y - g.start.y;
      if (!g.moved && Math.hypot(dx, dy) < 3 * u) return;
      g.moved = true;
      if (shift) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const s = snapBox({ ...g.box, x: g.box.x + dx, y: g.box.y + dy }, snapTargets(g.base.elements, new Set(g.ids), tam), threshold);
      setGuides(s.guides);
      hist.preview(translate(g.base, g.ids, Math.round((dx + s.dx) * 10) / 10, Math.round((dy + s.dy) * 10) / 10));
    } else if (g.kind === 'resize') {
      const proporcional = g.orig.type === 'art' || g.orig.type === 'image';
      const r = resizeElement(g.orig, g.handle, { x: p.x - g.start.x, y: p.y - g.start.y }, { keepRatio: proporcional ? !shift : shift, targets: snapTargets(g.base.elements, new Set([g.id]), tam), threshold });
      setGuides(r.guides);
      hist.preview({ ...g.base, elements: g.base.elements.map((e) => (e.id === g.id ? r.el : e)) });
    } else if (g.kind === 'rotate') {
      const rotation = rotationTo(g.center, p, shift);
      hist.preview({ ...g.base, elements: g.base.elements.map((e) => (e.id === g.id ? { ...e, rotation } : e)) });
    } else {
      g.current = p;
      const box = { x: Math.min(g.start.x, p.x), y: Math.min(g.start.y, p.y), w: Math.abs(p.x - g.start.x), h: Math.abs(p.y - g.start.y) };
      setMarquee(box);
      const hit = pagina.elements.filter((e) => intersects(bounds(e), box)).map((e) => e.id);
      onSelect([...new Set([...g.base, ...hit])]);
    }
  }

  function onPointerDown(e: RPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const target = e.target instanceof Element ? e.target : null;
    const p = toPoint(e);
    const handleAttr = target?.getAttribute('data-handle');
    const hitId = target?.closest('[data-hit]')?.getAttribute('data-hit') ?? null;
    lastHit.current = hitId;
    const base = hist.current();
    if (handleAttr && selected.length === 1) {
      const el = byId(base, selected[0]);
      if (!el || el.locked) return;
      if (handleAttr === 'rotate') gesture.current = { kind: 'rotate', id: el.id, center: { x: el.x + el.w / 2, y: el.y + el.h / 2 }, base };
      else {
        const handle = HANDLES.find((h) => `${h.hx},${h.hy}` === handleAttr);
        if (!handle) return;
        gesture.current = { kind: 'resize', id: el.id, handle, start: p, orig: el, base };
      }
      setActivo(el.id);
    } else if (hitId) {
      let ids = selected;
      if (e.shiftKey || e.ctrlKey) ids = selected.includes(hitId) ? selected.filter((i) => i !== hitId) : [...selected, hitId];
      else if (!selected.includes(hitId)) ids = [hitId];
      onSelect(ids);
      const movable = ids.filter((id) => !byId(base, id)?.locked);
      const box = unionBox(movable.flatMap((id) => (byId(base, id) ? [bounds(byId(base, id)!)] : [])));
      if (!box || ((e.shiftKey || e.ctrlKey) && !ids.includes(hitId))) return;
      gesture.current = { kind: 'move', ids: movable, start: p, base, box, moved: false, clickId: hitId };
    } else {
      const keep = e.shiftKey ? selected : [];
      if (!e.shiftKey) onSelect([]);
      gesture.current = { kind: 'marquee', start: p, current: p, base: keep };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    hist.begin();
  }

  function onPointerMove(e: RPointerEvent<SVGSVGElement>) {
    if (!gesture.current) return;
    latest.current = { p: toPoint(e), shift: e.shiftKey, alt: e.altKey };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const l = latest.current;
      if (l) apply(l.p, l.shift, l.alt);
    });
  }

  function onPointerUp(e: RPointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g) return;
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
      const l = latest.current;
      if (l) apply(l.p, l.shift, l.alt);
    }
    if (g.kind === 'move' && !g.moved && !e.shiftKey && selected.length > 1) onSelect([g.clickId]);
    gesture.current = null;
    latest.current = null;
    hist.end();
    setGuides({ xs: [], ys: [] });
    setMarquee(null);
    setActivo(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function onDoubleClick() {
    const el = lastHit.current ? byId(pagina, lastHit.current) : undefined;
    if (el?.type === 'text' && !el.locked) props.onEditText(el.id);
  }

  const sel = pagina.elements.filter((el) => selected.includes(el.id));
  const enGesto = activo ? byId(pagina, activo) : undefined;
  return (
    <svg
      ref={svgRef}
      data-superposicion
      viewBox={`0 0 ${tam.w} ${tam.h}`}
      className="absolute inset-0 size-full touch-none select-none"
      style={{ overflow: 'visible' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      role="presentation"
    >
      <HitTargets elements={pagina.elements} selected={selected} u={u} />
      <SelectionChrome sel={sel} u={u} tam={tam} editingId={props.editingId} marquee={marquee} guides={guides} />
      {enGesto ? <Medidas el={enGesto} u={u} /> : null}
    </svg>
  );
}
