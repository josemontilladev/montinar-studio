/** Integración con la app de escritorio: progreso en la barra de tareas y avisos de Windows al terminar. */
import type { Trabajo } from './api';
import { useEd } from './estado';

const studio = () => (window as any).studio as { escritorio?: boolean; accion: (a: string, x?: unknown) => Promise<any> } | undefined;
export const enEscritorio = () => !!studio()?.escritorio;
export const accion = (a: string, x?: unknown) => studio()?.accion(a, x) ?? Promise.resolve(null);

const vistos = new Map<string, Trabajo['estado']>();
let ultimoP = -2;

/** Llamar con cada lista de trabajos (SSE). */
export const seguirTrabajos = (ts: Trabajo[]) => {
  const exp = ts.filter((t) => t.tipo === 'exportar');
  const corriendo = exp.filter((t) => t.estado === 'corriendo');
  const p = corriendo.length ? corriendo.reduce((a, t) => a + t.progreso, 0) / corriendo.length : -1;
  if (Math.abs(p - ultimoP) > 0.01 || (p < 0) !== (ultimoP < 0)) {
    ultimoP = p;
    accion('progreso', p);
  }
  for (const t of ts) {
    const antes = vistos.get(t.id);
    vistos.set(t.id, t.estado);
    if (antes !== 'corriendo' || t.estado === 'corriendo') continue;
    if (t.tipo !== 'exportar' && t.tipo !== 'captura' && t.tipo !== 'ia') continue;
    const ok = t.estado === 'hecho';
    const titulo = ok ? `${t.titulo}: listo` : `${t.titulo}: ${t.estado === 'cancelado' ? 'cancelado' : 'error'}`;
    const cuerpo = ok ? (t.resultado?.archivo ? String(t.resultado.archivo).split(/[\/]/).pop() : t.etapa) : (t.error ?? '').slice(0, 120);
    if (enEscritorio()) accion('notificar', { titulo, cuerpo, archivo: ok ? t.resultado?.archivo : null });
    else if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(titulo, { body: cuerpo });
    if (ok && t.tipo === 'exportar') useEd.getState().avisar(`${titulo} · ${cuerpo}`, 'ok');
  }
};
