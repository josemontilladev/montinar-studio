/** Menús contextuales (clic derecho) de escenas, textos y elementos, y el componente que los dibuja. */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fondoCierra } from './campos';
import { useEd, irA, type ItemMenu } from './estado';
import { Ico } from './iconos';
import { accionBorrar, accionDividir, accionDuplicar } from './Linea';
import { abrirBiblioteca } from './Biblioteca';
import { copiarEstilo, estiloEnTodos, guardarComoEstilo, pegarEstilo } from './libreria';

const abrir = (x: number, y: number, items: ItemMenu[]) => useEd.setState({ menu: { x, y, items } });

/** Si el clic derecho cae fuera de la selección, se selecciona lo clicado. */
const asegurar = (sel: any) => {
  const s = useEd.getState();
  const dentro = [s.sel, ...s.multi].some((x) => JSON.stringify(x) === JSON.stringify(sel));
  if (!dentro) useEd.setState({ sel, multi: [] });
};

export const menuEscena = (x: number, y: number, id: string) => {
  asegurar({ tipo: 'escena', id });
  const e = useEd.getState().proyecto!.escenas.find((z) => z.id === id)!;
  abrir(x, y, [
    { et: 'Dividir en el cursor', ico: 'dividir', atajo: 'S', fn: accionDividir },
    { et: 'Duplicar', ico: 'duplicar', atajo: 'Ctrl+D', fn: accionDuplicar },
    'sep',
    { et: 'Filtros…', ico: 'filtro', fn: () => abrirBiblioteca('filtros') },
    { et: 'Efectos…', ico: 'efectos', fn: () => abrirBiblioteca('efectos', 'biblioteca') },
    { et: 'Transición de entrada…', ico: 'trans', fn: () => abrirBiblioteca('trans') },
    { et: 'Añadir elemento…', ico: 'formas', fn: () => abrirBiblioteca('elementos') },
    {
      et: 'Usar su filtro y efectos en todas',
      ico: 'pincel',
      fn: () => {
        const s = useEd.getState();
        s.editar('look-todas', (d) => {
          for (const z of d.escenas) {
            z.filtro = e.filtro ? { ...e.filtro } : null;
            z.extras = JSON.parse(JSON.stringify(e.extras ?? []));
          }
        });
        s.avisar('Filtro y efectos copiados a todas las escenas', 'ok');
      },
    },
    { et: 'Quitar filtro y efectos', ico: 'reiniciar', fn: () => useEd.getState().editar('look-0', (d) => void d.escenas.forEach((z) => (z.id === id || useEd.getState().multi.some((m) => m.tipo === 'escena' && m.id === z.id)) && ((z.filtro = null), (z.extras = [])))) },
    'sep',
    { et: 'Borrar', ico: 'borrar', atajo: 'Supr', fn: accionBorrar, peligro: true },
  ]);
};

export const menuTexto = (x: number, y: number, escena: string, id: string) => {
  asegurar({ tipo: 'texto', escena, id });
  const s = useEd.getState();
  const t = s.proyecto!.escenas.find((z) => z.id === escena)?.textos.find((z) => z.id === id);
  if (!t) return;
  abrir(x, y, [
    {
      et: 'Editar en el visor',
      ico: 'editar',
      atajo: 'Doble clic',
      fn: () => {
        const l = useEd.getState().linea!;
        const r = l.escenas.find((z) => z.id === escena)!;
        const tt = l.textos.find((z) => z.escena === escena && z.texto.id === id);
        if (tt && (useEd.getState().frame < tt.inicio || useEd.getState().frame >= tt.fin)) irA(tt.inicio + Math.round(l.fps * 0.8));
        else if (!tt) irA(r.inicio);
        useEd.setState({ editando: { escena, id } });
      },
    },
    { et: 'Tipografía…', ico: 'fuente', atajo: 'T', fn: () => useEd.setState({ dialogo: 'fuentes' }) },
    { et: 'Estilos de texto…', ico: 'texto', fn: () => abrirBiblioteca('texto', 'estilos') },
    { et: 'Animaciones…', ico: 'varita', fn: () => abrirBiblioteca('texto', 'animaciones') },
    'sep',
    { et: 'Copiar estilo', ico: 'copiar', atajo: 'Ctrl+Alt+C', fn: copiarEstilo },
    { et: 'Pegar estilo', ico: 'pegar', atajo: 'Ctrl+Alt+V', fn: pegarEstilo },
    { et: 'Usar este estilo en todos los titulares', ico: 'pincel', atajo: 'Ctrl+Alt+A', fn: estiloEnTodos },
    {
      et: 'Guardar como estilo…',
      ico: 'estrella',
      fn: async () => {
        const n = await pedirTexto('Guardar como estilo', 'Nombre del estilo', t.fuente ? `${t.fuente} propio` : 'Mi estilo');
        if (!n) return;
        await guardarComoEstilo(t, n);
        useEd.getState().avisar(`Estilo «${n}» guardado en «Mis estilos»`, 'ok');
      },
    },
    'sep',
    { et: 'Duplicar', ico: 'duplicar', atajo: 'Ctrl+D', fn: accionDuplicar },
    { et: 'Borrar', ico: 'borrar', atajo: 'Supr', fn: accionBorrar, peligro: true },
  ]);
};

export const menuElemento = (x: number, y: number, escena: string, id: string) => {
  asegurar({ tipo: 'elemento', escena, id });
  const mover = (delta: number) =>
    useEd.getState().editar('el-orden', (d) => {
      const e = d.escenas.find((z) => z.id === escena)!;
      const l = e.elementos ?? [];
      const i = l.findIndex((z) => z.id === id);
      const [el] = l.splice(i, 1);
      l.splice(delta > 0 ? l.length : 0, 0, el);
    });
  abrir(x, y, [
    { et: 'Duplicar', ico: 'duplicar', atajo: 'Ctrl+D', fn: accionDuplicar },
    { et: 'Traer al frente', ico: 'capas', fn: () => mover(1) },
    { et: 'Enviar al fondo', ico: 'capas', fn: () => mover(-1) },
    {
      et: 'Intercambiar colores',
      ico: 'pincel',
      fn: () =>
        useEd.getState().editar('el-colores', (d) => {
          const el = d.escenas.find((z) => z.id === escena)!.elementos!.find((z) => z.id === id)!;
          [el.color, el.color2] = [el.color2, el.color];
        }),
    },
    { et: 'Enderezar', ico: 'girar', fn: () => useEd.getState().editar('el-rot', (d) => void (d.escenas.find((z) => z.id === escena)!.elementos!.find((z) => z.id === id)!.rot = 0)) },
    'sep',
    { et: 'Borrar', ico: 'borrar', atajo: 'Supr', fn: accionBorrar, peligro: true },
  ]);
};

export const MenuContextual: React.FC = () => {
  const menu = useEd((s) => s.menu);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (!menu || !ref.current) return setPos(null);
    const r = ref.current.getBoundingClientRect();
    setPos({ x: Math.min(menu.x, window.innerWidth - r.width - 6), y: Math.min(menu.y, window.innerHeight - r.height - 6) });
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && useEd.setState({ menu: null });
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [menu]);
  if (!menu) return null;
  const cerrar = () => useEd.setState({ menu: null });
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onPointerDown={cerrar} onContextMenu={(e) => (e.preventDefault(), cerrar())} />
      <div ref={ref} className="menu-flot menu-ctx" style={{ position: 'fixed', left: (pos ?? menu).x, top: (pos ?? menu).y, zIndex: 200, visibility: pos ? 'visible' : 'hidden' }} data-prueba="menu-contextual">
        {menu.items.map((it, i) =>
          it === 'sep' ? (
            <hr key={i} />
          ) : (
            <button key={i} className={it.peligro ? 'peligro' : ''} onClick={() => (cerrar(), it.fn())} data-menu={it.et}>
              {it.ico ? <Ico n={it.ico} s={15} /> : <span style={{ width: 15 }} />}
              <span style={{ flex: 1 }}>{it.et}</span>
              {it.atajo && <kbd>{it.atajo}</kbd>}
            </button>
          ),
        )}
      </div>
    </>
  );
};

// ——— Petición de un texto (Electron no tiene window.prompt) ———
type Pet = { titulo: string; et: string; def: string; ok: (v: string | null) => void } | null;
let peticion: Pet = null;
const oyentes = new Set<(p: Pet) => void>();
export const pedirTexto = (titulo: string, et: string, def = '') =>
  new Promise<string | null>((ok) => {
    peticion = { titulo, et, def, ok };
    oyentes.forEach((f) => f(peticion));
  });
export const Peticion: React.FC = () => {
  const [p, setP] = useState<Pet>(peticion);
  const [v, setV] = useState('');
  useEffect(() => {
    const f = (x: Pet) => (setP(x), setV(x?.def ?? ''));
    oyentes.add(f);
    return () => void oyentes.delete(f);
  }, []);
  if (!p) return null;
  const fin = (r: string | null) => {
    peticion = null;
    setP(null);
    p.ok(r);
  };
  return (
    <div className="velo" {...fondoCierra(() => fin(null))}>
      <div className="dialogo" style={{ width: 380 }} data-prueba="peticion">
        <div className="cab">
          <h3>{p.titulo}</h3>
        </div>
        <div className="cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--tenue)' }}>{p.et}</label>
          <input autoFocus type="text" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => (e.key === 'Enter' && v.trim() ? fin(v.trim()) : e.key === 'Escape' ? fin(null) : null)} data-prueba="peticion-texto" />
          <div className="fila" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn" onClick={() => fin(null)}>
              Cancelar
            </button>
            <button className="btn prim" disabled={!v.trim()} onClick={() => fin(v.trim())} data-prueba="peticion-ok">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
