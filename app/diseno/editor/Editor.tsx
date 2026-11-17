/** El editor de un diseño: barra, herramientas e inserción a la izquierda, lienzo y páginas, propiedades y capas a la derecha. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookImage, Images, PaintBucket, Shapes, Stamp, Type, Upload } from 'lucide-react';
import type { Diseno, Elemento, Pagina } from '../esquema';
import { paginaVacia } from '../esquema';
import { apiDisenos, urlRecurso, type MiImagen } from '../api';
import { avisar, ElegirFormato, pedirTexto } from '../Dialogos';
import { DialogoExportar } from '../DialogoExportar';
import { useHistorial } from './historial';
import { useGuardado } from './guardado';
import { useTeclas } from './teclas';
import { addElements, alinear, cambiarTamano, clonar, distribuir, duplicateElements, fitText, mapElements, moveToIndex, removeElements, reorder, translate } from './operaciones';
import { makeArt, makeImage, paginaDesdePortada } from './fabrica';
import type { Point } from './geometria';
import { RecursoCtx } from './Lienzo';
import { Escenario, ZOOM_MAX, ZOOM_MIN, type Zoom } from './Escenario';
import { Propiedades } from './Propiedades';
import type { Acciones } from './Organizar';
import { Capas } from './Capas';
import { Paginas } from './Paginas';
import { BarraEditor } from './BarraEditor';
import { PanelBiblioteca } from './PanelBiblioteca';
import { PanelFondo, PanelFormas, PanelImagenes, PanelMarca, PanelPortadas, PanelTexto } from './PanelesInsertar';

const TABS = [
  { id: 'biblioteca', label: 'Librería', Icon: Images },
  { id: 'portadas', label: 'Portadas', Icon: BookImage },
  { id: 'texto', label: 'Texto', Icon: Type },
  { id: 'formas', label: 'Formas', Icon: Shapes },
  { id: 'imagenes', label: 'Imágenes', Icon: Upload },
  { id: 'marca', label: 'Marca', Icon: Stamp },
  { id: 'fondo', label: 'Fondo', Icon: PaintBucket },
] as const;
type Tab = (typeof TABS)[number]['id'];

/** Portapapeles de elementos (sirve entre diseños: se recuerda de qué diseño vienen las imágenes). */
const PORTA = 'estudio-portapapeles';
const leerPorta = (): { de: string; els: Elemento[] } | null => {
  try {
    return JSON.parse(localStorage.getItem(PORTA) ?? 'null');
  } catch {
    return null;
  }
};

const natural = (url: string) =>
  new Promise<{ w: number; h: number }>((ok) => {
    const i = new Image();
    i.onload = () => ok({ w: i.naturalWidth || 800, h: i.naturalHeight || 600 });
    i.onerror = () => ok({ w: 800, h: 600 });
    i.src = url;
  });

export function Editor({ id, inicial, onSalir, onVideo, onRenombrado }: { id: string; inicial: Diseno; onSalir: () => void; onVideo: () => void; onRenombrado: (id: string, doc: Diseno) => void }) {
  const hist = useHistorial(inicial);
  const doc = hist.doc;
  const tam = useMemo(() => ({ w: doc.ancho, h: doc.alto }), [doc.ancho, doc.alto]);
  const [pi, setPi] = useState(0);
  const idx = Math.min(pi, doc.paginas.length - 1);
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const pagina = doc.paginas[idx];
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('biblioteca');
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [fit, setFit] = useState(0.3);
  const [snap, setSnap] = useState(true);
  const [dialogo, setDialogo] = useState<'tamano' | 'exportar' | null>(null);
  const [versionImg, setVersionImg] = useState(0);
  const { estado, guardar } = useGuardado(id, doc);
  const scale = zoom === 'fit' ? fit : zoom;

  const live = new Set(pagina.elements.map((e) => e.id));
  const sel = selected.filter((s) => live.has(s));
  const cur = () => hist.current().paginas[idxRef.current];
  const conPagina = (d: Diseno, p: Pagina): Diseno => ({ ...d, paginas: d.paginas.map((x, j) => (j === idxRef.current ? p : x)) });
  const commitP = (p: Pagina, key?: string) => hist.commit(conPagina(hist.current(), p), key);
  const histPag = useMemo(() => ({ current: () => hist.current().paginas[idxRef.current], preview: (p: Pagina) => hist.preview({ ...hist.current(), paginas: hist.current().paginas.map((x, j) => (j === idxRef.current ? p : x)) }), begin: hist.begin, end: hist.end }), [hist.begin, hist.end, hist.preview, hist.current]);

  const irPagina = (i: number) => {
    setPi(i);
    setSelected([]);
    setEditingId(null);
  };
  const add = (els: Elemento[]) => {
    if (!els.length) return;
    commitP(addElements(cur(), els));
    setSelected(els.map((e) => e.id));
  };
  const addArt = (key: string, at?: Point) => {
    const el = makeArt(cur(), key, tam, at);
    if (el) add([el]);
  };
  const addImagen = async (src: string, at?: Point) => add([makeImage(cur(), src, await natural(urlRecurso(id, src)), tam, at)]);
  const subir = async (files: File[], at?: Point) => {
    const imgs = files.filter((f) => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(f.name));
    if (!imgs.length) return avisar('Suelta archivos de imagen (PNG, JPG, WebP, SVG…)', 'error');
    for (const [k, f] of imgs.entries()) {
      try {
        const { src } = await apiDisenos.subirImagen(id, f);
        await addImagen(src, at ? { x: at.x + k * 30, y: at.y + k * 30 } : undefined);
      } catch (e: any) {
        avisar(e.message, 'error');
      }
    }
    setVersionImg((v) => v + 1);
  };
  const usarMia = async (m: MiImagen, at?: Point) => {
    try {
      const { src } = await apiDisenos.importar(id, m.id, m.src);
      await addImagen(src, at);
    } catch (e: any) {
      avisar(e.message, 'error');
    }
  };

  const actions: Acciones = {
    patch: (ids, fn, k) => commitP(mapElements(cur(), ids, fn), k ? `${k}:${ids.join(',')}` : undefined),
    duplicate: () => {
      if (!sel.length) return;
      const r = duplicateElements(cur(), sel);
      commitP(r.page);
      setSelected(r.ids);
    },
    remove: () => {
      if (!sel.length) return;
      commitP(removeElements(cur(), sel));
      setSelected([]);
      setEditingId(null);
    },
    layer: (m) => commitP(reorder(cur(), sel, m)),
    toggleLock: () => {
      const todos = cur().elements.filter((e) => sel.includes(e.id)).every((e) => e.locked);
      commitP(mapElements(cur(), sel, (e) => ({ ...e, locked: todos ? undefined : true })));
    },
    align: (m) => commitP(alinear(cur(), sel, m, tam)),
    distribute: (eje) => commitP(distribuir(cur(), sel, eje)),
  };

  const copiar = () => {
    const els = cur().elements.filter((e) => sel.includes(e.id));
    if (els.length) localStorage.setItem(PORTA, JSON.stringify({ de: id, els }));
    return els.length;
  };
  const pegar = async (files: File[]) => {
    if (files.length) return subir(files);
    const p = leerPorta();
    if (!p?.els.length) return;
    let els = p.els;
    if (p.de !== id)
      els = await Promise.all(els.map(async (e) => (e.type === 'image' ? { ...e, src: (await apiDisenos.importar(id, p.de, e.src).catch(() => ({ src: e.src }))).src } : e)));
    const copias = clonar(cur(), els, p.de === id ? 24 : 0);
    add(copias);
    localStorage.setItem(PORTA, JSON.stringify({ de: id, els: copias }));
  };
  const zoomA = (z: 'fit' | 'mas' | 'menos' | 1) => setZoom(z === 'fit' || z === 1 ? z : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(scale * (z === 'mas' ? 1.25 : 0.8) * 100) / 100)));
  const guardarYa = () => guardar(true).then(() => avisar('Diseño guardado', 'ok'));

  useTeclas(
    {
      undo: hist.undo,
      redo: hist.redo,
      remove: actions.remove,
      duplicate: actions.duplicate,
      nudge: (dx, dy) => commitP(translate(cur(), sel, dx, dy), `nudge:${sel.join(',')}`),
      escape: () => (setEditingId(null), setSelected([])),
      selectAll: () => setSelected(cur().elements.map((e) => e.id)),
      enter: () => {
        const el = cur().elements.find((e) => e.id === sel[0]);
        if (sel.length === 1 && el?.type === 'text' && !el.locked) setEditingId(el.id);
      },
      copy: () => void copiar(),
      cut: () => copiar() && actions.remove(),
      paste: (f) => void pegar(f),
      save: () => void guardarYa(),
      zoom: zoomA,
      hasSelection: () => sel.length > 0,
    },
    dialogo === null,
  );

  // páginas
  const paginas = (fn: (l: Pagina[]) => Pagina[]) => hist.commit({ ...hist.current(), paginas: fn(hist.current().paginas) });
  const nuevaPagina = () => {
    paginas((l) => [...l.slice(0, idx + 1), paginaVacia(cur().background), ...l.slice(idx + 1)]);
    irPagina(idx + 1);
  };
  const duplicarPagina = (i: number) => {
    const p = hist.current().paginas[i];
    paginas((l) => [...l.slice(0, i + 1), { ...structuredClone(p), id: paginaVacia().id }, ...l.slice(i + 1)]);
    irPagina(i + 1);
  };
  const borrarPagina = (i: number) => {
    paginas((l) => l.filter((_, j) => j !== i));
    irPagina(Math.max(0, i - 1));
  };
  const moverPagina = (de: number, a: number) => {
    paginas((l) => {
      const c = [...l];
      const [p] = c.splice(de, 1);
      c.splice(a, 0, p);
      return c;
    });
    irPagina(a);
  };

  const renombrar = async () => {
    const n = await pedirTexto('Renombrar diseño', 'Nombre', doc.nombre);
    if (!n || n === doc.nombre) return;
    hist.commit({ ...hist.current(), nombre: n });
    await guardar(false);
    try {
      const r = await apiDisenos.renombrar(id, n);
      onRenombrado(r.id, hist.current());
    } catch (e: any) {
      avisar(e.message, 'error');
    }
  };

  // al abrir: miniatura al día (los diseños recién creados aún no tienen)
  useEffect(() => {
    const t = setTimeout(() => guardar(true), 600);
    return () => clearTimeout(t);
  }, [guardar]);

  // para el menú de la app de escritorio
  useEffect(() => {
    (window as any).__guardar = () => guardar(true);
    // estado para pruebas automáticas / consola
    (window as any).__disenoActual = () => ({ id, doc: hist.current(), pagina: idxRef.current });
    return () => {
      delete (window as any).__guardar;
      delete (window as any).__disenoActual;
    };
  }, [guardar]);

  const onFitScale = useCallback((s: number) => setFit(s), []);
  const resolver = useCallback((src: string) => urlRecurso(id, src), [id]);
  const salir = (fn: () => void) => () => void guardar(true).finally(fn);

  return (
    <RecursoCtx.Provider value={resolver}>
      <div className="flex h-full flex-col" data-editor-diseno>
        <BarraEditor
          nombre={doc.nombre}
          tam={tam}
          estado={estado}
          canUndo={hist.canUndo}
          canRedo={hist.canRedo}
          scale={scale}
          zoom={zoom}
          snap={snap}
          onVolver={salir(onSalir)}
          onVideo={salir(onVideo)}
          onRenombrar={renombrar}
          onUndo={hist.undo}
          onRedo={hist.redo}
          onZoom={setZoom}
          onSnap={() => setSnap(!snap)}
          onTamano={() => setDialogo('tamano')}
          onGuardar={guardarYa}
          onExportar={() => setDialogo('exportar')}
        />
        <div className="flex min-h-0 flex-1">
          <nav className="flex w-[4.5rem] shrink-0 flex-col gap-0.5 border-r border-base-300 bg-fondo p-1.5" aria-label="Herramientas">
            {TABS.map(({ id: t, label, Icon }) => (
              <button key={t} type="button" data-tab={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[0.62rem] font-medium transition ${tab === t ? 'bg-panel3 text-primary' : 'text-base-content/55 hover:bg-base-100 hover:text-base-content'}`}>
                <Icon className="size-[1.15rem]" />
                {label}
              </button>
            ))}
          </nav>
          <aside className="w-72 shrink-0 overflow-y-auto border-r border-base-300 bg-base-100 p-3" data-panel={tab}>
            {tab === 'biblioteca' ? <PanelBiblioteca onAdd={(k) => addArt(k)} /> : null}
            {tab === 'portadas' ? <PanelPortadas onPortada={(k) => (commitP(paginaDesdePortada(cur(), k, tam)), setSelected([]))} /> : null}
            {tab === 'texto' ? <PanelTexto pagina={pagina} tam={tam} onAdd={add} /> : null}
            {tab === 'formas' ? <PanelFormas pagina={pagina} tam={tam} onAdd={add} /> : null}
            {tab === 'imagenes' ? <PanelImagenes onFiles={(f) => subir(f)} onMia={(m) => usarMia(m)} version={versionImg} /> : null}
            {tab === 'marca' ? <PanelMarca pagina={pagina} tam={tam} onAdd={add} onAddArt={(k) => addArt(k)} /> : null}
            {tab === 'fondo' ? <PanelFondo pagina={pagina} onChange={(p, k) => commitP({ ...cur(), ...p }, k)} /> : null}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <Escenario
              pagina={pagina}
              tam={tam}
              selected={sel}
              onSelect={setSelected}
              hist={histPag}
              zoom={zoom}
              setZoom={setZoom}
              onFitScale={onFitScale}
              editingId={editingId}
              onEditText={setEditingId}
              onTextChange={(eid, text) => actions.patch([eid], (e) => (e.type === 'text' ? fitText({ ...e, text }) : e), 'inline')}
              onDropArt={(k, at) => addArt(k, at)}
              onDropImagen={(json, at) => usarMia(JSON.parse(json), at)}
              onDropFiles={(f, at) => subir(f, at)}
              snap={snap}
            />
            <Paginas paginas={doc.paginas} tam={tam} actual={idx} onIr={irPagina} onNueva={nuevaPagina} onDuplicar={duplicarPagina} onBorrar={borrarPagina} onMover={moverPagina} />
          </div>
          <aside className="flex w-64 shrink-0 flex-col border-l border-base-300 bg-base-100" aria-label="Propiedades">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Propiedades pagina={pagina} selected={sel} actions={actions} />
            </div>
            <div className="flex max-h-[38%] min-h-[9rem] flex-col border-t border-base-300">
              <h3 className="px-3 pb-1 pt-2.5 text-[0.7rem] font-semibold uppercase tracking-wide text-base-content/60">Capas</h3>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Capas pagina={pagina} selected={sel} onSelect={setSelected} onMove={(eid, i) => commitP(moveToIndex(cur(), eid, i))} onLock={(eid) => commitP(mapElements(cur(), [eid], (e) => ({ ...e, locked: e.locked ? undefined : true })))} />
              </div>
            </div>
          </aside>
        </div>
      </div>
      {dialogo === 'tamano' ? (
        <ElegirFormato
          titulo="Cambiar tamaño"
          boton="Cambiar tamaño"
          actual={tam}
          conEscalar
          onCerrar={() => setDialogo(null)}
          onElegir={(f, w, h, escalar) => {
            hist.commit({ ...cambiarTamano(hist.current(), w, h, escalar), formato: f });
            setDialogo(null);
            setZoom('fit');
          }}
        />
      ) : null}
      {dialogo === 'exportar' ? <DialogoExportar id={id} doc={doc} actual={idx} onCerrar={() => setDialogo(null)} /> : null}
    </RecursoCtx.Provider>
  );
}
