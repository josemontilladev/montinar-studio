/**
 * Galerías de la biblioteca: estilos de texto, tipografías, animaciones, filtros, efectos, transiciones, elementos y
 * estilos de subtítulos. Todas con búsqueda, categorías, favoritos y recientes; las fichas se dibujan solo al verse
 * (fuentes y miniaturas perezosas) y la lista crece al hacer scroll.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fondoCierra } from './campos';
import type { TEscena, TProyecto, TSubtitulos } from '@contrato/esquema';
import { Subtitulos } from '@contrato/esquema';
import { ANIM_BUCLE, ANIM_ENTRADA, ANIM_SALIDA, EFECTOS, ELEMENTOS_INFO, ESTILOS_SUBTITULOS, FILTROS, PRESETS_TEXTO, TRANSICIONES_INFO, type PresetTexto } from '@contrato/kit/biblioteca';
import { dibujoElemento } from '@contrato/kit/elementos';
import { irA, nid, reproductor, useEd } from './estado';
import { Ico } from './iconos';
import { ponerTransicion, nuevoTexto } from './ops';
import {
  alternarFavorito,
  aplicarPreset,
  borrarEstiloPropio,
  cargarFuenteUI,
  colorDe,
  cssEstilo,
  editarTextos,
  instalarFuente,
  textosSel,
  useCatalogo,
  useLista,
  usePropios,
  usarReciente,
  useVisible,
  type FuenteCat,
} from './libreria';
import { escenaObjetivo } from './Biblioteca';
import { tTomaEn } from './Biblioteca';

// ——— Galería genérica ———
type ItemG = { id: string; nombre: string; cat: string; buscar?: string };

export function Galeria<T extends ItemG>({
  lib,
  items,
  min = 104,
  ficha,
  onUsar,
  onHover,
  activos,
  barra,
  prueba,
  alto,
}: {
  lib: string;
  items: T[];
  min?: number;
  ficha: (it: T, hover: boolean) => React.ReactNode;
  onUsar: (it: T) => void;
  onHover?: (it: T | null) => void;
  activos?: string[];
  barra?: React.ReactNode;
  prueba?: string;
  alto?: number;
}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todo');
  const [hover, setHover] = useState<string | null>(null);
  const [lim, setLim] = useState(48);
  const favs = useLista(`studio.fav.${lib}`);
  const recs = useLista(`studio.rec.${lib}`);
  const cats = useMemo(() => [...new Set(items.map((x) => x.cat))], [items]);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const vis = useMemo(() => {
    let l = items;
    if (cat === 'Favoritos') l = favs.map((id) => items.find((x) => x.id === id)).filter(Boolean) as T[];
    else if (cat === 'Recientes') l = recs.map((id) => items.find((x) => x.id === id)).filter(Boolean) as T[];
    else if (cat !== 'Todo') l = items.filter((x) => x.cat === cat);
    if (q.trim()) l = l.filter((x) => norm(`${x.nombre} ${x.cat} ${x.buscar ?? ''} ${x.id}`).includes(norm(q.trim())));
    return l;
  }, [items, cat, q, favs, recs]);
  useEffect(() => setLim(48), [cat, q]);
  return (
    <div className="galeria" data-prueba={prueba ?? `galeria-${lib}`}>
      <div className="barra-r">
        <div className="buscar" style={{ flex: 1 }}>
          <Ico n="lupa" s={14} />
          <input type="text" placeholder={`Buscar en ${items.length}`} value={q} onChange={(e) => setQ(e.target.value)} data-prueba="buscar-galeria" />
          {q && (
            <button className="btn-r" onClick={() => setQ('')} title="Borrar">
              <Ico n="cerrar" s={12} />
            </button>
          )}
        </div>
      </div>
      {barra}
      <div className="chips-cat">
        {['Todo', 'Favoritos', 'Recientes', ...cats].map((c) => (
          <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)} data-cat={c}>
            {c === 'Favoritos' ? <Ico n="estrella" s={12} /> : null}
            {c}
          </button>
        ))}
      </div>
      <div
        className="scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight > el.scrollHeight - 300 && lim < vis.length) setLim((x) => x + 48);
        }}
      >
        <div className="rejilla-g" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>
          {vis.slice(0, lim).map((it) => (
            <div
              key={it.id}
              className={`ficha-g ${activos?.includes(it.id) ? 'activa' : ''}`}
              style={alto ? { ['--alto-f' as any]: `${alto}px` } : undefined}
              data-item={it.id}
              title={it.nombre}
              onMouseEnter={() => (setHover(it.id), onHover?.(it))}
              onMouseLeave={() => (setHover(null), onHover?.(null))}
              onClick={() => (usarReciente(lib, it.id), onUsar(it))}
            >
              <div className="vista-g">{ficha(it, hover === it.id)}</div>
              <div className="nombre-g">{it.nombre}</div>
              <button
                className={`fav-g ${favs.includes(it.id) ? 'on' : ''}`}
                title={favs.includes(it.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                onClick={(e) => (e.stopPropagation(), alternarFavorito(lib, it.id))}
                data-fav={it.id}
              >
                <Ico n="estrella" s={12} />
              </button>
              {activos?.includes(it.id) && <span className="marca-g">{<Ico n="ok" s={11} />}</span>}
            </div>
          ))}
        </div>
        {!vis.length && <div className="vacio">{cat === 'Favoritos' ? 'Marca fichas con la estrella para tenerlas aquí' : cat === 'Recientes' ? 'Aún no has usado ninguna' : 'Nada coincide con la búsqueda'}</div>}
        {vis.length > lim && <div className="vacio">Desplázate para ver más ({vis.length - lim})</div>}
      </div>
    </div>
  );
}

/** Vista previa temporal en el reproductor al pasar el ratón (no toca el historial). */
const previa = (fn: ((p: TProyecto) => TProyecto) | null, irAFrame?: number) => {
  useEd.setState({ previa: fn });
  if (fn && irAFrame != null) reproductor.ref?.seekTo(irAFrame);
  if (!fn) reproductor.ref?.seekTo(useEd.getState().frame);
};
const conEscena = (p: TProyecto, id: string, fn: (e: TEscena) => TEscena): TProyecto => ({ ...p, escenas: p.escenas.map((e) => (e.id === id ? fn(e) : e)) });
const objetivo = () => {
  const s = useEd.getState();
  const e = escenaObjetivo();
  const r = e && s.linea ? s.linea.escenas.find((x) => x.id === e.id) : null;
  return e && r ? { e, r, s } : null;
};
/** Escenas seleccionadas (principal + Ctrl+clic) o la del cursor. */
const escenasSel = () => {
  const s = useEd.getState();
  const ids = [s.sel, ...s.multi].filter((x) => x?.tipo === 'escena').map((x) => (x as any).id as string);
  if (ids.length) return [...new Set(ids)];
  const e = escenaObjetivo();
  return e ? [e.id] : [];
};

// ——— Texto: estilos ———
const FichaEstilo: React.FC<{ pr: PresetTexto }> = ({ pr }) => {
  const [ref, vis] = useVisible<HTMLDivElement>();
  const cat = useCatalogo();
  const paleta = useEd((s) => s.proyecto!.ajustes.paleta);
  const [lista, setLista] = useState(false);
  useEffect(() => {
    if (!vis || !cat) return;
    const f = cat.find((x) => x.familia === pr.fuente);
    if (f) cargarFuenteUI(f).then(() => setLista(true));
    else setLista(true);
  }, [vis, cat, pr.fuente]);
  const st = cssEstilo(pr.estilo, pr.color, paleta, 0.28);
  return (
    <div ref={ref} className="prev-estilo" style={{ opacity: lista ? 1 : 0.35 }}>
      <span style={{ fontFamily: `"${pr.fuente}", sans-serif`, fontSize: 21, lineHeight: 1.1, ...st }}>
        {pr.estilo.mayusculas ? 'TEXTO' : 'Texto'}
        {pr.acento && <i style={{ fontFamily: 'Georgia, serif', fontWeight: 400, color: colorDe(paleta, pr.acento), WebkitTextStroke: 0 }}> ya</i>}
      </span>
    </div>
  );
};

const crearTexto = (o: Record<string, any>) => {
  const t = objetivo();
  if (!t) return;
  const { e, r, s } = t;
  const local = Math.max(0, Math.min(s.frame, r.fin - 1) - r.origen);
  const nuevo = nuevoTexto({ y: 700, tam: 110, ...o, desde: local, hasta: null });
  s.editar('texto+', (d) => void d.escenas.find((x) => x.id === e.id)!.textos.push(nuevo as any));
  useEd.setState({ sel: { tipo: 'texto', escena: e.id, id: nuevo.id }, multi: [] });
  irA(r.origen + local + Math.round(s.linea!.fps * 0.6));
};

export const EstilosTexto: React.FC = () => {
  const propios = usePropios();
  const items = useMemo(() => [...propios.map((p) => ({ ...p, cat: 'Mis estilos' })), ...PRESETS_TEXTO.map((p) => ({ ...p, cat: p.categoria, buscar: p.fuente }))], [propios]);
  const sel = useEd((s) => s.sel);
  return (
    <Galeria
      lib="estilos"
      items={items}
      min={98}
      barra={<div className="ayuda" style={{ padding: '0 12px 4px' }}>{sel?.tipo === 'texto' ? 'Clic: aplica el estilo al texto seleccionado (y a los marcados con Ctrl).' : 'Clic: añade un texto nuevo con ese estilo en el cursor.'}</div>}
      ficha={(pr) => (
        <>
          <FichaEstilo pr={pr} />
          {pr.cat === 'Mis estilos' && (
            <button className="borrar-g" title="Borrar este estilo" onClick={(ev) => (ev.stopPropagation(), borrarEstiloPropio(pr.id))}>
              <Ico n="papelera" s={11} />
            </button>
          )}
        </>
      )}
      onUsar={(pr) => aplicarPreset(pr, crearTexto)}
    />
  );
};

// ——— Texto: tipografías ———
const FichaFuente: React.FC<{ f: FuenteCat; muestra: string }> = ({ f, muestra }) => {
  const [ref, vis] = useVisible<HTMLDivElement>();
  const [lista, setLista] = useState(false);
  useEffect(() => {
    if (vis) cargarFuenteUI(f).then(() => setLista(true));
  }, [vis, f]);
  return (
    <div ref={ref} className="prev-fuente" style={{ fontFamily: lista ? `"${f.familia}", sans-serif` : 'inherit', opacity: lista ? 1 : 0.3 }}>
      <div className="aa">{muestra}</div>
      <div className="lic">
        {f.categoria} · {f.licencia}
      </div>
    </div>
  );
};

/** Aplica una tipografía a los textos seleccionados (o devuelve la familia con `onElegir`). */
export const aplicarFuente = async (familia: string) => {
  const s = useEd.getState();
  const lista = textosSel();
  try {
    await instalarFuente(familia);
  } catch (e: any) {
    return s.avisar(`No se pudo copiar la tipografía: ${e.message}`, 'error');
  }
  if (!lista.length) return crearTexto({ fuente: familia, texto: 'Tu texto *aquí*.' });
  editarTextos('fuente', lista, (t) => void (t.fuente = familia));
  s.avisar(`Tipografía «${familia}» en ${lista.length} texto(s)`, 'ok');
};

export const Fuentes: React.FC<{ onElegir?: (familia: string) => void }> = ({ onElegir }) => {
  const cat = useCatalogo();
  const sel = useEd((s) => s.sel);
  const p = useEd((s) => s.proyecto)!;
  const actual = sel?.tipo === 'texto' ? p.escenas.find((e) => e.id === sel.escena)?.textos.find((t) => t.id === sel.id) : undefined;
  const muestra = actual ? actual.texto.replace(/\*/g, '').replace(/ \/ /g, ' ').slice(0, 22) || 'Aa Bb 123' : 'Aa Bb Ññ 123';
  const items = useMemo(() => (cat ?? []).map((f) => ({ ...f, nombre: f.familia, cat: f.categoria })), [cat]);
  if (!cat) return <div className="vacio">Cargando tipografías…</div>;
  return (
    <Galeria
      lib="fuentes"
      items={items}
      min={150}
      alto={70}
      activos={actual?.fuente ? [items.find((x) => x.familia === actual.fuente)?.id ?? ''] : []}
      barra={<div className="ayuda" style={{ padding: '0 12px 4px' }}>{items.length} familias libres (OFL / Apache), sin conexión. {actual ? 'Clic: cambia la del texto seleccionado.' : 'Clic: texto nuevo con esa tipografía.'}</div>}
      ficha={(f) => <FichaFuente f={f} muestra={muestra} />}
      onUsar={(f) => (onElegir ? onElegir(f.familia) : aplicarFuente(f.familia))}
    />
  );
};

// ——— Texto: animaciones (vista previa CSS al pasar el ratón) ———
const KF: Record<string, Keyframe[]> = {
  mascara: [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(40%)' }, { clipPath: 'inset(0 0 0 0)', transform: 'none' }],
  fundido: [{ opacity: 0 }, { opacity: 1 }],
  subir: [{ opacity: 0, transform: 'translateY(60%)' }, { opacity: 1, transform: 'none' }],
  bajar: [{ opacity: 0, transform: 'translateY(-60%)' }, { opacity: 1, transform: 'none' }],
  izquierda: [{ opacity: 0, transform: 'translateX(-60%)' }, { opacity: 1, transform: 'none' }],
  derecha: [{ opacity: 0, transform: 'translateX(60%)' }, { opacity: 1, transform: 'none' }],
  pop: [{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)' }],
  'zoom-in': [{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
  'zoom-out': [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
  maquina: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
  palabra: [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1 }],
  rebote: [{ transform: 'translateY(-120%)' }, { transform: 'translateY(0)', offset: 0.5 }, { transform: 'translateY(-25%)', offset: 0.7 }, { transform: 'translateY(0)' }],
  desenfoque: [{ filter: 'blur(8px)', opacity: 0 }, { filter: 'blur(0)', opacity: 1 }],
  glitch: [{ transform: 'translateX(-6px)', filter: 'hue-rotate(90deg)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none', filter: 'none' }],
  giro: [{ transform: 'rotate(-180deg) scale(0.3)', opacity: 0 }, { transform: 'none', opacity: 1 }],
  voltear: [{ transform: 'perspective(200px) rotateX(90deg)' }, { transform: 'perspective(200px) rotateX(0)' }],
  caer: [{ transform: 'translateY(-150%) rotate(-12deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
  elastico: [{ transform: 'scaleX(0.2)' }, { transform: 'scaleX(1.3)', offset: 0.5 }, { transform: 'scaleX(0.9)', offset: 0.75 }, { transform: 'none' }],
  barrido: [{ clipPath: 'inset(0 100% 0 0)', background: 'var(--acento)' }, { clipPath: 'inset(0 0 0 0)' }],
  'letras-onda': [{ transform: 'translateY(40%)', opacity: 0 }, { transform: 'translateY(-15%)', opacity: 1, offset: 0.6 }, { transform: 'none' }],
  'escala-x': [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'none', opacity: 1 }],
  ninguna: [{ opacity: 1 }, { opacity: 1 }],
};
const KF_SAL: Record<string, Keyframe[]> = {
  mascara: [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)', transform: 'translateY(-30%)' }],
  fundido: [{ opacity: 1 }, { opacity: 0 }],
  subir: [{ transform: 'none' }, { transform: 'translateY(-60%)', opacity: 0 }],
  bajar: [{ transform: 'none' }, { transform: 'translateY(60%)', opacity: 0 }],
  pop: [{ transform: 'none' }, { transform: 'scale(0)', opacity: 0 }],
  zoom: [{ transform: 'none' }, { transform: 'scale(1.8)', opacity: 0 }],
  desenfoque: [{ filter: 'none' }, { filter: 'blur(8px)', opacity: 0 }],
  barrido: [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }],
  izquierda: [{ transform: 'none' }, { transform: 'translateX(-70%)', opacity: 0 }],
  derecha: [{ transform: 'none' }, { transform: 'translateX(70%)', opacity: 0 }],
};
const KF_BUC: Record<string, Keyframe[]> = {
  onda: [{ transform: 'translateY(0)' }, { transform: 'translateY(-14%)' }, { transform: 'translateY(0)' }],
  pulso: [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
  temblor: [{ transform: 'translate(0,0)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(0,0)' }],
  flotar: [{ transform: 'translateY(0)' }, { transform: 'translateY(-10%)' }, { transform: 'translateY(0)' }],
  parpadeo: [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }],
  brillo: [{ textShadow: '0 0 0 transparent' }, { textShadow: '0 0 12px var(--acento)' }, { textShadow: '0 0 0 transparent' }],
  karaoke: [{ color: '#fff' }, { color: 'var(--acento)' }],
  arcoiris: [{ filter: 'hue-rotate(0deg)', color: '#ff5c8a' }, { filter: 'hue-rotate(360deg)', color: '#ff5c8a' }],
  balanceo: [{ transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-6deg)' }],
};
const PrevAnim: React.FC<{ kf: Keyframe[] | undefined; activo: boolean; bucle?: boolean }> = ({ kf, activo, bucle }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!activo || !kf || !ref.current) return;
    const a = ref.current.animate(kf, { duration: bucle ? 1100 : 700, iterations: Infinity, easing: 'cubic-bezier(.2,.8,.2,1)', ...(bucle ? {} : { endDelay: 500 }) });
    return () => a.cancel();
  }, [activo, kf, bucle]);
  return (
    <span ref={ref} className="prev-anim">
      Texto
    </span>
  );
};
export const Animaciones: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const sel = useEd((s) => s.sel);
  const t = sel?.tipo === 'texto' ? p.escenas.find((e) => e.id === sel.escena)?.textos.find((x) => x.id === sel.id) : undefined;
  const items = useMemo(
    () => [
      ...ANIM_ENTRADA.map((a) => ({ id: `in:${a.id}`, nombre: a.nombre, cat: 'Entrada', anim: a.id })),
      ...ANIM_SALIDA.map((a) => ({ id: `out:${a.id}`, nombre: a.nombre, cat: 'Salida', anim: a.id })),
      ...ANIM_BUCLE.map((a) => ({ id: `loop:${a.id}`, nombre: a.nombre, cat: 'Bucle', anim: a.id })),
      { id: 'out:ninguna', nombre: 'Sin salida', cat: 'Salida', anim: '' },
      { id: 'loop:ninguno', nombre: 'Sin bucle', cat: 'Bucle', anim: '' },
    ],
    [],
  );
  const activos = t ? [`in:${t.animacion}`, t.salida ? `out:${t.salida}` : 'out:ninguna', t.bucle ? `loop:${t.bucle}` : 'loop:ninguno'] : [];
  const lista = textosSel();
  return (
    <Galeria
      lib="animaciones"
      items={items}
      min={92}
      activos={activos}
      barra={
        <div style={{ padding: '0 12px 6px' }}>
          {t ? (
            <div className="fila" style={{ gap: 8, fontSize: 11.5, color: 'var(--tenue)' }}>
              <span>Entrada</span>
              <input type="range" min={0.1} max={2} step={0.05} value={t.durEntrada ?? 0.5} onChange={(e) => editarTextos('dur-in', lista, (x) => void (x.durEntrada = Number(e.target.value)))} data-prueba="dur-entrada" />
              <b style={{ color: 'var(--texto)', minWidth: 34 }}>{(t.durEntrada ?? 0.5).toFixed(2)}s</b>
              <span>Salida</span>
              <input type="range" min={0.1} max={2} step={0.05} value={t.durSalida ?? 0.4} onChange={(e) => editarTextos('dur-out', lista, (x) => void (x.durSalida = Number(e.target.value)))} />
              <b style={{ color: 'var(--texto)', minWidth: 34 }}>{(t.durSalida ?? 0.4).toFixed(2)}s</b>
            </div>
          ) : (
            <div className="ayuda">Selecciona un texto para animarlo. Pasa el ratón para ver cada animación.</div>
          )}
        </div>
      }
      ficha={(it, h) => <PrevAnim kf={it.cat === 'Entrada' ? KF[it.anim] : it.cat === 'Salida' ? KF_SAL[it.anim] : KF_BUC[it.anim]} activo={h} bucle={it.cat === 'Bucle'} />}
      onUsar={(it) => {
        const s = useEd.getState();
        if (!lista.length) return s.avisar('Selecciona primero un texto');
        editarTextos('anim', lista, (x) => {
          if (it.cat === 'Entrada') x.animacion = it.anim;
          else if (it.cat === 'Salida') it.anim ? (x.salida = it.anim) : delete x.salida;
          else it.anim ? (x.bucle = it.anim) : delete x.bucle;
        });
        s.avisar(`${it.cat}: ${it.nombre}`, 'ok');
      }}
    />
  );
};

// ——— Filtros ———
const imgEscena = (e: TEscena | undefined, frameLocal: number, pre: number, fps: number) => {
  const tk = e?.tomas[0];
  if (!tk || !/\.(mp4|webm|mov|m4v)$/i.test(tk.src)) return tk && /\.(png|jpe?g|webp)$/i.test(tk.src) ? `/${tk.src}` : null;
  const t = Math.max(0, tTomaEn(e!, pre, fps, frameLocal));
  return `/api/miniatura?src=${encodeURIComponent(tk.src)}&t=${t.toFixed(2)}&h=180`;
};
const MUESTRA = 'linear-gradient(135deg, #f6d27a 0%, #ff8a5c 35%, #6b4bff 70%, #22d3e6 100%)';
/** Miniatura del fotograma actual de la escena objetivo (se actualiza al soltar el cursor, no a cada fotograma). */
const useImgEscena = () => {
  const l = useEd((s) => s.linea)!;
  const frame = useEd((s) => s.frame);
  useEd((s) => s.sel);
  const [fImg, setFImg] = useState(frame);
  useEffect(() => {
    const t = setTimeout(() => setFImg(frame), 400);
    return () => clearTimeout(t);
  }, [frame]);
  const e = escenaObjetivo();
  const r = e ? l.escenas.find((x) => x.id === e.id) : undefined;
  return e && r ? imgEscena(e, Math.max(0, Math.min(fImg, r.fin - 1) - r.origen), r.pre, l.fps) : null;
};
export const Filtros: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const sel = useEd((s) => s.sel);
  void l;
  const e = escenaObjetivo();
  const src = useImgEscena();
  const items = useMemo(() => [{ id: 'ninguno', nombre: 'Original', cat: 'Color' }, ...FILTROS.map((f) => ({ id: f.id, nombre: f.nombre, cat: f.cat }))], []);
  const ids = escenasSel();
  const k = e?.filtro?.intensidad ?? 1;
  void sel;
  const poner = (id: string, todas = false) => {
    const s = useEd.getState();
    const lista = todas ? p.escenas.map((x) => x.id) : ids;
    s.editar('filtro', (d) => {
      for (const x of d.escenas) if (lista.includes(x.id)) x.filtro = id === 'ninguno' ? null : { id, intensidad: x.filtro?.intensidad ?? 1 };
    });
    s.avisar(id === 'ninguno' ? 'Filtro quitado' : `Filtro «${FILTROS.find((f) => f.id === id)?.nombre}» en ${lista.length} escena(s)`, 'ok');
  };
  return (
    <Galeria
      lib="filtros"
      items={items}
      min={88}
      alto={110}
      activos={[e?.filtro?.id ?? 'ninguno']}
      barra={
        <div style={{ padding: '0 12px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="fila" style={{ gap: 8, fontSize: 11.5, color: 'var(--tenue)' }}>
            <span>Intensidad</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={k}
              disabled={!e?.filtro}
              data-prueba="filtro-intensidad"
              onChange={(ev) => useEd.getState().editar('filtro-k', (d) => void d.escenas.forEach((x) => ids.includes(x.id) && x.filtro && (x.filtro.intensidad = Number(ev.target.value))))}
            />
            <b style={{ color: 'var(--texto)', minWidth: 34 }}>{Math.round(k * 100)}%</b>
            <button className="btn chico" disabled={!e?.filtro} onClick={() => e?.filtro && poner(e.filtro.id, true)} title="Usar este filtro en todas las escenas">
              A todas
            </button>
          </div>
        </div>
      }
      ficha={(it) => {
        const def = FILTROS.find((f) => f.id === it.id);
        return (
          <div className="prev-filtro" style={{ backgroundImage: src ? `url("${src}")` : MUESTRA, filter: def ? def.css(1) : undefined }}>
            {def?.tinte && <span style={{ position: 'absolute', inset: 0, background: colorDe(p.ajustes.paleta, def.tinte.color), mixBlendMode: def.tinte.mezcla as any, opacity: def.tinte.opacidad }} />}
          </div>
        );
      }}
      onHover={(it) => (it && e ? previa((q) => conEscena(q, e.id, (x) => ({ ...x, filtro: it.id === 'ninguno' ? null : { id: it.id, intensidad: x.filtro?.intensidad ?? 1 } }))) : previa(null))}
      onUsar={(it) => (previa(null), poner(it.id))}
    />
  );
};

// ——— Efectos de la biblioteca ———
const ICO_EF: Record<string, string> = { Luz: 'luz', Película: 'claqueta', Retro: 'pantalla', Movimiento: 'velocidad', Partículas: 'efectos', Diseño: 'cuadro' };
export const EfectosLib: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  void p;
  const e = escenaObjetivo();
  const src = useImgEscena();
  const items = useMemo(() => EFECTOS.map((x) => ({ ...x })), []);
  const ids = escenasSel();
  return (
    <Galeria
      lib="efectos"
      items={items}
      min={92}
      activos={(e?.extras ?? []).map((x) => x.id)}
      barra={
        <div className="ayuda" style={{ padding: '0 12px 6px' }}>
          Clic: pone o quita el efecto en la escena seleccionada (se pueden combinar). Pasa el ratón para verlo en el reproductor.
          {e?.extras?.length ? (
            <button className="btn chico" style={{ marginLeft: 6 }} onClick={() => useEd.getState().editar('extras-0', (d) => void d.escenas.forEach((x) => ids.includes(x.id) && (x.extras = [])))}>
              Quitar todos
            </button>
          ) : null}
        </div>
      }
      ficha={(it, h) => (
        <>
          <div className="prev-filtro" style={{ backgroundImage: src ? `url("${src}")` : MUESTRA, opacity: 0.45 }} />
          <div className={`prev-efecto ${h ? 'vivo' : ''}`} data-cat={it.cat}>
            <Ico n={ICO_EF[it.cat] ?? 'efectos'} s={24} />
          </div>
        </>
      )}
      onHover={(it) => (it && e ? previa((q) => conEscena(q, e.id, (x) => ({ ...x, extras: (x.extras ?? []).some((y) => y.id === it.id) ? x.extras : [...(x.extras ?? []), { id: it.id, intensidad: 0.7 }] }))) : previa(null))}
      onUsar={(it) => {
        previa(null);
        const s = useEd.getState();
        const tiene = !!e?.extras?.some((y) => y.id === it.id);
        s.editar('extras', (d) => {
          for (const x of d.escenas) {
            if (!ids.includes(x.id)) continue;
            x.extras ??= [];
            x.extras = tiene ? x.extras.filter((y) => y.id !== it.id) : [...x.extras.filter((y) => y.id !== it.id), { id: it.id, intensidad: 0.7 }];
          }
        });
        s.avisar(`${tiene ? 'Quitado' : 'Efecto'} «${it.nombre}»`, 'ok');
      }}
    />
  );
};

// ——— Transiciones ———
export const TransicionesLib: React.FC = () => {
  const e = escenaObjetivo();
  const items = useMemo(() => TRANSICIONES_INFO.map((t) => ({ ...t })), []);
  const ids = escenasSel();
  const poner = (tipo: string, todas: boolean) => {
    const s = useEd.getState();
    s.editar('transicion', (d) => {
      d.escenas.forEach((x, i) => {
        if (i === 0 && todas) return;
        if (todas || ids.includes(x.id)) ponerTransicion(x as any, tipo, d.ajustes.fps);
      });
    });
  };
  return (
    <Galeria
      lib="transiciones"
      items={items}
      min={84}
      activos={e ? [e.transicion.tipo] : []}
      barra={
        <div className="ayuda" style={{ padding: '0 12px 6px' }}>
          Entrada de la escena seleccionada. Pasa el ratón para ver la mitad de la transición.
          {e && (
            <button className="btn chico" style={{ marginLeft: 6 }} onClick={() => (poner(e.transicion.tipo, true), useEd.getState().avisar('Transición en todas las escenas', 'ok'))} data-prueba="trans-todas">
              A todas
            </button>
          )}
        </div>
      }
      ficha={(it, h) => <span className={`prev-trans ${h ? 'vivo' : ''}`}>{it.icono}</span>}
      onHover={(it) => {
        const s = useEd.getState();
        const r = e && s.linea ? s.linea.escenas.find((x) => x.id === e.id) : null;
        if (!it || !e || !r) return previa(null);
        const fps = s.proyecto!.ajustes.fps;
        previa((q) => conEscena(q, e.id, (x) => ({ ...x, transicion: { ...x.transicion, tipo: it.id, duracion: Math.round(it.dur * fps) } })), r.inicio + Math.round(it.dur * fps * 0.5));
      }}
      onUsar={(it) => {
        previa(null);
        if (!e) return;
        poner(it.id, false);
        const r = useEd.getState().linea!.escenas.find((x) => x.id === e.id)!;
        irA(Math.max(0, r.inicio - 6));
        useEd.getState().avisar(`Transición «${it.nombre}»`, 'ok');
      }}
    />
  );
};

// ——— Elementos ———
export const Elementos: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const pal = p.ajustes.paleta;
  const items = useMemo(() => ELEMENTOS_INFO.map((x) => ({ ...x })), []);
  return (
    <Galeria
      lib="elementos"
      items={items}
      min={86}
      barra={<div className="ayuda" style={{ padding: '0 12px 6px' }}>Formas y gráficos originales, con los colores de la marca. Clic: se añade en el cursor; luego se mueve y se gira en el visor.</div>}
      ficha={(it) => {
        const k = Math.min(64 / it.w, 52 / it.h);
        return (
          <div style={{ width: it.w * k, height: it.h * k, overflow: 'visible' }}>
            <div style={{ transform: `scale(${k})`, transformOrigin: '0 0', width: it.w, height: it.h }}>{dibujoElemento(it.id, it.w, it.h, colorDe(pal, 'acid'), colorDe(pal, 'ink'), it.texto ?? '', 'Inter, sans-serif', 1, 0)}</div>
          </div>
        );
      }}
      onUsar={(it) => {
        const o = objetivo();
        if (!o) return;
        const { e, r, s } = o;
        const local = Math.max(0, Math.min(s.frame, r.fin - 1) - r.origen);
        const id = nid('el');
        const W = s.proyecto!.ajustes.ancho;
        s.editar('elemento+', (d) => {
          const x = d.escenas.find((y) => y.id === e.id)!;
          x.elementos ??= [];
          x.elementos.push({ id, tipo: it.id, x: Math.round((W - it.w) / 2), y: 820, w: it.w, h: it.h, rot: 0, color: 'acid', color2: 'ink', texto: it.texto ?? '', desde: local, hasta: null, entrada: ['linea', 'subrayado', 'onda', 'marcador', 'flecha-curva', 'flecha-mano', 'progreso', 'pasos', 'estrellas'].includes(it.id) ? 'dibujar' : 'pop', opacidad: 1 });
        });
        useEd.setState({ sel: { tipo: 'elemento', escena: e.id, id }, multi: [] });
        irA(r.origen + local + Math.round(s.linea!.fps * 0.5));
        s.avisar(`«${it.nombre}» añadido`, 'ok');
      }}
    />
  );
};

// ——— Estilos de subtítulos ———
const BASE_SUB = (() => {
  const d = Subtitulos.parse({}) as TSubtitulos;
  const { visible, origen, pista, posicion, y, alto, ...resto } = d;
  void visible, origen, pista, posicion, y, alto;
  return resto;
})();
export const presetSubtitulos = (actual: TSubtitulos, id: string, fuenteDef?: string): TSubtitulos => {
  const pr = ESTILOS_SUBTITULOS.find((x) => x.id === id);
  if (!pr) return actual;
  return { ...actual, ...BASE_SUB, fuente: fuenteDef, ...pr.aplicar, preset: id } as TSubtitulos;
};
export const SubEstilos: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const pal = p.ajustes.paleta;
  const items = useMemo(() => ESTILOS_SUBTITULOS.map((x) => ({ ...x })), []);
  const irASub = () => {
    const b = l.bloques.find((x) => x.desde * l.fps >= useEd.getState().frame) ?? l.bloques[0];
    return b ? Math.round((b.desde + 0.15) * l.fps) : undefined;
  };
  return (
    <Galeria
      lib="subtitulos"
      items={items}
      min={112}
      activos={p.subtitulos.preset ? [p.subtitulos.preset] : []}
      barra={<div className="ayuda" style={{ padding: '0 12px 6px' }}>Un clic cambia el estilo de todos los subtítulos. Pasa el ratón para verlo en el reproductor.</div>}
      ficha={(it) => {
        const a = { ...BASE_SUB, ...it.aplicar } as TSubtitulos;
        const caja = a.estilo === 'resaltado' || a.estilo === 'karaoke';
        const trazo = a.trazo ? { WebkitTextStroke: `${Math.max(0.6, a.trazo.ancho * 0.18)}px ${colorDe(pal, a.trazo.color)}`, paintOrder: 'stroke fill' } : {};
        const res = colorDe(pal, a.resalte);
        const marca: React.CSSProperties =
          a.estilo === 'resaltado' && (a.resalteModo ?? 'fondo') === 'fondo'
            ? { background: res, color: colorDe(pal, a.colorResalte), borderRadius: 3, padding: '0 3px' }
            : a.resalteModo === 'subrayado'
              ? { boxShadow: `inset 0 -3px 0 ${res}` }
              : a.resalteModo === 'escala'
                ? { color: colorDe(pal, a.colorResalte), fontSize: '1.2em' }
                : { color: res };
        return (
          <div className="prev-sub" style={{ fontFamily: a.fuente ? `"${a.fuente}", sans-serif` : 'inherit', fontWeight: a.peso, textTransform: a.mayusculas ? 'uppercase' : undefined }}>
            <span style={{ background: caja ? a.fondo : 'transparent', borderRadius: Math.min(10, (a.cajaRadio ?? 28) / 3), padding: caja ? '3px 6px' : 0, color: colorDe(pal, a.color), textShadow: a.sombra ? `0 1px 3px ${a.sombraColor ? colorDe(pal, a.sombraColor) : 'rgba(0,0,0,.7)'}` : undefined, ...trazo } as React.CSSProperties}>
              Hola <span style={marca}>mundo</span>
            </span>
          </div>
        );
      }}
      onHover={(it) => (it ? previa((q) => ({ ...q, subtitulos: presetSubtitulos(q.subtitulos, it.id, q.subtitulos.fuente) }), irASub()) : previa(null))}
      onUsar={async (it) => {
        previa(null);
        const s = useEd.getState();
        const f = it.aplicar.fuente;
        if (f) await instalarFuente(f).catch(() => {});
        s.editar('sub-preset', (d) => void (d.subtitulos = presetSubtitulos(d.subtitulos as any, it.id, d.subtitulos.fuente) as any));
        s.avisar(`Subtítulos: «${it.nombre}» en todos`, 'ok');
      }}
    />
  );
};

/** Diálogo de tipografías (desde el inspector). */
export const DialogoFuentes: React.FC = () => {
  const cerrar = () => useEd.setState({ dialogo: null });
  return (
    <div className="velo" {...fondoCierra(() => cerrar())}>
      <div className="dialogo" style={{ width: 760, height: '78vh', display: 'flex', flexDirection: 'column' }} data-prueba="dialogo-fuentes">
        <div className="fila" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Tipografías</h3>
          <span className="esp" />
          <button className="btn icono chico plano" onClick={cerrar} title="Cerrar">
            <Ico n="cerrar" />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Fuentes onElegir={(f) => aplicarFuente(f)} />
        </div>
      </div>
    </div>
  );
};
