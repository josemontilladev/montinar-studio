/** La página a escala (ajustada o con zoom), con la capa de interacción, el editor de texto y lo que se suelta encima. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Pagina, Tam } from '../esquema';
import { Lienzo } from './Lienzo';
import { Superposicion, type HistPagina } from './Superposicion';
import { EditorTexto } from './EditorTexto';
import type { Point } from './geometria';

export type Zoom = 'fit' | number;
export const ART_MIME = 'application/x-estudio-arte';
export const IMG_MIME = 'application/x-estudio-imagen';
export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 4;
const PAD = 48;

export function Escenario(props: {
  pagina: Pagina;
  tam: Tam;
  selected: string[];
  onSelect: (ids: string[]) => void;
  hist: HistPagina;
  zoom: Zoom;
  setZoom: (z: Zoom) => void;
  onFitScale: (s: number) => void;
  editingId: string | null;
  onEditText: (id: string | null) => void;
  onTextChange: (id: string, text: string) => void;
  onDropArt: (key: string, at: Point) => void;
  onDropImagen: (datos: string, at: Point) => void;
  onDropFiles: (files: File[], at: Point) => void;
  snap: boolean;
}) {
  const { pagina, tam, zoom } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.3);
  const [soltando, setSoltando] = useState(false);
  const ancla = useRef<{ cx: number; cy: number; mx: number; my: number } | null>(null);
  const scale = zoom === 'fit' ? fit : zoom;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const zoomRef = useRef(props.setZoom);
  zoomRef.current = props.setZoom;

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const medir = () => {
      const { width, height } = node.getBoundingClientRect();
      if (!width || !height) return;
      const s = Math.max(0.02, Math.min((width - PAD * 2) / tam.w, (height - PAD * 2) / tam.h));
      setFit(s);
      props.onFitScale(s);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(node);
    return () => ro.disconnect();
  }, [tam.w, tam.h]);

  // Ctrl + rueda: zoom hacia el puntero (el punto bajo el ratón no se mueve)
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const rueda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = node.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      ancla.current = { cx: (node.scrollLeft + mx) / scaleRef.current, cy: (node.scrollTop + my) / scaleRef.current, mx, my };
      const s = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scaleRef.current * Math.exp(-e.deltaY * 0.0015)));
      zoomRef.current(Math.round(s * 1000) / 1000);
    };
    node.addEventListener('wheel', rueda, { passive: false });
    return () => node.removeEventListener('wheel', rueda);
  }, []);
  useLayoutEffect(() => {
    const a = ancla.current;
    const node = wrapRef.current;
    if (!a || !node) return;
    ancla.current = null;
    node.scrollLeft = a.cx * scale - a.mx;
    node.scrollTop = a.cy * scale - a.my;
  }, [scale]);

  const editing = pagina.elements.find((e) => e.id === props.editingId);
  const hidden = useMemo(() => new Set(props.editingId ? [props.editingId] : []), [props.editingId]);
  const punto = (e: { clientX: number; clientY: number }): Point => {
    const r = boardRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * tam.w, y: ((e.clientY - r.top) / r.height) * tam.h };
  };

  return (
    <div
      ref={wrapRef}
      data-escenario
      className="lienzo-fondo relative min-h-0 min-w-0 flex-1 overflow-auto"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget || e.target === e.currentTarget.firstChild) {
          props.onSelect([]);
          props.onEditText(null);
        }
      }}
      onDragOver={(e) => {
        const t = e.dataTransfer.types;
        if (t.includes(ART_MIME) || t.includes(IMG_MIME) || t.includes('Files')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setSoltando(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.target === e.currentTarget) setSoltando(false);
      }}
      onDrop={(e) => {
        setSoltando(false);
        e.preventDefault();
        const at = punto(e);
        const key = e.dataTransfer.getData(ART_MIME);
        const img = e.dataTransfer.getData(IMG_MIME);
        if (key) props.onDropArt(key, at);
        else if (img) props.onDropImagen(img, at);
        else if (e.dataTransfer.files.length) props.onDropFiles([...e.dataTransfer.files], at);
      }}
    >
      <div className="flex min-h-full min-w-full items-center justify-center" style={{ padding: PAD, width: 'max-content', height: 'max-content' }}>
        <div ref={boardRef} data-pagina-lienzo className={`relative shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.35),0_18px_50px_-12px_rgba(0,0,0,0.6)] ${soltando ? 'outline-2 outline-offset-4 outline-primary' : ''}`} style={{ width: tam.w * scale, height: tam.h * scale }}>
          <Lienzo pagina={pagina} tam={tam} hiddenIds={hidden} className="absolute inset-0 block size-full" />
          <Superposicion pagina={pagina} tam={tam} scale={scale} selected={props.selected} onSelect={props.onSelect} hist={props.hist} editingId={props.editingId} onEditText={(id) => props.onEditText(id)} snap={props.snap} />
          {editing?.type === 'text' ? <EditorTexto el={editing} scale={scale} onChange={(t) => props.onTextChange(editing.id, t)} onDone={() => props.onEditText(null)} /> : null}
        </div>
      </div>
    </div>
  );
}
