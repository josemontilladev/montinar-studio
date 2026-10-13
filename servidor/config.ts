/** Proyecto abierto: ruta (--proyecto, PROYECTO o editor.config.json) y su descriptor editor.json. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EDITOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Datos que se escriben (caché, kits de marca): en la app de escritorio, la carpeta del usuario (STUDIO_DATOS). */
export const DATOS = process.env.STUDIO_DATOS ?? EDITOR;

export type Descriptor = {
  nombre: string;
  proyecto: string;
  entrada: string;
  remotionEntrada: string;
  composicion: string;
  publico: string;
  salidas: string;
  voz?: { comando: string[]; guion: string; tiempos: string; voces?: string; carpeta?: string };
};

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const leerConfig = (): { proyecto?: string; puerto?: number } => {
  try {
    return JSON.parse(fs.readFileSync(path.join(EDITOR, 'editor.config.json'), 'utf8'));
  } catch {
    return {};
  }
};

const cfg = leerConfig();
export const PUERTO = Number(arg('--puerto') ?? process.env.PORT ?? cfg.puerto ?? 4400);
export const PROY = path.resolve(EDITOR, arg('--proyecto') ?? process.env.PROYECTO ?? cfg.proyecto ?? '../montilla-video');

const porDefecto: Descriptor = {
  nombre: path.basename(PROY),
  proyecto: 'proyecto.json',
  entrada: 'src/editor.ts',
  remotionEntrada: 'src/index.ts',
  composicion: 'Video',
  publico: 'public',
  salidas: 'out/editor',
};

export const DESC: Descriptor = (() => {
  const f = path.join(PROY, 'editor.json');
  if (!fs.existsSync(f)) {
    console.warn(`Aviso: ${f} no existe; uso valores por defecto.`);
    return porDefecto;
  }
  return { ...porDefecto, ...JSON.parse(fs.readFileSync(f, 'utf8')) };
})();
// otro archivo de proyecto (p. ej. la versión sin voz): --archivo proyecto-sinvoz.json
if (arg('--archivo')) DESC.proyecto = arg('--archivo')!;

export const rutas = {
  proyecto: path.join(PROY, DESC.proyecto),
  publico: path.join(PROY, DESC.publico),
  salidas: path.join(PROY, DESC.salidas),
  versiones: path.join(PROY, '.versiones'),
  entrada: path.join(PROY, DESC.entrada),
  cache: path.join(DATOS, '.cache'),
  marcas: path.join(DATOS, 'marcas'),
  estilosUsuario: path.join(DATOS, 'estilos-usuario.json'),
};

/** ffmpeg / ffprobe: los que trae Remotion en el proyecto (o los del PATH). */
const bin = (n: string) => {
  const dirs = ['compositor-win32-x64-msvc', 'compositor-linux-x64-gnu', 'compositor-darwin-arm64', 'compositor-darwin-x64'];
  for (const base of [PROY, EDITOR])
    for (const d of dirs) {
      for (const ext of ['.exe', '']) {
        const p = path.join(base, 'node_modules', '@remotion', d, n + ext);
        if (fs.existsSync(p)) return p;
      }
    }
  return n;
};
export const FFMPEG = bin('ffmpeg');
export const FFPROBE = bin('ffprobe');

/** ¿La copia del contrato del proyecto coincide con la del editor? */
export const contratoIgual = () => {
  try {
    for (const f of ['esquema.ts', 'linea.ts', 'kit/index.tsx', 'kit/biblioteca.ts', 'kit/texto.tsx', 'kit/efectos.tsx', 'kit/elementos.tsx', 'kit/transiciones.tsx', 'kit/fuentes.tsx', 'kit/seguir.ts']) {
      const a = fs.readFileSync(path.join(EDITOR, 'contrato', f), 'utf8');
      const b = fs.readFileSync(path.join(path.dirname(rutas.entrada), 'contrato', f), 'utf8');
      if (a.replace(/\r/g, '') !== b.replace(/\r/g, '')) return false;
    }
    return true;
  } catch {
    return false;
  }
};
