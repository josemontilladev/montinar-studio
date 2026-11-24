/**
 * OAuth 2.0 en el navegador del sistema con redirección a 127.0.0.1 (loopback).
 * - Google (app de escritorio): puerto libre al azar, PKCE S256 y state.
 *   https://developers.google.com/identity/protocols/oauth2/native-app
 * - LinkedIn (flujo estándar de autorización): la URL de redirección debe estar registrada TAL CUAL en la app, así
 *   que el puerto es fijo (ajustable); state obligatorio aquí. LinkedIn solo admite PKCE en su flujo «native» que
 *   activa su equipo a mano, y el canje exige client_secret.
 *   https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */
const http = require('node:http');
const { mismoState } = require('./util.cjs');

const GOOGLE = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  revocar: 'https://oauth2.googleapis.com/revoke',
  // youtube.force-ssl basta para videos.insert, thumbnails.set, captions.insert (que solo acepta este o
  // youtubepartner), playlists.list y playlistItems.insert; youtube.upload no cubre subtítulos ni listas.
  scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],
};
const LINKEDIN = {
  auth: 'https://www.linkedin.com/oauth/v2/authorization',
  token: 'https://www.linkedin.com/oauth/v2/accessToken',
  // openid + profile: «Sign In with LinkedIn using OpenID Connect» (para saber quién es: /v2/userinfo → sub);
  // w_member_social: «Share on LinkedIn» (publicar como el miembro). Los dos son de autoservicio.
  scopes: ['openid', 'profile', 'w_member_social'],
  puertoPorDefecto: 53682,
  ruta: '/linkedin',
};

class ErrorPublicar extends Error {
  /** @param {string} mensaje texto para el usuario @param {{codigo?: string, estado?: number, detalle?: string, reintentar?: boolean}} [extra] */
  constructor(mensaje, extra = {}) {
    super(mensaje);
    Object.assign(this, extra);
  }
}

const urlAutorizacionGoogle = ({ clientId, redirect, challenge, state, loginHint }) => {
  const u = new URL(GOOGLE.auth);
  u.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: GOOGLE.scopes.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    // pedir siempre el consentimiento asegura un refresh_token nuevo al volver a conectar
    prompt: 'consent',
    access_type: 'offline',
    ...(loginHint ? { login_hint: loginHint } : {}),
  }).toString();
  return u.toString();
};

const urlAutorizacionLinkedIn = ({ clientId, redirect, state }) => {
  const u = new URL(LINKEDIN.auth);
  u.search = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirect, state, scope: LINKEDIN.scopes.join(' ') }).toString();
  return u.toString();
};

const redireccionLinkedIn = (puerto) => `http://127.0.0.1:${puerto || LINKEDIN.puertoPorDefecto}${LINKEDIN.ruta}`;

const canjeGoogle = ({ clientId, clientSecret, code, verifier, redirect }) =>
  new URLSearchParams({ client_id: clientId, ...(clientSecret ? { client_secret: clientSecret } : {}), code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect });
const refrescoGoogle = ({ clientId, clientSecret, refreshToken }) =>
  new URLSearchParams({ client_id: clientId, ...(clientSecret ? { client_secret: clientSecret } : {}), refresh_token: refreshToken, grant_type: 'refresh_token' });
const canjeLinkedIn = ({ clientId, clientSecret, code, redirect }) =>
  new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect });

/** POST de formulario al endpoint de tokens. Nunca incluye el cuerpo enviado en los errores (lleva secretos). */
const pedirToken = async (fetchFn, url, params, red) => {
  let r;
  try {
    r = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: params.toString() });
  } catch (e) {
    throw new ErrorPublicar(`Sin conexión con ${red}: ${e.message}`, { codigo: 'red', reintentar: true });
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const codigo = j.error || `http_${r.status}`;
    const desc = j.error_description ? ` (${j.error_description})` : '';
    if (codigo === 'invalid_grant')
      throw new ErrorPublicar(`${red} ya no acepta el permiso guardado: vuelve a conectar la cuenta en Ajustes › Redes.${red === 'Google' ? ' Si la app de Google Cloud está en «Prueba», el permiso caduca a los 7 días: pásala a «En producción».' : ''}`, { codigo: 'reconectar', estado: r.status });
    if (codigo === 'invalid_client' || codigo === 'unauthorized_client')
      throw new ErrorPublicar(`${red} rechaza el ID o el secreto de cliente${desc}. Revísalos en Ajustes › Redes.`, { codigo: 'credenciales', estado: r.status });
    if (codigo === 'redirect_uri_mismatch' || /redirect/i.test(desc))
      throw new ErrorPublicar(`${red} rechaza la URL de redirección${desc}. Revisa la URL registrada en la app (Ajustes › Redes lo explica).`, { codigo: 'redireccion', estado: r.status });
    throw new ErrorPublicar(`${red} no dio el token: ${codigo}${desc}`, { codigo, estado: r.status });
  }
  return j;
};

const PAGINA = (titulo, texto) => `<!doctype html><html lang="es"><meta charset="utf-8"><title>${titulo}</title>
<body style="font-family:system-ui,sans-serif;background:#f3f3f3;color:#212121;display:grid;place-items:center;height:100vh;margin:0">
<div style="background:#fff;border:1px solid #e2e2e2;border-radius:16px;padding:32px 40px;max-width:440px">
<h1 style="font-size:20px;margin:0 0 8px">${titulo}</h1><p style="margin:0;color:#555">${texto}</p></div></body></html>`;

/**
 * Abre un servidor en 127.0.0.1 (puerto 0 = libre), llama a `abrir(redirect)` para lanzar el navegador y espera
 * el código. Comprueba ruta y state; se cierra solo al recibir la respuesta, al cancelar o a los `msMax`.
 * @returns {{ redirect: Promise<string>, codigo: Promise<string>, cancelar: () => void }}
 */
const esperarCodigo = ({ puerto = 0, ruta = '/', state, msMax = 5 * 60 * 1000 }) => {
  let resolver;
  let rechazar;
  const codigo = new Promise((a, b) => ((resolver = a), (rechazar = b)));
  codigo.catch(() => {});
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== ruta) {
      res.writeHead(404).end();
      return;
    }
    const q = u.searchParams;
    const fin = (ok, titulo, texto) => {
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' }).end(PAGINA(titulo, texto));
      cerrar();
    };
    if (!mismoState(q.get('state') ?? '', state)) {
      fin(false, 'No se pudo conectar', 'La respuesta no corresponde a esta conexión (state distinto). Vuelve a intentarlo desde MétricaSEO Studio.');
      return rechazar(new ErrorPublicar('La respuesta del navegador no coincide con la petición (state distinto). Vuelve a intentarlo.', { codigo: 'state' }));
    }
    if (q.get('error')) {
      const e = q.get('error');
      fin(false, 'Conexión cancelada', 'Puedes cerrar esta pestaña y volver a MétricaSEO Studio.');
      return rechazar(new ErrorPublicar(e === 'access_denied' || e === 'user_cancelled_authorize' || e === 'user_cancelled_login' ? 'Cancelaste el permiso en el navegador.' : `El navegador devolvió un error: ${e}${q.get('error_description') ? ` (${q.get('error_description')})` : ''}`, { codigo: e }));
    }
    const c = q.get('code');
    if (!c) {
      fin(false, 'No se pudo conectar', 'Falta el código de autorización.');
      return rechazar(new ErrorPublicar('El navegador no devolvió el código de autorización.', { codigo: 'sin_codigo' }));
    }
    fin(true, 'Cuenta conectada', 'Ya puedes cerrar esta pestaña y volver a MétricaSEO Studio.');
    resolver(c);
  });
  const temporizador = setTimeout(() => {
    rechazar(new ErrorPublicar('Se agotó el tiempo para dar el permiso en el navegador (5 minutos). Vuelve a intentarlo.', { codigo: 'tiempo' }));
    cerrar();
  }, msMax);
  const cerrar = () => {
    clearTimeout(temporizador);
    srv.close();
    srv.closeAllConnections?.();
  };
  const redirect = new Promise((a, b) => {
    srv.once('error', (e) => {
      clearTimeout(temporizador);
      const err = e.code === 'EADDRINUSE' ? new ErrorPublicar(`El puerto ${puerto} de este equipo está ocupado. Cierra el programa que lo usa o cambia el puerto (y la URL registrada) en Ajustes › Redes.`, { codigo: 'puerto' }) : e;
      rechazar(err);
      b(err);
    });
    srv.listen(puerto, '127.0.0.1', () => a(`http://127.0.0.1:${srv.address().port}${ruta}`));
  });
  redirect.catch(() => {});
  return {
    redirect,
    codigo,
    cancelar: () => {
      rechazar(new ErrorPublicar('Conexión cancelada.', { codigo: 'cancelado' }));
      cerrar();
    },
  };
};

module.exports = { GOOGLE, LINKEDIN, ErrorPublicar, urlAutorizacionGoogle, urlAutorizacionLinkedIn, redireccionLinkedIn, canjeGoogle, refrescoGoogle, canjeLinkedIn, pedirToken, esperarCodigo };
