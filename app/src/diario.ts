/**
 * Diario de la sesión: cada 3 s se guarda en el servidor cómo está todo (proyecto, posición, selección, vista). Si la
 * app se cierra de golpe, al volver a abrirla se ofrece dejarlo exactamente como estaba.
 */
import type { TProyecto } from '@contrato/esquema';
import { irA, useEd } from './estado';

export type Diario = { abierta: boolean; t: number; proyecto: TProyecto; frame: number; sel: any; pxf: number; formatoVista: string; cerrada?: number };

let ultimo = '';
let timer: ReturnType<typeof setInterval> | undefined;

export const leerDiario = (): Promise<Diario | null> =>
  fetch('/api/diario', { cache: 'no-store' })
    .then((r) => r.json())
    .catch(() => null);

const escribir = () => {
  const s = useEd.getState();
  if (!s.proyecto) return;
  const d = { proyecto: s.proyecto, frame: s.frame, sel: s.sel, pxf: s.pxf, formatoVista: s.formatoVista };
  const k = `${s.frame}|${JSON.stringify(s.sel)}|${s.pxf}|${s.formatoVista}`;
  // el proyecto se compara por referencia (inmutable): solo se envía si algo cambió
  const clave = `${k}|${(s.proyecto as any).__n ?? ''}`;
  if (clave === ultimo && ultimoProyecto === s.proyecto) return;
  ultimo = clave;
  ultimoProyecto = s.proyecto;
  fetch('/api/diario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).catch(() => {});
};
let ultimoProyecto: TProyecto | null = null;

export const cerrarDiario = () => {
  try {
    navigator.sendBeacon('/api/diario/cerrar', 'fin');
  } catch {
    fetch('/api/diario/cerrar', { method: 'POST', keepalive: true }).catch(() => {});
  }
};

export const iniciarDiario = () => {
  escribir();
  timer = setInterval(escribir, 3000);
  window.addEventListener('pagehide', cerrarDiario);
  return () => clearInterval(timer);
};

/** ¿La sesión anterior se cerró de forma inesperada? (con margen por si hay otra pestaña abierta ahora mismo) */
export const sesionRota = (d: Diario | null) => !!d && d.abierta && Date.now() - d.t > 8000 && !!d.proyecto;

export const restaurarDiario = (d: Diario, validar: (x: unknown) => TProyecto) => {
  const s = useEd.getState();
  if (JSON.stringify(d.proyecto) !== JSON.stringify(s.proyecto)) s.reemplazar(validar(d.proyecto), 'recuperar-sesion');
  useEd.setState({ sel: d.sel ?? null, pxf: d.pxf || s.pxf, formatoVista: (d.formatoVista as any) || s.formatoVista });
  setTimeout(() => irA(d.frame ?? 0), 300);
};
