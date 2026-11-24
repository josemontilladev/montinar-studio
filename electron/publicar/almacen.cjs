/**
 * Datos de «Publicar» en la carpeta de datos de la app de ESTE equipo (%APPDATA%\MetricaSEO Studio\publicar),
 * nunca en la carpeta sincronizada ni en el repositorio:
 *   secretos.bin  credenciales de las apps (client_id/secret) y tokens, cifrados con safeStorage (DPAPI en Windows)
 *   estado.json   estado de cada publicación, textos editados, cola de LinkedIn y ajustes (sin secretos)
 * `cifrado` se inyecta: { disponible(), cifrar(texto) → Buffer, descifrar(Buffer) → texto } (safeStorage en la app).
 */
const fs = require('node:fs');
const path = require('node:path');

const escribirAtomico = (f, datos) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, datos);
  fs.renameSync(tmp, f);
};

const AJUSTES_POR_DEFECTO = {
  zonaCalendario: '', // vacío = la del calendario (timeBase) o America/Bogota
  zonaVista: 'America/Caracas',
  carpetaCentro: '', // vacío = ~/dev/Metrica SEO/centro-contenido
  youtube: { categoria: '28', sintetico: false, listas: { largo: '', short: '' }, subtitulosIdioma: 'es' },
  linkedin: { puerto: 53682, version: '202611', primerComentario: true },
};

const crearAlmacen = ({ carpeta, cifrado }) => {
  const fSecretos = path.join(carpeta, 'secretos.bin');
  const fEstado = path.join(carpeta, 'estado.json');

  const leerSecretos = () => {
    try {
      if (!fs.existsSync(fSecretos)) return {};
      return JSON.parse(cifrado.descifrar(fs.readFileSync(fSecretos)));
    } catch {
      // no se puede descifrar (otro usuario de Windows, archivo copiado de otro equipo): se empieza de cero
      return {};
    }
  };
  const guardarSecretos = (s) => {
    if (!cifrado.disponible()) throw new Error('El cifrado del sistema no está disponible en este equipo: no se guardan credenciales sin cifrar.');
    escribirAtomico(fSecretos, cifrado.cifrar(JSON.stringify(s)));
  };
  const cambiarSecretos = (fn) => {
    const s = leerSecretos();
    fn(s);
    guardarSecretos(s);
    return s;
  };

  const leerEstado = () => {
    let e = {};
    try {
      e = JSON.parse(fs.readFileSync(fEstado, 'utf8'));
    } catch {}
    const aj = e.ajustes ?? {};
    return {
      publicaciones: e.publicaciones ?? {},
      ajustes: {
        ...AJUSTES_POR_DEFECTO,
        ...aj,
        youtube: { ...AJUSTES_POR_DEFECTO.youtube, ...(aj.youtube ?? {}), listas: { ...AJUSTES_POR_DEFECTO.youtube.listas, ...(aj.youtube?.listas ?? {}) } },
        linkedin: { ...AJUSTES_POR_DEFECTO.linkedin, ...(aj.linkedin ?? {}) },
      },
    };
  };
  const guardarEstado = (e) => escribirAtomico(fEstado, JSON.stringify(e, null, 1));
  const cambiarEstado = (fn) => {
    const e = leerEstado();
    const r = fn(e);
    guardarEstado(e);
    return r ?? e;
  };
  /** Estado de una publicación (se crea vacío). */
  const pub = (e, id) => (e.publicaciones[id] ??= { estado: 'pendiente' });

  return { carpeta, leerSecretos, cambiarSecretos, leerEstado, cambiarEstado, pub };
};

/** Vista sin secretos para la interfaz: si hay credenciales y token, y el final del client_id. */
const resumenSecretos = (s, ahora = Date.now()) => {
  const red = (k, t) => {
    const c = s[k] ?? {};
    const tok = s.tokens?.[t];
    return {
      credenciales: !!(c.clientId && c.clientSecret),
      clientIdFinal: c.clientId ? `…${String(c.clientId).slice(-12)}` : '',
      conectada: !!tok?.access_token && (!!tok.refresh_token || !tok.expira || tok.expira > ahora),
      expira: tok?.expira ?? null,
      cuenta: tok?.cuenta ?? null,
    };
  };
  return { youtube: red('google', 'google'), linkedin: red('linkedin', 'linkedin') };
};

module.exports = { AJUSTES_POR_DEFECTO, crearAlmacen, resumenSecretos };
