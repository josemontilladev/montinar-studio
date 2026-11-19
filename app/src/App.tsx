import React, { useEffect, useState } from 'react';
import { validarProyecto } from '@contrato/esquema';
import { irA, reproductor, useEd } from './estado';
import { api, type Version } from './api';
import { Visor } from './Visor';
import { Linea, accionBorrar, accionDividir, accionDuplicar, accionRecortar } from './Linea';
import { Inspector } from './Inspector';
import { Biblioteca } from './Biblioteca';
import { Avisos, Bandeja, Dialogos } from './Dialogos';
import { BarraTitulo } from './BarraTitulo';
import { guardarAhora, iniciarGuardado, leerRespaldo } from './guardado';
import { iniciarDiario, leerDiario, restaurarDiario, sesionRota, type Diario } from './diario';
import { aplicarTerminados } from './voz';
import { aplicarSubtitulos } from './subtitulos';
import { aplicarAudio } from './audioPro';
import { MenuContextual, Peticion } from './menus';
import { seguirTrabajos } from './escritorio';
import { AvisoActualizacion } from './Actualizacion';
import { AvisoEquipo } from './Equipo';
import { aplicarSeguimiento, pedirZona } from './Seguimiento';
import { cargarFuentesProyecto, copiarEstilo, estiloEnTodos, pegarEstilo, useCatalogo } from './libreria';

export const cargarProxies = () =>
  api
    .proxies()
    .then((l) => useEd.setState({ proxies: Object.fromEntries(l.map((x) => [x.src, x.estado])) }))
    .catch(() => {});

const enCampo = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) && (t as HTMLInputElement).type !== 'range' && (t as HTMLInputElement).type !== 'checkbox';
};

const atajos = (e: KeyboardEvent) => {
  const s = useEd.getState();
  if (!s.proyecto || !s.linea) return;
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (ctrl && k === 's') {
    e.preventDefault();
    guardarAhora(true, 'manual').then(() => s.avisar('Guardado · versión creada', 'ok'));
    return;
  }
  if (ctrl && k === 'e') {
    e.preventDefault();
    useEd.setState({ dialogo: 'exportar' });
    return;
  }
  if (enCampo(e)) return;
  if (ctrl && e.altKey && (k === 'c' || k === 'v' || k === 'a')) {
    e.preventDefault();
    if (k === 'c') copiarEstilo();
    else if (k === 'v') pegarEstilo();
    else estiloEnTodos();
    return;
  }
  if (ctrl && k === 'z' && !e.shiftKey) {
    e.preventDefault();
    s.deshacer();
  } else if ((ctrl && k === 'z' && e.shiftKey) || (ctrl && k === 'y')) {
    e.preventDefault();
    s.rehacer();
  } else if (ctrl && k === 'd') {
    e.preventDefault();
    accionDuplicar();
  } else if (ctrl) return;
  else if (e.key === ' ') {
    e.preventDefault();
    reproductor.ref?.toggle();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    irA(s.frame - (e.shiftKey ? s.linea.fps : 1));
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    irA(s.frame + (e.shiftKey ? s.linea.fps : 1));
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const cortes = [...new Set([0, ...s.linea.escenas.map((x) => x.inicio), s.linea.total - 1])].sort((a, b) => a - b);
    const f = e.key === 'ArrowUp' ? [...cortes].reverse().find((c) => c < s.frame) : cortes.find((c) => c > s.frame);
    if (f != null) irA(f);
  } else if (e.key === 'Home') irA(0);
  else if (e.key === 'End') irA(s.linea.total - 1);
  else if (k === 's') accionDividir();
  else if (k === 'q') accionRecortar('izq');
  else if (k === 'w') accionRecortar('der');
  else if (k === 'a') useEd.setState({ herramienta: 'seleccion' });
  else if (k === 'b') useEd.setState({ herramienta: 'cuchilla' });
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    accionBorrar();
  } else if (k === 'l') useEd.setState({ bucle: !s.bucle });
  else if (k === 'g') useEd.setState({ zonas: !s.zonas });
  else if (k === 'f') reproductor.ref?.requestFullscreen();
  else if (e.key === '+' || e.key === '=') useEd.setState({ pxf: Math.min(16, s.pxf * 1.25) });
  else if (e.key === '-') useEd.setState({ pxf: Math.max(0.3, s.pxf / 1.25) });
  else if (k === 't' && (s.sel?.tipo === 'texto' || s.multi.some((x) => x.tipo === 'texto'))) useEd.setState({ dialogo: 'fuentes' });
  else if (e.key === 'Enter' && s.sel?.tipo === 'texto') {
    e.preventDefault();
    useEd.setState({ editando: { escena: s.sel.escena, id: s.sel.id } });
  } else if (e.key === 'Escape') {
    pedirZona(null);
    useEd.setState({ sel: null, multi: [], dialogo: null, menu: null, editando: null });
  }
  else if (e.key === '?') useEd.setState({ dialogo: 'atajos' });
};

/** Divisor entre la zona de arriba y la línea de tiempo (cambia --alto-sup). */
const Divisor: React.FC = () => (
  <div
    className="divisor"
    title="Arrastra para cambiar el alto de la línea de tiempo"
    onPointerDown={(e) => {
      const y0 = e.clientY;
      const sup = document.querySelector('.superior') as HTMLElement;
      const h0 = sup.getBoundingClientRect().height;
      const mv = (ev: PointerEvent) => document.documentElement.style.setProperty('--alto-sup', `${Math.max(260, Math.min(window.innerHeight - 220, h0 + (ev.clientY - y0)))}px`);
      const up = () => (window.removeEventListener('pointermove', mv), window.removeEventListener('pointerup', up));
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up);
    }}
  />
);

/** Divisor de columnas (izquierda / derecha). */
const DivCol: React.FC<{ lado: 'izq' | 'der' }> = ({ lado }) => (
  <div
    className="div-col"
    onPointerDown={(e) => {
      const x0 = e.clientX;
      const panel = document.querySelector(lado === 'izq' ? '.izq' : '.der') as HTMLElement;
      const w0 = panel.getBoundingClientRect().width;
      const mv = (ev: PointerEvent) => {
        const w = Math.max(280, Math.min(window.innerWidth * 0.42, w0 + (lado === 'izq' ? 1 : -1) * (ev.clientX - x0)));
        document.documentElement.style.setProperty(lado === 'izq' ? '--ancho-izq' : '--ancho-der', `${w}px`);
      };
      const up = () => (window.removeEventListener('pointermove', mv), window.removeEventListener('pointerup', up));
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up);
    }}
  />
);

export const App: React.FC = () => {
  const proyecto = useEd((s) => s.proyecto);
  const catalogo = useCatalogo();
  const [error, setError] = useState<string | null>(null);
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [respaldo, setRespaldo] = useState<null | { t: number; proyecto: unknown }>(null);
  const [diario, setDiario] = useState<Diario | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const est = await api.estado();
        useEd.setState({ picosSeg: est.picosSeg });
        if (!est.contratoIgual) setAviso('La copia de contrato/ del proyecto no coincide con la del editor: copia editor-video/contrato en src/contrato del proyecto.');
        const crudo = await api.proyecto();
        const p = validarProyecto(crudo);
        useEd.getState().cargar(p);
        useEd.setState({ ultimoGuardado: est.mtime, sel: { tipo: 'proyecto' } });
        // ?inicio=1 (p. ej. al volver desde el estudio de diseño): abrir Inicio y limpiar la URL
        const u = new URL(location.href);
        if (u.searchParams.get('inicio') === '1') {
          useEd.setState({ dialogo: 'inicio' });
          u.searchParams.delete('inicio');
          history.replaceState(null, '', u.pathname + u.search + u.hash);
        }
        iniciarGuardado(est.proyecto);
        // recuperación: si la sesión anterior no se cerró bien, se ofrece dejarlo todo como estaba
        const d = await leerDiario();
        if (sesionRota(d)) setDiario(d);
        iniciarDiario();
        const r = leerRespaldo();
        if (r && !r.guardado && r.t > est.mtime && JSON.stringify(r.proyecto) !== JSON.stringify(p)) setRespaldo(r);
      } catch (e: any) {
        setError(e.message);
        api.versiones().then(setVersiones).catch(() => {});
      }
      api.medios().then((m) => useEd.setState({ medios: m })).catch(() => {});
      cargarProxies();
      api.voces().then((v) => useEd.setState({ voces: v.voces, vozDefecto: v.porDefecto })).catch(() => {});
    })();
    const es = new EventSource('/api/eventos');
    let antes = '';
    es.onmessage = (ev) => {
      const ts = JSON.parse(ev.data);
      useEd.setState({ trabajos: ts });
      aplicarTerminados(ts);
      aplicarSubtitulos(ts);
      aplicarAudio(ts);
      seguirTrabajos(ts);
      aplicarSeguimiento(ts);
      // al terminar una voz o una exportación, refrescar la lista de medios
      const fin = ts.filter((t: any) => t.estado !== 'corriendo').map((t: any) => t.id).join(',');
      if (fin !== antes) {
        antes = fin;
        api.medios().then((m) => useEd.setState({ medios: m })).catch(() => {});
        cargarProxies();
      }
    };
    window.addEventListener('keydown', atajos);
    return () => {
      es.close();
      window.removeEventListener('keydown', atajos);
    };
  }, []);

  if (error)
    return (
      <div className="pantalla">
        <div>
          <h2>No se pudo abrir el proyecto</h2>
          <pre>{error}</pre>
          {versiones.length > 0 && (
            <>
              <p>Puedes recuperar una versión anterior:</p>
              <div className="lista-v" style={{ maxWidth: 600, margin: '0 auto' }}>
                {versiones.slice(0, 10).map((v) => (
                  <div className="v" key={v.nombre}>
                    <span>{v.nombre}</span>
                    <button
                      className="btn chico"
                      onClick={async () => {
                        const p = validarProyecto(await api.version(v.nombre));
                        await api.guardar(p, false, 'recuperada');
                        location.reload();
                      }}
                    >
                      Recuperar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  if (!proyecto) return <div className="pantalla">Cargando proyecto…</div>;
  if (catalogo) cargarFuentesProyecto(proyecto);

  return (
    <>
      {diario && (
        <div className="banner recuperar" data-prueba="recuperar-sesion" style={{ position: 'fixed', top: 48, left: '50%', transform: 'translateX(-50%)', zIndex: 46 }}>
          La sesión anterior se cerró de forma inesperada ({new Date(diario.t).toLocaleString('es')}).
          <button
            className="btn chico prim"
            data-prueba="restaurar-sesion"
            onClick={() => {
              restaurarDiario(diario, validarProyecto);
              setDiario(null);
              setRespaldo(null);
              useEd.getState().avisar('Sesión restaurada como estaba', 'ok');
            }}
          >
            Restaurar como estaba
          </button>
          <button className="btn chico" onClick={() => setDiario(null)}>
            Seguir sin restaurar
          </button>
        </div>
      )}
      {(respaldo || aviso) && (
        <div style={{ position: 'fixed', top: 48, left: 0, right: 0, zIndex: 45 }}>
          {respaldo && (
            <div className="banner">
              Hay cambios de una sesión anterior que no llegaron a guardarse ({new Date(respaldo.t).toLocaleString('es')}).
              <button
                className="btn chico"
                onClick={() => {
                  try {
                    useEd.getState().reemplazar(validarProyecto(respaldo.proyecto), 'respaldo');
                    useEd.getState().avisar('Cambios recuperados', 'ok');
                  } catch (e: any) {
                    useEd.getState().avisar(e.message, 'error');
                  }
                  setRespaldo(null);
                }}
              >
                Recuperar
              </button>
              <button className="btn chico" onClick={() => setRespaldo(null)}>
                Descartar
              </button>
            </div>
          )}
          {aviso && (
            <div className="banner">
              {aviso}
              <button className="btn chico" onClick={() => setAviso(null)}>
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}
      <div className="app">
        <BarraTitulo />
        <div className="superior">
          <Biblioteca />
          <DivCol lado="izq" />
          <Visor />
          <DivCol lado="der" />
          <Inspector />
        </div>
        <Divisor />
        <Linea />
      </div>
      <Dialogos />
      <MenuContextual />
      <AvisoActualizacion />
      <AvisoEquipo />
      <Peticion />
      <Bandeja />
      <Avisos />
    </>
  );
};
