/**
 * Rutas que dependen del equipo. La carpeta `dev` se sincroniza entre equipos con Syncthing, pero el usuario de
 * Windows puede llamarse distinto en cada uno: todo lo que vive en `dev` se resuelve desde la carpeta personal
 * (`app.getPath('home')`), nunca con una ruta absoluta de este equipo.
 *   «~/dev/…» o «dev/…» (relativa) → <carpeta personal>/dev/…
 *   «C:/…» (absoluta)               → tal cual (solo vale en el equipo donde existe)
 */
const fs = require('node:fs');
const path = require('node:path');

/** Carpeta del kit de vídeo de MétricaSEO dentro de la carpeta sincronizada. */
const KIT_EDITABLES = ['dev', 'Metrica SEO', 'metricaseo-promo', 'editables'];

const resolverRuta = (ruta, home) => {
  if (!ruta || typeof ruta !== 'string') return null;
  const r = ruta.trim();
  if (!r) return null;
  if (r === '~' || r.startsWith('~/') || r.startsWith('~\\')) return path.join(home, r.slice(2));
  return path.isAbsolute(r) ? path.normalize(r) : path.join(home, r);
};

const esProyecto = (dir) => {
  try {
    return fs.existsSync(path.join(dir, 'editor.json')) || fs.existsSync(path.join(dir, 'proyecto.json'));
  } catch {
    return false;
  }
};

/** Proyectos de una carpeta (sus subcarpetas que son proyecto), por nombre. */
const proyectosEn = (carpeta) => {
  try {
    return fs
      .readdirSync(carpeta, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(carpeta, e.name))
      .filter(esProyecto)
      .sort();
  } catch {
    return [];
  }
};

/**
 * Dónde buscar un proyecto de vídeo al abrir, en orden: el pedido por argumento, los recientes de este equipo,
 * el configurado (relativo a la carpeta personal), el del kit en `dev`, cualquier otro del kit, los creados en
 * Documentos y, en desarrollo, el kit junto al código.
 */
const candidatosProyecto = ({ arg, recientes, porDefecto, home, docsVideos, raiz }) => {
  const kit = path.join(home, ...KIT_EDITABLES);
  return [
    arg,
    ...recientes,
    resolverRuta(porDefecto, home),
    path.join(kit, 'promo-agencias-16x9'),
    ...proyectosEn(kit),
    ...proyectosEn(docsVideos),
    path.resolve(raiz, '..', 'metricaseo-promo', 'editables', 'promo-agencias-16x9'),
  ].filter(Boolean);
};

const primerProyecto = (candidatos) => candidatos.find((c) => fs.existsSync(c) && esProyecto(c)) ?? null;

module.exports = { KIT_EDITABLES, resolverRuta, esProyecto, proyectosEn, candidatosProyecto, primerProyecto };
