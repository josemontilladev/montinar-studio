/** Aviso de actualización (app de escritorio): descargando, lista para instalar al reiniciar, o error. */
import React, { useEffect, useState } from 'react';
import { accion, enEscritorio } from './escritorio';
import { useEd } from './estado';

export type EstadoAct = { estado: string; version: string; nueva?: string; progreso?: number; error?: string };
let ultimo: EstadoAct | null = null;
const oyentes = new Set<(e: EstadoAct) => void>();
(window as any).__actualizacion = (e: EstadoAct) => {
  ultimo = e;
  oyentes.forEach((f) => f(e));
};

export const buscarActualizaciones = async () => {
  const s = useEd.getState();
  if (!enEscritorio()) return s.avisar('Las actualizaciones automáticas son de la app de escritorio');
  const e: EstadoAct | null = await accion('buscar-actualizaciones');
  const t: Record<string, string> = {
    'sin-canal': 'No hay canal de actualizaciones configurado (ver LEEME → Actualizaciones)',
    desarrollo: 'En modo desarrollo no se buscan actualizaciones',
    'no-disponible': 'El actualizador no está disponible en esta instalación',
    'al-dia': `Estás en la última versión (${e?.version})`,
    buscando: 'Buscando actualizaciones…',
    descargando: `Descargando la versión ${e?.nueva}…`,
    lista: `La versión ${e?.nueva} está lista: se instala al reiniciar`,
    error: `No se pudo buscar: ${e?.error ?? ''}`,
  };
  s.avisar(t[e?.estado ?? 'sin-canal'] ?? String(e?.estado), e?.estado === 'error' ? 'error' : 'info');
};

export const AvisoActualizacion: React.FC = () => {
  const [e, setE] = useState<EstadoAct | null>(ultimo);
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    oyentes.add(setE);
    return () => void oyentes.delete(setE);
  }, []);
  if (!e || oculto || !['descargando', 'lista'].includes(e.estado)) return null;
  return (
    <div className="aviso-act" data-prueba="aviso-actualizacion">
      {e.estado === 'descargando' ? (
        <>Descargando la versión {e.nueva} · {Math.round((e.progreso ?? 0) * 100)} %</>
      ) : (
        <>
          Versión {e.nueva} lista.
          <button className="btn chico prim" onClick={() => accion('instalar-actualizacion')} data-prueba="instalar-actualizacion">
            Reiniciar e instalar
          </button>
          <button className="btn chico" onClick={() => setOculto(true)}>
            Al cerrar
          </button>
        </>
      )}
    </div>
  );
};
