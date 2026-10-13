/** Medios de public/: listado con duración (ffprobe), subida y formas de onda. */
import fs from 'node:fs';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { FFMPEG, FFPROBE, rutas } from './config';

export type Medio = { ruta: string; tipo: 'video' | 'imagen' | 'audio'; tam: number; dur?: number; ancho?: number; alto?: number; mtime: number };

const TIPOS: Record<string, Medio['tipo']> = {
  '.mp4': 'video',
  '.webm': 'video',
  '.mov': 'video',
  '.m4v': 'video',
  '.png': 'imagen',
  '.jpg': 'imagen',
  '.jpeg': 'imagen',
  '.webp': 'imagen',
  '.gif': 'imagen',
  '.svg': 'imagen',
  '.avif': 'imagen',
  '.wav': 'audio',
  '.mp3': 'audio',
  '.m4a': 'audio',
  '.aac': 'audio',
  '.ogg': 'audio',
  '.flac': 'audio',
};

const cacheProbe = new Map<string, { mtime: number; dur?: number; ancho?: number; alto?: number }>();

const probe = (f: string): Promise<{ dur?: number; ancho?: number; alto?: number }> =>
  new Promise((res) => {
    execFile(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', f], { windowsHide: true }, (err, out) => {
      if (err) return res({});
      try {
        const j = JSON.parse(out);
        const st = (j.streams ?? []).find((s: any) => s.width);
        res({ dur: j.format?.duration ? Number(j.format.duration) : undefined, ancho: st?.width, alto: st?.height });
      } catch {
        res({});
      }
    });
  });

const recorrer = (dir: string, base = ''): string[] => {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...recorrer(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
};

export const listarMedios = async (): Promise<Medio[]> => {
  const files = recorrer(rutas.publico).filter((r) => TIPOS[path.extname(r).toLowerCase()]);
  const out: Medio[] = [];
  await Promise.all(
    files.map(async (ruta) => {
      const abs = path.join(rutas.publico, ruta);
      const st = fs.statSync(abs);
      const tipo = TIPOS[path.extname(ruta).toLowerCase()];
      let c = cacheProbe.get(abs);
      if (!c || c.mtime !== st.mtimeMs) {
        c = { mtime: st.mtimeMs, ...(tipo === 'imagen' && path.extname(ruta) === '.svg' ? {} : await probe(abs)) };
        cacheProbe.set(abs, c);
      }
      out.push({ ruta, tipo, tam: st.size, dur: c.dur, ancho: c.ancho, alto: c.alto, mtime: st.mtimeMs });
    }),
  );
  return out.sort((a, b) => a.ruta.localeCompare(b.ruta));
};

/** Ruta segura dentro de public/ (sin «..»). */
export const rutaPublica = (rel: string) => {
  const abs = path.resolve(rutas.publico, rel.replace(/^\/+/, ''));
  if (!abs.startsWith(path.resolve(rutas.publico))) throw new Error('Ruta fuera de public/');
  return abs;
};

export const nombreSeguro = (n: string) =>
  n
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archivo';

const cacheOndas = new Map<string, { mtime: number; picos: number[] }>();
export const PICOS_SEG = 50;

/** Picos de amplitud (0–1), PICOS_SEG por segundo. */
export const ondas = (rel: string): Promise<number[]> =>
  new Promise((res, rej) => {
    const abs = rutaPublica(rel);
    if (!fs.existsSync(abs)) return rej(new Error('No existe'));
    const st = fs.statSync(abs);
    const c = cacheOndas.get(abs);
    if (c && c.mtime === st.mtimeMs) return res(c.picos);
    const SR = 4000;
    // (el ffmpeg de Remotion no trae el formato «s16le» crudo: se pide WAV y se salta la cabecera)
    const p = spawn(FFMPEG, ['-v', 'error', '-i', abs, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', '-f', 'wav', '-'], { windowsHide: true });
    const bufs: Buffer[] = [];
    p.stdout.on('data', (b) => bufs.push(b));
    p.on('error', rej);
    p.on('close', () => {
      const todo = Buffer.concat(bufs);
      const k = todo.indexOf('data');
      const b = k >= 0 ? todo.subarray(k + 8) : todo.subarray(44);
      const n = Math.floor(b.length / 2);
      const per = SR / PICOS_SEG;
      const picos: number[] = [];
      for (let i = 0; i < n; i += per) {
        let m = 0;
        for (let j = i; j < Math.min(n, i + per); j++) m = Math.max(m, Math.abs(b.readInt16LE(j * 2)));
        picos.push(Math.round((m / 32768) * 1000) / 1000);
      }
      cacheOndas.set(abs, { mtime: st.mtimeMs, picos });
      res(picos);
    });
  });
