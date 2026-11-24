/**
 * «Publicar» (proceso principal de Electron): conecta YouTube y LinkedIn con OAuth en el navegador del sistema,
 * guarda credenciales y tokens cifrados con safeStorage en los datos de la app de este equipo, lee el calendario
 * del centro de contenido sincronizado y sube/programa (YouTube) o publica (LinkedIn, ahora o a su hora).
 * La interfaz (app/publicar) llama a `manejar(op, datos)` por el IPC «accion» con a = 'publicar'.
 * Nunca se registran credenciales ni tokens (ni en consola ni en registro.txt).
 */
const fs = require('node:fs');
const path = require('node:path');
const util = require('./util.cjs');
const oauth = require('./oauth.cjs');
const cal = require('./calendario.cjs');
const yt = require('./youtube.cjs');
const li = require('./linkedin.cjs');
const prog = require('./programa.cjs');
const { crearAlmacen, resumenSecretos } = require('./almacen.cjs');
const { carruselAPdf } = require('./pdf.cjs');
const { ErrorPublicar } = oauth;

/** URLs que la interfaz puede abrir en el navegador (instrucciones y enlaces de lo publicado). */
const URL_PERMITIDA = /^https:\/\/(([a-z0-9-]+\.)*(google\.com|youtube\.com|youtu\.be|linkedin\.com|microsoft\.com|metricaseo\.site))(\/|$)/i;

const crearPublicar = ({ electron, datos, home, avisar = () => {}, notificar = () => {} }) => {
  const { safeStorage, shell, BrowserWindow, nativeImage, powerSaveBlocker } = electron;
  const almacen = crearAlmacen({
    carpeta: path.join(datos, 'publicar'),
    cifrado: {
      disponible: () => safeStorage.isEncryptionAvailable(),
      cifrar: (t) => safeStorage.encryptString(t),
      descifrar: (b) => safeStorage.decryptString(b),
    },
  });
  const ARRANQUE = Date.now();
  const trabajos = new Map(); // id → { etapa, progreso, cancelar }
  let conexion = null; // OAuth en curso
  let bloqueo = null; // powerSaveBlocker mientras hay cola

  const emitir = (evento) => {
    try {
      avisar(evento);
    } catch {}
  };
  const progreso = (id, etapa, p = null) => {
    const t = trabajos.get(id);
    if (!t) return;
    Object.assign(t, { etapa, progreso: p });
    emitir({ tipo: 'progreso', id, etapa, progreso: p });
  };

  // ——— calendario ———
  const centro = () => cal.buscarCentro(home, almacen.leerEstado().ajustes.carpetaCentro);
  const todas = () => {
    const c = centro();
    if (!c) return { carpeta: null, lista: [] };
    const { ajustes, publicaciones: est } = almacen.leerEstado();
    const datosCal = cal.leerCalendario(c);
    const lista = cal.publicaciones(datosCal, {
      carpeta: c,
      ajustes: { zonaCalendario: ajustes.zonaCalendario, listas: ajustes.youtube.listas },
      ahora: Date.now(),
      dias: 0,
      hechas: (id) => ['publicada', 'programada'].includes(est[id]?.estado),
    });
    return { carpeta: c, lista, zona: ajustes.zonaCalendario || datosCal.timeBase || cal.ZONA_CALENDARIO, conTextos: (datosCal.entries ?? []).some((e) => e.caption) };
  };
  const buscar = (id) => {
    const { lista, carpeta } = todas();
    const p = lista.find((x) => x.id === id);
    if (!p) throw new ErrorPublicar('Esa publicación ya no está en el calendario (o ya está publicada).', { codigo: 'no_existe' });
    const st = almacen.leerEstado().publicaciones[id];
    return { pub: prog.conEdiciones(p, st?.ediciones), carpeta };
  };
  const abs = (carpeta, rel) => path.join(carpeta, ...rel.split('/'));

  // ——— cuentas ———
  const secretos = () => almacen.leerSecretos();
  const tokenGoogle = async (forzar = false) => {
    const s = secretos();
    const t = s.tokens?.google;
    if (!t?.access_token) throw new ErrorPublicar('YouTube no está conectado: conéctalo en Ajustes › Redes.', { codigo: 'reconectar' });
    if (!forzar && t.expira && t.expira - 60000 > Date.now()) return t.access_token;
    if (!t.refresh_token) throw new ErrorPublicar('El permiso de YouTube caducó: vuelve a conectar la cuenta en Ajustes › Redes.', { codigo: 'reconectar' });
    const j = await oauth.pedirToken(fetch, oauth.GOOGLE.token, oauth.refrescoGoogle({ clientId: s.google?.clientId, clientSecret: s.google?.clientSecret, refreshToken: t.refresh_token }), 'Google').catch((e) => {
      if (e.codigo === 'reconectar') almacen.cambiarSecretos((x) => x.tokens?.google && (x.tokens.google.access_token = ''));
      throw e;
    });
    almacen.cambiarSecretos((x) => {
      x.tokens.google = { ...x.tokens.google, access_token: j.access_token, expira: Date.now() + (j.expires_in ?? 3600) * 1000, ...(j.refresh_token ? { refresh_token: j.refresh_token } : {}) };
    });
    return j.access_token;
  };
  const clienteYouTube = () => yt.crearCliente({ fetch, token: () => tokenGoogle(), renovar: () => tokenGoogle(true) });
  const tokenLinkedIn = async () => {
    const t = secretos().tokens?.linkedin;
    if (!t?.access_token) throw new ErrorPublicar('LinkedIn no está conectado: conéctalo en Ajustes › Redes.', { codigo: 'reconectar' });
    if (t.expira && t.expira <= Date.now()) throw new ErrorPublicar('El permiso de LinkedIn caducó (dura 60 días): vuelve a conectar la cuenta en Ajustes › Redes.', { codigo: 'reconectar' });
    return t.access_token;
  };
  const clienteLinkedIn = () => {
    const t = secretos().tokens?.linkedin;
    return li.crearCliente({ fetch, token: tokenLinkedIn, version: almacen.leerEstado().ajustes.linkedin.version || li.VERSION, autor: t?.cuenta?.urn });
  };

  const conectar = async (red) => {
    if (conexion) conexion.cancelar();
    const s = secretos();
    const state = util.crearState();
    if (red === 'youtube') {
      const c = s.google ?? {};
      if (!c.clientId || !c.clientSecret) throw new ErrorPublicar('Primero guarda el ID y el secreto de cliente de Google.', { codigo: 'credenciales' });
      const pkce = util.crearPkce();
      conexion = oauth.esperarCodigo({ puerto: 0, ruta: '/', state });
      const redirect = await conexion.redirect;
      await shell.openExternal(oauth.urlAutorizacionGoogle({ clientId: c.clientId, redirect, challenge: pkce.challenge, state }));
      const code = await conexion.codigo;
      conexion = null;
      const j = await oauth.pedirToken(fetch, oauth.GOOGLE.token, oauth.canjeGoogle({ clientId: c.clientId, clientSecret: c.clientSecret, code, verifier: pkce.verifier, redirect }), 'Google');
      almacen.cambiarSecretos((x) => {
        x.tokens ??= {};
        x.tokens.google = { access_token: j.access_token, refresh_token: j.refresh_token ?? x.tokens.google?.refresh_token, expira: Date.now() + (j.expires_in ?? 3600) * 1000, scope: j.scope ?? '' };
      });
      if (!String(j.scope ?? '').includes('youtube.force-ssl')) throw new ErrorPublicar('Google no concedió el permiso de YouTube. Al conectar, marca la casilla de gestionar tu cuenta de YouTube.', { codigo: 'scope' });
      const cuenta = await clienteYouTube().canal();
      almacen.cambiarSecretos((x) => void (x.tokens.google.cuenta = cuenta));
      return cuenta;
    }
    if (red === 'linkedin') {
      const c = s.linkedin ?? {};
      if (!c.clientId || !c.clientSecret) throw new ErrorPublicar('Primero guarda el ID y el secreto de cliente de LinkedIn.', { codigo: 'credenciales' });
      const puerto = Number(almacen.leerEstado().ajustes.linkedin.puerto) || oauth.LINKEDIN.puertoPorDefecto;
      conexion = oauth.esperarCodigo({ puerto, ruta: oauth.LINKEDIN.ruta, state });
      const redirect = await conexion.redirect;
      await shell.openExternal(oauth.urlAutorizacionLinkedIn({ clientId: c.clientId, redirect, state }));
      const code = await conexion.codigo;
      conexion = null;
      const j = await oauth.pedirToken(fetch, oauth.LINKEDIN.token, oauth.canjeLinkedIn({ clientId: c.clientId, clientSecret: c.clientSecret, code, redirect }), 'LinkedIn');
      almacen.cambiarSecretos((x) => {
        x.tokens ??= {};
        x.tokens.linkedin = { access_token: j.access_token, expira: Date.now() + (j.expires_in ?? 60 * 86400) * 1000, scope: j.scope ?? '' };
      });
      const cuenta = await li.crearCliente({ fetch, token: tokenLinkedIn }).yo();
      almacen.cambiarSecretos((x) => void (x.tokens.linkedin.cuenta = cuenta));
      return cuenta;
    }
    throw new Error('Red desconocida');
  };

  const desconectar = async (red) => {
    const k = red === 'youtube' ? 'google' : 'linkedin';
    const t = secretos().tokens?.[k];
    // Google: revocar el permiso además de olvidarlo (LinkedIn no ofrece revocación a apps de autoservicio)
    if (k === 'google' && (t?.refresh_token || t?.access_token))
      await fetch(`${oauth.GOOGLE.revocar}?token=${encodeURIComponent(t.refresh_token || t.access_token)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).catch(() => {});
    almacen.cambiarSecretos((x) => {
      if (x.tokens) delete x.tokens[k];
    });
  };

  // ——— estado de cada publicación ———
  const marcar = (id, cambios) =>
    almacen.cambiarEstado((e) => {
      Object.assign(almacen.pub(e, id), cambios, { actualizada: Date.now() });
    });
  const conError = (id, e) => {
    // LinkedIn rechazó el token (401): la cuenta pasa a «sin conectar» para que se vea que hay que reconectar
    if (e.codigo === 'reconectar' && id.includes('-linkedin-')) almacen.cambiarSecretos((x) => x.tokens?.linkedin && (x.tokens.linkedin.expira = Date.now()));
    marcar(id, { estado: 'error', mensaje: e.message, codigo: e.codigo ?? null });
    emitir({ tipo: 'fin', id, ok: false, mensaje: e.message });
  };
  const ejecutar = (id, fn) => {
    if (trabajos.has(id)) throw new ErrorPublicar('Esa publicación ya se está enviando.', { codigo: 'ocupada' });
    let cancelada = false;
    trabajos.set(id, { etapa: 'Empezando', progreso: null, cancelar: () => (cancelada = true) });
    const anterior = almacen.leerEstado().publicaciones[id]?.estado;
    marcar(id, { estado: 'subiendo', mensaje: null, estadoAnterior: anterior ?? 'pendiente' });
    fn(() => cancelada)
      .then((r) => emitir({ tipo: 'fin', id, ok: true, ...r }))
      .catch((e) => conError(id, e))
      .finally(() => {
        trabajos.delete(id);
        actualizarBloqueo();
      });
    return { ok: true };
  };

  // ——— YouTube ———
  const subirYouTube = (id, { confirmarAhora = false } = {}) => {
    const { pub, carpeta } = buscar(id);
    if (!pub.video) throw new ErrorPublicar('Esta publicación no tiene vídeo en el calendario.', { codigo: 'sin_video' });
    const rutaVideo = abs(carpeta, pub.video);
    if (!fs.existsSync(rutaVideo)) throw new ErrorPublicar(`Falta el vídeo en el centro de contenido: ${pub.video}. Espera a que termine de sincronizar.`, { codigo: 'falta_archivo' });
    if (!pub.titulo.trim()) throw new ErrorPublicar('El título está vacío.', { codigo: 'titulo' });
    if (!secretos().tokens?.google?.access_token && !secretos().tokens?.google?.refresh_token) throw new ErrorPublicar('YouTube no está conectado: conéctalo en Ajustes › Redes.', { codigo: 'reconectar' });
    const st0 = almacen.leerEstado().publicaciones[id] ?? {};
    const yaSubido = st0.youtube?.videoId;
    const modo = prog.modoYouTube(pub.instante, Date.now());
    if (!yaSubido && modo.modo === 'ahora' && !confirmarAhora)
      throw new ErrorPublicar('La hora de esta publicación ya pasó (o falta muy poco): se publicaría al momento.', { codigo: 'confirmar' });
    const { ajustes } = almacen.leerEstado();
    return ejecutar(id, async (cancelado) => {
      const c = clienteYouTube();
      const avisos = [];
      const pasos = { ...(st0.youtube ?? {}) };
      const guardarPasos = () => marcar(id, { youtube: { ...pasos } });
      if (!pasos.videoId) {
        progreso(id, 'Subiendo el vídeo', 0);
        const pedido = yt.recursoVideo({
          titulo: util.tituloYouTube(pub.titulo),
          descripcion: util.descripcionYouTube(pub.texto),
          etiquetas: pub.etiquetas,
          categoria: ajustes.youtube.categoria,
          publishAt: modo.publishAt,
          sintetico: ajustes.youtube.sintetico,
        });
        const r = await c.subirVideo({ ruta: rutaVideo, recurso: pedido, alProgreso: (p) => progreso(id, 'Subiendo el vídeo', p), cancelado });
        Object.assign(pasos, { videoId: r.id, publishAt: modo.publishAt, privado: prog.quedoPrivado({ publishAt: modo.publishAt }, r.estado) });
        guardarPasos();
      }
      if (pasos.privado)
        avisos.push('YouTube dejó el vídeo en PRIVADO. Hasta el 2/11/2026 los proyectos de API no auditados quedaban restringidos a privado; Google retiró esa regla, pero si te pasa: revisa el vídeo en YouTube Studio (derechos de autor, revisión) y, si lo bloquea por la API, pide la auditoría (Ajustes › Redes).');
      if (pub.miniatura && !pasos.miniatura) {
        progreso(id, 'Poniendo la miniatura');
        const f = abs(carpeta, pub.miniatura);
        if (!fs.existsSync(f)) avisos.push(`Falta la miniatura ${pub.miniatura}.`);
        else
          try {
            await c.ponerMiniatura(pasos.videoId, f);
            pasos.miniatura = true;
          } catch (e) {
            avisos.push(`Miniatura: ${e.message}`);
          }
        guardarPasos();
      }
      if (pub.subtitulos && !pasos.subtitulos) {
        progreso(id, 'Subiendo los subtítulos');
        const f = abs(carpeta, pub.subtitulos);
        if (!fs.existsSync(f)) avisos.push(`Faltan los subtítulos ${pub.subtitulos}.`);
        else
          try {
            await c.ponerSubtitulos(pasos.videoId, f, { idioma: ajustes.youtube.subtitulosIdioma || 'es', nombre: 'Español' });
            pasos.subtitulos = true;
          } catch (e) {
            if (e.codigo === 'captionExists') pasos.subtitulos = true;
            else avisos.push(`Subtítulos: ${e.message}`);
          }
        guardarPasos();
      }
      if (pub.lista?.trim() && !pasos.lista) {
        progreso(id, 'Añadiendo a la lista');
        try {
          const l = await c.buscarLista(pub.lista);
          if (!l) avisos.push(`No existe la lista «${pub.lista}» en el canal: no se añadió (créala en YouTube Studio y reintenta).`);
          else {
            await c.anadirALista(l.id, pasos.videoId);
            pasos.lista = l.nombre;
          }
        } catch (e) {
          avisos.push(`Lista: ${e.message}`);
        }
        guardarPasos();
      }
      const programada = !!pasos.publishAt && pasos.publishAt > Date.now();
      const url = `https://youtu.be/${pasos.videoId}`;
      marcar(id, {
        estado: programada ? 'programada' : 'publicada',
        red: 'youtube',
        titulo: pub.titulo,
        instante: pasos.publishAt ?? Date.now(),
        url,
        studio: `https://studio.youtube.com/video/${pasos.videoId}/edit`,
        avisos,
        mensaje: null,
        youtube: pasos,
      });
      return { url, avisos };
    });
  };

  // ——— LinkedIn ———
  const envioLinkedIn = (pub) => ({ titulo: pub.titulo, tipo: pub.tipo, texto: pub.texto, comentario: pub.comentario, alt: pub.alt, video: pub.video, imagenes: pub.imagenes });
  const rutaPdf = (id) => path.join(almacen.carpeta, 'pdf', `${id.replace(/[^\w.-]+/g, '_')}.pdf`);
  const generarPdf = (id, carpeta, imagenes) => carruselAPdf({ BrowserWindow, nativeImage }, imagenes.map((r) => abs(carpeta, r)), rutaPdf(id));

  const publicarLinkedIn = (id, { desdeCola = false } = {}) => {
    const st0 = almacen.leerEstado().publicaciones[id] ?? {};
    if (st0.estado === 'publicada') throw new ErrorPublicar('Ya está publicada en LinkedIn.', { codigo: 'ya_publicada' });
    // en cola se usa lo que se dejó preparado al ponerla en cola; si no, el calendario con lo editado
    let envio;
    let carpeta;
    if (st0.estado === 'en-cola' && st0.envio) {
      envio = st0.envio;
      carpeta = centro();
    } else {
      const b = buscar(id);
      envio = envioLinkedIn(b.pub);
      carpeta = b.carpeta;
    }
    if (!carpeta) throw new ErrorPublicar('No se encuentra el centro de contenido sincronizado.', { codigo: 'sin_centro' });
    validarLinkedIn(envio, carpeta);
    tokenLinkedInSincrono();
    const { ajustes } = almacen.leerEstado();
    return ejecutar(id, async (cancelado) => {
      const c = clienteLinkedIn();
      const autor = secretos().tokens?.linkedin?.cuenta?.urn;
      if (!autor) throw new ErrorPublicar('Falta la identidad de LinkedIn: vuelve a conectar la cuenta.', { codigo: 'reconectar' });
      let media = null;
      let videoListo = true;
      if (envio.tipo === 'imagen') {
        progreso(id, 'Subiendo la imagen');
        const urn = await c.subirImagen(abs(carpeta, envio.imagenes[0]));
        media = { id: urn, ...(envio.alt ? { altText: envio.alt.slice(0, li.LIMITES.alt) } : {}) };
      } else if (envio.tipo === 'documento') {
        progreso(id, 'Creando el PDF del carrusel');
        const pdf = await generarPdf(id, carpeta, envio.imagenes);
        progreso(id, 'Subiendo el documento');
        const urn = await c.subirDocumento(pdf.ruta);
        media = { id: urn, title: envio.titulo.slice(0, 200) };
      } else if (envio.tipo === 'video') {
        progreso(id, 'Subiendo el vídeo', 0);
        const urn = await c.subirVideo(abs(carpeta, envio.video), { alProgreso: (p) => progreso(id, 'Subiendo el vídeo', p), cancelado });
        progreso(id, 'LinkedIn procesa el vídeo');
        videoListo = (await c.esperarVideo(urn)) === 'AVAILABLE';
        media = { id: urn, title: envio.titulo.slice(0, 200) };
      }
      progreso(id, 'Publicando');
      const cuerpo = li.cuerpoPost({ autor, texto: envio.texto, media });
      let urn;
      for (let intento = 1; ; intento++) {
        try {
          urn = await c.crearPost(cuerpo);
          break;
        } catch (e) {
          // vídeo aún procesándose (sin permiso para consultarlo): reintentar un rato
          const procesando = !videoListo && e.estado >= 400 && e.estado < 500 && ![401, 403, 429].includes(e.estado);
          if (!procesando || intento >= 12) throw e;
          progreso(id, 'LinkedIn procesa el vídeo');
          await new Promise((r) => setTimeout(r, 20000));
        }
      }
      const url = li.urlPost(urn);
      marcar(id, { estado: 'publicada', red: 'linkedin', titulo: envio.titulo, url, urn, instante: Date.now(), mensaje: null, avisos: [] });
      const avisos = [];
      if (envio.comentario?.trim() && ajustes.linkedin.primerComentario) {
        progreso(id, 'Primer comentario');
        try {
          await c.comentar(urn, envio.comentario.trim());
        } catch (e) {
          avisos.push(`No se pudo poner el primer comentario (${e.message}). Cópialo y ponlo a mano.`);
        }
      }
      marcar(id, { avisos });
      if (desdeCola) notificar({ titulo: 'Publicado en LinkedIn', cuerpo: envio.titulo });
      return { url, avisos };
    });
  };
  const tokenLinkedInSincrono = () => {
    const t = secretos().tokens?.linkedin;
    if (!t?.access_token) throw new ErrorPublicar('LinkedIn no está conectado: conéctalo en Ajustes › Redes.', { codigo: 'reconectar' });
    if (t.expira && t.expira <= Date.now()) throw new ErrorPublicar('El permiso de LinkedIn caducó (dura 60 días): vuelve a conectar la cuenta en Ajustes › Redes.', { codigo: 'reconectar' });
  };
  /** Archivos presentes y dentro de los límites de LinkedIn antes de empezar. */
  const validarLinkedIn = (envio, carpeta) => {
    const faltan = [...(envio.imagenes ?? []), ...(envio.video ? [envio.video] : [])].filter((r) => !fs.existsSync(abs(carpeta, r)));
    if (faltan.length) throw new ErrorPublicar(`Faltan archivos en el centro de contenido: ${faltan.join(', ')}. Espera a que termine de sincronizar.`, { codigo: 'falta_archivo' });
    if (!envio.texto?.trim() && envio.tipo === 'texto') throw new ErrorPublicar('El texto está vacío.', { codigo: 'texto' });
    if (envio.tipo === 'video') {
      const tam = fs.statSync(abs(carpeta, envio.video)).size;
      if (tam < li.LIMITES.video.min || tam > li.LIMITES.video.max) throw new ErrorPublicar(`El vídeo pesa ${util.tamLegible(tam)}; LinkedIn admite de 75 KB a 500 MB.`, { codigo: 'tam' });
    }
    if (envio.tipo === 'imagen') {
      const { width, height } = nativeImage.createFromPath(abs(carpeta, envio.imagenes[0])).getSize();
      if (width * height >= li.LIMITES.imagenPixeles) throw new ErrorPublicar('La imagen supera los 36 millones de píxeles que admite LinkedIn.', { codigo: 'tam' });
    }
    if (envio.tipo === 'documento' && envio.imagenes.length > li.LIMITES.documento.paginas) throw new ErrorPublicar('LinkedIn admite documentos de hasta 300 páginas.', { codigo: 'tam' });
  };

  const encolar = (id) => {
    const { pub, carpeta } = buscar(id);
    if (pub.red !== 'linkedin') throw new Error('Solo LinkedIn va por la cola.');
    if (pub.instante <= Date.now()) throw new ErrorPublicar('La hora ya pasó: usa «Publicar ahora».', { codigo: 'pasada' });
    validarLinkedIn(envioLinkedIn(pub), carpeta);
    tokenLinkedInSincrono();
    marcar(id, { estado: 'en-cola', instante: pub.instante, envio: envioLinkedIn(pub), mensaje: null });
    actualizarBloqueo();
    return { ok: true };
  };
  const desencolar = (id) => {
    almacen.cambiarEstado((e) => {
      const st = almacen.pub(e, id);
      if (st.estado === 'en-cola') Object.assign(st, { estado: 'pendiente', envio: undefined, instante: undefined });
    });
    actualizarBloqueo();
    return { ok: true };
  };

  // ——— cola: cada 30 s publica lo que vence con la app abierta ———
  const revisarCola = () => {
    const { publicaciones } = almacen.leerEstado();
    for (const [id, st] of Object.entries(publicaciones)) {
      if (!prog.debePublicarSola(st, Date.now(), ARRANQUE) || trabajos.has(id)) continue;
      try {
        publicarLinkedIn(id, { desdeCola: true });
      } catch (e) {
        conError(id, e);
        notificar({ titulo: 'No se pudo publicar en LinkedIn', cuerpo: e.message });
      }
    }
  };
  // el equipo no se suspende mientras haya algo en cola (la pantalla sí puede apagarse)
  const actualizarBloqueo = () => {
    const hay = prog.hayCola(almacen.leerEstado().publicaciones) || trabajos.size > 0;
    if (hay && bloqueo == null) bloqueo = powerSaveBlocker.start('prevent-app-suspension');
    if (!hay && bloqueo != null) {
      powerSaveBlocker.stop(bloqueo);
      bloqueo = null;
    }
  };
  // tras un cierre a mitad de subida, lo que quedó «subiendo» vuelve a su estado anterior con un aviso
  almacen.cambiarEstado((e) => {
    for (const st of Object.values(e.publicaciones))
      if (st.estado === 'subiendo') Object.assign(st, { estado: st.estadoAnterior === 'en-cola' ? 'en-cola' : 'error', mensaje: 'La app se cerró mientras se enviaba. Reintenta.' });
  });
  const reloj = setInterval(revisarCola, 30000);
  reloj.unref?.();
  actualizarBloqueo();

  // ——— lo que ve la interfaz ———
  const estado = () => {
    const { ajustes, publicaciones: est } = almacen.leerEstado();
    const { carpeta, lista, zona, conTextos } = todas();
    const ahora = Date.now();
    return {
      escritorio: true,
      cifrado: safeStorage.isEncryptionAvailable(),
      carpetaCentro: carpeta,
      carpetasBuscadas: cal.carpetasCentro(home, ajustes.carpetaCentro),
      conTextos: !!conTextos,
      zona,
      ajustes,
      cuentas: resumenSecretos(secretos()),
      redireccionLinkedIn: oauth.redireccionLinkedIn(ajustes.linkedin.puerto),
      arranque: ARRANQUE,
      atrasadasCola: prog.atrasadasEnCola(est, ARRANQUE),
      publicaciones: lista.map((p) => {
        const st = est[p.id] ?? {};
        const conEd = prog.conEdiciones(p, st.ediciones);
        return {
          ...conEd,
          original: { titulo: p.titulo, texto: p.texto, comentario: p.comentario, lista: p.lista },
          estado: prog.estadoVisible(st, p.instante, ahora),
          url: st.url ?? null,
          studio: st.studio ?? null,
          mensaje: st.mensaje ?? null,
          avisos: st.avisos ?? [],
          enCola: st.estado === 'en-cola' ? st.instante : null,
          subidoYa: !!st.youtube?.videoId,
          trabajo: trabajos.has(p.id) ? { etapa: trabajos.get(p.id).etapa, progreso: trabajos.get(p.id).progreso } : null,
        };
      }),
      // publicadas/programadas recientes (ya no salen en la lista del calendario)
      hechas: Object.entries(est)
        .filter(([, st]) => ['publicada', 'programada'].includes(st.estado))
        .map(([id, st]) => ({ id, red: st.red ?? null, titulo: st.titulo ?? id, estado: prog.estadoVisible(st, st.instante ?? 0, ahora), url: st.url, studio: st.studio ?? null, instante: st.instante ?? st.actualizada, avisos: st.avisos ?? [] }))
        .sort((a, b) => b.instante - a.instante)
        .slice(0, 40),
    };
  };

  const guardarAjustes = (a) =>
    almacen.cambiarEstado((e) => {
      const x = a ?? {};
      if (typeof x.zonaCalendario === 'string') {
        if (x.zonaCalendario && !util.zonaValida(x.zonaCalendario)) throw new ErrorPublicar(`Zona horaria desconocida: ${x.zonaCalendario}`);
        e.ajustes.zonaCalendario = x.zonaCalendario;
      }
      if (typeof x.zonaVista === 'string' && util.zonaValida(x.zonaVista)) e.ajustes.zonaVista = x.zonaVista;
      if (typeof x.carpetaCentro === 'string') e.ajustes.carpetaCentro = x.carpetaCentro.trim();
      if (x.youtube) {
        const y = x.youtube;
        if (y.categoria && yt.CATEGORIAS[y.categoria]) e.ajustes.youtube.categoria = String(y.categoria);
        if (typeof y.sintetico === 'boolean') e.ajustes.youtube.sintetico = y.sintetico;
        if (y.listas) for (const k of ['largo', 'short']) if (typeof y.listas[k] === 'string') e.ajustes.youtube.listas[k] = y.listas[k].trim();
      }
      if (x.linkedin) {
        const l = x.linkedin;
        if (l.puerto != null) {
          const p = Number(l.puerto);
          if (!Number.isInteger(p) || p < 1024 || p > 65535) throw new ErrorPublicar('El puerto debe ser un número entre 1024 y 65535.');
          e.ajustes.linkedin.puerto = p;
        }
        if (typeof l.version === 'string') {
          if (!/^20\d{4}$/.test(l.version.trim())) throw new ErrorPublicar('La versión de LinkedIn va en formato AAAAMM (p. ej. 202611).');
          e.ajustes.linkedin.version = l.version.trim();
        }
        if (typeof l.primerComentario === 'boolean') e.ajustes.linkedin.primerComentario = l.primerComentario;
      }
    });

  const guardarCredenciales = ({ red, clientId, clientSecret }) => {
    const k = red === 'youtube' ? 'google' : red === 'linkedin' ? 'linkedin' : null;
    if (!k) throw new Error('Red desconocida');
    const sec = String(clientSecret ?? '').trim();
    // ID vacío = mantener el guardado (la interfaz no lo vuelve a enseñar entero)
    const id = String(clientId ?? '').trim() || secretos()[k]?.clientId || '';
    if (!id) throw new ErrorPublicar('Falta el ID de cliente.');
    if (k === 'google' && !/\.apps\.googleusercontent\.com$/.test(id)) throw new ErrorPublicar('El ID de cliente de Google termina en «.apps.googleusercontent.com».');
    almacen.cambiarSecretos((x) => {
      const antes = x[k] ?? {};
      // otro cliente = otros tokens
      if (antes.clientId && antes.clientId !== id && x.tokens) delete x.tokens[k];
      x[k] = { clientId: id, clientSecret: sec || antes.clientSecret || '' };
    });
    if (!secretos()[k]?.clientSecret) throw new ErrorPublicar('Falta el secreto de cliente.');
    return { ok: true };
  };

  /** Operaciones de la interfaz. Los errores llegan como { error, codigo } (nunca con secretos). */
  const manejar = async (op, x = {}) => {
    try {
      switch (op) {
        case 'estado':
          return estado();
        case 'guardar-ajustes':
          guardarAjustes(x.ajustes);
          return estado();
        case 'guardar-credenciales':
          return guardarCredenciales(x);
        case 'borrar-credenciales':
          await desconectar(x.red);
          almacen.cambiarSecretos((s) => void delete s[x.red === 'youtube' ? 'google' : 'linkedin']);
          return { ok: true };
        case 'conectar':
          return { ok: true, cuenta: await conectar(x.red) };
        case 'cancelar-conexion':
          conexion?.cancelar();
          conexion = null;
          return { ok: true };
        case 'desconectar':
          await desconectar(x.red);
          return { ok: true };
        case 'editar':
          almacen.cambiarEstado((e) => {
            const st = almacen.pub(e, x.id);
            st.ediciones = { ...(st.ediciones ?? {}) };
            for (const k of prog.EDITABLES) if (typeof x.cambios?.[k] === 'string') st.ediciones[k] = x.cambios[k];
          });
          return { ok: true };
        case 'restablecer':
          almacen.cambiarEstado((e) => void delete almacen.pub(e, x.id).ediciones);
          return { ok: true };
        case 'youtube-subir':
          return subirYouTube(x.id, { confirmarAhora: !!x.confirmarAhora });
        case 'linkedin-publicar':
          return publicarLinkedIn(x.id);
        case 'linkedin-encolar':
          return encolar(x.id);
        case 'linkedin-desencolar':
          return desencolar(x.id);
        case 'cancelar':
          trabajos.get(x.id)?.cancelar();
          return { ok: true };
        case 'marcar':
          if (!['publicada', 'pendiente'].includes(x.estado)) throw new Error('Estado no válido');
          marcar(x.id, x.estado === 'pendiente' ? { estado: 'pendiente', url: null, mensaje: null, avisos: [], youtube: undefined, envio: undefined, instante: undefined } : { estado: 'publicada', url: x.url || null, instante: Date.now(), manual: true });
          return { ok: true };
        case 'vista-pdf': {
          const { pub, carpeta } = buscar(x.id);
          const r = await generarPdf(x.id, carpeta, pub.imagenes);
          shell.openPath(r.ruta);
          return r;
        }
        case 'listas-youtube':
          return { listas: await clienteYouTube().listas() };
        case 'abrir-url':
          if (!URL_PERMITIDA.test(String(x.url))) throw new Error('Enlace no permitido');
          await shell.openExternal(x.url);
          return { ok: true };
        case 'mostrar-archivo': {
          const c = centro();
          if (!c || !x.rel) return { ok: false };
          shell.showItemInFolder(abs(c, x.rel));
          return { ok: true };
        }
        default:
          throw new Error(`Operación desconocida: ${op}`);
      }
    } catch (e) {
      return { error: e.message, codigo: e.codigo ?? null };
    }
  };

  const cerrar = () => {
    clearInterval(reloj);
    conexion?.cancelar();
    for (const t of trabajos.values()) t.cancelar();
    if (bloqueo != null) powerSaveBlocker.stop(bloqueo);
  };

  return { manejar, cerrar, carpetaCentro: centro };
};

module.exports = { crearPublicar, URL_PERMITIDA };
