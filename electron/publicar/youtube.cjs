/**
 * YouTube Data API v3: subir y programar un vídeo (subida reanudable por partes), miniatura, subtítulos .srt y lista
 * de reproducción. `fetch` se inyecta (pruebas con un falso). Documentación consultada: docs/publicar-redes.md.
 * Cuota por defecto: 100 subidas/día (bucket propio de videos.insert, 1 unidad) y 10.000 unidades/día para lo demás
 * (thumbnails.set ≈ 50, captions.insert 400, playlistItems.insert 50, playlists.list 1, channels.list 1).
 */
const fs = require('node:fs');
const { ErrorPublicar } = require('./oauth.cjs');
const { siguienteMedianochePacifico, tamLegible } = require('./util.cjs');

const API = 'https://www.googleapis.com/youtube/v3';
const SUBIDA = 'https://www.googleapis.com/upload/youtube/v3';
/** Tamaño de cada parte de la subida reanudable: múltiplo de 256 KiB. */
const PARTE = 8 * 1024 * 1024;
const MAX_MINIATURA = 50 * 1024 * 1024;
const MAX_SUBTITULOS = 100 * 1024 * 1024;
/** Categorías habituales (videoCategories.list, región ES/LatAm). */
const CATEGORIAS = { 27: 'Educación', 28: 'Ciencia y tecnología', 22: 'Personas y blogs', 26: 'Consejos y estilo' };

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Recurso `video` para videos.insert. Con `publishAt` el vídeo va privado hasta esa hora (obligatorio para programar). */
const recursoVideo = ({ titulo, descripcion, etiquetas = [], categoria = '28', publishAt = null, privacidad = 'public', ninos = false, sintetico = false, idioma = 'es' }) => ({
  snippet: { title: titulo, description: descripcion, tags: etiquetas, categoryId: String(categoria), defaultLanguage: idioma, defaultAudioLanguage: idioma },
  status: {
    privacyStatus: publishAt ? 'private' : privacidad,
    ...(publishAt ? { publishAt: new Date(publishAt).toISOString() } : {}),
    selfDeclaredMadeForKids: !!ninos,
    containsSyntheticMedia: !!sintetico,
    embeddable: true,
  },
});

/** Petición que abre la sesión de subida reanudable. */
const peticionInicio = (recurso, tam, mime = 'video/*') => ({
  url: `${SUBIDA}/videos?uploadType=resumable&part=snippet,status&notifySubscribers=true`,
  init: {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(tam), 'X-Upload-Content-Type': mime },
    body: JSON.stringify(recurso),
  },
});

/** Cuerpo multipart/related (metadatos JSON + archivo) para captions.insert. */
const cuerpoMultipart = (meta, datos, mime) => {
  const limite = `studio${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const cuerpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${limite}\r\nContent-Type: ${mime}\r\n\r\n`),
    Buffer.from(datos),
    Buffer.from(`\r\n--${limite}--\r\n`),
  ]);
  return { tipo: `multipart/related; boundary=${limite}`, cuerpo };
};

/** «bytes=0-1234» → siguiente byte por subir (1235). Sin cabecera: 0. */
const siguienteByte = (range) => {
  const m = /bytes=0-(\d+)/.exec(range ?? '');
  return m ? Number(m[1]) + 1 : 0;
};

/** Error de la API → mensaje claro (cuota, límite del canal, permiso, miniaturas, fecha…). */
const errorYouTube = (estado, j, que = 'YouTube') => {
  const e = j?.error ?? {};
  const razon = e.errors?.[0]?.reason ?? e.status ?? '';
  const msg = e.message ?? '';
  if (razon === 'quotaExceeded' || razon === 'dailyLimitExceeded' || (razon === 'rateLimitExceeded' && /quota/i.test(msg))) {
    const reinicio = new Date(siguienteMedianochePacifico()).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
    return new ErrorPublicar(`Cuota diaria de la API de YouTube agotada (${que}). Se reinicia a medianoche hora del Pacífico (${reinicio} en este equipo). Para más cuota: formulario de auditoría y ampliación de cuota de YouTube (ver Ajustes › Redes).`, { codigo: 'cuota', estado });
  }
  if (razon === 'uploadLimitExceeded') return new ErrorPublicar('El canal llegó a su límite diario de subidas de YouTube (límite de la plataforma, no de la API). Prueba mañana.', { codigo: 'limite_canal', estado });
  if (estado === 401 || razon === 'authError' || razon === 'authorizationRequired' || razon === 'UNAUTHENTICATED') return new ErrorPublicar('YouTube no acepta el permiso guardado: vuelve a conectar la cuenta en Ajustes › Redes.', { codigo: 'reconectar', estado });
  if (razon === 'insufficientPermissions' || razon === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT') return new ErrorPublicar('Al permiso de YouTube le falta un alcance: desconecta y vuelve a conectar la cuenta en Ajustes › Redes.', { codigo: 'reconectar', estado });
  if (razon === 'youtubeSignupRequired') return new ErrorPublicar('Esa cuenta de Google no tiene canal de YouTube. Conecta la cuenta del canal @metricaseo_site.', { codigo: 'sin_canal', estado });
  if (razon === 'invalidPublishAt') return new ErrorPublicar('YouTube no acepta la fecha de publicación programada (debe ser futura).', { codigo: 'fecha', estado });
  if (razon === 'invalidTitle') return new ErrorPublicar('YouTube no acepta el título (máx. 100 caracteres, sin < ni >).', { codigo: 'titulo', estado });
  if (razon === 'invalidDescription') return new ErrorPublicar('YouTube no acepta la descripción (máx. 5000 bytes, sin < ni >).', { codigo: 'descripcion', estado });
  if (razon === 'invalidTags') return new ErrorPublicar('YouTube no acepta las etiquetas (máx. 500 caracteres en total).', { codigo: 'etiquetas', estado });
  if (que === 'miniatura' && (razon === 'forbidden' || estado === 403))
    return new ErrorPublicar('YouTube no deja poner miniaturas personalizadas en este canal: verifica el canal por teléfono en youtube.com/verify y vuelve a intentarlo.', { codigo: 'miniatura_no_permitida', estado });
  if (razon === 'uploadRateLimitExceeded' || estado === 429) return new ErrorPublicar(`Demasiadas peticiones seguidas a YouTube (${que}). Espera unos minutos y reintenta.`, { codigo: 'ritmo', estado, reintentar: true });
  if (estado >= 500) return new ErrorPublicar(`YouTube falló temporalmente (${estado}) en ${que}. Reintenta en un rato.`, { codigo: 'servidor', estado, reintentar: true });
  return new ErrorPublicar(`YouTube rechazó ${que}: ${razon || estado}${msg ? ` — ${msg}` : ''}`, { codigo: razon || `http_${estado}`, estado });
};

/**
 * Cliente con el token: `token()` da un access token válido; `renovar()` fuerza el refresh (tras un 401).
 */
const crearCliente = ({ fetch: fetchFn, token, renovar }) => {
  const llamar = async (url, init = {}, que = 'YouTube', reintento = true) => {
    const t = await token();
    let r;
    try {
      r = await fetchFn(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}` } });
    } catch (e) {
      throw new ErrorPublicar(`Sin conexión con YouTube (${que}): ${e.message}`, { codigo: 'red', reintentar: true });
    }
    if (r.status === 401 && reintento) {
      await renovar();
      return llamar(url, init, que, false);
    }
    return r;
  };
  const json = async (url, init, que) => {
    const r = await llamar(url, init, que);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw errorYouTube(r.status, j, que);
    return j;
  };

  /** Canal conectado (para enseñarlo en Ajustes). */
  const canal = async () => {
    const j = await json(`${API}/channels?part=snippet&mine=true`, {}, 'datos del canal');
    const c = j.items?.[0];
    if (!c) throw new ErrorPublicar('Esa cuenta de Google no tiene canal de YouTube. Conecta la cuenta del canal @metricaseo_site.', { codigo: 'sin_canal' });
    return { id: c.id, nombre: c.snippet?.title ?? '', handle: c.snippet?.customUrl ?? '' };
  };

  /**
   * Sube el vídeo por partes (reanudable). `alProgreso(0..1)`. Si se corta, consulta cuánto llegó y sigue.
   * @returns {Promise<{id: string, estado: object}>}
   */
  const subirVideo = async ({ ruta, recurso, mime = 'video/*', alProgreso = () => {}, cancelado = () => false }) => {
    const tam = fs.statSync(ruta).size;
    const { url, init } = peticionInicio(recurso, tam, mime);
    const r0 = await llamar(url, init, 'la subida del vídeo');
    if (!r0.ok) throw errorYouTube(r0.status, await r0.json().catch(() => ({})), 'la subida del vídeo');
    const sesion = r0.headers.get('location');
    if (!sesion) throw new ErrorPublicar('YouTube no devolvió la dirección de subida.', { codigo: 'sin_sesion' });
    const fd = await fs.promises.open(ruta, 'r');
    let desde = 0;
    let fallos = 0;
    try {
      while (true) {
        if (cancelado()) throw new ErrorPublicar('Subida cancelada.', { codigo: 'cancelado' });
        const hasta = Math.min(desde + PARTE, tam);
        const buf = Buffer.alloc(hasta - desde);
        await fd.read(buf, 0, buf.length, desde);
        let r;
        try {
          r = await llamar(sesion, { method: 'PUT', headers: { 'Content-Length': String(buf.length), 'Content-Range': `bytes ${desde}-${hasta - 1}/${tam}` }, body: buf }, 'la subida del vídeo');
        } catch (e) {
          if (!e.reintentar || ++fallos > 6) throw e;
          await espera(Math.min(60000, 1000 * 2 ** fallos));
          desde = await consultar(sesion, tam);
          continue;
        }
        if (r.status === 308) {
          desde = siguienteByte(r.headers.get('range'));
          fallos = 0;
          alProgreso(desde / tam);
          continue;
        }
        if (r.status === 200 || r.status === 201) {
          alProgreso(1);
          const v = await r.json();
          return { id: v.id, estado: v.status ?? {} };
        }
        if (r.status === 404) throw new ErrorPublicar('La sesión de subida de YouTube caducó. Vuelve a subir el vídeo.', { codigo: 'sesion_caducada' });
        if (r.status >= 500 && ++fallos <= 6) {
          await espera(Math.min(60000, 1000 * 2 ** fallos));
          desde = await consultar(sesion, tam);
          continue;
        }
        throw errorYouTube(r.status, await r.json().catch(() => ({})), 'la subida del vídeo');
      }
    } finally {
      await fd.close();
    }
  };
  const consultar = async (sesion, tam) => {
    const r = await llamar(sesion, { method: 'PUT', headers: { 'Content-Length': '0', 'Content-Range': `bytes */${tam}` } }, 'la subida del vídeo');
    if (r.status === 308) return siguienteByte(r.headers.get('range'));
    if (r.status === 404) throw new ErrorPublicar('La sesión de subida de YouTube caducó. Vuelve a subir el vídeo.', { codigo: 'sesion_caducada' });
    throw errorYouTube(r.status, await r.json().catch(() => ({})), 'la subida del vídeo');
  };

  const ponerMiniatura = async (videoId, ruta) => {
    const datos = fs.readFileSync(ruta);
    if (datos.length > MAX_MINIATURA) throw new ErrorPublicar(`La miniatura pesa ${tamLegible(datos.length)}; YouTube admite hasta 50 MB.`, { codigo: 'tam' });
    const mime = /\.png$/i.test(ruta) ? 'image/png' : 'image/jpeg';
    return json(`${SUBIDA}/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, { method: 'POST', headers: { 'Content-Type': mime }, body: datos }, 'miniatura');
  };

  const ponerSubtitulos = async (videoId, ruta, { idioma = 'es', nombre = 'Español' } = {}) => {
    const datos = fs.readFileSync(ruta);
    if (datos.length > MAX_SUBTITULOS) throw new ErrorPublicar('El archivo de subtítulos supera 100 MB.', { codigo: 'tam' });
    const { tipo, cuerpo } = cuerpoMultipart({ snippet: { videoId, language: idioma, name: nombre, isDraft: false } }, datos, 'application/octet-stream');
    return json(`${SUBIDA}/captions?uploadType=multipart&part=snippet`, { method: 'POST', headers: { 'Content-Type': tipo }, body: cuerpo }, 'subtítulos');
  };

  /** Lista de reproducción del canal por nombre (sin distinguir mayúsculas). null si no existe. */
  const buscarLista = async (nombre) => {
    const objetivo = String(nombre ?? '').trim().toLocaleLowerCase('es');
    if (!objetivo) return null;
    let pagina = '';
    for (let i = 0; i < 20; i++) {
      const j = await json(`${API}/playlists?part=snippet&mine=true&maxResults=50${pagina ? `&pageToken=${pagina}` : ''}`, {}, 'listas de reproducción');
      const x = (j.items ?? []).find((p) => (p.snippet?.title ?? '').trim().toLocaleLowerCase('es') === objetivo);
      if (x) return { id: x.id, nombre: x.snippet.title };
      if (!j.nextPageToken) return null;
      pagina = j.nextPageToken;
    }
    return null;
  };
  const listas = async () => {
    const j = await json(`${API}/playlists?part=snippet&mine=true&maxResults=50`, {}, 'listas de reproducción');
    return (j.items ?? []).map((p) => p.snippet?.title ?? '').filter(Boolean);
  };
  const anadirALista = (listaId, videoId) =>
    json(`${API}/playlistItems?part=snippet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snippet: { playlistId: listaId, resourceId: { kind: 'youtube#video', videoId } } }) }, 'la lista de reproducción');

  const estadoVideo = async (videoId) => {
    const j = await json(`${API}/videos?part=status,processingDetails&id=${encodeURIComponent(videoId)}`, {}, 'estado del vídeo');
    return j.items?.[0] ?? null;
  };

  return { llamar, canal, subirVideo, ponerMiniatura, ponerSubtitulos, buscarLista, listas, anadirALista, estadoVideo };
};

module.exports = { API, SUBIDA, PARTE, CATEGORIAS, recursoVideo, peticionInicio, cuerpoMultipart, siguienteByte, errorYouTube, crearCliente };
