/**
 * Estudio de diseño: cada diseño es una carpeta en Documentos\MetricaSEO Studio\Diseños\<nombre>\ con diseno.json
 * (validado con zod), recursos\ (imágenes subidas) y miniatura.png. Borrar mueve a Diseños\.papelera. Las
 * exportaciones van a Descargas\MetricaSEO Studio. Ninguna ruta pedida puede salir de esas carpetas.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import express from 'express';
import { validarDiseno } from '../app/diseno/esquema';
import { BIB } from './compartida';

const DOCS = process.env.STUDIO_DOCS_APP ?? path.join(os.homedir(), 'Documents', 'MetricaSEO Studio');
export const CARPETA_DISENOS = path.join(DOCS, 'Diseños');
export const CARPETA_EXPORTAR = process.env.STUDIO_DESCARGAS ?? path.join(os.homedir(), 'Downloads', 'MetricaSEO Studio');
const PAPELERA = path.join(CARPETA_DISENOS, '.papelera');
const IMG = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
/** Id ficticio de la biblioteca compartida en «Mis imágenes»: sus logos y gráficos se usan como los de otro diseño. */
const BIBLIOTECA = '@biblioteca';
const enBiblioteca = (src: string) => {
  const f = path.resolve(BIB, src);
  if (!/^(logos|graficos)[\\/]/.test(path.relative(BIB, f)) || !IMG.test(f)) throw new Error('Ruta no válida');
  return f;
};

type Err = (res: express.Response, e: any, code?: number) => void;

/** Nombre de archivo/carpeta seguro en Windows (sin \ / : * ? " < > | ni puntos al principio). */
const limpio = (s: string, max = 80) =>
  s
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, max) || 'Diseño';

/** Carpeta de un diseño a partir de su id (= nombre de la carpeta); error si no es un hijo directo de Diseños. */
const carpeta = (id: string) => {
  const d = path.resolve(CARPETA_DISENOS, String(id));
  if (path.dirname(d) !== path.resolve(CARPETA_DISENOS) || path.basename(d).startsWith('.') || !fs.existsSync(path.join(d, 'diseno.json'))) throw new Error('No existe ese diseño');
  return d;
};
/** Archivo dentro de la carpeta de un diseño (recursos/x.png, miniatura.png). */
const dentro = (dir: string, rel: string) => {
  const f = path.resolve(dir, rel);
  if (!f.startsWith(dir + path.sep)) throw new Error('Ruta no válida');
  return f;
};
const libre = (padre: string, nombre: string) => {
  let n = nombre;
  for (let k = 2; fs.existsSync(path.join(padre, n)); k++) n = `${nombre} (${k})`;
  return n;
};
const leer = (dir: string) => validarDiseno(JSON.parse(fs.readFileSync(path.join(dir, 'diseno.json'), 'utf8')));
const escribir = (dir: string, doc: unknown) => {
  const d = validarDiseno(doc);
  const tmp = path.join(dir, 'diseno.json.tmp');
  fs.writeFileSync(tmp, JSON.stringify(d, null, 1));
  fs.renameSync(tmp, path.join(dir, 'diseno.json'));
  return d;
};
const guardarPng = (f: string, dataUrl: unknown) => {
  const m = /^data:image\/png;base64,(.+)$/.exec(String(dataUrl ?? ''));
  if (m) fs.writeFileSync(f, Buffer.from(m[1], 'base64'));
};
const abrirEnExplorador = (abs: string) => {
  if (process.platform === 'win32') spawn('explorer.exe', [fs.statSync(abs).isDirectory() ? abs : `/select,${abs}`], { detached: true });
  else if (process.platform === 'darwin') spawn('open', ['-R', abs]);
  else spawn('xdg-open', [path.dirname(abs)]);
};

export const listarDisenos = () => {
  if (!fs.existsSync(CARPETA_DISENOS)) return [];
  const out = [];
  for (const e of fs.readdirSync(CARPETA_DISENOS, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const dir = path.join(CARPETA_DISENOS, e.name);
    try {
      const d = leer(dir);
      const mini = path.join(dir, 'miniatura.png');
      out.push({ id: e.name, nombre: d.nombre, ancho: d.ancho, alto: d.alto, paginas: d.paginas.length, mtime: fs.statSync(path.join(dir, 'diseno.json')).mtimeMs, miniatura: fs.existsSync(mini) ? fs.statSync(mini).mtimeMs : 0 });
    } catch {}
  }
  return out.sort((a, b) => b.mtime - a.mtime);
};

export const registrarDisenos = (app: express.Express, err: Err) => {
  const ruta = (fn: (req: express.Request, res: express.Response) => unknown) => (req: express.Request, res: express.Response) => {
    try {
      const r = fn(req, res);
      if (r !== undefined) res.json(r);
    } catch (e) {
      err(res, e);
    }
  };

  app.get('/api/disenos', ruta(() => ({ carpeta: CARPETA_DISENOS, exportar: CARPETA_EXPORTAR, disenos: listarDisenos() })));

  app.post(
    '/api/disenos/nuevo',
    ruta((req) => {
      const doc = validarDiseno(req.body?.doc);
      fs.mkdirSync(CARPETA_DISENOS, { recursive: true });
      const id = libre(CARPETA_DISENOS, limpio(doc.nombre));
      const dir = path.join(CARPETA_DISENOS, id);
      fs.mkdirSync(path.join(dir, 'recursos'), { recursive: true });
      escribir(dir, doc);
      return { id };
    }),
  );

  app.get('/api/disenos/:id', ruta((req) => leer(carpeta(String(req.params.id)))));

  const guardar = ruta((req) => {
      const dir = carpeta(String(req.params.id));
      escribir(dir, req.body?.doc);
      if (req.body?.miniatura) guardarPng(path.join(dir, 'miniatura.png'), req.body.miniatura);
      return { ok: true, mtime: fs.statSync(path.join(dir, 'diseno.json')).mtimeMs };
  });
  app.put('/api/disenos/:id', guardar);
  // lo mismo por sendBeacon al cerrar la página (POST)
  app.post('/api/disenos/:id/guardar', guardar);

  app.post(
    '/api/disenos/:id/duplicar',
    ruta((req) => {
      const dir = carpeta(String(req.params.id));
      const d = leer(dir);
      const nombre = `${d.nombre} (copia)`;
      const id = libre(CARPETA_DISENOS, limpio(nombre));
      fs.cpSync(dir, path.join(CARPETA_DISENOS, id), { recursive: true });
      escribir(path.join(CARPETA_DISENOS, id), { ...d, nombre });
      return { id };
    }),
  );

  app.post(
    '/api/disenos/:id/renombrar',
    ruta((req) => {
      const dir = carpeta(String(req.params.id));
      const nombre = String(req.body?.nombre ?? '').trim().slice(0, 120);
      if (!nombre) throw new Error('Escribe un nombre');
      escribir(dir, { ...leer(dir), nombre });
      let id = path.basename(dir);
      const nuevo = limpio(nombre);
      if (nuevo !== id) {
        // solo cambian mayúsculas: Windows no distingue, se pasa por un nombre temporal
        const tmp = nuevo.toLowerCase() === id.toLowerCase() ? `${dir}.renombrando` : null;
        if (tmp) fs.renameSync(dir, tmp);
        id = tmp ? nuevo : libre(CARPETA_DISENOS, nuevo);
        fs.renameSync(tmp ?? dir, path.join(CARPETA_DISENOS, id));
      }
      return { id };
    }),
  );

  app.post(
    '/api/disenos/:id/borrar',
    ruta((req) => {
      const dir = carpeta(String(req.params.id));
      fs.mkdirSync(PAPELERA, { recursive: true });
      const sello = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      fs.renameSync(dir, path.join(PAPELERA, `${path.basename(dir)} ${sello}`));
      return { ok: true };
    }),
  );

  // imagen subida (cuerpo binario): se copia en recursos/ con un nombre libre
  app.post('/api/disenos/:id/imagen', (req, res) => {
    try {
      const dir = carpeta(String(req.params.id));
      const nombre = limpio(path.basename(String(req.query.nombre ?? 'imagen.png')), 90);
      if (!IMG.test(nombre)) return err(res, 'Solo imágenes (png, jpg, webp, gif, avif, svg)');
      fs.mkdirSync(path.join(dir, 'recursos'), { recursive: true });
      const final = libre(path.join(dir, 'recursos'), nombre);
      const f = dentro(dir, `recursos/${final}`);
      const out = fs.createWriteStream(f);
      req.pipe(out);
      out.on('finish', () => res.json({ src: `recursos/${final}` }));
      out.on('error', (e) => err(res, e, 500));
    } catch (e) {
      err(res, e);
    }
  });

  // «Mis imágenes»: las de todos los diseños
  app.get(
    '/api/disenos-imagenes',
    ruta(() => {
      const out: { id: string; src: string; nombre: string; mtime: number }[] = [];
      for (const d of listarDisenos()) {
        const r = path.join(CARPETA_DISENOS, d.id, 'recursos');
        if (!fs.existsSync(r)) continue;
        for (const f of fs.readdirSync(r)) if (IMG.test(f)) out.push({ id: d.id, src: `recursos/${f}`, nombre: f, mtime: fs.statSync(path.join(r, f)).mtimeMs });
      }
      // y los logos y gráficos de la biblioteca compartida (sincronizada entre equipos)
      for (const t of ['logos', 'graficos']) {
        const r = path.join(BIB, t);
        if (!fs.existsSync(r)) continue;
        for (const f of fs.readdirSync(r)) if (IMG.test(f)) out.push({ id: BIBLIOTECA, src: `${t}/${f}`, nombre: f, mtime: fs.statSync(path.join(r, f)).mtimeMs });
      }
      return out.sort((a, b) => b.mtime - a.mtime);
    }),
  );

  // usar en un diseño una imagen de otro: se copia a sus recursos
  app.post(
    '/api/disenos/:id/importar',
    ruta((req) => {
      const dir = carpeta(String(req.params.id));
      const desdeBib = req.body?.de === BIBLIOTECA;
      const de = desdeBib ? BIB : carpeta(String(req.body?.de ?? ''));
      const src = desdeBib ? enBiblioteca(String(req.body?.src ?? '')) : dentro(de, String(req.body?.src ?? ''));
      if (!fs.existsSync(src) || !IMG.test(src)) throw new Error('No existe esa imagen');
      if (de === dir) return { src: String(req.body.src) };
      fs.mkdirSync(path.join(dir, 'recursos'), { recursive: true });
      const final = libre(path.join(dir, 'recursos'), path.basename(src));
      fs.copyFileSync(src, path.join(dir, 'recursos', final));
      return { src: `recursos/${final}` };
    }),
  );

  app.get('/api/disenos/:id/recurso', (req, res) => {
    try {
      const id = String(req.params.id);
      const f = id === BIBLIOTECA ? enBiblioteca(String(req.query.f ?? '')) : dentro(carpeta(id), String(req.query.f ?? ''));
      if (!fs.existsSync(f)) return err(res, 'No existe', 404);
      res.set('Cache-Control', 'no-cache');
      res.sendFile(f);
    } catch (e) {
      err(res, e, 404);
    }
  });

  // exportación: un archivo por petición (PNG/JPG en base64)
  app.post(
    '/api/disenos-exportar',
    ruta((req) => {
      const nombre = limpio(String(req.body?.nombre ?? ''), 120);
      const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(String(req.body?.datos ?? ''));
      if (!m || !/\.(png|jpe?g)$/i.test(nombre)) throw new Error('Exportación no válida');
      fs.mkdirSync(CARPETA_EXPORTAR, { recursive: true });
      const f = path.join(CARPETA_EXPORTAR, nombre);
      fs.writeFileSync(f, Buffer.from(m[2], 'base64'));
      return { archivo: f };
    }),
  );

  app.post(
    '/api/disenos-mostrar',
    ruta((req) => {
      const f = path.resolve(String(req.body?.archivo ?? CARPETA_EXPORTAR));
      const ok = [CARPETA_EXPORTAR, CARPETA_DISENOS].some((b) => f === path.resolve(b) || f.startsWith(path.resolve(b) + path.sep));
      if (!ok || !fs.existsSync(f)) throw new Error('Ruta no válida');
      abrirEnExplorador(f);
      return { ok: true };
    }),
  );
};
