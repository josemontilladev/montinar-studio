/**
 * «Preparar este equipo»: aviso al abrir cuando a este equipo le falta lo que usan la voz y los subtítulos (Python,
 * sus paquetes y el modelo de whisper), y el panel de la sección «Este equipo» del diálogo Dependencias. Nada se
 * descarga hasta que el usuario pulsa el botón; la preparación corre en segundo plano (servidor/equipo.ts).
 */
import React, { useEffect, useState } from 'react';

type Componente = { id: 'python' | 'base' | 'modelo' | 'ia'; nombre: string; estado: 'ok' | 'falta'; detalle: string; usadoPara: string; grupo: 'base' | 'ia'; mb: number };
type Trabajo = {
  grupos: string[];
  estado: 'corriendo' | 'hecho' | 'error';
  paso: string;
  pasos: string[];
  indice: number;
  bytes: number;
  total: number;
  velocidad: number;
  restanteS: number | null;
  error?: string;
  resultado?: { voz?: string; subtitulos?: string; ia?: string };
};
export type EstadoEquipo = { runtime: string; python: string; propio: boolean; componentes: Componente[]; faltaBase: boolean; mbBase: number; mbIa: number; trabajo: Trabajo | null };

const fmtMB = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} GB` : `${Math.round(n)} MB`);
const fmtTiempo = (s: number | null) => (s == null ? '' : s < 60 ? 'menos de un minuto' : `unos ${Math.round(s / 60)} min`);

/** Estado del equipo; mientras se prepara, se consulta cada segundo. */
export const useEquipo = () => {
  const [e, setE] = useState<EstadoEquipo | null>(null);
  const cargar = () =>
    fetch('/api/equipo')
      .then((r) => (r.ok ? r.json() : null))
      .then(setE)
      .catch(() => {});
  useEffect(() => {
    cargar();
  }, []);
  const corriendo = e?.trabajo?.estado === 'corriendo';
  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(cargar, 1000);
    return () => clearInterval(id);
  }, [corriendo]);
  const preparar = (grupos: ('base' | 'ia')[], reinstalar?: Componente['id']) =>
    fetch('/api/equipo/preparar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grupos, reinstalar }) }).then(cargar);
  const cancelar = () => fetch('/api/equipo/cancelar', { method: 'POST' }).then(cargar);
  return { e, cargar, preparar, cancelar };
};

/** Progreso de la preparación: paso N de M, megas, velocidad y tiempo restante, o el resultado. */
export const ProgresoEquipo: React.FC<{ t: Trabajo; cancelar: () => void }> = ({ t, cancelar }) => {
  const descargando = t.paso === 'Descargando';
  const pct = t.total ? Math.round((t.bytes / t.total) * 100) : 0;
  if (t.estado === 'error')
    return (
      <div className="equipo-res error" data-prueba="equipo-error">
        <b>No se pudo terminar.</b> {t.error}
      </div>
    );
  if (t.estado === 'hecho')
    return (
      <div className="equipo-res" data-prueba="equipo-hecho">
        <b>Este equipo está preparado.</b>
        {[t.resultado?.voz, t.resultado?.subtitulos, t.resultado?.ia].filter(Boolean).map((x) => (
          <div key={x}>{x}</div>
        ))}
      </div>
    );
  return (
    <div className="equipo-prog" data-prueba="equipo-progreso">
      <div className="fila-act">
        <span>
          Paso {t.indice + 1} de {t.pasos.length}: {t.paso}
          {descargando && t.total ? ` · ${fmtMB(t.bytes / 1e6)} de ${fmtMB(t.total / 1e6)}` : '…'}
        </span>
        <button className="btn chico plano" onClick={cancelar}>
          Cancelar
        </button>
      </div>
      <progress max={1} value={descargando ? pct / 100 : (t.indice + 0.5) / t.pasos.length} />
      {descargando && t.velocidad > 0 && (
        <span className="tenue-equipo">
          {fmtMB(t.velocidad / 1e6)}/s · quedan {fmtTiempo(t.restanteS)} · puedes seguir trabajando mientras tanto
        </span>
      )}
    </div>
  );
};

/** Aviso no bloqueante al abrir: solo si falta algo de la voz o los subtítulos, o mientras se prepara. */
export const AvisoEquipo: React.FC = () => {
  const { e, preparar, cancelar } = useEquipo();
  const [ahoraNo, setAhoraNo] = useState(() => {
    try {
      return sessionStorage.getItem('equipo-ahora-no') === '1';
    } catch {
      return false;
    }
  });
  const [cerradoFin, setCerradoFin] = useState(false);
  if (!e) return null;
  const t = e.trabajo;
  if (t && !cerradoFin) {
    return (
      <div className="aviso-act aviso-equipo" data-prueba="aviso-equipo">
        <ProgresoEquipo t={t} cancelar={cancelar} />
        {t.estado !== 'corriendo' && (
          <div className="fila-act">
            {t.estado === 'error' && (
              <button className="btn chico activo" onClick={() => preparar(t.grupos as ('base' | 'ia')[])}>
                Volver a intentarlo
              </button>
            )}
            <button className="btn chico plano" onClick={() => setCerradoFin(true)}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    );
  }
  if (!e.faltaBase || ahoraNo) return null;
  return (
    <div className="aviso-act aviso-equipo" data-prueba="aviso-equipo">
      <div>
        <b>Este equipo necesita preparar la voz y los subtítulos</b> (≈ {fmtMB(e.mbBase)} de descarga). Se instala todo solo, en tu carpeta de usuario y sin permisos de administrador.
      </div>
      <div className="fila-act">
        <button className="btn chico activo" onClick={() => preparar(['base'])} data-prueba="preparar-equipo">
          Preparar este equipo
        </button>
        <button
          className="btn chico plano"
          onClick={() => {
            setAhoraNo(true);
            try {
              sessionStorage.setItem('equipo-ahora-no', '1');
            } catch {}
          }}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
};

/** Sección «Este equipo» del diálogo Dependencias: estado de cada componente, preparar y reinstalar. */
export const PanelEquipo: React.FC = () => {
  const { e, preparar, cancelar } = useEquipo();
  if (!e) return <div className="vacio">Comprobando este equipo…</div>;
  const corriendo = e.trabajo?.estado === 'corriendo';
  const faltaIa = e.componentes.find((c) => c.id === 'ia')?.estado !== 'ok';
  return (
    <div style={{ marginBottom: 14 }} data-prueba="panel-equipo">
      <div className="subtit" style={{ padding: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1 }}>Este equipo (se instala solo)</span>
        {e.faltaBase && (
          <button className="btn chico activo" disabled={corriendo} onClick={() => preparar(['base'])}>
            Preparar este equipo (≈ {fmtMB(e.mbBase)})
          </button>
        )}
        {faltaIa && (
          <button className="btn chico" disabled={corriendo} onClick={() => preparar(['ia'])}>
            Instalar efectos de IA (≈ {fmtMB(e.mbIa)})
          </button>
        )}
      </div>
      {e.trabajo && (
        <div style={{ padding: '8px 10px', marginBottom: 6, borderRadius: 8, background: 'var(--panel2)' }}>
          <ProgresoEquipo t={e.trabajo} cancelar={cancelar} />
        </div>
      )}
      {e.componentes.map((c) => (
        <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 10px', marginBottom: 4, borderRadius: 8, background: 'var(--panel2)', borderLeft: `3px solid ${c.estado === 'ok' ? 'var(--verde)' : c.grupo === 'ia' ? 'var(--ambar)' : 'var(--rojo)'}` }} data-dep={`equipo-${c.id}`} data-estado={c.estado}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>
              {c.nombre} <span style={{ color: 'var(--tenue)', fontWeight: 400, fontSize: 11.5 }}>· {c.usadoPara}</span>
            </div>
            <div style={{ color: 'var(--suave)', fontSize: 12, wordBreak: 'break-all' }}>{c.detalle}</div>
          </div>
          {c.estado === 'ok' && (c.id !== 'python' || e.propio) && (
            <button className="btn chico plano" disabled={corriendo} title={`Volver a descargar e instalar: ${c.nombre}`} onClick={() => preparar(c.grupo === 'ia' ? ['ia'] : ['base'], c.id)}>
              Reinstalar
            </button>
          )}
          <span className={`chip ${c.estado === 'ok' ? '' : c.grupo === 'ia' ? 'aviso' : 'error'}`} style={{ alignSelf: 'flex-start' }}>
            {c.estado === 'ok' ? 'Listo' : c.grupo === 'ia' ? 'Opcional' : 'Falta'}
          </span>
        </div>
      ))}
      <div style={{ color: 'var(--tenue)', fontSize: 11.5 }}>Se instala en {e.runtime} (solo en este equipo, no en la carpeta sincronizada).</div>
    </div>
  );
};
