import { useCallback, useEffect, useRef, useState } from 'react';
import type { Diseno } from '../esquema';
import { apiDisenos } from '../api';
import { rasterizar } from '../exportar';

export type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error';
const ESPERA = 900;
const CADA_MINIATURA = 8000;

/** Autoguardado (1 s después del último cambio) y guardado explícito; la miniatura se rehace como mucho cada 8 s. */
export function useGuardado(id: string, doc: Diseno) {
  const [estado, setEstado] = useState<EstadoGuardado>('guardado');
  const docRef = useRef(doc);
  docRef.current = doc;
  const guardadoRef = useRef(doc);
  const miniT = useRef(0);
  const cola = useRef<Promise<void>>(Promise.resolve());

  const guardar = useCallback(
    (miniatura = false) =>
      (cola.current = cola.current.then(async () => {
        const d = docRef.current;
        const conMini = miniatura || Date.now() - miniT.current > CADA_MINIATURA;
        if (d === guardadoRef.current && !miniatura) return;
        setEstado('guardando');
        try {
          const mini = conMini ? await rasterizar(d.paginas[0], { w: d.ancho, h: d.alto }, id, 480).catch(() => undefined) : undefined;
          if (mini) miniT.current = Date.now();
          await apiDisenos.guardar(id, d, mini);
          guardadoRef.current = d;
          setEstado(docRef.current === d ? 'guardado' : 'pendiente');
        } catch {
          setEstado('error');
        }
      })),
    [id],
  );

  useEffect(() => {
    if (doc === guardadoRef.current) return;
    setEstado('pendiente');
    const t = setTimeout(() => guardar(false), ESPERA);
    return () => clearTimeout(t);
  }, [doc, guardar]);

  useEffect(() => {
    const aviso = () => {
      // al salir de la página: lo pendiente se manda con sendBeacon (sin bloquear el cierre de la ventana)
      if (docRef.current !== guardadoRef.current) navigator.sendBeacon(`/api/disenos/${encodeURIComponent(id)}/guardar`, new Blob([JSON.stringify({ doc: docRef.current })], { type: 'application/json' }));
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [id]);

  return { estado, guardar };
}
