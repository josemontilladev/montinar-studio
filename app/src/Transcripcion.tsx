/**
 * Edición por texto: la transcripción de toda la voz, frase a frase. Clic en una palabra = ir a ella; arrastrar o
 * Mayús+clic = seleccionar; Supr (o «Cortar») = quitar esas palabras del audio y acortar el vídeo en cadena.
 */
import React, { useMemo, useState } from 'react';
import { irA, reproductor, useEd } from './estado';
import { Ico } from './iconos';
import { aplicarCortes, type Corte } from './LimpiarVoz';

type Ref = { frase: string; i: number };
const clave = (r: Ref) => `${r.frase}:${r.i}`;

export const Transcripcion: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const frame = useEd((s) => s.frame);
  const [ancla, setAncla] = useState<Ref | null>(null);
  const [fin, setFin] = useState<Ref | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const fps = l.fps;
  // orden de lectura: por inicio en el vídeo
  const frases = useMemo(() => [...l.frases].filter((f) => f.palabras.length).sort((a, b) => a.inicio - b.inicio), [l]);
  const orden = useMemo(() => frases.flatMap((f) => f.palabras.map((_, i) => ({ frase: f.id, i }))), [frases]);
  const pos = (r: Ref | null) => (r ? orden.findIndex((x) => x.frase === r.frase && x.i === r.i) : -1);
  const [a, b] = [pos(ancla), pos(fin ?? ancla)].sort((x, y) => x - y);
  const marcadas = new Set(a >= 0 ? orden.slice(a, b + 1).map(clave) : []);
  const t = frame / fps;

  const cortar = async () => {
    if (!marcadas.size) return;
    setOcupado(true);
    try {
      const cs: Corte[] = [];
      for (const f of frases) {
        const idx = f.palabras.map((_, i) => i).filter((i) => marcadas.has(`${f.id}:${i}`));
        if (!idx.length) continue;
        const todas = idx.length === f.palabras.length;
        // tramo desde el final de la palabra anterior hasta el inicio de la siguiente (sin dejar huecos raros)
        const w = f.palabras;
        const grupos: number[][] = [];
        for (const i of idx) {
          const g = grupos[grupos.length - 1];
          if (g && i === g[g.length - 1] + 1) g.push(i);
          else grupos.push([i]);
        }
        for (const g of grupos) {
          const desde = todas ? 0 : g[0] === 0 ? Math.max(0, w[0].ini - 0.05) : (w[g[0] - 1].fin + w[g[0]].ini) / 2;
          const hasta = todas ? f.duracion : g[g.length - 1] === w.length - 1 ? f.duracion : (w[g[g.length - 1]].fin + w[g[g.length - 1] + 1].ini) / 2;
          cs.push({ id: `${f.id}-t${g[0]}`, frase: f.id, tipo: 'texto', desde, hasta, texto: g.map((i) => w[i].p).join(' '), on: true });
        }
      }
      const r = await aplicarCortes(cs);
      setAncla(null);
      setFin(null);
      useEd.getState().avisar(`Cortado: −${r.segundos.toFixed(2)} s en ${r.frases} frase(s) (Ctrl+Z deshace)`, 'ok');
    } catch (e: any) {
      useEd.getState().avisar(e.message, 'error');
    }
    setOcupado(false);
  };

  return (
    <div
      className="scroll transcripcion"
      tabIndex={0}
      data-prueba="transcripcion"
      onKeyDown={(e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && marcadas.size) {
          e.preventDefault();
          e.stopPropagation();
          cortar();
        } else if (e.key === 'Escape') (setAncla(null), setFin(null));
      }}
      onPointerUp={() => setArrastrando(false)}
    >
      <div className="barra-r" style={{ position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1 }}>
        <span className="ayuda" style={{ flex: 1 }}>
          {marcadas.size ? `${marcadas.size} palabra(s) seleccionada(s)` : 'Clic = ir a la palabra · arrastrar o Mayús+clic = seleccionar · Supr = cortar'}
        </span>
        <button className="btn chico" disabled={!marcadas.size || ocupado} onClick={cortar} data-prueba="cortar-texto">
          <Ico n="dividir" s={13} /> Cortar
        </button>
      </div>
      {frases.map((f) => (
        <p key={f.id} className="parrafo-t" data-frase={f.id}>
          <span className="hora-t" onClick={() => irA(f.inicio)}>
            {(f.inicio / fps).toFixed(1)}s
          </span>
          {f.palabras.map((w, i) => {
            const r = { frase: f.id, i };
            const abs0 = f.inicio / fps + w.ini;
            const abs1 = f.inicio / fps + w.fin;
            const ahora = t >= abs0 && t < abs1 + 0.05;
            return (
              <span
                key={i}
                className={`pal-t ${marcadas.has(clave(r)) ? 'sel' : ''} ${ahora ? 'ahora' : ''}`}
                data-palabra={`${f.id}:${i}`}
                onPointerDown={(e) => {
                  if (e.shiftKey && ancla) setFin(r);
                  else {
                    setAncla(r);
                    setFin(null);
                    setArrastrando(true);
                  }
                  reproductor.ref?.pause();
                  irA(Math.round(f.inicio + w.ini * fps));
                }}
                onPointerEnter={() => arrastrando && setFin(r)}
              >
                {w.p}{' '}
              </span>
            );
          })}
        </p>
      ))}
      {!frases.length && <div className="vacio">No hay voz con tiempos por palabra.</div>}
    </div>
  );
};
