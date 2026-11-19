/**
 * Aviso del estudio de diseño cuando la app abrió sin proyecto de vídeo (p. ej. en un equipo donde la carpeta
 * `dev` aún no se ha sincronizado). El estudio de diseño funciona igual; los vídeos necesitan el kit.
 */
import { useCallback, useEffect, useState } from 'react';
import { Clapperboard, FolderOpen, RefreshCw } from 'lucide-react';
import { avisar } from './Dialogos';

type Studio = { escritorio?: boolean; accion: (a: string, x?: unknown) => Promise<any> };
const studio = () => (window as any).studio as Studio | undefined;

type Estado = { sinProyecto: boolean; kit: string; kitExiste: boolean };

/** ¿La app arrancó sin proyecto de vídeo? Lo pregunta al servidor, que lo sabe también fuera de la app. */
export const useSinProyecto = () => {
  const [estado, setEstado] = useState<Estado | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const local = await studio()?.accion('proyecto-estado');
        if (local) return setEstado(local);
        const r = await fetch('/api/estado').then((x) => x.json());
        setEstado({ sinProyecto: !!r.sinProyecto, kit: '', kitExiste: false });
      } catch {
        setEstado(null);
      }
    })();
  }, []);
  return estado;
};

export function AvisoSinProyecto({ estado }: { estado: Estado }) {
  const [buscando, setBuscando] = useState(false);
  const escritorio = !!studio()?.escritorio;

  const volverABuscar = useCallback(async () => {
    setBuscando(true);
    try {
      const ok = await studio()?.accion('buscar-proyectos');
      if (!ok) avisar('Todavía no hay ningún proyecto de vídeo en esa carpeta. Si se está sincronizando, espera a que termine y vuelve a buscar.', 'info');
    } finally {
      setBuscando(false);
    }
  }, []);

  return (
    <section className="mt-6 flex flex-wrap items-start gap-4 rounded-xl border border-base-300 bg-base-100 p-5" data-aviso-sin-proyecto>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <Clapperboard className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[0.95rem] font-semibold">No encuentro tus proyectos de vídeo en este equipo</h2>
        <p className="mt-1 text-sm text-base-content/70">
          Los vídeos se editan desde el kit de MétricaSEO, que vive en la carpeta <b>dev</b> y llega a este equipo por
          Syncthing. Si acabas de configurar el equipo, espera a que termine de sincronizar y pulsa «Volver a buscar». El
          estudio de diseño (posts, carruseles, portadas) funciona sin él.
        </p>
        {estado.kit ? (
          <p className="mt-2 break-all text-xs text-base-content/55">
            Lo busco en: <code>{estado.kit}</code>
            {estado.kitExiste ? ' (la carpeta existe, pero aún no tiene proyectos)' : ' (esa carpeta aún no existe en este equipo)'}
          </p>
        ) : null}
        {escritorio ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm gap-1.5" disabled={buscando} onClick={volverABuscar}>
              <RefreshCw className={`size-3.5 ${buscando ? 'animate-spin' : ''}`} /> Volver a buscar
            </button>
            <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={() => studio()?.accion('abrir')}>
              <FolderOpen className="size-3.5" /> Elegir carpeta del proyecto…
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
