/**
 * Codificación por hardware: detecta NVENC (NVIDIA), QSV (Intel) y AMF (AMD) en el ffmpeg que usa el render, los
 * mide con una prueba corta y guarda la preferencia («auto», «no» o un codificador concreto).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type express from 'express';
import { DATOS, EDITOR, FFMPEG, rutas } from './config';

export type Acel = 'nvenc' | 'qsv' | 'amf';
const PREF = () => path.join(DATOS, 'preferencias.json');
export const leerPrefs = (): Record<string, any> => {
  try {
    return JSON.parse(fs.readFileSync(PREF(), 'utf8'));
  } catch {
    return {};
  }
};
export const guardarPrefs = (d: Record<string, any>) => {
  fs.mkdirSync(path.dirname(PREF()), { recursive: true });
  fs.writeFileSync(PREF(), JSON.stringify({ ...leerPrefs(), ...d }, null, 1));
};

/** Fotograma de prueba 1080×1920 (recursos/prueba-gpu.jpg, generado con el patrón de prueba de ffmpeg). */
let jpg: Buffer | null = null;
const cuadro = () => (jpg ??= fs.readFileSync(path.join(EDITOR, 'recursos', 'prueba-gpu.jpg')));

const probar = (args: string[], n: number, ancho = 1080, alto = 1920): Promise<{ ok: boolean; ms: number; err: string }> =>
  new Promise((res) => {
    const t0 = Date.now();
    const p = spawn(FFMPEG, ['-v', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-', ...(ancho !== 1080 ? ['-vf', `scale=${ancho}:${alto}`] : []), ...args, '-f', 'mp4', '-y', process.platform === 'win32' ? 'NUL' : '/dev/null'], { windowsHide: true });
    let err = '';
    p.stderr.on('data', (b) => (err += b.toString()));
    p.on('error', () => res({ ok: false, ms: 0, err: 'no se pudo ejecutar ffmpeg' }));
    p.on('close', (c) => res({ ok: c === 0, ms: Date.now() - t0, err: err.slice(0, 200) }));
    const j = cuadro();
    p.stdin.on('error', () => {});
    for (let i = 0; i < n; i++) p.stdin.write(j);
    p.stdin.end();
  });

export const ARGS: Record<Acel | 'cpu', (crf: number) => string[]> = {
  cpu: (crf) => ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p'],
  nvenc: (crf) => ['-c:v', 'h264_nvenc', '-preset', 'p5', '-tune', 'hq', '-rc', 'vbr', '-cq', String(crf), '-pix_fmt', 'yuv420p'],
  qsv: (crf) => ['-c:v', 'h264_qsv', '-preset', 'slow', '-global_quality', String(crf), '-pix_fmt', 'nv12'],
  amf: (crf) => ['-c:v', 'h264_amf', '-quality', 'quality', '-rc', 'cqp', '-qp_i', String(crf), '-qp_p', String(crf), '-pix_fmt', 'yuv420p'],
};

let detectado: { disponibles: Acel[]; t: number } | null = null;
export const detectar = async () => {
  if (detectado) return detectado;
  const disponibles: Acel[] = [];
  for (const a of ['nvenc', 'qsv', 'amf'] as Acel[]) if ((await probar(ARGS[a](23), 4, 320, 240)).ok) disponibles.push(a);
  detectado = { disponibles, t: Date.now() };
  return detectado;
};

/** Codificador a usar según la preferencia («auto» = el primero disponible). */
export const acelElegida = async (): Promise<Acel | null> => {
  const pref = leerPrefs().aceleracion ?? 'auto';
  if (pref === 'no') return null;
  const d = await detectar();
  if (pref === 'auto') return d.disponibles[0] ?? null;
  return d.disponibles.includes(pref) ? pref : null;
};

export const registrarGpu = (app: express.Express, err: (res: express.Response, e: any, code?: number) => any) => {
  app.get('/api/gpu', async (_req, res) => {
    try {
      const d = await detectar();
      res.json({ ...d, preferencia: leerPrefs().aceleracion ?? 'auto', elegida: await acelElegida(), prueba: leerPrefs().pruebaGpu ?? null });
    } catch (e) {
      err(res, e, 500);
    }
  });
  app.post('/api/gpu', (req, res) => {
    const v = String(req.body?.aceleracion ?? 'auto');
    if (!['auto', 'no', 'nvenc', 'qsv', 'amf'].includes(v)) return err(res, 'Valor no válido');
    guardarPrefs({ aceleracion: v });
    res.json({ ok: true });
  });
  // prueba de velocidad: 240 fotogramas 1080×1920 con la CPU (x264 «slow») y con cada codificador de la GPU
  app.post('/api/gpu/prueba', async (_req, res) => {
    try {
      const d = await detectar();
      const r: Record<string, { fps: number; ms: number }> = {};
      for (const a of ['cpu', ...d.disponibles] as (Acel | 'cpu')[]) {
        const x = await probar(ARGS[a](20), 240);
        if (x.ok) r[a] = { ms: x.ms, fps: Math.round((240 / x.ms) * 1000) };
      }
      const prueba = { t: Date.now(), resultados: r };
      guardarPrefs({ pruebaGpu: prueba });
      res.json(prueba);
    } catch (e) {
      err(res, e, 500);
    }
  });
  void rutas;
};
