/** Paneles de la barra izquierda: texto, formas, marca, fondo, imágenes y portadas de artículos. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import type { Elemento, Pagina, Tam } from '../esquema';
import { C } from '../espejo/parts';
import { apiDisenos, urlRecurso, type MiImagen } from '../api';
import { BIBLIOTECA, isDarkColor } from './biblioteca';
import { ColorField, PALETA } from './Campos';
import { IMG_MIME } from './Escenario';
import { escala, makePill, makeShape, makeText, PRESETS_TEXTO, type ShapeKind, type TextPreset } from './fabrica';
import { Ficha } from './PanelBiblioteca';

type Add = (els: Elemento[]) => void;
export const Titulo = ({ children }: { children: ReactNode }) => <h3 className="text-[0.7rem] font-semibold uppercase tracking-wide text-base-content/55">{children}</h3>;
const tarjeta = 'rounded-lg border border-base-300 bg-panel2 transition hover:border-primary/60';

const FORMAS: { kind: ShapeKind; label: string; dibujo: ReactNode }[] = [
  { kind: 'rect', label: 'Rectángulo', dibujo: <rect x={6} y={14} width={52} height={36} fill="currentColor" /> },
  { kind: 'rounded', label: 'Redondeado', dibujo: <rect x={6} y={14} width={52} height={36} rx={10} fill="currentColor" /> },
  { kind: 'circle', label: 'Círculo', dibujo: <circle cx={32} cy={32} r={20} fill="currentColor" /> },
  { kind: 'line', label: 'Línea', dibujo: <line x1={8} y1={32} x2={56} y2={32} stroke="currentColor" strokeWidth={5} strokeLinecap="round" /> },
];

export function PanelFormas({ pagina, tam, onAdd }: { pagina: Pagina; tam: Tam; onAdd: Add }) {
  return (
    <div className="space-y-2">
      <Titulo>Formas básicas</Titulo>
      <div className="grid grid-cols-2 gap-1.5">
        {FORMAS.map((s) => (
          <button key={s.kind} type="button" data-forma={s.kind} onClick={() => onAdd([makeShape(pagina, s.kind, tam)])} className={`${tarjeta} flex flex-col items-center gap-1 p-2 text-[0.7rem] text-base-content/75`}>
            <svg viewBox="0 0 64 64" className="size-12 text-base-content/80" aria-hidden="true">
              {s.dibujo}
            </svg>
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-[0.7rem] leading-snug text-base-content/50">Relleno, borde y radio en el panel de la derecha.</p>
    </div>
  );
}

const ESTILO_TEXTO: Record<TextPreset, string> = { title: 'text-xl font-bold tracking-tight', subtitle: 'text-sm font-semibold', body: 'text-xs', label: 'font-mono text-[0.7rem] font-semibold tracking-widest' };

export function PanelTexto({ pagina, tam, onAdd }: { pagina: Pagina; tam: Tam; onAdd: Add }) {
  return (
    <div className="space-y-2">
      <Titulo>Estilos de texto</Titulo>
      {(Object.keys(PRESETS_TEXTO) as TextPreset[]).map((t) => (
        <button key={t} type="button" data-texto={t} onClick={() => onAdd([makeText(pagina, t, tam)])} className={`${tarjeta} block w-full px-3 py-2.5 text-left ${ESTILO_TEXTO[t]}`} style={t === 'label' ? undefined : { fontFamily: t === 'body' ? 'Inter, sans-serif' : "'Inter Tight', Inter, sans-serif" }}>
          {t === 'label' ? 'ETIQUETA' : `Añadir ${PRESETS_TEXTO[t].nombre.toLowerCase()}`}
        </button>
      ))}
      <p className="text-[0.7rem] leading-snug text-base-content/50">Doble clic en un texto del lienzo para escribir sobre él.</p>
    </div>
  );
}

const CLAVES_MARCA = ['brand-logo', 'brand-wordmark', 'brand-m', 'brand-tile', 'brand-dot', 'brand-marker'];

export function PanelMarca({ pagina, tam, onAdd, onAddArt }: { pagina: Pagina; tam: Tam; onAdd: Add; onAddArt: (k: string) => void }) {
  const oscuro = isDarkColor(pagina.background);
  const [cat, setCat] = useState('Guía SEO');
  const fs = Math.round(26 * escala(tam));
  return (
    <div className="space-y-3">
      <Titulo>Logo y acentos</Titulo>
      <div className="grid grid-cols-3 gap-1.5">
        {CLAVES_MARCA.filter((k) => BIBLIOTECA[k]).map((k) => (
          <Ficha key={k} id={k} item={BIBLIOTECA[k]} onAdd={onAddArt} />
        ))}
      </div>
      <Titulo>Píldora de categoría</Titulo>
      <input value={cat} onChange={(e) => setCat(e.target.value)} className="input input-xs w-full bg-panel3 text-xs" aria-label="Texto de la píldora" />
      <button type="button" data-pildora onClick={() => onAdd(makePill(pagina, { label: cat.trim() || 'Categoría', x: Math.round(tam.w * 0.06), y: Math.round(tam.h * 0.06), fontSize: fs, bg: oscuro ? C.mint : C.ink, fg: oscuro ? C.ink : C.white }))} className={`${tarjeta} flex w-full items-center gap-2 p-2.5 text-left text-xs`}>
        <span className="rounded-full bg-[#212121] px-2.5 py-1 text-[0.7rem] font-semibold text-white">{cat.trim() || 'Categoría'}</span>
        <span className="text-base-content/55">forma + texto</span>
      </button>
    </div>
  );
}

const suave = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(m[1].slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},0.22)`;
};

export function PanelFondo({ pagina, onChange }: { pagina: Pagina; onChange: (p: Partial<Pick<Pagina, 'background' | 'dots' | 'dotColor'>>, key: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Titulo>Color de fondo</Titulo>
        <div className="grid grid-cols-5 gap-1.5">
          {PALETA.map((s) => (
            <button key={s.color} type="button" title={s.name} data-fondo={s.color} onClick={() => onChange({ background: s.color, dotColor: undefined }, 'bg')} className={`aspect-square rounded-lg border border-white/10 transition hover:scale-105 ${pagina.background.toLowerCase() === s.color ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''}`} style={{ backgroundColor: s.color }} />
          ))}
        </div>
        <ColorField label="Color personalizado" value={pagina.background} onChange={(background) => onChange({ background }, 'bg')} />
      </div>
      <div className="space-y-2">
        <Titulo>Retícula de puntos</Titulo>
        <label className="flex cursor-pointer items-center justify-between gap-2 text-xs">
          Mostrar puntos
          <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={pagina.dots} onChange={(e) => onChange({ dots: e.target.checked }, 'dots')} />
        </label>
        {pagina.dots ? <ColorField label="Color de los puntos" value={pagina.dotColor} clearLabel="Automático" onClear={() => onChange({ dotColor: undefined }, 'dotColor')} onChange={(c) => onChange({ dotColor: suave(c) }, 'dotColor')} /> : null}
      </div>
    </div>
  );
}

export function PanelImagenes({ onFiles, onMia, version }: { onFiles: (f: File[]) => void; onMia: (m: MiImagen) => void; version: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [mias, setMias] = useState<MiImagen[]>([]);
  useEffect(() => {
    apiDisenos.misImagenes().then(setMias).catch(() => setMias([]));
  }, [version]);
  return (
    <div className="space-y-3">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml" multiple hidden data-subir-imagen onChange={(e) => (onFiles([...(e.target.files ?? [])]), (e.target.value = ''))} />
      <button type="button" className="btn btn-primary btn-sm w-full gap-1.5" onClick={() => input.current?.click()}>
        <Upload className="size-4" /> Subir imágenes
      </button>
      <p className="text-[0.7rem] leading-snug text-base-content/50">También puedes arrastrar archivos desde el Explorador al lienzo o pegarlos con Ctrl+V. Se copian dentro de la carpeta del diseño.</p>
      <Titulo>Mis imágenes</Titulo>
      {mias.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-base-300 p-5 text-center text-xs text-base-content/50">
          <ImagePlus className="size-6" />
          Aún no has subido imágenes.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5" data-mis-imagenes>
          {mias.map((m) => (
            <button
              key={`${m.id}/${m.src}`}
              type="button"
              draggable
              title={`${m.nombre} · ${m.id}`}
              onDragStart={(e) => {
                e.dataTransfer.setData(IMG_MIME, JSON.stringify(m));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onMia(m)}
              className="aspect-square overflow-hidden rounded-lg border border-base-300 bg-[repeating-conic-gradient(#2a2a2f_0_25%,#222226_0_50%)] bg-[length:16px_16px] hover:border-primary/60"
            >
              <img src={urlRecurso(m.id, m.src)} alt="" loading="lazy" className="size-full object-contain" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PanelPortadas({ onPortada }: { onPortada: (key: string) => void }) {
  const portadas = Object.entries(BIBLIOTECA).filter(([, it]) => it.slug);
  return (
    <div className="space-y-2">
      <Titulo>Empezar desde la portada de un artículo</Titulo>
      <p className="text-[0.7rem] leading-snug text-base-content/50">Sustituye la página actual por el color de campo y la ilustración del artículo; después edítala como quieras.</p>
      <div className="grid grid-cols-2 gap-1.5">
        {portadas.map(([k, it]) => (
          <Ficha key={k} id={k} item={it} onAdd={onPortada} ancho />
        ))}
      </div>
    </div>
  );
}
