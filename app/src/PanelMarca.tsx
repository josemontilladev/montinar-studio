/** Marca (logo, nombre, eslogan, llamada a la acción, fuentes) y kits de marca reutilizables entre proyectos. */
import React, { useEffect, useState } from 'react';
import { FUENTES } from '@proyecto';
import { useEd } from './estado';
import { api } from './api';
import { Campo, Texto } from './campos';
import { instalarFuente, useCatalogo } from './libreria';

/** Color CSS → [r, g, b] (hex de 3/6 cifras o rgb/rgba); null si no se entiende. */
const rgb = (c: string): [number, number, number] | null => {
  const h = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (h) {
    const x = h[1].length === 3 ? h[1].split('').map((y) => y + y).join('') : h[1];
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) as any;
  }
  const r = c.match(/rgba?\(([^)]+)\)/);
  if (r) {
    const [a, b, d, al] = r[1].split(',').map((y) => parseFloat(y));
    if (al != null && al < 0.6) return null; // los colores translúcidos (fondos de caja) se dejan
    return [a, b, d];
  }
  return null;
};
/** Clave de la paleta más parecida a un color (para que el kit de marca lo controle). */
export const clavePaleta = (paleta: Record<string, string>, c: string | undefined | null) => {
  if (!c || paleta[c] || c === 'transparent') return c;
  const v = rgb(c);
  if (!v) return c;
  let mejor = c,
    dmin = Infinity;
  for (const [k, x] of Object.entries(paleta)) {
    const w = rgb(x);
    if (!w) continue;
    const d = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2 + (v[2] - w[2]) ** 2;
    if (d < dmin) (dmin = d), (mejor = k);
  }
  return mejor;
};

const fuentes = [...new Set(Object.keys(FUENTES).filter((k) => !['sans', 'serif', 'mono'].includes(k)))];

export const PanelMarca: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const medios = useEd((s) => s.medios);
  const editar = useEd((s) => s.editar);
  const [kits, setKits] = useState<{ id: string; nombre: string; kit: any; fecha: string }[]>([]);
  const [nombre, setNombre] = useState('');
  const m = p.ajustes.marca;
  const recargar = () => api.marcas().then(setKits).catch(() => {});
  useEffect(() => {
    recargar();
  }, []);
  const ed = (c: string, fn: (d: any) => void) => editar(`marca:${c}`, (d) => fn(d.ajustes));
  const cat = useCatalogo();
  const todas = [...new Set([...fuentes, ...(cat ?? []).map((f) => f.familia)])];
  const unificarFuentes = () => {
    let n = 0;
    editar('marca-fuentes', (d) => {
      for (const e of d.escenas)
        for (const t of e.textos)
          if (t.fuente) {
            delete t.fuente;
            n++;
          }
      if (d.subtitulos.fuente) {
        delete d.subtitulos.fuente;
        n++;
      }
    });
    useEd.getState().avisar(n ? `${n} textos vuelven a las fuentes de la marca` : 'Todos los textos ya usan las fuentes de la marca', 'ok');
  };
  const unificarColores = () => {
    let n = 0;
    editar('marca-colores', (d) => {
      const pal = d.ajustes.paleta;
      const k = (c: any): any => {
        const r = clavePaleta(pal, c);
        if (r !== c) n++;
        return r;
      };
      for (const e of d.escenas) {
        for (const t of e.textos) {
          t.color = k(t.color);
          if (t.acento) t.acento = k(t.acento);
          const es = t.estilo;
          if (es) {
            if (es.trazo) es.trazo.color = k(es.trazo.color);
            if (es.sombra) es.sombra.color = k(es.sombra.color);
            if (es.fondo) es.fondo.color = k(es.fondo.color);
            if (es.degradado) (es.degradado.de = k(es.degradado.de)), (es.degradado.a = k(es.degradado.a));
            if (es.brilloColor) es.brilloColor = k(es.brilloColor);
          }
        }
        for (const el of e.elementos ?? []) (el.color = k(el.color)), (el.color2 = k(el.color2));
      }
      const sb = d.subtitulos;
      sb.color = k(sb.color);
      sb.resalte = k(sb.resalte);
      sb.colorResalte = k(sb.colorResalte);
    });
    useEd.getState().avisar(n ? `${n} colores sueltos pasan a la paleta de la marca` : 'Todo usa ya los colores de la marca', 'ok');
  };
  return (
    <>
      <div className="seccion" data-prueba="marca">
        <h4>Marca</h4>
        <Campo et="Nombre">
          <Texto v={m.nombre} on={(v) => ed('nombre', (a) => void (a.marca.nombre = v))} prueba="marca-nombre" />
        </Campo>
        <Campo et="Logo">
          <select value={m.logo ?? ''} onChange={(e) => ed('logo', (a) => void (a.marca.logo = e.target.value || null))}>
            <option value="">(monograma con la inicial)</option>
            {medios
              .filter((x) => x.tipo === 'imagen')
              .map((x) => (
                <option key={x.ruta} value={x.ruta}>
                  {x.ruta}
                </option>
              ))}
          </select>
        </Campo>
        <Campo et="Eslogan">
          <Texto v={m.eslogan} on={(v) => ed('eslogan', (a) => void (a.marca.eslogan = v))} />
        </Campo>
        <Campo et="Botón / CTA">
          <Texto v={m.cta} on={(v) => ed('cta', (a) => void (a.marca.cta = v))} ph={p.ajustes.siteUrl} />
        </Campo>
        {(['sans', 'serif', 'mono'] as const).map((k) => (
          <Campo key={k} et={{ sans: 'Fuente texto', serif: 'Fuente acento', mono: 'Fuente mono' }[k]}>
            <select
              value={p.ajustes.fuentes[k]}
              onChange={async (e) => {
                const v = e.target.value;
                await instalarFuente(v).catch(() => {});
                ed(`f-${k}`, (a) => void (a.fuentes[k] = v));
              }}
            >
              {todas.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Campo>
        ))}
      </div>
      <div className="seccion" data-prueba="unificar-marca">
        <h4>Aplicar la marca a todo</h4>
        <div className="ayuda">La paleta y las fuentes de la marca mandan: al cambiarlas (o al aplicar un kit) cambia todo el vídeo. Estos botones hacen que nada se quede fuera.</div>
        <div className="fila" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <button className="btn chico" onClick={unificarFuentes} data-prueba="unificar-fuentes">
            Fuentes de la marca en todos los textos
          </button>
          <button className="btn chico" onClick={unificarColores} data-prueba="unificar-colores">
            Colores sueltos → paleta
          </button>
          <button className="btn chico prim" onClick={() => (unificarFuentes(), unificarColores())} data-prueba="unificar-todo">
            Todo a la vez
          </button>
        </div>
      </div>
      <div className="seccion">
        <h4>Kits de marca (todos los proyectos)</h4>
        {kits.length === 0 && <div className="ayuda">Guarda la marca, la paleta, las fuentes y la web de este proyecto para usarlas en otros.</div>}
        {kits.map((k) => (
          <div key={k.id} className="fila" style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {Object.values(k.kit.paleta ?? {})
                .slice(0, 6)
                .map((c: any, i) => (
                  <span key={i} style={{ width: 12, height: 22, borderRadius: 3, background: c }} />
                ))}
            </div>
            <span style={{ flex: 1 }}>{k.nombre}</span>
            <button
              className="btn chico"
              data-prueba={`aplicar-kit-${k.id}`}
              onClick={async () => {
                const kit = await api.aplicarMarca(k.id);
                editar('aplicar-kit', (d) => {
                  Object.assign(d.ajustes.paleta, kit.paleta ?? {});
                  if (kit.fuentes) d.ajustes.fuentes = kit.fuentes;
                  for (const f of kit.fuentesExtra ?? []) if (!(d.ajustes.fuentesExtra ?? []).some((x) => x.familia === f.familia)) (d.ajustes.fuentesExtra ??= []).push(f);
                  if (kit.marca) d.ajustes.marca = { ...d.ajustes.marca, ...kit.marca };
                  for (const c of ['siteUrl', 'whatsapp', 'legal'] as const) if (kit[c]) d.ajustes[c] = kit[c];
                });
                useEd.setState({ medios: await api.medios() });
                useEd.getState().avisar(`Kit «${k.nombre}» aplicado`, 'ok');
              }}
            >
              Aplicar
            </button>
          </div>
        ))}
        <div className="fila">
          <input type="text" placeholder="Nombre del kit" value={nombre} onChange={(e) => setNombre(e.target.value)} data-prueba="kit-nombre" />
          <button
            className="btn chico"
            disabled={!nombre.trim()}
            data-prueba="guardar-kit"
            onClick={async () => {
              const a = p.ajustes;
              await api.guardarMarca(nombre.trim(), { paleta: a.paleta, fuentes: a.fuentes, fuentesExtra: (a.fuentesExtra ?? []).filter((f) => Object.values(a.fuentes).includes(f.familia)), marca: a.marca, siteUrl: a.siteUrl, whatsapp: a.whatsapp, legal: a.legal });
              setNombre('');
              recargar();
              useEd.getState().avisar('Kit de marca guardado', 'ok');
            }}
          >
            Guardar kit
          </button>
        </div>
      </div>
    </>
  );
};
