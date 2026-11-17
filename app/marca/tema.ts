/**
 * Tema de toda la app (editor de vídeo y estudio de diseño), el mismo que metricaseo.site: claro (gris suave,
 * blanco y tinta) u oscuro. Por defecto sigue al sistema; el botón sol/luna lo fija y se recuerda en este equipo
 * con la misma clave en las dos páginas, así que siempre van a la par. En la app de escritorio también pinta los
 * botones de la ventana (minimizar, maximizar, cerrar) del color de la barra.
 *
 * Se aplica como `<html data-theme="estudio">` o `"estudio-oscuro"`: el estudio lo usa para los temas de daisyUI y
 * el editor de vídeo (app/src/estilos.css) para redefinir sus variables.
 */
import { useEffect, useState } from 'react';

export type Tema = 'claro' | 'oscuro';
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
export const temaActual = (): Tema => guardado() ?? delSistema();

function aplicar(tema: Tema) {
  document.documentElement.dataset.theme = tema === 'oscuro' ? 'estudio-oscuro' : 'estudio';
  document.documentElement.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  const studio = (window as any).studio as { escritorio?: boolean; accion: (a: string, x?: unknown) => Promise<unknown> } | undefined;
  if (studio?.escritorio) studio.accion('barra-titulo', BARRA[tema]).catch(() => {});
}

/** Aplica el tema antes del primer pintado (llamar en main.tsx). */
export const iniciarTema = () => aplicar(temaActual());

/** Tema vigente y cómo alternarlo (para el botón sol/luna de cada página). */
export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(temaActual);
  useEffect(() => {
    aplicar(tema);
    // Otra página (o pestaña) cambió el tema: seguirla.
    const otra = (e: StorageEvent) => e.key === CLAVE && setTema(temaActual());
    window.addEventListener('storage', otra);
    if (guardado()) return () => window.removeEventListener('storage', otra);
    // Sin elección propia: sigue al sistema si cambia.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const cambio = () => setTema(delSistema());
    mq.addEventListener('change', cambio);
    return () => (window.removeEventListener('storage', otra), mq.removeEventListener('change', cambio));
  }, [tema]);
  const alternar = () => {
    const nuevo: Tema = tema === 'oscuro' ? 'claro' : 'oscuro';
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {}
    setTema(nuevo);
  };
  return [tema, alternar];
}
