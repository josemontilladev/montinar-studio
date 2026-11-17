import { useState } from 'react';
import { Download } from 'lucide-react';
import type { Diseno } from './esquema';
import { apiDisenos } from './api';
import { rasterizar } from './exportar';
import { avisar, Modal } from './Dialogos';

const studio = () => (window as any).studio as { escritorio?: boolean; accion: (a: string, x?: unknown) => Promise<unknown> } | undefined;

/** Abre la carpeta con el archivo seleccionado: en la app de escritorio por IPC, si no, el servidor llama al Explorador. */
export const mostrarArchivo = (archivo: string) => (studio()?.escritorio ? studio()!.accion('mostrar-archivo', archivo) : apiDisenos.mostrar(archivo)).catch((e) => avisar(String(e?.message ?? e), 'error'));

export type OpcionesExportar = { tipo: 'png' | 'jpeg'; escala: 1 | 2; paginas: 'actual' | 'todas' };

/** Exporta y guarda en Descargas\MetricaSEO Studio: «Nombre.png» o «Nombre - 01.png», «Nombre - 02.png»… */
export async function exportarDiseno(id: string, doc: Diseno, actual: number, o: OpcionesExportar, progreso?: (i: number, n: number) => void) {
  const idx = o.paginas === 'todas' ? doc.paginas.map((_, i) => i) : [actual];
  const ext = o.tipo === 'png' ? 'png' : 'jpg';
  const archivos: string[] = [];
  for (const [k, i] of idx.entries()) {
    progreso?.(k, idx.length);
    const datos = await rasterizar(doc.paginas[i], { w: doc.ancho, h: doc.alto }, id, doc.ancho * o.escala, o.tipo);
    const sufijo = doc.paginas.length > 1 ? ` - ${String(i + 1).padStart(2, '0')}` : '';
    const escala = o.escala === 2 ? ' @2x' : '';
    archivos.push((await apiDisenos.exportar(`${doc.nombre}${sufijo}${escala}.${ext}`, datos)).archivo);
  }
  return archivos;
}

export function DialogoExportar({ id, doc, actual, onCerrar }: { id: string; doc: Diseno; actual: number; onCerrar: () => void }) {
  const [o, setO] = useState<OpcionesExportar>({ tipo: 'png', escala: 1, paginas: doc.paginas.length > 1 ? 'todas' : 'actual' });
  const [prog, setProg] = useState<string | null>(null);
  const opcion = <K extends keyof OpcionesExportar>(k: K, v: OpcionesExportar[K], texto: string, extra?: string) => (
    <button type="button" data-opcion={`${k}-${v}`} onClick={() => setO({ ...o, [k]: v })} className={`btn join-item btn-sm flex-1 flex-col gap-0 ${o[k] === v ? 'btn-primary' : 'btn-ghost border-base-300'}`}>
      {texto}
      {extra ? <span className="text-[0.65rem] font-normal opacity-70">{extra}</span> : null}
    </button>
  );
  const exportar = async () => {
    try {
      const archivos = await exportarDiseno(id, doc, actual, o, (i, n) => setProg(`Página ${i + 1} de ${n}…`));
      onCerrar();
      avisar(archivos.length > 1 ? `${archivos.length} imágenes exportadas en Descargas\\MetricaSEO Studio` : `Exportado: ${archivos[0].split(/[\\/]/).pop()}`, 'ok', { texto: 'Abrir carpeta', fn: () => mostrarArchivo(archivos[0]) });
    } catch (e: any) {
      setProg(null);
      avisar(`No se pudo exportar: ${e.message}`, 'error');
    }
  };
  return (
    <Modal titulo="Descargar" onCerrar={onCerrar} ancho="max-w-md">
      <div className="space-y-4" data-exportar>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-base-content/60">Tipo de archivo</p>
          <div className="join w-full">
            {opcion('tipo', 'png', 'PNG', 'Máxima calidad')}
            {opcion('tipo', 'jpeg', 'JPG', 'Más ligero')}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-base-content/60">Tamaño</p>
          <div className="join w-full">
            {opcion('escala', 1, '1x', `${doc.ancho} × ${doc.alto}`)}
            {opcion('escala', 2, '2x', `${doc.ancho * 2} × ${doc.alto * 2}`)}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-base-content/60">Páginas</p>
          <div className="join w-full">
            {opcion('paginas', 'actual', 'Página actual', `la ${actual + 1}`)}
            {opcion('paginas', 'todas', 'Todas', `${doc.paginas.length} archivos numerados`)}
          </div>
        </div>
        <p className="text-[0.7rem] text-base-content/50">Se guardan en Descargas\MetricaSEO Studio con las fuentes de la marca incrustadas.</p>
        <button type="button" className="btn btn-primary w-full gap-2" disabled={!!prog} onClick={exportar} data-descargar>
          {prog ? <span className="loading loading-spinner loading-xs" /> : <Download className="size-4" />}
          {prog ?? 'Descargar'}
        </button>
      </div>
    </Modal>
  );
}
