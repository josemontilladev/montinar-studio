/** Puente con el proceso principal (electron/publicar/index.cjs) por el IPC «accion» de la app de escritorio. */

export type Red = 'youtube' | 'linkedin';
export type EstadoPub = 'pendiente' | 'atrasada' | 'en-cola' | 'subiendo' | 'programada' | 'publicada' | 'error';

export type Archivo = { rel: string; etiqueta: string; existe: boolean; tam: number };
export type Publicacion = {
  id: string;
  red: Red;
  formato: string;
  tipo: 'video' | 'short' | 'imagen' | 'documento' | 'texto';
  pieza: string;
  fecha: string;
  hora: string;
  zona: string;
  instante: number;
  tituloCalendario: string;
  titulo: string;
  texto: string;
  comentario: string;
  lista?: string;
  etiquetas?: string[];
  alt?: string;
  video: string | null;
  miniatura?: string | null;
  subtitulos?: string | null;
  imagenes?: string[];
  archivos: Archivo[];
  faltan: string[];
  vistaPrevia: { img: string | null; video: string | null };
  sinTexto: boolean;
  editada: boolean;
  original: { titulo: string; texto: string; comentario: string; lista?: string };
  estado: EstadoPub;
  url: string | null;
  studio: string | null;
  mensaje: string | null;
  avisos: string[];
  enCola: number | null;
  subidoYa: boolean;
  trabajo: { etapa: string; progreso: number | null } | null;
};
export type Cuenta = { credenciales: boolean; clientIdFinal: string; conectada: boolean; expira: number | null; cuenta: { nombre?: string; handle?: string; urn?: string } | null };
export type Ajustes = {
  zonaCalendario: string;
  zonaVista: string;
  carpetaCentro: string;
  youtube: { categoria: string; sintetico: boolean; listas: { largo: string; short: string }; subtitulosIdioma: string };
  linkedin: { puerto: number; version: string; primerComentario: boolean };
};
export type Estado = {
  escritorio: true;
  cifrado: boolean;
  carpetaCentro: string | null;
  carpetasBuscadas: string[];
  conTextos: boolean;
  zona: string;
  ajustes: Ajustes;
  cuentas: { youtube: Cuenta; linkedin: Cuenta };
  redireccionLinkedIn: string;
  arranque: number;
  atrasadasCola: { id: string; instante: number; titulo: string }[];
  publicaciones: Publicacion[];
  hechas: { id: string; red: Red | null; titulo: string; estado: EstadoPub; url: string | null; studio: string | null; instante: number; avisos: string[] }[];
};
export type Evento = { tipo: 'progreso'; id: string; etapa: string; progreso: number | null } | { tipo: 'fin'; id: string; ok: boolean; mensaje?: string; url?: string; avisos?: string[] };

const studio = () => (window as any).studio as { escritorio?: boolean; accion: (a: string, x?: unknown) => Promise<any> } | undefined;
export const enEscritorio = () => !!studio()?.escritorio;

export class ErrorOp extends Error {
  constructor(
    mensaje: string,
    public codigo: string | null,
  ) {
    super(mensaje);
  }
}

/** Operación de Publicar. Lanza ErrorOp con el mensaje claro del proceso principal. */
export async function op<T = any>(nombre: string, datos: Record<string, unknown> = {}): Promise<T> {
  const s = studio();
  if (!s?.escritorio) throw new ErrorOp('Publicar solo funciona en la app de escritorio.', 'sin_escritorio');
  const r = await s.accion('publicar', { ...datos, op: nombre });
  if (r && typeof r === 'object' && 'error' in r && r.error) throw new ErrorOp(String(r.error), r.codigo ?? null);
  return r as T;
}

export const abrirUrl = (url: string) => op('abrir-url', { url }).catch(() => window.open(url, '_blank'));

/** Archivo del centro de contenido servido por el servidor local (servidor/centro.ts). */
export const urlCentro = (rel: string) => `/centro/${rel.split('/').map(encodeURIComponent).join('/')}`;

/** Fecha y hora en una zona: «lun 30 nov · 08:30». */
export const fechaHora = (ms: number, zona: string) => {
  const f = new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return f.format(new Date(ms)).replace(',', ' ·');
};
export const dia = (ms: number, zona: string) => new Intl.DateTimeFormat('es', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ms));
export const zonaCorta = (zona: string, ms = Date.now()) => {
  const p = new Intl.DateTimeFormat('es', { timeZone: zona, timeZoneName: 'shortOffset' }).formatToParts(new Date(ms)).find((x) => x.type === 'timeZoneName')?.value ?? '';
  return `${zona.split('/').pop()!.replace(/_/g, ' ')} (${p.replace('GMT', 'UTC')})`;
};
export const tam = (b: number) => (b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);
export const bytes = (s: string) => new TextEncoder().encode(s).length;
