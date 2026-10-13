/**
 * Quitar silencios y muletillas de la voz en un clic: usa los tiempos por palabra (faster-whisper) y la energía del
 * audio para proponer cortes; se revisan en una lista y se aplican como una toma nueva de cada frase (Ctrl+Z deshace;
 * la toma anterior queda guardada en la frase).
 */
import React, { useRef, useState } from 'react';
import type { TProyecto } from '@contrato/esquema';
import { useEd } from './estado';
import { api } from './api';
import { Ico } from './iconos';

export type Corte = { id: string; frase: string; tipo: 'silencio' | 'muletilla' | 'texto'; desde: number; hasta: number; texto: string; on: boolean };

const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
/** Muletillas que siempre se quitan; «este», «bueno», «pues» y «osea» solo si van aislados entre pausas. */
const SIEMPRE = new Set(['eh', 'ehh', 'ehhh', 'ehm', 'em', 'emm', 'mm', 'mmm', 'mmmm', 'hm', 'hmm', 'ah', 'ahh', 'uh', 'um', 'umm', 'eeh', 'mhm']);
const AISLADAS = new Set(['este', 'bueno', 'pues', 'osea']);

export const buscarCortes = async (p: TProyecto, umbral = 0.45): Promise<Corte[]> => {
  const out: Corte[] = [];
  for (const f of p.voz.frases) {
    if (!f.archivo || !f.palabras.length) continue;
    let picos: number[] = [];
    let ps = 50;
    try {
      const o = await api.ondas(f.archivo);
      picos = o.picos;
      ps = o.picosSeg;
    } catch {
      /* sin audio: solo por tiempos */
    }
    const max = Math.max(0.05, ...picos);
    const silencioso = (a: number, b: number) => {
      const xs = picos.slice(Math.floor(a * ps), Math.ceil(b * ps));
      return !xs.length || Math.max(...xs) < max * 0.12;
    };
    const w = f.palabras;
    const pad = 0.12;
    const hueco = (a: number, b: number, texto: string) => {
      if (b - a >= umbral && silencioso(a + pad, b - pad)) out.push({ id: `${f.id}-s${out.length}`, frase: f.id, tipo: 'silencio', desde: +(a + pad).toFixed(3), hasta: +(b - pad).toFixed(3), texto, on: true });
    };
    hueco(0, w[0].ini, 'silencio al principio');
    for (let i = 0; i < w.length; i++) {
      const n = norm(w[i].p);
      const antes = i > 0 ? w[i].ini - w[i - 1].fin : 1;
      const despues = i < w.length - 1 ? w[i + 1].ini - w[i].fin : 1;
      if (SIEMPRE.has(n) || (AISLADAS.has(n) && antes > 0.15 && despues > 0.15))
        out.push({ id: `${f.id}-m${i}`, frase: f.id, tipo: 'muletilla', desde: +Math.max(0, w[i].ini - 0.02).toFixed(3), hasta: +(w[i].fin + 0.02).toFixed(3), texto: `«${w[i].p}»`, on: true });
      else if (i < w.length - 1) hueco(w[i].fin, w[i + 1].ini, `pausa tras «${w[i].p}»`);
    }
    hueco(w[w.length - 1].fin, f.duracion, 'silencio al final');
  }
  return out;
};

/** Aplica los cortes marcados: una toma nueva por frase, palabras desplazadas y escenas acortadas (todo en un paso de deshacer). */
export const aplicarCortes = async (cortes: Corte[]) => {
  const s = useEd.getState();
  const p = s.proyecto!;
  const fps = p.ajustes.fps;
  const porFrase = new Map<string, Corte[]>();
  for (const c of cortes.filter((x) => x.on)) porFrase.set(c.frase, [...(porFrase.get(c.frase) ?? []), c]);
  const cambios: { id: string; archivo: string; duracion: number; palabras: { p: string; ini: number; fin: number }[]; quitado: number }[] = [];
  for (const [id, cs] of porFrase) {
    const f = p.voz.frases.find((x) => x.id === id)!;
    // tramos a quitar, ordenados y unidos
    const q = cs.map((c) => [c.desde, c.hasta] as [number, number]).sort((a, b) => a[0] - b[0]);
    const unidos: [number, number][] = [];
    for (const r of q) {
      const u = unidos[unidos.length - 1];
      if (u && r[0] <= u[1]) u[1] = Math.max(u[1], r[1]);
      else unidos.push([...r]);
    }
    const quedan: [number, number][] = [];
    let t = 0;
    for (const [a, b] of unidos) {
      if (a > t + 0.01) quedan.push([t, a]);
      t = b;
    }
    if (f.duracion > t + 0.01) quedan.push([t, f.duracion]);
    if (!quedan.length) {
      // se borra la frase entera: se quita y su escena se acorta lo que duraba
      cambios.push({ id, archivo: '', duracion: 0, palabras: [], quitado: f.duracion, borrar: true } as any);
      continue;
    }
    const r = await fetch('/api/voz/recortar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, archivo: f.archivo, quedan }) }).then((x) => x.json());
    if (r.error) throw new Error(r.error);
    const antesDe = (x: number) => unidos.reduce((acc, [a, b]) => acc + (x >= b ? b - a : x > a ? x - a : 0), 0);
    // se van las palabras cuyo centro cae en un tramo quitado
    const dentro = (x: number) => unidos.some(([a, b]) => x >= a && x <= b);
    const palabras = f.palabras
      .filter((w) => !dentro((w.ini + w.fin) / 2))
      .map((w) => ({ ...w, ini: +(w.ini - antesDe(w.ini)).toFixed(3), fin: +(w.fin - antesDe(w.fin)).toFixed(3) }));
    cambios.push({ id, archivo: r.archivo, duracion: +r.duracion.toFixed(3), palabras, quitado: f.duracion - r.duracion, texto: cs.some((c) => c.tipo === 'texto') ? palabras.map((w) => w.p).join(' ') : undefined } as any);
  }
  if (!cambios.length) return { frases: 0, segundos: 0 };
  s.editar('limpiar-voz', (d) => {
    for (const c of cambios) {
      const f = d.voz.frases.find((x) => x.id === c.id)!;
      if ((c as any).borrar) {
        const e = d.escenas.find((x) => x.frase === c.id);
        if (e) e.duracion = Math.max(Math.round(fps * 0.6), e.duracion - Math.round(c.quitado * fps));
        d.voz.frases = d.voz.frases.filter((x) => x.id !== c.id);
        if (e) e.frase = null;
        continue;
      }
      if ((c as any).texto != null) f.texto = (c as any).texto;
      (f as any).tomas = [...((f as any).tomas ?? []), { archivo: f.archivo, duracion: f.duracion, palabras: f.palabras, texto: f.texto, fecha: new Date().toISOString() }];
      f.archivo = c.archivo;
      f.duracion = c.duracion;
      f.palabras = c.palabras as any;
      // la escena de esa frase se acorta lo mismo (las siguientes se desplazan solas)
      const e = d.escenas.find((x) => x.frase === c.id);
      if (e) e.duracion = Math.max(Math.round(fps * 0.6), e.duracion - Math.round(c.quitado * fps));
    }
  });
  return { frases: cambios.length, segundos: cambios.reduce((a, c) => a + c.quitado, 0) };
};

export const PanelLimpiarVoz: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const [umbral, setUmbral] = useState(0.45);
  const [lista, setLista] = useState<Corte[] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const oir = (c: Corte) => {
    const f = p.voz.frases.find((x) => x.id === c.frase);
    if (!f) return;
    audio.current?.pause();
    const a = new Audio(`/${f.archivo}`);
    audio.current = a;
    a.currentTime = Math.max(0, c.desde - 0.6);
    a.play();
    setTimeout(() => a.pause(), (c.hasta - c.desde + 1.2) * 1000);
  };
  const total = (lista ?? []).filter((c) => c.on).reduce((a, c) => a + (c.hasta - c.desde), 0);
  return (
    <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 6 }} data-prueba="limpiar-voz">
      <div className="fila" style={{ gap: 8, fontSize: 11.5, color: 'var(--tenue)' }}>
        <span>Pausas de más de</span>
        <input type="range" min={0.2} max={1.5} step={0.05} value={umbral} onChange={(e) => setUmbral(Number(e.target.value))} style={{ flex: 1 }} />
        <b style={{ color: 'var(--texto)' }}>{umbral.toFixed(2)} s</b>
      </div>
      <button
        className="btn"
        disabled={ocupado}
        data-prueba="buscar-cortes"
        onClick={async () => {
          setOcupado(true);
          setLista(await buscarCortes(p, umbral));
          setOcupado(false);
        }}
      >
        <Ico n="varita" s={14} /> Buscar silencios y muletillas
      </button>
      {lista && (
        <>
          <div className="ayuda">
            {lista.length ? `${lista.length} cortes propuestos · se quitan ${total.toFixed(2)} s. Desmarca los que quieras conservar; ▶ para oírlo.` : 'No hay silencios largos ni muletillas.'}
          </div>
          <div style={{ maxHeight: 260, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {lista.map((c) => (
              <label key={c.id} className="item" style={{ cursor: 'pointer', padding: '3px 6px' }} data-corte={c.tipo}>
                <input type="checkbox" checked={c.on} onChange={(e) => setLista(lista.map((x) => (x.id === c.id ? { ...x, on: e.target.checked } : x)))} />
                <span className={`chip ${c.tipo === 'muletilla' ? 'ancla' : ''}`} style={{ fontSize: 10 }}>
                  {c.tipo}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.frase} · {c.texto} · {(c.hasta - c.desde).toFixed(2)} s
                </span>
                <button className="btn-r" onClick={(e) => (e.preventDefault(), oir(c))} title="Oír">
                  <Ico n="play" s={11} />
                </button>
              </label>
            ))}
          </div>
          {lista.some((c) => c.on) && (
            <button
              className="btn prim"
              disabled={ocupado}
              data-prueba="aplicar-cortes"
              onClick={async () => {
                setOcupado(true);
                try {
                  const r = await aplicarCortes(lista);
                  useEd.getState().avisar(`Voz limpia: ${r.frases} frase(s), −${r.segundos.toFixed(2)} s (Ctrl+Z deshace)`, 'ok');
                  setLista(null);
                } catch (e: any) {
                  useEd.getState().avisar(e.message, 'error');
                }
                setOcupado(false);
              }}
            >
              Quitar {lista.filter((c) => c.on).length} cortes (−{total.toFixed(2)} s)
            </button>
          )}
        </>
      )}
    </div>
  );
};
