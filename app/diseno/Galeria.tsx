/** «Mis diseños»: crear desde un formato y abrir, duplicar, renombrar o borrar los diseños guardados. */
import { useEffect, useState } from 'react';
import { Clapperboard, Copy, FolderOpen, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { BotonTema } from './tema';
import { Logo } from '../marca/Logo';
import { FORMATOS } from './esquema';
import { apiDisenos, urlRecurso, type FichaDiseno } from './api';
import { avisar, Forma, pedirTexto } from './Dialogos';
import { mostrarArchivo } from './DialogoExportar';

export const hace = (t: number) => {
  const s = (Date.now() - t) / 1000;
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(t).toLocaleDateString('es');
};

export function Galeria({ onAbrir, onNuevo, onVideo }: { onAbrir: (id: string) => void; onNuevo: (formato?: string) => void; onVideo: () => void }) {
  const [datos, setDatos] = useState<{ carpeta: string; disenos: FichaDiseno[] } | null>(null);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const cargar = () => apiDisenos.listar().then(setDatos).catch((e) => avisar(e.message, 'error'));
  useEffect(() => {
    cargar();
  }, []);
  const hacer = async (fn: () => Promise<unknown>, ok: string) => {
    setMenu(null);
    try {
      await fn();
      avisar(ok, 'ok');
      cargar();
    } catch (e: any) {
      avisar(e.message, 'error');
    }
  };
  const lista = (datos?.disenos ?? []).filter((d) => d.nombre.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex h-full flex-col" data-galeria onClick={() => setMenu(null)}>
      <header className="barra-app flex h-10 shrink-0 items-center gap-3 border-b border-base-300 bg-fondo px-4">
        <Logo />
        <span className="h-5 w-px bg-base-300" aria-hidden="true" />
        <h1 className="text-[0.95rem] font-semibold">Estudio de diseño</h1>
        <label className="input input-sm ml-4 flex w-72 items-center gap-2 bg-panel3">
          <Search className="size-3.5 text-base-content/45" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar diseños" className="grow" />
        </label>
        <span className="flex-1" />
        <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={onVideo}>
          <Clapperboard className="size-4" /> Proyectos de vídeo
        </button>
        <BotonTema />
        <button type="button" className="btn-marca" onClick={() => onNuevo()} data-nuevo-diseno>
          Nuevo diseño
          <span className="btn-marca-ico">
            <Plus className="size-3.5" />
          </span>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-12">
        <h2 className="mb-3 mt-6 text-[0.8rem] font-semibold text-suave">Crear un diseño</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
          {FORMATOS.map((f) => (
            <button key={f.id} type="button" onClick={() => onNuevo(f.id)} data-nuevo-formato={f.id} className="flex flex-col items-start gap-2 rounded-xl border border-base-300 bg-base-100 p-3 text-left transition hover:border-primary">
              <span className="grid h-16 w-full place-items-center">
                <Forma w={f.ancho} h={f.alto} max={60} />
              </span>
              <span>
                <b className="block text-xs font-semibold">{f.nombre}</b>
                <span className="text-[0.68rem] text-base-content/50">
                  {f.ancho} × {f.alto}
                </span>
              </span>
            </button>
          ))}
          <button type="button" onClick={() => onNuevo('personalizado')} className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-base-300 p-3 text-left transition hover:border-primary">
            <span className="grid h-16 w-full place-items-center text-base-content/40">
              <Plus className="size-6" />
            </span>
            <span>
              <b className="block text-xs font-semibold">Tamaño personalizado</b>
              <span className="text-[0.68rem] text-base-content/50">Ancho y alto a medida</span>
            </span>
          </button>
        </div>
        <h2 className="mb-3 mt-8 flex items-center gap-2 text-[0.8rem] font-semibold text-suave">
          Mis diseños
          {datos ? (
            <button type="button" className="btn btn-ghost btn-xs gap-1 font-normal text-base-content/45" onClick={() => mostrarArchivo(datos.carpeta)} title={datos.carpeta}>
              <FolderOpen className="size-3.5" /> {datos.carpeta}
            </button>
          ) : null}
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4" data-mis-disenos>
          {lista.map((d) => (
            <div key={d.id} data-diseno={d.id} className="group relative rounded-xl border border-base-300 bg-base-100 transition hover:border-primary/70">
              <button type="button" onClick={() => onAbrir(d.id)} className="block w-full text-left">
                <span className="grid h-44 place-items-center overflow-hidden rounded-t-xl bg-miniatura p-3">
                  {d.miniatura ? <img src={urlRecurso(d.id, 'miniatura.png', d.miniatura)} alt="" className="size-full object-contain drop-shadow-lg" /> : <Forma w={d.ancho} h={d.alto} max={90} />}
                </span>
                <span className="block px-3 py-2.5">
                  <b className="block truncate text-xs font-semibold">{d.nombre}</b>
                  <span className="text-[0.68rem] text-base-content/50">
                    {d.ancho} × {d.alto} · {d.paginas} {d.paginas === 1 ? 'página' : 'páginas'} · {hace(d.mtime)}
                  </span>
                </span>
              </button>
              <button type="button" className="btn btn-ghost btn-xs btn-square absolute right-2 top-2 bg-base-100/80 opacity-0 group-hover:opacity-100" onClick={(e) => (e.stopPropagation(), setMenu(menu === d.id ? null : d.id))} data-menu-diseno={d.id}>
                <MoreHorizontal className="size-4" />
              </button>
              {menu === d.id ? (
                <ul className="menu absolute right-2 top-10 z-10 w-44 rounded-lg border border-base-300 bg-base-100 p-1 text-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <li>
                    <button type="button" onClick={() => onAbrir(d.id)}>
                      <FolderOpen className="size-3.5" /> Abrir
                    </button>
                  </li>
                  <li>
                    <button type="button" data-accion="duplicar" onClick={() => hacer(() => apiDisenos.duplicar(d.id), 'Diseño duplicado')}>
                      <Copy className="size-3.5" /> Duplicar
                    </button>
                  </li>
                  <li>
                    <button type="button" data-accion="renombrar" onClick={async () => {
                      setMenu(null);
                      const n = await pedirTexto('Renombrar diseño', 'Nombre', d.nombre);
                      if (n) hacer(() => apiDisenos.renombrar(d.id, n), 'Diseño renombrado');
                    }}>
                      <Pencil className="size-3.5" /> Renombrar
                    </button>
                  </li>
                  <li>
                    <button type="button" className="text-error" data-accion="borrar" onClick={() => hacer(() => apiDisenos.borrar(d.id), 'Movido a la papelera de diseños')}>
                      <Trash2 className="size-3.5" /> Mover a la papelera
                    </button>
                  </li>
                </ul>
              ) : null}
            </div>
          ))}
          {datos && !lista.length ? <p className="col-span-full py-10 text-center text-xs text-base-content/50">{q ? 'Ningún diseño coincide.' : 'Aún no hay diseños: elige un formato arriba para empezar.'}</p> : null}
        </div>
      </div>
    </div>
  );
}
