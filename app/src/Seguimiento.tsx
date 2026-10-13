/**
 * Seguimiento de movimiento: se marca en el visor la zona a seguir (un recuadro sobre la toma) y OpenCV (CSRT o KCF)
 * la sigue fotograma a fotograma; el texto o la pegatina reciben claves de posición (`seguir`) que luego se pueden
 * corregir arrastrándolos en el visor. Pensado para tomas que llenan el lienzo (ajuste «cubrir»).
 */
import React, { useState } from 'react';
import { tiempoLocal, tiempoToma } from '@contrato/linea';
import { useEd } from './estado';
import type { Trabajo } from './api';
import { Ico } from './iconos';

export type Objetivo = { tipo: 'texto' | 'elemento'; escena: string; id: string; metodo: 'csrt' | 'kcf' };
let zona: Objetivo | null = null;
const oyentes = new Set<(z: Objetivo | null) => void>();
export const pedirZona = (o: Objetivo | null) => {
  zona = o;
  oyentes.forEach((f) => f(o));
};
export const useZona = () => {
  const [z, setZ] = useState(zona);
  React.useEffect(() => {
    oyentes.add(setZ);
    return () => void oyentes.delete(setZ);
  }, []);
  return z;
};

const pendientes = new Map<string, { o: Objetivo; f0: number; map: { s: number; ox: number; oy: number }; c0: [number, number] }>();

/** Ajuste «cubrir» de la toma al lienzo: px del lienzo ↔ px del vídeo. */
const ajuste = (W: number, H: number, vw: number, vh: number) => {
  const s = Math.max(W / vw, H / vh);
  return { s, ox: (W - vw * s) / 2, oy: (H - vh * s) / 2 };
};

export const iniciarSeguimiento = async (o: Objetivo, caja: { x: number; y: number; w: number; h: number }) => {
  const st = useEd.getState();
  const p = st.proyecto!;
  const l = st.linea!;
  const e = p.escenas.find((x) => x.id === o.escena)!;
  const r = l.escenas.find((x) => x.id === o.escena)!;
  const toma = e.tomas[0];
  const m = st.medios.find((x) => x.ruta === toma?.src);
  if (!toma || !m || m.tipo !== 'video' || !m.ancho || !m.alto) return st.avisar('La escena no tiene una toma de vídeo que seguir', 'error');
  const fps = l.fps;
  const item: any = o.tipo === 'texto' ? e.textos.find((x) => x.id === o.id) : e.elementos?.find((x) => x.id === o.id);
  const f0 = Math.max(0, st.frame - r.origen);
  const fin = item?.hasta != null ? tiempoLocal(item.hasta, r.pre, fps, r.frase) : r.finVisible - r.origen;
  const tiempos: number[] = [];
  for (let f = f0; f < Math.max(f0 + 1, fin); f++) tiempos.push(+tiempoToma(toma, (f - r.pre) / fps).toFixed(4));
  const map = ajuste(p.ajustes.ancho, p.ajustes.alto, m.ancho, m.alto);
  const cv = [(caja.x - map.ox) / map.s, (caja.y - map.oy) / map.s, caja.w / map.s, caja.h / map.s];
  const res = await fetch('/api/trabajos/seguimiento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ src: toma.src, tiempos, caja: cv, metodo: o.metodo }) }).then((x) => x.json());
  if (res.error) return st.avisar(res.error, 'error');
  pendientes.set(res.trabajo.id, { o, f0, map, c0: [caja.x + caja.w / 2, caja.y + caja.h / 2] });
  st.avisar(`Siguiendo ${tiempos.length} fotogramas en segundo plano…`);
};

/** Al terminar el trabajo: claves de posición relativas al primer fotograma. */
export const aplicarSeguimiento = (ts: Trabajo[]) => {
  for (const t of ts) {
    const pd = pendientes.get(t.id);
    if (!pd || t.estado === 'corriendo') continue;
    pendientes.delete(t.id);
    const s = useEd.getState();
    if (t.estado !== 'hecho') {
      s.avisar(`Seguimiento: ${t.error ?? t.estado}`, 'error');
      continue;
    }
    const cs: [number, number, number][] = t.resultado.centros;
    const { map, c0, f0, o } = pd;
    const claves = cs
      .map(([cx, cy, ok], k) => (ok ? { f: f0 + k, x: Math.round(cx * map.s + map.ox - c0[0]), y: Math.round(cy * map.s + map.oy - c0[1]) } : null))
      .filter(Boolean) as { f: number; x: number; y: number }[];
    s.editar('seguimiento', (d) => {
      const e = d.escenas.find((x) => x.id === o.escena)!;
      const it: any = o.tipo === 'texto' ? e.textos.find((x) => x.id === o.id) : e.elementos?.find((x) => x.id === o.id);
      if (it) it.seguir = claves;
    });
    const perdidos = cs.filter((c) => !c[2]).length;
    s.avisar(`Seguimiento listo: ${claves.length} claves${perdidos ? ` (${perdidos} fotogramas sin encontrar: se mantiene la última posición)` : ''}`, 'ok');
  }
};

/** Capa del visor para dibujar el recuadro a seguir. */
export const ElegirZona: React.FC<{ k: number }> = ({ k }) => {
  const z = useZona();
  const [r, setR] = useState<null | { x0: number; y0: number; x1: number; y1: number }>(null);
  if (!z) return null;
  const caja = r && { x: Math.min(r.x0, r.x1), y: Math.min(r.y0, r.y1), w: Math.abs(r.x1 - r.x0), h: Math.abs(r.y1 - r.y0) };
  return (
    <div
      className="elegir-zona"
      data-prueba="elegir-zona"
      onPointerDown={(e) => {
        const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = (e.clientX - b.left) / k,
          y = (e.clientY - b.top) / k;
        setR({ x0: x, y0: y, x1: x, y1: y });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!r) return;
        const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setR({ ...r, x1: (e.clientX - b.left) / k, y1: (e.clientY - b.top) / k });
      }}
      onPointerUp={() => {
        if (caja && caja.w > 8 && caja.h > 8) iniciarSeguimiento(z, caja);
        setR(null);
        pedirZona(null);
      }}
    >
      <div className="ayuda-zona">Dibuja un recuadro sobre lo que hay que seguir · Esc cancela</div>
      {caja && <div className="recuadro-zona" style={{ left: caja.x * k, top: caja.y * k, width: caja.w * k, height: caja.h * k }} />}
    </div>
  );
};

/** Sección del inspector (texto o elemento). */
export const SeccionSeguir: React.FC<{ tipo: 'texto' | 'elemento'; escena: string; id: string; claves: number }> = ({ tipo, escena, id, claves }) => {
  const [metodo, setMetodo] = useState<'csrt' | 'kcf'>('csrt');
  const quitar = () =>
    useEd.getState().editar('seguir-0', (d) => {
      const e = d.escenas.find((x) => x.id === escena)!;
      const it: any = tipo === 'texto' ? e.textos.find((x) => x.id === id) : e.elementos?.find((x) => x.id === id);
      if (it) delete it.seguir;
    });
  return (
    <div data-prueba="seguir-movimiento">
      <div className="fila" style={{ gap: 6 }}>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value as any)} style={{ width: 150 }} title="CSRT: más preciso · KCF: más rápido">
          <option value="csrt">CSRT (preciso)</option>
          <option value="kcf">KCF (rápido)</option>
        </select>
        <button className="btn chico" data-prueba="elegir-seguir" onClick={() => (pedirZona({ tipo, escena, id, metodo }), useEd.getState().avisar('Dibuja en el visor el recuadro a seguir (desde el fotograma actual)'))}>
          <Ico n="foco" s={13} /> Elegir zona
        </button>
        {claves > 0 && (
          <button className="btn-r" title="Quitar seguimiento" onClick={quitar}>
            <Ico n="reiniciar" s={13} />
          </button>
        )}
      </div>
      <div className="ayuda">{claves ? `${claves} claves de posición. Arrastra en el visor para corregir la del fotograma actual.` : 'Coloca el cursor donde empieza y marca la zona: el texto o la pegatina la seguirán.'}</div>
    </div>
  );
};
