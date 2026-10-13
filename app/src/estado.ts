/** Estado del editor (zustand): proyecto + historial (deshacer/rehacer), selección, reproductor, ajustes de vista. */
import { create } from 'zustand';
import { produce, type Draft } from 'immer';
import type { PlayerRef } from '@remotion/player';
import type { Formato, TProyecto } from '@contrato/esquema';
import { resolverLinea, type Linea } from '@contrato/linea';
import type { Medio, Trabajo, Voz } from './api';

export type Sel =
  | { tipo: 'escena'; id: string }
  | { tipo: 'texto'; escena: string; id: string }
  | { tipo: 'elemento'; escena: string; id: string }
  | { tipo: 'frase'; id: string }
  | { tipo: 'sfx'; id: string }
  | { tipo: 'transicion'; id: string }
  | { tipo: 'musica' }
  | { tipo: 'subtitulos' }
  | { tipo: 'proyecto' };

export type ItemMenu = { et: string; ico?: string; atajo?: string; fn: () => void; peligro?: boolean } | 'sep';
export type Aviso = { texto: string; tipo: 'info' | 'ok' | 'error'; t: number };

type Estado = {
  proyecto: TProyecto | null;
  linea: Linea | null;
  pasado: TProyecto[];
  futuro: TProyecto[];
  ultima: { etiqueta: string; t: number } | null;
  sel: Sel | null;
  frame: number;
  reproduciendo: boolean;
  guardado: 'guardado' | 'pendiente' | 'guardando' | 'error';
  errorGuardado?: string;
  ultimoGuardado?: number;
  medios: Medio[];
  voces: Voz[];
  vozDefecto: string;
  trabajos: Trabajo[];
  picosSeg: number;
  /** px por fotograma en la línea de tiempo */
  pxf: number;
  iman: boolean;
  bucle: boolean;
  zonas: boolean;
  formatoVista: Formato;
  zoomVisor: number; // 0 = ajustar
  aviso: Aviso | null;
  dialogo: null | 'exportar' | 'versiones' | 'atajos' | 'revision' | 'dependencias' | 'fuentes' | 'grabar' | 'inicio';
  /** escena que espera un clic en el visor para «zoom a un punto» */
  elegirPunto: string | null;
  /** herramienta de la línea de tiempo, pistas bloqueadas y ocultas/silenciadas en la vista previa */
  herramienta: 'seleccion' | 'cuchilla';
  bloqueadas: string[];
  ocultas: string[];
  /** selección múltiple (Ctrl+clic): edición por lotes */
  multi: Sel[];
  /** menú contextual abierto */
  menu: { x: number; y: number; items: ItemMenu[] } | null;
  /** texto que se está editando en el visor (doble clic) */
  editando: { escena: string; id: string } | null;
  /** vista previa temporal al pasar el ratón por una ficha (no entra en el historial ni se guarda) */
  previa: ((p: TProyecto) => TProyecto) | null;
  /** proxies de vista previa: estado por medio y si se usan */
  proxies: Record<string, 'listo' | 'generando' | 'no'>;
  usarProxies: boolean;

  cargar: (p: TProyecto) => void;
  editar: (etiqueta: string, fn: (d: Draft<TProyecto>) => void) => void;
  reemplazar: (p: TProyecto, etiqueta: string) => void;
  deshacer: () => void;
  rehacer: () => void;
  set: (d: Partial<Estado>) => void;
  avisar: (texto: string, tipo?: Aviso['tipo']) => void;
};

const MAX_HIST = 300;

export const useEd = create<Estado>((set, get) => ({
  proyecto: null,
  linea: null,
  pasado: [],
  futuro: [],
  ultima: null,
  sel: null,
  frame: 0,
  reproduciendo: false,
  guardado: 'guardado',
  medios: [],
  voces: [],
  vozDefecto: '',
  trabajos: [],
  picosSeg: 50,
  pxf: 3,
  iman: true,
  bucle: false,
  zonas: false,
  formatoVista: '9:16',
  zoomVisor: 0,
  aviso: null,
  dialogo: null,
  elegirPunto: null,
  herramienta: 'seleccion',
  bloqueadas: [],
  ocultas: [],
  multi: [],
  menu: null,
  editando: null,
  previa: null,
  proxies: {},
  usarProxies: (() => {
    try {
      return localStorage.getItem('studio.proxies') !== 'no';
    } catch {
      return true;
    }
  })(),

  cargar: (p) => set({ proyecto: p, linea: resolverLinea(p), pasado: [], futuro: [], ultima: null }),

  /**
   * Cambio deshacible. Cambios seguidos con la misma etiqueta (escribir, arrastrar) se agrupan en un solo paso
   * de historial si llegan con menos de 1,2 s de diferencia.
   */
  editar: (etiqueta, fn) => {
    const { proyecto, pasado, ultima } = get();
    if (!proyecto) return;
    const nuevo = produce(proyecto, fn);
    if (nuevo === proyecto) return;
    const ahora = Date.now();
    // «drag:…» = un mismo arrastre: siempre un solo paso, aunque haya pausas
    const agrupar = !!ultima && ultima.etiqueta === etiqueta && (etiqueta.startsWith('drag:') || ahora - ultima.t < 1200);
    set({
      proyecto: nuevo,
      linea: resolverLinea(nuevo),
      pasado: agrupar ? pasado : [...pasado, proyecto].slice(-MAX_HIST),
      futuro: [],
      ultima: { etiqueta, t: ahora },
    });
  },

  reemplazar: (p, etiqueta) => {
    const { proyecto, pasado } = get();
    set({ proyecto: p, linea: resolverLinea(p), pasado: proyecto ? [...pasado, proyecto].slice(-MAX_HIST) : pasado, futuro: [], ultima: { etiqueta, t: 0 } });
  },

  deshacer: () => {
    const { proyecto, pasado, futuro } = get();
    if (!proyecto || !pasado.length) return;
    const prev = pasado[pasado.length - 1];
    set({ proyecto: prev, linea: resolverLinea(prev), pasado: pasado.slice(0, -1), futuro: [proyecto, ...futuro], ultima: null });
  },
  rehacer: () => {
    const { proyecto, pasado, futuro } = get();
    if (!proyecto || !futuro.length) return;
    const sig = futuro[0];
    set({ proyecto: sig, linea: resolverLinea(sig), pasado: [...pasado, proyecto], futuro: futuro.slice(1), ultima: null });
  },

  set: (d) => set(d as any),
  avisar: (texto, tipo = 'info') => set({ aviso: { texto, tipo, t: Date.now() } }),
}));

// ——— Reproductor (lo registra el visor) ———
export const reproductor: { ref: PlayerRef | null } = { ref: null };

export const irA = (f: number) => {
  const { linea } = useEd.getState();
  const total = linea?.total ?? 1;
  const x = Math.max(0, Math.min(total - 1, Math.round(f)));
  reproductor.ref?.seekTo(x);
  useEd.setState({ frame: x });
};

export const nid = (pre: string) => `${pre}${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`;

export const fmtT = (f: number, fps: number, conFrames = true) => {
  const s = Math.max(0, f) / fps;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ff = Math.round(f % fps);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}${conFrames ? `.${String(ff).padStart(2, '0')}` : ''}`;
};

// ——— Selección (Ctrl+clic = añadir o quitar) ———
let ctrl = false;
if (typeof window !== 'undefined') {
  const f = (e: PointerEvent | MouseEvent) => (ctrl = e.ctrlKey || e.metaKey);
  window.addEventListener('pointerdown', f, true);
  window.addEventListener('contextmenu', f, true);
}
/** ¿El último clic llevaba Ctrl? */
export const ctrlPulsado = () => ctrl;
const igual = (a: Sel | null | undefined, b: Sel) => !!a && JSON.stringify(a) === JSON.stringify(b);
export const seleccionar = (x: Sel, aditivo = ctrl) => {
  const { sel, multi } = useEd.getState();
  if (!aditivo || !sel) return useEd.setState({ sel: x, multi: [] });
  if (igual(sel, x)) {
    const [primero, ...resto] = multi;
    return useEd.setState({ sel: primero ?? null, multi: resto });
  }
  useEd.setState({ multi: multi.some((m) => igual(m, x)) ? multi.filter((m) => !igual(m, x)) : [...multi, x] });
};
export const estaSel = (s: { sel: Sel | null; multi: Sel[] }, x: Sel) => igual(s.sel, x) || s.multi.some((m) => igual(m, x));
