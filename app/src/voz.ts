/** Regenerar la voz de una frase: lanza el trabajo y, al terminar, aplica archivo, duración y palabras (subtítulos). */
import { api, type Trabajo } from './api';
import { useEd } from './estado';

type Pend = { fraseId: string; ajustar: boolean; archivado: string | null };
const pendientes = new Map<string, Pend>();

export const regenerar = async (fraseId: string, ajustar: boolean) => {
  const s = useEd.getState();
  const f = s.proyecto?.voz.frases.find((x) => x.id === fraseId);
  if (!f) return;
  try {
    const r = await api.voz({ id: f.id, texto: f.texto, dicho: f.dicho, voz: f.voz, archivoActual: f.archivo });
    pendientes.set(r.trabajo.id, { fraseId, ajustar, archivado: r.archivado });
    useEd.setState({ trabajos: [r.trabajo, ...useEd.getState().trabajos.filter((t) => t.id !== r.trabajo.id)] });
    s.avisar('Generando la voz… (puedes seguir editando)');
    return r.trabajo.id;
  } catch (e: any) {
    s.avisar(`No se pudo regenerar: ${e.message}`, 'error');
  }
};

export const trabajoDeFrase = (fraseId: string, trabajos: Trabajo[]) => {
  for (const t of trabajos) {
    const p = pendientes.get(t.id);
    if (p && p.fraseId === fraseId) return t;
  }
  return trabajos.find((t) => t.tipo === 'voz' && t.titulo === `Voz · ${fraseId}` && t.estado === 'corriendo');
};

/** Llamar con cada actualización de trabajos: aplica los de voz que acaban de terminar. */
export const aplicarTerminados = (ts: Trabajo[]) => {
  for (const t of ts) {
    const p = pendientes.get(t.id);
    if (!p || t.estado === 'corriendo') continue;
    pendientes.delete(t.id);
    const s = useEd.getState();
    if (t.estado !== 'hecho' || !t.resultado) {
      if (t.estado === 'error') s.avisar(`La voz falló: ${t.error ?? ''}`.slice(0, 180), 'error');
      continue;
    }
    const r = t.resultado as { archivo: string; duracion: number; palabras: { p: string; ini: number; fin: number }[]; texto: string; voz?: string };
    const fps = s.proyecto!.ajustes.fps;
    let delta = 0;
    s.editar('voz-regenerada', (d) => {
      const f = d.voz.frases.find((x) => x.id === p.fraseId);
      if (!f) return;
      // la toma anterior queda en el historial de tomas
      f.tomas.unshift({ archivo: p.archivado ?? f.archivo, duracion: f.duracion, palabras: f.palabras, texto: f.palabras.map((w) => w.p).join(' '), fecha: new Date().toISOString() });
      f.tomas = f.tomas.slice(0, 12);
      delta = Math.round((r.duracion - f.duracion) * fps);
      f.archivo = r.archivo;
      f.duracion = r.duracion;
      f.palabras = r.palabras;
      if (p.ajustar && delta) {
        const e = d.escenas.find((x) => x.id === f.escena);
        if (e) e.duracion = Math.max(1, e.duracion + delta);
      }
    });
    s.avisar(`Voz «${p.fraseId}» lista · ${r.duracion.toFixed(2)} s${p.ajustar && delta ? ` · escena ${delta > 0 ? '+' : ''}${delta} f` : ''}`, 'ok');
  }
};
