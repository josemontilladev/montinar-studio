/**
 * Sección «Diseños» de Inicio: crear un diseño (posts, flyers, carruseles, banners) desde un formato y los diseños
 * recientes con miniatura (abrir, duplicar, renombrar, borrar). Se editan en el estudio de diseño (/diseno.html).
 */
import React, { useEffect, useState } from 'react';
import { FORMATOS } from '../diseno/esquema';
import { useEd } from './estado';
import { Ico } from './iconos';
import { pedirTexto } from './menus';

type Ficha = { id: string; nombre: string; ancho: number; alto: number; paginas: number; mtime: number; miniatura: number };

/** Ir al estudio de diseño guardando antes el proyecto de vídeo. */
export const irADiseno = (q = '') =>
  import('./guardado')
    .then((m) => m.guardarAhora(false))
    .catch(() => {})
    .finally(() => (location.href = `/diseno.html${q}`));

const hace = (t: number) => {
  const s = (Date.now() - t) / 1000;
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(t).toLocaleDateString('es');
};
const post = (u: string, b: unknown = {}) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());

export const InicioDisenos: React.FC<{ q: string }> = ({ q }) => {
  const [lista, setLista] = useState<Ficha[] | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const avisar = useEd.getState().avisar;
  const cargar = () =>
    fetch('/api/disenos')
      .then((r) => r.json())
      .then((d) => setLista(d.disenos ?? []))
      .catch(() => setLista([]));
  useEffect(() => {
    cargar();
  }, []);
  const accion = async (u: string, ok: string, b?: unknown) => {
    setMenu(null);
    const r = await post(u, b);
    r.error ? avisar(r.error, 'error') : (avisar(ok, 'ok'), cargar());
  };
  const e = encodeURIComponent;
  const vistos = (lista ?? []).filter((x) => x.nombre.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  return (
    <div data-prueba="inicio-disenos">
      <h4>
        Diseños <span className="ayuda">· posts, carruseles, flyers y banners con las ilustraciones de MétricaSEO</span>
      </h4>
      <div className="plantillas-proyecto">
        <button className="plantilla-p" onClick={() => irADiseno('?nuevo=1')} data-nuevo-diseno>
          <div className="forma-p" style={{ aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', color: 'var(--acento-t)' }}>
            <Ico n="mas" s={22} />
          </div>
          <b>Nuevo diseño</b>
          <span>Elige el formato o un tamaño a medida</span>
        </button>
        {FORMATOS.slice(0, 5).map((f) => (
          <button key={f.id} className="plantilla-p" onClick={() => irADiseno(`?nuevo=${f.id}`)} data-formato-diseno={f.id}>
            <div className="forma-p" style={{ aspectRatio: `${f.ancho} / ${f.alto}` }} />
            <b>{f.nombre}</b>
            <span>
              {f.ancho} × {f.alto} · {f.desc}
            </span>
          </button>
        ))}
        <button className="plantilla-p" onClick={() => irADiseno()} data-mis-disenos>
          <div className="forma-p" style={{ aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', color: 'var(--acento-t)' }}>
            <Ico n="carpeta" s={22} />
          </div>
          <b>Todos los diseños</b>
          <span>Abrir el estudio de diseño</span>
        </button>
      </div>
      {!!vistos.length && (
        <div className="proyectos" style={{ marginTop: 14 }}>
          {vistos.map((x) => (
            <div key={x.id} className="tarjeta-p" data-diseno={x.id} onDoubleClick={() => irADiseno(`?d=${e(x.id)}`)}>
              <div className="mini-p" style={{ cursor: 'pointer' }} onClick={() => irADiseno(`?d=${e(x.id)}`)}>
                {x.miniatura ? <img src={`/api/disenos/${e(x.id)}/recurso?f=miniatura.png&v=${Math.round(x.miniatura)}`} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, objectFit: 'contain', padding: 8 }} /> : <div className="mini-vacia">{x.nombre.slice(0, 1).toUpperCase()}</div>}
              </div>
              <div className="info-p">
                <b title={x.nombre}>{x.nombre}</b>
                <span>
                  {x.ancho}×{x.alto} · {x.paginas} {x.paginas === 1 ? 'página' : 'páginas'} · {hace(x.mtime)}
                </span>
              </div>
              <button className="btn-r menu-p" onClick={() => setMenu(menu === x.id ? null : x.id)} data-menu-diseno={x.id}>
                <Ico n="menu" s={15} />
              </button>
              {menu === x.id && (
                <div className="menu-flot" style={{ position: 'absolute', right: 6, top: 34, zIndex: 5 }}>
                  <button onClick={() => irADiseno(`?d=${e(x.id)}`)}>
                    <Ico n="carpeta" s={14} /> Abrir
                  </button>
                  <button data-accion="duplicar" onClick={() => accion(`/api/disenos/${e(x.id)}/duplicar`, 'Diseño duplicado')}>
                    <Ico n="duplicar" s={14} /> Duplicar
                  </button>
                  <button
                    data-accion="renombrar"
                    onClick={async () => {
                      setMenu(null);
                      const n = await pedirTexto('Renombrar diseño', 'Nombre', x.nombre);
                      if (n) accion(`/api/disenos/${e(x.id)}/renombrar`, 'Diseño renombrado', { nombre: n });
                    }}
                  >
                    <Ico n="editar" s={14} /> Renombrar
                  </button>
                  <button className="peligro" data-accion="borrar" onClick={() => accion(`/api/disenos/${e(x.id)}/borrar`, 'Diseño movido a la papelera de diseños')}>
                    <Ico n="papelera" s={14} /> Mover a la papelera
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
