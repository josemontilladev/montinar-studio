/** Barra superior del editor: volver, nombre, deshacer/rehacer, zoom, tamaño, imanes, guardado y descargar. */
import { ArrowDown, ChevronLeft, Clapperboard, Cloud, CloudOff, Loader2, Magnet, Maximize, Redo2, Scaling, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { BotonTema } from '../tema';
import type { Zoom } from './Escenario';
import type { EstadoGuardado } from './guardado';

const sep = <span className="mx-1 h-5 w-px bg-base-300" aria-hidden="true" />;
const icono = 'btn btn-ghost btn-sm btn-square';

export function BarraEditor(p: {
  nombre: string;
  tam: { w: number; h: number };
  estado: EstadoGuardado;
  canUndo: boolean;
  canRedo: boolean;
  scale: number;
  zoom: Zoom;
  snap: boolean;
  onVolver: () => void;
  onVideo: () => void;
  onRenombrar: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoom: (z: Zoom) => void;
  onSnap: () => void;
  onTamano: () => void;
  onGuardar: () => void;
  onExportar: () => void;
}) {
  const estado = { guardado: 'Guardado', pendiente: 'Cambios sin guardar', guardando: 'Guardando…', error: 'No se pudo guardar' }[p.estado];
  return (
    <header className="barra-app flex h-10 shrink-0 items-center gap-1 border-b border-base-300 bg-fondo px-2" data-barra-editor>
      <button type="button" className="btn btn-ghost btn-sm gap-1" onClick={p.onVolver} title="Mis diseños" data-volver>
        <ChevronLeft className="size-4" /> Diseños
      </button>
      <button type="button" className="btn btn-ghost btn-sm max-w-64 truncate font-semibold" onClick={p.onRenombrar} title="Renombrar" data-nombre-diseno>
        {p.nombre}
      </button>
      {sep}
      <button type="button" className={icono} onClick={p.onUndo} disabled={!p.canUndo} title="Deshacer (Ctrl+Z)" data-deshacer>
        <Undo2 className="size-4" />
      </button>
      <button type="button" className={icono} onClick={p.onRedo} disabled={!p.canRedo} title="Rehacer (Ctrl+Y)" data-rehacer>
        <Redo2 className="size-4" />
      </button>
      {sep}
      <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={p.onTamano} title="Cambiar tamaño" data-cambiar-tamano>
        <Scaling className="size-4" />
        <span className="tabular-nums">
          {p.tam.w} × {p.tam.h}
        </span>
      </button>
      <button type="button" className={`${icono} ${p.snap ? 'text-primary' : 'text-base-content/45'}`} onClick={p.onSnap} title={p.snap ? 'Imanes y guías activados (Alt al arrastrar para ignorarlos)' : 'Imanes desactivados'} aria-pressed={p.snap}>
        <Magnet className="size-4" />
      </button>
      <span className="flex-1" />
      <span className={`flex items-center gap-1.5 text-[0.7rem] ${p.estado === 'error' ? 'text-error' : 'text-base-content/50'}`} data-estado-guardado={p.estado}>
        {p.estado === 'guardando' ? <Loader2 className="size-3.5 animate-spin" /> : p.estado === 'error' ? <CloudOff className="size-3.5" /> : <Cloud className="size-3.5" />}
        <button type="button" onClick={p.onGuardar} title="Guardar (Ctrl+S)" className="hover:text-base-content">
          {estado}
        </button>
      </span>
      {sep}
      <button type="button" className={icono} onClick={() => p.onZoom(Math.max(0.05, Math.round((p.scale - 0.1) * 20) / 20))} title="Alejar (Ctrl+-)">
        <ZoomOut className="size-4" />
      </button>
      <span className="w-11 text-center text-xs tabular-nums text-base-content/70" data-zoom>
        {Math.round(p.scale * 100)}%
      </span>
      <button type="button" className={icono} onClick={() => p.onZoom(Math.min(4, Math.round((p.scale + 0.1) * 20) / 20))} title="Acercar (Ctrl++)">
        <ZoomIn className="size-4" />
      </button>
      <button type="button" className={`btn btn-ghost btn-sm gap-1 ${p.zoom === 'fit' ? 'text-primary' : ''}`} onClick={() => p.onZoom('fit')} title="Ajustar a la ventana (Ctrl+0)">
        <Maximize className="size-3.5" /> Ajustar
      </button>
      <button type="button" className={`btn btn-ghost btn-sm ${p.zoom === 1 ? 'text-primary' : ''}`} onClick={() => p.onZoom(1)} title="Tamaño real (Ctrl+1)">
        100%
      </button>
      {sep}
      <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={p.onVideo} title="Volver a los proyectos de vídeo">
        <Clapperboard className="size-4" /> Vídeo
      </button>
      <BotonTema />
      <button type="button" className="btn-marca ml-1" onClick={p.onExportar} data-abrir-exportar>
        Descargar
        <span className="btn-marca-ico">
          <ArrowDown className="size-3.5" />
        </span>
      </button>
    </header>
  );
}
