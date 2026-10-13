/** Barra superior, diálogos (exportar, versiones, atajos), bandeja de trabajos y avisos. */
import React, { useEffect, useState } from 'react';
import { fondoCierra } from './campos';
import { FORMATOS, validarProyecto, type Formato } from '@contrato/esquema';
import { fmtT, useEd } from './estado';
import { api, type Trabajo, type Version } from './api';
import { Ico } from './iconos';
import { guardarAhora } from './guardado';
import { DExportar } from './DExportar';
import { PanelRevision } from './Revision';
import { DDependencias } from './Dependencias';

const Velo: React.FC<{ children: React.ReactNode; cerrar: () => void }> = ({ children, cerrar }) => (
  <div className="velo" {...fondoCierra(() => cerrar())}>
    {children}
  </div>
);

const DVersiones: React.FC = () => {
  const [vs, setVs] = useState<Version[] | null>(null);
  const [rama, setRama] = useState('');
  const cerrar = () => useEd.setState({ dialogo: null });
  useEffect(() => {
    api.versiones().then(setVs).catch(() => setVs([]));
  }, []);
  return (
    <Velo cerrar={cerrar}>
      <div className="dialogo" data-prueba="dialogo-versiones">
        <div className="cab">
          <h3>Versiones de proyecto.json</h3>
          <button
            className="btn chico"
            onClick={async () => {
              await guardarAhora(true, 'manual');
              setVs(await api.versiones());
            }}
          >
            Guardar versión ahora
          </button>
          <span style={{ width: 8 }} />
          <button className="btn icono chico" onClick={cerrar}>
            <Ico n="cerrar" />
          </button>
        </div>
        <div className="cuerpo">
          <div className="ayuda">Antes de sobrescribir proyecto.json se guarda una copia (cada 3 min como mucho, o al pulsar Ctrl+S). Están en la carpeta .versiones del proyecto. Restaurar se puede deshacer.</div>
          <div className="fila" style={{ margin: '4px 0 12px' }}>
            <input type="text" placeholder="Nombre (p. ej. «versión corta», «para cliente»)" value={rama} onChange={(e) => setRama(e.target.value)} data-prueba="rama-nombre" />
            <button
              className="btn chico"
              disabled={!rama.trim()}
              onClick={async () => {
                await guardarAhora(true, `rama-${rama.trim()}`);
                setRama('');
                setVs(await api.versiones());
              }}
            >
              Guardar con nombre
            </button>
          </div>
          <div className="lista-v">
            {vs == null && <div className="vacio">Cargando…</div>}
            {vs?.length === 0 && <div className="vacio">Aún no hay versiones.</div>}
            {vs?.map((v) => (
              <div className="v" key={v.nombre}>
                <span>
                  {v.nombre.includes('_rama-') && <b style={{ color: 'var(--acento)', marginRight: 8 }}>{v.nombre.split('_rama-')[1].replace(/\.json$/, '').replace(/-/g, ' ')}</b>}
                  {v.nombre.replace(/\.json$/, '').split('_rama-')[0].replace('_', ' ')}
                </span>
                <small style={{ color: 'var(--tenue)' }}>{(v.tam / 1024).toFixed(0)} KB</small>
                <button
                  className="btn chico"
                  onClick={async () => {
                    try {
                      const p = validarProyecto(await api.version(v.nombre));
                      useEd.getState().reemplazar(p, 'restaurar');
                      useEd.getState().avisar(`Restaurada ${v.nombre} (Ctrl+Z para volver)`, 'ok');
                      cerrar();
                    } catch (e: any) {
                      useEd.getState().avisar(e.message, 'error');
                    }
                  }}
                >
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Velo>
  );
};

const DRevision: React.FC = () => {
  const cerrar = () => useEd.setState({ dialogo: null });
  return (
    <Velo cerrar={cerrar}>
      <div className="dialogo" style={{ width: 760 }}>
        <div className="cab">
          <h3>Revisión de calidad</h3>
          <button className="btn icono chico" onClick={cerrar}>
            <Ico n="cerrar" />
          </button>
        </div>
        <div className="cuerpo">
          <PanelRevision />
        </div>
      </div>
    </Velo>
  );
};

import { DialogoFuentes } from './Galerias';
import { DGrabar } from './Grabar';
import { Inicio } from './Inicio';

const ATAJOS: [string, string][] = [
  ['Espacio', 'Reproducir / pausa'],
  ['← / →', 'Fotograma anterior / siguiente (Mayús: 1 s)'],
  ['Inicio / Fin', 'Ir al principio / final'],
  ['↑ / ↓', 'Corte anterior / siguiente'],
  ['S', 'Dividir la escena en el cursor'],
  ['Q / W', 'Recortar a la izquierda / derecha del cursor'],
  ['A / B', 'Herramienta selección / cuchilla'],
  ['Supr / Retroceso', 'Borrar la selección'],
  ['Ctrl + D', 'Duplicar la selección'],
  ['Ctrl + Z', 'Deshacer'],
  ['Ctrl + Mayús + Z / Ctrl + Y', 'Rehacer'],
  ['Ctrl + S', 'Guardar ahora y crear versión'],
  ['Ctrl + E', 'Exportar'],
  ['L', 'Repetir en bucle'],
  ['G', 'Zonas seguras'],
  ['F', 'Pantalla completa'],
  ['+ / −', 'Zoom de la línea de tiempo (Ctrl + rueda)'],
  ['Ctrl + clic', 'Añadir o quitar de la selección (edición por lotes)'],
  ['Ctrl + Alt + C / Ctrl + Alt + V', 'Copiar / pegar el estilo de un texto'],
  ['Ctrl + Alt + A', 'Usar el estilo del texto seleccionado en todos los titulares'],
  ['Doble clic (visor)', 'Editar el texto en el propio vídeo'],
  ['Arrastrar (visor)', 'Mover textos y elementos; asas para tamaño y giro'],
  ['Mayús + arrastrar', 'Mover solo en horizontal o vertical / girar de 15 en 15°'],
  ['Clic derecho', 'Menú con las acciones del clip, texto o elemento'],
  ['T', 'Abrir las tipografías del texto seleccionado'],
  ['Esc', 'Quitar la selección'],
  ['?', 'Esta ayuda'],
];

const DAtajos: React.FC = () => {
  const cerrar = () => useEd.setState({ dialogo: null });
  return (
    <Velo cerrar={cerrar}>
      <div className="dialogo" style={{ width: 520 }}>
        <div className="cab">
          <h3>Atajos de teclado</h3>
          <button className="btn icono chico" onClick={cerrar}>
            <Ico n="cerrar" />
          </button>
        </div>
        <div className="cuerpo atajos">
          {ATAJOS.map(([k, d]) => (
            <React.Fragment key={k}>
              <div>
                {k.split(' / ').map((x, i) => (
                  <React.Fragment key={x}>
                    {i > 0 && ' / '}
                    <kbd>{x}</kbd>
                  </React.Fragment>
                ))}
              </div>
              <div>{d}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </Velo>
  );
};

export const Dialogos: React.FC = () => {
  const d = useEd((s) => s.dialogo);
  if (d === 'exportar') return <DExportar />;
  if (d === 'revision') return <DRevision />;
  if (d === 'dependencias') return <DDependencias />;
  if (d === 'versiones') return <DVersiones />;
  if (d === 'atajos') return <DAtajos />;
  if (d === 'fuentes') return <DialogoFuentes />;
  if (d === 'grabar') return <DGrabar />;
  if (d === 'inicio') return <Inicio />;
  return null;
};

const ItemTrabajo: React.FC<{ t: Trabajo; quitar: () => void }> = ({ t, quitar }) => {
  const dur = ((t.fin ?? Date.now()) - t.inicio) / 1000;
  return (
    <div className={`trabajo ${t.estado}`} data-trabajo={t.tipo} data-estado={t.estado}>
      <div className="t1">
        <Ico n={t.tipo === 'voz' ? 'voz' : t.tipo === 'fotograma' ? 'fotograma' : 'exportar'} />
        <span>{t.titulo}</span>
        {t.estado === 'corriendo' ? (
          <button className="btn chico" onClick={() => api.cancelar(t.id)}>
            Cancelar
          </button>
        ) : (
          <button className="btn chico icono" onClick={quitar} title="Ocultar">
            <Ico n="cerrar" />
          </button>
        )}
      </div>
      <div className="et">
        {t.estado === 'hecho' ? '✓ ' : t.estado === 'cancelado' ? '⨯ ' : ''}
        {t.etapa} · {dur.toFixed(0)} s
      </div>
      <div className="prog">
        <i style={{ width: `${Math.round((t.estado === 'hecho' ? 1 : t.progreso) * 100)}%` }} />
      </div>
      {t.estado === 'hecho' && t.resultado?.url && (
        <div className="fila" style={{ marginTop: 8 }}>
          <a className="btn chico" href={t.resultado.url} target="_blank" rel="noreferrer" data-prueba="abrir-salida">
            Abrir {t.tipo === 'fotograma' ? 'PNG' : 'vídeo'}
          </a>
          <button className="btn chico" onClick={() => api.mostrar(t.resultado.archivo)}>
            <Ico n="carpeta" /> Carpeta
          </button>
          <span style={{ color: 'var(--tenue)', fontSize: 11 }}>{(t.resultado.tam / 1e6).toFixed(1)} MB</span>
        </div>
      )}
      {t.estado === 'hecho' && t.resultado?.sonoridad && (
        <div className="chip" style={{ marginTop: 6 }}>
          Sonoridad {t.resultado.sonoridad.antes.lufs} → {t.resultado.sonoridad.despues.lufs} LUFS · pico {t.resultado.sonoridad.despues.pico} dBTP
        </div>
      )}
      {t.estado === 'hecho' && t.resultado?.fluidez && <Fluidez f={t.resultado.fluidez} />}
      {t.estado === 'error' && <div className="err">{t.error}</div>}
    </div>
  );
};

export const Bandeja: React.FC = () => {
  const ts = useEd((s) => s.trabajos);
  const [ocultos, setOcultos] = useState<string[]>([]);
  // los que terminan se ocultan solos (las exportaciones se quedan unos minutos para poder abrirlas)
  const [, setTic] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTic((x) => x + 1), 4000);
    return () => clearInterval(i);
  }, []);
  const vida = (t: Trabajo) => (t.tipo === 'exportar' || t.tipo === 'fotograma' || t.estado === 'error' ? 45000 : 12000);
  const vis = ts.filter((t) => !ocultos.includes(t.id) && (t.estado === 'corriendo' || (t.fin ?? 0) > Date.now() - vida(t))).slice(0, 3);
  if (!vis.length) return null;
  return (
    <div className="bandeja" data-prueba="bandeja">
      {vis.map((t) => (
        <ItemTrabajo key={t.id} t={t} quitar={() => setOcultos((o) => [...o, t.id])} />
      ))}
    </div>
  );
};

export const Avisos: React.FC = () => {
  const a = useEd((s) => s.aviso);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!a) return;
    setVis(true);
    const t = setTimeout(() => setVis(false), a.tipo === 'error' ? 6000 : 2600);
    return () => clearTimeout(t);
  }, [a]);
  if (!a || !vis) return null;
  return (
    <div className={`aviso ${a.tipo}`} data-prueba="aviso">
      {a.texto}
    </div>
  );
};

/** Resultado del control de fluidez de una exportación. */
export const Fluidez: React.FC<{ f: { fps: number; tirones: number; zonasTirones: { desde: number; hasta: number; n: number }[]; congelados: { desde: number; hasta: number }[]; negros: { desde: number; hasta: number }[] } }> = ({ f }) => {
  const s = (x: number) => `${x.toFixed(1).replace('.', ',')} s`;
  const ok = f.tirones === 0 && !f.negros.length;
  return (
    <div style={{ marginTop: 8, fontSize: 11.5 }} data-prueba="fluidez">
      <span className={`chip ${ok ? '' : 'aviso'}`}>
        Fluidez ({f.fps} fps): {f.tirones ? `${f.tirones} fotograma(s) repetido(s) en movimiento` : 'sin tirones'}
        {f.negros.length ? ` · ${f.negros.length} tramo(s) en negro` : ''}
      </span>
      {f.zonasTirones.length > 0 && <div style={{ color: 'var(--suave)', marginTop: 4 }}>Tirones en: {f.zonasTirones.slice(0, 8).map((z) => s(z.desde)).join(' · ')}</div>}
      {f.congelados.length > 0 && <div style={{ color: 'var(--tenue)', marginTop: 2 }}>Pausas (imagen quieta &gt; 1 s): {f.congelados.slice(0, 6).map((z) => `${s(z.desde)}–${s(z.hasta)}`).join(' · ')}</div>}
    </div>
  );
};
