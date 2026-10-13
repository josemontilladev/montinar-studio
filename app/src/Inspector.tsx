/** Inspector (derecha): propiedades de lo seleccionado. Todo cambio se ve al instante en el visor. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Draft } from 'immer';
import { PLANTILLAS, FUENTES } from '@proyecto';
import { type TAncla, type TElemento, type TEscena, type TProyecto, type TTexto, type TTiempo } from '@contrato/esquema';
import { ANIM_BUCLE, ANIM_ENTRADA, ANIM_SALIDA, EFECTOS, ELEMENTOS_INFO, FILTROS, TRANSICIONES_INFO } from '@contrato/kit/biblioteca';
import { copiarEstilo, editarTextos, estiloEnTodos, guardarComoEstilo, pegarEstilo } from './libreria';
import { pedirTexto } from './menus';
import { abrirBiblioteca } from './Biblioteca';
import { SeccionSeguir } from './Seguimiento';
import { tiempoLocal } from '@contrato/linea';
import { irA, nid, useEd } from './estado';
import { api } from './api';
import { Ico } from './iconos';
import { Campo, ColorP, Deslizador, Num, Segmentos, Si, Texto } from './campos';
import { TRANS_INFO, ponerTransicion } from './ops';
import { regenerar, trabajoDeFrase } from './voz';
import { faltantes } from './Visor';
import { PanelSub } from './PanelSub';
import { PanelCampos } from './PanelCampos';
import { PanelMarca } from './PanelMarca';
import { PanelCamara, PanelEfectos, PanelTransformar, rampa } from './Movimiento';
import { BotonMejorarVoz, SeccionMezcla, SeccionRitmo } from './audioPro';

const fuentes = [...new Set(Object.keys(FUENTES).filter((k) => !['sans', 'serif', 'mono'].includes(k)))];
const TONOS: [string, string][] = [
  ['bone', 'Hueso'],
  ['bone2', 'Hueso 2'],
  ['ink', 'Tinta'],
  ['acid', 'Ácido'],
];

const useEsc = (id: string) => useEd((s) => s.proyecto?.escenas.find((e) => e.id === id));

const Cab: React.FC<{ tipo: string; tit: string; children?: React.ReactNode }> = ({ tipo, tit, children }) => (
  <div className="cab-insp">
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="tipo">{tipo}</div>
      <div className="tit" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tit}
      </div>
    </div>
    {children}
  </div>
);

/** Pestaña y sub-pestaña activas del inspector (las secciones se muestran según a cuál pertenecen). */
export const PestCtx = React.createContext<{ tab: string; primera: string; sub: string; primeraSub: string }>({ tab: '', primera: '', sub: '', primeraSub: '' });
const cerradas = new Set<string>();

/** Sección plegable: título, interruptor opcional, restablecer y acciones. `p` = pestaña, `sp` = sub-pestaña. */
const Sec: React.FC<{ t: string; children: React.ReactNode; extra?: React.ReactNode; p?: string; sp?: string; toggle?: { v: boolean; on: (b: boolean) => void }; reset?: () => void }> = ({ t, children, extra, p, sp, toggle, reset }) => {
  const c = React.useContext(PestCtx);
  const [, setN] = useState(0);
  if ((p ?? c.primera) !== c.tab) return null;
  if (sp && (c.sub || c.primeraSub) !== sp) return null;
  const clave = `${p ?? ''}/${t.replace(/\(.*\)|·.*$/g, '').trim()}`;
  const cerrada = cerradas.has(clave);
  return (
    <div className={`seccion ${cerrada ? 'cerrada' : ''}`}>
      <h4
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, input, select, label')) return;
          cerrada ? cerradas.delete(clave) : cerradas.add(clave);
          setN((x) => x + 1);
        }}
      >
        {toggle && <input type="checkbox" checked={toggle.v} onChange={(e) => toggle.on(e.target.checked)} />}
        {t}
        <Ico n="abajo" s={14} style={{ color: 'var(--tenue)', transform: cerrada ? 'rotate(-90deg)' : undefined, transition: 'transform .15s' }} />
        <span className="esp" />
        <span className="h4-acc">
          {extra}
          {reset && (
            <button className="btn-r" title="Restablecer" onClick={reset}>
              <Ico n="reiniciar" s={13} />
            </button>
          )}
        </span>
      </h4>
      {children}
    </div>
  );
};

/** Bloque que solo se ve en una pestaña (para secciones con su propio marcado). */
const Solo: React.FC<{ p: string; children: React.ReactNode }> = ({ p, children }) => (React.useContext(PestCtx).tab === p ? <>{children}</> : null);

/** Selector de medio de public/ (por tipo) con botón de subir. */
const SelMedio: React.FC<{ v: string | null | undefined; on: (r: string) => void; tipos: ('video' | 'imagen' | 'audio')[]; carpeta: string; prueba?: string; vacio?: string }> = ({ v, on, tipos, carpeta, prueba, vacio }) => {
  const medios = useEd((s) => s.medios);
  const input = useRef<HTMLInputElement>(null);
  const ops = medios.filter((m) => tipos.includes(m.tipo));
  const falta = v && medios.length && !medios.some((m) => m.ruta === v);
  return (
    <div>
      <div className="fila">
        <select value={v ?? ''} onChange={(e) => on(e.target.value)} data-prueba={prueba} style={falta ? { borderColor: 'var(--rojo)' } : undefined}>
          {vacio != null && <option value="">{vacio}</option>}
          {falta && <option value={v!}>⚠ {v} (no existe)</option>}
          {ops.map((m) => (
            <option key={m.ruta} value={m.ruta}>
              {m.ruta}
              {m.dur ? ` · ${m.dur.toFixed(1)} s` : ''}
            </option>
          ))}
        </select>
        <button className="btn chico icono" title="Subir archivo" onClick={() => input.current?.click()}>
          <Ico n="subir" />
        </button>
        <input
          ref={input}
          type="file"
          hidden
          accept={tipos.map((t) => (t === 'video' ? 'video/*' : t === 'imagen' ? 'image/*' : 'audio/*')).join(',')}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const s = useEd.getState();
            s.avisar(`Subiendo ${f.name}…`);
            try {
              const r = await api.subir(f, carpeta);
              useEd.setState({ medios: await api.medios() });
              on(r.ruta);
              s.avisar(`Subido: ${r.ruta}`, 'ok');
            } catch (err: any) {
              s.avisar(`Error al subir: ${err.message}`, 'error');
            }
            e.target.value = '';
          }}
        />
      </div>
      {falta && <div className="chip error" style={{ marginTop: 4 }}>Falta el archivo en public/</div>}
    </div>
  );
};

/** Un instante de texto: número de fotograma local o ancla a palabra (con opción de anclar / desanclar). */
const Instante: React.FC<{ v: TTiempo | null; on: (t: TTiempo | null) => void; escId: string; permitirNulo?: boolean; prueba?: string }> = ({ v, on, escId, permitirNulo, prueba }) => {
  const l = useEd((s) => s.linea)!;
  const r = l.escenas.find((x) => x.id === escId);
  if (!r) return null;
  const palabras = r.frase?.palabras ?? [];
  if (v == null)
    return (
      <div className="fila">
        <span className="chip">hasta el final</span>
        <button className="btn chico" onClick={() => on(r.finVisible - r.origen - 10)}>
          Fijar
        </button>
      </div>
    );
  if (typeof v === 'number')
    return (
      <div className="fila">
        <Num v={v} on={(n) => on(Math.round(n))} suf="f" prueba={prueba} ancho={64} />
        <select
          value=""
          style={{ width: 100 }}
          title="Anclar a una palabra de la voz"
          onChange={(e) => {
            if (!e.target.value) return;
            const [n, w] = e.target.value.split('|');
            on({ palabra: w, n: Number(n), seg: 0, frames: 0 });
          }}
        >
          <option value="">⚓ Anclar…</option>
          {palabras.map((w, i) => {
            const n = palabras.slice(0, i).filter((x) => x.p.toLowerCase().includes(w.p.toLowerCase())).length;
            return (
              <option key={i} value={`${n}|${w.p}`}>
                {w.p} · {w.ini.toFixed(2)} s
              </option>
            );
          })}
        </select>
        {permitirNulo && (
          <button className="btn chico icono" title="Hasta el final de la escena" onClick={() => on(null)}>
            ∞
          </button>
        )}
      </div>
    );
  const a = v as TAncla;
  const existe = palabras.some((w) => w.p.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(a.palabra.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
  return (
    <div>
      <div className="fila" style={{ flexWrap: 'wrap' }}>
        <span className={`chip ${existe ? 'ancla' : 'error'}`} title="Anclado a una palabra de la frase: se mueve solo si se regenera la voz">
          ⚓ «{a.palabra}»{a.seg ? ` ${a.seg > 0 ? '+' : ''}${a.seg}s` : ''}
          {a.frames ? ` ${a.frames > 0 ? '+' : ''}${a.frames}f` : ''} → f {tiempoLocal(a, r.pre, l.fps, r.frase)}
        </span>
        <button className="btn chico" onClick={() => on(tiempoLocal(a, r.pre, l.fps, r.frase))} title="Pasar a un fotograma fijo">
          Desanclar
        </button>
      </div>
      <div className="fila" style={{ marginTop: 4 }}>
        <span style={{ color: 'var(--tenue)', fontSize: 11 }}>ajuste</span>
        <Num v={a.frames} on={(n) => on({ ...a, frames: Math.round(n) })} suf="f" ancho={56} />
      </div>
      {!existe && <div className="ayuda" style={{ color: '#ff9a9a' }}>La palabra no está en la frase actual: se usa el inicio de la frase.</div>}
    </div>
  );
};

// ——— Escena ———

const PanelEscena: React.FC<{ id: string }> = ({ id }) => {
  const e = useEsc(id);
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const frame = useEd((s) => s.frame);
  const editar = useEd((s) => s.editar);
  const [params, setParams] = useState('');
  const [errParams, setErrParams] = useState('');
  useEffect(() => {
    setParams(JSON.stringify(e?.params ?? {}, null, 1));
    setErrParams('');
  }, [id, e?.params]);
  if (!e) return null;
  const r = l.escenas.find((x) => x.id === id)!;
  const fps = l.fps;
  const ed = (campo: string, fn: (x: Draft<TEscena>) => void) => editar(`esc:${id}:${campo}`, (d) => fn(d.escenas.find((x) => x.id === id)!));
  const plantilla = PLANTILLAS.find((x: any) => x.id === e.plantilla);
  const local = frame - r.origen;
  const rolesFaltan = (plantilla?.roles ?? []).filter((ro: string) => !e.tomas.some((t) => t.rol === ro));
  return (
    <>
      <Cab tipo="Escena" tit={e.nombre || e.id}>
        <button className="btn chico" onClick={() => irA(r.inicio)} title="Ir al inicio">
          Ir
        </button>
      </Cab>
      <Sec t="Básico" p="Vídeo" sp="Básico">
        <Campo et="Nombre">
          <Texto v={e.nombre} on={(v) => ed('nombre', (x) => void (x.nombre = v))} prueba="esc-nombre" />
        </Campo>
        <Campo et="Plantilla">
          <select value={e.plantilla} onChange={(ev) => ed('plantilla', (x) => void (x.plantilla = ev.target.value))}>
            {!plantilla && <option value={e.plantilla}>⚠ {e.plantilla}</option>}
            <optgroup label="Genéricas">
              {PLANTILLAS.filter((x: any) => x.generica).map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </optgroup>
            <optgroup label="Del proyecto">
              {PLANTILLAS.filter((x: any) => !x.generica).map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </optgroup>
          </select>
        </Campo>
        <Campo et="Duración" title="Fotogramas en la pista principal (las siguientes escenas se desplazan)">
          <div className="fila">
            <Num v={e.duracion} on={(n) => ed('duracion', (x) => void (x.duracion = Math.max(1, Math.round(n))))} min={1} suf="f" prueba="esc-duracion" ancho={70} />
            <span style={{ color: 'var(--tenue)' }}>{(e.duracion / fps).toFixed(2)} s</span>
          </div>
        </Campo>
        <Campo et="Entrada (in)" title="Fotogramas recortados al principio">
          <Num v={e.recorte} on={(n) => ed('recorte', (x) => void (x.recorte = Math.max(0, Math.round(n))))} min={0} suf="f" ancho={70} />
        </Campo>
        <Campo et="Frase de voz" title="Frase con la que se sincroniza (palabras ancla)">
          <select value={e.frase ?? ''} onChange={(ev) => ed('frase', (x) => void (x.frase = ev.target.value || null))}>
            <option value="">(ninguna)</option>
            {p.voz.frases.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} · {f.texto.slice(0, 32)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo et="Fondo">
          <div>
            <Segmentos v={e.fondo ?? ''} ops={TONOS} on={(v) => ed('fondo', (x) => void (x.fondo = v))} />
            <div style={{ marginTop: 6 }}>
              <ColorP v={e.fondo} on={(v) => ed('fondo', (x) => void (x.fondo = v))} ninguno />
            </div>
          </div>
        </Campo>
        <Campo et="Dispositivo">
          <Si v={e.marco} on={(v) => ed('marco', (x) => void (x.marco = v))} et="Marco de teléfono / navegador" prueba="esc-marco" />
        </Campo>
      </Sec>

      <Sec t="Transición de entrada" p="Animación">
        <select value={e.transicion.tipo} onChange={(ev) => ed('trans', (x) => ponerTransicion(x as any, ev.target.value, l.fps))} data-prueba="esc-trans">
          {[...new Set(TRANSICIONES_INFO.map((t) => t.cat))].map((c) => (
            <optgroup key={c} label={c}>
              {TRANSICIONES_INFO.filter((t) => t.cat === c).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div style={{ height: 8 }} />
        <Campo et="Duración">
          <Deslizador v={e.transicion.duracion} min={0} max={45} on={(n) => ed('trans-dur', (x) => void (x.transicion.duracion = Math.round(n)))} suf="f" />
        </Campo>
        {e.transicion.tipo === 'circulo' && (
          <Campo et="Origen">
            <div className="fila">
              <Num v={e.transicion.ox ?? 540} on={(n) => ed('trans-ox', (x) => void (x.transicion.ox = n))} suf="x" ancho={60} />
              <Num v={e.transicion.oy ?? 960} on={(n) => ed('trans-oy', (x) => void (x.transicion.oy = n))} suf="y" ancho={60} />
            </div>
          </Campo>
        )}
      </Sec>

      <Sec
        p="Vídeo"
        sp="Tomas"
        t="Tomas (vídeo / imagen)"
        extra={
          rolesFaltan.length > 0 || !e.tomas.length ? (
            <button className="btn chico" onClick={() => ed('tomas+', (x) => void x.tomas.push({ rol: rolesFaltan[0] ?? 'principal', src: '', t0: 0, velocidad: 1, suave: 'lin' } as any))}>
              + Toma
            </button>
          ) : null
        }
      >
        {!e.tomas.length && <div className="ayuda">Esta plantilla no usa tomas (o las define en sus parámetros).</div>}
        {e.tomas.map((t, k) => (
          <div key={k} style={{ borderTop: k ? '1px solid var(--borde)' : undefined, paddingTop: k ? 10 : 0, marginTop: k ? 6 : 0 }}>
            <div className="fila" style={{ marginBottom: 6 }}>
              <span className="chip">{t.rol}</span>
              <span className="esp" />
              <button className="btn chico icono" title="Quitar toma" onClick={() => ed('tomas-', (x) => void x.tomas.splice(k, 1))}>
                <Ico n="cerrar" />
              </button>
            </div>
            <Campo et="Archivo">
              <SelMedio v={t.src} on={(v) => ed(`toma${k}-src`, (x) => void (x.tomas[k].src = v))} tipos={['video', 'imagen']} carpeta="footage" prueba={`toma-src-${k}`} />
            </Campo>
            {t.curva ? (
              <Campo et="Tiempo">
                <div className="fila">
                  <span className="chip ancla">curva de {t.curva.length} puntos</span>
                  <button className="btn chico" onClick={() => ed(`toma${k}-curva`, (x) => void ((x.tomas[k].t0 = t.curva![0][1]), delete x.tomas[k].curva))}>
                    Quitar curva
                  </button>
                </div>
              </Campo>
            ) : (
              <>
                <Campo et="Inicio" title="Segundo de la toma cuando empieza la voz de la escena">
                  <Num v={t.t0} on={(n) => ed(`toma${k}-t0`, (x) => void (x.tomas[k].t0 = n))} paso={0.05} suf="s" />
                </Campo>
                <Campo et="Velocidad">
                  <Deslizador v={t.velocidad} min={0.1} max={4} paso={0.05} on={(n) => ed(`toma${k}-vel`, (x) => void (x.tomas[k].velocidad = n))} suf="×" />
                </Campo>
              </>
            )}
            <Campo et="Entrada / salida" title="Límites (segundos de la toma)">
              <div className="fila">
                <Num v={t.desde} on={(n) => ed(`toma${k}-in`, (x) => void (x.tomas[k].desde = n))} paso={0.05} vacio="in" ancho={60} />
                <Num v={t.hasta} on={(n) => ed(`toma${k}-out`, (x) => void (x.tomas[k].hasta = n))} paso={0.05} vacio="out" ancho={60} />
                {(t.desde != null || t.hasta != null) && (
                  <button className="btn chico icono" title="Quitar límites" onClick={() => ed(`toma${k}-lim`, (x) => void (delete x.tomas[k].desde, delete x.tomas[k].hasta))}>
                    <Ico n="cerrar" />
                  </button>
                )}
              </div>
            </Campo>
            {!t.curva && (
              <Campo et="Rampa" title="Cambia la velocidad a lo largo de la escena (nunca por debajo de 1×)">
                <div className="fila" style={{ gap: 4 }}>
                  {(['acelerar', 'frenar', 'impulso'] as const).map((tp) => (
                    <button
                      key={tp}
                      className="btn chico"
                      data-prueba={`rampa-${tp}`}
                      onClick={() =>
                        ed(`toma${k}-rampa`, (x) => {
                          const s0 = (x.recorte - r.pre) / fps;
                          const s1 = (x.recorte + x.duracion - r.pre) / fps;
                          x.tomas[k].curva = rampa(x.tomas[k] as any, tp, s0, s1);
                          x.tomas[k].suave = 'lin';
                        })
                      }
                    >
                      {{ acelerar: 'Acelerar', frenar: 'Frenar', impulso: 'Impulso' }[tp]}
                    </button>
                  ))}
                </div>
              </Campo>
            )}
          </div>
        ))}
      </Sec>

      <Sec t="Posición y tamaño" p="Animación">
        <PanelTransformar e={e} ed={ed} local={local} />
      </Sec>
      <Sec t="Cámara y movimiento" p="Animación">
        <PanelCamara e={e} ed={ed} local={local} fps={fps} />
      </Sec>

      <SeccionesLook e={e} ed={ed} />
      <Sec t="Luz y desenfoque" p="Ajuste">
        <PanelEfectos e={e} ed={ed} />
      </Sec>

      <Sec
        p="Ajuste"
        t={`Textos (${e.textos.length})`}
        extra={
          <button
            className="btn chico"
            onClick={() => {
              const tid = nid('t');
              ed('textos+', (x) => void x.textos.push({ id: tid, tipo: 'titulo', texto: 'Nuevo *texto*.', desde: Math.max(0, local), hasta: null, x: 60, y: 250, w: 960, tam: 96, color: 'bone', acento: 'acid', alinear: 'center', animacion: 'mascara', escalonado: 2.5, brillo: 0 }));
              useEd.setState({ sel: { tipo: 'texto', escena: id, id: tid } });
            }}
          >
            + Texto
          </button>
        }
      >
        {e.textos.map((t) => (
          <div key={t.id} className="item" style={{ margin: '4px 0' }} onClick={() => useEd.setState({ sel: { tipo: 'texto', escena: id, id: t.id } })}>
            <div className="ic" style={{ width: 26, height: 26, fontSize: 13 }}>
              {t.tipo === 'nota' ? '•' : 'T'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.texto.replace(/\*/g, '')}
              </div>
              <div className="d">
                {t.animacion} · {t.tam}px{t.grupo ? ` · capa ${t.grupo}` : ''}
              </div>
            </div>
          </div>
        ))}
      </Sec>

      {plantilla?.campos?.length ? (
        <Sec t={`Contenido · ${plantilla.nombre}`} p="Vídeo" sp="Plantilla">
          <PanelCampos escena={id} campos={plantilla.campos} params={e.params} />
        </Sec>
      ) : null}
      <Sec t={plantilla?.campos?.length ? 'Parámetros (avanzado, JSON)' : 'Parámetros de la plantilla'} p="Ajuste">
        <div className="ayuda">{plantilla?.descripcion ?? 'Plantilla no registrada en el proyecto.'}</div>
        <textarea
          value={params}
          rows={6}
          style={{ fontFamily: 'Consolas, monospace', fontSize: 11.5 }}
          onChange={(ev) => {
            setParams(ev.target.value);
            try {
              const v = JSON.parse(ev.target.value);
              if (typeof v !== 'object' || Array.isArray(v) || v == null) throw new Error('Debe ser un objeto { … }');
              setErrParams('');
              ed('params', (x) => void (x.params = v));
            } catch (err: any) {
              setErrParams(err.message);
            }
          }}
        />
        {errParams && <div className="chip error">JSON: {errParams}</div>}
      </Sec>
    </>
  );
};

// ——— Texto ———

const PanelTexto: React.FC<{ esc: string; id: string }> = ({ esc, id }) => {
  const e = useEsc(esc);
  const editar = useEd((s) => s.editar);
  const l = useEd((s) => s.linea)!;
  const t = e?.textos.find((x) => x.id === id);
  if (!e || !t) return null;
  const r = l.escenas.find((x) => x.id === esc)!;
  const ed = (campo: string, fn: (x: Draft<TTexto>) => void) => editar(`txt:${esc}:${id}:${campo}`, (d) => fn(d.escenas.find((x) => x.id === esc)!.textos.find((x) => x.id === id)!));
  const ir = () => irA(r.origen + tiempoLocal(t.desde, r.pre, l.fps, r.frase) + 18);
  return (
    <>
      <Cab tipo={`Texto · ${e.nombre || e.id}`} tit={t.texto.replace(/\*/g, '')}>
        <button className="btn chico" onClick={ir} title="Ver en el visor">
          Ver
        </button>
      </Cab>
      <Solo p="Texto">
        <AccionesEstilo t={t} />
      </Solo>
      <Sec t="Contenido" p="Texto">
        <Texto v={t.texto} on={(v) => ed('texto', (x) => void (x.texto = v))} area prueba="texto-contenido" />
        <div className="ayuda">« / » = salto de línea · *palabra* = acento (serif cursiva, color de acento)</div>
        <Campo et="Tipo">
          <Segmentos
            v={t.tipo}
            ops={[
              ['titulo', 'Titular'],
              ['nota', 'Nota'],
            ]}
            on={(v) => ed('tipo', (x) => void (x.tipo = v as any))}
          />
        </Campo>
      </Sec>
      <Sec t="Estilo" p="Texto">
        <Campo et="Fuente">
          <div className="fila" style={{ gap: 4 }}>
            <button className="btn chico boton-fuente" style={{ flex: 1, fontFamily: t.fuente ? `"${(FUENTES as any)[t.fuente] ?? t.fuente}", sans-serif` : undefined }} onClick={() => useEd.setState({ dialogo: 'fuentes' })} data-prueba="texto-fuente" title="Elegir tipografía (T)">
              {t.fuente ?? (t.tipo === 'nota' ? 'Mono (por defecto)' : 'Sans (por defecto)')}
              <Ico n="abajo" s={13} style={{ marginLeft: 'auto' }} />
            </button>
            {t.fuente && (
              <button className="btn-r" title="Tipografía por defecto" onClick={() => ed('fuente', (x) => void delete x.fuente)}>
                <Ico n="reiniciar" s={13} />
              </button>
            )}
          </div>
        </Campo>
        <Campo et="Tamaño">
          <Deslizador v={t.tam} min={12} max={300} on={(n) => ed('tam', (x) => void (x.tam = n))} suf="px" prueba="texto-tam" />
        </Campo>
        <Campo et="Color">
          <ColorP v={t.color} on={(v) => ed('color', (x) => void (x.color = v ?? 'ink'))} />
        </Campo>
        {t.tipo === 'titulo' ? (
          <Campo et="Acento">
            <ColorP v={t.acento} on={(v) => ed('acento', (x) => void (v ? (x.acento = v) : delete x.acento))} ninguno />
          </Campo>
        ) : (
          <Campo et="Punto">
            <ColorP v={t.punto} on={(v) => ed('punto', (x) => void (v ? (x.punto = v) : delete x.punto))} ninguno />
          </Campo>
        )}
        <Campo et="Resplandor">
          <Deslizador v={t.brillo ?? 0} min={0} max={1} paso={0.05} on={(n) => ed('brillo', (x) => void (x.brillo = n))} prueba="texto-brillo" />
        </Campo>
        <Campo et="Alinear">
          <Segmentos
            v={t.alinear}
            ops={[
              ['left', 'Izq.'],
              ['center', 'Centro'],
              ['right', 'Der.'],
            ]}
            on={(v) => ed('alinear', (x) => void (x.alinear = v as any))}
          />
        </Campo>
      </Sec>
      <SeccionesEstilo t={t} ed={ed} />
      <Sec t="Posición" p="Texto">
        <Campo et="X / Y">
          <div className="fila">
            <Num v={t.x} on={(n) => ed('x', (x) => void (x.x = n))} suf="x" ancho={64} />
            <Num v={t.y} on={(n) => ed('y', (x) => void (x.y = n))} suf="y" ancho={64} prueba="texto-y" />
          </div>
        </Campo>
        <Campo et="Ancho">
          <Num v={t.w} on={(n) => ed('w', (x) => void (x.w = n))} suf="px" />
        </Campo>
        <div className="fila" style={{ flexWrap: 'wrap', gap: 4 }}>
          {[
            ['Arriba', 250],
            ['Centro', 860],
            ['Abajo', 1180],
          ].map(([n, y]) => (
            <button key={n} className="btn chico" onClick={() => ed('y', (x) => void ((x.y = y as number), (x.x = 60), (x.w = 960), (x.alinear = 'center')))}>
              {n}
            </button>
          ))}
        </div>
      </Sec>
      <SeccionAnimacion t={t} ed={ed} />
      <Sec t="Seguir movimiento" p="Animación">
        <SeccionSeguir tipo="texto" escena={esc} id={id} claves={t.seguir?.length ?? 0} />
      </Sec>
      <Sec t="Tiempo" p="Animación">
        <Campo et="Entra">
          <Instante v={t.desde} on={(v) => ed('desde', (x) => void (x.desde = v ?? 0))} escId={esc} prueba="texto-desde" />
        </Campo>
        <Campo et="Sale">
          <Instante v={t.hasta} on={(v) => ed('hasta', (x) => void (x.hasta = v))} escId={esc} permitirNulo />
        </Campo>
        {t.tipo === 'titulo' && (
          <>
            <Si v={!!t.sincroVoz} on={(v) => ed('sincro', (x) => void (v ? ((x.sincroVoz = { desfase: -2 }), delete x.tiempos) : delete x.sincroVoz))} et="Cada palabra entra con la voz" />
            {t.tiempos && (
              <div className="fila" style={{ marginTop: 6 }}>
                <span className="chip ancla">tiempos por palabra ({t.tiempos.length})</span>
                <button className="btn chico" onClick={() => ed('tiempos', (x) => void delete x.tiempos)}>
                  Quitar
                </button>
              </div>
            )}
          </>
        )}
        <div className="ayuda">Fotogramas locales de la escena (0 = su inicio{e.recorte ? `; recorte ${e.recorte} f` : ''}). En la línea de tiempo se arrastra el clip o sus bordes.</div>
      </Sec>
    </>
  );
};

// ——— Frase de voz ———

const PanelFrase: React.FC<{ id: string }> = ({ id }) => {
  const f = useEd((s) => s.proyecto?.voz.frases.find((x) => x.id === id));
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const voces = useEd((s) => s.voces);
  const trabajos = useEd((s) => s.trabajos);
  const editar = useEd((s) => s.editar);
  const [ajustar, setAjustar] = useState(true);
  if (!f) return null;
  const fr = l.frases.find((x) => x.id === id);
  const ed = (campo: string, fn: (x: any) => void) => editar(`voz:${id}:${campo}`, (d) => fn(d.voz.frases.find((x) => x.id === id)!));
  const tr = trabajoDeFrase(id, trabajos);
  const corriendo = tr?.estado === 'corriendo';
  const dicho = f.palabras.map((w) => w.p).join(' ');
  const cambiado = dicho.replace(/\s+/g, ' ').trim() !== f.texto.replace(/\s+/g, ' ').trim();
  return (
    <>
      <Cab tipo="Voz" tit={f.id}>
        {fr && (
          <button className="btn chico" onClick={() => irA(fr.inicio)}>
            Ir
          </button>
        )}
      </Cab>
      <Sec t="Frase" p="Voz">
        <Texto v={f.texto} on={(v) => ed('texto', (x) => void (x.texto = v))} area prueba="frase-texto" />
        {cambiado && <div className="chip aviso" style={{ marginTop: 6 }}>El texto cambió: regenera la voz para actualizar audio y subtítulos</div>}
        <Campo et="Pronunciación" col title="Opcional: cómo debe leerlo la voz (comas para respirar, palabras escritas a la española…)">
          <Texto v={f.dicho} on={(v) => ed('dicho', (x) => void (v ? (x.dicho = v) : delete x.dicho))} ph="(igual que el texto)" />
        </Campo>
        <Campo et="Voz">
          <select value={f.voz ?? ''} onChange={(e) => ed('voz', (x) => void (e.target.value ? (x.voz = e.target.value) : delete x.voz))} data-prueba="frase-voz">
            <option value="">Por defecto ({p.voz.voz || '—'})</option>
            {voces.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}
              </option>
            ))}
          </select>
        </Campo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <Si v={ajustar} on={setAjustar} et="Ajustar la duración de la escena a la nueva voz" />
          {corriendo ? (
            <div className="trabajo" style={{ boxShadow: 'none' }}>
              <div className="t1">
                <span>Generando voz…</span>
                <button className="btn chico" onClick={() => api.cancelar(tr!.id)} data-prueba="cancelar-voz">
                  Cancelar
                </button>
              </div>
              <div className="et">{tr!.etapa}</div>
              <div className="prog">
                <i style={{ width: `${Math.round(tr!.progreso * 100)}%` }} />
              </div>
            </div>
          ) : (
            <button className="btn prim" data-prueba="regenerar-voz" onClick={() => regenerar(id, ajustar)} disabled={!f.texto.trim()}>
              <Ico n="regenerar" /> Regenerar voz
            </button>
          )}
          {tr?.estado === 'error' && <div className="chip error">Falló: {tr.error?.slice(0, 160)}</div>}
          <BotonMejorarVoz id={id} />
        </div>
      </Sec>
      <Sec t="Mezcla y posición" p="Mezcla">
        <Campo et="Volumen">
          <Deslizador v={f.volumen} min={0} max={2} paso={0.05} on={(n) => ed('vol', (x) => void (x.volumen = n))} />
        </Campo>
        <Campo et="Escena">
          <select value={f.escena} onChange={(e) => ed('escena', (x) => void (x.escena = e.target.value))}>
            {p.escenas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre || e.id}
              </option>
            ))}
          </select>
        </Campo>
        <Campo et="Desfase" title="Fotogramas desde el inicio de la escena">
          <Num v={f.offset} on={(n) => ed('offset', (x) => void (x.offset = Math.round(n)))} suf="f" />
        </Campo>
        <Si v={f.subtitulos} on={(v) => ed('subs', (x) => void (x.subtitulos = v))} et="Mostrar en subtítulos" />
      </Sec>
      <Sec t={`Palabras (${f.palabras.length}) · ${f.duracion.toFixed(2)} s`} p="Mezcla">
        <div className="palabras">
          {f.palabras.map((w, i) => (
            <span key={i} onClick={() => fr && irA(fr.inicio + Math.round(w.ini * l.fps))} title="Ir a la palabra">
              {w.p}
              <small>{w.ini.toFixed(2)}</small>
            </span>
          ))}
        </div>
        <div className="ayuda" style={{ marginTop: 8 }}>
          Archivo: {f.archivo}
        </div>
      </Sec>
      {f.tomas.length > 0 && (
        <Sec t={`Tomas anteriores (${f.tomas.length})`} p="Voz">
          {f.tomas.map((t, k) => (
            <div key={k} className="fila" style={{ marginBottom: 6 }}>
              <audio src={`/${t.archivo}`} controls style={{ height: 28, width: 150 }} preload="none" />
              <span style={{ flex: 1, fontSize: 11, color: 'var(--tenue)' }}>
                {t.duracion.toFixed(2)} s · {t.texto.slice(0, 24)}
              </span>
              <button
                className="btn chico"
                onClick={() =>
                  ed('toma', (x) => {
                    const actual = { archivo: x.archivo, duracion: x.duracion, palabras: x.palabras, texto: x.palabras.map((w: any) => w.p).join(' '), fecha: new Date().toISOString() };
                    const tt = x.tomas[k];
                    x.archivo = tt.archivo;
                    x.duracion = tt.duracion;
                    x.palabras = tt.palabras;
                    x.tomas.splice(k, 1, actual);
                  })
                }
              >
                Usar
              </button>
            </div>
          ))}
        </Sec>
      )}
    </>
  );
};

// ——— SFX ———

const PanelSfx: React.FC<{ id: string }> = ({ id }) => {
  const s = useEd((x) => x.proyecto?.sfx.find((y) => y.id === id));
  const p = useEd((x) => x.proyecto)!;
  const editar = useEd((x) => x.editar);
  if (!s) return null;
  const ed = (c: string, fn: (x: any) => void) => editar(`sfx:${id}:${c}`, (d) => fn(d.sfx.find((y) => y.id === id)!));
  return (
    <>
      <Cab tipo="Efecto de sonido" tit={s.id} />
      <Sec t="Efecto">
        <Campo et="Archivo">
          <SelMedio v={s.src} on={(v) => ed('src', (x) => void (x.src = v))} tipos={['audio']} carpeta="audio" />
        </Campo>
        <Campo et="Volumen">
          <Deslizador v={s.volumen} min={0} max={1.5} paso={0.02} on={(n) => ed('vol', (x) => void (x.volumen = n))} />
        </Campo>
        <Campo et="Duración">
          <Num v={s.duracion} on={(n) => ed('dur', (x) => void (x.duracion = Math.max(1, Math.round(n))))} suf="f" min={1} />
        </Campo>
      </Sec>
      <Sec t="Posición">
        <Campo et="Escena">
          <select value={s.escena} onChange={(e) => ed('esc', (x) => void (x.escena = e.target.value))}>
            {p.escenas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre || e.id}
              </option>
            ))}
          </select>
        </Campo>
        {s.ancla && (
          <Campo et="Ancla">
            <div className="fila">
              <span className="chip ancla">
                ⚓ «{s.ancla.palabra}» {s.ancla.seg ? `${s.ancla.seg > 0 ? '+' : ''}${s.ancla.seg}s` : ''}
              </span>
              <button className="btn chico" onClick={() => useEd.getState().avisar('Para desanclar, arrastra el efecto: el ancla se conserva y se suma el desplazamiento')}>
                ?
              </button>
            </div>
          </Campo>
        )}
        <Campo et="Desfase">
          <Num v={s.offset} on={(n) => ed('off', (x) => void (x.offset = Math.round(n)))} suf="f" />
        </Campo>
      </Sec>
    </>
  );
};

// ——— Música ———

const PanelMusica: React.FC = () => {
  const m = useEd((x) => x.proyecto!.musica);
  const editar = useEd((x) => x.editar);
  const ed = (c: string, fn: (x: Draft<TProyecto['musica']>) => void) => editar(`mus:${c}`, (d) => fn(d.musica));
  return (
    <>
      <Cab tipo="Música" tit={m.src ?? 'Sin música'} />
      <Sec t="Pista" p="Música">
        <Campo et="Archivo">
          <SelMedio v={m.src} on={(v) => ed('src', (x) => void (x.src = v || null))} tipos={['audio']} carpeta="audio" vacio="(sin música)" />
        </Campo>
        <Campo et="Empieza en" title="Segundo de la pista en que empieza el vídeo">
          <Num v={m.inicio} on={(n) => ed('ini', (x) => void (x.inicio = Math.max(0, n)))} paso={0.1} suf="s" />
        </Campo>
        <Campo et="Volumen">
          <Deslizador v={m.volumen} min={0} max={1.5} paso={0.01} on={(n) => ed('vol', (x) => void (x.volumen = n))} prueba="musica-vol" />
        </Campo>
      </Sec>
      <Solo p="Mezcla">
        <SeccionMezcla />
      </Solo>
      <Solo p="Ritmo">
        <SeccionRitmo />
      </Solo>
      <Sec t="Ducking (baja bajo la voz)" p="Música" toggle={{ v: m.ducking, on: (v) => ed('duck', (x) => void (x.ducking = v)) }}>
        <Si v={m.ducking} on={(v) => ed('duck', (x) => void (x.ducking = v))} et="Activado" />
        <div style={{ height: 8 }} />
        <Campo et="Bajo la voz">
          <Deslizador v={m.volumenVoz} min={0} max={1.5} paso={0.01} on={(n) => ed('vv', (x) => void (x.volumenVoz = n))} />
        </Campo>
        <Campo et="Antes / después">
          <div className="fila">
            <Num v={m.antes} on={(n) => ed('antes', (x) => void (x.antes = n))} suf="f" ancho={52} />
            <Num v={m.despues} on={(n) => ed('desp', (x) => void (x.despues = n))} suf="f" ancho={52} />
          </div>
        </Campo>
        <Campo et="Rampa">
          <Num v={m.rampa} on={(n) => ed('rampa', (x) => void (x.rampa = Math.max(1, n)))} suf="f" />
        </Campo>
      </Sec>
      <Sec t="Fundidos" p="Música">
        <Campo et="Entrada">
          <Num v={m.fadeIn} on={(n) => ed('fi', (x) => void (x.fadeIn = Math.max(0, n)))} suf="f" />
        </Campo>
        <Campo et="Salida">
          <Num v={m.fadeOut} on={(n) => ed('fo', (x) => void (x.fadeOut = Math.max(0, n)))} suf="f" />
        </Campo>
      </Sec>
    </>
  );
};

// ——— Proyecto (global) ———

const PanelProyecto: React.FC = () => {
  const p = useEd((x) => x.proyecto)!;
  const medios = useEd((x) => x.medios);
  const editar = useEd((x) => x.editar);
  const [nueva, setNueva] = useState('');
  const a = p.ajustes;
  const ed = (c: string, fn: (x: Draft<TProyecto['ajustes']>) => void) => editar(`aj:${c}`, (d) => fn(d.ajustes));
  const falt = useMemo(() => faltantes(p, medios), [p, medios]);
  return (
    <>
      <Cab tipo="Proyecto" tit={p.nombre} />
      {falt.length > 0 && (
        <Sec t="Medios que faltan" p="Proyecto">
          {falt.map((f) => (
            <div key={f} className="chip error" style={{ margin: '0 4px 4px 0' }}>
              {f}
            </div>
          ))}
          <div className="ayuda">Se ven como un recuadro rojo en el visor. Sube el archivo o elige otro en la escena.</div>
        </Sec>
      )}
      <Solo p="Marca">
        <PanelMarca />
      </Solo>
      <Sec t="Sitio" p="Proyecto">
        <Campo et="SITE_URL">
          <Texto v={a.siteUrl} on={(v) => ed('url', (x) => void (x.siteUrl = v))} prueba="site-url" />
        </Campo>
        <Campo et="WhatsApp">
          <Texto v={a.whatsapp} on={(v) => ed('wa', (x) => void (x.whatsapp = v))} />
        </Campo>
        <Campo et="Texto legal">
          <Texto v={a.legal} on={(v) => ed('legal', (x) => void (x.legal = v))} />
        </Campo>
      </Sec>
      <Sec t="Paleta" p="Proyecto">
        {Object.entries(a.paleta).map(([k, c]) => (
          <div key={k} className="fila" style={{ marginBottom: 5 }}>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(c) ? c : '#000000'} onChange={(e) => ed(`pal-${k}`, (x) => void (x.paleta[k] = e.target.value))} data-prueba={`paleta-${k}`} />
            <span style={{ width: 70 }}>{k}</span>
            <input type="text" value={c} onChange={(e) => ed(`pal-${k}`, (x) => void (x.paleta[k] = e.target.value))} style={{ fontFamily: 'Consolas, monospace' }} />
            <button className="btn chico icono" title="Quitar" onClick={() => ed('pal-', (x) => void delete x.paleta[k])}>
              <Ico n="cerrar" />
            </button>
          </div>
        ))}
        <div className="fila">
          <input type="text" placeholder="nuevo color (clave)" value={nueva} onChange={(e) => setNueva(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} />
          <button className="btn chico" disabled={!nueva || nueva in a.paleta} onClick={() => (ed('pal+', (x) => void (x.paleta[nueva] = '#888888')), setNueva(''))}>
            Añadir
          </button>
        </div>
      </Sec>
      <Sec t="Lienzo" p="Proyecto">
        <Campo et="Fondo">
          <ColorP v={a.fondo} on={(v) => ed('fondo', (x) => void (x.fondo = v ?? '#0A0A0C'))} />
        </Campo>
        <Campo et="Viñeta">
          <Deslizador v={a.vineta} min={0} max={0.8} paso={0.01} on={(n) => ed('vin', (x) => void (x.vineta = n))} />
        </Campo>
        <Campo et="Grano">
          <Deslizador v={a.grano} min={0} max={0.3} paso={0.01} on={(n) => ed('grano', (x) => void (x.grano = n))} />
        </Campo>
        <Campo et="Zonas seguras" title="px arriba / abajo que tapa la interfaz de Reels/TikTok">
          <div className="fila">
            <Num v={a.zonas.arriba} on={(n) => ed('za', (x) => void (x.zonas.arriba = n))} suf="↑" ancho={58} />
            <Num v={a.zonas.abajo} on={(n) => ed('zb', (x) => void (x.zonas.abajo = n))} suf="↓" ancho={58} />
          </div>
        </Campo>
        <Campo et="Tamaño / fps">
          <span style={{ color: 'var(--suave)' }}>
            {a.ancho} × {a.alto} · {a.fps} fps
          </span>
        </Campo>
      </Sec>
    </>
  );
};

const PanelTransicion: React.FC<{ id: string }> = ({ id }) => {
  const e = useEsc(id);
  const editar = useEd((s) => s.editar);
  if (!e) return null;
  const ed = (fn: (x: Draft<TEscena>) => void) => editar(`trans:${id}`, (d) => fn(d.escenas.find((x) => x.id === id)!));
  return (
    <>
      <Cab tipo="Transición de entrada" tit={`→ ${e.nombre || e.id}`} />
      <Sec t="Tipo">
        <select value={e.transicion.tipo} onChange={(ev) => ed((x) => ponerTransicion(x as any, ev.target.value, useEd.getState().linea!.fps))} data-prueba="trans-tipo">
          {TRANSICIONES_INFO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.cat} · {t.nombre}
            </option>
          ))}
        </select>
        <div style={{ height: 10 }} />
        <Campo et="Duración">
          <Deslizador v={e.transicion.duracion} min={0} max={45} on={(n) => ed((x) => void (x.transicion.duracion = Math.round(n)))} suf="f" />
        </Campo>
        <div className="ayuda">La escena entra por encima de la anterior; la anterior se alarga lo que dure la transición.</div>
      </Sec>
    </>
  );
};


// ——— Estilo avanzado del texto (contorno, sombra, fondo, degradado, tipografía) ———

const SeccionesEstilo: React.FC<{ t: TTexto; ed: (campo: string, fn: (x: Draft<TTexto>) => void) => void }> = ({ t, ed }) => {
  const e = t.estilo ?? {};
  const est = (campo: string, fn: (x: NonNullable<TTexto['estilo']>) => void) =>
    ed(`estilo-${campo}`, (x) => {
      x.estilo ??= {};
      fn(x.estilo as any);
      if (!Object.keys(x.estilo).length) delete x.estilo;
    });
  const quitar = (k: keyof NonNullable<TTexto['estilo']>) => () => est(`${String(k)}-0`, (x) => void delete (x as any)[k]);
  return (
    <>
      <Sec t="Contorno" p="Texto" toggle={{ v: !!e.trazo, on: (v) => est('trazo', (x) => void (v ? (x.trazo = { color: '#0a0a0c', ancho: 6 }) : delete x.trazo)) }} reset={e.trazo ? quitar('trazo') : undefined}>
        {e.trazo && (
          <>
            <Campo et="Color">
              <ColorP v={e.trazo.color} on={(v) => est('trazo-c', (x) => void (x.trazo = { ...x.trazo!, color: v ?? '#000' }))} />
            </Campo>
            <Campo et="Grosor">
              <Deslizador v={e.trazo.ancho} min={1} max={30} on={(n) => est('trazo-a', (x) => void (x.trazo = { ...x.trazo!, ancho: n }))} suf="px" prueba="trazo-ancho" />
            </Campo>
          </>
        )}
      </Sec>
      <Sec t="Sombra" p="Texto" toggle={{ v: !!e.sombra, on: (v) => est('sombra', (x) => void (v ? (x.sombra = { color: 'rgba(0,0,0,.6)', x: 0, y: 6, blur: 18 }) : delete x.sombra)) }} reset={e.sombra ? quitar('sombra') : undefined}>
        {e.sombra && (
          <>
            <Campo et="Color">
              <ColorP v={e.sombra.color} on={(v) => est('sombra-c', (x) => void (x.sombra = { ...x.sombra!, color: v ?? '#000' }))} />
            </Campo>
            <Campo et="Desenfoque">
              <Deslizador v={e.sombra.blur} min={0} max={60} on={(n) => est('sombra-b', (x) => void (x.sombra = { ...x.sombra!, blur: n }))} suf="px" />
            </Campo>
            <Campo et="Desplazamiento">
              <div className="fila">
                <Num v={e.sombra.x} on={(n) => est('sombra-x', (x) => void (x.sombra = { ...x.sombra!, x: n }))} suf="x" ancho={56} />
                <Num v={e.sombra.y} on={(n) => est('sombra-y', (x) => void (x.sombra = { ...x.sombra!, y: n }))} suf="y" ancho={56} />
              </div>
            </Campo>
          </>
        )}
      </Sec>
      <Sec t="Fondo" p="Texto" toggle={{ v: !!e.fondo, on: (v) => est('fondo', (x) => void (v ? (x.fondo = { color: 'acid', radio: 12, pad: 0.22, tipo: 'caja' }) : delete x.fondo)) }} reset={e.fondo ? quitar('fondo') : undefined}>
        {e.fondo && (
          <>
            <Campo et="Forma">
              <Segmentos
                v={e.fondo.tipo}
                ops={[
                  ['caja', 'Caja'],
                  ['burbuja', 'Burbuja'],
                  ['cinta', 'Cinta'],
                  ['subrayado', 'Subrayado'],
                  ['marco', 'Marco'],
                ]}
                on={(v) => est('fondo-t', (x) => void (x.fondo = { ...x.fondo!, tipo: v as any }))}
                prueba="fondo-tipo"
              />
            </Campo>
            <Campo et="Color">
              <ColorP v={e.fondo.color} on={(v) => est('fondo-c', (x) => void (x.fondo = { ...x.fondo!, color: v ?? 'acid' }))} />
            </Campo>
            <Campo et="Esquinas">
              <Deslizador v={e.fondo.radio} min={0} max={80} on={(n) => est('fondo-r', (x) => void (x.fondo = { ...x.fondo!, radio: n }))} suf="px" />
            </Campo>
            <Campo et="Margen">
              <Deslizador v={e.fondo.pad} min={0} max={0.8} paso={0.02} on={(n) => est('fondo-p', (x) => void (x.fondo = { ...x.fondo!, pad: n }))} />
            </Campo>
          </>
        )}
      </Sec>
      <Sec t="Degradado" p="Texto" toggle={{ v: !!e.degradado, on: (v) => est('degr', (x) => void (v ? (x.degradado = { de: 'acid', a: 'violet', angulo: 90 }) : delete x.degradado)) }} reset={e.degradado ? quitar('degradado') : undefined}>
        {e.degradado && (
          <>
            <Campo et="De">
              <ColorP v={e.degradado.de} on={(v) => est('degr-de', (x) => void (x.degradado = { ...x.degradado!, de: v ?? '#fff' }))} />
            </Campo>
            <Campo et="A">
              <ColorP v={e.degradado.a} on={(v) => est('degr-a', (x) => void (x.degradado = { ...x.degradado!, a: v ?? '#fff' }))} />
            </Campo>
            <Campo et="Ángulo">
              <Deslizador v={e.degradado.angulo} min={0} max={360} on={(n) => est('degr-ang', (x) => void (x.degradado = { ...x.degradado!, angulo: n }))} suf="°" />
            </Campo>
          </>
        )}
      </Sec>
      <Sec
        t="Letra"
        p="Texto"
        reset={
          e.peso != null || e.espaciado != null || e.mayusculas || e.cursiva || e.brilloColor || t.rot
            ? () =>
                ed('letra-0', (x) => {
                  if (x.estilo) for (const k of ['peso', 'espaciado', 'mayusculas', 'cursiva', 'brilloColor'] as const) delete (x.estilo as any)[k];
                  delete x.rot;
                })
            : undefined
        }
      >
        <Campo et="Grosor">
          <Deslizador v={e.peso ?? 650} min={100} max={900} paso={50} on={(n) => est('peso', (x) => void (x.peso = n))} prueba="texto-peso" />
        </Campo>
        <Campo et="Espaciado">
          <Deslizador v={e.espaciado ?? -0.03} min={-0.1} max={0.4} paso={0.01} on={(n) => est('esp', (x) => void (x.espaciado = n))} suf="em" />
        </Campo>
        <Campo et="Giro">
          <Deslizador v={t.rot ?? 0} min={-180} max={180} on={(n) => ed('rot', (x) => void (n ? (x.rot = n) : delete x.rot))} suf="°" />
        </Campo>
        <div className="fila" style={{ gap: 14 }}>
          <Si v={!!e.mayusculas} on={(v) => est('may', (x) => void (v ? (x.mayusculas = true) : delete x.mayusculas))} et="Mayúsculas" />
          <Si v={!!e.cursiva} on={(v) => est('cur', (x) => void (v ? (x.cursiva = true) : delete x.cursiva))} et="Cursiva" />
        </div>
      </Sec>
    </>
  );
};

/** Copiar / pegar / a todos / guardar estilo. */
const AccionesEstilo: React.FC<{ t: TTexto }> = ({ t }) => (
  <div className="acciones-estilo">
    <button className="btn chico" onClick={copiarEstilo} title="Copiar estilo (Ctrl+Alt+C)" data-prueba="copiar-estilo">
      <Ico n="copiar" s={13} /> Copiar estilo
    </button>
    <button className="btn chico" onClick={pegarEstilo} title="Pegar estilo (Ctrl+Alt+V)" data-prueba="pegar-estilo">
      <Ico n="pegar" s={13} /> Pegar
    </button>
    <button className="btn chico" onClick={estiloEnTodos} title="Usar este estilo en todos los titulares (Ctrl+Alt+A)" data-prueba="estilo-todos">
      <Ico n="pincel" s={13} /> A todos
    </button>
    <button
      className="btn chico"
      title="Guardar como estilo en la galería («Mis estilos»)"
      data-prueba="guardar-estilo"
      onClick={async () => {
        const n = await pedirTexto('Guardar como estilo', 'Nombre del estilo', t.fuente ? `${t.fuente} propio` : 'Mi estilo');
        if (!n) return;
        await guardarComoEstilo(t, n);
        useEd.getState().avisar(`Estilo «${n}» guardado en «Mis estilos»`, 'ok');
      }}
    >
      <Ico n="estrella" s={13} /> Guardar
    </button>
  </div>
);

/** Entrada, salida y bucle del texto, con sus duraciones. */
const SeccionAnimacion: React.FC<{ t: TTexto; ed: (campo: string, fn: (x: Draft<TTexto>) => void) => void }> = ({ t, ed }) => (
  <Sec
    t="Animación"
    p="Animación"
    reset={() =>
      ed('anim-0', (x) => {
        x.animacion = 'mascara';
        delete x.salida;
        delete x.bucle;
        delete x.durEntrada;
        delete x.durSalida;
      })
    }
    extra={
      <button className="btn chico" onClick={() => abrirBiblioteca('texto', 'animaciones')} title="Ver todas con vista previa">
        Galería
      </button>
    }
  >
    <Campo et="Entrada">
      <select value={t.animacion} onChange={(ev) => ed('anim', (x) => void (x.animacion = ev.target.value))} data-prueba="texto-anim">
        {ANIM_ENTRADA.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
    </Campo>
    <Campo et="Duración">
      <Deslizador v={t.durEntrada ?? 0.5} min={0.1} max={2} paso={0.05} on={(n) => ed('dur-in', (x) => void (x.durEntrada = n))} suf="s" />
    </Campo>
    <Campo et="Salida">
      <select value={t.salida ?? ''} onChange={(ev) => ed('salida', (x) => void (ev.target.value ? (x.salida = ev.target.value) : delete x.salida))} data-prueba="texto-salida">
        <option value="">Sin salida (corte)</option>
        {ANIM_SALIDA.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
    </Campo>
    {t.salida && (
      <Campo et="Duración">
        <Deslizador v={t.durSalida ?? 0.4} min={0.1} max={2} paso={0.05} on={(n) => ed('dur-out', (x) => void (x.durSalida = n))} suf="s" />
      </Campo>
    )}
    <Campo et="Bucle">
      <select value={t.bucle ?? ''} onChange={(ev) => ed('bucle', (x) => void (ev.target.value ? (x.bucle = ev.target.value) : delete x.bucle))} data-prueba="texto-bucle">
        <option value="">Ninguno</option>
        {ANIM_BUCLE.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
    </Campo>
    {t.tipo === 'titulo' && (
      <Campo et="Escalonado" title="Fotogramas entre palabra y palabra">
        <Deslizador v={t.escalonado} min={0} max={12} paso={0.5} on={(n) => ed('escalonado', (x) => void (x.escalonado = n))} suf="f" />
      </Campo>
    )}
  </Sec>
);

// ——— Elemento (pegatina) ———
const PanelElemento: React.FC<{ esc: string; id: string }> = ({ esc, id }) => {
  const e = useEsc(esc);
  const editar = useEd((s) => s.editar);
  const l = useEd((s) => s.linea)!;
  const el = e?.elementos?.find((x) => x.id === id);
  if (!e || !el) return null;
  const info = ELEMENTOS_INFO.find((x) => x.id === el.tipo);
  const ed = (campo: string, fn: (x: Draft<TElemento>) => void) => editar(`el:${esc}:${id}:${campo}`, (d) => fn(d.escenas.find((x) => x.id === esc)!.elementos!.find((x) => x.id === id)!));
  const r = l.escenas.find((x) => x.id === esc)!;
  return (
    <>
      <Cab tipo={`Elemento · ${e.nombre || e.id}`} tit={info?.nombre ?? el.tipo}>
        <button className="btn chico" onClick={() => irA(r.origen + tiempoLocal(el.desde, r.pre, l.fps, r.frase) + 12)}>
          Ver
        </button>
      </Cab>
      <Sec t="Aspecto" p="Elemento" reset={() => ed('reset', (x) => void ((x.color = 'acid'), (x.color2 = 'ink'), (x.opacidad = 1), (x.rot = 0), info && ((x.w = info.w), (x.h = info.h))))}>
        <Campo et="Tipo">
          <select value={el.tipo} onChange={(ev) => ed('tipo', (x) => void (x.tipo = ev.target.value))}>
            {ELEMENTOS_INFO.map((x) => (
              <option key={x.id} value={x.id}>
                {x.cat} · {x.nombre}
              </option>
            ))}
          </select>
        </Campo>
        {(info?.texto != null || el.texto) && (
          <Campo et="Texto">
            <Texto v={el.texto} on={(v) => ed('texto', (x) => void (x.texto = v))} prueba="el-texto" ph="« | » separa título y subtítulo" />
          </Campo>
        )}
        <Campo et="Color">
          <ColorP v={el.color} on={(v) => ed('color', (x) => void (x.color = v ?? 'acid'))} />
        </Campo>
        <Campo et="Color 2">
          <ColorP v={el.color2} on={(v) => ed('color2', (x) => void (x.color2 = v ?? 'ink'))} />
        </Campo>
        <Campo et="Opacidad">
          <Deslizador v={el.opacidad} min={0} max={1} paso={0.05} on={(n) => ed('op', (x) => void (x.opacidad = n))} />
        </Campo>
      </Sec>
      <Sec t="Posición y tamaño" p="Elemento">
        <Campo et="X / Y">
          <div className="fila">
            <Num v={el.x} on={(n) => ed('x', (x) => void (x.x = n))} suf="x" ancho={60} />
            <Num v={el.y} on={(n) => ed('y', (x) => void (x.y = n))} suf="y" ancho={60} />
          </div>
        </Campo>
        <Campo et="Ancho / alto">
          <div className="fila">
            <Num v={el.w} on={(n) => ed('w', (x) => void (x.w = Math.max(4, n)))} suf="w" ancho={60} />
            <Num v={el.h} on={(n) => ed('h', (x) => void (x.h = Math.max(4, n)))} suf="h" ancho={60} />
          </div>
        </Campo>
        <Campo et="Giro">
          <Deslizador v={el.rot} min={-180} max={180} on={(n) => ed('rot', (x) => void (x.rot = n))} suf="°" />
        </Campo>
      </Sec>
      <Sec t="Seguir movimiento" p="Elemento">
        <SeccionSeguir tipo="elemento" escena={esc} id={id} claves={el.seguir?.length ?? 0} />
      </Sec>
      <Sec t="Tiempo" p="Elemento">
        <Campo et="Entrada">
          <Segmentos
            v={el.entrada}
            ops={[
              ['pop', 'Pop'],
              ['fundido', 'Fundido'],
              ['subir', 'Subir'],
              ['girar', 'Girar'],
              ['dibujar', 'Dibujar'],
              ['ninguna', 'No'],
            ]}
            on={(v) => ed('entrada', (x) => void (x.entrada = v))}
          />
        </Campo>
        <Campo et="Aparece">
          <Instante v={el.desde as TTiempo} on={(v) => ed('desde', (x) => void (x.desde = (v ?? 0) as any))} escId={esc} />
        </Campo>
        <Campo et="Se va">
          <Instante v={el.hasta as TTiempo | null} on={(v) => ed('hasta', (x) => void (x.hasta = v as any))} escId={esc} permitirNulo />
        </Campo>
      </Sec>
    </>
  );
};

// ——— Filtro y efectos de la escena ———
const SeccionesLook: React.FC<{ e: TEscena; ed: (campo: string, fn: (x: Draft<TEscena>) => void) => void }> = ({ e, ed }) => (
  <>
    <Sec
      t="Filtro"
      p="Ajuste"
      reset={e.filtro ? () => ed('filtro-0', (x) => void (x.filtro = null)) : undefined}
      extra={
        <button className="btn chico" onClick={() => abrirBiblioteca('filtros')}>
          Galería
        </button>
      }
    >
      <Campo et="Filtro">
        <select value={e.filtro?.id ?? ''} onChange={(ev) => ed('filtro', (x) => void (x.filtro = ev.target.value ? { id: ev.target.value, intensidad: x.filtro?.intensidad ?? 1 } : null))} data-prueba="esc-filtro">
          <option value="">Original</option>
          {FILTROS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.cat} · {f.nombre}
            </option>
          ))}
        </select>
      </Campo>
      {e.filtro && (
        <Campo et="Intensidad">
          <Deslizador v={e.filtro.intensidad} min={0} max={1} paso={0.05} on={(n) => ed('filtro-k', (x) => void (x.filtro = { ...x.filtro!, intensidad: n }))} />
        </Campo>
      )}
    </Sec>
    <Sec
      t={`Efectos (${e.extras?.length ?? 0})`}
      p="Ajuste"
      reset={e.extras?.length ? () => ed('extras-0', (x) => void (x.extras = [])) : undefined}
      extra={
        <button className="btn chico" onClick={() => abrirBiblioteca('efectos', 'biblioteca')}>
          Galería
        </button>
      }
    >
      {!e.extras?.length && <div className="ayuda">Sin efectos. Añádelos desde la galería de Efectos.</div>}
      {(e.extras ?? []).map((x, i) => (
        <Campo key={x.id} et={EFECTOS.find((y) => y.id === x.id)?.nombre ?? x.id}>
          <div className="fila">
            <Deslizador v={x.intensidad} min={0} max={1} paso={0.05} on={(n) => ed(`extra-${x.id}`, (y) => void (y.extras![i].intensidad = n))} />
            <button className="btn-r" title="Quitar" onClick={() => ed('extra-', (y) => void y.extras!.splice(i, 1))}>
              <Ico n="cerrar" s={12} />
            </button>
          </div>
        </Campo>
      ))}
    </Sec>
    <Sec
      t={`Elementos (${e.elementos?.length ?? 0})`}
      p="Ajuste"
      extra={
        <button className="btn chico" onClick={() => abrirBiblioteca('elementos')}>
          + Elemento
        </button>
      }
    >
      {(e.elementos ?? []).map((x) => (
        <div key={x.id} className="item" style={{ margin: '4px 0' }} onClick={() => useEd.setState({ sel: { tipo: 'elemento', escena: e.id, id: x.id }, multi: [] })}>
          <div className="ic" style={{ width: 26, height: 26 }}>
            <Ico n="formas" s={13} />
          </div>
          <div className="t">{ELEMENTOS_INFO.find((y) => y.id === x.tipo)?.nombre ?? x.tipo}</div>
        </div>
      ))}
    </Sec>
  </>
);

// ——— Edición por lotes (Ctrl+clic) ———
const PanelLote: React.FC = () => {
  const s = useEd();
  const p = s.proyecto!;
  const todos = [s.sel!, ...s.multi];
  const textos = todos.filter((x) => x.tipo === 'texto') as { escena: string; id: string }[];
  const escenas = todos.filter((x) => x.tipo === 'escena').map((x) => (x as any).id as string);
  const elementos = todos.filter((x) => x.tipo === 'elemento') as { escena: string; id: string }[];
  const t0 = textos.length ? p.escenas.find((e) => e.id === textos[0].escena)?.textos.find((x) => x.id === textos[0].id) : undefined;
  const e0 = escenas.length ? p.escenas.find((e) => e.id === escenas[0]) : undefined;
  const edT = (et: string, fn: (t: Draft<TTexto>) => void) => editarTextos(`lote-${et}`, textos, fn);
  const edE = (et: string, fn: (e: Draft<TEscena>) => void) => s.editar(`lote-${et}`, (d) => d.escenas.forEach((e) => escenas.includes(e.id) && fn(e)));
  return (
    <>
      <Cab tipo="Selección múltiple" tit={`${todos.length} elementos`}>
        <button className="btn chico" onClick={() => useEd.setState({ multi: [] })}>
          Soltar
        </button>
      </Cab>
      <div className="ayuda" style={{ padding: '6px 14px' }}>
        Ctrl+clic en la línea de tiempo o en el visor añade o quita. Lo que cambies aquí se aplica a todos a la vez.
      </div>
      {t0 && (
        <Sec t={`Textos (${textos.length})`} p="Lote">
          <Campo et="Fuente">
            <button className="btn chico" style={{ width: '100%', fontFamily: t0.fuente ? `"${t0.fuente}"` : undefined }} onClick={() => useEd.setState({ dialogo: 'fuentes' })}>
              {t0.fuente ?? 'Por defecto'}
            </button>
          </Campo>
          <Campo et="Tamaño">
            <Deslizador v={t0.tam} min={12} max={300} on={(n) => edT('tam', (x) => void (x.tam = n))} suf="px" prueba="lote-tam" />
          </Campo>
          <Campo et="Color">
            <ColorP v={t0.color} on={(v) => edT('color', (x) => void (x.color = v ?? 'bone'))} />
          </Campo>
          <Campo et="Acento">
            <ColorP v={t0.acento} on={(v) => edT('acento', (x) => void (v ? (x.acento = v) : delete x.acento))} ninguno />
          </Campo>
          <Campo et="Alinear">
            <Segmentos
              v={t0.alinear}
              ops={[
                ['left', 'Izq.'],
                ['center', 'Centro'],
                ['right', 'Der.'],
              ]}
              on={(v) => edT('alinear', (x) => void (x.alinear = v as any))}
            />
          </Campo>
          <Campo et="Animación">
            <select value={t0.animacion} onChange={(ev) => edT('anim', (x) => void (x.animacion = ev.target.value))}>
              {ANIM_ENTRADA.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <div className="fila" style={{ gap: 6, marginTop: 6 }}>
            <button className="btn chico" onClick={pegarEstilo}>
              <Ico n="pegar" s={13} /> Pegar estilo en todos
            </button>
          </div>
        </Sec>
      )}
      {e0 && (
        <Sec t={`Escenas (${escenas.length})`} p="Lote">
          <Campo et="Filtro">
            <select value={e0.filtro?.id ?? ''} onChange={(ev) => edE('filtro', (x) => void (x.filtro = ev.target.value ? { id: ev.target.value, intensidad: x.filtro?.intensidad ?? 1 } : null))} data-prueba="lote-filtro">
              <option value="">Original</option>
              {FILTROS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo et="Transición">
            <select value={e0.transicion.tipo} onChange={(ev) => edE('trans', (x) => ponerTransicion(x as any, ev.target.value, p.ajustes.fps))}>
              {TRANSICIONES_INFO.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo et="Duración">
            <Num v={e0.duracion} on={(n) => edE('dur', (x) => void (x.duracion = Math.max(1, Math.round(n))))} min={1} suf="f" ancho={70} />
          </Campo>
        </Sec>
      )}
      {elementos.length > 0 && (
        <Sec t={`Elementos (${elementos.length})`} p="Lote">
          <Campo et="Color">
            <ColorP v={undefined} on={(v) => s.editar('lote-el', (d) => elementos.forEach((r) => { const el = d.escenas.find((e) => e.id === r.escena)?.elementos?.find((x) => x.id === r.id); if (el && v) el.color = v; }))} />
          </Campo>
        </Sec>
      )}
    </>
  );
};

const PESTANAS: Record<string, string[]> = {
  elemento: ['Elemento'],
  lote: ['Lote'],
  proyecto: ['Proyecto', 'Marca'],
  escena: ['Vídeo', 'Animación', 'Ajuste'],
  texto: ['Texto', 'Animación'],
  frase: ['Voz', 'Mezcla'],
  sfx: ['Audio'],
  musica: ['Música', 'Mezcla', 'Ritmo'],
  subtitulos: ['Subtítulos'],
  transicion: ['Transición'],
};
const SUBPEST: Record<string, string[]> = { 'escena/Vídeo': ['Básico', 'Tomas', 'Plantilla'] };
const tabsElegidas: Record<string, string> = {};

export const Inspector: React.FC = () => {
  const sel = useEd((s) => s.sel);
  const multi = useEd((s) => s.multi);
  const [, setN] = useState(0);
  const tipo = multi.length && sel ? 'lote' : (sel?.tipo ?? 'proyecto');
  const tabs = PESTANAS[tipo] ?? ['General'];
  const tab = tabs.includes(tabsElegidas[tipo]) ? tabsElegidas[tipo] : tabs[0];
  const subs = SUBPEST[`${tipo}/${tab}`];
  const sub = subs ? (subs.includes(tabsElegidas[`${tipo}/${tab}`]) ? tabsElegidas[`${tipo}/${tab}`] : subs[0]) : '';
  let c: React.ReactNode;
  if (tipo === 'lote') c = <PanelLote />;
  else if (!sel || sel.tipo === 'proyecto') c = <PanelProyecto />;
  else if (sel.tipo === 'elemento') c = <PanelElemento esc={sel.escena} id={sel.id} />;
  else if (sel.tipo === 'escena') c = <PanelEscena id={sel.id} />;
  else if (sel.tipo === 'texto') c = <PanelTexto esc={sel.escena} id={sel.id} />;
  else if (sel.tipo === 'frase') c = <PanelFrase id={sel.id} />;
  else if (sel.tipo === 'sfx') c = <PanelSfx id={sel.id} />;
  else if (sel.tipo === 'musica') c = <PanelMusica />;
  else if (sel.tipo === 'subtitulos') c = <PanelSub />;
  else if (sel.tipo === 'transicion') c = <PanelTransicion id={sel.id} />;
  return (
    <aside className="panel der" style={{ width: 'var(--ancho-der)' }} data-prueba="inspector">
      <div className="tabs-insp">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => ((tabsElegidas[tipo] = t), setN((x) => x + 1))} data-pest={t}>
            {t}
          </button>
        ))}
        <span className="esp" />
        {tipo !== 'proyecto' && (
          <button title="Ajustes del proyecto" onClick={() => useEd.setState({ sel: { tipo: 'proyecto' } })} data-prueba="tab-proyecto" style={{ fontWeight: 400, fontSize: 12 }}>
            <Ico n="ajustes" s={15} />
          </button>
        )}
      </div>
      {subs && (
        <div className="subtabs">
          {subs.map((x) => (
            <button key={x} className={sub === x ? 'on' : ''} onClick={() => ((tabsElegidas[`${tipo}/${tab}`] = x), setN((n) => n + 1))} data-subpest={x}>
              {x}
            </button>
          ))}
        </div>
      )}
      <PestCtx.Provider value={{ tab, primera: tabs[0], sub, primeraSub: subs?.[0] ?? '' }}>
        <div className="scroll" key={sel ? JSON.stringify(sel) : 'p'}>
          {c}
        </div>
      </PestCtx.Provider>
    </aside>
  );
};
