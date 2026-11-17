/** Panel de recursos (izquierda): medios, audio, texto, plantillas, efectos, transiciones, subtítulos y marca. */
import React, { useMemo, useRef, useState } from 'react';
import { PLANTILLAS } from '@proyecto';
import type { TEscena } from '@contrato/esquema';
import { adaptarSinVoz, cortesAlRitmo, escenaEn, tiempoToma } from '@contrato/linea';
import { irA, nid, useEd } from './estado';
import { api, type Medio } from './api';
import { Ico } from './iconos';
import { PRESETS_TEXTO, nuevoTexto } from './ops';
import { useSfxBiblioteca } from './audioPro';
import { PanelSub } from './PanelSub';
import { PanelMarca } from './PanelMarca';
import { clavesZoomPunto, rampa } from './Movimiento';
import { mediosUsados } from './Visor';
import { PanelLimpiarVoz } from './LimpiarVoz';
import { Transcripcion } from './Transcripcion';
import { PanelCompartida } from './Compartida';
import { MusicaLibre } from './MusicaLibre';
import { Animaciones, EfectosLib, Elementos as ElementosLib, EstilosTexto, Filtros, Fuentes, SubEstilos, TransicionesLib } from './Galerias';

type Tab = 'medios' | 'audio' | 'texto' | 'elementos' | 'plantillas' | 'efectos' | 'filtros' | 'trans' | 'subs' | 'marca';
const TABS: [Tab, string, string][] = [
  ['medios', 'Medios', 'medios'],
  ['audio', 'Audio', 'musica'],
  ['texto', 'Texto', 'texto'],
  ['elementos', 'Elementos', 'formas'],
  ['plantillas', 'Plantillas', 'plantillas'],
  ['efectos', 'Efectos', 'efectos'],
  ['filtros', 'Filtros', 'filtro'],
  ['trans', 'Transiciones', 'trans'],
  ['subs', 'Subtítulos', 'sub'],
  ['marca', 'Marca', 'marca'],
];

/** Escena «objetivo»: la seleccionada o la que hay bajo el cursor. */
export const escenaObjetivo = () => {
  const s = useEd.getState();
  if (!s.proyecto || !s.linea) return null;
  if (s.sel?.tipo === 'escena' || s.sel?.tipo === 'transicion') return s.proyecto.escenas.find((e) => e.id === (s.sel as any).id) ?? null;
  if (s.sel?.tipo === 'texto') return s.proyecto.escenas.find((e) => e.id === (s.sel as any).escena) ?? null;
  return s.proyecto.escenas[escenaEn(s.linea, s.frame)];
};

/** Inserta una escena nueva (después de la seleccionada, al principio/final o en un índice concreto). */
export const insertarEscena = (plantilla: string, extra: Partial<TEscena> = {}, posicion?: 'inicio' | 'fin' | number) => {
  const s = useEd.getState();
  const pl = PLANTILLAS.find((x: any) => x.id === plantilla);
  if (!s.proyecto || !s.linea || !pl) return;
  const obj = escenaObjetivo();
  const idx = typeof posicion === 'number' ? posicion : posicion === 'inicio' ? 0 : posicion === 'fin' || !obj ? s.proyecto.escenas.length : s.proyecto.escenas.findIndex((e) => e.id === obj.id) + 1;
  const id = nid(`${plantilla}-`);
  const fps = s.proyecto.ajustes.fps;
  const base: TEscena = {
    id,
    nombre: pl.nombre,
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
    ...(pl.crear() as Partial<TEscena>),
    ...extra,
  };
  base.textos = base.textos.map((t) => ({ ...t, id: nid('t') }));
  s.editar('escena+', (d) => void d.escenas.splice(idx, 0, base as any));
  useEd.setState({ sel: { tipo: 'escena', id } });
  const ini = useEd.getState().linea!.escenas.find((e) => e.id === id)!.inicio;
  irA(ini + Math.round(0.5 * fps));
  s.avisar(`Escena «${pl.nombre}» añadida`, 'ok');
};

/** Escena nueva con un medio (plantilla según el formato del medio). */
export const escenaConMedio = (m: Medio, posicion?: number) => {
  const vertical = (m.alto ?? 0) > (m.ancho ?? 1);
  const plantilla = m.tipo === 'imagen' ? 'completa' : vertical ? 'telefono' : 'navegador';
  insertarEscena(plantilla, { tomas: [{ rol: 'principal', src: m.ruta, t0: 0, velocidad: 1, suave: 'lin' }] }, posicion);
};

/** Pone un medio como toma principal de una escena. */
export const usarMedio = (escenaId: string, ruta: string) => {
  const s = useEd.getState();
  const e = s.proyecto?.escenas.find((x) => x.id === escenaId);
  if (!e) return;
  if (!e.tomas.length) return s.avisar('Esa escena no usa tomas: suelta el medio entre dos escenas para crear una nueva');
  s.editar('toma-src', (d) => void (d.escenas.find((x) => x.id === escenaId)!.tomas[0].src = ruta));
  s.avisar(`«${ruta.split('/').pop()}» en ${e.nombre || e.id}`, 'ok');
};

// ——— Quitar el fondo ———
const fondoConf = () => {
  try {
    const [modelo, formato] = (localStorage.getItem('studio.fondo') ?? 'u2net|webm').split('|');
    return { modelo, formato };
  } catch {
    return { modelo: 'u2net', formato: 'webm' };
  }
};
const guardarFondo = (v: string) => {
  try {
    localStorage.setItem('studio.fondo', v);
  } catch {
    /* sin almacenamiento */
  }
};
export const quitarFondo = async (src: string) => {
  const s = useEd.getState();
  const r = await fetch('/api/trabajos/quitar-fondo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ src, ...fondoConf() }) }).then((x) => x.json());
  if (r.error) return s.avisar(r.error, 'error');
  if (r.cache) {
    useEd.setState({ medios: await api.medios() });
    return s.avisar(`Ya estaba hecho: ${r.ruta}`, 'ok');
  }
  s.avisar('Quitando el fondo en segundo plano (la primera vez descarga el modelo)…');
};

const fmtDur = (s?: number) => {
  if (s == null) return '';
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const Miniatura: React.FC<{ m: Medio }> = ({ m }) => {
  if (m.tipo === 'imagen') return <img src={`/${m.ruta}`} alt="" loading="lazy" />;
  if (m.tipo === 'video') return <img src={`/api/miniatura?src=${encodeURIComponent(m.ruta)}&t=${Math.min(2, (m.dur ?? 2) / 2)}&h=180`} alt="" loading="lazy" />;
  return <Ico n="onda" s={28} style={{ color: 'var(--onda)' }} />;
};

const Ficha: React.FC<{ t: string; d?: string; muestra: React.ReactNode; onClick: () => void; drag?: [string, string]; prueba?: Record<string, string> }> = ({ t, d, muestra, onClick, drag, prueba }) => (
  <div
    className="ficha"
    onClick={onClick}
    draggable={!!drag}
    onDragStart={(e) => drag && (e.dataTransfer.setData(drag[0], drag[1]), (e.dataTransfer.effectAllowed = 'copy'))}
    {...Object.fromEntries(Object.entries(prueba ?? {}).map(([k, v]) => [`data-${k}`, v]))}
  >
    <div className="muestra-f">{muestra}</div>
    <div className="t">{t}</div>
    {d && <div className="d">{d}</div>}
    <span className="mas-f">
      <Ico n="mas" s={14} />
    </span>
  </div>
);

// ——— Medios ———
const Medios: React.FC<{ sub: string }> = ({ sub }) => {
  const medios = useEd((s) => s.medios);
  const p = useEd((s) => s.proyecto)!;
  const input = useRef<HTMLInputElement>(null);
  const [filtro, setFiltro] = useState('');
  const [tipo, setTipo] = useState<'todo' | 'video' | 'imagen'>('todo');
  const [vista, setVista] = useState<'rejilla' | 'lista'>('rejilla');
  const [marcado, setMarcado] = useState<string | null>(null);
  const usados = useMemo(() => mediosUsados(p), [p]);
  const proxies = useEd((s) => s.proxies);
  const [fondo, setFondo] = useState(`${fondoConf().modelo}|${fondoConf().formato}`);
  const vis = medios.filter((m) => m.tipo !== 'audio' && !m.ruta.startsWith('voz/') && (tipo === 'todo' || m.tipo === tipo) && m.ruta.toLowerCase().includes(filtro.toLowerCase()) && (sub !== 'proyecto' || usados.has(m.ruta)));
  const subir = async (fs: File[]) => {
    for (const f of fs) {
      useEd.getState().avisar(`Importando ${f.name}…`);
      try {
        await api.subir(f, f.type.startsWith('image') ? 'imagenes' : 'footage');
      } catch (err: any) {
        useEd.getState().avisar(`Error: ${err.message}`, 'error');
      }
    }
    useEd.setState({ medios: await api.medios() });
    if (fs.length) useEd.getState().avisar(`${fs.length} archivo(s) importado(s)`, 'ok');
  };
  return (
    <div
      className="contenido-r"
      onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        subir([...e.dataTransfer.files]);
      }}
    >
      <div className="barra-r">
        <button className="btn chico" onClick={() => input.current?.click()} data-prueba="subir-medio">
          <Ico n="mas" s={14} /> Importar
        </button>
        <button className="btn chico icono" onClick={() => useEd.setState({ dialogo: 'grabar' })} title="Grabar pantalla y cámara" data-prueba="abrir-grabar">
          <Ico n="monitor" s={14} />
        </button>
        <div className="buscar">
          <Ico n="lupa" s={14} />
          <input type="text" placeholder="Buscar" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} style={{ width: 82 }} title="Filtrar">
          <option value="todo">Todo</option>
          <option value="video">Vídeo</option>
          <option value="imagen">Imagen</option>
        </select>
        <button className={`btn icono chico ${vista === 'lista' ? 'activo' : 'plano'}`} title="Lista" onClick={() => setVista('lista')}>
          <Ico n="lista" s={15} />
        </button>
        <button className={`btn icono chico ${vista === 'rejilla' ? 'activo' : 'plano'}`} title="Cuadrícula" onClick={() => setVista('rejilla')}>
          <Ico n="rejilla" s={15} />
        </button>
        <select value={fondo} onChange={(e) => (setFondo(e.target.value), guardarFondo(e.target.value))} style={{ width: 92 }} title="Quitar el fondo: modelo y formato (los modelos son de licencia libre y se descargan la primera vez)" data-prueba="fondo-conf">
          <option value="u2net|webm">Fondo: general · WebM</option>
          <option value="isnet-general-use|webm">Fondo: preciso · WebM</option>
          <option value="u2net_human_seg|webm">Fondo: personas · WebM</option>
          <option value="u2netp|webm">Fondo: rápido · WebM</option>
          <option value="u2net|prores">Fondo: general · ProRes 4444</option>
          <option value="u2net|secuencia">Fondo: general · PNG</option>
        </select>
        <input ref={input} type="file" multiple hidden accept="video/*,image/*" onChange={(e) => (subir([...(e.target.files ?? [])]), (e.target.value = ''))} />
      </div>
      <div className="scroll">
        <div className={`rejilla ${vista === 'lista' ? 'lista' : ''}`}>
          {vis.map((m) => (
            <div
              key={m.ruta}
              className={`medio ${marcado === m.ruta ? 'on' : ''}`}
              onClick={() => setMarcado(m.ruta)}
              onDoubleClick={() => {
                const e = escenaObjetivo();
                if (e) usarMedio(e.id, m.ruta);
              }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-medio', JSON.stringify(m));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              title={`${m.ruta}${m.ancho ? ` · ${m.ancho}×${m.alto}` : ''}\nArrastra a la línea de tiempo · doble clic = usar en la escena seleccionada`}
              data-medio={m.ruta}
            >
              <div className="mini">
                <Miniatura m={m} />
                {m.tipo === 'video' && <span className="dur">{fmtDur(m.dur)}</span>}
                {usados.has(m.ruta) && <span className="usado">En uso</span>}
                {m.tipo === 'video' && proxies[m.ruta] && proxies[m.ruta] !== 'no' && (
                  <span className={`proxy-chip ${proxies[m.ruta]}`} data-proxy={proxies[m.ruta]} title={proxies[m.ruta] === 'listo' ? 'La vista previa usa una copia ligera (540p); al exportar se usa el original' : 'Generando proxy…'}>
                    {proxies[m.ruta] === 'listo' ? 'Proxy' : 'Proxy…'}
                  </span>
                )}
              </div>
              <div className="nombre">{m.ruta.split('/').pop()}</div>
              <div className="acciones">
                {m.tipo !== 'audio' && !m.ruta.includes('/sin-fondo/') && (
                  <button className="btn chico icono" title={`Quitar el fondo (${fondoConf().modelo}, ${m.tipo === 'video' ? fondoConf().formato : 'PNG'})`} data-quitar-fondo={m.ruta} onClick={(e) => (e.stopPropagation(), quitarFondo(m.ruta))}>
                    <Ico n="varita" s={14} />
                  </button>
                )}
                {m.tipo === 'video' && proxies[m.ruta] !== 'listo' && (
                  <button className="btn chico icono" title="Generar proxy de vista previa (540p)" data-generar-proxy={m.ruta} onClick={(e) => (e.stopPropagation(), api.generarProxy({ src: m.ruta }).then(() => useEd.setState({ proxies: { ...useEd.getState().proxies, [m.ruta]: 'generando' } })))}>
                    <Ico n="velocidad" s={14} />
                  </button>
                )}
                <button className="btn chico icono prim" title="Añadir como escena nueva" onClick={(e) => (e.stopPropagation(), escenaConMedio(m))}>
                  <Ico n="mas" s={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {!vis.length && <div className="vacio">{sub === 'proyecto' ? 'Ningún medio en uso todavía' : 'Sin medios. Arrastra archivos aquí o pulsa Importar.'}</div>}
      </div>
    </div>
  );
};

// ——— Audio ———
const AudioTab: React.FC<{ sub: string }> = ({ sub }) => {
  const medios = useEd((s) => s.medios).filter((m) => m.tipo === 'audio' && !m.ruta.startsWith('voz/'));
  const p = useEd((s) => s.proyecto)!;
  const voces = useEd((s) => s.voces);
  const sel = useEd((s) => s.sel);
  const audio = useRef<HTMLAudioElement | null>(null);
  const lib = useSfxBiblioteca();
  const escuchar = (u: string) => {
    audio.current?.pause();
    audio.current = new Audio(u);
    audio.current.play();
  };
  const anadirSfx = (ruta: string, dur: number) => {
    const s = useEd.getState();
    const e = s.proyecto && s.linea ? s.proyecto.escenas[escenaEn(s.linea, s.frame)] : null;
    if (!e) return;
    const r = s.linea!.escenas.find((x) => x.id === e.id)!;
    const id = nid('sfx-');
    s.editar('sfx+', (d) => void d.sfx.push({ id, src: ruta, volumen: 0.4, duracion: Math.max(1, Math.min(Math.round(dur * s.proyecto!.ajustes.fps), 600)), escena: e.id, offset: s.frame - r.origen }));
    useEd.setState({ sel: { tipo: 'sfx', id } });
  };
  if (sub === 'efectos')
    return (
      <div className="scroll">
        <div className="subtit">Efectos originales (sintetizados en local)</div>
        {lib == null && <div className="vacio">Generando efectos…</div>}
        {lib?.map((n) => (
          <div key={n} className="item" style={{ cursor: 'default' }}>
            <button className="btn chico icono" onClick={() => escuchar(`/recursos/sfx/${n}`)}>
              <Ico n="play" s={13} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t">{n.replace(/\.wav$/, '')}</div>
              <div className="d">libre de derechos</div>
            </div>
            <button
              className="btn chico icono prim"
              title="Añadir en el cursor"
              data-sfx-lib={n}
              onClick={async () => {
                const r = await api.importarSfx(n);
                useEd.setState({ medios: await api.medios() });
                anadirSfx(r.ruta, 1.5);
              }}
            >
              <Ico n="mas" s={14} />
            </button>
          </div>
        ))}
        <div className="subtit">Del proyecto</div>
        {medios.map((m) => (
          <div key={m.ruta} className="item" style={{ cursor: 'default' }}>
            <button className="btn chico icono" onClick={() => escuchar(`/${m.ruta}`)}>
              <Ico n="play" s={13} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t">{m.ruta.split('/').pop()}</div>
              <div className="d">{fmtDur(m.dur)}</div>
            </div>
            <button className="btn chico icono" title="Añadir en el cursor" data-sfx-add={m.ruta} onClick={() => anadirSfx(m.ruta, m.dur ?? 1)}>
              <Ico n="mas" s={14} />
            </button>
          </div>
        ))}
      </div>
    );
  if (sub === 'voces')
    return (
      <div className="scroll">
        <div className="subtit">Limpiar la voz</div>
        <PanelLimpiarVoz />
        <div className="subtit">Auto-edición</div>
        <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            className="btn"
            data-prueba="adaptar-sin-voz"
            title="Desactiva la voz y alarga frases y escenas para que los subtítulos se lean cómodos (≤ 15 car./s)"
            onClick={() => {
              const s = useEd.getState();
              const antes = s.linea!.total;
              const q = adaptarSinVoz(s.proyecto!, { cps: 15, minSeg: 0.9 });
              q.sfx = q.sfx.map((x) => ({ ...x, volumen: Math.min(1, Math.round(x.volumen * 1.3 * 100) / 100) }));
              const r = q.musica.beats.length ? cortesAlRitmo(q, 0.35).proyecto : q;
              s.reemplazar(r, 'sin-voz');
              const fps = r.ajustes.fps;
              s.avisar(`Sin voz: ${(antes / fps).toFixed(1)} s → ${(useEd.getState().linea!.total / fps).toFixed(1)} s, subtítulos a ≤ 15 car./s`, 'ok');
            }}
          >
            Adaptar para sin voz (lectura cómoda)
          </button>
          <button
            className="btn"
            data-prueba="compactar"
            onClick={() => {
              const s = useEd.getState();
              const l = s.linea!;
              const fps = l.fps;
              const max = Math.round(0.4 * fps);
              let total = 0;
              s.editar('compactar', (d) => {
                const fr = [...l.frases].sort((a, b) => a.inicio - b.inicio);
                for (let i = 0; i < fr.length - 1; i++) {
                  const hueco = fr[i + 1].inicio - fr[i].fin;
                  if (hueco <= max || fr[i + 1].escena === fr[i].escena) continue;
                  const e = d.escenas.find((x) => x.id === fr[i].escena);
                  if (!e) continue;
                  const quitar = Math.min(hueco - max, e.duracion - Math.round(0.6 * fps));
                  if (quitar > 0) {
                    e.duracion -= quitar;
                    total += quitar;
                  }
                }
              });
              s.avisar(total ? `Pausas compactadas: −${(total / fps).toFixed(2)} s` : 'No hay pausas largas entre frases', total ? 'ok' : 'info');
            }}
          >
            Compactar pausas entre frases
          </button>
        </div>
        <div className="subtit">Voces de Piper</div>
        {voces.map((v) => (
          <div key={v.id} className="item" style={{ cursor: 'default' }}>
            <div className="ic">
              <Ico n="voz" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t">{v.id}</div>
              <div className="d">{p.voz.voz === v.id ? 'por defecto' : v.motor}</div>
            </div>
            <button className="btn chico" disabled={sel?.tipo !== 'frase'} onClick={() => sel?.tipo === 'frase' && useEd.getState().editar('voz-frase', (d) => void (d.voz.frases.find((f) => f.id === sel.id)!.voz = v.id))}>
              Frase
            </button>
            <button className="btn chico" onClick={() => useEd.getState().editar('voz-def', (d) => void (d.voz.voz = v.id))}>
              Todas
            </button>
          </div>
        ))}
        <div className="subtit">Frases ({p.voz.frases.length})</div>
        {p.voz.frases.map((f) => (
          <div key={f.id} className="item" onClick={() => useEd.setState({ sel: { tipo: 'frase', id: f.id } })} data-lib-frase={f.id}>
            <div className="ic" style={{ fontSize: 11 }}>
              {f.duracion.toFixed(1)}s
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="t">{f.id}</div>
              <div className="d" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.texto}
              </div>
            </div>
          </div>
        ))}
        <div style={{ padding: 10 }}>
          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={() => {
              const s = useEd.getState();
              const e = escenaObjetivo();
              if (!e || !s.linea) return;
              const r = s.linea.escenas.find((x) => x.id === e.id)!;
              const id = nid('frase');
              s.editar('frase+', (d) => {
                d.voz.frases.push({ id, texto: 'Escribe aquí la nueva frase.', escena: e.id, offset: Math.max(0, s.frame - r.origen), archivo: '', duracion: 1.5, palabras: [], volumen: 1, subtitulos: true, tomas: [] } as any);
                const x = d.escenas.find((y) => y.id === e.id)!;
                if (!x.frase) x.frase = id;
              });
              useEd.setState({ sel: { tipo: 'frase', id } });
            }}
          >
            + Frase nueva en el cursor
          </button>
        </div>
      </div>
    );
  // Música
  return (
    <div className="scroll">
      <MusicaLibre />
      <div className="subtit">Música del proyecto</div>
      {medios.map((m) => (
        <div key={m.ruta} className="item" style={{ cursor: 'default' }}>
          <button className="btn chico icono" onClick={() => escuchar(`/${m.ruta}`)}>
            <Ico n="play" s={13} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t">{m.ruta.split('/').pop()}</div>
            <div className="d">
              {fmtDur(m.dur)}
              {p.musica.src === m.ruta ? ' · en uso' : ''}
            </div>
          </div>
          <button className={`btn chico ${p.musica.src === m.ruta ? 'activo' : ''}`} onClick={() => (useEd.getState().editar('musica-src', (d) => void (d.musica.src = m.ruta)), useEd.setState({ sel: { tipo: 'musica' } }))}>
            {p.musica.src === m.ruta ? 'En uso' : 'Usar'}
          </button>
        </div>
      ))}
    </div>
  );
};

// ——— Texto ———
const Textos: React.FC = () => (
  <div className="scroll">
    <div className="ayuda" style={{ padding: '6px 12px 0' }}>
      Clic: se añade a la escena seleccionada (o la del cursor), en el cursor.
    </div>
    <div className="rejilla" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
      {PRESETS_TEXTO.map((pr) => (
        <Ficha
          key={pr.id}
          t={pr.nombre}
          prueba={{ preset: pr.id }}
          muestra={
            <span style={{ fontFamily: pr.t.fuente === 'Anton' ? 'Impact, sans-serif' : pr.t.tipo === 'nota' ? 'Consolas, monospace' : 'inherit', fontWeight: pr.t.tipo === 'nota' ? 400 : 800, fontSize: pr.t.tipo === 'nota' ? 11 : 20, letterSpacing: pr.t.tipo === 'nota' ? '0.12em' : '-0.04em', color: pr.t.color === 'acid' ? '#C8FF3B' : pr.t.color === 'ink' ? '#ddd' : '#fff', textTransform: pr.t.tipo === 'nota' ? 'uppercase' : undefined }}>
              {pr.t.tipo === 'nota' ? '· nota' : pr.id === 'impacto' ? 'OFERTA' : 'Aa'}
              {pr.t.acento && pr.t.tipo !== 'nota' && <i style={{ fontFamily: 'Georgia, serif', fontWeight: 400, color: pr.t.acento === 'violet' ? '#8b7bff' : '#C8FF3B' }}> b</i>}
            </span>
          }
          onClick={() => {
            const s = useEd.getState();
            const e = escenaObjetivo();
            if (!e || !s.linea) return;
            const r = s.linea.escenas.find((x) => x.id === e.id)!;
            const local = Math.max(0, Math.min(s.frame, r.fin - 1) - r.origen);
            const t = nuevoTexto({ ...pr.t, desde: local, hasta: null });
            s.editar('texto+', (d) => void d.escenas.find((x) => x.id === e.id)!.textos.push(t as any));
            useEd.setState({ sel: { tipo: 'texto', escena: e.id, id: t.id } });
            irA(r.origen + local + Math.round(s.linea.fps * 0.5));
          }}
        />
      ))}
    </div>
  </div>
);

// ——— Plantillas ———
// tonos de la marca, legibles sobre la baldosa oscura de las fichas
const COLOR_CAT: Record<string, string> = { Gancho: '#74f5a1', Producto: '#7aa7ff', Contenido: '#e0c48a', 'Prueba social': '#f0a58a', Cierre: '#74f5a1', Marca: '#f3f3f3', Básicas: '#a6a6a6', Proyecto: '#9fb3cc' };
const Plantillas: React.FC<{ sub: string }> = ({ sub }) => {
  const todas = PLANTILLAS as any[];
  const lista = todas.filter((p) => (sub === 'todas' ? true : sub === 'basicas' ? p.generica && !p.kit : sub === 'proyecto' ? !p.generica : p.kit && p.categoria === sub));
  return (
    <div className="scroll">
      <div style={{ display: 'flex', gap: 6, padding: '8px 10px 0' }}>
        <button className="btn chico" style={{ flex: 1 }} onClick={() => insertarEscena('kit-intro', { duracion: 75 }, 'inicio')} data-prueba="intro-inicio">
          <Ico n="insertar" s={14} /> Intro al principio
        </button>
        <button className="btn chico" style={{ flex: 1 }} onClick={() => insertarEscena('kit-outro', { duracion: 90 }, 'fin')}>
          <Ico n="insertar" s={14} /> Cierre al final
        </button>
      </div>
      <div className="rejilla" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(124px, 1fr))', paddingTop: 10 }}>
        {lista.map((p) => {
          const cat = p.kit ? p.categoria : p.generica ? 'Básicas' : 'Proyecto';
          return (
            <Ficha
              key={p.id}
              t={p.nombre}
              d={p.descripcion}
              prueba={{ plantilla: p.id }}
              drag={['application/x-plantilla', p.id]}
              muestra={
                <div style={{ width: 30, height: 46, borderRadius: 5, border: `2px solid ${COLOR_CAT[cat] ?? '#888'}`, display: 'grid', placeItems: 'center', color: COLOR_CAT[cat] }}>
                  <Ico n={p.kit ? 'plantillas' : p.generica ? 'cuadro' : 'claqueta'} s={14} />
                </div>
              }
              onClick={() => insertarEscena(p.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

// ——— Efectos ———
const Efectos: React.FC = () => {
  const ef = (titulo: string, fn: (e: TEscena) => void) => {
    const e = escenaObjetivo();
    if (!e) return;
    fn(e);
    useEd.getState().avisar(`${titulo} · ${e.nombre || e.id}`, 'ok');
  };
  const edEsc = (e: TEscena, fn: (x: any) => void) => useEd.getState().editar('efecto', (d) => fn(d.escenas.find((x) => x.id === e.id)!));
  const fps = useEd((s) => s.proyecto!.ajustes.fps);
  const fichas: { id: string; t: string; d: string; ico: string; color: string; fn: () => void }[] = [
    { id: 'luz-calida', t: 'Luz cálida', d: 'Destellos suaves naranjas', ico: 'luz', color: '#e0b070', fn: () => ef('Luz cálida', (e) => edEsc(e, (x) => (x.efectos = { ...x.efectos, luz: 'calida' }))) },
    { id: 'luz-fria', t: 'Luz fría', d: 'Destellos azules y violetas', ico: 'luz', color: '#7aa7ff', fn: () => ef('Luz fría', (e) => edEsc(e, (x) => (x.efectos = { ...x.efectos, luz: 'fria' }))) },
    { id: 'luz-neon', t: 'Neón', d: 'Ácido y violeta de marca', ico: 'rayo', color: '#74f5a1', fn: () => ef('Neón', (e) => edEsc(e, (x) => (x.efectos = { ...x.efectos, luz: 'neon' }))) },
    { id: 'sin-luz', t: 'Sin destellos', d: 'Quita la luz de la escena', ico: 'cerrar', color: '#a6a6a6', fn: () => ef('Sin destellos', (e) => edEsc(e, (x) => (x.efectos = { ...x.efectos, luz: 'ninguna' }))) },
    {
      id: 'ken',
      t: 'Ken Burns',
      d: 'Acercamiento lento continuo',
      ico: 'foco',
      color: '#74f5a1',
      fn: () =>
        ef('Ken Burns', (e) =>
          edEsc(e, (x) => {
            x.camara = [
              { f: x.recorte, curva: 'lineal', zoom: 1, x: 0, y: 0 },
              { f: Math.max(fps, x.duracion + x.recorte - 2), curva: 'lineal', zoom: 1.12, x: -24, y: -36 },
            ];
          }),
        ),
    },
    { id: 'zoom-punto', t: 'Zoom a un punto', d: 'Clic en el visor sobre el punto', ico: 'lupa', color: '#74f5a1', fn: () => ef('Haz clic en el visor', (e) => useEd.setState({ elegirPunto: e.id })) },
    {
      id: 'zoom-golpe',
      t: 'Golpe de zoom',
      d: 'Zoom rápido en el cursor (muelle)',
      ico: 'rayo',
      color: '#74f5a1',
      fn: () =>
        ef('Golpe de zoom', (e) => {
          const s = useEd.getState();
          const r = s.linea!.escenas.find((x) => x.id === e.id)!;
          const f = Math.max(0, Math.min(s.frame, r.fin - 1) - r.origen);
          edEsc(e, (x) => (x.camara = [...x.camara.filter((c: any) => c.f < f), ...clavesZoomPunto(f, 540, 900, 1080, 1920, fps, 1.18).map((c) => ({ ...c, curva: 'muelle' as const }))]));
        }),
    },
    { id: 'sin-camara', t: 'Cámara fija', d: 'Quita el movimiento de cámara', ico: 'cuadro', color: '#a6a6a6', fn: () => ef('Cámara fija', (e) => edEsc(e, (x) => (x.camara = []))) },
    {
      id: 'rampa',
      t: 'Rampa: acelerar',
      d: 'La toma va cada vez más rápido',
      ico: 'velocidad',
      color: '#7aa7ff',
      fn: () =>
        ef('Rampa', (e) => {
          const r = useEd.getState().linea!.escenas.find((x) => x.id === e.id)!;
          if (!e.tomas.length) return;
          edEsc(e, (x) => {
            x.tomas[0].curva = rampa(x.tomas[0], 'acelerar', (x.recorte - r.pre) / fps, (x.recorte + x.duracion - r.pre) / fps);
          });
        }),
    },
    {
      id: 'impulso',
      t: 'Rampa: impulso',
      d: 'Acelera en el centro y vuelve',
      ico: 'velocidad',
      color: '#7aa7ff',
      fn: () =>
        ef('Impulso', (e) => {
          const r = useEd.getState().linea!.escenas.find((x) => x.id === e.id)!;
          if (!e.tomas.length) return;
          edEsc(e, (x) => {
            x.tomas[0].curva = rampa(x.tomas[0], 'impulso', (x.recorte - r.pre) / fps, (x.recorte + x.duracion - r.pre) / fps);
          });
        }),
    },
    {
      id: 'brillo',
      t: 'Texto con brillo',
      d: 'Resplandor en el texto seleccionado',
      ico: 'efectos',
      color: '#74f5a1',
      fn: () => {
        const s = useEd.getState();
        if (s.sel?.tipo !== 'texto') return s.avisar('Selecciona un texto en la línea de tiempo');
        const sel = s.sel;
        s.editar('brillo', (d) => void (d.escenas.find((x) => x.id === sel.escena)!.textos.find((t) => t.id === sel.id)!.brillo = 0.6));
      },
    },
  ];
  return (
    <div className="scroll">
      <div className="ayuda" style={{ padding: '6px 12px 0' }}>
        Se aplican a la escena seleccionada (o la del cursor).
      </div>
      <div className="rejilla" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
        {fichas.map((f) => (
          <Ficha key={f.id} t={f.t} d={f.d} prueba={{ efecto: f.id }} onClick={f.fn} muestra={<Ico n={f.ico} s={22} style={{ color: f.color }} />} />
        ))}
      </div>
    </div>
  );
};

const SUBNAV: Partial<Record<Tab, [string, string][]>> = {
  medios: [
    ['local', 'Local'],
    ['proyecto', 'En uso'],
  ],
  audio: [
    ['musica', 'Música'],
    ['efectos', 'Efectos'],
    ['voces', 'Voces'],
  ],
  plantillas: [
    ['todas', 'Todas'],
    ['Gancho', 'Gancho'],
    ['Producto', 'Producto'],
    ['Contenido', 'Contenido'],
    ['Prueba social', 'Testimonio'],
    ['Cierre', 'Cierre'],
    ['Marca', 'Marca'],
    ['basicas', 'Básicas'],
    ['proyecto', 'Del proyecto'],
  ],
  subs: [
    ['auto', 'Automáticos'],
    ['galeria', 'Estilos'],
    ['estilo', 'Ajustes'],
    ['transcripcion', 'Transcripción'],
  ],
  texto: [
    ['estilos', 'Estilos'],
    ['fuentes', 'Fuentes'],
    ['animaciones', 'Animaciones'],
    ['basicos', 'Básicos'],
  ],
  marca: [
    ['marca', 'Marca'],
    ['compartida', 'Compartida'],
  ],
  efectos: [
    ['biblioteca', 'Biblioteca'],
    ['camara', 'Cámara y velocidad'],
  ],
};

/** Abre una pestaña de la biblioteca desde otro sitio (menú contextual, inspector). */
export const abrirBiblioteca = (tab: string, sub?: string) => window.dispatchEvent(new CustomEvent('studio:biblioteca', { detail: { tab, sub } }));

export const Biblioteca: React.FC = () => {
  const [tab, setTab] = useState<Tab>('medios');
  const [sub, setSub] = useState<Record<string, string>>({});
  React.useEffect(() => {
    const f = (e: Event) => {
      const d = (e as CustomEvent).detail as { tab: Tab; sub?: string };
      setTab(d.tab);
      if (d.sub) setSub((x) => ({ ...x, [d.tab]: d.sub! }));
    };
    window.addEventListener('studio:biblioteca', f);
    return () => window.removeEventListener('studio:biblioteca', f);
  }, []);
  const sn = SUBNAV[tab];
  const s = sub[tab] ?? sn?.[0][0] ?? '';
  return (
    <aside className="panel izq" style={{ width: 'var(--ancho-izq)', flex: 'none' }} data-prueba="biblioteca">
      <div className="tabs-recursos" onWheel={(e) => ((e.currentTarget as HTMLElement).scrollLeft += e.deltaY)}>
        {TABS.map(([k, n, ic]) => (
          <button key={k} className={`tab-r ${tab === k ? 'on' : ''}`} onClick={(e) => {
              setTab(k);
              const b = e.currentTarget as HTMLElement;
              const c = b.parentElement!;
              if (b.offsetLeft < c.scrollLeft) c.scrollLeft = b.offsetLeft - 8;
              else if (b.offsetLeft + b.offsetWidth > c.scrollLeft + c.clientWidth) c.scrollLeft = b.offsetLeft + b.offsetWidth - c.clientWidth + 8;
            }} data-tab={k} title={n}>
            <Ico n={ic} s={19} />
            {n}
          </button>
        ))}
      </div>
      <div className="cuerpo-recursos">
        {sn && (
          <nav className="subnav">
            {sn.map(([k, n]) => (
              <button key={k} className={s === k ? 'on' : ''} onClick={() => setSub({ ...sub, [tab]: k })} data-sub={k}>
                {n}
              </button>
            ))}
          </nav>
        )}
        <div className="contenido-r">
          {tab === 'medios' && <Medios sub={s} />}
          {tab === 'audio' && <AudioTab sub={s} />}
          {tab === 'texto' && s === 'estilos' && <EstilosTexto />}
          {tab === 'texto' && s === 'fuentes' && <Fuentes />}
          {tab === 'texto' && s === 'animaciones' && <Animaciones />}
          {tab === 'texto' && s === 'basicos' && <Textos />}
          {tab === 'elementos' && <ElementosLib />}
          {tab === 'plantillas' && <Plantillas sub={s} />}
          {tab === 'efectos' && s === 'biblioteca' && <EfectosLib />}
          {tab === 'efectos' && s === 'camara' && <Efectos />}
          {tab === 'filtros' && <Filtros />}
          {tab === 'trans' && <TransicionesLib />}
          {tab === 'subs' && s === 'galeria' && <SubEstilos />}
          {tab === 'subs' && s === 'transcripcion' && <Transcripcion />}
          {tab === 'subs' && s !== 'galeria' && s !== 'transcripcion' && (
            <div className="scroll">
              <PanelSub parte={s as any} />
            </div>
          )}
          {tab === 'marca' && (
            <div className="scroll">
              {s === 'compartida' ? <PanelCompartida /> : <PanelMarca />}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

/** Tiempo de la toma principal de una escena en el fotograma local f (para las miniaturas de la línea de tiempo). */
export const tTomaEn = (e: TEscena, pre: number, fps: number, fLocal: number) => (e.tomas[0] ? tiempoToma(e.tomas[0], (fLocal - pre) / fps) : 0);
