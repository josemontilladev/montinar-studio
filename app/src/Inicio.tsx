/**
 * Inicio: proyectos recientes con miniatura, búsqueda, duplicar, renombrar, borrar (a la papelera de la app, se puede
 * recuperar) y proyectos nuevos desde plantillas (Reel, Short, Anuncio, 1:1, 16:9, Presentación de web).
 */
import React, { useEffect, useState } from 'react';
import { PLANTILLAS } from '@proyecto';
import { validarProyecto, type TEscena, type TProyecto } from '@contrato/esquema';
import { nid, useEd } from './estado';
import { Ico } from './iconos';
import { accion, enEscritorio } from './escritorio';
import { pedirTexto } from './menus';
import { InicioDisenos } from './InicioDisenos';

type Proy = { ruta: string; nombre: string; mtime: number; escenas: number; duracion: number; formato: string; actual: boolean };
type Papel = { nombre: string; ruta: string; mtime: number };

export const PLANTILLAS_PROYECTO: { id: string; nombre: string; desc: string; ancho: number; alto: number; fps: number; escenas: string[] }[] = [
  { id: 'reel', nombre: 'Reel 9:16', desc: 'Gancho, producto, lista, llamada y cierre · 60 fps', ancho: 1080, alto: 1920, fps: 60, escenas: ['kit-gancho', 'kit-dispositivo', 'kit-lista', 'kit-cta', 'kit-outro'] },
  { id: 'short', nombre: 'Short', desc: 'Vertical corto, 30 fps', ancho: 1080, alto: 1920, fps: 30, escenas: ['kit-gancho', 'completa', 'kit-cita', 'kit-outro'] },
  { id: 'anuncio', nombre: 'Anuncio 4:5', desc: 'Para el feed: gancho, antes/después y llamada', ancho: 1080, alto: 1350, fps: 30, escenas: ['kit-gancho', 'kit-antes-despues', 'kit-cta'] },
  { id: 'cuadrado', nombre: 'Cuadrado 1:1', desc: 'Rótulo, toma y tarjeta final', ancho: 1080, alto: 1080, fps: 30, escenas: ['titulo', 'completa', 'tarjeta'] },
  { id: 'horizontal', nombre: 'Horizontal 16:9', desc: 'Para YouTube o la web', ancho: 1920, alto: 1080, fps: 30, escenas: ['titulo', 'completa', 'tarjeta'] },
  { id: 'web', nombre: 'Presentación de web', desc: 'Intro, móvil, secciones, lista, llamada y cierre', ancho: 1080, alto: 1920, fps: 60, escenas: ['kit-intro', 'kit-dispositivo', 'completa', 'kit-lista', 'kit-cta', 'kit-outro'] },
];

/** Escena nueva con los valores por defecto de su plantilla (como al insertarla en el editor). */
export const escenaNueva = (plantilla: string, fps: number, extra: Partial<TEscena> = {}): TEscena => {
  const pl = (PLANTILLAS as any[]).find((x) => x.id === plantilla);
  const e: TEscena = {
    id: nid(`${plantilla}-`),
    nombre: pl?.nombre ?? plantilla,
    plantilla,
    duracion: Math.round(3 * fps),
    recorte: 0,
    frase: null,
    preDefecto: 0,
    marco: true,
    tomas: [],
    camara: [],
    textos: [],
    transicion: { tipo: 'fundido', duracion: Math.round(0.4 * fps) },
    params: {},
    efectos: { luz: 'ninguna', intensidad: 0.5, desenfoqueMovimiento: true },
    filtro: null,
    extras: [],
    elementos: [],
    ...((pl?.crear?.() ?? {}) as Partial<TEscena>),
    ...extra,
  } as TEscena;
  e.textos = e.textos.map((t) => ({ ...t, id: nid('t') }));
  return e;
};

/** Proyecto a partir de una plantilla: conserva la marca (paleta, fuentes, logo, web) del proyecto actual. */
export const proyectoDePlantilla = (base: TProyecto, id: string, nombre: string, escenas?: TEscena[]): TProyecto => {
  const pl = PLANTILLAS_PROYECTO.find((x) => x.id === id)!;
  const k = pl.alto / base.ajustes.alto;
  const p = JSON.parse(JSON.stringify(base)) as TProyecto;
  p.nombre = nombre;
  p.ajustes = { ...p.ajustes, ancho: pl.ancho, alto: pl.alto, fps: pl.fps, zonas: { arriba: Math.round(p.ajustes.zonas.arriba * k), abajo: Math.round(p.ajustes.zonas.abajo * k) } };
  // las tomas de ejemplo de las plantillas apuntan a medios de otro proyecto: se dejan vacías («Sin medio») para soltar los propios
  p.escenas = escenas ?? pl.escenas.map((s, i) => {
    const e = escenaNueva(s, pl.fps, i === 0 ? { transicion: { tipo: 'corte', duracion: 0 } as any } : {});
    e.tomas = e.tomas.map((t) => ({ ...t, src: '' }));
    return e;
  });
  p.voz = { ...p.voz, frases: [] };
  p.sfx = [];
  p.subtitulos = { ...p.subtitulos, pista: { src: null, inicio: 0, palabras: [] } } as any;
  (p.musica as any).beats = [];
  return validarProyecto(p);
};

// ——— De una URL propia a un vídeo («Presentación de web») ———
type InfoWeb = { url: string; titulo: string; descripcion: string; h1: string; secciones: { texto: string }[]; tomas: { nombre: string; segundos: number; viewport: string }[]; capturas: string };
const corta = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s);
/** Titular en dos líneas («/») con la última palabra como acento. */
const titular = (s: string) => {
  const w = corta(s, 48).replace(/[*/]/g, '').split(' ').filter(Boolean);
  if (w.length < 3) return { titulo: w.join(' '), acento: w[w.length - 1] ?? '' };
  const m = Math.ceil(w.length / 2);
  return { titulo: `${w.slice(0, m).join(' ')} / ${w.slice(m).join(' ')}`, acento: w[w.length - 1].replace(/[.,;:!?¿¡]/g, '') };
};
export const proyectoWeb = (base: TProyecto, nombre: string, info: InfoWeb): TProyecto => {
  const fps = 60;
  const dominio = new URL(info.url).hostname.replace(/^www\./, '');
  const seg = (n: string) => info.tomas.find((t) => t.nombre === n)?.segundos ?? 0;
  const toma = (n: string) => [{ rol: 'principal', src: `footage/${n}.mp4`, t0: 0, velocidad: 1, suave: 'lin' as const }];
  const d = (s: number) => Math.round(s * fps);
  const h = titular(info.h1 || info.titulo || dominio);
  const escenas: TEscena[] = [
    escenaNueva('kit-gancho', fps, { duracion: d(3), transicion: { tipo: 'corte', duracion: 0 } as any, params: { etiqueta: dominio, titulo: h.titulo, acento: h.acento, sub: '', tam: 130, ritmo: 0.11, fondo: 'ink' } }),
    escenaNueva('kit-dispositivo', fps, { duracion: d(Math.min(4.5, seg('web-portada'))), tomas: toma('web-portada') as any, params: { tipo: 'telefono', etiqueta: corta(info.descripcion || 'Tu nueva web', 40), fondo: 'ink' } }),
    escenaNueva('kit-dispositivo', fps, { duracion: d(Math.min(9, seg('web-recorrido'))), tomas: toma('web-recorrido') as any, params: { tipo: 'telefono', etiqueta: 'Diseñada para móvil', fondo: 'ink' } }),
    ...info.secciones.slice(0, 3).map((s, i) => escenaNueva('kit-dispositivo', fps, { duracion: d(Math.min(4, seg(`web-seccion-${i + 1}`) || 4)), tomas: toma(`web-seccion-${i + 1}`) as any, params: { tipo: 'telefono', etiqueta: corta(s.texto, 34), fondo: 'ink' } })).filter((e) => seg(e.tomas[0].src.replace(/^footage\/|\.mp4$/g, ''))),
    escenaNueva('kit-dispositivo', fps, { duracion: d(Math.min(6, seg('web-escritorio'))), tomas: toma('web-escritorio') as any, params: { tipo: 'navegador', etiqueta: 'También en escritorio', fondo: 'ink' } }),
    ...(info.secciones.length >= 2 ? [escenaNueva('kit-lista', fps, { duracion: d(3.5), params: { titulo: 'En la web', items: info.secciones.slice(0, 4).map((s) => corta(s.texto, 26)), estilo: 'checks', fondo: 'ink' } })] : []),
    escenaNueva('kit-cta', fps, { duracion: d(3), params: { titulo: 'Visítala.', sub: dominio, boton: '', mostrarWhatsapp: false, fondo: 'acid' } }),
  ];
  const p = proyectoDePlantilla(base, 'web', nombre, escenas);
  p.ajustes.siteUrl = dominio;
  return validarProyecto(p);
};

const pendientesWeb = new Map<string, string>();
let vigilando = false;
const vigilarWeb = () => {
  if (vigilando) return;
  vigilando = true;
  useEd.subscribe(async (s, prev) => {
    if (s.trabajos === prev.trabajos) return;
    for (const t of s.trabajos) {
      const nombre = pendientesWeb.get(t.id);
      if (!nombre || t.estado === 'corriendo') continue;
      pendientesWeb.delete(t.id);
      if (t.estado !== 'hecho') {
        s.avisar(`Web → vídeo: ${t.error ?? t.estado}`, 'error');
        continue;
      }
      try {
        const proyecto = proyectoWeb(s.proyecto!, nombre, t.resultado);
        const r = await fetch('/api/inicio/nuevo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, proyecto, capturas: t.resultado.capturas }) }).then((x) => x.json());
        if (r.error) throw new Error(r.error);
        useEd.getState().avisar(`Vídeo de «${nombre}» listo: ${proyecto.escenas.length} escenas`, 'ok');
        window.dispatchEvent(new CustomEvent('studio:proyecto-nuevo', { detail: r.ruta }));
        if (enEscritorio()) accion('abrir', r.ruta);
      } catch (e: any) {
        useEd.getState().avisar(e.message, 'error');
      }
    }
  });
};

const DeUnaWeb: React.FC = () => {
  const [url, setUrl] = useState('');
  const [ok, setOk] = useState(false);
  const ts = useEd((s) => s.trabajos);
  const corriendo = ts.find((t) => pendientesWeb.has(t.id) && t.estado === 'corriendo');
  return (
    <div className="de-web" data-prueba="de-una-web">
      <div className="fila" style={{ gap: 8 }}>
        <input type="url" placeholder="https://tu-web.com" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} data-prueba="url-web" />
        <button
          className="btn prim"
          disabled={!/^https?:\/\/\S+\.\S+/.test(url) || !ok || !!corriendo}
          data-prueba="crear-de-web"
          onClick={async () => {
            const nombre = await pedirTexto('Vídeo de una web', 'Nombre del proyecto', new URL(url).hostname.replace(/^www\./, ''));
            if (!nombre) return;
            const r = await fetch('/api/trabajos/web-a-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then((x) => x.json());
            if (r.error) return useEd.getState().avisar(r.error, 'error');
            vigilarWeb();
            pendientesWeb.set(r.trabajo.id, nombre);
            useEd.getState().avisar('Grabando la web en segundo plano (puede tardar unos minutos)…');
          }}
        >
          <Ico n="varita" s={14} /> Crear vídeo
        </button>
      </div>
      <label className="fila" style={{ gap: 6, fontSize: 11.5, color: 'var(--tenue)' }}>
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} data-prueba="web-propia" /> Es una web propia o hecha por nosotros. Se respeta robots.txt y no se entra en zonas con contraseña.
      </label>
      {corriendo && (
        <div className="ayuda">
          {corriendo.etapa} · {Math.round(corriendo.progreso * 100)} %
        </div>
      )}
    </div>
  );
};

const hace = (t: number) => {
  const s = (Date.now() - t) / 1000;
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(t).toLocaleDateString('es');
};

const Miniatura: React.FC<{ ruta: string; nombre: string }> = ({ ruta, nombre }) => {
  const [mal, setMal] = useState(false);
  return mal ? <div className="mini-vacia">{nombre.slice(0, 1).toUpperCase()}</div> : <img src={`/api/inicio/miniatura?ruta=${encodeURIComponent(ruta)}`} alt="" loading="lazy" onError={() => setMal(true)} />;
};

export const Inicio: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const [datos, setDatos] = useState<{ proyectos: Proy[]; carpeta: string; papelera: Papel[] } | null>(null);
  const [q, setQ] = useState('');
  const [verPapelera, setVerPapelera] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const cargar = () => fetch('/api/inicio/proyectos').then((r) => r.json()).then(setDatos);
  useEffect(() => {
    cargar();
    const f = () => cargar();
    window.addEventListener('studio:proyecto-nuevo', f);
    return () => window.removeEventListener('studio:proyecto-nuevo', f);
  }, []);
  const cerrar = () => useEd.setState({ dialogo: null });
  const post = (u: string, b: unknown) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
  const abrir = (ruta: string) => {
    if (enEscritorio()) accion('abrir', ruta);
    else useEd.getState().avisar(`Para abrir otro proyecto usa la app de escritorio (o npm run dev -- --proyecto "${ruta}")`);
  };
  const nuevo = async (id: string) => {
    const pl = PLANTILLAS_PROYECTO.find((x) => x.id === id)!;
    const nombre = await pedirTexto('Proyecto nuevo', `Nombre del proyecto (${pl.nombre})`, `${pl.nombre} ${new Date().toLocaleDateString('es')}`);
    if (!nombre) return;
    try {
      const r = await post('/api/inicio/nuevo', { nombre, proyecto: proyectoDePlantilla(p, id, nombre) });
      if (r.error) throw new Error(r.error);
      useEd.getState().avisar(`Proyecto «${nombre}» creado en ${r.ruta}`, 'ok');
      await cargar();
      abrir(r.ruta);
    } catch (e: any) {
      useEd.getState().avisar(e.message, 'error');
    }
  };
  const lista = (datos?.proyectos ?? []).filter((x) => `${x.nombre} ${x.ruta}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="inicio" data-prueba="inicio">
      <div className="inicio-cab">
        <img src="/__studio/icon.png" alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        <h2>Inicio</h2>
        <div className="buscar" style={{ maxWidth: 360 }}>
          <Ico n="lupa" s={14} />
          <input type="text" placeholder="Buscar proyectos" value={q} onChange={(e) => setQ(e.target.value)} data-prueba="buscar-proyectos" />
        </div>
        <span className="esp" />
        <button className={`btn chico ${verPapelera ? 'activo' : ''}`} onClick={() => setVerPapelera(!verPapelera)} data-prueba="ver-papelera">
          <Ico n="papelera" s={14} /> Papelera ({datos?.papelera.length ?? 0})
        </button>
        <button className="btn chico prim" onClick={cerrar} data-prueba="cerrar-inicio">
          Volver al editor
        </button>
      </div>
      <div className="inicio-cuerpo">
        <h4>Vídeo promocional de una web</h4>
        <DeUnaWeb />
        <h4>Nuevo proyecto</h4>
        <div className="plantillas-proyecto">
          {PLANTILLAS_PROYECTO.map((pl) => (
            <button key={pl.id} className="plantilla-p" onClick={() => nuevo(pl.id)} data-plantilla-proyecto={pl.id}>
              <div className="forma-p" style={{ aspectRatio: `${pl.ancho} / ${pl.alto}` }} />
              <b>{pl.nombre}</b>
              <span>{pl.desc}</span>
            </button>
          ))}
        </div>
        {!verPapelera && <InicioDisenos q={q} />}
        {!verPapelera ? (
          <>
            <h4>
              Proyectos <span className="ayuda">· nuevos en {datos?.carpeta}</span>
            </h4>
            <div className="proyectos">
              {lista.map((x) => (
                <div key={x.ruta} className={`tarjeta-p ${x.actual ? 'actual' : ''}`} data-proyecto={x.ruta} onDoubleClick={() => !x.actual && abrir(x.ruta)}>
                  <div className="mini-p">
                    <Miniatura ruta={x.ruta} nombre={x.nombre} />
                    {x.actual && <span className="chip-actual">Abierto</span>}
                  </div>
                  <div className="info-p">
                    <b title={x.ruta}>{x.nombre}</b>
                    <span>
                      {x.formato} · {x.escenas} escenas · {x.duracion.toFixed(1)} s · {hace(x.mtime)}
                    </span>
                  </div>
                  <button className="btn-r menu-p" onClick={() => setMenu(menu === x.ruta ? null : x.ruta)} data-menu-proyecto={x.ruta}>
                    <Ico n="menu" s={15} />
                  </button>
                  {menu === x.ruta && (
                    <div className="menu-flot" style={{ position: 'absolute', right: 6, top: 34, zIndex: 5 }}>
                      {!x.actual && (
                        <button onClick={() => (setMenu(null), abrir(x.ruta))}>
                          <Ico n="carpeta" s={14} /> Abrir
                        </button>
                      )}
                      <button
                        data-accion="duplicar"
                        onClick={async () => {
                          setMenu(null);
                          const r = await post('/api/inicio/duplicar', { ruta: x.ruta });
                          r.error ? useEd.getState().avisar(r.error, 'error') : (useEd.getState().avisar('Proyecto duplicado', 'ok'), cargar());
                        }}
                      >
                        <Ico n="duplicar" s={14} /> Duplicar
                      </button>
                      <button
                        data-accion="renombrar"
                        onClick={async () => {
                          setMenu(null);
                          const n = await pedirTexto('Renombrar proyecto', 'Nombre', x.nombre);
                          if (!n) return;
                          await post('/api/inicio/renombrar', { ruta: x.ruta, nombre: n });
                          if (x.actual) useEd.getState().editar('Renombrar proyecto', (d) => void (d.nombre = n));
                          cargar();
                        }}
                      >
                        <Ico n="editar" s={14} /> Renombrar
                      </button>
                      {!x.actual && (
                        <button
                          className="peligro"
                          data-accion="borrar"
                          onClick={async () => {
                            setMenu(null);
                            const r = await post('/api/inicio/borrar', { ruta: x.ruta });
                            r.error ? useEd.getState().avisar(r.error, 'error') : (useEd.getState().avisar('Movido a la papelera (se puede recuperar)', 'ok'), cargar());
                          }}
                        >
                          <Ico n="papelera" s={14} /> Mover a la papelera
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!lista.length && <div className="vacio">Ningún proyecto coincide.</div>}
            </div>
          </>
        ) : (
          <>
            <h4>Papelera · los proyectos se pueden recuperar</h4>
            <div className="proyectos">
              {(datos?.papelera ?? []).map((x) => (
                <div key={x.ruta} className="tarjeta-p" data-papelera={x.nombre}>
                  <div className="mini-p">
                    <div className="mini-vacia">
                      <Ico n="papelera" s={22} />
                    </div>
                  </div>
                  <div className="info-p">
                    <b>{x.nombre}</b>
                    <span>{hace(x.mtime)}</span>
                  </div>
                  <button
                    className="btn chico"
                    style={{ margin: 8 }}
                    data-accion="recuperar"
                    onClick={async () => {
                      const r = await post('/api/inicio/recuperar', { ruta: x.ruta });
                      r.error ? useEd.getState().avisar(r.error, 'error') : (useEd.getState().avisar('Proyecto recuperado', 'ok'), cargar());
                    }}
                  >
                    Recuperar
                  </button>
                </div>
              ))}
              {!datos?.papelera.length && <div className="vacio">La papelera está vacía.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
