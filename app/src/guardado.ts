/** Autoguardado en proyecto.json (1 s después del último cambio) + copia local en el navegador por si falla el servidor. */
import type { TProyecto } from '@contrato/esquema';
import { api } from './api';
import { useEd } from './estado';

let timer: ReturnType<typeof setTimeout> | undefined;
let cadena: Promise<void> = Promise.resolve();
let ultimoEnviado: TProyecto | null = null;
let clave = 'editor-video:respaldo';

const respaldar = (p: TProyecto, guardado: boolean) => {
  try {
    localStorage.setItem(clave, JSON.stringify({ t: Date.now(), guardado, proyecto: p }));
  } catch {
    /* sin espacio: no pasa nada */
  }
};

export const leerRespaldo = (): { t: number; guardado: boolean; proyecto: unknown } | null => {
  try {
    const x = localStorage.getItem(clave);
    return x ? JSON.parse(x) : null;
  } catch {
    return null;
  }
};

export const guardarAhora = (version = false, motivo?: string): Promise<void> => {
  clearTimeout(timer);
  cadena = cadena.then(async () => {
    const p = useEd.getState().proyecto;
    if (!p || (!version && p === ultimoEnviado)) return;
    useEd.setState({ guardado: 'guardando' });
    try {
      await api.guardar(p, version, motivo);
      ultimoEnviado = p;
      respaldar(p, true);
      const s = useEd.getState();
      useEd.setState({ guardado: s.proyecto === p ? 'guardado' : 'pendiente', ultimoGuardado: Date.now(), errorGuardado: undefined });
      if (s.proyecto !== p) programar();
    } catch (e: any) {
      useEd.setState({ guardado: 'error', errorGuardado: e.message });
      // reintento
      timer = setTimeout(() => guardarAhora(), 5000);
    }
  });
  return cadena;
};

const programar = () => {
  clearTimeout(timer);
  timer = setTimeout(() => guardarAhora(), 1000);
};

export const iniciarGuardado = (rutaProyecto: string) => {
  clave = `editor-video:respaldo:${rutaProyecto}`;
  ultimoEnviado = useEd.getState().proyecto;
  useEd.subscribe((s, prev) => {
    if (s.proyecto && prev.proyecto && s.proyecto !== prev.proyecto) {
      if (s.guardado !== 'guardando') useEd.setState({ guardado: 'pendiente' });
      respaldar(s.proyecto, false);
      programar();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (useEd.getState().guardado !== 'guardado') {
      guardarAhora();
      e.preventDefault();
    }
  });
};
