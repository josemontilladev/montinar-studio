/** Llamadas al servidor del estudio de diseño (servidor/disenos.ts). */
import type { Diseno } from './esquema';

export type FichaDiseno = { id: string; nombre: string; ancho: number; alto: number; paginas: number; mtime: number; miniatura: number };
export type MiImagen = { id: string; src: string; nombre: string; mtime: number };

const json = async <T,>(r: Response): Promise<T> => {
  const d = await r.json().catch(() => ({ error: `Error ${r.status}` }));
  if (!r.ok || d?.error) throw new Error(d?.error ?? `Error ${r.status}`);
  return d as T;
};
const enviar = <T,>(url: string, body: unknown, method = 'POST') => fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => json<T>(r));
const e = encodeURIComponent;

export const apiDisenos = {
  listar: () => fetch('/api/disenos').then((r) => json<{ carpeta: string; exportar: string; disenos: FichaDiseno[] }>(r)),
  crear: (doc: Diseno) => enviar<{ id: string }>('/api/disenos/nuevo', { doc }),
  abrir: (id: string) => fetch(`/api/disenos/${e(id)}`).then((r) => json<Diseno>(r)),
  guardar: (id: string, doc: Diseno, miniatura?: string) => enviar<{ ok: true; mtime: number }>(`/api/disenos/${e(id)}`, { doc, miniatura }, 'PUT'),
  duplicar: (id: string) => enviar<{ id: string }>(`/api/disenos/${e(id)}/duplicar`, {}),
  renombrar: (id: string, nombre: string) => enviar<{ id: string }>(`/api/disenos/${e(id)}/renombrar`, { nombre }),
  borrar: (id: string) => enviar<{ ok: true }>(`/api/disenos/${e(id)}/borrar`, {}),
  subirImagen: (id: string, f: File) => fetch(`/api/disenos/${e(id)}/imagen?nombre=${e(f.name || 'imagen.png')}`, { method: 'POST', body: f }).then((r) => json<{ src: string }>(r)),
  misImagenes: () => fetch('/api/disenos-imagenes').then((r) => json<MiImagen[]>(r)),
  importar: (id: string, de: string, src: string) => enviar<{ src: string }>(`/api/disenos/${e(id)}/importar`, { de, src }),
  exportar: (nombre: string, datos: string) => enviar<{ archivo: string }>('/api/disenos-exportar', { nombre, datos }),
  mostrar: (archivo?: string) => enviar<{ ok: true }>('/api/disenos-mostrar', { archivo }),
};

export const urlRecurso = (id: string, src: string, v?: number) => `/api/disenos/${e(id)}/recurso?f=${e(src)}${v ? `&v=${Math.round(v)}` : ''}`;
