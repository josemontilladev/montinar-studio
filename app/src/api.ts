/** Llamadas al servidor del editor. */
export type Medio = { ruta: string; tipo: 'video' | 'imagen' | 'audio'; tam: number; dur?: number; ancho?: number; alto?: number; mtime: number };
export type Voz = { id: string; motor: string; nombre: string };
export type Trabajo = {
  id: string;
  tipo: 'voz' | 'exportar' | 'fotograma' | 'subtitulos' | 'audio' | 'analisis' | 'proxy' | 'ia' | 'captura';
  titulo: string;
  estado: 'corriendo' | 'hecho' | 'error' | 'cancelado';
  progreso: number;
  etapa: string;
  log: string[];
  resultado?: any;
  error?: string;
  inicio: number;
  fin?: number;
};
export type Version = { nombre: string; tam: number; mtime: number };

const j = async <T>(r: Response): Promise<T> => {
  const t = await r.text();
  let d: any;
  try {
    d = t ? JSON.parse(t) : {};
  } catch {
    throw new Error(t.slice(0, 200) || `HTTP ${r.status}`);
  }
  if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`);
  return d as T;
};
const post = <T>(url: string, body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<T>(r));

export const api = {
  estado: () => fetch('/api/estado').then((r) => j<{ proyecto: string; descriptor: any; contratoIgual: boolean; mtime: number; picosSeg: number }>(r)),
  proyecto: () => fetch('/api/proyecto', { cache: 'no-store' }).then((r) => j<unknown>(r)),
  guardar: (proyecto: unknown, version = false, motivo?: string) =>
    fetch('/api/proyecto', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proyecto, version, motivo }) }).then((r) => j<{ ok: boolean; mtime: number; version: string | null }>(r)),
  versiones: () => fetch('/api/versiones').then((r) => j<Version[]>(r)),
  version: (n: string) => fetch(`/api/versiones/${encodeURIComponent(n)}`).then((r) => j<unknown>(r)),
  medios: () => fetch('/api/medios').then((r) => j<Medio[]>(r)),
  voces: () => fetch('/api/voces').then((r) => j<{ voces: Voz[]; porDefecto: string; edge: string | null; disponible: boolean }>(r)),
  ondas: (src: string) => fetch(`/api/ondas?src=${encodeURIComponent(src)}`).then((r) => j<{ picosSeg: number; picos: number[] }>(r)),
  subir: (f: File, carpeta: string) =>
    fetch(`/api/subir?carpeta=${encodeURIComponent(carpeta)}&nombre=${encodeURIComponent(f.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f }).then((r) => j<{ ok: boolean; ruta: string }>(r)),
  voz: (b: { id: string; texto: string; dicho?: string; voz?: string; archivoActual?: string }) => post<{ trabajo: Trabajo; archivado: string | null }>('/api/trabajos/voz', b),
  exportar: (b: { proyecto: unknown; formato: string; calidad: string; rango?: [number, number] | null; nombre?: string; codec?: string; encuadre?: string; subtitulos?: string; srt?: string; vtt?: string; plataforma?: string; normalizar?: number | null }) => post<{ trabajo: Trabajo }>('/api/trabajos/exportar', b),
  fotograma: (b: { proyecto: unknown; formato: string; frame: number; nombre?: string; portada?: { titulo: string; subtitulo?: string } | null; encuadre?: string }) => post<{ trabajo: Trabajo }>('/api/trabajos/fotograma', b),
  subtitulos: (items: { id: string; src: string; texto?: string }[], modelo: string) => post<{ trabajo: Trabajo }>('/api/trabajos/subtitulos', { items, modelo }),
  marcas: () => fetch('/api/marcas').then((r) => j<{ id: string; nombre: string; kit: any; fecha: string }[]>(r)),
  guardarMarca: (nombre: string, kit: unknown) => post<{ id: string }>('/api/marcas', { nombre, kit }),
  aplicarMarca: (id: string) => post<any>(`/api/marcas/${encodeURIComponent(id)}/aplicar`, {}),
  mejorarVoz: (frases: { id: string; src: string }[], objetivo = -16) => post<{ trabajo: Trabajo }>('/api/trabajos/mejorar-voz', { frases, objetivo }),
  ritmo: (src: string) => post<{ bpm: number; beats: number[] }>('/api/ritmo', { src }),
  sonoridad: (proyecto: unknown) => post<{ trabajo: Trabajo }>('/api/trabajos/sonoridad', { proyecto }),
  sfxBiblioteca: () => fetch('/api/sfx-biblioteca').then((r) => j<string[]>(r)),
  importarSfx: (nombre: string) => post<{ ruta: string }>('/api/sfx-biblioteca/importar', { nombre }),
  cancelar: (id: string) => post<{ ok: boolean }>(`/api/trabajos/${id}/cancelar`, {}),
  proxies: () => fetch('/api/proxies').then((r) => j<{ src: string; estado: 'listo' | 'generando' | 'no'; pesado: boolean }[]>(r)),
  generarProxy: (b: { src?: string; pesados?: boolean }) => post<Trabajo[]>('/api/proxies/generar', b),
  mostrar: (archivo: string) => post<{ ok: boolean }>('/api/mostrar', { archivo }),
};
