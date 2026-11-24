// YouTube y LinkedIn con un fetch falso: construcción de peticiones, subida por partes, reintentos y errores.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yt = require('../youtube.cjs');
const li = require('../linkedin.cjs');

const archivo = (bytes) => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-red-')), 'x.bin');
  fs.writeFileSync(f, Buffer.alloc(bytes, 7));
  return f;
};
const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...headers } });
/** fetch falso: `respuestas` es una función (url, init, n) → Response; guarda las llamadas. */
const falso = (respuestas) => {
  const llamadas = [];
  const fn = async (url, init = {}) => {
    llamadas.push({ url, init });
    return respuestas(url, init, llamadas.length);
  };
  return { fn, llamadas };
};

test('YouTube: recurso programado = privado + publishAt; sin fecha = público', () => {
  const r = yt.recursoVideo({ titulo: 'T', descripcion: 'D', etiquetas: ['SEO'], publishAt: Date.parse('2026-11-30T21:00:00Z') });
  assert.equal(r.status.privacyStatus, 'private');
  assert.equal(r.status.publishAt, '2026-11-30T21:00:00.000Z');
  assert.equal(r.status.selfDeclaredMadeForKids, false);
  assert.equal(r.snippet.categoryId, '28');
  assert.equal(r.snippet.defaultLanguage, 'es');
  const ya = yt.recursoVideo({ titulo: 'T', descripcion: 'D' });
  assert.equal(ya.status.privacyStatus, 'public');
  assert.ok(!('publishAt' in ya.status));
});

test('YouTube: petición de subida reanudable', () => {
  const { url, init } = yt.peticionInicio({ a: 1 }, 12345, 'video/mp4');
  assert.match(url, /^https:\/\/www\.googleapis\.com\/upload\/youtube\/v3\/videos\?uploadType=resumable&part=snippet,status/);
  assert.equal(init.headers['X-Upload-Content-Length'], '12345');
  assert.equal(init.headers['X-Upload-Content-Type'], 'video/mp4');
  assert.equal(init.method, 'POST');
});

test('YouTube: multipart para subtítulos y Range', () => {
  const { tipo, cuerpo } = yt.cuerpoMultipart({ snippet: { videoId: 'v', language: 'es', name: 'Español' } }, Buffer.from('1\n00:00:00,000 --> 00:00:01,000\nHola\n'), 'application/octet-stream');
  const lim = /boundary=(.+)$/.exec(tipo)[1];
  const s = cuerpo.toString();
  assert.ok(s.startsWith(`--${lim}\r\nContent-Type: application/json`));
  assert.ok(s.includes('"language":"es"'));
  assert.ok(s.includes('Hola'));
  assert.ok(s.trimEnd().endsWith(`--${lim}--`));
  assert.equal(yt.siguienteByte('bytes=0-8388607'), 8388608);
  assert.equal(yt.siguienteByte(null), 0);
});

test('YouTube: errores con mensaje claro', () => {
  const cuota = yt.errorYouTube(403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'quota' } });
  assert.equal(cuota.codigo, 'cuota');
  assert.match(cuota.message, /medianoche hora del Pacífico/);
  assert.equal(yt.errorYouTube(400, { error: { errors: [{ reason: 'uploadLimitExceeded' }] } }).codigo, 'limite_canal');
  assert.equal(yt.errorYouTube(401, {}).codigo, 'reconectar');
  assert.equal(yt.errorYouTube(403, { error: { errors: [{ reason: 'forbidden' }] } }, 'miniatura').codigo, 'miniatura_no_permitida');
  assert.equal(yt.errorYouTube(503, {}).reintentar, true);
  assert.equal(yt.errorYouTube(409, { error: { errors: [{ reason: 'captionExists' }] } }, 'subtítulos').codigo, 'captionExists');
});

test('YouTube: sube por partes, sigue el Range del 308 y se recupera de un 503', async () => {
  const tam = yt.PARTE * 2 + 1000;
  const f = archivo(tam);
  let cortes = 0;
  const { fn, llamadas } = falso((url, init) => {
    if (url.includes('uploadType=resumable')) return new Response(null, { status: 200, headers: { Location: 'https://sesion/1' } });
    const cr = init.headers['Content-Range'];
    if (cr === `bytes */${tam}`) return new Response(null, { status: 308, headers: { Range: `bytes=0-${yt.PARTE - 1}` } });
    if (cr.startsWith(`bytes ${yt.PARTE}-`) && cortes++ === 0) return new Response('{}', { status: 503 });
    const fin = Number(/-(\d+)\//.exec(cr)[1]);
    if (fin + 1 < tam) return new Response(null, { status: 308, headers: { Range: `bytes=0-${fin}` } });
    return json({ id: 'VID123', status: { privacyStatus: 'private', publishAt: '2026-11-30T21:00:00Z' } }, 201);
  });
  const progreso = [];
  const c = yt.crearCliente({ fetch: fn, token: async () => 'tok', renovar: async () => {} });
  // el reintento tras el 503 espera 2 s (backoff exponencial)
  const t0 = Date.now();
  const r = await c.subirVideo({ ruta: f, recurso: { x: 1 }, alProgreso: (p) => progreso.push(p) });
  assert.equal(r.id, 'VID123');
  assert.equal(progreso.at(-1), 1);
  assert.ok(llamadas.every((l) => l.init.headers.Authorization === 'Bearer tok'));
  assert.ok(llamadas.some((l) => l.init.headers['Content-Range'] === `bytes */${tam}`), 'consulta el estado tras el fallo');
  assert.ok(Date.now() - t0 < 10000);
});

test('YouTube: un 401 renueva el token una vez y reintenta', async () => {
  let tok = 'viejo';
  const { fn, llamadas } = falso((url, init) => (init.headers.Authorization === 'Bearer viejo' ? json({ error: { errors: [{ reason: 'authError' }] } }, 401) : json({ items: [{ id: 'UC1', snippet: { title: 'MétricaSEO', customUrl: '@metricaseo_site' } }] })));
  const c = yt.crearCliente({ fetch: fn, token: async () => tok, renovar: async () => void (tok = 'nuevo') });
  assert.deepEqual(await c.canal(), { id: 'UC1', nombre: 'MétricaSEO', handle: '@metricaseo_site' });
  assert.equal(llamadas.length, 2);
});

test('YouTube: busca la lista por nombre recorriendo páginas', async () => {
  const { fn } = falso((url) =>
    url.includes('pageToken=p2') ? json({ items: [{ id: 'PL2', snippet: { title: 'Tutoriales del panel' } }] }) : json({ items: [{ id: 'PL1', snippet: { title: 'Promos' } }], nextPageToken: 'p2' }),
  );
  const c = yt.crearCliente({ fetch: fn, token: async () => 't', renovar: async () => {} });
  assert.deepEqual(await c.buscarLista('tutoriales DEL panel '), { id: 'PL2', nombre: 'Tutoriales del panel' });
  assert.equal(await c.buscarLista(''), null);
});

test('YouTube: cuota agotada al subir → error de cuota', async () => {
  const f = archivo(1000);
  const { fn } = falso(() => json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403));
  const c = yt.crearCliente({ fetch: fn, token: async () => 't', renovar: async () => {} });
  await assert.rejects(c.subirVideo({ ruta: f, recurso: {} }), (e) => e.codigo === 'cuota');
});

test('LinkedIn: cuerpo del post (texto escapado, PUBLIC, MAIN_FEED, PUBLISHED)', () => {
  const b = li.cuerpoPost({ autor: 'urn:li:person:abc', texto: 'Hola (mundo) #SEO', media: { id: 'urn:li:document:1', title: 'Doc' } });
  assert.equal(b.author, 'urn:li:person:abc');
  assert.equal(b.commentary, 'Hola \\(mundo\\) #SEO');
  assert.equal(b.visibility, 'PUBLIC');
  assert.equal(b.distribution.feedDistribution, 'MAIN_FEED');
  assert.equal(b.lifecycleState, 'PUBLISHED');
  assert.deepEqual(b.content, { media: { id: 'urn:li:document:1', title: 'Doc' } });
  assert.ok(!('content' in li.cuerpoPost({ autor: 'a', texto: 't' })));
  const h = li.cabeceras('tok', '202611');
  assert.equal(h['LinkedIn-Version'], '202611');
  assert.equal(h['X-Restli-Protocol-Version'], '2.0.0');
  assert.equal(li.urlPost('urn:li:share:7'), 'https://www.linkedin.com/feed/update/urn:li:share:7/');
});

test('LinkedIn: vídeo por partes (sin token en las partes) y finalize con los ETags en orden', async () => {
  const tam = 9 * 1024 * 1024;
  const f = archivo(tam);
  const P = 4194304;
  const partes = [0, 1, 2].map((i) => ({ uploadUrl: `https://subida/p${i}`, firstByte: i * P, lastByte: Math.min((i + 1) * P, tam) - 1 }));
  let finalize = null;
  const { fn, llamadas } = falso((url, init) => {
    if (url.endsWith('/videos?action=initializeUpload')) return json({ value: { video: 'urn:li:video:V', uploadToken: '', uploadInstructions: partes } });
    if (url.startsWith('https://subida/')) return new Response(null, { status: 200, headers: { etag: `etag-${url.slice(-1)}` } });
    if (url.endsWith('/videos?action=finalizeUpload')) {
      finalize = JSON.parse(init.body);
      return new Response(null, { status: 200 });
    }
    if (url.endsWith('/posts')) return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:99' } });
    return json({}, 404);
  });
  const c = li.crearCliente({ fetch: fn, token: async () => 'tok', autor: 'urn:li:person:me' });
  const urn = await c.subirVideo(f);
  assert.equal(urn, 'urn:li:video:V');
  assert.deepEqual(finalize.finalizeUploadRequest.uploadedPartIds, ['etag-0', 'etag-1', 'etag-2']);
  const puts = llamadas.filter((l) => l.url.startsWith('https://subida/'));
  assert.equal(puts.length, 3);
  assert.ok(puts.every((l) => !l.init.headers.Authorization));
  assert.equal(puts[2].init.body.length, tam - 2 * P);
  const init = JSON.parse(llamadas[0].init.body).initializeUploadRequest;
  assert.equal(init.fileSizeBytes, tam);
  assert.equal(init.owner, 'urn:li:person:me');
  assert.equal(await c.crearPost(li.cuerpoPost({ autor: 'urn:li:person:me', texto: 'x', media: { id: urn, title: 'v' } })), 'urn:li:share:99');
});

test('LinkedIn: imagen y documento suben con token; userinfo da el URN', async () => {
  const { fn, llamadas } = falso((url) => {
    if (url.endsWith('/images?action=initializeUpload')) return json({ value: { uploadUrl: 'https://subir/img', image: 'urn:li:image:I' } });
    if (url.endsWith('/documents?action=initializeUpload')) return json({ value: { uploadUrl: 'https://subir/doc', document: 'urn:li:document:D' } });
    if (url.startsWith('https://subir/')) return new Response(null, { status: 201 });
    if (url.endsWith('/v2/userinfo')) return json({ sub: 'xyz', name: 'José Montilla' });
    return json({}, 404);
  });
  const c = li.crearCliente({ fetch: fn, token: async () => 'tok', autor: 'urn:li:person:xyz' });
  assert.equal(await c.subirImagen(archivo(2000)), 'urn:li:image:I');
  assert.equal(await c.subirDocumento(archivo(2000)), 'urn:li:document:D');
  assert.ok(llamadas.filter((l) => l.url.startsWith('https://subir/')).every((l) => l.init.headers.Authorization === 'Bearer tok'));
  assert.equal(llamadas.find((l) => l.url.endsWith('/doc')).init.headers['Content-Type'], 'application/pdf');
  assert.deepEqual(await c.yo(), { urn: 'urn:li:person:xyz', nombre: 'José Montilla', foto: '' });
});

test('LinkedIn: errores (permiso caducado, versión, límite) y tamaños', async () => {
  assert.equal(li.errorLinkedIn(401, {}).codigo, 'reconectar');
  assert.equal(li.errorLinkedIn(426, { message: 'Requested version 202401 is not active' }).codigo, 'version');
  assert.equal(li.errorLinkedIn(429, {}).codigo, 'ritmo');
  const c = li.crearCliente({ fetch: async () => json({}), token: async () => 't', autor: 'a' });
  await assert.rejects(c.subirVideo(archivo(1000)), (e) => e.codigo === 'tam');
});
