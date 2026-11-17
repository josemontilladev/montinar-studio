/** Movimiento y acabado de una escena: cámara (claves con curva, Ken Burns, zoom a un punto), rampas, luz, desenfoque. */
import React from 'react';
import type { Draft } from 'immer';
import { CURVAS, type TEscena, type TToma } from '@contrato/esquema';
import { CURVA_FN, camaraEn } from '@contrato/linea';
import { useEd } from './estado';
import { Campo, Deslizador, Segmentos, Si } from './campos';
import { Ico } from './iconos';

const NOMBRE_CURVA: Record<string, string> = { suave: 'Suave', lineal: 'Lineal', expo: 'Expo', quint: 'Quint', muelle: 'Muelle' };

/** Dibujo pequeño de la curva. */
const MiniCurva: React.FC<{ c: string }> = ({ c }) => {
  const fn = CURVA_FN[c] ?? CURVA_FN.suave;
  const pts = Array.from({ length: 25 }, (_, i) => `${i},${(20 - fn(i / 24) * 16).toFixed(1)}`).join(' ');
  return (
    <svg width={26} height={22} viewBox="-1 0 26 22" style={{ flex: 'none' }}>
      <polyline points={pts} fill="none" stroke="var(--acento)" strokeWidth={1.5} />
    </svg>
  );
};

type Ed = (campo: string, fn: (x: Draft<TEscena>) => void) => void;

/** Cámara: claves (fotograma local, zoom, x, y, curva) y preajustes. */
export const PanelCamara: React.FC<{ e: TEscena; ed: Ed; local: number; fps: number }> = ({ e, ed, local, fps }) => {
  const eligiendo = useEd((s) => s.elegirPunto === e.id);
  const ken = () =>
    ed('camara-ken', (x) => {
      const f1 = Math.max(fps, x.duracion + x.recorte - 2);
      x.camara = [
        { f: x.recorte, curva: 'lineal', zoom: 1, x: 0, y: 0 },
        { f: f1, curva: 'lineal', zoom: 1.12, x: -24, y: -36 },
      ];
    });
  return (
    <div>
      <div className="fila" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        <button className="btn chico" onClick={ken} data-prueba="ken-burns" title="Acercamiento lento y continuo durante toda la escena">
          Ken Burns
        </button>
        <button
          className={`btn chico ${eligiendo ? 'activo' : ''}`}
          data-prueba="zoom-punto"
          title="Haz clic en el visor sobre el punto al que quieres acercarte"
          onClick={() => useEd.setState({ elegirPunto: eligiendo ? null : e.id })}
        >
          <Ico n="lupa" /> {eligiendo ? 'Haz clic en el visor…' : 'Zoom a un punto'}
        </button>
        <button
          className="btn chico"
          onClick={() =>
            ed('camara+', (x) => {
              const f = Math.max(0, local);
              const prev = [...x.camara].sort((a, b) => a.f - b.f).filter((c) => c.f <= f).pop();
              x.camara = x.camara.filter((c) => c.f !== f);
              x.camara.push({ f, curva: 'suave', zoom: prev ? Math.round((prev.zoom + 0.1) * 100) / 100 : x.camara.length ? 1.1 : 1, x: prev?.x ?? 0, y: prev?.y ?? 0 });
              x.camara.sort((a, b) => a.f - b.f);
            })
          }
          data-prueba="camara-clave"
        >
          + Clave
        </button>
        {e.camara.length > 0 && (
          <button className="btn chico" onClick={() => ed('camara0', (x) => void (x.camara = []))}>
            Quitar
          </button>
        )}
      </div>
      {!e.camara.length ? (
        <div className="ayuda">Sin movimiento de cámara.</div>
      ) : (
        <div className="claves">
          <div className="k cab" style={{ gridTemplateColumns: '48px 1fr 1fr 1fr 74px 24px' }}>
            <span>f</span>
            <span>zoom</span>
            <span>x</span>
            <span>y</span>
            <span>curva</span>
            <span />
          </div>
          {e.camara.map((c, k) => (
            <div className="k" key={k} style={{ gridTemplateColumns: '48px 1fr 1fr 1fr 74px 24px' }}>
              <input type="number" value={c.f} onChange={(ev) => ed(`cam${k}f`, (x) => void (x.camara[k].f = Number(ev.target.value)))} />
              <input type="number" step={0.05} value={c.zoom} onChange={(ev) => ed(`cam${k}z`, (x) => void (x.camara[k].zoom = Math.max(0.1, Number(ev.target.value))))} />
              <input type="number" value={Math.round(c.x)} onChange={(ev) => ed(`cam${k}x`, (x) => void (x.camara[k].x = Number(ev.target.value)))} />
              <input type="number" value={Math.round(c.y)} onChange={(ev) => ed(`cam${k}y`, (x) => void (x.camara[k].y = Number(ev.target.value)))} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} title="Curva del tramo que sale de esta clave">
                <MiniCurva c={c.curva ?? 'suave'} />
                <select value={c.curva ?? 'suave'} onChange={(ev) => ed(`cam${k}c`, (x) => void (x.camara[k].curva = ev.target.value as any))} style={{ padding: '2px', fontSize: 11 }} data-prueba={`curva-${k}`}>
                  {CURVAS.map((v) => (
                    <option key={v} value={v}>
                      {NOMBRE_CURVA[v]}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn chico icono" onClick={() => ed('camara-', (x) => void x.camara.splice(k, 1))} title="Quitar">
                <Ico n="cerrar" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Claves de un «zoom a un punto» (px del lienzo): acercar, mantener y volver. */
export const clavesZoomPunto = (f: number, px: number, py: number, ancho: number, alto: number, fps: number, zoom = 1.6) => {
  const tx = -zoom * (px - ancho / 2);
  const ty = -zoom * (py - alto / 2);
  return [
    { f, curva: 'expo' as const, zoom: 1, x: 0, y: 0 },
    { f: f + Math.round(0.6 * fps), curva: 'suave' as const, zoom, x: tx, y: ty },
    { f: f + Math.round(1.8 * fps), curva: 'quint' as const, zoom, x: tx, y: ty },
    { f: f + Math.round(2.5 * fps), curva: 'suave' as const, zoom: 1, x: 0, y: 0 },
  ];
};

/** Rampas de velocidad (nunca por debajo de 1×: no se repiten fotogramas). */
export const rampa = (t: TToma, tipo: 'acelerar' | 'frenar' | 'impulso', s0: number, s1: number): [number, number][] => {
  const v = Math.max(1, t.velocidad || 1);
  const perfil = (u: number) => (tipo === 'acelerar' ? v + (2.5 - v) * u * u : tipo === 'frenar' ? 2.5 - (2.5 - v) * (1 - (1 - u) * (1 - u)) : v + (3 - v) * Math.sin(Math.PI * u) ** 2);
  const n = 8;
  const pts: [number, number][] = [];
  let tt = t.t0 + s0 * v;
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    if (i > 0) {
      const ds = (s1 - s0) / n;
      tt += ds * perfil((i - 0.5) / n);
    }
    pts.push([Math.round(s * 1000) / 1000, Math.round(tt * 1000) / 1000]);
  }
  return pts;
};

/** Acabado: destellos de luz y desenfoque de movimiento. */
export const PanelEfectos: React.FC<{ e: TEscena; ed: Ed }> = ({ e, ed }) => {
  const ef = e.efectos ?? { luz: 'ninguna', intensidad: 0.5, desenfoqueMovimiento: true };
  return (
    <>
      <Campo et="Luz">
        <Segmentos
          v={ef.luz}
          ops={[
            ['ninguna', 'No'],
            ['calida', 'Cálida'],
            ['fria', 'Fría'],
            ['neon', 'Neón'],
          ]}
          on={(v) => ed('luz', (x) => void (x.efectos = { ...ef, luz: v as any }))}
          prueba="efecto-luz"
        />
      </Campo>
      {ef.luz !== 'ninguna' && (
        <Campo et="Intensidad">
          <Deslizador v={ef.intensidad} min={0} max={1} paso={0.05} on={(n) => ed('luz-i', (x) => void (x.efectos = { ...ef, intensidad: n }))} />
        </Campo>
      )}
      <Si v={ef.desenfoqueMovimiento} on={(v) => ed('mb', (x) => void (x.efectos = { ...ef, desenfoqueMovimiento: v }))} et="Desenfoque de movimiento en la cámara" />
    </>
  );
};

/** «Posición y tamaño» al estilo de los editores de escritorio: zoom, X e Y en el cursor, con rombo de fotograma clave. */
export const PanelTransformar: React.FC<{ e: TEscena; ed: Ed; local: number }> = ({ e, ed, local }) => {
  const f = Math.max(0, Math.round(local));
  const c = camaraEn(e.camara, f);
  const enClave = e.camara.some((k) => k.f === f);
  const poner = (campo: 'zoom' | 'x' | 'y', v: number) =>
    ed(`transf-${campo}`, (x) => {
      const cur = camaraEn(x.camara as any, f);
      const base = { f, curva: 'suave' as const, zoom: cur.z, x: cur.x, y: cur.y };
      if (!x.camara.length) {
        x.camara = [{ ...base, f: 0, [campo]: v }];
        return;
      }
      const k = x.camara.find((y) => y.f === f);
      if (k) (k as any)[campo] = v;
      else {
        x.camara.push({ ...base, [campo]: v });
        x.camara.sort((a, b) => a.f - b.f);
      }
    });
  const rombo = () =>
    ed('transf-clave', (x) => {
      if (x.camara.some((k) => k.f === f)) x.camara = x.camara.filter((k) => k.f !== f);
      else {
        x.camara.push({ f, curva: 'suave', zoom: c.z, x: c.x, y: c.y });
        x.camara.sort((a, b) => a.f - b.f);
      }
    });
  const fila = (et: string, campo: 'zoom' | 'x' | 'y', v: number, min: number, max: number, paso: number, suf: string) => (
    <div className="campo" style={{ gridTemplateColumns: '64px 1fr 24px' }}>
      <label>{et}</label>
      <Deslizador v={Math.round(v * 1000) / 1000} min={min} max={max} paso={paso} on={(n) => poner(campo, n)} suf={suf} prueba={`transf-${campo}`} />
      <button className={`btn-r ${enClave ? 'on' : ''}`} title={enClave ? 'Quitar fotograma clave' : 'Añadir fotograma clave en el cursor'} onClick={rombo} data-prueba={`rombo-${campo}`}>
        <Ico n="clave" s={13} fill={enClave} />
      </button>
    </div>
  );
  return (
    <div data-prueba="transformar">
      {fila('Zoom', 'zoom', c.z, 0.5, 3, 0.01, '×')}
      {fila('X', 'x', c.x, -1080, 1080, 1, 'px')}
      {fila('Y', 'y', c.y, -1920, 1920, 1, 'px')}
      <div className="ayuda">
        {e.camara.length ? `${e.camara.length} fotograma(s) clave · el rombo marca/quita una clave en el cursor (f ${f})` : 'Sin claves: el valor se aplica a toda la escena. Pulsa el rombo para animar.'}
      </div>
    </div>
  );
};
