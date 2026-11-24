// node --test electron/publicar/pruebas   (npm run test:publicar)
const test = require('node:test');
const assert = require('node:assert/strict');
const u = require('../util.cjs');

test('PKCE: vector de la RFC 7636 y verifier válido', () => {
  assert.equal(u.retoS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const p = u.crearPkce();
  assert.match(p.verifier, /^[A-Za-z0-9\-._~]{43,128}$/);
  assert.equal(p.challenge, u.retoS256(p.verifier));
  assert.equal(p.metodo, 'S256');
  assert.notEqual(u.crearPkce().verifier, p.verifier);
});

test('state: aleatorio y comparación estricta', () => {
  const s = u.crearState();
  assert.ok(s.length >= 32);
  assert.ok(u.mismoState(s, s));
  assert.ok(!u.mismoState(s, s.slice(0, -1) + (s.endsWith('A') ? 'B' : 'A')));
  assert.ok(!u.mismoState(s, ''));
  assert.ok(!u.mismoState(undefined, s));
});

test('hora del calendario en una zona → instante UTC', () => {
  assert.equal(new Date(u.instanteEnZona('2026-11-30', '08:30', 'America/Bogota')).toISOString(), '2026-11-30T13:30:00.000Z');
  assert.equal(new Date(u.instanteEnZona('2026-11-30', '08:30', 'America/Caracas')).toISOString(), '2026-11-30T12:30:00.000Z');
  // Madrid: invierno UTC+1, verano UTC+2
  assert.equal(new Date(u.instanteEnZona('2027-01-15', '10:00', 'Europe/Madrid')).toISOString(), '2027-01-15T09:00:00.000Z');
  assert.equal(new Date(u.instanteEnZona('2027-07-15', '10:00', 'Europe/Madrid')).toISOString(), '2027-07-15T08:00:00.000Z');
  assert.throws(() => u.instanteEnZona('30/11/2026', '8:30', 'America/Bogota'));
  assert.ok(u.zonaValida('America/Caracas'));
  assert.ok(!u.zonaValida('Marte/Olympus'));
});

test('cuota de YouTube: siguiente medianoche del Pacífico', () => {
  // 24/11/2026 20:00 UTC = 12:00 PST → 25/11 00:00 PST = 08:00 UTC
  assert.equal(new Date(u.siguienteMedianochePacifico(Date.parse('2026-11-24T20:00:00Z'))).toISOString(), '2026-11-25T08:00:00.000Z');
});

test('UTM: dominios sueltos → enlaces clicables con UTM; los que ya tienen UTM no cambian', () => {
  const t = u.conUtm('Pruébalo: metricaseo.site\nPrecios en metricaseo.site/precios.', { red: 'youtube', campana: 'promo-agencias' });
  assert.equal(t, 'Pruébalo: https://metricaseo.site/?utm_source=youtube&utm_medium=social&utm_campaign=promo-agencias\nPrecios en https://metricaseo.site/precios?utm_source=youtube&utm_medium=social&utm_campaign=promo-agencias.');
  const ya = 'https://metricaseo.site/blog/x?utm_source=youtube&utm_medium=social&utm_campaign=blog';
  assert.equal(u.conUtm(ya, { red: 'youtube', campana: 'z' }), ya);
});

test('LinkedIn: escapa los caracteres reservados y deja los hashtags', () => {
  assert.equal(u.escaparLinkedIn('Hola (prueba) [x] @yo *a* _b_ ~c~ <d> {e} | \\ #SEO #AgenciaSEO'), 'Hola \\(prueba\\) \\[x\\] \\@yo \\*a\\* \\_b\\_ \\~c\\~ \\<d\\> \\{e\\} \\| \\\\ #SEO #AgenciaSEO');
  assert.equal(u.escaparLinkedIn('Paso #1 y # suelto'), 'Paso #1 y \\# suelto');
  assert.equal(u.escaparLinkedIn('precio#3'), 'precio\\#3');
  assert.equal(u.escaparLinkedIn('#SEO\n#GA4'), '#SEO\n#GA4');
  assert.equal(u.escaparLinkedIn('Emoji 👇 y tildes ñ'), 'Emoji 👇 y tildes ñ');
});

test('YouTube: límites de título, descripción y etiquetas', () => {
  assert.equal(u.tituloYouTube('  <Hola>   mundo '), 'Hola mundo');
  const largo = 'á'.repeat(150);
  assert.equal([...u.tituloYouTube(largo)].length, 100);
  const d = u.descripcionYouTube('ñ'.repeat(3000) + '<b>');
  assert.ok(Buffer.byteLength(d, 'utf8') <= 5000);
  assert.ok(!/[<>]/.test(d));
  assert.deepEqual(u.etiquetasYouTube(['#SEO', '#SEO', '#Agencia SEO', '']), ['SEO', 'Agencia SEO']);
  const muchas = Array.from({ length: 100 }, (_, i) => `#etiqueta${i}`);
  assert.ok(u.etiquetasYouTube(muchas).join(',').length <= 500);
});
