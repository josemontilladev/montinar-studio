const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cal = require('../calendario.cjs');

/** Centro de contenido de prueba con los archivos que nombra el calendario. */
const centroFalso = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-cal-'));
  for (const f of ['videos/m-promo-16x9.mp4', 'videos/m-promo-16x9.srt', 'videos/miniaturas-youtube/m-promo-16x9.jpg', 'videos/m-short-9x16.mp4', 'videos/portadas/m-short-9x16.jpg', 'posts/c01/c01-01.png', 'posts/c01/c01-02.png', 'posts/s18/s18-01.png']) {
    fs.mkdirSync(path.join(d, path.dirname(f)), { recursive: true });
    fs.writeFileSync(path.join(d, f), 'x'.repeat(10));
  }
  const datos = {
    start: '2026-11-23',
    timeBase: 'America/Bogota',
    entries: [
      { id: 'a-ig', date: '2026-11-24', time: '09:00', net: 'instagram', format: 'post', piece: 'p', title: 'IG', tags: [], files: [] },
      {
        id: 'yt-largo', date: '2026-11-25', time: '16:00', net: 'youtube', format: 'largo', piece: 'promo-agencias', title: 'Promo', yt: 'MétricaSEO para agencias', tags: ['#AgenciaSEO', '#SEO'],
        caption: 'Todos tus clientes en un panel.\nPruébalo: metricaseo.site', comment: '¿Qué herramienta usas?', link: null, series: null,
        files: [{ f: 'videos/m-promo-16x9.mp4', label: 'Video 16:9' }, { f: 'videos/m-promo-16x9.srt', label: 'Subtítulos .srt' }, { f: 'videos/miniaturas-youtube/m-promo-16x9.jpg', label: 'Miniatura 1280×720' }],
        preview: { img: 'videos/portadas/otra.jpg' },
      },
      { id: 'yt-short', date: '2026-11-24', time: '18:00', net: 'youtube', format: 'short', piece: 'short', title: 'Corto', yt: 'Corto', tags: ['#SEO'], caption: 'Corto', comment: '', files: [{ f: 'videos/m-short-9x16.mp4', label: 'Video 9:16' }, { f: 'videos/portadas/m-short-9x16.jpg', label: 'Portada 1080×1920' }] },
      { id: 'li-doc', date: '2026-11-24', time: '08:30', net: 'linkedin', format: 'documento', piece: 'c01', title: 'Qué es', tags: ['#SEO'], caption: 'Texto (largo)', comment: 'Enlace: https://metricaseo.site/blog/x?utm_source=linkedin', alt: 'Carrusel', files: [{ f: 'posts/c01/c01-01.png', label: 'Imagen 1 de 2' }, { f: 'posts/c01/c01-02.png', label: 'Imagen 2 de 2' }, { f: 'posts/c01/c01-03.png', label: 'Imagen 3 de 3' }] },
      { id: 'li-post', date: '2026-11-27', time: '08:30', net: 'linkedin', format: 'post', piece: 's18', title: 'Qué hacer', tags: ['#SEO'], caption: 'Post #SEO', comment: '', files: [{ f: 'posts/s18/s18-01.png', label: 'Imagen 4:5' }] },
      { id: 'li-video', date: '2026-11-26', time: '08:30', net: 'linkedin', format: 'video', piece: 'promo', title: 'Promo', tags: [], caption: 'Vídeo', comment: '', files: [{ f: 'videos/m-promo-16x9.mp4', label: 'Video 16:9' }, { f: 'videos/m-promo-16x9.srt', label: 'Subtítulos .srt' }] },
    ],
  };
  fs.writeFileSync(path.join(d, 'calendario-data.json'), JSON.stringify(datos));
  return { d, datos };
};

test('busca el centro de contenido desde la carpeta personal', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-home-'));
  assert.equal(cal.buscarCentro(home, ''), null);
  const c = path.join(home, 'dev', 'Metrica SEO', 'centro-contenido');
  fs.mkdirSync(c, { recursive: true });
  fs.writeFileSync(path.join(c, 'calendario-data.json'), '{}');
  assert.equal(cal.buscarCentro(home, ''), c);
  // carpeta elegida relativa a la carpeta personal (vale en la laptop y en el PC)
  const otra = path.join(home, 'otra');
  fs.mkdirSync(otra);
  fs.writeFileSync(path.join(otra, 'calendario-data.json'), '{}');
  assert.equal(cal.buscarCentro(home, 'otra'), otra);
});

test('calendario → publicaciones de YouTube y LinkedIn', () => {
  const { d, datos } = centroFalso();
  const ahora = Date.parse('2026-11-24T00:00:00Z');
  const ps = cal.publicaciones(datos, { carpeta: d, ahora, ajustes: { listas: { largo: 'Promos', short: '' } } });
  assert.deepEqual(ps.map((p) => p.id), ['li-doc', 'yt-short', 'yt-largo', 'li-video', 'li-post']);

  const yt = ps.find((p) => p.id === 'yt-largo');
  assert.equal(yt.tipo, 'video');
  assert.equal(yt.titulo, 'MétricaSEO para agencias');
  assert.equal(new Date(yt.instante).toISOString(), '2026-11-25T21:00:00.000Z'); // 16:00 UTC−5
  assert.equal(yt.video, 'videos/m-promo-16x9.mp4');
  assert.equal(yt.subtitulos, 'videos/m-promo-16x9.srt');
  assert.equal(yt.miniatura, 'videos/miniaturas-youtube/m-promo-16x9.jpg');
  assert.equal(yt.lista, 'Promos');
  assert.match(yt.texto, /https:\/\/metricaseo\.site\/\?utm_source=youtube&utm_medium=social&utm_campaign=promo-agencias/);
  assert.match(yt.texto, /#AgenciaSEO #SEO$/);
  assert.deepEqual(yt.etiquetas, ['AgenciaSEO', 'SEO']);
  assert.equal(yt.vistaPrevia.img, 'videos/miniaturas-youtube/m-promo-16x9.jpg');

  const short = ps.find((p) => p.id === 'yt-short');
  assert.equal(short.tipo, 'short');
  assert.equal(short.miniatura, 'videos/portadas/m-short-9x16.jpg');

  const doc = ps.find((p) => p.id === 'li-doc');
  assert.equal(doc.tipo, 'documento');
  assert.deepEqual(doc.imagenes, ['posts/c01/c01-01.png', 'posts/c01/c01-02.png', 'posts/c01/c01-03.png']);
  assert.deepEqual(doc.faltan, ['posts/c01/c01-03.png']);
  assert.equal(doc.texto, 'Texto (largo)\n\n#SEO');
  assert.equal(doc.alt, 'Carrusel');

  assert.equal(ps.find((p) => p.id === 'li-post').tipo, 'imagen');
  assert.equal(ps.find((p) => p.id === 'li-post').texto, 'Post #SEO'); // el hashtag ya estaba: no se repite
  const vid = ps.find((p) => p.id === 'li-video');
  assert.equal(vid.tipo, 'video');
  assert.equal(vid.video, 'videos/m-promo-16x9.mp4');
});

test('atrasadas sin publicar sí, publicadas no; rango de días', () => {
  const { d, datos } = centroFalso();
  const ahora = Date.parse('2026-11-26T00:00:00Z');
  const todas = cal.publicaciones(datos, { carpeta: d, ahora });
  assert.ok(todas.some((p) => p.id === 'li-doc'));
  const sinHechas = cal.publicaciones(datos, { carpeta: d, ahora, hechas: (id) => id === 'li-doc' });
  assert.ok(!sinHechas.some((p) => p.id === 'li-doc'));
  const dosDias = cal.publicaciones(datos, { carpeta: d, ahora, dias: 1 });
  assert.ok(!dosDias.some((p) => p.id === 'li-post'));
  assert.ok(dosDias.some((p) => p.id === 'li-video'));
});

test('zona de las horas: la elegida manda sobre la del calendario', () => {
  const { d, datos } = centroFalso();
  const [p] = cal.publicaciones(datos, { carpeta: d, ahora: 0, ajustes: { zonaCalendario: 'America/Caracas' } });
  assert.equal(new Date(p.instante).toISOString(), '2026-11-24T12:30:00.000Z');
  assert.equal(p.zona, 'America/Caracas');
});

test('el calendario real (si está sincronizado) se mapea sin errores', (t) => {
  const c = cal.buscarCentro(os.homedir(), '');
  if (!c) return t.skip('sin centro de contenido en este equipo');
  const datos = cal.leerCalendario(c);
  const ps = cal.publicaciones(datos, { carpeta: c, ahora: 0 });
  assert.ok(ps.length > 0);
  for (const p of ps) {
    assert.ok(['youtube', 'linkedin'].includes(p.red));
    assert.ok(Number.isFinite(p.instante));
    if (p.red === 'youtube') {
      assert.ok(p.video, `${p.id} sin vídeo`);
      assert.ok([...p.titulo].length <= 100);
      assert.ok(Buffer.byteLength(p.texto) <= 5000);
    } else assert.ok(p.tipo !== 'texto' || p.texto);
  }
});
