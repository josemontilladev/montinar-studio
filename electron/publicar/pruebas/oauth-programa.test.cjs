// OAuth (URLs, cuerpos y servidor loopback), cola/estado y almacén cifrado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const oauth = require('../oauth.cjs');
const prog = require('../programa.cjs');
const { crearAlmacen, resumenSecretos } = require('../almacen.cjs');
const { htmlCarrusel } = require('../pdf.cjs');

test('Google: URL de autorización con PKCE S256, state, loopback y el scope mínimo', () => {
  const u = new URL(oauth.urlAutorizacionGoogle({ clientId: 'abc.apps.googleusercontent.com', redirect: 'http://127.0.0.1:51234/', challenge: 'RETO', state: 'EST' }));
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  const q = u.searchParams;
  assert.equal(q.get('code_challenge'), 'RETO');
  assert.equal(q.get('code_challenge_method'), 'S256');
  assert.equal(q.get('state'), 'EST');
  assert.equal(q.get('redirect_uri'), 'http://127.0.0.1:51234/');
  assert.equal(q.get('response_type'), 'code');
  assert.equal(q.get('scope'), 'https://www.googleapis.com/auth/youtube.force-ssl');
  const canje = oauth.canjeGoogle({ clientId: 'id', clientSecret: 's', code: 'c', verifier: 'v', redirect: 'r' });
  assert.equal(canje.get('code_verifier'), 'v');
  assert.equal(canje.get('grant_type'), 'authorization_code');
  assert.equal(oauth.refrescoGoogle({ clientId: 'id', refreshToken: 'rt' }).get('grant_type'), 'refresh_token');
});

test('LinkedIn: URL con state, scopes de autoservicio y redirección fija', () => {
  const r = oauth.redireccionLinkedIn(53682);
  assert.equal(r, 'http://127.0.0.1:53682/linkedin');
  const u = new URL(oauth.urlAutorizacionLinkedIn({ clientId: 'li', redirect: r, state: 'EST' }));
  assert.equal(u.origin + u.pathname, 'https://www.linkedin.com/oauth/v2/authorization');
  assert.equal(u.searchParams.get('scope'), 'openid profile w_member_social');
  assert.equal(u.searchParams.get('state'), 'EST');
  const c = oauth.canjeLinkedIn({ clientId: 'li', clientSecret: 's', code: 'c', redirect: r });
  assert.equal(c.get('client_secret'), 's');
  assert.equal(c.get('redirect_uri'), r);
});

test('pedirToken: invalid_grant pide reconectar y no filtra el cuerpo enviado', async () => {
  const f = async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }), { status: 400 });
  await assert.rejects(oauth.pedirToken(f, 'https://x', new URLSearchParams({ client_secret: 'SECRETO' }), 'Google'), (e) => e.codigo === 'reconectar' && !e.message.includes('SECRETO') && /7 días/.test(e.message));
});

test('loopback: acepta el código con el state correcto y rechaza otro state', async () => {
  const bien = oauth.esperarCodigo({ puerto: 0, ruta: '/', state: 'S1' });
  const red = await bien.redirect;
  assert.match(red, /^http:\/\/127\.0\.0\.1:\d+\/$/);
  const r = await fetch(`${red}?code=CODIGO&state=S1`);
  assert.equal(r.status, 200);
  assert.equal(await bien.codigo, 'CODIGO');

  const mal = oauth.esperarCodigo({ puerto: 0, ruta: '/linkedin', state: 'S2' });
  const red2 = await mal.redirect;
  assert.equal((await fetch(red2.replace('/linkedin', '/otra'))).status, 404);
  const r2 = await fetch(`${red2}?code=X&state=OTRO`);
  assert.equal(r2.status, 400);
  await assert.rejects(mal.codigo, (e) => e.codigo === 'state');

  const cancelado = oauth.esperarCodigo({ puerto: 0, state: 'S3' });
  await cancelado.redirect;
  const red3 = await cancelado.redirect;
  await fetch(`${red3}?error=access_denied&state=S3`);
  await assert.rejects(cancelado.codigo, /Cancelaste/);
});

test('loopback: puerto ocupado → mensaje claro', async () => {
  const s = net.createServer().listen(0, '127.0.0.1');
  await new Promise((r) => s.once('listening', r));
  const x = oauth.esperarCodigo({ puerto: s.address().port, state: 'S' });
  await assert.rejects(x.redirect, (e) => e.codigo === 'puerto');
  s.close();
});

test('cola de LinkedIn: solo publica sola lo que vence con la app abierta', () => {
  const arranque = 1000;
  assert.ok(prog.debePublicarSola({ estado: 'en-cola', instante: 2000 }, 2500, arranque));
  assert.ok(!prog.debePublicarSola({ estado: 'en-cola', instante: 2000 }, 1500, arranque), 'aún no es la hora');
  assert.ok(!prog.debePublicarSola({ estado: 'en-cola', instante: 900 }, 2500, arranque), 'venció con la app cerrada: pide confirmación');
  assert.ok(!prog.debePublicarSola({ estado: 'publicada', instante: 2000 }, 2500, arranque));
  const pubs = { a: { estado: 'en-cola', instante: 900, envio: { titulo: 'A' } }, b: { estado: 'en-cola', instante: 2000 }, c: { estado: 'pendiente' } };
  assert.deepEqual(prog.atrasadasEnCola(pubs, arranque), [{ id: 'a', instante: 900, titulo: 'A' }]);
  assert.ok(prog.hayCola(pubs));
  assert.ok(!prog.hayCola({ c: { estado: 'publicada' } }));
});

test('estado visible, modo de YouTube y vídeo que queda privado', () => {
  assert.equal(prog.estadoVisible(undefined, 100, 200), 'atrasada');
  assert.equal(prog.estadoVisible(undefined, 300, 200), 'pendiente');
  assert.equal(prog.estadoVisible({ estado: 'programada', instante: 150 }, 150, 200), 'publicada');
  assert.equal(prog.estadoVisible({ estado: 'programada', instante: 250 }, 250, 200), 'programada');
  const ahora = Date.parse('2026-11-24T12:00:00Z');
  assert.deepEqual(prog.modoYouTube(ahora + 3600e3, ahora), { modo: 'programar', publishAt: ahora + 3600e3 });
  assert.equal(prog.modoYouTube(ahora + 60e3, ahora).modo, 'ahora');
  assert.equal(prog.modoYouTube(ahora - 60e3, ahora).modo, 'ahora');
  assert.ok(prog.quedoPrivado({ publishAt: 1 }, { privacyStatus: 'private' }));
  assert.ok(!prog.quedoPrivado({ publishAt: 1 }, { privacyStatus: 'private', publishAt: '2026-11-30T21:00:00Z' }));
  assert.ok(prog.quedoPrivado({ publishAt: null }, { privacyStatus: 'private' }));
  assert.ok(!prog.quedoPrivado({ publishAt: null }, { privacyStatus: 'public' }));
});

test('ediciones: solo los campos editables y marca «editada»', () => {
  const p = { titulo: 'A', texto: 'T', comentario: 'C', lista: '' };
  assert.equal(prog.conEdiciones(p, undefined).editada, false);
  const e = prog.conEdiciones(p, { texto: 'T2', red: 'x', titulo: 'A' });
  assert.equal(e.texto, 'T2');
  assert.equal(e.titulo, 'A');
  assert.equal(e.editada, true);
  assert.ok(!('red' in e) || e.red === undefined);
});

test('almacén: secretos cifrados en disco, estado sin secretos, resumen sin secretos', () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-alm-'));
  // cifrado falso (en la app: safeStorage/DPAPI)
  const cifrado = { disponible: () => true, cifrar: (t) => Buffer.from(Buffer.from(t).toString('base64').split('').reverse().join('')), descifrar: (b) => Buffer.from(b.toString().split('').reverse().join(''), 'base64').toString() };
  const a = crearAlmacen({ carpeta, cifrado });
  a.cambiarSecretos((s) => {
    s.google = { clientId: 'id.apps.googleusercontent.com', clientSecret: 'GOCSPX-SECRETO' };
    s.tokens = { google: { access_token: 'ya29.TOKEN', refresh_token: '1//REFRESH', expira: Date.now() + 1000 } };
  });
  const bruto = fs.readFileSync(path.join(carpeta, 'secretos.bin'), 'latin1');
  assert.ok(!bruto.includes('GOCSPX') && !bruto.includes('ya29') && !bruto.includes('REFRESH'));
  assert.equal(a.leerSecretos().google.clientSecret, 'GOCSPX-SECRETO');
  const r = resumenSecretos(a.leerSecretos());
  assert.ok(r.youtube.credenciales && r.youtube.conectada);
  assert.ok(!JSON.stringify(r).includes('SECRETO') && !JSON.stringify(r).includes('TOKEN'));
  assert.ok(!r.linkedin.conectada);
  a.cambiarEstado((e) => void (a.pub(e, 'x').estado = 'en-cola'));
  assert.equal(a.leerEstado().publicaciones.x.estado, 'en-cola');
  assert.equal(a.leerEstado().ajustes.linkedin.version, '202611');
  assert.ok(!fs.readFileSync(path.join(carpeta, 'estado.json'), 'utf8').includes('SECRETO'));
  // sin cifrado disponible no se guarda nada
  const b = crearAlmacen({ carpeta: fs.mkdtempSync(path.join(os.tmpdir(), 'studio-alm-')), cifrado: { ...cifrado, disponible: () => false } });
  assert.throws(() => b.cambiarSecretos((s) => void (s.x = 1)), /cifrado/);
  // un archivo que no se puede descifrar (copiado de otro equipo) no rompe: se empieza de cero
  fs.writeFileSync(path.join(carpeta, 'secretos.bin'), 'basura');
  assert.deepEqual(a.leerSecretos(), {});
});

test('PDF del carrusel: una página por imagen del tamaño de la primera', () => {
  const h = htmlCarrusel(['C:\\x\\a 1.png', 'C:\\x\\b.png'], { ancho: 1080, alto: 1350 });
  assert.match(h, /@page \{ size: 1080px 1350px; margin: 0 \}/);
  assert.equal((h.match(/class="p"/g) ?? []).length, 2);
  assert.ok(h.includes('file:///C:/x/a%201.png'));
});
