/**
 * Publicar en redes: utilidades puras (sin Electron), probadas en pruebas/util.test.cjs.
 * PKCE y state de OAuth, horas del calendario en una zona IANA, enlaces con UTM y el escapado del texto de LinkedIn.
 */
const crypto = require('node:crypto');

// ——— OAuth ———
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** PKCE (RFC 7636): verifier de 64 caracteres [A-Za-z0-9-._~] y challenge S256. */
const crearPkce = () => {
  const verifier = b64url(crypto.randomBytes(48));
  return { verifier, challenge: retoS256(verifier), metodo: 'S256' };
};
const retoS256 = (verifier) => b64url(crypto.createHash('sha256').update(verifier, 'ascii').digest());
const crearState = () => b64url(crypto.randomBytes(24));
/** Comparación en tiempo constante (el state que vuelve del navegador). */
const mismoState = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// ——— zonas horarias ———
/** Desfase (minutos) de una zona IANA en un instante: hora local de la zona − UTC. */
const desfaseZona = (ms, zona) => {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((local - Math.floor(ms / 1000) * 1000) / 60000);
};
/** «2026-11-30» + «08:30» en la zona dada → instante (ms desde 1970). */
const instanteEnZona = (fecha, hora, zona) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha ?? ''));
  const h = /^(\d{1,2}):(\d{2})$/.exec(String(hora ?? ''));
  if (!m || !h) throw new Error(`Fecha u hora no válidas: ${fecha} ${hora}`);
  const ingenuo = Date.UTC(+m[1], +m[2] - 1, +m[3], +h[1], +h[2]);
  // dos pasadas: el desfase puede cambiar justo en el cambio de horario
  let t = ingenuo - desfaseZona(ingenuo, zona) * 60000;
  t = ingenuo - desfaseZona(t, zona) * 60000;
  return t;
};
/** ¿La zona existe para Intl? */
const zonaValida = (zona) => {
  try {
    new Intl.DateTimeFormat('es', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
};
/** Medianoche del Pacífico siguiente (cuando se reinicia la cuota de YouTube). */
const siguienteMedianochePacifico = (ahora = Date.now()) => {
  const z = 'America/Los_Angeles';
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ahora));
  const [y, mo, d] = f.split('-').map(Number);
  const manana = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
  return instanteEnZona(manana, '00:00', z);
};

// ——— textos ———
/**
 * «metricaseo.site» o «metricaseo.site/precios» sueltos → enlace https con UTM (en YouTube solo son clicables los
 * enlaces con esquema). Los enlaces que ya llevan utm_ no se tocan.
 */
const conUtm = (texto, { red, campana, dominio = 'metricaseo.site' }) => {
  const d = dominio.replace(/\./g, '\\.');
  const re = new RegExp(`(https?:\\/\\/)?(?:www\\.)?${d}(\\/[^\\s)\\]»"'<>]*)?`, 'g');
  return String(texto ?? '').replace(re, (todo, _esquema, ruta = '') => {
    if (/[?&]utm_/.test(ruta)) return todo.startsWith('http') ? todo : `https://${todo}`;
    // signos de puntuación al final de la frase no son parte del enlace
    const fin = /[.,;:!?]+$/.exec(ruta)?.[0] ?? '';
    const r = fin ? ruta.slice(0, -fin.length) : ruta;
    const sep = r.includes('?') ? '&' : '?';
    return `https://${dominio}${r || '/'}${sep}utm_source=${encodeURIComponent(red)}&utm_medium=social&utm_campaign=${encodeURIComponent(campana)}${fin}`;
  });
};

/**
 * Texto de un post para la Posts API de LinkedIn («little text format»): todos los caracteres reservados
 * | { } @ [ ] ( ) < > # \ * _ ~ van escapados con «\», salvo «#» al empezar un hashtag (#palabra), que LinkedIn
 * convierte en hashtag. https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format
 */
const escaparLinkedIn = (texto) =>
  String(texto ?? '').replace(/[|{}@[\]()<>#\\*_~]/g, (c, i, s) => (c === '#' && /[\p{L}\p{N}]/u.test(s[i + 1] ?? '') && (i === 0 || /[\s(]/.test(s[i - 1])) ? c : `\\${c}`));

/** Título de YouTube: máx. 100 caracteres y sin «<» ni «>». */
const tituloYouTube = (t) => {
  const s = String(t ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  return [...s].length > 100 ? [...s].slice(0, 99).join('').trimEnd() + '…' : s;
};
/** Descripción de YouTube: máx. 5000 bytes y sin «<» ni «>». */
const descripcionYouTube = (t) => {
  let s = String(t ?? '').replace(/</g, '‹').replace(/>/g, '›');
  while (Buffer.byteLength(s, 'utf8') > 5000) s = [...s].slice(0, -1).join('');
  return s;
};
/** Etiquetas de YouTube a partir de hashtags (sin «#»), 500 caracteres en total como mucho. */
const etiquetasYouTube = (tags) => {
  const out = [];
  let total = 0;
  for (const t of tags ?? []) {
    const e = String(t).replace(/^#/, '').trim();
    if (!e || out.includes(e)) continue;
    const coste = e.length + (/\s/.test(e) ? 2 : 0) + (out.length ? 1 : 0);
    if (total + coste > 500) break;
    out.push(e);
    total += coste;
  }
  return out;
};

const tamLegible = (b) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

module.exports = { b64url, crearPkce, retoS256, crearState, mismoState, desfaseZona, instanteEnZona, zonaValida, siguienteMedianochePacifico, conUtm, escaparLinkedIn, tituloYouTube, descripcionYouTube, etiquetasYouTube, tamLegible };
