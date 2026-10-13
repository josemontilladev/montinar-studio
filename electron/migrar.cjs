/**
 * Migración de Montilla Studio → Montinar Studio (primer arranque). COPIA (nunca mueve ni borra) los datos de la app
 * vieja a la nueva y los proyectos de «Documentos\Montilla Studio» a «Documentos\Montinar Studio». Es idempotente:
 * deja `.migracion.json` en los datos nuevos y no vuelve a copiar; lo que ya exista en destino no se toca. Registro en
 * `migracion.log`.
 */
const fs = require('node:fs');
const path = require('node:path');

/** Datos de la app que se llevan (lo demás es caché que se regenera sola). */
const ELEMENTOS = ['recientes.json', 'preferencias.json', 'estilos-usuario.json', 'actualizaciones.json', 'biblioteca', 'marcas', 'modelos', 'copias', 'papelera', 'Local Storage'];

const copiar = (de, a, log) => {
  const st = fs.lstatSync(de);
  if (st.isSymbolicLink()) {
    // enlaces de carpeta (node_modules / tools compartidos): se rehacen apuntando al mismo sitio
    if (!fs.existsSync(a)) fs.symlinkSync(fs.realpathSync(de), a, 'junction');
    return;
  }
  if (st.isDirectory()) {
    fs.mkdirSync(a, { recursive: true });
    for (const n of fs.readdirSync(de)) copiar(path.join(de, n), path.join(a, n), log);
    return;
  }
  if (fs.existsSync(a)) return; // nunca se sobrescribe lo nuevo
  fs.copyFileSync(de, a);
};

/**
 * @param {{ viejo: string, nuevo: string, docsViejo: string, docsNuevo: string }} r
 * @returns {{ hecho: boolean, motivo?: string, copiados: string[] }}
 */
const migrar = ({ viejo, nuevo, docsViejo, docsNuevo }) => {
  const marca = path.join(nuevo, '.migracion.json');
  fs.mkdirSync(nuevo, { recursive: true });
  const lineas = [];
  const log = (s) => lineas.push(`${new Date().toISOString()} ${s}`);
  const escribirLog = () => fs.appendFileSync(path.join(nuevo, 'migracion.log'), lineas.join('\n') + '\n');
  if (fs.existsSync(marca)) return { hecho: false, motivo: 'ya migrado', copiados: [] };
  const copiados = [];
  try {
    if (viejo && fs.existsSync(viejo)) {
      log(`Datos: ${viejo} → ${nuevo} (copia; el original se conserva)`);
      for (const n of ELEMENTOS) {
        const de = path.join(viejo, n);
        if (!fs.existsSync(de)) continue;
        copiar(de, path.join(nuevo, n), log);
        copiados.push(n);
        log(`  copiado ${n}`);
      }
      // diarios de sesión (recuperación tras cierre inesperado)
      const cache = path.join(viejo, '.cache');
      if (fs.existsSync(cache))
        for (const n of fs.readdirSync(cache).filter((x) => x.startsWith('diario-'))) {
          fs.mkdirSync(path.join(nuevo, '.cache'), { recursive: true });
          copiar(path.join(cache, n), path.join(nuevo, '.cache', n), log);
          copiados.push(`.cache/${n}`);
        }
    } else log('No hay datos de Montilla Studio que migrar');
    if (docsViejo && fs.existsSync(docsViejo)) {
      log(`Proyectos: ${docsViejo} → ${docsNuevo} (copia)`);
      copiar(docsViejo, docsNuevo, log);
      copiados.push('Documentos');
    }
    // los recientes que apuntaban a Documentos\Montilla Studio pasan a la carpeta nueva (si la copia existe)
    const rec = path.join(nuevo, 'recientes.json');
    if (fs.existsSync(rec) && docsViejo) {
      const l = JSON.parse(fs.readFileSync(rec, 'utf8'));
      const n = l.map((p) => {
        if (!p.startsWith(docsViejo)) return p;
        const q = docsNuevo + p.slice(docsViejo.length);
        return fs.existsSync(q) ? q : p;
      });
      fs.writeFileSync(rec, JSON.stringify(n, null, 1));
    }
    fs.writeFileSync(marca, JSON.stringify({ fecha: new Date().toISOString(), desde: viejo, copiados }, null, 1));
    log(`Listo (${copiados.length} elementos)`);
    escribirLog();
    return { hecho: true, copiados };
  } catch (e) {
    log(`ERROR: ${e.message}`);
    escribirLog();
    return { hecho: false, motivo: e.message, copiados };
  }
};

module.exports = { migrar, ELEMENTOS };
