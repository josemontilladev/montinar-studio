/**
 * Cola de LinkedIn y estado de cada publicación: reglas puras (pruebas en pruebas/programa.test.cjs).
 * LinkedIn no programa por API: la app publica a la hora si está abierta. Lo que venció con la app cerrada NO se
 * publica solo: al abrirla se pide confirmación.
 */

/** Campos que se pueden editar antes de enviar. */
const EDITABLES = ['titulo', 'texto', 'comentario', 'lista'];

/** Publicación del calendario + textos editados en Studio. */
const conEdiciones = (pub, ediciones) => {
  const out = { ...pub, editada: false };
  for (const k of EDITABLES) {
    if (ediciones && typeof ediciones[k] === 'string' && ediciones[k] !== pub[k]) {
      out[k] = ediciones[k];
      out.editada = true;
    }
  }
  return out;
};

/** ¿Lo publica la cola sola? Solo si su hora llegó con la app abierta (después de arrancar). */
const debePublicarSola = (st, ahora, arranque) => st?.estado === 'en-cola' && typeof st.instante === 'number' && st.instante <= ahora && st.instante > arranque;

/** En cola y vencidas antes de abrir la app: esperan confirmación. */
const atrasadasEnCola = (publicaciones, arranque) =>
  Object.entries(publicaciones)
    .filter(([, st]) => st.estado === 'en-cola' && st.instante <= arranque)
    .map(([id, st]) => ({ id, instante: st.instante, titulo: st.envio?.titulo ?? id }));

/** ¿Hace falta mantener el equipo despierto? (hay algo en cola por publicar) */
const hayCola = (publicaciones) => Object.values(publicaciones).some((st) => st.estado === 'en-cola');

/** Estado que se enseña: pendiente / atrasada / en-cola / subiendo / programada / publicada / error. */
const estadoVisible = (st, instante, ahora) => {
  const e = st?.estado ?? 'pendiente';
  if (e === 'pendiente' && instante < ahora) return 'atrasada';
  // programada en YouTube y ya pasó la hora: YouTube la ha hecho pública
  if (e === 'programada' && st.instante && st.instante <= ahora) return 'publicada';
  return e;
};

/**
 * YouTube: ¿programar (publishAt) o publicar ya? Hace falta un margen: YouTube exige una fecha futura y procesar
 * el vídeo lleva un rato. Si la hora ya pasó (o falta menos del margen) hay que confirmarlo.
 */
const MARGEN_PROGRAMAR = 15 * 60 * 1000;
const modoYouTube = (instante, ahora) => (instante - ahora >= MARGEN_PROGRAMAR ? { modo: 'programar', publishAt: instante } : { modo: 'ahora', publishAt: null });

/** ¿El vídeo quedó en privado sin querer? (YouTube puede bloquearlo: proyecto no auditado, derechos, revisión…) */
const quedoPrivado = (pedido, devuelto) => {
  if (!devuelto) return false;
  if (pedido.publishAt) return devuelto.privacyStatus === 'private' && !devuelto.publishAt;
  return devuelto.privacyStatus === 'private';
};

module.exports = { EDITABLES, conEdiciones, debePublicarSola, atrasadasEnCola, hayCola, estadoVisible, MARGEN_PROGRAMAR, modoYouTube, quedoPrivado };
