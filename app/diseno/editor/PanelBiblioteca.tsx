/** La librería de ilustraciones: búsqueda, categorías y miniaturas vivas que se arrastran al lienzo o se añaden con un clic. */
import { memo, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { BIBLIOTECA, GRUPOS, type Grupo, type Item } from './biblioteca';
import { ART_MIME } from './Escenario';

const normal = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const Miniatura = memo(function Miniatura({ item }: { item: Item }) {
  const [x, y, w, h] = item.viewBox;
  const pad = Math.max(w, h) * 0.06;
  const Render = item.Render;
  return (
    <svg viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`} className="absolute inset-1.5 h-[calc(100%-0.75rem)] w-[calc(100%-0.75rem)]" aria-hidden="true">
      <Render />
    </svg>
  );
});

export function Ficha({ id, item, onAdd, ancho = false }: { id: string; item: Item; onAdd: (key: string) => void; ancho?: boolean }) {
  return (
    <button
      type="button"
      draggable
      data-arte={id}
      onDragStart={(e) => {
        e.dataTransfer.setData(ART_MIME, id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onAdd(id)}
      title={`${item.label}: clic o arrastra al lienzo`}
      className="group flex flex-col overflow-hidden rounded-lg border border-base-300 bg-panel2 text-left transition hover:border-primary/60"
    >
      <span className={`relative block w-full ${ancho ? 'aspect-[16/10]' : 'aspect-square'}`} style={{ backgroundColor: item.thumbBg ?? '#f3f3f3' }}>
        <Miniatura item={item} />
      </span>
      <span className="block truncate px-1.5 py-1 text-[0.65rem] leading-tight text-base-content/70 group-hover:text-base-content">{item.label}</span>
    </button>
  );
}

export function PanelBiblioteca({ onAdd }: { onAdd: (key: string) => void }) {
  const [q, setQ] = useState('');
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const todas = useMemo(() => Object.entries(BIBLIOTECA), []);
  const n = normal(q.trim());
  const filtradas = todas.filter(([k, it]) => (!grupo || it.group === grupo) && (!n || normal(`${it.label} ${it.tags ?? ''} ${k}`).includes(n)));
  return (
    <div className="space-y-3">
      <label className="input input-sm flex w-full items-center gap-2 bg-panel3">
        <Search className="size-3.5 text-base-content/45" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar en ${todas.length} piezas…`} className="grow text-xs" data-buscar-biblioteca />
      </label>
      <div className="flex flex-wrap gap-1">
        {[null, ...GRUPOS.map((g) => g.grupo)].map((g) => (
          <button key={g ?? 'todo'} type="button" onClick={() => setGrupo(g)} className={`badge badge-sm cursor-pointer border ${grupo === g ? 'border-primary bg-primary/15 text-primary' : 'border-base-300 bg-transparent text-base-content/70 hover:text-base-content'}`}>
            {g ?? 'Todo'}
          </button>
        ))}
      </div>
      {filtradas.length === 0 ? <p className="py-6 text-center text-xs text-base-content/55">Nada coincide con «{q}».</p> : null}
      {GRUPOS.map(({ grupo: g, titulo, ancho, cols }) => {
        const items = filtradas.filter(([, it]) => it.group === g);
        if (!items.length) return null;
        return (
          <section key={g} className="space-y-1.5">
            <h3 className="flex items-baseline justify-between text-[0.7rem] font-semibold uppercase tracking-wide text-base-content/55">
              {titulo}
              <span className="font-normal normal-case tracking-normal text-base-content/40">{items.length}</span>
            </h3>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {items.map(([k, it]) => (
                <Ficha key={k} id={k} item={it} onAdd={onAdd} ancho={ancho} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
