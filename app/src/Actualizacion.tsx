/** Aviso de actualización (app de escritorio): descargando, lista para instalar al reiniciar, o error. */
import React, { useEffect, useState } from 'react';
import { accion, enEscritorio } from './escritorio';
import { useEd } from './estado';
import { guardarAhora } from './guardado';

export type EstadoAct = { estado: string; version: string; nueva?: string; notas?: string; progreso?: number; error?: string; detalle?: string };
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
    'sin-canal': 'No hay origen de actualizaciones configurado (ver LEEME → Actualizaciones)',
    'sin-versiones': e?.detalle ?? 'Todavía no hay ninguna versión publicada en la carpeta de actualizaciones',
    desarrollo: 'En modo desarrollo no se buscan actualizaciones',
    'no-disponible': 'El actualizador no está disponible en esta instalación',
    'al-dia': `Estás en la última versión (${e?.version})`,
    buscando: 'Buscando actualizaciones…',
    descargando: `Descargando la versión ${e?.nueva}…`,
    lista: `La versión ${e?.nueva} está lista: se instala al reiniciar`,
    error: `No se pudo buscar: ${e?.error ?? 'sin conexión con el origen'}`,
  };
  s.avisar(t[e?.estado ?? 'sin-canal'] ?? String(e?.estado), e?.estado === 'error' ? 'error' : 'info');
};

/** Guarda el proyecto y reinicia para instalar; con un trabajo en marcha (exportación, voz…) espera. */
const reiniciarEInstalar = async () => {
  const s = useEd.getState();
  const enMarcha = s.trabajos.filter((t) => t.estado === 'corriendo');
  if (enMarcha.length) {
    s.avisar(`Hay ${enMarcha.length === 1 ? `un trabajo en marcha (${enMarcha[0].titulo})` : `${enMarcha.length} trabajos en marcha`}: se instalará cuando termine o al cerrar la app`, 'info');
    return;
  }
  try {
    await guardarAhora(true, 'antes de actualizar');
  } catch {
    s.avisar('No se pudo guardar el proyecto: no se reinicia. Guarda con Ctrl+S y vuelve a intentarlo', 'error');
    return;
  }
  if (useEd.getState().guardado === 'error') {
    s.avisar('No se pudo guardar el proyecto: no se reinicia. Guarda con Ctrl+S y vuelve a intentarlo', 'error');
    return;
  }
  await accion('instalar-actualizacion');
};

export const AvisoActualizacion: React.FC = () => {
  const [e, setE] = useState<EstadoAct | null>(ultimo);
  const [oculto, setOculto] = useState(false);
  const [verNotas, setVerNotas] = useState(false);
  useEffect(() => {
    oyentes.add(setE);
    return () => void oyentes.delete(setE);
  }, []);
  if (!e || oculto || !['descargando', 'lista'].includes(e.estado)) return null;
  return (
    <div className="aviso-act" data-prueba="aviso-actualizacion">
      {e.estado === 'descargando' ? (
        <div className="fila-act">
          <span>
            Hay una versión nueva ({e.nueva}). Descargando · {Math.round((e.progreso ?? 0) * 100)} %
          </span>
          <progress value={e.progreso ?? 0} max={1} />
        </div>
      ) : (
        <>
          <div className="fila-act">
            <span>
              Hay una versión nueva (<b>{e.nueva}</b>), ya descargada.
            </span>
            <button className="btn chico prim" onClick={() => void reiniciarEInstalar()} data-prueba="instalar-actualizacion">
              Actualizar y reiniciar
            </button>
            <button className="btn chico" onClick={() => setOculto(true)} title="Se instala sola al cerrar la app">
              Al cerrar
            </button>
            {e.notas && (
              <button className="btn chico plano" onClick={() => setVerNotas(!verNotas)} data-prueba="notas-actualizacion">
                {verNotas ? 'Ocultar novedades' : 'Novedades'}
              </button>
            )}
          </div>
          {verNotas && e.notas && <pre className="notas-act">{e.notas}</pre>}
        </>
      )}
    </div>
  );
};
