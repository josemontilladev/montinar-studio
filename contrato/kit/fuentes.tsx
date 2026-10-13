/**
 * Carga las tipografías de la biblioteca que el proyecto usa (ajustes.fuentesExtra: copiadas a public/fuentes), sin
 * conexión. El render espera a que estén listas (delayRender).
 */
import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import type { TAjustes } from '../esquema';

const cargadas = new Map<string, Promise<void>>();

export const cargarFuente = (familia: string, src: string, peso: number, url = staticFile(src)) => {
  const k = `${familia}|${peso}|${src}`;
  if (!cargadas.has(k)) {
    const p = (async () => {
      try {
        const ff = new FontFace(familia, `url(${url}) format('woff2')`, { weight: String(peso), style: 'normal', display: 'block' });
        await ff.load();
        (document.fonts as any).add(ff);
      } catch {
        /* sin la fuente se usa la de reserva */
      }
    })();
    cargadas.set(k, p);
  }
  return cargadas.get(k)!;
};

/** Componente invisible: carga todas las fuentes extra del proyecto antes de dibujar. */
export const CargarFuentes: React.FC<{ ajustes: TAjustes }> = ({ ajustes }) => {
  const lista = ajustes.fuentesExtra ?? [];
  const clave = JSON.stringify(lista);
  const [h] = useState(() => (lista.length ? delayRender('Cargando tipografías', { timeoutInMilliseconds: 30000 }) : null));
  useEffect(() => {
    const ps = lista.flatMap((f) => f.archivos.map((a) => cargarFuente(f.familia, a.src, a.peso)));
    let hecho = false;
    const fin = () => {
      if (!hecho && h != null) continueRender(h);
      hecho = true;
    };
    Promise.all(ps).then(fin);
    return fin;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return null;
};
