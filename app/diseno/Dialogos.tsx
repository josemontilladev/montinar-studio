/** Avisos (toasts), pedir un texto, elegir formato (nuevo diseño / cambiar tamaño) y exportar. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { CheckCircle2, FolderOpen, Info, X, XCircle } from 'lucide-react';
import { FORMATOS } from './esquema';

type Aviso = { id: number; texto: string; tipo: 'ok' | 'error' | 'info'; accion?: { texto: string; fn: () => void } };
type Pregunta = { titulo: string; etiqueta: string; valor: string; ok: (v: string | null) => void };
const useUi = create<{ avisos: Aviso[]; pregunta: Pregunta | null }>(() => ({ avisos: [], pregunta: null }));

let n = 0;
export const avisar = (texto: string, tipo: Aviso['tipo'] = 'info', accion?: Aviso['accion']) => {
  const id = ++n;
  useUi.setState((s) => ({ avisos: [...s.avisos.slice(-3), { id, texto, tipo, accion }] }));
  setTimeout(() => useUi.setState((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })), accion ? 9000 : 4500);
};
export const pedirTexto = (titulo: string, etiqueta: string, valor = '') => new Promise<string | null>((ok) => useUi.setState({ pregunta: { titulo, etiqueta, valor, ok } }));

export function Modal({ titulo, onCerrar, children, ancho = 'max-w-lg' }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCerrar]);
  return (
    <dialog open className="modal modal-open" data-modal={titulo}>
      <div className={`modal-box ${ancho} border border-base-300 bg-base-100 p-0 shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-3">
          <h3 className="text-sm font-semibold">{titulo}</h3>
          <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={onCerrar} aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
      <div className="modal-backdrop bg-[#212121]/40" onClick={onCerrar} />
    </dialog>
  );
}

function Preguntar({ p }: { p: Pregunta }) {
  const [v, setV] = useState(p.valor);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.select(), []);
  const fin = (x: string | null) => {
    useUi.setState({ pregunta: null });
    p.ok(x);
  };
  return (
    <Modal titulo={p.titulo} onCerrar={() => fin(null)} ancho="max-w-sm">
      <form onSubmit={(e) => (e.preventDefault(), v.trim() && fin(v.trim()))} className="space-y-4">
        <label className="block space-y-1 text-xs text-base-content/70">
          <span>{p.etiqueta}</span>
          <input ref={ref} autoFocus value={v} onChange={(e) => setV(e.target.value)} className="input input-sm w-full bg-panel3" data-pregunta />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fin(null)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!v.trim()} data-aceptar>
            Aceptar
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CapaUi() {
  const { avisos, pregunta } = useUi();
  return (
    <>
      {pregunta ? <Preguntar p={pregunta} /> : null}
      <div className="toast toast-end toast-bottom pointer-events-none z-[100]" data-avisos>
        {avisos.map((a) => (
          <div key={a.id} className={`alert min-w-72 max-w-md border bg-base-100 py-2.5 text-xs shadow-2xl ${a.tipo === 'error' ? 'border-error/50' : a.tipo === 'ok' ? 'border-success/40' : 'border-base-300'}`} data-aviso={a.tipo}>
            {a.tipo === 'ok' ? <CheckCircle2 className="size-4 text-success" /> : a.tipo === 'error' ? <XCircle className="size-4 text-error" /> : <Info className="size-4 text-info" />}
            <span className="whitespace-normal">{a.texto}</span>
            {a.accion ? (
              <button type="button" className="btn btn-xs btn-primary pointer-events-auto gap-1" onClick={a.accion.fn} data-accion-aviso>
                <FolderOpen className="size-3.5" />
                {a.accion.texto}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

/** Rectángulo proporcional a un formato (vista previa). */
export const Forma = ({ w, h, max = 56 }: { w: number; h: number; max?: number }) => {
  const k = max / Math.max(w, h);
  return <span className="block rounded-[4px] border border-verde/70 bg-mint-suave" style={{ width: w * k, height: h * k }} />;
};

/** Elegir formato: los de serie o un tamaño a medida. Para «Cambiar tamaño», además «Escalar los elementos». */
export function ElegirFormato({ titulo, boton, actual, conEscalar, onElegir, onCerrar }: { titulo: string; boton: string; actual?: { w: number; h: number }; conEscalar?: boolean; onElegir: (formato: string, ancho: number, alto: number, escalar: boolean) => void; onCerrar: () => void }) {
  const [sel, setSel] = useState(FORMATOS.find((f) => f.ancho === actual?.w && f.alto === actual?.h)?.id ?? (actual ? 'personalizado' : 'post'));
  const [w, setW] = useState(actual?.w ?? 1080);
  const [h, setH] = useState(actual?.h ?? 1350);
  const [escalar, setEscalar] = useState(true);
  const f = FORMATOS.find((x) => x.id === sel);
  const ancho = f?.ancho ?? w;
  const alto = f?.alto ?? h;
  const valido = ancho >= 64 && alto >= 64 && ancho <= 8000 && alto <= 8000;
  return (
    <Modal titulo={titulo} onCerrar={onCerrar} ancho="max-w-3xl">
      <div className="grid grid-cols-3 gap-2" data-formatos>
        {[...FORMATOS, { id: 'personalizado', nombre: 'Tamaño personalizado', desc: 'Ancho y alto a medida', ancho: w, alto: h }].map((x) => (
          <button key={x.id} type="button" data-formato={x.id} onClick={() => setSel(x.id)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${sel === x.id ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-borde2'}`}>
            <span className="grid size-14 shrink-0 place-items-center">
              <Forma w={x.ancho} h={x.alto} max={52} />
            </span>
            <span className="min-w-0">
              <b className="block truncate text-xs font-semibold">{x.nombre}</b>
              <span className="block text-[0.7rem] text-base-content/55">{x.id === 'personalizado' ? x.desc : `${x.ancho} × ${x.alto} · ${x.desc}`}</span>
            </span>
          </button>
        ))}
      </div>
      {sel === 'personalizado' ? (
        <div className="mt-4 flex items-end gap-2">
          <label className="flex flex-col text-xs text-base-content/60">
            Ancho (px)
            <input type="number" min={64} max={8000} value={w} onChange={(e) => setW(Math.round(Number(e.target.value)))} className="input input-sm mt-1 w-28 bg-panel3" data-ancho />
          </label>
          <span className="pb-2 text-base-content/40">×</span>
          <label className="flex flex-col text-xs text-base-content/60">
            Alto (px)
            <input type="number" min={64} max={8000} value={h} onChange={(e) => setH(Math.round(Number(e.target.value)))} className="input input-sm mt-1 w-28 bg-panel3" data-alto />
          </label>
        </div>
      ) : null}
      <div className="mt-5 flex items-center justify-between gap-3">
        {conEscalar ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={escalar} onChange={(e) => setEscalar(e.target.checked)} data-escalar />
            Escalar los elementos al nuevo tamaño
          </label>
        ) : (
          <span />
        )}
        <button type="button" className="btn btn-primary btn-sm" disabled={!valido} onClick={() => onElegir(sel, ancho, alto, escalar)} data-crear-formato>
          {boton} · {ancho} × {alto}
        </button>
      </div>
    </Modal>
  );
}
