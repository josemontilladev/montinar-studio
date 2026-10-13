/**
 * Pantalla de inicio: proyectos recientes (con miniatura), buscar, duplicar, renombrar, borrar (a la papelera de la
 * app, nunca de verdad) y crear proyectos nuevos a partir de plantillas.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import type express from 'express';
import { DATOS, FFMPEG, PROY, rutas } from './config';
import { nombreSeguro } from './medios';

export const CARPETA_PROYECTOS = process.env.STUDIO_PROYECTOS ?? path.join(os.homedir(), 'Documents', 'Montinar Studio');
const PAPELERA = path.join(DATOS, 'papelera');
const RECIENTES = path.join(DATOS, 'recientes.json');

const leerJSON = (f: string) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const esProyecto = (d: string) => fs.existsSync(path.join(d, 'proyecto.json')) || fs.existsSync(path.join(d, 'editor.json'));
const recientes = (): string[] => (leerJSON(RECIENTES) ?? []).filter((p: string) => typeof p === 'string');
const guardarRecientes = (l: string[]) => {
  fs.mkdirSync(DATOS, { recursive: true });
  fs.writeFileSync(RECIENTES, JSON.stringify([...new Set(l)].slice(0, 30), null, 1));
};

export const listarProyectos = () => {
  const dirs = new Set<string>([path.resolve(PROY), ...recientes().map((p) => path.resolve(p))]);
  if (fs.existsSync(CARPETA_PROYECTOS)) for (const e of fs.readdirSync(CARPETA_PROYECTOS, { withFileTypes: true })) if (e.isDirectory()) dirs.add(path.join(CARPETA_PROYECTOS, e.name));
  const out = [];
  for (const d of dirs) {
    if (!fs.existsSync(d) || !esProyecto(d)) continue;
    const desc = leerJSON(path.join(d, 'editor.json')) ?? {};
    const pj = path.join(d, desc.proyecto ?? 'proyecto.json');
    const p = leerJSON(pj);
    const st = fs.existsSync(pj) ? fs.statSync(pj) : fs.statSync(d);
    const fps = p?.ajustes?.fps ?? 30;
    const dur = (p?.escenas ?? []).reduce((a: number, e: any) => a + (e.duracion ?? 0), 0) / fps;
    out.push({ ruta: d, nombre: desc.nombre ?? p?.nombre ?? path.basename(d), mtime: st.mtimeMs, escenas: p?.escenas?.length ?? 0, duracion: Math.round(dur * 10) / 10, formato: p ? `${p.ajustes.ancho}×${p.ajustes.alto}` : '', actual: path.resolve(d) === path.resolve(PROY) });
  }
  return out.sort((a, b) => b.mtime - a.mtime);
};

const conocido = (d: string) => listarProyectos().some((x) => path.resolve(x.ruta) === path.resolve(String(d)));
const sello = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

/** Copia un proyecto sin lo pesado (node_modules se enlaza, salidas y cachés no se copian). */
const copiarProyecto = (de: string, a: string, soloEsqueleto = false) => {
  const fuera = new Set(['node_modules', 'out', '.versiones', '.cache', '.git', 'proyecto-prueba.json']);
  const copiar = (x: string, y: string, nivel = 0) => {
    fs.mkdirSync(y, { recursive: true });
    for (const e of fs.readdirSync(x, { withFileTypes: true })) {
      if (nivel === 0 && fuera.has(e.name)) continue;
      // las herramientas (voces de Piper…) se comparten con un enlace; en una plantilla nueva no hacen falta
      if (nivel === 0 && (e.name === 'tools' || (soloEsqueleto && e.name === 'scripts'))) {
        if (!soloEsqueleto && e.isDirectory()) fs.symlinkSync(fs.realpathSync(path.join(x, e.name)), path.join(y, e.name), 'junction');
        continue;
      }
      // en una plantilla nueva solo se llevan los datos de las tomas (json) y el audio de la biblioteca, no los vídeos
      if (soloEsqueleto && nivel === 1 && path.basename(x) === 'public' && !['audio', 'footage', 'fuentes'].includes(e.name)) continue;
      if (soloEsqueleto && path.basename(x) === 'footage' && !e.name.endsWith('.json')) continue;
      const s = path.join(x, e.name),
        t = path.join(y, e.name);
      if (e.isDirectory()) copiar(s, t, nivel + 1);
      else fs.copyFileSync(s, t);
    }
  };
  copiar(de, a);
  // las dependencias (Remotion…) se comparten con un enlace de carpeta: no ocupa espacio ni hace falta instalar
  const nm = path.join(de, 'node_modules');
  if (fs.existsSync(nm) && !fs.existsSync(path.join(a, 'node_modules'))) fs.symlinkSync(fs.realpathSync(nm), path.join(a, 'node_modules'), 'junction');
};

const moverA = (de: string, a: string) => {
  try {
    fs.renameSync(de, a);
  } catch {
    // otra unidad: copiar y luego quitar el original (los enlaces de carpeta se rehacen, no se copian)
    // los enlaces de carpeta (node_modules, tools) se rehacen en el destino y se quitan SIN entrar en ellos
    const enlaces = fs.readdirSync(de).filter((n) => fs.lstatSync(path.join(de, n)).isSymbolicLink());
    fs.cpSync(de, a, { recursive: true, filter: (s) => !(path.dirname(s) === de && enlaces.includes(path.basename(s))) });
    for (const n of enlaces) {
      fs.symlinkSync(fs.realpathSync(path.join(de, n)), path.join(a, n), 'junction');
      fs.unlinkSync(path.join(de, n));
    }
    fs.rmSync(de, { recursive: true, force: true });
  }
};

export const registrarInicio = (app: express.Express, err: (res: express.Response, e: any, code?: number) => any) => {
  app.get('/api/inicio/proyectos', (_req, res) => {
    try {
      res.json({ proyectos: listarProyectos(), carpeta: CARPETA_PROYECTOS, papelera: fs.existsSync(PAPELERA) ? fs.readdirSync(PAPELERA).map((n) => ({ nombre: n, ruta: path.join(PAPELERA, n), mtime: fs.statSync(path.join(PAPELERA, n)).mtimeMs })) : [] });
    } catch (e) {
      err(res, e, 500);
    }
  });

  // miniatura: un fotograma de la primera toma de vídeo del proyecto (en caché)
  app.get('/api/inicio/miniatura', (req, res) => {
    try {
      const d = String(req.query.ruta ?? '');
      if (!conocido(d)) return err(res, 'Proyecto desconocido', 404);
      const desc = leerJSON(path.join(d, 'editor.json')) ?? {};
      const p = leerJSON(path.join(d, desc.proyecto ?? 'proyecto.json'));
      const pub = path.join(d, desc.publico ?? 'public');
      const toma = (p?.escenas ?? []).flatMap((e: any) => e.tomas ?? []).find((t: any) => /\.(mp4|webm|mov|png|jpe?g)$/i.test(t.src) && fs.existsSync(path.join(pub, t.src)));
      if (!toma) return err(res, 'Sin miniatura', 404);
      const abs = path.join(pub, toma.src);
      const dir = path.join(rutas.cache, 'inicio');
      fs.mkdirSync(dir, { recursive: true });
      const f = path.join(dir, `${nombreSeguro(d).slice(-50)}-${fs.statSync(abs).mtimeMs.toFixed(0)}.jpg`);
      if (fs.existsSync(f)) return res.sendFile(f, { dotfiles: 'allow' });
      execFile(FFMPEG, ['-v', 'error', '-ss', String(Math.max(0, (toma.t0 ?? 0) + 0.5)), '-i', abs, '-frames:v', '1', '-vf', 'scale=-2:360', '-q:v', '4', '-c:v', 'mjpeg', '-f', 'image2pipe', '-'], { encoding: 'buffer', windowsHide: true, maxBuffer: 1 << 22 }, (e, out) => {
        if (e || !out.length) return err(res, 'Sin fotograma', 404);
        fs.writeFileSync(f, out);
        res.type('jpg').send(out);
      });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/inicio/duplicar', (req, res) => {
    try {
      const d = String(req.body?.ruta ?? '');
      if (!conocido(d)) return err(res, 'Proyecto desconocido');
      fs.mkdirSync(CARPETA_PROYECTOS, { recursive: true });
      let dest = path.join(CARPETA_PROYECTOS, `${path.basename(d)}-copia`);
      for (let k = 2; fs.existsSync(dest); k++) dest = path.join(CARPETA_PROYECTOS, `${path.basename(d)}-copia-${k}`);
      copiarProyecto(d, dest);
      const desc = leerJSON(path.join(dest, 'editor.json'));
      if (desc) fs.writeFileSync(path.join(dest, 'editor.json'), JSON.stringify({ ...desc, nombre: `${desc.nombre ?? path.basename(d)} (copia)` }, null, 2));
      guardarRecientes([dest, ...recientes()]);
      res.json({ ruta: dest });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/inicio/renombrar', (req, res) => {
    try {
      const d = String(req.body?.ruta ?? '');
      const nombre = String(req.body?.nombre ?? '').trim().slice(0, 80);
      if (!conocido(d) || !nombre) return err(res, 'Petición no válida');
      const f = path.join(d, 'editor.json');
      const desc = leerJSON(f) ?? { proyecto: 'proyecto.json' };
      fs.writeFileSync(f, JSON.stringify({ ...desc, nombre }, null, 2));
      res.json({ ok: true });
    } catch (e) {
      err(res, e);
    }
  });

  // borrar = mover a la papelera de la app (se puede recuperar); nunca el proyecto abierto
  app.post('/api/inicio/borrar', (req, res) => {
    try {
      const d = path.resolve(String(req.body?.ruta ?? ''));
      if (!conocido(d)) return err(res, 'Proyecto desconocido');
      if (d === path.resolve(PROY)) return err(res, 'No se puede borrar el proyecto que está abierto');
      fs.mkdirSync(PAPELERA, { recursive: true });
      const dest = path.join(PAPELERA, `${path.basename(d)}-${sello()}`);
      fs.writeFileSync(path.join(d, '.origen-papelera'), d);
      moverA(d, dest);
      guardarRecientes(recientes().filter((x) => path.resolve(x) !== d));
      res.json({ ok: true, papelera: dest });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/inicio/recuperar', (req, res) => {
    try {
      const d = path.resolve(String(req.body?.ruta ?? ''));
      if (path.dirname(d) !== path.resolve(PAPELERA) || !fs.existsSync(d)) return err(res, 'No está en la papelera');
      let dest = fs.existsSync(path.join(d, '.origen-papelera')) ? fs.readFileSync(path.join(d, '.origen-papelera'), 'utf8').trim() : path.join(CARPETA_PROYECTOS, path.basename(d));
      for (let k = 2; fs.existsSync(dest); k++) dest = `${dest}-${k}`;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      moverA(d, dest);
      fs.rmSync(path.join(dest, '.origen-papelera'), { force: true });
      guardarRecientes([dest, ...recientes()]);
      res.json({ ruta: dest });
    } catch (e) {
      err(res, e);
    }
  });

  // proyecto nuevo desde plantilla: el cliente manda el proyecto.json ya armado (con las plantillas del proyecto actual)
  app.post('/api/inicio/nuevo', (req, res) => {
    try {
      const nombre = String(req.body?.nombre ?? '').trim().slice(0, 80) || 'Proyecto nuevo';
      const proyecto = req.body?.proyecto;
      if (!proyecto?.escenas) return err(res, 'Falta el proyecto');
      fs.mkdirSync(CARPETA_PROYECTOS, { recursive: true });
      let dest = path.join(CARPETA_PROYECTOS, nombreSeguro(nombre).toLowerCase());
      for (let k = 2; fs.existsSync(dest); k++) dest = path.join(CARPETA_PROYECTOS, `${nombreSeguro(nombre).toLowerCase()}-${k}`);
      copiarProyecto(PROY, dest, true);
      // sin voz propia ni guion: el proyecto nuevo empieza limpio
      const desc = leerJSON(path.join(PROY, 'editor.json')) ?? {};
      delete desc.voz;
      fs.writeFileSync(path.join(dest, 'editor.json'), JSON.stringify({ ...desc, nombre, proyecto: 'proyecto.json' }, null, 2));
      for (const f of ['proyecto-sinvoz.json', 'guion.json', 'guion.md']) fs.rmSync(path.join(dest, f), { force: true });
      fs.writeFileSync(path.join(dest, 'proyecto.json'), JSON.stringify({ ...proyecto, nombre }, null, 1));
      // tomas capturadas de una web (Web → vídeo): pasan de la caché al proyecto nuevo
      const cap = String(req.body?.capturas ?? '');
      if (/^[a-z0-9]+$/.test(cap)) {
        const de = path.join(rutas.cache, 'capturas', cap);
        if (fs.existsSync(de)) {
          fs.mkdirSync(path.join(dest, 'public', 'footage'), { recursive: true });
          for (const f of fs.readdirSync(de)) fs.copyFileSync(path.join(de, f), path.join(dest, 'public', 'footage', f));
          fs.rmSync(de, { recursive: true, force: true });
        }
      }
      guardarRecientes([dest, ...recientes()]);
      res.json({ ruta: dest });
    } catch (e) {
      err(res, e);
    }
  });
};
