/** Diálogo «Dependencias»: qué trae la app, qué tiene el proyecto y qué hace falta instalar (con instrucciones). */
import React, { useEffect, useState } from 'react';
import { fondoCierra } from './campos';
import { useEd } from './estado';
import { Ico } from './iconos';
import { PanelEquipo } from './Equipo';

type Dep = { id: string; nombre: string; grupo: string; estado: 'ok' | 'aviso' | 'falta'; detalle: string; arreglo?: string; usadoPara: string };

export const DDependencias: React.FC = () => {
  const [ds, setDs] = useState<Dep[] | null>(null);
  const cerrar = () => useEd.setState({ dialogo: null });
  const cargar = () => {
    setDs(null);
    fetch('/api/dependencias')
      .then((r) => r.json())
      .then(setDs)
      .catch(() => setDs([]));
  };
  useEffect(cargar, []);
  const grupos = [...new Set((ds ?? []).map((d) => d.grupo))];
  return (
    <div className="velo" {...fondoCierra(() => cerrar())}>
      <div className="dialogo" style={{ width: 720 }} data-prueba="dialogo-dependencias">
        <div className="cab">
          <h3>Dependencias</h3>
          <button className="btn chico" onClick={cargar}>
            Comprobar otra vez
          </button>
          <span style={{ width: 8 }} />
          <button className="btn icono chico" onClick={cerrar}>
            <Ico n="cerrar" />
          </button>
        </div>
        <div className="cuerpo">
          <PanelEquipo />
          {ds == null && <div className="vacio">Comprobando…</div>}
          {grupos.map((g) => (
            <div key={g} style={{ marginBottom: 14 }}>
              <div className="subtit" style={{ padding: '0 0 6px' }}>
                {g}
              </div>
              {ds!
                .filter((d) => d.grupo === g)
                .map((d) => (
                  <div key={d.id} style={{ display: 'flex', gap: 10, padding: '8px 10px', marginBottom: 4, borderRadius: 8, background: 'var(--panel2)', borderLeft: `3px solid ${d.estado === 'ok' ? 'var(--verde)' : d.estado === 'aviso' ? 'var(--ambar)' : 'var(--rojo)'}` }} data-dep={d.id} data-estado={d.estado}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        {d.nombre} <span style={{ color: 'var(--tenue)', fontWeight: 400, fontSize: 11.5 }}>· {d.usadoPara}</span>
                      </div>
                      <div style={{ color: 'var(--suave)', fontSize: 12, wordBreak: 'break-all' }}>{d.detalle}</div>
                      {d.arreglo && (
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                          Cómo arreglarlo: <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: 4, userSelect: 'text' }}>{d.arreglo}</code>
                        </div>
                      )}
                    </div>
                    <span className={`chip ${d.estado === 'ok' ? '' : d.estado === 'aviso' ? 'aviso' : 'error'}`} style={{ alignSelf: 'flex-start' }}>
                      {d.estado === 'ok' ? 'Listo' : d.estado === 'aviso' ? 'Aviso' : 'Falta'}
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
