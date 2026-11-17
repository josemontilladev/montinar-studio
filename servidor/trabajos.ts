/** Trabajos largos (voz, exportación, fotograma) en procesos aparte, con progreso, registro y cancelación. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import type { Response } from 'express';
import { DESC, EDITOR, FFMPEG, PROY, rutas } from './config';
import { nombreSeguro, rutaPublica } from './medios';
import { normalizarSonoridad } from './normalizar';
import { acelElegida } from './gpu';

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

const trabajos = new Map<string, Trabajo & { proc?: ChildProcess }>();
const clientes = new Set<Response>();

export const publico = (t: Trabajo & { proc?: ChildProcess }): Trabajo => {
  const { proc: _p, restaurar: _r, ...r } = t as any;
  return r;
};
export const listar = () => [...trabajos.values()].map(publico).sort((a, b) => b.inicio - a.inicio);
export const obtener = (id: string) => trabajos.get(id);

let pend: NodeJS.Timeout | null = null;
const emitir = () => {
  if (pend) return;
  pend = setTimeout(() => {
    pend = null;
    const d = `data: ${JSON.stringify(listar())}\n\n`;
    for (const c of clientes) c.write(d);
  }, 120);
};

export const suscribir = (res: Response) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(`data: ${JSON.stringify(listar())}\n\n`);
  clientes.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  res.on('close', () => {
    clearInterval(ping);
    clientes.delete(res);
  });
};

export const nuevo = (tipo: Trabajo['tipo'], titulo: string) => {
  const t: Trabajo & { proc?: ChildProcess } = { id: `${tipo}-${Date.now().toString(36)}`, tipo, titulo, estado: 'corriendo', progreso: 0, etapa: 'Empezando…', log: [], inicio: Date.now() };
  trabajos.set(t.id, t);
  // solo se guardan los 30 más recientes
  const xs = [...trabajos.values()].sort((a, b) => b.inicio - a.inicio);
  for (const x of xs.slice(30)) if (x.estado !== 'corriendo') trabajos.delete(x.id);
  emitir();
  return t;
};

export const actualizar = (t: Trabajo, d: Partial<Trabajo>) => {
  Object.assign(t, d);
  emitir();
};
export const log = (t: Trabajo, l: string) => {
  const s = l.trim();
  if (!s) return;
  t.log.push(s);
  if (t.log.length > 60) t.log.splice(0, t.log.length - 60);
  emitir();
};

const matar = (p: ChildProcess) => {
  if (!p.pid) return;
  if (process.platform === 'win32') execFile('taskkill', ['/T', '/F', '/PID', String(p.pid)], { windowsHide: true }, () => {});
  else p.kill('SIGTERM');
};

export const cancelar = (id: string) => {
  const t = trabajos.get(id);
  if (!t || t.estado !== 'corriendo') return false;
  t.estado = 'cancelado';
  t.etapa = 'Cancelado';
  t.fin = Date.now();
  if (t.proc) matar(t.proc);
  emitir();
  return true;
};

const sello = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

// ——— Voz ———

export type PeticionVoz = { id: string; texto: string; dicho?: string; voz?: string; archivoActual?: string };

/**
 * Regenera una frase: escribe el texto en guion.json, ejecuta el script de voz del proyecto solo para esa frase y
 * devuelve archivo nuevo (copia con fecha en voz/tomas/), duración y tiempos de palabra (alineados con whisper).
 */
export const regenerarVoz = (req: PeticionVoz) => {
  const v = DESC.voz;
  if (!v) throw new Error('Este proyecto no declara un script de voz (editor.json → voz).');
  if (!/^[a-zA-Z0-9_-]+$/.test(req.id)) throw new Error('id de frase no válido');
  const t = nuevo('voz', `Voz · ${req.id}`);
  (async () => {
    try {
      const gPath = path.join(PROY, v.guion);
      const guion = JSON.parse(fs.readFileSync(gPath, 'utf8'));
      const segs: any[] = guion.segmentos;
      let s = segs.find((x) => x.id === req.id);
      if (!s) {
        s = { id: req.id };
        segs.push(s);
      }
      s.texto = req.texto;
      if (req.dicho && req.dicho.trim() && req.dicho.trim() !== req.texto.trim()) s.dicho = req.dicho;
      else delete s.dicho;
      if (req.voz) s.voz = req.voz;
      else delete s.voz;
      fs.writeFileSync(gPath, JSON.stringify(guion, null, 2) + '\n');
      const tomas = guion.piper?.tomas ?? 5;
      // el script sobrescribe voz/<id>.* y tiempos.json: se guardan para dejarlos como estaban (el proyecto pasa a
      // usar la copia con fecha, y las versiones anteriores de proyecto.json siguen sonando igual)
      const tiemposAbs = path.join(PROY, v.tiempos);
      const carpetaAbs = rutaPublica(v.carpeta ?? 'voz');
      const guardados = new Map<string, Buffer>();
      for (const f of [tiemposAbs, ...(fs.existsSync(carpetaAbs) ? fs.readdirSync(carpetaAbs).filter((x) => x.startsWith(`${req.id}.`)).map((x) => path.join(carpetaAbs, x)) : [])])
        if (fs.existsSync(f)) guardados.set(f, fs.readFileSync(f));
      (t as any).restaurar = () => {
        for (const [f, b] of guardados) fs.writeFileSync(f, b);
      };
      actualizar(t, { etapa: 'Generando voz…', progreso: 0.05 });
      const [cmd, ...args] = v.comando.map((x) => x.replace('{id}', req.id));
      const p = spawn(cmd, args, { cwd: PROY, env: { ...process.env, PYTHONIOENCODING: 'utf8', PYTHONUNBUFFERED: '1' }, windowsHide: true });
      (t as any).proc = p;
      const leer = (b: Buffer) => {
        for (const l of b.toString('utf8').split(/\r?\n/)) {
          log(t, l);
          const m = /toma (\d+):/.exec(l);
          if (m) actualizar(t, { progreso: 0.1 + (0.8 * Number(m[1])) / tomas, etapa: `Toma ${m[1]} de ${tomas} (se queda la que mejor entiende whisper)…` });
        }
      };
      p.stdout.on('data', leer);
      p.stderr.on('data', leer);
      const code: number = await new Promise((r) => p.on('close', (c) => r(c ?? 1)));
      if (t.estado === 'cancelado') {
        setTimeout(() => (t as any).restaurar?.(), 800);
        return;
      }
      if (code !== 0) throw new Error(`El script de voz terminó con código ${code}. ${t.log.slice(-3).join(' · ')}`);
      actualizar(t, { etapa: 'Leyendo tiempos de palabra…', progreso: 0.93 });
      const tj = JSON.parse(fs.readFileSync(path.join(PROY, v.tiempos), 'utf8'));
      const r = (tj.segmentos as any[]).find((x) => x.id === req.id);
      if (!r) throw new Error('El script no devolvió esta frase en tiempos.json');
      // copia con fecha: así cada toma tiene su archivo (y el reproductor no usa una versión en caché)
      const carpeta = v.carpeta ?? 'voz';
      const ext = path.extname(r.archivo) || '.wav';
      const nuevoRel = `${carpeta}/tomas/${req.id}-${sello()}${ext}`;
      fs.mkdirSync(path.dirname(rutaPublica(nuevoRel)), { recursive: true });
      fs.copyFileSync(rutaPublica(r.archivo), rutaPublica(nuevoRel));
      (t as any).restaurar?.();
      actualizar(t, { estado: 'hecho', progreso: 1, etapa: `Listo · ${r.duracion.toFixed(2)} s`, fin: Date.now(), resultado: { id: req.id, archivo: nuevoRel, duracion: r.duracion, palabras: r.palabras, texto: req.texto, motor: tj.motor, voz: req.voz || tj.voz } });
    } catch (e: any) {
      try {
        (t as any).restaurar?.();
      } catch {}
      if (t.estado !== 'cancelado') actualizar(t, { estado: 'error', error: String(e?.message ?? e), etapa: 'Error', fin: Date.now() });
    }
  })();
  return publico(t);
};

/**
 * Antes de regenerar: si la frase usa el archivo «de trabajo» del script (voz/<id>.wav), se guarda una copia como toma
 * para poder volver a ella (el script lo va a sobrescribir).
 */
export const archivarToma = (archivo: string, id: string) => {
  try {
    const abs = rutaPublica(archivo);
    if (!fs.existsSync(abs) || archivo.includes('/tomas/')) return archivo;
    const carpeta = DESC.voz?.carpeta ?? 'voz';
    const rel = `${carpeta}/tomas/${id}-original-${sello()}${path.extname(archivo)}`;
    fs.mkdirSync(path.dirname(rutaPublica(rel)), { recursive: true });
    fs.copyFileSync(abs, rutaPublica(rel));
    return rel;
  } catch {
    return archivo;
  }
};

// ——— Render ———

export type PeticionRender = {
  proyecto: unknown;
  formato: '9:16' | '4:5' | '1:1' | '16:9';
  calidad: 'alta' | 'media' | 'borrador';
  rango?: [number, number] | null;
  nombre?: string;
  fotograma?: number;
  /** solo la mezcla de audio (WAV) para medir sonoridad */
  soloAudio?: boolean;
  codec?: 'h264' | 'h265';
  encuadre?: 'adaptar' | 'recortar';
  /** subtítulos: quemados (por defecto), aparte (.srt + .vtt sin quemar) o ambos */
  subtitulos?: 'quemados' | 'aparte' | 'ambos';
  portada?: { titulo: string; subtitulo?: string } | null;
  /** texto .srt / .vtt ya calculado por el cliente */
  srt?: string;
  vtt?: string;
  plataforma?: string;
  /** normalizar la sonoridad del vídeo final a este objetivo (LUFS), con limitador a −1 dBTP */
  normalizar?: number | null;
  /** codificación por hardware: «auto» (preferencia guardada), «no» o forzar */
  aceleracion?: 'auto' | 'no';
};

// Cola de render: un render pesado cada vez (los demás esperan su turno)
let renderActivo = false;
const cola: (() => void)[] = [];
const siguiente = () => {
  renderActivo = false;
  const f = cola.shift();
  if (f) f();
};

export const renderizar = (req: PeticionRender) => {
  const still = req.fotograma != null;
  const audio = !!req.soloAudio;
  const titulo = audio
    ? 'Medir sonoridad de la mezcla'
    : still
      ? `Fotograma ${req.fotograma}${req.portada ? ' · portada' : ''}`
      : `Exportar ${req.plataforma ? `${req.plataforma} · ` : ''}${req.formato} · ${req.calidad}${req.codec === 'h265' ? ' · H.265' : ''}${req.rango ? ` · ${req.rango[0]}–${req.rango[1]}` : ''}`;
  const t = nuevo(audio ? 'analisis' : still ? 'fotograma' : 'exportar', titulo);
  fs.mkdirSync(rutas.salidas, { recursive: true });
  fs.mkdirSync(rutas.cache, { recursive: true });
  const base = nombreSeguro(req.plataforma ? `${req.nombre || DESC.nombre}-${req.plataforma}` : req.nombre || DESC.nombre || 'video').toLowerCase();
  const archivo = still
    ? `${base}-${req.portada ? 'portada' : 'fotograma'}-${req.fotograma}-${sello()}.png`
    : `${base}-${req.formato.replace(':', 'x')}-${req.calidad}${req.codec === 'h265' ? '-h265' : ''}${req.rango ? `-f${req.rango[0]}-${req.rango[1]}` : ''}-${sello()}.mp4`;
  const salida = audio ? path.join(rutas.cache, `mezcla-${t.id}.wav`) : path.join(rutas.salidas, archivo);
  const props = path.join(rutas.cache, `props-${t.id}.json`);
  const sub = req.subtitulos ?? 'quemados';
  fs.writeFileSync(props, JSON.stringify({ proyecto: req.proyecto, formato: req.formato, encuadre: req.encuadre ?? 'adaptar', sinSubtitulos: sub === 'aparte', portada: req.portada ?? null }));
  const conf = {
    proyecto: PROY,
    entrada: path.resolve(PROY, DESC.remotionEntrada),
    publico: rutas.publico,
    composicion: DESC.composicion,
    props,
    salida,
    calidad: req.calidad,
    codec: req.codec ?? 'h264',
    rango: req.rango ?? null,
    fotograma: req.fotograma ?? null,
    soloAudio: audio,
    cache: rutas.cache,
    concurrencia: Math.max(1, Math.min(8, Math.floor(os.cpus().length / 2))),
  };
  const arrancar = async () => {
    if (t.estado !== 'corriendo') return siguiente();
    renderActivo = true;
    actualizar(t, { etapa: 'Empezando…' });
    // GPU (NVENC / QSV / AMF) si está disponible y activada; si falla, el render se repite con la CPU
    const acel = !audio && !still && req.aceleracion !== 'no' ? await acelElegida().catch(() => null) : null;
    (conf as any).acel = (t as any).sinGpu ? null : acel;
    if ((conf as any).acel) log(t, `Codificación por hardware: ${(conf as any).acel}`);
    const p = spawn(process.execPath, [path.join(EDITOR, 'servidor', 'render-trabajo.mjs'), JSON.stringify(conf)], { cwd: PROY, windowsHide: true });
    (t as any).proc = p;
    let resto = '';
    p.stdout.on('data', (b: Buffer) => {
      resto += b.toString('utf8');
      const ls = resto.split('\n');
      resto = ls.pop() ?? '';
      for (const l of ls) {
        try {
          const m = JSON.parse(l);
          if (m.tipo === 'progreso') actualizar(t, { progreso: m.p, etapa: m.etapa });
          else if (m.tipo === 'log') log(t, m.texto);
        } catch {
          log(t, l);
        }
      }
    });
    p.stderr.on('data', (b: Buffer) => log(t, b.toString('utf8').slice(0, 400)));
    p.on('close', async (code) => {
      if (t.estado === 'corriendo' && (code !== 0 || !fs.existsSync(salida)) && (conf as any).acel && !(t as any).sinGpu && t.log.some((l) => /nvenc|qsv|amf|encoder|codificador|ffmpeg/i.test(l))) {
        // la GPU falló (controlador, sesión ocupada…): se repite con libx264 / libx265
        log(t, 'La codificación por hardware falló; se repite con la CPU');
        (t as any).sinGpu = true;
        return arrancar();
      }
      fs.rmSync(props, { force: true });
      siguiente();
      if (t.estado === 'cancelado') {
        fs.rmSync(salida, { force: true });
        return;
      }
      if (code !== 0 || !fs.existsSync(salida)) return actualizar(t, { estado: 'error', etapa: 'Error', error: t.log.slice(-4).join(' · ') || `código ${code}`, fin: Date.now() });
      if ((conf as any).acel) (t as any).acelUsada = (conf as any).acel;
      if (audio) {
        try {
          actualizar(t, { progreso: 0.92, etapa: 'Midiendo sonoridad (BS.1770)…' });
          const r = await pythonJSON('audio_pro.py', { accion: 'lufs', ffmpeg: FFMPEG, entrada: salida });
          fs.rmSync(salida, { force: true });
          return actualizar(t, { estado: 'hecho', progreso: 1, etapa: `${r.lufs} LUFS · pico ${r.pico} dBFS`, fin: Date.now(), resultado: r });
        } catch (e: any) {
          return actualizar(t, { estado: 'error', etapa: 'Error', error: e.message, fin: Date.now() });
        }
      }
      const rel = path.relative(rutas.salidas, salida).split(path.sep).join('/');
      const resultado: any = { archivo: salida, url: `/salidas/${rel}`, tam: fs.statSync(salida).size, codificador: (t as any).acelUsada ?? 'cpu', segundos: Math.round((Date.now() - t.inicio) / 1000) };
      if (still) return actualizar(t, { estado: 'hecho', progreso: 1, etapa: 'Listo', fin: Date.now(), resultado });
      // subtítulos aparte, junto al vídeo
      if (sub !== 'quemados' && req.srt) {
        fs.writeFileSync(salida.replace(/\.mp4$/, '.srt'), req.srt);
        if (req.vtt) fs.writeFileSync(salida.replace(/\.mp4$/, '.vtt'), req.vtt);
        resultado.subtitulos = [`/salidas/${rel.replace(/\.mp4$/, '.srt')}`, `/salidas/${rel.replace(/\.mp4$/, '.vtt')}`];
      }
      if (req.normalizar != null) {
        try {
          actualizar(t, { progreso: 0.985, etapa: `Normalizando sonoridad a ${req.normalizar} LUFS…` });
          resultado.sonoridad = await normalizarSonoridad(FFMPEG, salida, salida, req.normalizar, -1);
          resultado.tam = fs.statSync(salida).size;
        } catch (e: any) {
          log(t, `sonoridad: ${e.message}`);
        }
      }
      // control de fluidez del vídeo exportado (fotogramas repetidos / congelados / negros)
      actualizar(t, { progreso: 0.99, etapa: 'Comprobando fluidez…' });
      analizarFluidez(salida)
        .then((f) => (resultado.fluidez = f))
        .catch((e) => log(t, `fluidez: ${e.message}`))
        .finally(() => actualizar(t, { estado: 'hecho', progreso: 1, etapa: 'Listo', fin: Date.now(), resultado }));
    });
  };
  if (renderActivo) {
    actualizar(t, { etapa: 'En cola: espera a que termine el render en curso…' });
    cola.push(arrancar);
  } else arrancar();
  return publico(t);
};

/** Ejecuta un script de Python del editor y devuelve su JSON (sin trabajo visible). */
export const pythonJSON = (script: string, conf: unknown): Promise<any> =>
  new Promise((res, rej) => {
    fs.mkdirSync(rutas.cache, { recursive: true });
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const cf = path.join(rutas.cache, `py-${id}.json`);
    const out = path.join(rutas.cache, `py-${id}-res.json`);
    fs.writeFileSync(cf, JSON.stringify(conf));
    execFile(PYTHON, [path.join(EDITOR, 'servidor', script), cf, out], { env: { ...process.env, PYTHONIOENCODING: 'utf8' }, windowsHide: true, maxBuffer: 1 << 24 }, (err, _o, se) => {
      fs.rmSync(cf, { force: true });
      if (err || !fs.existsSync(out)) return rej(new Error(String(se || err?.message || 'sin resultado').slice(-400)));
      const r = JSON.parse(fs.readFileSync(out, 'utf8'));
      fs.rmSync(out, { force: true });
      res(r);
    });
  });

/** Abre el explorador de archivos con el archivo seleccionado. */
export const mostrarEnCarpeta = (abs: string) => {
  const ok = path.resolve(abs).startsWith(path.resolve(PROY));
  if (!ok) throw new Error('Ruta fuera del proyecto');
  if (process.platform === 'win32') spawn('explorer.exe', [`/select,${abs}`], { detached: true, windowsHide: false });
  else if (process.platform === 'darwin') spawn('open', ['-R', abs]);
  else spawn('xdg-open', [path.dirname(abs)]);
};

// ——— Scripts de Python del editor (transcribir, audio, análisis) ———

export const PYTHON = process.env.PYTHON ?? (process.platform === 'win32' ? 'py' : 'python3');

/**
 * Ejecuta servidor/<script> con una configuración JSON y devuelve el JSON que escribe. Las líneas «PROGRESO a/b»
 * mueven la barra; el resto va al registro.
 */
export const trabajoPython = (tipo: Trabajo['tipo'], titulo: string, script: string, conf: unknown, alTerminar?: (r: any) => any) => {
  const t = nuevo(tipo, titulo);
  fs.mkdirSync(rutas.cache, { recursive: true });
  const cf = path.join(rutas.cache, `${t.id}-conf.json`);
  const out = path.join(rutas.cache, `${t.id}-res.json`);
  fs.writeFileSync(cf, JSON.stringify(conf));
  const p = spawn(PYTHON, [path.join(EDITOR, 'servidor', script), cf, out], { cwd: PROY, env: { ...process.env, PYTHONIOENCODING: 'utf8', PYTHONUNBUFFERED: '1' }, windowsHide: true });
  (t as any).proc = p;
  actualizar(t, { etapa: 'Preparando…', progreso: 0.03 });
  const leer = (b: Buffer) => {
    for (const l of b.toString('utf8').split(/\r?\n/)) {
      const m = /PROGRESO (\d+)\/(\d+)\s*(.*)/.exec(l);
      if (m) actualizar(t, { progreso: 0.05 + (0.93 * Number(m[1])) / Math.max(1, Number(m[2])), etapa: m[3] ? `${m[3]} (${m[1]}/${m[2]})` : `${m[1]}/${m[2]}` });
      else log(t, l);
    }
  };
  p.stdout.on('data', leer);
  p.stderr.on('data', (b: Buffer) => {
    const l = b.toString('utf8');
    if (!/Warning|warn/i.test(l)) log(t, l.slice(0, 300));
  });
  p.on('close', async (code) => {
    fs.rmSync(cf, { force: true });
    if (t.estado === 'cancelado') return;
    try {
      if (code !== 0 || !fs.existsSync(out)) throw new Error(`código ${code}. ${t.log.slice(-3).join(' · ')}`);
      let r = JSON.parse(fs.readFileSync(out, 'utf8'));
      fs.rmSync(out, { force: true });
      if (alTerminar) r = await alTerminar(r);
      actualizar(t, { estado: 'hecho', progreso: 1, etapa: 'Listo', fin: Date.now(), resultado: r });
    } catch (e: any) {
      actualizar(t, { estado: 'error', etapa: 'Error', error: String(e?.message ?? e), fin: Date.now() });
    }
  });
  return publico(t);
};

/** Como trabajoPython pero con un script de Node del editor (mismo Node/Electron que el servidor). */
export const trabajoNode = (tipo: Trabajo['tipo'], titulo: string, script: string, conf: unknown, alTerminar?: (r: any) => any) => {
  const t = nuevo(tipo, titulo);
  fs.mkdirSync(rutas.cache, { recursive: true });
  const cf = path.join(rutas.cache, `${t.id}-conf.json`);
  const out = path.join(rutas.cache, `${t.id}-res.json`);
  fs.writeFileSync(cf, JSON.stringify(conf));
  const p = spawn(process.execPath, [path.join(EDITOR, 'servidor', script), cf, out], { cwd: EDITOR, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true });
  (t as any).proc = p;
  actualizar(t, { etapa: 'Preparando…', progreso: 0.03 });
  const leer = (b: Buffer) => {
    for (const l of b.toString('utf8').split(/\r?\n/)) {
      const m = /PROGRESO (\d+)\/(\d+)\s*(.*)/.exec(l);
      if (m) actualizar(t, { progreso: 0.05 + (0.9 * (Number(m[1]) - 1)) / Math.max(1, Number(m[2])), etapa: m[3] ? `${m[3]} (${m[1]}/${m[2]})` : `${m[1]}/${m[2]}` });
      else log(t, l);
    }
  };
  p.stdout.on('data', leer);
  p.stderr.on('data', (b: Buffer) => log(t, b.toString('utf8').slice(0, 400)));
  p.on('close', async (code) => {
    fs.rmSync(cf, { force: true });
    if (t.estado === 'cancelado') return;
    try {
      if (code !== 0 || !fs.existsSync(out)) throw new Error(t.log.filter((l) => /Error|error/.test(l)).slice(-1)[0]?.replace(/^.*?Error:\s*/, '') || `código ${code}`);
      let r = JSON.parse(fs.readFileSync(out, 'utf8'));
      fs.rmSync(out, { force: true });
      if (alTerminar) r = await alTerminar(r);
      actualizar(t, { estado: 'hecho', progreso: 1, etapa: 'Listo', fin: Date.now(), resultado: r });
    } catch (e: any) {
      actualizar(t, { estado: 'error', etapa: 'Error', error: String(e?.message ?? e), fin: Date.now() });
    }
  });
  return publico(t);
};

/** Analiza la fluidez de un vídeo (servidor/fluidez.py): tirones, congelados y negros con sus tiempos. */
export const analizarFluidez = (archivo: string): Promise<any> =>
  new Promise((res, rej) => {
    fs.mkdirSync(rutas.cache, { recursive: true });
    const id = Date.now().toString(36);
    const cf = path.join(rutas.cache, `fluidez-${id}.json`);
    const out = path.join(rutas.cache, `fluidez-${id}-res.json`);
    fs.writeFileSync(cf, JSON.stringify({ archivo }));
    execFile(PYTHON, [path.join(EDITOR, 'servidor', 'fluidez.py'), cf, out], { env: { ...process.env, PYTHONIOENCODING: 'utf8' }, windowsHide: true, maxBuffer: 1 << 24 }, (err) => {
      fs.rmSync(cf, { force: true });
      if (err || !fs.existsSync(out)) return rej(err ?? new Error('sin resultado'));
      const r = JSON.parse(fs.readFileSync(out, 'utf8'));
      fs.rmSync(out, { force: true });
      res(r);
    });
  });
