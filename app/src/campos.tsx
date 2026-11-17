/** Controles pequeños del inspector. */
import React, { useEffect, useState } from 'react';
import { useEd } from './estado';

export const Campo: React.FC<{ et: string; children: React.ReactNode; col?: boolean; title?: string }> = ({ et, children, col, title }) => (
  <div className={`campo ${col ? 'col' : ''}`} title={title}>
    <label>{et}</label>
    <div>{children}</div>
  </div>
);

/** Número con confirmación al escribir (y flechas). */
export const Num: React.FC<{ v: number | undefined | null; on: (n: number) => void; paso?: number; min?: number; max?: number; suf?: string; vacio?: string; prueba?: string; ancho?: number }> = ({ v, on, paso = 1, min, max, suf, vacio, prueba, ancho }) => {
  const [t, setT] = useState(v == null ? '' : String(v));
  useEffect(() => setT(v == null ? '' : String(Math.round(v * 1000) / 1000)), [v]);
  return (
    <span className="num">
      <input
        type="number"
        value={t}
        step={paso}
        min={min}
        max={max}
        placeholder={vacio}
        data-prueba={prueba}
        style={ancho ? { width: ancho } : undefined}
        onChange={(e) => {
          setT(e.target.value);
          // solo lo que ya está en rango: recortar «1» al mínimo mientras se escribe «150» reescribiría el campo
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(n) && n >= (min ?? -Infinity) && n <= (max ?? Infinity)) on(n);
        }}
        onBlur={() => {
          const n = Number(t);
          if (t !== '' && Number.isFinite(n) && (n < (min ?? -Infinity) || n > (max ?? Infinity))) on(Math.min(max ?? n, Math.max(min ?? n, n)));
          setT(v == null ? '' : String(Math.round(v * 1000) / 1000));
        }}
      />
      {suf && <span>{suf}</span>}
    </span>
  );
};

export const Deslizador: React.FC<{ v: number; on: (n: number) => void; min: number; max: number; paso?: number; suf?: string; prueba?: string }> = ({ v, on, min, max, paso = 1, suf, prueba }) => (
  <div className="fila">
    <input type="range" min={min} max={max} step={paso} value={v} onChange={(e) => on(Number(e.target.value))} data-prueba={prueba} style={{ ['--p' as any]: `${Math.max(0, Math.min(100, ((v - min) / (max - min || 1)) * 100))}%` }} />
    <Num v={v} on={on} paso={paso} min={min} suf={suf} ancho={62} />
  </div>
);

export const Texto: React.FC<{ v: string | undefined; on: (s: string) => void; area?: boolean; prueba?: string; ph?: string }> = ({ v, on, area, prueba, ph }) =>
  area ? <textarea value={v ?? ''} onChange={(e) => on(e.target.value)} data-prueba={prueba} placeholder={ph} rows={3} /> : <input type="text" value={v ?? ''} onChange={(e) => on(e.target.value)} data-prueba={prueba} placeholder={ph} />;

export const Si: React.FC<{ v: boolean; on: (b: boolean) => void; et?: string; prueba?: string }> = ({ v, on, et, prueba }) => (
  <label className="fila" style={{ cursor: 'pointer' }}>
    <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} data-prueba={prueba} />
    {et}
  </label>
);

export const Segmentos: React.FC<{ v: string; ops: [string, string][]; on: (s: string) => void; prueba?: string }> = ({ v, ops, on, prueba }) => (
  <div className="seg" data-prueba={prueba}>
    {ops.map(([k, n]) => (
      <button key={k} className={v === k ? 'on' : ''} onClick={() => on(k)} data-valor={k}>
        {n}
      </button>
    ))}
  </div>
);

/** Color: muestras de la paleta del proyecto + selector libre. Guarda la clave de la paleta o el color CSS. */
export const ColorP: React.FC<{ v: string | undefined; on: (c: string | undefined) => void; ninguno?: boolean }> = ({ v, on, ninguno }) => {
  const paleta = useEd((s) => s.proyecto?.ajustes.paleta ?? {});
  const hex = v ? (paleta[v] ?? v) : '#000000';
  return (
    <div>
      <div className="paleta">
        {ninguno && (
          <span className={`muestra ${!v ? 'on' : ''}`} title="Ninguno" onClick={() => on(undefined)} style={{ background: 'linear-gradient(135deg, transparent 45%, #ff5d5d 45% 55%, transparent 55%), #222' }} />
        )}
        {Object.entries(paleta).map(([k, c]) => (
          <span key={k} className={`muestra ${v === k ? 'on' : ''}`} title={`${k} · ${c}`} style={{ background: c }} onClick={() => on(k)} />
        ))}
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'} onChange={(e) => on(e.target.value)} title="Otro color" />
      </div>
      <div style={{ fontSize: 11, color: 'var(--tenue)', marginTop: 3 }}>{v ? (paleta[v] ? `${v} · ${paleta[v]}` : v) : 'ninguno'}</div>
    </div>
  );
};

/**
 * Cerrar un diálogo al hacer clic en el fondo, solo si el clic EMPEZÓ en el fondo (si se pulsa un botón que abre el
 * diálogo, el soltar no lo vuelve a cerrar).
 */
let pulsadoEnFondo = false;
export const fondoCierra = (cerrar: () => void) => ({
  onPointerDown: (e: React.PointerEvent) => void (pulsadoEnFondo = e.target === e.currentTarget),
  onClick: (e: React.MouseEvent) => {
    if (pulsadoEnFondo && e.target === e.currentTarget) cerrar();
    pulsadoEnFondo = false;
  },
});
