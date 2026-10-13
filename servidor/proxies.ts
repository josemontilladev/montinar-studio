/**
 * Proxies de vista previa: copias ligeras (540p, H.264 «todo intra» para buscar al instante) de los vídeos pesados.
 * La vista previa los usa (ruta «__proxy/<src>»); la exportación siempre usa los originales.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import type express from 'express';
import { FFMPEG, rutas } from './config';
import { listarMedios, rutaPublica, type Medio } from './medios';
import { actualizar, log, nuevo, publico } from './trabajos';

const DIR = () => path.join(rutas.cache, 'proxies');
const clave = (src: string) => {
  const st = fs.statSync(rutaPublica(src));
  return crypto.createHash('sha1').update(`${src}:${st.size}:${st.mtimeMs}`).digest('hex').slice(0, 16);
};
export const archivoProxy = (src: string) => path.join(DIR(), `${clave(src)}.mp4`);
const enCurso = new Map<string, string>(); // src → id de trabajo

/** ¿Merece proxy? Vídeos de más de 1920×1080 (o 4K), más de 60 MB o con más de 25 Mb/s. */
export const pesado = (m: Medio) => m.tipo === 'video' && ((m.ancho ?? 0) * (m.alto ?? 0) > 1920 * 1080 * 1.01 || m.tam > 60e6 || (m.dur ? (m.tam * 8) / m.dur > 25e6 : false));

export const estadoProxies = async () => {
  const ms = (await listarMedios()).filter((m) => m.tipo === 'video' && !m.ruta.startsWith('voz/'));
  return ms.map((m) => {
    let estado: 'listo' | 'generando' | 'no' = 'no';
    try {
      if (fs.existsSync(archivoProxy(m.ruta))) estado = 'listo';
    } catch {
      /* el medio desapareció */
    }
    if (enCurso.has(m.ruta)) estado = 'generando';
    return { src: m.ruta, estado, pesado: pesado(m), tam: m.tam, ancho: m.ancho, alto: m.alto };
  });
};

export const generarProxy = (src: string, dur?: number) => {
  if (enCurso.has(src)) return null;
  const abs = rutaPublica(src);
  if (!fs.existsSync(abs)) throw new Error('No existe');
  fs.mkdirSync(DIR(), { recursive: true });
  const dest = archivoProxy(src);
  const tmp = `${dest}.tmp.mp4`;
  const t = nuevo('proxy' as any, `Proxy · ${src.split('/').pop()}`);
  enCurso.set(src, t.id);
  // 540 px en el lado corto, todo intra (-g 1) para que buscar sea instantáneo, audio ligero
  const args = ['-y', '-v', 'error', '-progress', 'pipe:1', '-i', abs, '-vf', "scale='if(gt(iw,ih),-2,540)':'if(gt(iw,ih),540,-2)'", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-g', '1', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', tmp];
  const p = spawn(FFMPEG, args, { windowsHide: true });
  (t as any).proc = p;
  p.stdout.on('data', (b: Buffer) => {
    const m = /out_time_ms=(\d+)/.exec(b.toString());
    if (m && dur) actualizar(t, { progreso: Math.min(0.99, Number(m[1]) / 1e6 / dur), etapa: 'Generando proxy 540p…' });
  });
  p.stderr.on('data', (b: Buffer) => log(t, b.toString().slice(0, 300)));
  p.on('close', (code) => {
    enCurso.delete(src);
    if (t.estado === 'cancelado') return fs.rmSync(tmp, { force: true });
    if (code !== 0 || !fs.existsSync(tmp)) {
      fs.rmSync(tmp, { force: true });
      return actualizar(t, { estado: 'error', etapa: 'Error', error: t.log.slice(-2).join(' · ') || `código ${code}`, fin: Date.now() });
    }
    fs.renameSync(tmp, dest);
    actualizar(t, { estado: 'hecho', progreso: 1, etapa: `Listo · ${(fs.statSync(dest).size / 1e6).toFixed(1)} MB (original ${(fs.statSync(abs).size / 1e6).toFixed(1)} MB)`, fin: Date.now(), resultado: { src, proxy: true } });
  });
  return publico(t);
};

export const registrarProxies = (app: express.Express, err: (res: express.Response, e: any, code?: number) => any) => {
  app.get('/api/proxies', async (_req, res) => {
    try {
      res.json(await estadoProxies());
    } catch (e) {
      err(res, e, 500);
    }
  });
  app.post('/api/proxies/generar', async (req, res) => {
    try {
      const todos = !!req.body?.pesados;
      const ms = await listarMedios();
      const lista = todos ? ms.filter((m) => pesado(m) && !fs.existsSync(archivoProxy(m.ruta))) : ms.filter((m) => m.ruta === String(req.body?.src ?? ''));
      res.json(lista.map((m) => generarProxy(m.ruta, m.dur)).filter(Boolean));
    } catch (e) {
      err(res, e);
    }
  });
  app.post('/api/proxies/borrar', (req, res) => {
    try {
      fs.rmSync(archivoProxy(String(req.body?.src ?? '')), { force: true });
      res.json({ ok: true });
    } catch (e) {
      err(res, e);
    }
  });
  // la vista previa pide «/__proxy/<src>»: el proxy si existe, si no el original
  app.get(/^\/__proxy\/(.+)$/, (req, res) => {
    try {
      const src = decodeURIComponent((req.params as any)[0]);
      const f = fs.existsSync(archivoProxy(src)) ? archivoProxy(src) : rutaPublica(src);
      res.sendFile(f, { dotfiles: 'allow' });
    } catch (e) {
      err(res, e, 404);
    }
  });
};
