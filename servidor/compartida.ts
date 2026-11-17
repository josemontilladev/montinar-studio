/**
 * Biblioteca compartida entre proyectos (en los datos de la app, %APPDATA%\Montinar Studio\biblioteca): logos,
 * música, efectos de sonido, tipografías y escenas plantilla; los colores y fuentes van en los kits de marca. Se puede
 * exportar e importar como .zip (al importar se guarda antes una copia de seguridad).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import type express from 'express';
import { DATOS, rutas } from './config';
import { nombreSeguro, rutaPublica } from './medios';

const BIB = path.join(DATOS, 'biblioteca');
export const TIPOS_BIB: Record<string, { carpeta: string; destino: string; ext: RegExp }> = {
  logos: { carpeta: 'logos', destino: 'imagenes/logos', ext: /\.(png|jpe?g|webp|svg|avif)$/i },
  musica: { carpeta: 'musica', destino: 'audio/musica', ext: /\.(wav|mp3|m4a|aac|ogg|flac)$/i },
  sfx: { carpeta: 'sfx', destino: 'audio/sfx', ext: /\.(wav|mp3|m4a|aac|ogg|flac)$/i },
  fuentes: { carpeta: 'fuentes', destino: 'fuentes/propias', ext: /\.(woff2?|ttf|otf)$/i },
  plantillas: { carpeta: 'plantillas', destino: '', ext: /\.json$/i },
};
const TAR = process.platform === 'win32' && fs.existsSync('C:\\Windows\\System32\\tar.exe') ? 'C:\\Windows\\System32\\tar.exe' : 'tar';
const sello = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const dirTipo = (t: string) => {
  const d = TIPOS_BIB[t];
  if (!d) throw new Error('Tipo no válido');
  const dir = path.join(BIB, d.carpeta);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const registrarCompartida = (app: express.Express, err: (res: express.Response, e: any, code?: number) => any) => {
  app.use('/compartida', (req, res, next) => {
    // servir los archivos de la biblioteca (para escuchar y ver miniaturas)
    const f = path.resolve(BIB, decodeURIComponent(req.path).replace(/^\/+/, ''));
    if (!f.startsWith(path.resolve(BIB)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return next();
    res.sendFile(f, { dotfiles: 'allow' });
  });

  app.get('/api/compartida', (_req, res) => {
    try {
      const out: Record<string, { nombre: string; tam: number; mtime: number; datos?: any }[]> = {};
      for (const [t, d] of Object.entries(TIPOS_BIB)) {
        const dir = dirTipo(t);
        out[t] = fs
          .readdirSync(dir)
          .filter((n) => d.ext.test(n))
          .map((n) => {
            const st = fs.statSync(path.join(dir, n));
            return { nombre: n, tam: st.size, mtime: st.mtimeMs, ...(t === 'plantillas' ? { datos: JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')) } : {}) };
          });
      }
      res.json({ carpeta: BIB, ...out });
    } catch (e) {
      err(res, e, 500);
    }
  });

  // subir un archivo a la biblioteca (cuerpo binario)
  app.post('/api/compartida/subir', (req, res) => {
    try {
      const t = String(req.query.tipo ?? '');
      const n = nombreSeguro(String(req.query.nombre ?? 'archivo'));
      if (!TIPOS_BIB[t]?.ext.test(n)) return err(res, 'Tipo de archivo no admitido para esa sección');
      const f = path.join(dirTipo(t), n);
      const out = fs.createWriteStream(f);
      req.pipe(out);
      out.on('finish', () => res.json({ ok: true, nombre: n }));
      out.on('error', (e) => err(res, e, 500));
    } catch (e) {
      err(res, e);
    }
  });

  // guardar en la biblioteca algo del proyecto (un medio de public/ o una escena como plantilla)
  app.post('/api/compartida/desde-proyecto', (req, res) => {
    try {
      const t = String(req.body?.tipo ?? '');
      if (t === 'plantillas') {
        const n = `${nombreSeguro(String(req.body?.nombre ?? 'escena'))}.json`;
        fs.writeFileSync(path.join(dirTipo(t), n), JSON.stringify({ nombre: req.body?.nombre, escena: req.body?.escena, fecha: new Date().toISOString() }, null, 1));
        return res.json({ ok: true, nombre: n });
      }
      const abs = rutaPublica(String(req.body?.ruta ?? ''));
      if (!fs.existsSync(abs) || !TIPOS_BIB[t]?.ext.test(abs)) return err(res, 'No existe o no es de ese tipo');
      fs.copyFileSync(abs, path.join(dirTipo(t), path.basename(abs)));
      res.json({ ok: true, nombre: path.basename(abs) });
    } catch (e) {
      err(res, e);
    }
  });

  // usar en el proyecto abierto: se copia a public/<destino> (los proyectos siguen siendo autónomos)
  app.post('/api/compartida/usar', (req, res) => {
    try {
      const t = String(req.body?.tipo ?? '');
      const n = path.basename(String(req.body?.nombre ?? ''));
      const src = path.join(dirTipo(t), n);
      if (!fs.existsSync(src) || t === 'plantillas') return err(res, 'No existe');
      const rel = `${TIPOS_BIB[t].destino}/${n}`;
      const dest = rutaPublica(rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
      res.json({ ruta: rel });
    } catch (e) {
      err(res, e);
    }
  });

  app.post('/api/compartida/borrar', (req, res) => {
    try {
      const t = String(req.body?.tipo ?? '');
      const n = path.basename(String(req.body?.nombre ?? ''));
      // no se borra de verdad: va a la papelera de la app
      const pap = path.join(DATOS, 'papelera', 'biblioteca');
      fs.mkdirSync(pap, { recursive: true });
      fs.renameSync(path.join(dirTipo(t), n), path.join(pap, `${sello()}-${n}`));
      res.json({ ok: true });
    } catch (e) {
      err(res, e);
    }
  });

  // copia de seguridad / exportar: biblioteca + kits de marca en un .zip
  const zip = (dest: string) =>
    new Promise<void>((ok, ko) => {
      fs.mkdirSync(BIB, { recursive: true });
      fs.mkdirSync(rutas.marcas, { recursive: true });
      execFile(TAR, ['-a', '-c', '-f', dest, '-C', DATOS, 'biblioteca', path.relative(DATOS, rutas.marcas) || 'marcas'], { windowsHide: true }, (e, _o, se) => (e ? ko(new Error(String(se || e.message))) : ok()));
    });
  app.get('/api/compartida/exportar', async (_req, res) => {
    try {
      fs.mkdirSync(rutas.cache, { recursive: true });
      const f = path.join(rutas.cache, `biblioteca-${sello()}.zip`);
      await zip(f);
      res.download(f, `biblioteca-metricaseo-studio-${sello()}.zip`, { dotfiles: 'allow' }, () => fs.rmSync(f, { force: true }));
    } catch (e) {
      err(res, e, 500);
    }
  });
  app.post('/api/compartida/importar', async (req, res) => {
    try {
      fs.mkdirSync(rutas.cache, { recursive: true });
      const f = path.join(rutas.cache, `importar-${sello()}.zip`);
      await new Promise<void>((ok, ko) => {
        const out = fs.createWriteStream(f);
        req.pipe(out);
        out.on('finish', () => ok());
        out.on('error', ko);
      });
      // antes de mezclar, copia de seguridad de lo que hay
      const copias = path.join(DATOS, 'copias');
      fs.mkdirSync(copias, { recursive: true });
      const copia = path.join(copias, `biblioteca-antes-de-importar-${sello()}.zip`);
      await zip(copia);
      // solo se aceptan entradas dentro de biblioteca/ y marcas/ (tar rechaza rutas con «..» y absolutas)
      const lista = await new Promise<string>((ok, ko) => execFile(TAR, ['-t', '-f', f], { windowsHide: true, maxBuffer: 1 << 24 }, (e, o) => (e ? ko(e) : ok(o))));
      const malas = lista.split(/\r?\n/).filter((x) => x && !/^(biblioteca|marcas)(\/|$)/.test(x.replace(/\\/g, '/')));
      if (malas.length) throw new Error(`El .zip no es una biblioteca de MétricaSEO Studio (${malas.slice(0, 3).join(', ')})`);
      await new Promise<void>((ok, ko) => execFile(TAR, ['-x', '-f', f, '-C', DATOS], { windowsHide: true }, (e, _o, se) => (e ? ko(new Error(String(se || e.message))) : ok())));
      fs.rmSync(f, { force: true });
      res.json({ ok: true, copia });
    } catch (e) {
      err(res, e);
    }
  });
};
