/**
 * Biblioteca sincronizada: si el equipo tiene la carpeta `dev` (Syncthing entre la laptop y el PC), la biblioteca
 * compartida, los kits de marca, los estilos propios, los diseños y los proyectos de vídeo viven en
 * `~/dev/Metrica SEO/studio-biblioteca`, así se ven igual en todos los equipos. Sin `dev`, todo sigue en los datos
 * de la app y en Documentos, como antes.
 *
 * La primera vez COPIA (nunca mueve ni borra) lo que hubiera en el equipo; lo que ya exista en la carpeta
 * sincronizada no se toca. Deja `.sincronizada.json` en los datos de la app para no repetirlo.
 */
const fs = require('node:fs');
const path = require('node:path');
const { copiar } = require('./migrar.cjs');

/** Carpeta sincronizada de este equipo, o null si no hay `dev` (o se simula un equipo sin ella). */
const carpetaSincronizada = (home) => {
  if (process.env.STUDIO_SIN_KIT === '1') return null;
  if (process.env.STUDIO_COMPARTIDA) return process.env.STUDIO_COMPARTIDA;
  const dev = path.join(home, 'dev');
  return fs.existsSync(dev) ? path.join(dev, 'Metrica SEO', 'studio-biblioteca') : null;
};

/** Lo que se lleva de los datos de la app y de Documentos a la carpeta sincronizada. */
const DE_DATOS = ['biblioteca', 'marcas', 'estilos-usuario.json'];
const DE_DOCS = ['Diseños', 'Videos'];

const llevarASincronizada = ({ datos, docsLocal, destino }) => {
  const marca = path.join(datos, '.sincronizada.json');
  if (!destino || fs.existsSync(marca)) return { hecho: false, copiados: [] };
  const copiados = [];
  const log = () => {};
  fs.mkdirSync(destino, { recursive: true });
  for (const n of DE_DATOS) {
    const de = path.join(datos, n);
    if (fs.existsSync(de)) (copiar(de, path.join(destino, n), log), copiados.push(n));
  }
  for (const n of DE_DOCS) {
    const de = path.join(docsLocal, n);
    if (fs.existsSync(de)) (copiar(de, path.join(destino, n), log), copiados.push(n));
  }
  // los recientes que apuntaban a Documentos pasan a la copia sincronizada
  const rec = path.join(datos, 'recientes.json');
  if (fs.existsSync(rec)) {
    try {
      const l = JSON.parse(fs.readFileSync(rec, 'utf8'));
      const n = l.map((p) => {
        if (typeof p !== 'string' || !p.startsWith(docsLocal)) return p;
        const q = destino + p.slice(docsLocal.length);
        return fs.existsSync(q) ? q : p;
      });
      fs.writeFileSync(rec, JSON.stringify(n, null, 1));
    } catch {}
  }
  fs.mkdirSync(datos, { recursive: true });
  fs.writeFileSync(marca, JSON.stringify({ fecha: new Date().toISOString(), destino, copiados }, null, 1));
  return { hecho: true, copiados };
};

module.exports = { carpetaSincronizada, llevarASincronizada };
