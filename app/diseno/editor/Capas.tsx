import { useState } from 'react';
import { ChevronDown, ChevronUp, Image, Lock, LockOpen, Palette, Shapes, Type } from 'lucide-react';
import type { Elemento, Pagina } from '../esquema';
import { getArt } from './biblioteca';

const LAYER_MIME = 'application/x-estudio-capa';

const nombre = (el: Elemento) =>
  el.type === 'text' ? el.text.replace(/\n/g, ' ').trim() || 'Texto vacío' : el.type === 'art' ? (getArt(el.art)?.item.label ?? 'Ilustración') : el.type === 'image' ? el.src.replace('recursos/', '') : el.shape === 'line' ? 'Línea' : el.shape === 'ellipse' ? 'Círculo' : 'Rectángulo';

function Icono({ el }: { el: Elemento }) {
  const c = 'size-3.5 shrink-0 text-base-content/50';
  return el.type === 'text' ? <Type className={c} /> : el.type === 'art' ? <Palette className={c} /> : el.type === 'image' ? <Image className={c} /> : <Shapes className={c} />;
}

/** Orden de apilado, la capa de arriba primero. Clic para seleccionar (Mayús: añadir), arrastrar para reordenar. */
export function Capas({ pagina, selected, onSelect, onMove, onLock }: { pagina: Pagina; selected: string[]; onSelect: (ids: string[]) => void; onMove: (id: string, index: number) => void; onLock: (id: string) => void }) {
  const [over, setOver] = useState<number | null>(null);
  const n = pagina.elements.length;
  if (n === 0) return <p className="px-3 py-4 text-xs text-base-content/50">La página está vacía.</p>;
  const filas = pagina.elements.map((el, index) => ({ el, index })).reverse();
  return (
    <ul className="space-y-0.5 p-1.5" aria-label="Capas" data-capas>
      {filas.map(({ el, index }) => {
        const activo = selected.includes(el.id);
        return (
          <li
            key={el.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(LAYER_MIME, el.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(LAYER_MIME)) return;
              e.preventDefault();
              setOver(index);
            }}
            onDragLeave={() => setOver((o) => (o === index ? null : o))}
            onDrop={(e) => {
              const id = e.dataTransfer.getData(LAYER_MIME);
              setOver(null);
              if (id) {
                e.preventDefault();
                onMove(id, index);
              }
            }}
            className={`group flex items-center gap-1 rounded-md border text-xs transition ${activo ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-base-200'} ${over === index ? 'border-t-2 border-t-primary' : ''}`}
          >
            <button
              type="button"
              onClick={(e) => onSelect(e.shiftKey ? (activo ? selected.filter((i) => i !== el.id) : [...selected, el.id]) : [el.id])}
              aria-pressed={activo}
              className="flex min-w-0 flex-1 cursor-grab items-center gap-1.5 px-2 py-1.5 text-left active:cursor-grabbing"
            >
              <Icono el={el} />
              <span className="truncate">{nombre(el)}</span>
            </button>
            <span className="flex shrink-0 pr-1">
              <button type="button" title={el.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => onLock(el.id)} className={`btn btn-ghost btn-xs btn-square h-6 min-h-0 w-6 ${el.locked ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                {el.locked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
              </button>
              <button type="button" aria-label="Subir capa" disabled={index === n - 1} onClick={() => onMove(el.id, index + 1)} className="btn btn-ghost btn-xs btn-square h-6 min-h-0 w-6 opacity-0 group-hover:opacity-100">
                <ChevronUp className="size-3.5" />
              </button>
              <button type="button" aria-label="Bajar capa" disabled={index === 0} onClick={() => onMove(el.id, index - 1)} className="btn btn-ghost btn-xs btn-square h-6 min-h-0 w-6 opacity-0 group-hover:opacity-100">
                <ChevronDown className="size-3.5" />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
