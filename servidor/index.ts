/**
 * Servidor del editor: API de archivos (proyecto.json + versiones, medios, ondas), trabajos largos (voz, exportar)
 * y la interfaz (Vite en modo middleware, con el proyecto Remotion enlazado como «@proyecto»).
 *   npm run dev                      → http://localhost:4400 (proyecto ../metricaseo-promo/editables/promo-agencias-16x9)
 *   npm run dev -- --proyecto ../otro --puerto 4401
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFile, spawn as spawnHijo } from 'node:child_process';
import express from 'express';
import { createServer as createVite } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { validarProyecto } from '../contrato/esquema';
import { contratoIgual, DATOS as DATOS_APP, DESC, EDITOR, FFMPEG, FFPROBE, PROY, PUERTO, rutas } from './config';
import { revisarDependencias } from './dependencias';
import { generarProxy, pesado, registrarProxies } from './proxies';
import { acelElegida, registrarGpu } from './gpu';
import { registrarInicio } from './inicio';
import { registrarCompartida } from './compartida';
import { registrarDisenos } from './disenos';
import { registrarCentro } from './centro';
import { listarMedios, nombreSeguro, ondas, PICOS_SEG, rutaPublica } from './medios';
import { cancelarPreparacion, estadoEquipo, prepararEquipo, rutaModeloWhisper, type GrupoId } from './equipo';
import { trabajoNode, actualizar, archivarToma, cancelar, listar, mostrarEnCarpeta, nuevo, publico as publicoT, pythonJSON, regenerarVoz, renderizar, suscribir, trabajoPython } from './trabajos';

const app = express();
const srv = http.createServer(app);
app.use('/api', express.json({ limit: '30mb' }));

const err = (res: express.Response, e: any, code = 400) => res.status(code).json({ error: String(e?.message ?? e) });

// ——— Proyecto ———

// «Preparar este equipo»: Python propio, paquetes y modelo de subtítulos (servidor/equipo.ts)
app.get('/api/equipo', async (_req, res) => {
  try {
    res.json(await estadoEquipo());
  } catch (e) {
    err(res, e, 500);
  }
});
app.post('/api/equipo/preparar', (req, res) => {
  const grupos = (Array.isArray(req.body?.grupos) ? req.body.grupos : ['base']).filter((g: unknown): g is GrupoId => g === 'base' || g === 'ia');
  const r = req.body?.reinstalar;
  const reinstalar = r === 'python' || r === 'base' || r === 'modelo' || r === 'ia' ? r : undefined;
  res.json({ trabajo: prepararEquipo(grupos.length ? grupos : ['base'], reinstalar) });
});
app.post('/api/equipo/cancelar', (_req, res) => {
  cancelarPreparacion();
  res.json({ ok: true });
});

app.get('/api/dependencias', async (_req, res) => {
  try {
    res.json(await revisarDependencias());
  } catch (e) {
    err(res, e, 500);
  }
});

app.get('/api/estado', (_req, res) => {
  // sinProyecto: la app de escritorio arrancó sin proyecto de vídeo (solo el estudio de diseño es utilizable)
  const sinProyecto = !fs.existsSync(rutas.proyecto);
  res.json({ proyecto: PROY, descriptor: DESC, contratoIgual: !sinProyecto && contratoIgual(), mtime: sinProyecto ? 0 : fs.statSync(rutas.proyecto).mtimeMs, picosSeg: PICOS_SEG, sinProyecto });
});

app.get('/api/proyecto', (_req, res) => {
  try {
    res.type('json').send(fs.readFileSync(rutas.proyecto, 'utf8'));
  } catch (e) {
    err(res, e, 404);
  }
});

const MIN_VERSION_MS = 3 * 60 * 1000;
const MAX_VERSIONES = 80;
let ultimaVersion = 0;

const guardarVersion = (motivo: string) => {
  if (!fs.existsSync(rutas.proyecto)) return null;
  fs.mkdirSync(rutas.versiones, { recursive: true });
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const nombre = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}_${nombreSeguro(motivo)}.json`;
  fs.copyFileSync(rutas.proyecto, path.join(rutas.versiones, nombre));
  ultimaVersion = Date.now();
  const vs = fs.readdirSync(rutas.versiones).filter((f) => f.endsWith('.json')).sort();
  for (const v of vs.slice(0, Math.max(0, vs.length - MAX_VERSIONES))) fs.rmSync(path.join(rutas.versiones, v), { force: true });
  return nombre;
};

app.put('/api/proyecto', (req, res) => {
  try {
    const p = validarProyecto(req.body.proyecto);
    // versión: la anterior se guarda antes de sobrescribir (cada pocos minutos, o si se pide)
    let version: string | null = null;
    const rama = String(req.body.motivo ?? '').startsWith('rama-');
    if ((req.body.version && !rama) || Date.now() - ultimaVersion > MIN_VERSION_MS) version = guardarVersion(rama ? 'auto' : req.body.motivo || (req.body.version ? 'manual' : 'auto'));
    const tmp = rutas.proyecto + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(p, null, 1) + '\n');
    fs.renameSync(tmp, rutas.proyecto);
    // versión con nombre («rama»): se guarda el estado NUEVO
    if (rama) version = guardarVersion(req.body.motivo);
    res.json({ ok: true, mtime: fs.statSync(rutas.proyecto).mtimeMs, version });
  } catch (e) {
    err(res, e);
  }
});

app.get('/api/versiones', (_req, res) => {
  if (!fs.existsSync(rutas.versiones)) return res.json([]);
  res.json(
    fs
      .readdirSync(rutas.versiones)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .map((f) => ({ nombre: f, tam: fs.statSync(path.join(rutas.versiones, f)).size, mtime: fs.statSync(path.join(rutas.versiones, f)).mtimeMs })),
  );
});

app.get('/api/versiones/:nombre', (req, res) => {
  const f = path.join(rutas.versiones, path.basename(req.params.nombre));
  if (!fs.existsSync(f)) return err(res, 'No existe', 404);
  res.type('json').send(fs.readFileSync(f, 'utf8'));
});

registrarProxies(app, err);
registrarGpu(app, err);
registrarInicio(app, err);
registrarCompartida(app, err);
registrarDisenos(app, err);
registrarCentro(app);

// ——— Música libre (original de la app, CC0): se copia al proyecto al usarla ———
app.post('/api/musica-libre/usar', (req, res) => {
  try {
    const id = String(req.body?.id ?? '');
    const cat = JSON.parse(fs.readFileSync(path.join(EDITOR, 'recursos', 'musica', 'catalogo.json'), 'utf8')) as { id: string; archivo: string }[];
    const x = cat.find((y) => y.id === id);
    if (!x) return err(res, 'No existe esa pista', 404);
    const rel = `audio/musica/${x.archivo}`;
    const dest = rutaPublica(rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(EDITOR, 'recursos', 'musica', x.archivo), dest);
    res.json({ ruta: rel });
  } catch (e) {
    err(res, e);
  }
});

// ——— De una URL propia a un vídeo: captura con reloj virtual (en caché hasta que se crea el proyecto) ———
const chromeIncluido = () => {
  const base = path.join(EDITOR, 'recursos', 'chrome-headless-shell');
  const buscar = (d: string): string | null => {
    if (!fs.existsSync(d)) return null;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        const r = buscar(p);
        if (r) return r;
      } else if (/^chrome-headless-shell(\.exe)?$/.test(e.name)) return p;
    }
    return null;
  };
  return buscar(base);
};
app.post('/api/trabajos/web-a-video', (req, res) => {
  try {
    const url = String(req.body?.url ?? '').trim();
    if (!/^https?:\/\/[^\s]+$/i.test(url)) return err(res, 'Escribe una dirección completa (https://…)');
    const nav = chromeIncluido();
    if (!nav) return err(res, 'Falta el navegador incluido (recursos/chrome-headless-shell)');
    const id = Date.now().toString(36);
    const carpeta = path.join(rutas.cache, 'capturas', id);
    res.json({ trabajo: trabajoNode('captura', `Web → vídeo · ${new URL(url).hostname}`, 'captura-url.mjs', { url, carpeta, navegador: nav, ffmpeg: FFMPEG, segundos: Number(req.body?.segundos ?? 14) }, (r) => ({ ...r, capturas: id })) });
  } catch (e) {
    err(res, e);
  }
});

// ——— Grabaciones: WebM del navegador → MP4 (H.264 + AAC, 30 fps constantes) para editarlas sin problemas ———
app.post('/api/grabacion/convertir', (req, res) => {
  try {
    const rel = String(req.body?.ruta ?? '');
    const abs = rutaPublica(rel);
    if (!fs.existsSync(abs) || !/\.webm$/i.test(rel)) return err(res, 'No existe la grabación');
    const relMp4 = rel.replace(/\.webm$/i, '.mp4');
    const t = nuevo('captura', `Grabación · ${path.basename(relMp4)}`);
    actualizar(t, { etapa: 'Convirtiendo a MP4…', progreso: 0.1 });
    const p = spawnHijo(FFMPEG, ['-y', '-v', 'error', '-i', abs, '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', rutaPublica(relMp4)], { windowsHide: true });
    (t as any).proc = p;
    let e2 = '';
    p.stderr.on('data', (b: Buffer) => (e2 += b.toString()));
    p.on('close', (c) => {
      if (c === 0) {
        fs.rmSync(abs, { force: true });
        actualizar(t, { estado: 'hecho', progreso: 1, etapa: 'Listo', fin: Date.now(), resultado: { ruta: relMp4, archivo: rutaPublica(relMp4) } });
      } else actualizar(t, { estado: 'error', etapa: 'Error', error: e2.slice(-300) || `código ${c}`, fin: Date.now() });
    });
    res.json({ trabajo: publicoT(t) });
  } catch (e) {
    err(res, e);
  }
});

// ——— Quitar el fondo (rembg + modelos libres), con caché por archivo y modelo ———
process.env.U2NET_HOME ??= path.join(DATOS_APP, 'modelos');
app.post('/api/trabajos/quitar-fondo', (req, res) => {
  try {
    const src = String(req.body?.src ?? '');
    const modelo = ['u2net', 'u2netp', 'u2net_human_seg', 'isnet-general-use'].includes(req.body?.modelo) ? req.body.modelo : 'u2net';
    const abs = rutaPublica(src);
    if (!fs.existsSync(abs)) return err(res, 'No existe', 404);
    const img = /\.(png|jpe?g|webp|avif|gif)$/i.test(src);
    const formato = img ? 'png' : ['webm', 'prores', 'secuencia'].includes(req.body?.formato) ? req.body.formato : 'webm';
    const base = src.replace(/\.[^.]+$/, '').split('/').pop();
    const dir = path.posix.join(path.posix.dirname(src), 'sin-fondo');
    const rel = `${dir}/${base}-${modelo}${formato === 'png' ? '.png' : formato === 'webm' ? '.webm' : formato === 'prores' ? '.mov' : '-png'}`;
    const dest = rutaPublica(rel);
    // caché: si ya se hizo con ese modelo y el original no cambió, se devuelve al instante
    if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(abs).mtimeMs) return res.json({ cache: true, ruta: rel });
    fs.mkdirSync(formato === 'secuencia' ? dest : path.dirname(dest), { recursive: true });
    res.json({ trabajo: trabajoPython('ia', `Quitar fondo · ${base} (${modelo})`, 'quitar_fondo.py', { entrada: abs, salida: dest, modelo, formato }, (r) => ({ ...r, ruta: rel })) });
  } catch (e) {
    err(res, e);
  }
});

// ——— Seguimiento de movimiento (OpenCV CSRT / KCF) ———
app.post('/api/trabajos/seguimiento', (req, res) => {
  try {
    const { src, tiempos, caja, metodo } = req.body ?? {};
    const abs = rutaPublica(String(src ?? ''));
    if (!fs.existsSync(abs) || !Array.isArray(tiempos) || !tiempos.length || !Array.isArray(caja)) return err(res, 'Petición no válida');
    res.json({ trabajo: trabajoPython('ia', `Seguimiento (${metodo === 'kcf' ? 'KCF' : 'CSRT'}) · ${tiempos.length} fotogramas`, 'seguimiento.py', { video: abs, tiempos, caja, metodo }) });
  } catch (e) {
    err(res, e);
  }
});

// ——— Quitar silencios y muletillas: nueva toma de la frase con los tramos que se quedan (la anterior se guarda) ———
app.post('/api/voz/recortar', async (req, res) => {
  try {
    const { id, archivo, quedan } = req.body as { id: string; archivo: string; quedan: [number, number][] };
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || !Array.isArray(quedan) || !quedan.length) return err(res, 'Petición no válida');
    const abs = rutaPublica(archivo);
    if (!fs.existsSync(abs)) return err(res, 'No existe el audio', 404);
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const rel = `voz/tomas/${id}-limpia-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}.wav`;
    const dest = rutaPublica(rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // cada tramo con un fundido de 8 ms en los bordes para que no se oigan clics
    const f = quedan
      .map(([a, b], i) => `[0:a]atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS,volume='min(1,t/0.008)*min(1,(${(b - a).toFixed(3)}-t)/0.008)':eval=frame[s${i}]`)
      .join(';');
    const filtro = `${f};${quedan.map((_, i) => `[s${i}]`).join('')}concat=n=${quedan.length}:v=0:a=1[out]`;
    await new Promise<void>((ok, ko) =>
      execFile(FFMPEG, ['-y', '-v', 'error', '-i', abs, '-filter_complex', filtro, '-map', '[out]', '-c:a', 'pcm_s16le', dest], { windowsHide: true }, (e, _o, se) => (e ? ko(new Error(String(se || e.message).slice(-300))) : ok())),
    );
    // duración real del audio nuevo (por si algún tramo pasaba del final)
    const dur = await new Promise<number>((ok) =>
      execFile(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest], { windowsHide: true }, (e, o) => ok(e ? quedan.reduce((a, [x, y]) => a + (y - x), 0) : Number(String(o).trim()))),
    );
    res.json({ archivo: rel, duracion: dur });
  } catch (e) {
    err(res, e);
  }
});

// ——— Diario de la sesión (recuperación tras un cierre inesperado) ———
const archivoDiario = () => path.join(rutas.cache, `diario-${nombreSeguro(rutas.proyecto).slice(-60)}.json`);
app.get('/api/diario', (_req, res) => {
  try {
    res.json(fs.existsSync(archivoDiario()) ? JSON.parse(fs.readFileSync(archivoDiario(), 'utf8')) : null);
  } catch {
    res.json(null);
  }
});
app.post('/api/diario', (req, res) => {
  try {
    fs.mkdirSync(rutas.cache, { recursive: true });
    const tmp = `${archivoDiario()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ ...req.body, abierta: true, t: Date.now() }));
    fs.renameSync(tmp, archivoDiario());
    res.json({ ok: true });
  } catch (e) {
    err(res, e);
  }
});
// cierre limpio (también por sendBeacon, que llega como texto)
app.post('/api/diario/cerrar', express.text({ type: '*/*' }), (_req, res) => {
  try {
    if (fs.existsSync(archivoDiario())) {
      const d = JSON.parse(fs.readFileSync(archivoDiario(), 'utf8'));
      fs.writeFileSync(archivoDiario(), JSON.stringify({ ...d, abierta: false, cerrada: Date.now() }));
    }
    res.json({ ok: true });
  } catch (e) {
    err(res, e);
  }
});

// ——— Medios ———

app.get('/api/medios', async (_req, res) => {
  try {
    res.json(await listarMedios());
  } catch (e) {
    err(res, e, 500);
  }
});

app.post('/api/subir', (req, res) => {
  try {
    const carpeta = String(req.query.carpeta ?? 'subidas')
      .split('/')
      .map(nombreSeguro)
      .join('/');
    const nombre = nombreSeguro(String(req.query.nombre ?? 'archivo'));
    if (!/\.(mp4|webm|mov|m4v|png|jpe?g|webp|gif|svg|avif|wav|mp3|m4a|aac|ogg|flac)$/i.test(nombre)) return err(res, 'Tipo de archivo no admitido');
    let rel = `${carpeta}/${nombre}`;
    let abs = rutaPublica(rel);
    for (let k = 2; fs.existsSync(abs); k++) {
      rel = `${carpeta}/${nombre.replace(/(\.[^.]+)$/, `-${k}$1`)}`;
      abs = rutaPublica(rel);
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const out = fs.createWriteStream(abs);
    req.pipe(out);
    out.on('finish', () => {
      res.json({ ok: true, ruta: rel });
      // los vídeos pesados (4K, mucho bitrate) generan su proxy de vista previa en segundo plano
      listarMedios()
        .then((ms) => {
          const m = ms.find((x) => x.ruta === rel);
          if (m && pesado(m)) generarProxy(m.ruta, m.dur);
        })
        .catch(() => {});
    });
    out.on('error', (e) => err(res, e, 500));
  } catch (e) {
    err(res, e);
  }
});

app.get('/api/ondas', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache');
    res.json({ picosSeg: PICOS_SEG, picos: await ondas(String(req.query.src)) });
  } catch (e) {
    err(res, e, 404);
  }
});

// Miniatura de un vídeo en un instante (para la biblioteca y las tiras de la línea de tiempo), en caché en disco
app.get('/api/miniatura', (req, res) => {
  try {
    const src = String(req.query.src ?? '');
    const t = Math.max(0, Math.round(Number(req.query.t ?? 0) * 10) / 10);
    const h = Math.max(32, Math.min(360, Number(req.query.h ?? 120)));
    const abs = rutaPublica(src);
    if (!fs.existsSync(abs)) return err(res, 'No existe', 404);
    const dir = path.join(rutas.cache, 'miniaturas');
    fs.mkdirSync(dir, { recursive: true });
    const clave = `${nombreSeguro(src)}-${fs.statSync(abs).mtimeMs.toFixed(0)}-${t}-${h}.jpg`;
    const f = path.join(dir, clave);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (fs.existsSync(f)) return res.sendFile(f, { dotfiles: 'allow' });
    const sacar = (pos: string[], sig?: () => void) =>
      execFile(FFMPEG, ['-v', 'error', ...pos, '-i', abs, '-frames:v', '1', '-vf', `scale=-2:${h}`, '-q:v', '5', '-c:v', 'mjpeg', '-f', 'image2pipe', '-'], { encoding: 'buffer', windowsHide: true, maxBuffer: 1 << 22 }, (e, out) => {
        if (e || !out.length) return sig ? sig() : err(res, 'Sin fotograma', 404);
        fs.writeFileSync(f, out);
        res.type('jpg').send(out);
      });
    // si el instante pasa del final de la toma, el último fotograma
    sacar(['-ss', String(t)], () => sacar(['-sseof', '-0.25']));
  } catch (e) {
    err(res, e);
  }
});

app.get('/api/voces', (_req, res) => {
  const out: { id: string; motor: string; nombre: string }[] = [];
  const dir = DESC.voz?.voces ? path.join(PROY, DESC.voz.voces) : null;
  if (dir && fs.existsSync(dir))
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.onnx'))) {
      const id = f.replace(/\.onnx$/, '');
      const [lang, nombre, cal] = id.split('-');
      out.push({ id, motor: 'piper', nombre: `${nombre ?? id} · ${lang ?? ''} · ${cal ?? ''}` });
    }
  let guion: any = {};
  try {
    guion = DESC.voz ? JSON.parse(fs.readFileSync(path.join(PROY, DESC.voz.guion), 'utf8')) : {};
  } catch {}
  res.json({ voces: out, porDefecto: guion.piper?.voz ?? out[0]?.id ?? '', edge: guion.edge?.voz ?? null, disponible: !!DESC.voz });
});

// ——— Trabajos ———

app.get('/api/trabajos', (_req, res) => res.json(listar()));
app.get('/api/eventos', (_req, res) => suscribir(res));
app.post('/api/trabajos/:id/cancelar', (req, res) => res.json({ ok: cancelar(req.params.id) }));

app.post('/api/trabajos/voz', (req, res) => {
  try {
    const { id, texto, dicho, voz, archivoActual } = req.body ?? {};
    if (!id || !texto) return err(res, 'Faltan id o texto');
    const archivado = archivoActual ? archivarToma(archivoActual, id) : null;
    res.json({ trabajo: regenerarVoz({ id, texto, dicho, voz }), archivado });
  } catch (e) {
    err(res, e);
  }
});

app.post('/api/trabajos/exportar', (req, res) => {
  try {
    const b = req.body ?? {};
    validarProyecto(b.proyecto);
    res.json({ trabajo: renderizar({ proyecto: b.proyecto, formato: b.formato ?? '9:16', calidad: b.calidad ?? 'alta', rango: b.rango ?? null, nombre: b.nombre, codec: b.codec, encuadre: b.encuadre, subtitulos: b.subtitulos, srt: b.srt, vtt: b.vtt, plataforma: b.plataforma, normalizar: b.normalizar ?? null, aceleracion: b.aceleracion === 'no' ? 'no' : 'auto' }) });
  } catch (e) {
    err(res, e);
  }
});

app.post('/api/trabajos/fotograma', (req, res) => {
  try {
    const b = req.body ?? {};
    validarProyecto(b.proyecto);
    res.json({ trabajo: renderizar({ proyecto: b.proyecto, formato: b.formato ?? '9:16', calidad: 'alta', fotograma: Math.max(0, Math.round(b.frame ?? 0)), nombre: b.nombre, portada: b.portada ?? null, encuadre: b.encuadre }) });
  } catch (e) {
    err(res, e);
  }
});

// Subtítulos automáticos: transcribe audios de public/ (frases de voz o un archivo cualquiera)
app.post('/api/trabajos/subtitulos', (req, res) => {
  try {
    const { items, modelo } = req.body ?? {};
    if (!Array.isArray(items) || !items.length) return err(res, 'Nada que transcribir');
    // el modelo descargado por «Preparar este equipo» si está; si no, el nombre (caché de Hugging Face)
    const conf = { ffmpeg: FFMPEG, modelo: rutaModeloWhisper(String(modelo ?? 'small')), idioma: 'es', items: items.map((x: any) => ({ id: String(x.id), archivo: rutaPublica(String(x.src)), texto: x.texto ?? '' })) };
    res.json({ trabajo: trabajoPython('subtitulos', `Subtítulos · ${items.length} audio${items.length > 1 ? 's' : ''}`, 'transcribir.py', conf) });
  } catch (e) {
    err(res, e);
  }
});

// ——— Audio profesional ———
const selloCorto = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
// Mejorar voz: limpia, ecualiza, comprime y normaliza a −16 LUFS (nueva toma por frase)
app.post('/api/trabajos/mejorar-voz', (req, res) => {
  try {
    const { frases, objetivo } = req.body ?? {};
    if (!Array.isArray(frases) || !frases.length) return err(res, 'Sin frases');
    const items = frases.map((f: any) => ({ id: String(f.id), entrada: rutaPublica(String(f.src)), salida: rutaPublica(`voz/tomas/${nombreSeguro(String(f.id))}-pro-${selloCorto()}.wav`) }));
    const t = trabajoPython('audio', `Mejorar voz · ${items.length} frase(s)`, 'audio_pro.py', { accion: 'mejorar', ffmpeg: FFMPEG, objetivo: objetivo ?? -16, items }, (r) => {
      for (const k of Object.keys(r)) r[k].salida = path.relative(rutas.publico, r[k].salida).split(path.sep).join('/');
      return r;
    });
    res.json({ trabajo: t });
  } catch (e) {
    err(res, e);
  }
});
// Pulsos de la música
app.post('/api/ritmo', async (req, res) => {
  try {
    res.json(await pythonJSON('audio_pro.py', { accion: 'ritmo', ffmpeg: FFMPEG, entrada: rutaPublica(String(req.body?.src)) }));
  } catch (e) {
    err(res, e);
  }
});
// Sonoridad de la mezcla (renderiza solo el audio y mide LUFS)
app.post('/api/trabajos/sonoridad', (req, res) => {
  try {
    validarProyecto(req.body?.proyecto);
    res.json({ trabajo: renderizar({ proyecto: req.body.proyecto, formato: '9:16', calidad: 'alta', soloAudio: true }) });
  } catch (e) {
    err(res, e);
  }
});
// Biblioteca de efectos originales (sintetizados en local la primera vez)
const SFX_DIR = path.join(EDITOR, 'recursos', 'sfx');
app.get('/api/sfx-biblioteca', async (_req, res) => {
  try {
    if (!fs.existsSync(SFX_DIR) || !fs.readdirSync(SFX_DIR).some((f) => f.endsWith('.wav'))) await pythonJSON('audio_pro.py', { accion: 'sfx', ffmpeg: FFMPEG, carpeta: SFX_DIR });
    res.json(fs.readdirSync(SFX_DIR).filter((f) => f.endsWith('.wav')));
  } catch (e) {
    err(res, e, 500);
  }
});
app.use('/recursos', express.static(path.join(EDITOR, 'recursos')));
app.post('/api/sfx-biblioteca/importar', (req, res) => {
  try {
    const n = path.basename(String(req.body?.nombre ?? ''));
    const src = path.join(SFX_DIR, n);
    if (!fs.existsSync(src)) return err(res, 'No existe', 404);
    const rel = `audio/sfx/${n}`;
    fs.mkdirSync(path.dirname(rutaPublica(rel)), { recursive: true });
    if (!fs.existsSync(rutaPublica(rel))) fs.copyFileSync(src, rutaPublica(rel));
    res.json({ ruta: rel });
  } catch (e) {
    err(res, e);
  }
});

// ——— Tipografías de la biblioteca (OFL/Apache, recursos/fuentes): se copian al proyecto al usarlas ———
const FUENTES_DIR = path.join(EDITOR, 'recursos', 'fuentes');
app.get('/api/fuentes', (_req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(path.join(FUENTES_DIR, 'catalogo.json'), 'utf8')));
  } catch (e) {
    err(res, e, 500);
  }
});
app.post('/api/fuentes/instalar', (req, res) => {
  try {
    const cat = JSON.parse(fs.readFileSync(path.join(FUENTES_DIR, 'catalogo.json'), 'utf8')) as { id: string; familia: string; archivos: { peso: number; archivo: string }[] }[];
    const f = cat.find((x) => x.id === String(req.body?.id ?? '') || x.familia === String(req.body?.familia ?? ''));
    if (!f) return err(res, 'Tipografía no encontrada', 404);
    const archivos = f.archivos.map((a) => {
      const rel = `fuentes/${a.archivo}`;
      const dest = rutaPublica(rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!fs.existsSync(dest)) fs.copyFileSync(path.join(FUENTES_DIR, a.archivo), dest);
      return { src: rel, peso: a.peso };
    });
    res.json({ familia: f.familia, archivos });
  } catch (e) {
    err(res, e);
  }
});

// ——— Estilos de texto guardados por el usuario («Guardar como estilo») ———
app.get('/api/estilos-usuario', (_req, res) => {
  try {
    res.json(fs.existsSync(rutas.estilosUsuario) ? JSON.parse(fs.readFileSync(rutas.estilosUsuario, 'utf8')) : []);
  } catch {
    res.json([]);
  }
});
app.post('/api/estilos-usuario', (req, res) => {
  try {
    const lista = Array.isArray(req.body) ? req.body.slice(0, 500) : [];
    fs.mkdirSync(path.dirname(rutas.estilosUsuario), { recursive: true });
    fs.writeFileSync(rutas.estilosUsuario, JSON.stringify(lista, null, 1));
    res.json({ ok: true, n: lista.length });
  } catch (e) {
    err(res, e);
  }
});

// ——— Kits de marca (compartidos entre proyectos: editor-video/marcas) ———
const MARCAS = rutas.marcas;
app.get('/api/marcas', (_req, res) => {
  fs.mkdirSync(MARCAS, { recursive: true });
  res.json(
    fs
      .readdirSync(MARCAS)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(MARCAS, f), 'utf8'))),
  );
});
app.post('/api/marcas', (req, res) => {
  try {
    const { nombre, kit } = req.body ?? {};
    if (!nombre || !kit) return err(res, 'Faltan nombre o kit');
    const id = nombreSeguro(String(nombre)).toLowerCase();
    fs.mkdirSync(path.join(MARCAS, 'recursos'), { recursive: true });
    let logoArchivo: string | null = null;
    if (kit.marca?.logo) {
      const src = rutaPublica(kit.marca.logo);
      if (fs.existsSync(src)) {
        logoArchivo = `${id}-logo${path.extname(src)}`;
        fs.copyFileSync(src, path.join(MARCAS, 'recursos', logoArchivo));
      }
    }
    const datos = { id, nombre, kit, logoArchivo, fecha: new Date().toISOString() };
    fs.writeFileSync(path.join(MARCAS, `${id}.json`), JSON.stringify(datos, null, 1));
    res.json(datos);
  } catch (e) {
    err(res, e);
  }
});
app.post('/api/marcas/:id/aplicar', (req, res) => {
  try {
    const f = path.join(MARCAS, `${path.basename(req.params.id)}.json`);
    if (!fs.existsSync(f)) return err(res, 'No existe', 404);
    const m = JSON.parse(fs.readFileSync(f, 'utf8'));
    const kit = JSON.parse(JSON.stringify(m.kit));
    if (m.logoArchivo && fs.existsSync(path.join(MARCAS, 'recursos', m.logoArchivo))) {
      const rel = `marca/${m.logoArchivo}`;
      fs.mkdirSync(path.dirname(rutaPublica(rel)), { recursive: true });
      fs.copyFileSync(path.join(MARCAS, 'recursos', m.logoArchivo), rutaPublica(rel));
      kit.marca = { ...(kit.marca ?? {}), logo: rel };
    }
    res.json(kit);
  } catch (e) {
    err(res, e);
  }
});

app.post('/api/mostrar', (req, res) => {
  try {
    mostrarEnCarpeta(String(req.body?.archivo ?? ''));
    res.json({ ok: true });
  } catch (e) {
    err(res, e);
  }
});

app.use('/salidas', express.static(rutas.salidas));
// estudio de diseño (segunda página de la interfaz)
// publicar en redes (tercera página; solo hace algo en la app de escritorio)
app.get('/publicar', (req, res) => res.redirect(`/publicar.html${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
app.get(['/diseno', '/disenos'], (req, res) => res.redirect(`/diseno.html${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
app.get('/__studio/icon.png', (_req, res) => res.sendFile(path.join(EDITOR, 'build', 'icon.png')));

// ——— Interfaz (Vite) ———

/**
 * El código del proyecto (p. ej. metricaseo-promo/src) importa remotion, lucide-react… desde su propia carpeta.
 * En otro equipo esa carpeta llega por Syncthing SIN node_modules: si un paquete no se encuentra desde el
 * proyecto, se usa el que trae la app (misma versión de Remotion). Con node_modules en el proyecto no cambia nada.
 */
const paquetesDeLaApp = () => {
  const desdeApp = path.join(EDITOR, 'app', 'main.tsx');
  return {
    name: 'studio-paquetes-de-la-app',
    enforce: 'pre' as const,
    async resolveId(this: any, fuente: string, importador: string | undefined, opciones: any) {
      if (!importador || /^[./\\]|^[a-zA-Z]:|^\0|^@proyecto|^@contrato|^\/@/.test(fuente)) return null;
      if (path.resolve(importador).startsWith(EDITOR + path.sep)) return null;
      const propio = await this.resolve(fuente, importador, { ...opciones, skipSelf: true });
      if (propio) return propio;
      return this.resolve(fuente, desdeApp, { ...opciones, skipSelf: true });
    },
  };
};

const vite = await createVite({
  configFile: false,
  root: path.join(EDITOR, 'app'),
  publicDir: rutas.publico,
  // Tailwind solo procesa los CSS que lo importan (app/diseno/estilos.css): el editor de vídeo no cambia
  plugins: [react(), tailwind(), paquetesDeLaApp()],
  resolve: {
    alias: { '@proyecto': rutas.entrada, '@contrato': path.join(EDITOR, 'contrato') },
    dedupe: ['react', 'react-dom', 'remotion', '@remotion/player', '@remotion/google-fonts', '@remotion/paths', '@remotion/media-utils', 'zod'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'remotion', '@remotion/player', '@remotion/paths', 'zod', 'zustand', 'immer', 'lucide-react', 'react-dom/server'],
  },
  server: { middlewareMode: true, hmr: { server: srv }, fs: { allow: [EDITOR, PROY, path.resolve(path.dirname(rutas.entrada), '..'), rutas.publico] } },
  appType: 'spa',
  logLevel: 'info',
  cacheDir: path.join(rutas.cache, 'vite'),
});
app.use(vite.middlewares);

// solo en este equipo (127.0.0.1): no abre el puerto a la red ni hace saltar el cortafuegos
srv.listen(PUERTO, '127.0.0.1', () => {
  console.log(`\n  Editor de vídeo → http://localhost:${PUERTO}`);
  console.log(`  Proyecto: ${PROY} (${DESC.nombre})`);
  if (!contratoIgual()) console.warn('  Aviso: la copia de contrato/ del proyecto no coincide con la del editor. Cópiala de editor-video/contrato.');
});
