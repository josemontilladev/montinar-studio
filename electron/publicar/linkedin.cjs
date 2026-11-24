/**
 * LinkedIn (perfil personal, producto «Share on LinkedIn», scope w_member_social): Posts API con texto, imagen
 * (Images API), vídeo (Videos API, subida por partes) o documento PDF (Documents API) y primer comentario
 * (Comments API). La API no programa: la app publica a su hora (cola en index.cjs). Ver docs/publicar-redes.md.
 */
const fs = require('node:fs');
const { ErrorPublicar } = require('./oauth.cjs');
const { escaparLinkedIn, tamLegible } = require('./util.cjs');

const REST = 'https://api.linkedin.com/rest';
/** Versión de la API (YYYYMM). Cada versión se mantiene al menos un año; se puede cambiar en Ajustes › Redes. */
const VERSION = '202611';
const LIMITES = {
  video: { min: 75 * 1024, max: 500 * 1024 * 1024 },
  documento: { max: 100 * 1024 * 1024, paginas: 300 },
  imagenPixeles: 36152320,
  alt: 4086,
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const cabeceras = (token, version = VERSION, extra = {}) => ({
  Authorization: `Bearer ${token}`,
  'LinkedIn-Version': version,
  'X-Restli-Protocol-Version': '2.0.0',
  'Content-Type': 'application/json',
  ...extra,
});

/** Cuerpo de la Posts API para un miembro. `media`: { id: urn de imagen/vídeo/documento, title?, altText? }. */
const cuerpoPost = ({ autor, texto, media = null }) => ({
  author: autor,
  commentary: escaparLinkedIn(texto),
  visibility: 'PUBLIC',
  distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
  ...(media ? { content: { media } } : {}),
  lifecycleState: 'PUBLISHED',
  isReshareDisabledByAuthor: false,
});

/** URL pública de un post a partir de su URN (urn:li:share:… o urn:li:ugcPost:…). */
const urlPost = (urn) => `https://www.linkedin.com/feed/update/${urn}/`;

const errorLinkedIn = (estado, j, que = 'LinkedIn') => {
  const msg = j?.message ?? j?.error_description ?? '';
  const codigo = j?.code ?? j?.serviceErrorCode ?? '';
  if (estado === 401) return new ErrorPublicar('LinkedIn no acepta el permiso guardado (los permisos de LinkedIn duran 60 días): vuelve a conectar la cuenta en Ajustes › Redes.', { codigo: 'reconectar', estado });
  if (estado === 426 || /version/i.test(String(codigo)) || /version/i.test(msg))
    return new ErrorPublicar(`LinkedIn no acepta la versión de la API (${msg || estado}). Pon la más reciente (formato AAAAMM) en Ajustes › Redes.`, { codigo: 'version', estado });
  if (estado === 429) return new ErrorPublicar(`LinkedIn limita el número de publicaciones/llamadas por día (${que}). Se reinicia a medianoche UTC; reintenta más tarde.`, { codigo: 'ritmo', estado, reintentar: true });
  if (estado === 403) return new ErrorPublicar(`LinkedIn no permite ${que} con este permiso${msg ? ` (${msg})` : ''}. Comprueba que la app tiene «Share on LinkedIn» y vuelve a conectar.`, { codigo: 'permiso', estado });
  if (estado >= 500) return new ErrorPublicar(`LinkedIn falló temporalmente (${estado}) en ${que}. Reintenta en un rato.`, { codigo: 'servidor', estado, reintentar: true });
  if (/DUPLICATE/i.test(msg)) return new ErrorPublicar('LinkedIn dice que ese post ya existe (contenido duplicado).', { codigo: 'duplicado', estado });
  return new ErrorPublicar(`LinkedIn rechazó ${que}: ${msg || codigo || estado}`, { codigo: String(codigo || `http_${estado}`), estado });
};

/** Cliente con el token del miembro (LinkedIn no da refresh token a las apps de autoservicio). */
const crearCliente = ({ fetch: fetchFn, token, version = VERSION, autor }) => {
  const llamar = async (url, init, que) => {
    try {
      return await fetchFn(url, init);
    } catch (e) {
      throw new ErrorPublicar(`Sin conexión con LinkedIn (${que}): ${e.message}`, { codigo: 'red', reintentar: true });
    }
  };
  const rest = async (ruta, { metodo = 'POST', cuerpo, que }) => {
    const r = await llamar(`${REST}${ruta}`, { method: metodo, headers: cabeceras(await token(), version), ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}) }, que);
    const texto = await r.text();
    let j = {};
    try {
      j = texto ? JSON.parse(texto) : {};
    } catch {}
    if (!r.ok) throw errorLinkedIn(r.status, j, que);
    return { j, cab: r.headers };
  };

  /** Quién es el miembro: /v2/userinfo (OpenID Connect) → sub → urn:li:person:{sub}. */
  const yo = async () => {
    const r = await llamar('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${await token()}` } }, 'tus datos');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw errorLinkedIn(r.status, j, 'leer tus datos');
    return { urn: `urn:li:person:${j.sub}`, nombre: j.name ?? '', foto: j.picture ?? '' };
  };

  /** Sube un archivo a una URL de subida con PUT (imagen y documento llevan el token; las partes de vídeo, no). */
  const put = async (url, datos, { conToken = true, tipo = 'application/octet-stream', que }) => {
    const r = await llamar(url, { method: 'PUT', headers: { 'Content-Type': tipo, ...(conToken ? { Authorization: `Bearer ${await token()}` } : {}) }, body: datos }, que);
    if (!r.ok) throw errorLinkedIn(r.status, await r.json().catch(() => ({})), que);
    return r;
  };

  const subirImagen = async (ruta) => {
    const { j } = await rest('/images?action=initializeUpload', { cuerpo: { initializeUploadRequest: { owner: autor } }, que: 'preparar la imagen' });
    const v = j.value ?? {};
    await put(v.uploadUrl, fs.readFileSync(ruta), { que: 'subir la imagen' });
    return v.image;
  };

  const subirDocumento = async (ruta) => {
    const tam = fs.statSync(ruta).size;
    if (tam > LIMITES.documento.max) throw new ErrorPublicar(`El PDF pesa ${tamLegible(tam)}; LinkedIn admite hasta 100 MB.`, { codigo: 'tam' });
    const { j } = await rest('/documents?action=initializeUpload', { cuerpo: { initializeUploadRequest: { owner: autor } }, que: 'preparar el documento' });
    const v = j.value ?? {};
    await put(v.uploadUrl, fs.readFileSync(ruta), { tipo: 'application/pdf', que: 'subir el documento' });
    return v.document;
  };

  /** Vídeo por partes: initializeUpload → PUT de cada parte (guardando su ETag) → finalizeUpload. */
  const subirVideo = async (ruta, { alProgreso = () => {}, cancelado = () => false } = {}) => {
    const tam = fs.statSync(ruta).size;
    if (tam < LIMITES.video.min || tam > LIMITES.video.max) throw new ErrorPublicar(`El vídeo pesa ${tamLegible(tam)}; LinkedIn admite de 75 KB a 500 MB (y de 3 s a 30 min).`, { codigo: 'tam' });
    const { j } = await rest('/videos?action=initializeUpload', { cuerpo: { initializeUploadRequest: { owner: autor, fileSizeBytes: tam, uploadCaptions: false, uploadThumbnail: false } }, que: 'preparar el vídeo' });
    const v = j.value ?? {};
    const partes = v.uploadInstructions ?? [];
    const etags = [];
    const fd = await fs.promises.open(ruta, 'r');
    try {
      for (const p of partes) {
        if (cancelado()) throw new ErrorPublicar('Subida cancelada.', { codigo: 'cancelado' });
        const buf = Buffer.alloc(p.lastByte - p.firstByte + 1);
        await fd.read(buf, 0, buf.length, p.firstByte);
        let r;
        for (let intento = 1; ; intento++) {
          try {
            r = await put(p.uploadUrl, buf, { conToken: false, que: 'subir el vídeo' });
            break;
          } catch (e) {
            if (!e.reintentar || intento >= 5) throw e;
            await espera(1000 * 2 ** intento);
          }
        }
        etags.push(r.headers.get('etag'));
        alProgreso((p.lastByte + 1) / tam);
      }
    } finally {
      await fd.close();
    }
    await rest('/videos?action=finalizeUpload', { cuerpo: { finalizeUploadRequest: { video: v.video, uploadToken: v.uploadToken ?? '', uploadedPartIds: etags } }, que: 'terminar la subida del vídeo' });
    return v.video;
  };

  /** Espera a que LinkedIn procese el vídeo. Sin permiso de lectura (403) devuelve null y se reintenta el post. */
  const esperarVideo = async (urn, { msMax = 15 * 60 * 1000, cada = 10000 } = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < msMax) {
      const r = await llamar(`${REST}/videos/${encodeURIComponent(urn)}`, { headers: cabeceras(await token(), version) }, 'estado del vídeo');
      if (r.status === 403 || r.status === 404) return null;
      const j = await r.json().catch(() => ({}));
      if (j.status === 'AVAILABLE') return 'AVAILABLE';
      if (j.status === 'PROCESSING_FAILED') throw new ErrorPublicar(`LinkedIn no pudo procesar el vídeo${j.processingFailureReason ? `: ${j.processingFailureReason}` : ''}.`, { codigo: 'video_fallido' });
      await espera(cada);
    }
    throw new ErrorPublicar('LinkedIn tarda demasiado en procesar el vídeo. Reintenta la publicación en unos minutos (el vídeo se vuelve a subir).', { codigo: 'video_lento', reintentar: true });
  };

  const crearPost = async (cuerpo) => {
    const { cab } = await rest('/posts', { cuerpo, que: 'publicar el post' });
    const urn = cab.get('x-restli-id') ?? cab.get('x-linkedin-id');
    if (!urn) throw new ErrorPublicar('LinkedIn aceptó el post pero no devolvió su identificador.', { codigo: 'sin_id' });
    return urn;
  };

  const comentar = async (postUrn, texto) => {
    const { cab } = await rest(`/socialActions/${encodeURIComponent(postUrn)}/comments`, { cuerpo: { actor: autor, object: postUrn, message: { text: texto } }, que: 'poner el primer comentario' });
    return cab.get('x-restli-id');
  };

  return { yo, subirImagen, subirDocumento, subirVideo, esperarVideo, crearPost, comentar };
};

module.exports = { REST, VERSION, LIMITES, cabeceras, cuerpoPost, urlPost, errorLinkedIn, crearCliente };
