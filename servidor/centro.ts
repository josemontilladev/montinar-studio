/**
 * Archivos del centro de contenido sincronizado (posts, vídeos, miniaturas) para la vista previa del panel
 * «Publicar»: /centro/<ruta relativa del calendario>. Solo lectura y solo dentro de esa carpeta.
 * La carpeta se resuelve desde la carpeta personal de cada equipo (como electron/rutas.cjs); la app de escritorio
 * puede pasar otra con STUDIO_CENTRO.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type express from 'express';

export const carpetaCentro = () => {
  const home = os.homedir();
  const c = [process.env.STUDIO_CENTRO, path.join(home, 'dev', 'Metrica SEO', 'centro-contenido'), path.join(home, 'Videos', 'MetricaSEO', 'v4')].filter(Boolean) as string[];
  return c.find((d) => fs.existsSync(path.join(d, 'calendario-data.json'))) ?? null;
};

export const registrarCentro = (app: express.Express) => {
  app.use('/centro', (req, res, next) => {
    const base = carpetaCentro();
    if (!base) return next();
    const raiz = path.resolve(base);
    const f = path.resolve(raiz, decodeURIComponent(req.path).replace(/^\/+/, ''));
    if (!f.startsWith(raiz + path.sep) || !/\.(png|jpe?g|webp|gif|mp4|webm|mov|srt|vtt)$/i.test(f) || !fs.existsSync(f)) return next();
    res.sendFile(f, { dotfiles: 'deny', maxAge: 0 });
  });
};
