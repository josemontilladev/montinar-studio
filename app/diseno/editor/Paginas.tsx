/** Tira de páginas (carruseles): miniaturas, añadir, duplicar, reordenar (arrastrando o con flechas) y borrar. */
import { memo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import type { Pagina, Tam } from '../esquema';
import { Lienzo } from './Lienzo';

const PAG_MIME = 'application/x-estudio-pagina';
const Mini = memo(function Mini({ pagina, tam }: { pagina: Pagina; tam: Tam }) {
  return <Lienzo pagina={pagina} tam={tam} className="block h-full w-auto" />;
});

export function Paginas(props: { paginas: Pagina[]; tam: Tam; actual: number; onIr: (i: number) => void; onNueva: () => void; onDuplicar: (i: number) => void; onBorrar: (i: number) => void; onMover: (de: number, a: number) => void }) {
  const { paginas, tam, actual } = props;
  const [sobre, setSobre] = useState<number | null>(null);
  const alto = 64;
  return (
    <div className="flex h-[104px] shrink-0 items-center gap-2 overflow-x-auto border-t border-base-300 bg-base-100 px-3" data-paginas>
      {paginas.map((p, i) => (
        <div
          key={p.id}
          draggable
          onDragStart={(e) => e.dataTransfer.setData(PAG_MIME, String(i))}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(PAG_MIME)) return;
            e.preventDefault();
            setSobre(i);
          }}
          onDragLeave={() => setSobre((s) => (s === i ? null : s))}
          onDrop={(e) => {
            setSobre(null);
            const de = Number(e.dataTransfer.getData(PAG_MIME));
            if (Number.isFinite(de) && de !== i) props.onMover(de, i);
          }}
          className={`group relative flex shrink-0 flex-col items-center gap-1 ${sobre === i ? 'translate-x-1' : ''}`}
          data-pagina={i + 1}
        >
          <button type="button" onClick={() => props.onIr(i)} title={`Página ${i + 1}`} className={`overflow-hidden rounded-md border-2 transition ${i === actual ? 'border-primary' : 'border-transparent hover:border-borde2'}`} style={{ height: alto, width: (alto * tam.w) / tam.h }}>
            <Mini pagina={p} tam={tam} />
          </button>
          <span className={`text-[0.65rem] tabular-nums ${i === actual ? 'text-primary' : 'text-base-content/50'}`}>{i + 1}</span>
        </div>
      ))}
      <button type="button" onClick={props.onNueva} className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-base-300 text-base-content/55 transition hover:border-primary hover:text-primary" style={{ height: alto, width: Math.max(48, (alto * tam.w) / tam.h) }} title="Añadir página" data-nueva-pagina>
        <Plus className="size-4" />
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-4">
        <span className="mr-2 text-[0.7rem] text-base-content/45">
          Página {actual + 1} de {paginas.length} · {tam.w} × {tam.h} px
        </span>
        <button type="button" className="btn btn-ghost btn-xs btn-square" title="Mover a la izquierda" disabled={actual === 0} onClick={() => props.onMover(actual, actual - 1)}>
          <ChevronLeft className="size-3.5" />
        </button>
        <button type="button" className="btn btn-ghost btn-xs btn-square" title="Mover a la derecha" disabled={actual === paginas.length - 1} onClick={() => props.onMover(actual, actual + 1)}>
          <ChevronRight className="size-3.5" />
        </button>
        <button type="button" className="btn btn-ghost btn-xs btn-square" title="Duplicar página" onClick={() => props.onDuplicar(actual)} data-duplicar-pagina>
          <Copy className="size-3.5" />
        </button>
        <button type="button" className="btn btn-ghost btn-xs btn-square text-error" title="Borrar página" disabled={paginas.length === 1} onClick={() => props.onBorrar(actual)} data-borrar-pagina>
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
