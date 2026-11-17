/** Campos pequeños del panel de propiedades: número, sección, botón de icono y color (con la paleta de la marca). */
import { useEffect, useId, useState, type ReactNode } from 'react';
import { C } from '../espejo/parts';

export const PALETA: { name: string; color: string }[] = [
  { name: 'Tinta', color: C.ink },
  { name: 'Fondo', color: C.grey },
  { name: 'Superficie', color: C.white },
  { name: 'Menta', color: C.mint },
  { name: 'Menta suave', color: C.mintSoft },
  { name: 'Verde', color: C.green },
  { name: 'Gris medio', color: C.muted },
  { name: 'Línea', color: C.line },
  { name: 'Gris', color: C.soft },
];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const aPicker = (c: string) => (!HEX.test(c) ? '#000000' : c.length === 4 ? `#${c.slice(1).replace(/./g, '$&$&')}` : c.toLowerCase());
const etiqueta = 'mb-0.5 block text-[0.65rem] font-medium uppercase tracking-wide text-base-content/50';

export function NumberField({ label, value, onChange, step = 1, min, max, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  const id = useId();
  const shown = String(Math.round(value * 100) / 100);
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={etiqueta}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={draft}
          step={step}
          min={min}
          max={max}
          data-campo={label}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = Number.parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max ?? v, Math.max(min ?? v, v)));
          }}
          onBlur={() => setDraft(shown)}
          className={`input input-xs w-full bg-panel3 text-xs tabular-nums ${suffix ? 'pr-6' : ''}`}
        />
        {suffix ? <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.65rem] text-base-content/50">{suffix}</span> : null}
      </div>
    </div>
  );
}

export function Seccion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-b border-base-300 px-3 py-3 last:border-b-0">
      <h3 className="text-[0.7rem] font-semibold uppercase tracking-wide text-base-content/60">{title}</h3>
      {children}
    </section>
  );
}

export function IconButton({ label, onClick, children, active = false, disabled = false }: { label: string; onClick: () => void; children: ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active || undefined} disabled={disabled} onClick={onClick} className={`btn btn-ghost btn-xs btn-square border border-base-300 ${active ? 'border-primary/60 bg-primary/10 text-primary' : ''}`}>
      {children}
    </button>
  );
}

/** Muestras de la marca + selector nativo + hexadecimal. */
export function ColorField({ label, value, onChange, onClear, clearLabel = 'Original' }: { label: string; value: string | undefined; onChange: (c: string) => void; onClear?: () => void; clearLabel?: string }) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  const cur = (value ?? '').toLowerCase();
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 text-xs font-medium text-base-content/70">{label}</legend>
      <div className="flex flex-wrap gap-1">
        {onClear ? (
          <button type="button" onClick={onClear} aria-pressed={value === undefined} className={`h-6 rounded-full border px-2 text-[0.65rem] font-medium ${value === undefined ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-base-content/40'}`}>
            {clearLabel}
          </button>
        ) : null}
        {PALETA.map((s) => (
          <button
            key={s.color}
            type="button"
            title={`${s.name} ${s.color}`}
            aria-label={`${label}: ${s.name}`}
            aria-pressed={cur === s.color.toLowerCase()}
            onClick={() => onChange(s.color)}
            className={`size-6 rounded-full border border-base-300 transition hover:scale-110 ${cur === s.color.toLowerCase() ? 'ring-2 ring-primary ring-offset-1 ring-offset-base-100' : ''}`}
            style={{ backgroundColor: s.color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input type="color" aria-label={`${label}: selector de color`} value={aPicker(value ?? '')} onChange={(e) => onChange(e.target.value)} className="h-7 w-8 cursor-pointer rounded border border-base-300 bg-transparent p-0.5" />
        <label htmlFor={id} className="sr-only">
          {label} (hex)
        </label>
        <input
          id={id}
          value={draft}
          spellCheck={false}
          placeholder="#212121"
          onChange={(e) => {
            const v = e.target.value.trim();
            setDraft(v);
            if (HEX.test(v)) onChange(v);
          }}
          className="input input-xs w-full bg-panel3 font-mono text-xs"
        />
      </div>
    </fieldset>
  );
}

export function Selector<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="block min-w-0">
      <span className={etiqueta}>{label}</span>
      <select value={String(value)} onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)!.value)} className="select select-xs w-full bg-panel3 text-xs">
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
