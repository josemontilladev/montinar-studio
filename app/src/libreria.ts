/**
 * Ayudas de las bibliotecas del editor: favoritos y recientes (en este equipo), catálogo de tipografías con carga
 * perezosa, vista previa CSS de los estilos de texto y operaciones rápidas (aplicar a la selección, a todo, copiar y
 * pegar estilo).
 */
import React, { useEffect, useState } from 'react';
import type { Draft } from 'immer';
import type { TEstiloTexto, TProyecto, TTexto } from '@contrato/esquema';
import type { PresetTexto } from '@contrato/kit/biblioteca';
import { useEd, type Sel } from './estado';
import { api } from './api';

// ——— Favoritos y recientes (localStorage, con try/catch) ———
const leer = <T,>(k: string, def: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
};
const escribir = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sin almacenamiento */
  }
};
const oyentes = new Set<() => void>();
export const useLista = (clave: string) => {
  const [, setN] = useState(0);
  useEffect(() => {
    const f = () => setN((x) => x + 1);
    oyentes.add(f);
    return () => void oyentes.delete(f);
  }, []);
  const lista = leer<string[]>(clave, []);
  return lista;
};
const avisarListas = () => oyentes.forEach((f) => f());
export const alternarFavorito = (lib: string, id: string) => {
  const k = `studio.fav.${lib}`;
  const l = leer<string[]>(k, []);
  escribir(k, l.includes(id) ? l.filter((x) => x !== id) : [id, ...l]);
  avisarListas();
};
export const usarReciente = (lib: string, id: string) => {
  const k = `studio.rec.${lib}`;
  escribir(k, [id, ...leer<string[]>(k, []).filter((x) => x !== id)].slice(0, 16));
  avisarListas();
};

// ——— Catálogo de tipografías ———
export type FuenteCat = { id: string; familia: string; categoria: string; licencia: string; archivos: { peso: number; archivo: string }[] };
let catalogo: FuenteCat[] | null = null;
let pidiendo: Promise<FuenteCat[]> | null = null;
export const useCatalogo = () => {
  const [c, setC] = useState<FuenteCat[] | null>(catalogo);
  useEffect(() => {
    if (catalogo) return;
    pidiendo ??= fetch('/api/fuentes')
      .then((r) => r.json())
      .then((x) => (catalogo = x));
    pidiendo.then(setC).catch(() => setC([]));
  }, []);
  return c;
};
export const fuentePorFamilia = (f: string) => catalogo?.find((x) => x.familia === f);

/** Carga una tipografía de la biblioteca en el editor (solo cuando su ficha se ve). */
const cargadasUI = new Map<string, Promise<void>>();
export const cargarFuenteUI = (f: FuenteCat) => {
  if (!cargadasUI.has(f.id))
    cargadasUI.set(
      f.id,
      Promise.all(
        f.archivos.map(async (a) => {
          try {
            const ff = new FontFace(f.familia, `url(/recursos/fuentes/${a.archivo}) format('woff2')`, { weight: String(a.peso) });
            await ff.load();
            (document.fonts as any).add(ff);
          } catch {
            /* se ve con la de reserva */
          }
        }),
      ).then(() => undefined),
    );
  return cargadasUI.get(f.id)!;
};
/** Las tipografías que ya usa el proyecto también se cargan en el editor (para medir y para las fichas). */
export const cargarFuentesProyecto = (p: TProyecto) => {
  for (const f of p.ajustes.fuentesExtra ?? []) {
    const c = catalogo?.find((x) => x.familia === f.familia);
    if (c) cargarFuenteUI(c);
  }
};

/** Al ver un elemento, llama a `fn` una vez (carga perezosa de fuentes y miniaturas). */
export const useVisible = <T extends HTMLElement>(): [React.RefObject<T | null>, boolean] => {
  const ref = React.useRef<T>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || v) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setV(true);
        io.disconnect();
      }
    }, { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [v]);
  return [ref, v];
};

/** Copia la tipografía al proyecto (public/fuentes) y la registra en ajustes.fuentesExtra. */
export const instalarFuente = async (familia: string) => {
  const s = useEd.getState();
  const p = s.proyecto;
  if (!p) return;
  if ((p.ajustes.fuentesExtra ?? []).some((f) => f.familia === familia)) return;
  const c = catalogo?.find((x) => x.familia === familia);
  if (!c) return; // familias propias del proyecto (Geist, Anton…): no hace falta
  const r = await fetch('/api/fuentes/instalar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }) }).then((x) => x.json());
  if (r.error) throw new Error(r.error);
  cargarFuenteUI(c);
  useEd.getState().editar('fuente-instalar', (d) => {
    d.ajustes.fuentesExtra ??= [];
    if (!d.ajustes.fuentesExtra.some((f) => f.familia === familia)) d.ajustes.fuentesExtra.push(r);
  });
};

// ——— Vista previa CSS de un estilo de texto ———
export const colorDe = (paleta: Record<string, string>, c?: string, def = '#fff') => (c ? (paleta[c] ?? c) : def);
export const cssEstilo = (e: TEstiloTexto | undefined, color: string, paleta: Record<string, string>, escala = 1): React.CSSProperties => {
  const x = e ?? {};
  const st: React.CSSProperties = { color: colorDe(paleta, color), fontWeight: x.peso ?? 650, letterSpacing: x.espaciado != null ? `${x.espaciado}em` : '-0.03em', textTransform: x.mayusculas ? 'uppercase' : undefined, fontStyle: x.cursiva ? 'italic' : undefined };
  const sombras: string[] = [];
  if (x.sombra) sombras.push(`${x.sombra.x * escala}px ${x.sombra.y * escala}px ${x.sombra.blur * escala}px ${colorDe(paleta, x.sombra.color)}`);
  if (x.sombra2) sombras.push(`${x.sombra2.x * escala}px ${x.sombra2.y * escala}px ${x.sombra2.blur * escala}px ${colorDe(paleta, x.sombra2.color)}`);
  if (x.brilloColor) sombras.push(`0 0 ${10 * escala}px ${colorDe(paleta, x.brilloColor)}`);
  if (sombras.length) st.textShadow = sombras.join(', ');
  if (x.trazo) Object.assign(st, { WebkitTextStroke: `${Math.max(0.6, x.trazo.ancho * escala)}px ${colorDe(paleta, x.trazo.color)}`, paintOrder: 'stroke fill' });
  if (x.degradado) Object.assign(st, { backgroundImage: `linear-gradient(${x.degradado.angulo}deg, ${colorDe(paleta, x.degradado.de)}, ${colorDe(paleta, x.degradado.a)})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' });
  if (x.fondo) {
    const f = x.fondo;
    if (f.tipo === 'subrayado') st.boxShadow = `inset 0 -0.3em 0 ${colorDe(paleta, f.color)}`;
    else if (f.tipo === 'marco') st.border = `${Math.max(1, 2 * escala)}px solid ${colorDe(paleta, x.trazo?.color ?? f.color)}`;
    else st.background = colorDe(paleta, f.color);
    st.padding = `${f.pad * 0.6}em ${f.pad * 1.4}em`;
    st.borderRadius = f.tipo === 'burbuja' ? '1em' : f.radio * escala;
    if (f.tipo === 'cinta') st.transform = 'rotate(-2deg)';
  }
  return st;
};

// ——— Selección y operaciones rápidas ———
/** Textos seleccionados (la selección principal y la múltiple). */
export const textosSel = (): { escena: string; id: string }[] => {
  const s = useEd.getState();
  const todos = [s.sel, ...s.multi].filter((x): x is Extract<Sel, { tipo: 'texto' }> => x?.tipo === 'texto');
  const vistos = new Set<string>();
  return todos.filter((x) => (vistos.has(x.id) ? false : (vistos.add(x.id), true))).map((x) => ({ escena: x.escena, id: x.id }));
};
export const editarTextos = (etiqueta: string, lista: { escena: string; id: string }[], fn: (t: Draft<TTexto>) => void) =>
  useEd.getState().editar(etiqueta, (d) => {
    for (const r of lista) {
      const t = d.escenas.find((e) => e.id === r.escena)?.textos.find((x) => x.id === r.id);
      if (t) fn(t);
    }
  });
export const todosLosTextos = (p: TProyecto, soloTitulos = true) => p.escenas.flatMap((e) => e.textos.filter((t) => !soloTitulos || t.tipo !== 'nota').map((t) => ({ escena: e.id, id: t.id })));

/** Las propiedades de «estilo» de un texto (lo que se copia y pega). */
const CLAVES_ESTILO = ['fuente', 'color', 'acento', 'tam', 'estilo', 'animacion', 'salida', 'bucle', 'durEntrada', 'durSalida', 'brillo', 'escalonado', 'interlineado', 'alinear'] as const;
export const estiloDe = (t: TTexto) => JSON.parse(JSON.stringify(Object.fromEntries(CLAVES_ESTILO.filter((k) => (t as any)[k] !== undefined).map((k) => [k, (t as any)[k]]))));
export const ponerEstilo = (t: Draft<TTexto>, e: Record<string, any>, conTam = true) => {
  for (const k of CLAVES_ESTILO) {
    if (!conTam && (k === 'tam' || k === 'alinear')) continue;
    if (k in e) (t as any)[k] = JSON.parse(JSON.stringify(e[k]));
    else if (k !== 'tam' && k !== 'color' && k !== 'animacion' && k !== 'escalonado' && k !== 'alinear') delete (t as any)[k];
  }
};
let portapapeles: Record<string, any> | null = null;
export const copiarEstilo = () => {
  const s = useEd.getState();
  if (s.sel?.tipo !== 'texto') return s.avisar('Selecciona un texto para copiar su estilo');
  const sel = s.sel;
  const t = s.proyecto?.escenas.find((e) => e.id === sel.escena)?.textos.find((x) => x.id === sel.id);
  if (!t) return;
  portapapeles = estiloDe(t);
  s.avisar('Estilo copiado (Ctrl+Alt+V para pegarlo)', 'ok');
};
export const pegarEstilo = () => {
  const s = useEd.getState();
  if (!portapapeles) return s.avisar('Primero copia un estilo (Ctrl+Alt+C)');
  const lista = textosSel();
  if (!lista.length) return s.avisar('Selecciona uno o varios textos');
  const e = portapapeles;
  editarTextos('pegar-estilo', lista, (t) => ponerEstilo(t, e, false));
  if (e.fuente) instalarFuente(e.fuente).catch(() => {});
  s.avisar(`Estilo pegado en ${lista.length} texto(s)`, 'ok');
};
export const estiloEnTodos = () => {
  const s = useEd.getState();
  if (s.sel?.tipo !== 'texto' || !s.proyecto) return s.avisar('Selecciona el texto cuyo estilo quieres usar en todos');
  const sel = s.sel;
  const t = s.proyecto.escenas.find((e) => e.id === sel.escena)?.textos.find((x) => x.id === sel.id);
  if (!t) return;
  const e = estiloDe(t);
  const lista = todosLosTextos(s.proyecto).filter((x) => x.id !== t.id);
  editarTextos('estilo-todos', lista, (x) => ponerEstilo(x, e, false));
  s.avisar(`Estilo aplicado a ${lista.length} titulares`, 'ok');
};

/** Aplica un estilo de la galería a la selección (o crea un texto nuevo si no hay ninguno seleccionado). */
export const aplicarPreset = async (pr: PresetTexto, crear: (o: Partial<TTexto>) => void) => {
  const s = useEd.getState();
  const lista = textosSel();
  const datos: Record<string, any> = { fuente: pr.fuente, color: pr.color, estilo: pr.estilo };
  if (pr.acento) datos.acento = pr.acento;
  if (pr.animacion) datos.animacion = pr.animacion;
  try {
    await instalarFuente(pr.fuente);
  } catch (e: any) {
    s.avisar(`No se pudo copiar la tipografía: ${e.message}`, 'error');
  }
  if (!lista.length) return crear({ ...datos, texto: pr.estilo.mayusculas ? 'TU TEXTO *AQUÍ*' : 'Tu texto *aquí*.' });
  editarTextos('preset', lista, (t) => {
    Object.assign(t, JSON.parse(JSON.stringify(datos)));
    if (!pr.acento) delete t.acento;
  });
  s.avisar(`Estilo «${pr.nombre}» aplicado`, 'ok');
};

// ——— Estilos guardados por el usuario ———
let propios: PresetTexto[] | null = null;
const oyentesP = new Set<(x: PresetTexto[]) => void>();
export const usePropios = () => {
  const [l, setL] = useState<PresetTexto[]>(propios ?? []);
  useEffect(() => {
    oyentesP.add(setL);
    if (!propios)
      fetch('/api/estilos-usuario')
        .then((r) => r.json())
        .then((x) => ((propios = Array.isArray(x) ? x : []), oyentesP.forEach((f) => f(propios!))))
        .catch(() => {});
    return () => void oyentesP.delete(setL);
  }, []);
  return l;
};
export const guardarComoEstilo = async (t: TTexto, nombre: string) => {
  const nuevo: PresetTexto = { id: `propio-${Date.now().toString(36)}`, nombre, categoria: 'Mis estilos', fuente: t.fuente ?? 'Geist', color: t.color, acento: t.acento, estilo: JSON.parse(JSON.stringify(t.estilo ?? {})), animacion: t.animacion };
  propios = [nuevo, ...(propios ?? [])];
  oyentesP.forEach((f) => f(propios!));
  await fetch('/api/estilos-usuario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(propios) });
  return nuevo;
};
export const borrarEstiloPropio = async (id: string) => {
  propios = (propios ?? []).filter((x) => x.id !== id);
  oyentesP.forEach((f) => f(propios!));
  await fetch('/api/estilos-usuario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(propios) });
};

export { api };
