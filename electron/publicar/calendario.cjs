/**
 * Del calendario de redes (calendario-data.json del centro de contenido sincronizado) a publicaciones de YouTube y
 * LinkedIn listas para enviar. Sin Electron: pruebas en pruebas/calendario.test.cjs.
 * Las rutas de los archivos del calendario son relativas a la carpeta del centro, y la carpeta se resuelve desde la
 * carpeta personal de cada equipo (como electron/rutas.cjs), así funciona igual en la laptop y en el PC.
 */
const fs = require('node:fs');
const path = require('node:path');
const { resolverRuta } = require('../rutas.cjs');
const { instanteEnZona, conUtm, tituloYouTube, descripcionYouTube, etiquetasYouTube } = require('./util.cjs');

const REDES = ['youtube', 'linkedin'];
/** Zona de las horas del calendario si el JSON no la dice (scripts/v4/calendario-data.mjs: «UTC−5 base»). */
const ZONA_CALENDARIO = 'America/Bogota';

/** Carpetas donde buscar calendario-data.json, en orden. */
const carpetasCentro = (home, elegida) =>
  [resolverRuta(elegida, home), path.join(home, 'dev', 'Metrica SEO', 'centro-contenido'), path.join(home, 'Videos', 'MetricaSEO', 'v4')].filter(Boolean);
const buscarCentro = (home, elegida) => carpetasCentro(home, elegida).find((d) => fs.existsSync(path.join(d, 'calendario-data.json'))) ?? null;

const leerCalendario = (carpeta) => JSON.parse(fs.readFileSync(path.join(carpeta, 'calendario-data.json'), 'utf8'));

const ext = (f) => path.extname(f).toLowerCase();
const esVideo = (f) => ['.mp4', '.mov', '.m4v', '.webm'].includes(ext(f));
const esImagen = (f) => ['.png', '.jpg', '.jpeg', '.gif'].includes(ext(f));

/** Archivos de una entrada: ruta absoluta, si existe y su tamaño. */
const archivosDe = (e, carpeta) =>
  (e.files ?? []).map((x) => {
    const rel = typeof x === 'string' ? x : x.f;
    const ruta = path.join(carpeta, ...rel.split('/'));
    let tam = 0;
    let existe = false;
    try {
      tam = fs.statSync(ruta).size;
      existe = true;
    } catch {}
    return { rel, etiqueta: typeof x === 'string' ? rel : x.label ?? rel, ruta, existe, tam };
  });

/** Qué es cada archivo: vídeo, subtítulos, miniatura e imágenes (en el orden del calendario). */
const papeles = (archivos) => {
  const video = archivos.find((a) => esVideo(a.rel)) ?? null;
  const subtitulos = archivos.find((a) => ext(a.rel) === '.srt') ?? null;
  const miniatura = archivos.find((a) => esImagen(a.rel) && (/miniatura|portada/i.test(a.etiqueta) || /miniaturas-youtube|portadas\//.test(a.rel))) ?? null;
  const imagenes = archivos.filter((a) => esImagen(a.rel) && a !== miniatura);
  return { video, subtitulos, miniatura, imagenes };
};

const conHashtags = (texto, tags) => {
  const t = String(texto ?? '').trim();
  const faltan = (tags ?? []).filter((x) => !t.includes(x));
  return faltan.length ? `${t}\n\n${faltan.join(' ')}` : t;
};

/** Descripción de YouTube: el texto con enlaces clicables y UTM, el enlace del artículo si lo hay y los hashtags. */
const descripcionPara = (e) => {
  let d = conUtm(e.caption ?? '', { red: 'youtube', campana: e.piece });
  if (e.link && !d.includes(e.link)) d += `\n\n${e.series === 'blog' ? 'Artículo completo: ' : ''}${e.link}`;
  return descripcionYouTube(conHashtags(d, e.tags));
};

/** Tipo de post de LinkedIn según el formato del calendario. */
const tipoLinkedIn = (formato, p) => (formato === 'documento' ? 'documento' : formato === 'video' || p.video ? 'video' : p.imagenes.length ? 'imagen' : 'texto');

/**
 * Entrada del calendario → publicación. `ajustes.zonaCalendario` (o el timeBase del JSON) dice en qué zona están
 * las horas; `ajustes.listas` da la lista de reproducción por defecto de cada formato de YouTube.
 */
const publicacionDe = (e, { carpeta, zona, listas = {} }) => {
  const archivos = archivosDe(e, carpeta);
  const p = papeles(archivos);
  const base = {
    id: e.id,
    red: e.net,
    formato: e.format,
    pieza: e.piece,
    fecha: e.date,
    hora: e.time,
    zona,
    instante: instanteEnZona(e.date, e.time, zona),
    tituloCalendario: e.title,
    archivos,
    faltan: archivos.filter((a) => !a.existe).map((a) => a.rel),
    vistaPrevia: { img: p.miniatura?.rel ?? p.imagenes[0]?.rel ?? e.preview?.img ?? null, video: p.video?.rel ?? null },
    sinTexto: !e.caption,
  };
  if (e.net === 'youtube')
    return {
      ...base,
      tipo: e.format === 'short' ? 'short' : 'video',
      titulo: tituloYouTube(e.yt || e.title),
      texto: descripcionPara(e),
      etiquetas: etiquetasYouTube(e.tags),
      // YouTube no deja comentar un vídeo privado o programado: se fija a mano al publicarse
      comentario: e.comment ?? '',
      lista: listas[e.format] ?? '',
      video: p.video?.rel ?? null,
      miniatura: p.miniatura?.rel ?? null,
      subtitulos: p.subtitulos?.rel ?? null,
    };
  const tipo = tipoLinkedIn(e.format, p);
  return {
    ...base,
    tipo,
    titulo: e.title,
    texto: conHashtags(e.caption ?? '', e.tags),
    comentario: e.comment ?? '',
    alt: e.alt ?? '',
    video: tipo === 'video' ? p.video?.rel ?? null : null,
    imagenes: tipo === 'imagen' ? p.imagenes.slice(0, 1).map((a) => a.rel) : tipo === 'documento' ? p.imagenes.map((a) => a.rel) : [],
  };
};

/**
 * Publicaciones de YouTube y LinkedIn: las atrasadas sin publicar y las de los próximos `dias` días (todas si
 * `dias` es 0). `hechas(id)` dice si una ya se publicó o programó (no cuenta como atrasada).
 */
const publicaciones = (datos, { carpeta, ajustes = {}, ahora = Date.now(), dias = 0, hechas = () => false }) => {
  const zona = ajustes.zonaCalendario || datos.timeBase || ZONA_CALENDARIO;
  const limite = dias > 0 ? ahora + dias * 864e5 : Infinity;
  return (datos.entries ?? [])
    .filter((e) => REDES.includes(e.net))
    .map((e) => publicacionDe(e, { carpeta, zona, listas: ajustes.listas }))
    .filter((p) => (p.instante < ahora ? !hechas(p.id) : p.instante <= limite))
    .sort((a, b) => a.instante - b.instante || a.red.localeCompare(b.red));
};

module.exports = { REDES, ZONA_CALENDARIO, carpetasCentro, buscarCentro, leerCalendario, archivosDe, papeles, descripcionPara, tipoLinkedIn, publicacionDe, publicaciones };
