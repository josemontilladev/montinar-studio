/**
 * Tema del estudio, el mismo que metricaseo.site: claro (gris suave, blanco y tinta) u oscuro. Por defecto sigue
 * al sistema; el botón lo fija y se recuerda en este equipo. En la app de escritorio también pinta los botones de
 * la ventana (minimizar, maximizar, cerrar) del color de la barra.
 */
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Tema = 'claro' | 'oscuro';
const CLAVE = 'estudio-tema';
const BARRA: Record<Tema, { color: string; simbolo: string }> = {
  claro: { color: '#ffffff', simbolo: '#212121' },
  oscuro: { color: '#171717', simbolo: '#f3f3f3' },
};

const guardado = (): Tema | null => {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'claro' || v === 'oscuro' ? v : null;
  } catch {
    return null;
  }
};
const delSistema = (): Tema => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');

function aplicar(tema: Tema) {
  document.documentElement.dataset.theme = tema === 'oscuro' ? 'estudio-oscuro' : 'estudio';
  const studio = (window as any).studio as { escritorio?: boolean; accion: (a: string, x?: unknown) => Promise<unknown> } | undefined;
  if (studio?.escritorio) studio.accion('barra-titulo', BARRA[tema]).catch(() => {});
}

/** Aplica el tema antes del primer pintado (llamar en main.tsx). */
export const iniciarTema = () => aplicar(guardado() ?? delSistema());

/** Botón sol/luna de la barra superior, como el de la web. */
export function BotonTema() {
  const [tema, setTema] = useState<Tema>(() => guardado() ?? delSistema());
  useEffect(() => {
    aplicar(tema);
    if (guardado()) return;
    // Sin elección propia: sigue al sistema si cambia.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const cambio = () => setTema(delSistema());
    mq.addEventListener('change', cambio);
    return () => mq.removeEventListener('change', cambio);
  }, [tema]);
  const alternar = () => {
    const nuevo: Tema = tema === 'oscuro' ? 'claro' : 'oscuro';
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {}
    setTema(nuevo);
  };
  return (
    <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={alternar} title={tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'} aria-label="Cambiar tema" data-tema>
      {tema === 'oscuro' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
