/**
 * Biblioteca compartida (todos los proyectos y equipos): logos, gráficos, clips, música, efectos, tipografías y escenas
 * plantilla. «Usar» copia
 * el archivo al proyecto abierto. Exportar / importar como .zip (al importar se hace antes una copia de seguridad).
 */
import React, { useEffect, useRef, useState } from 'react';
import { escenaEn } from '@contrato/linea';
import { nid, useEd } from './estado';
import { api } from './api';
import { Ico } from './iconos';
import { pedirTexto } from './menus';
import { escenaObjetivo, insertarEscena } from './Biblioteca';

type Item = { nombre: string; tam: number; mtime: number; datos?: any };
type Datos = { carpeta: string; logos: Item[]; graficos: Item[]; clips: Item[]; musica: Item[]; sfx: Item[]; fuentes: Item[]; plantillas: Item[] };
const SECCIONES: [keyof Omit<Datos, 'carpeta'>, string, string][] = [
  ['logos', 'Logos', 'image/*'],
  ['graficos', 'Gráficos e imágenes', 'image/*'],
  ['clips', 'Clips de vídeo', 'video/*'],
  ['musica', 'Música', 'audio/*'],
  ['sfx', 'Efectos de sonido', 'audio/*'],
  ['fuentes', 'Tipografías propias', '.woff2,.woff,.ttf,.otf'],
  ['plantillas', 'Escenas plantilla', ''],
];

export const PanelCompartida: React.FC = () => {
  const [d, setD] = useState<Datos | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const zip = useRef<HTMLInputElement>(null);
  const cargar = () => fetch('/api/compartida').then((r) => r.json()).then(setD);
  useEffect(() => {
    cargar();
  }, []);
  const post = (u: string, b: unknown) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
  const s = () => useEd.getState();
  const usar = async (tipo: string, it: Item) => {
    if (tipo === 'plantillas') {
      const e = it.datos?.escena;
      if (!e) return;
      const { id: _id, ...resto } = e;
      insertarEscena(e.plantilla, { ...resto, textos: (e.textos ?? []).map((t: any) => ({ ...t, id: nid('t') })) });
      return;
    }
    const r = await post('/api/compartida/usar', { tipo, nombre: it.nombre });
    if (r.error) return s().avisar(r.error, 'error');
    useEd.setState({ medios: await api.medios() });
    const st = s();
    if (tipo === 'logos') st.editar('compartida-logo', (x) => void (x.ajustes.marca.logo = r.ruta));
    else if (tipo === 'musica') st.editar('compartida-musica', (x) => void (x.musica.src = r.ruta));
    else if (tipo === 'fuentes') {
      const familia = it.nombre.replace(/\.[^.]+$/, '');
      st.editar('compartida-fuente', (x) => {
        x.ajustes.fuentesExtra ??= [];
        if (!x.ajustes.fuentesExtra.some((f) => f.familia === familia)) x.ajustes.fuentesExtra.push({ familia, archivos: [{ src: r.ruta, peso: 400 }] });
      });
    } else if (tipo === 'sfx' && st.linea && st.proyecto) {
      const i = escenaEn(st.linea, st.frame);
      const e = st.proyecto.escenas[i];
      const er = st.linea.escenas[i];
      st.editar('compartida-sfx', (x) => void x.sfx.push({ id: nid('sfx-'), src: r.ruta, volumen: 0.5, duracion: Math.round(1.5 * x.ajustes.fps), escena: e.id, offset: st.frame - er.origen } as any));
    }
    s().avisar(`«${it.nombre}» en el proyecto (${r.ruta})`, 'ok');
  };
  const subir = async (tipo: string, fs: FileList | null) => {
    for (const f of [...(fs ?? [])]) await fetch(`/api/compartida/subir?tipo=${tipo}&nombre=${encodeURIComponent(f.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f });
    cargar();
  };
  const p = useEd((x) => x.proyecto)!;
  return (
    <div className="seccion" data-prueba="compartida">
      <h4>Biblioteca compartida (todos los proyectos y equipos)</h4>
      <div className="ayuda">En {d?.carpeta}. Los colores y fuentes se guardan como kits de marca (pestaña Marca).</div>
      <div className="fila" style={{ gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
        <a className="btn chico" href="/api/compartida/exportar" data-prueba="exportar-biblioteca">
          <Ico n="descargar" s={13} /> Exportar .zip
        </a>
        <button className="btn chico" onClick={() => zip.current?.click()}>
          <Ico n="subir" s={13} /> Importar .zip
        </button>
        <input
          ref={zip}
          type="file"
          accept=".zip"
          hidden
          data-prueba="importar-biblioteca"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const r = await fetch('/api/compartida/importar', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f }).then((x) => x.json());
            if (r.error) s().avisar(r.error, 'error');
            else {
              s().avisar(`Biblioteca importada (copia de seguridad previa: ${r.copia})`, 'ok');
              cargar();
            }
          }}
        />
        {p.ajustes.marca.logo && (
          <button className="btn chico" onClick={async () => (await post('/api/compartida/desde-proyecto', { tipo: 'logos', ruta: p.ajustes.marca.logo }), cargar())}>
            Guardar el logo
          </button>
        )}
        {p.musica.src && (
          <button className="btn chico" data-prueba="guardar-musica-compartida" onClick={async () => (await post('/api/compartida/desde-proyecto', { tipo: 'musica', ruta: p.musica.src }), cargar())}>
            Guardar la música
          </button>
        )}
        <button
          className="btn chico"
          data-prueba="guardar-escena-compartida"
          onClick={async () => {
            const e = escenaObjetivo();
            if (!e) return;
            const n = await pedirTexto('Guardar escena como plantilla', 'Nombre', e.nombre || e.plantilla);
            if (!n) return;
            await post('/api/compartida/desde-proyecto', { tipo: 'plantillas', nombre: n, escena: e });
            cargar();
          }}
        >
          Guardar escena como plantilla
        </button>
      </div>
      {SECCIONES.map(([t, n, acepta]) => (
        <div key={t} style={{ marginTop: 8 }} data-seccion-compartida={t}>
          <div className="fila" style={{ justifyContent: 'space-between' }}>
            <b style={{ fontSize: 12 }}>
              {n} ({d?.[t]?.length ?? 0})
            </b>
            {acepta && (
              <label className="btn chico" style={{ cursor: 'pointer' }}>
                <Ico n="mas" s={12} /> Añadir
                <input type="file" multiple hidden accept={acepta} onChange={(e) => (subir(t, e.target.files), (e.target.value = ''))} />
              </label>
            )}
          </div>
          {(d?.[t] ?? []).map((it) => (
            <div key={it.nombre} className="item" style={{ cursor: 'default', padding: '3px 6px' }} data-item-compartido={`${t}/${it.nombre}`}>
              {t === 'logos' || t === 'graficos' ? (
                <img loading="lazy" src={`/compartida/${t}/${encodeURIComponent(it.nombre)}`} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
              ) : t === 'musica' || t === 'sfx' ? (
                <button
                  className="btn-r"
                  onClick={() => {
                    audio.current?.pause();
                    audio.current = new Audio(`/compartida/${t}/${encodeURIComponent(it.nombre)}`);
                    audio.current.play();
                  }}
                >
                  <Ico n="play" s={12} />
                </button>
              ) : (
                <Ico n={t === 'fuentes' ? 'fuente' : t === 'clips' ? 'medios' : 'plantillas'} s={14} />
              )}
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.datos?.nombre ?? it.nombre}</span>
              <button className="btn chico" onClick={() => usar(t, it)} data-usar={`${t}/${it.nombre}`}>
                Usar
              </button>
              <button className="btn-r" title="Quitar (va a la papelera de la app)" onClick={async () => (await post('/api/compartida/borrar', { tipo: t, nombre: it.nombre }), cargar())}>
                <Ico n="cerrar" s={11} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
