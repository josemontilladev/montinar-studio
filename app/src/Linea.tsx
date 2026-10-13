/** Línea de tiempo multipista: Escenas, Textos, Subtítulos, Voz, Música y SFX. */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TEscena, TProyecto, TTexto, TTiempo } from '@contrato/esquema';
import { tiempoLocal, volumenMusica, type Linea as TLinea, type PalabraSub } from '@contrato/linea';
import { borrarPalabra, editarPalabra } from './subtitulos';
import { ctrlPulsado, estaSel, fmtT, irA, nid, seleccionar, useEd, type Sel } from './estado';
import { menuEscena, menuTexto } from './menus';
import { api } from './api';
import { Ico } from './iconos';
import { TRANS_INFO, ponerTransicion, borrarEscena, dividir, duplicarEscena, moverEscena, recortar } from './ops';
import { faltantes, tc } from './Visor';
import { escenaConMedio, insertarEscena, tTomaEn, usarMedio } from './Biblioteca';
import type { EscenaR } from '@contrato/linea';
import type { Medio } from './api';

const H = { regla: 26, escenas: 72, lane: 22, sub: 50, voz: 50, musica: 42, sfx: 32 };

// ——— Ondas ———
const cacheOndas = new Map<string, Promise<number[]>>();
export const useOndas = (src?: string | null) => {
  const [p, setP] = useState<number[] | null>(null);
  useEffect(() => {
    if (!src) return setP(null);
    let ok = true;
    if (!cacheOndas.has(src)) cacheOndas.set(src, api.ondas(src).then((r) => r.picos).catch(() => []));
    cacheOndas.get(src)!.then((x) => ok && setP(x));
    return () => {
      ok = false;
    };
  }, [src]);
  return p;
};

const Onda: React.FC<{ src?: string | null; ancho: number; alto: number; pxf: number; fps: number; desdeSeg?: number; color?: string; picosSeg: number }> = ({ src, ancho, alto, pxf, fps, desdeSeg = 0, color = 'rgba(160,210,255,.75)', picosSeg }) => {
  const picos = useOndas(src);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !picos) return;
    const w = Math.max(1, Math.min(16000, Math.round(ancho)));
    c.width = w;
    c.height = alto;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, w, alto);
    g.fillStyle = color;
    const mid = alto / 2;
    for (let x = 0; x < w; x++) {
      const t0 = (x / pxf) / fps + desdeSeg;
      const t1 = ((x + 1) / pxf) / fps + desdeSeg;
      let m = 0;
      for (let i = Math.floor(t0 * picosSeg); i <= Math.floor(t1 * picosSeg); i++) m = Math.max(m, picos[i] ?? 0);
      const hh = Math.max(0.5, m * (alto - 4) * 0.5);
      g.fillRect(x, mid - hh, 1, hh * 2);
    }
  }, [picos, ancho, alto, pxf, fps, desdeSeg, color, picosSeg]);
  return <canvas ref={ref} />;
};

// ——— Arrastre ———
type Arr = { onMove: (dx: number, e: PointerEvent) => void; onEnd?: (dx: number, movido: boolean, e: PointerEvent) => void; umbral?: number };
const arrastrar = (e: React.PointerEvent, a: Arr) => {
  if (e.button !== 0) return;
  e.stopPropagation();
  const x0 = e.clientX;
  let movido = false;
  const mv = (ev: PointerEvent) => {
    const dx = ev.clientX - x0;
    if (!movido && Math.abs(dx) < (a.umbral ?? 3)) return;
    movido = true;
    a.onMove(dx, ev);
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', mv);
    window.removeEventListener('pointerup', up);
    document.body.style.cursor = '';
    a.onEnd?.(ev.clientX - x0, movido, ev);
  };
  window.addEventListener('pointermove', mv);
  window.addEventListener('pointerup', up);
};

const limpio = (t: string) => t.replace(/\*/g, '').replace(/\s*\/\s*/g, ' ');
const igualSel = (a: Sel | null, b: Sel) => !!a && JSON.stringify(a) === JSON.stringify(b);

/** Candidatos de imán: cabezal, cortes, frases, textos y palabras. */
const candidatos = (l: TLinea, frame: number) => {
  const c = [frame, 0, l.total];
  l.escenas.forEach((e) => c.push(e.inicio, e.fin));
  l.frases.forEach((f) => {
    c.push(f.inicio, f.fin);
    f.palabrasAbs.forEach((w) => c.push(Math.round(w.ini * l.fps)));
  });
  l.textos.forEach((t) => c.push(t.inicio, t.fin));
  l.sfx.forEach((s) => c.push(s.inicio));
  const m = useEd.getState().proyecto?.musica;
  m?.beats.forEach((b) => c.push(Math.round((b - m.inicio) * l.fps)));
  return c;
};

// ——— Componente ———

export const Linea: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const sel = useEd((s) => s.sel);
  const pxf = useEd((s) => s.pxf);
  const iman = useEd((s) => s.iman);
  const medios = useEd((s) => s.medios);
  const picosSeg = useEd((s) => s.picosSeg);
  const editar = useEd((s) => s.editar);
  const fps = l.fps;
  const pistas = useRef<HTMLDivElement>(null);
  const cabs = useRef<HTMLDivElement>(null);
  const [fantasma, setFantasma] = useState<null | { id: string; x: number; w: number; ins: number }>(null);
  const [soltar, setSoltar] = useState(false);
  const [menuH, setMenuH] = useState(false);
  const herramienta = useEd((s) => s.herramienta);
  const setHerramienta = (h: 'seleccion' | 'cuchilla') => useEd.setState({ herramienta: h });
  const bloqueadas = useEd((s) => s.bloqueadas);
  const [pop, setPop] = useState<null | { id: string; x: number; y: number }>(null);
  const [guia, setGuia] = useState<number | null>(null);
  const faltan = useMemo(() => new Set(faltantes(p, medios)), [p, medios]);

  const multi = useEd((s) => s.multi);
  const sel_ = (s: Sel) => seleccionar(s);
  const enSel = (x: Sel) => estaSel({ sel, multi }, x);
  const X = (f: number) => f * pxf;
  const ancho = (l.total + 240) * pxf;

  /** Ajusta f al candidato más cercano (≤ 8 px) si el imán está activo. */
  const ajustar = useCallback(
    (f: number, excluir: number[] = []) => {
      if (!useEd.getState().iman) return { f, g: null as number | null };
      const cs = candidatos(useEd.getState().linea!, useEd.getState().frame).filter((c) => !excluir.includes(c));
      let best = f,
        bd = 8 / pxf;
      for (const c of cs)
        if (Math.abs(c - f) < bd) {
          bd = Math.abs(c - f);
          best = c;
        }
      return { f: best, g: best !== f || cs.includes(f) ? best : null };
    },
    [pxf],
  );

  // carriles de textos
  const carriles = useMemo(() => {
    const ts = l.textos.map((t, i) => ({ ...t, i })).sort((a, b) => a.inicio - b.inicio);
    const fin: number[] = [];
    const lane = new Map<string, number>();
    for (const t of ts) {
      let k = fin.findIndex((e) => e <= t.inicio);
      if (k < 0) {
        k = fin.length;
        fin.push(0);
      }
      fin[k] = t.fin;
      lane.set(`${t.escena}/${t.texto.id}`, k);
    }
    return { lane, n: Math.max(1, fin.length) };
  }, [l]);
  const hTextos = carriles.n * H.lane + 8;

  const filas: { id: string; nombre: string; ico: string; h: number }[] = [
    { id: 'escenas', nombre: 'Escenas', ico: 'escenas', h: H.escenas },
    { id: 'textos', nombre: 'Textos', ico: 'texto', h: hTextos },
    { id: 'sub', nombre: 'Subtítulos', ico: 'sub', h: H.sub },
    { id: 'voz', nombre: 'Voz', ico: 'voz', h: H.voz },
    { id: 'musica', nombre: 'Música', ico: 'musica', h: H.musica },
    { id: 'sfx', nombre: 'SFX', ico: 'sfx', h: H.sfx },
  ];

  // ——— Escenas: mover, recortar ———
  const onEscena = (e: React.PointerEvent, esc: TEscena, i: number) => {
    if (e.button === 2) return;
    sel_({ tipo: 'escena', id: esc.id });
    if (ctrlPulsado()) return;
    if (useEd.getState().herramienta === 'cuchilla') {
      const rect = pistas.current!.getBoundingClientRect();
      irA((e.clientX - rect.left + pistas.current!.scrollLeft) / pxf);
      accionDividir();
      return;
    }
    if (useEd.getState().bloqueadas.includes('escenas')) return;
    const r = l.escenas[i];
    const rect = pistas.current!.getBoundingClientRect();
    let ins = -1;
    arrastrar(e, {
      umbral: 5,
      onMove: (dx, ev) => {
        const fp = (ev.clientX - rect.left + pistas.current!.scrollLeft) / pxf;
        const resto = l.escenas.filter((x) => x.id !== esc.id);
        ins = resto.findIndex((x) => (x.inicio + x.fin) / 2 > fp);
        if (ins < 0) ins = resto.length;
        setFantasma({ id: esc.id, x: X(r.inicio) + dx, w: X(r.fin - r.inicio), ins });
      },
      onEnd: (_dx, movido) => {
        setFantasma(null);
        if (movido && ins >= 0 && ins !== i) editar('mover-escena', (d) => moverEscena(d, esc.id, ins));
      },
    });
  };

  const onBordeEscena = (e: React.PointerEvent, esc: TEscena, i: number, lado: 'izq' | 'der') => {
    sel_({ tipo: 'escena', id: esc.id });
    if (useEd.getState().bloqueadas.includes('escenas')) return;
    const base = { duracion: esc.duracion, recorte: esc.recorte };
    const r = l.escenas[i];
    const sesion = `drag:recortar-${esc.id}-${nid('')}`;
    document.body.style.cursor = 'ew-resize';
    arrastrar(e, {
      onMove: (dx) => {
        let d = Math.round(dx / pxf);
        if (lado === 'der') {
          const { f, g } = ajustar(r.fin + d, [r.fin]);
          d = f - r.fin;
          setGuia(g);
        } else setGuia(null);
        editar(sesion, (dd) => recortar(dd, esc.id, lado, base, d));
      },
      onEnd: () => setGuia(null),
    });
  };

  // ——— Textos ———
  const localNum = (t: TTiempo, escId: string) => {
    const i = l.escenas.findIndex((x) => x.id === escId);
    const r = l.escenas[i];
    return tiempoLocal(t, r.pre, fps, r.frase);
  };
  const onTexto = (e: React.PointerEvent, escId: string, t: TTexto, modo: 'mover' | 'izq' | 'der') => {
    if (e.button === 2) return;
    sel_({ tipo: 'texto', escena: escId, id: t.id });
    if (ctrlPulsado()) return;
    if (useEd.getState().bloqueadas.includes('textos')) return;
    const i = l.escenas.findIndex((x) => x.id === escId);
    const r = l.escenas[i];
    const d0 = localNum(t.desde, escId);
    const h0 = t.hasta == null ? r.finVisible - r.origen : localNum(t.hasta, escId);
    const tiempos0 = t.sincroVoz && r.frase ? r.frase.palabras.map((w) => Math.round(w.ini * fps + r.pre) + (t.sincroVoz?.desfase ?? 0)) : t.tiempos?.map((x) => localNum(x, escId));
    const sesion = `drag:texto-${t.id}-${nid('')}`;
    if (modo !== 'mover') document.body.style.cursor = 'ew-resize';
    arrastrar(e, {
      onMove: (dx) => {
        let d = Math.round(dx / pxf);
        if (modo === 'der') {
          const { f, g } = ajustar(r.origen + h0 + d);
          d = f - (r.origen + h0);
          setGuia(g);
        } else {
          const { f, g } = ajustar(r.origen + d0 + d);
          d = f - (r.origen + d0);
          setGuia(g);
        }
        editar(sesion, (dd) => {
          const tx = dd.escenas.find((x) => x.id === escId)?.textos.find((x) => x.id === t.id);
          if (!tx) return;
          if (modo === 'mover') {
            tx.desde = d0 + d;
            if (t.hasta != null) tx.hasta = h0 + d;
            if (tiempos0) {
              tx.tiempos = tiempos0.map((x) => x + d);
              delete tx.sincroVoz;
            }
          } else if (modo === 'izq') tx.desde = Math.min(h0 - 1, d0 + d);
          else tx.hasta = Math.max(d0 + 1, h0 + d);
        });
      },
      onEnd: () => setGuia(null),
    });
  };

  // ——— Voz y SFX: mover ———
  const onFrase = (e: React.PointerEvent, id: string) => {
    sel_({ tipo: 'frase', id });
    if (useEd.getState().bloqueadas.includes('voz')) return;
    const f = p.voz.frases.find((x) => x.id === id)!;
    const fr = l.frases.find((x) => x.id === id)!;
    const sesion = `drag:voz-${id}-${nid('')}`;
    arrastrar(e, {
      onMove: (dx) => {
        let d = Math.round(dx / pxf);
        const { f: ff, g } = ajustar(fr.inicio + d, [fr.inicio, ...fr.palabrasAbs.map((w) => Math.round(w.ini * fps))]);
        d = ff - fr.inicio;
        setGuia(g);
        editar(sesion, (dd) => {
          const x = dd.voz.frases.find((y) => y.id === id);
          if (x) x.offset = f.offset + d;
        });
      },
      onEnd: () => setGuia(null),
    });
  };
  const onSfx = (e: React.PointerEvent, id: string) => {
    sel_({ tipo: 'sfx', id });
    if (useEd.getState().bloqueadas.includes('sfx')) return;
    const s = p.sfx.find((x) => x.id === id)!;
    const sr = l.sfx.find((x) => x.id === id)!;
    const sesion = `drag:sfx-${id}-${nid('')}`;
    arrastrar(e, {
      onMove: (dx) => {
        let d = Math.round(dx / pxf);
        const { f, g } = ajustar(sr.inicio + d, [sr.inicio]);
        d = f - sr.inicio;
        setGuia(g);
        editar(sesion, (dd) => {
          const x = dd.sfx.find((y) => y.id === id);
          if (x) x.offset = s.offset + d;
        });
      },
      onEnd: () => setGuia(null),
    });
  };

  // ——— Palabras de subtítulo: mover, reajustar y editar ———
  const [editando, setEditando] = useState<null | { k: string; w: PalabraSub; valor: string; x: number; ancho: number }>(null);
  const confirmarPalabra = () => {
    const e = editando;
    if (!e) return;
    setEditando(null);
    const v = e.valor.trim();
    if (v === e.w.p) return;
    const lin = useEd.getState().linea!;
    editar('palabra-texto', (d) => (v ? editarPalabra(d, lin, e.w, { p: v }) : borrarPalabra(d, e.w)));
  };
  const onPalabra = (e: React.PointerEvent, w: PalabraSub, modo: 'mover' | 'izq' | 'der') => {
    sel_({ tipo: 'subtitulos' });
    if (useEd.getState().bloqueadas.includes('sub')) return;
    const sesion = `drag:palabra-${nid('')}`;
    const lin = l;
    if (modo !== 'mover') document.body.style.cursor = 'ew-resize';
    arrastrar(e, {
      onMove: (dx) => {
        const ds = dx / pxf / fps;
        editar(sesion, (d) => {
          if (modo === 'mover') editarPalabra(d, lin, w, { ini: Math.max(0, w.ini + ds), fin: Math.max(0.05, w.fin + ds) });
          else if (modo === 'izq') editarPalabra(d, lin, w, { ini: Math.min(w.fin - 0.04, Math.max(0, w.ini + ds)) });
          else editarPalabra(d, lin, w, { fin: Math.max(w.ini + 0.04, w.fin + ds) });
        });
      },
    });
  };

  // ——— Regla / buscar ———
  const buscar = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const rect = pistas.current!.getBoundingClientRect();
    const f = (cx: number) => (cx - rect.left + pistas.current!.scrollLeft) / pxf;
    irA(f(e.clientX));
    const mv = (ev: PointerEvent) => irA(f(ev.clientX));
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  // marcas de la regla
  const paso = [1, 2, 5, 10, 15, 30, 60, 150, 300, 600, 1800].find((s) => s * pxf >= 64) ?? 1800;
  const marcas: React.ReactNode[] = [];
  for (let f = 0; f <= l.total + 240; f += paso) {
    marcas.push(
      <div key={f} className="marca" style={{ left: X(f) }}>
        {paso < fps && f % fps ? `${f % fps}f` : fmtT(f, fps, false)}
      </div>,
    );
    const menor = paso / 5;
    if (menor * pxf >= 8) for (let k = 1; k < 5; k++) marcas.push(<div key={`${f}-${k}`} className="marca menor" style={{ left: X(f + k * menor) }} />);
  }

  // zoom con Ctrl + rueda (manteniendo el punto bajo el ratón)
  useEffect(() => {
    const el = pistas.current;
    if (!el) return;
    const onW = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const s = useEd.getState();
      const rect = el.getBoundingClientRect();
      const fx = (e.clientX - rect.left + el.scrollLeft) / s.pxf;
      const nuevo = Math.max(0.3, Math.min(16, s.pxf * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      useEd.setState({ pxf: nuevo });
      requestAnimationFrame(() => (el.scrollLeft = fx * nuevo - (e.clientX - rect.left)));
    };
    el.addEventListener('wheel', onW, { passive: false });
    return () => el.removeEventListener('wheel', onW);
  }, []);

  const ajustarZoom = () => {
    const w = pistas.current?.clientWidth ?? 800;
    useEd.setState({ pxf: Math.max(0.3, (w - 40) / l.total) });
  };
  useLayoutEffect(() => {
    // primera vez: que quepa entero
    if (pistas.current && useEd.getState().pxf === 3) ajustarZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trans = pop ? p.escenas.find((e) => e.id === pop.id) : null;

  let y = 0;
  const top: Record<string, number> = {};
  filas.forEach((f) => {
    top[f.id] = y;
    y += f.h;
  });

  return (
    <div className="panel linea" data-prueba="linea">
      <div className="herr">
        <div style={{ position: 'relative', display: 'flex' }}>
          <button className={`btn chico icono ${herramienta === 'cuchilla' ? 'activo' : ''}`} title={herramienta === 'cuchilla' ? 'Cuchilla: clic en un clip para dividirlo (B / A)' : 'Selección (A)'} onClick={() => setHerramienta(herramienta === 'cuchilla' ? 'seleccion' : 'cuchilla')} data-prueba="herramienta">
            <Ico n={herramienta === 'cuchilla' ? 'dividir' : 'cursor'} />
          </button>
          <button className="btn chico icono" style={{ width: 16 }} title="Herramienta" onClick={() => setMenuH(!menuH)}>
            <Ico n="abajo" s={12} />
          </button>
          {menuH && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 79 }} onPointerDown={() => setMenuH(false)} />
              <div className="menu-flot" style={{ position: 'absolute', top: 30, left: 0 }}>
                <button onClick={() => (setHerramienta('seleccion'), setMenuH(false))}>
                  <Ico n="cursor" s={15} /> Selección <kbd>A</kbd>
                </button>
                <button onClick={() => (setHerramienta('cuchilla'), setMenuH(false))}>
                  <Ico n="dividir" s={15} /> Cuchilla <kbd>B</kbd>
                </button>
              </div>
            </>
          )}
        </div>
        <span className="sep" />
        <button className="btn chico icono" title="Deshacer (Ctrl+Z)" disabled={!useEd.getState().pasado.length} onClick={() => useEd.getState().deshacer()}>
          <Ico n="deshacer" />
        </button>
        <button className="btn chico icono" title="Rehacer (Ctrl+Y)" disabled={!useEd.getState().futuro.length} onClick={() => useEd.getState().rehacer()}>
          <Ico n="rehacer" />
        </button>
        <span className="sep" />
        <button className="btn chico icono" title="Dividir en el cursor (S)" data-prueba="dividir" onClick={() => accionDividir()}>
          <Ico n="dividir" />
        </button>
        <button className="btn chico icono" title="Recortar a la izquierda del cursor (Q)" data-prueba="rec-izq" onClick={() => accionRecortar('izq')}>
          <Ico n="recIzq" />
        </button>
        <button className="btn chico icono" title="Recortar a la derecha del cursor (W)" data-prueba="rec-der" onClick={() => accionRecortar('der')}>
          <Ico n="recDer" />
        </button>
        <button className="btn chico icono" title="Borrar (Supr)" onClick={() => accionBorrar()}>
          <Ico n="borrar" />
        </button>
        <button className="btn chico icono" title="Congelar fotograma (1 s)" data-prueba="congelar" onClick={() => accionCongelar()}>
          <Ico n="congelar" />
        </button>
        <button className="btn chico icono" title="Duplicar (Ctrl+D)" onClick={() => accionDuplicar()}>
          <Ico n="duplicar" />
        </button>
        <span className="esp" />
        <span style={{ color: 'var(--tenue)', fontSize: 11.5, marginRight: 6 }}>
          {p.escenas.length} escenas · {(l.total / fps).toFixed(1).replace('.', ',')} s
        </span>
        <button className="btn chico icono" title="Voz de la escena del cursor" onClick={() => {
          const s = useEd.getState();
          const fr = s.linea!.frases.find((f) => s.frame >= f.inicio && s.frame < f.fin) ?? s.linea!.frases.find((f) => f.inicio > s.frame);
          if (fr) useEd.setState({ sel: { tipo: 'frase', id: fr.id } });
        }}>
          <Ico n="voz" />
        </button>
        <span className="sep" />
        <button className={`btn chico icono ${iman ? 'activo' : ''}`} title="Imán: ajustar a cortes, cabezal, palabras y pulsos" onClick={() => useEd.setState({ iman: !iman })} data-prueba="iman">
          <Ico n="iman" />
        </button>
        <button className="btn chico icono" onClick={ajustarZoom} title="Ver todo (ajustar al ancho)">
          <Ico n="foco" />
        </button>
        <span className="sep" />
        <button className="btn chico icono" title="Alejar (−)" onClick={() => useEd.setState({ pxf: Math.max(0.3, pxf / 1.25) })}>
          <Ico n="menos" />
        </button>
        <input type="range" min={Math.log(0.3)} max={Math.log(16)} step={0.01} value={Math.log(pxf)} onChange={(e) => useEd.setState({ pxf: Math.exp(Number(e.target.value)) })} title="Zoom de la línea de tiempo (Ctrl + rueda)" data-prueba="zoom-linea" style={{ ['--p' as any]: `${((Math.log(pxf) - Math.log(0.3)) / (Math.log(16) - Math.log(0.3))) * 100}%` }} />
        <button className="btn chico icono" title="Acercar (+)" onClick={() => useEd.setState({ pxf: Math.min(16, pxf * 1.25) })}>
          <Ico n="mas" />
        </button>
      </div>
      <div className="cuerpo-linea">
        <div className="cabeceras" ref={cabs}>
          <div style={{ height: H.regla, borderBottom: '1px solid var(--borde)' }} />
          {filas.map((f) => (
            <CabeceraPista key={f.id} id={f.id} nombre={f.nombre} ico={f.ico} h={f.h} />
          ))}
        </div>
        <div className="pistas" ref={pistas} onScroll={(e) => cabs.current && (cabs.current.scrollTop = (e.target as HTMLDivElement).scrollTop)}>
          <div style={{ width: ancho, position: 'relative' }}>
            <div className="regla" onPointerDown={buscar} data-prueba="regla">
              {marcas}
            </div>
            <div style={{ position: 'relative' }}>
              {/* Escenas */}
              <div
                className={`pista principal ${soltar ? 'soltar' : ''}`}
                style={{ height: H.escenas }}
                onPointerDown={(e) => e.target === e.currentTarget && buscar(e)}
                data-prueba="pista-escenas"
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.some((t) => t === 'application/x-medio' || t === 'application/x-plantilla')) return;
                  e.preventDefault();
                  setSoltar(true);
                }}
                onDragLeave={() => setSoltar(false)}
                onDrop={(e) => {
                  setSoltar(false);
                  const rect = pistas.current!.getBoundingClientRect();
                  const fp = (e.clientX - rect.left + pistas.current!.scrollLeft) / pxf;
                  const medio = e.dataTransfer.getData('application/x-medio');
                  const pl = e.dataTransfer.getData('application/x-plantilla');
                  if (!medio && !pl) return;
                  e.preventDefault();
                  // sobre una escena con tomas: se cambia su medio; si no, escena nueva en el hueco más cercano
                  const sobre = l.escenas.find((x) => fp >= x.inicio + 4 && fp < x.fin - 4);
                  const escSobre = sobre ? p.escenas.find((x) => x.id === sobre.id) : null;
                  if (medio && escSobre && escSobre.tomas.length) return usarMedio(escSobre.id, JSON.parse(medio).ruta);
                  let idx = l.escenas.findIndex((x) => (x.inicio + x.fin) / 2 > fp);
                  if (idx < 0) idx = l.escenas.length;
                  if (medio) escenaConMedio(JSON.parse(medio), idx);
                  else insertarEscena(pl, {}, idx);
                }}
              >
                {p.escenas.map((esc, i) => {
                  const r = l.escenas[i];
                  const falta = esc.tomas.some((t) => faltan.has(t.src));
                  const on = enSel({ tipo: 'escena', id: esc.id });
                  return (
                    <div
                      key={esc.id}
                      className={`clip escena ${on ? 'on' : ''} ${falta ? 'falta' : ''}`}
                      style={{ left: X(r.inicio), width: Math.max(2, X(esc.duracion) - 1), opacity: fantasma?.id === esc.id ? 0.35 : 1 }}
                      onPointerDown={(e) => onEscena(e, esc, i)}
                      onContextMenu={(e) => (e.preventDefault(), menuEscena(e.clientX, e.clientY, esc.id))}
                      data-escena={esc.id}
                      title={`${esc.nombre || esc.id} · ${esc.plantilla} · ${(esc.duracion / fps).toFixed(2)} s${falta ? ' · ¡falta un medio!' : ''}`}
                    >
                      {esc.transicion.tipo !== 'corte' && esc.transicion.duracion > 0 && <div className="franja-trans" style={{ left: 0, width: X(esc.transicion.duracion) }} />}
                      <div className="chips">
                        {(esc.efectos?.luz && esc.efectos.luz !== 'ninguna') || esc.camara.length ? (
                          <span className="chip-c">
                            <Ico n="efectos" s={11} /> Efectos
                          </span>
                        ) : null}
                        <span className="chip-c">
                          <Ico n="plantillas" s={11} /> {esc.plantilla}
                        </span>
                        <span className="chip-c">{esc.nombre || esc.id}</span>
                        <span className="chip-c">{tc(esc.duracion, fps)}</span>
                      </div>
                      <Tira esc={esc} r={r} ancho={Math.max(2, X(esc.duracion) - 1)} pxf={pxf} fps={fps} medios={medios} />
                      <div className="borde izq" onPointerDown={(e) => onBordeEscena(e, esc, i, 'izq')} data-prueba="borde-izq" />
                      <div className="borde der" onPointerDown={(e) => onBordeEscena(e, esc, i, 'der')} data-prueba="borde-der" />
                    </div>
                  );
                })}
                {p.escenas.map((esc, i) =>
                  i === 0 ? null : (
                    <div
                      key={`tr-${esc.id}`}
                      className={`trans ${esc.transicion.tipo !== 'corte' ? 'con' : ''} ${pop?.id === esc.id ? 'on' : ''}`}
                      style={{ left: X(l.escenas[i].inicio) }}
                      title={`Transición: ${TRANS_INFO[esc.transicion.tipo]?.nombre} · ${esc.transicion.duracion} f`}
                      data-trans={esc.id}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        const rr = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        sel_({ tipo: 'transicion', id: esc.id });
                        setPop({ id: esc.id, x: Math.min(window.innerWidth - 280, rr.left - 120), y: rr.top - 262 });
                      }}
                    >
                      <span>{TRANS_INFO[esc.transicion.tipo]?.icono}</span>
                    </div>
                  ),
                )}
                {fantasma && (
                  <>
                    <div className="clip escena fantasma" style={{ left: fantasma.x, width: fantasma.w }} />
                    <div className="insercion" style={{ left: X(fantasma.ins < l.escenas.filter((x) => x.id !== fantasma.id).length ? l.escenas.filter((x) => x.id !== fantasma.id)[fantasma.ins].inicio : l.total) - 1 }} />
                  </>
                )}
              </div>

              {/* Textos */}
              <div className="pista" style={{ height: hTextos }} onPointerDown={(e) => e.target === e.currentTarget && buscar(e)}>
                {l.textos.map((t) => {
                  const k = carriles.lane.get(`${t.escena}/${t.texto.id}`) ?? 0;
                  const on = enSel({ tipo: 'texto', escena: t.escena, id: t.texto.id });
                  const anclado = typeof t.texto.desde !== 'number' || (t.texto.hasta != null && typeof t.texto.hasta !== 'number');
                  return (
                    <div
                      key={`${t.escena}/${t.texto.id}`}
                      className={`clip texto ${on ? 'on' : ''}`}
                      style={{ left: X(t.inicio), width: Math.max(4, X(t.fin - t.inicio) - 1), top: 4 + k * H.lane, background: t.texto.tipo === 'nota' ? 'linear-gradient(180deg,#6d5a2a,#54451f)' : undefined }}
                      onPointerDown={(e) => onTexto(e, t.escena, t.texto, 'mover')}
                      onContextMenu={(e) => (e.preventDefault(), menuTexto(e.clientX, e.clientY, t.escena, t.texto.id))}
                      title={`${limpio(t.texto.texto)}${anclado ? ' · anclado a palabra' : ''}`}
                      data-texto={`${t.escena}/${t.texto.id}`}
                    >
                      <div className="et">
                        {anclado ? '⚓ ' : ''}
                        {limpio(t.texto.texto)}
                      </div>
                      <div className="borde izq" onPointerDown={(e) => onTexto(e, t.escena, t.texto, 'izq')} />
                      <div className="borde der" onPointerDown={(e) => onTexto(e, t.escena, t.texto, 'der')} />
                    </div>
                  );
                })}
              </div>

              {/* Subtítulos: bloques (arriba) y palabras editables (abajo) */}
              <div className="pista" style={{ height: H.sub, opacity: p.subtitulos.visible ? 1 : 0.4 }} onPointerDown={(e) => e.target === e.currentTarget && buscar(e)} data-prueba="pista-sub">
                {l.bloques.map((b, i) => (
                  <div
                    key={i}
                    className={`clip sub ${sel?.tipo === 'subtitulos' ? 'on' : ''}`}
                    style={{ left: X(b.desde * fps), width: Math.max(3, X((b.hasta - b.desde) * fps) - 1), top: 3, bottom: 'auto', height: 17 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      sel_({ tipo: 'subtitulos' });
                      irA(Math.ceil(b.desde * fps) + 2);
                    }}
                    title={b.palabras.map((w) => w.p).join(' ')}
                  >
                    <div className="et">{b.palabras.map((w) => w.p).join(' ')}</div>
                  </div>
                ))}
                {l.palabrasSub.map((w) => {
                  const k = JSON.stringify(w.ref);
                  const left = X(w.ini * fps);
                  const ancho = Math.max(3, X((w.fin - w.ini) * fps) - 1);
                  return (
                    <div
                      key={k}
                      className="clip palabra"
                      style={{ left, width: ancho }}
                      title={`${w.p} · ${w.ini.toFixed(2)}–${w.fin.toFixed(2)} s (doble clic para editar)`}
                      data-palabra={w.p}
                      onPointerDown={(e) => onPalabra(e, w, 'mover')}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditando({ k, w, valor: w.p, x: left, ancho: Math.max(70, ancho) });
                      }}
                    >
                      <div className="et">{w.p}</div>
                      {ancho >= 16 && <div className="borde izq" onPointerDown={(e) => onPalabra(e, w, 'izq')} />}
                      {ancho >= 16 && <div className="borde der" onPointerDown={(e) => onPalabra(e, w, 'der')} />}
                    </div>
                  );
                })}
                {editando && (
                  <input
                    autoFocus
                    className="edicion-palabra"
                    style={{ left: editando.x, width: editando.ancho }}
                    value={editando.valor}
                    data-prueba="editar-palabra"
                    onChange={(e) => setEditando({ ...editando, valor: e.target.value })}
                    onBlur={() => confirmarPalabra()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') confirmarPalabra();
                      if (e.key === 'Escape') setEditando(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                )}
              </div>

              {/* Voz */}
              <div className="pista" style={{ height: H.voz }} onPointerDown={(e) => e.target === e.currentTarget && buscar(e)}>
                {l.frases.map((f) => {
                  const w = Math.max(4, X(f.fin - f.inicio) - 1);
                  const on = enSel({ tipo: 'frase', id: f.id });
                  return (
                    <div key={f.id} className={`clip voz ${on ? 'on' : ''} ${faltan.has(f.archivo) ? 'falta' : ''}`} style={{ left: X(f.inicio), width: w }} onPointerDown={(e) => onFrase(e, f.id)} title={f.texto} data-frase={f.id}>
                      <Onda src={f.archivo} ancho={w} alto={H.voz - 8} pxf={pxf} fps={fps} picosSeg={picosSeg} />
                      <div className="et">{f.texto}</div>
                    </div>
                  );
                })}
              </div>

              {/* Música */}
              <div className="pista" style={{ height: H.musica }} onPointerDown={(e) => e.target === e.currentTarget && buscar(e)}>
                {p.musica.src && (
                  <div className={`clip musica ${sel?.tipo === 'musica' ? 'on' : ''} ${faltan.has(p.musica.src) ? 'falta' : ''}`} style={{ left: 0, width: X(l.total) - 1 }} onPointerDown={(e) => (e.stopPropagation(), sel_({ tipo: 'musica' }))} data-prueba="musica">
                    <Onda src={p.musica.src} ancho={X(l.total)} alto={H.musica - 8} pxf={pxf} fps={fps} desdeSeg={p.musica.inicio} color="rgba(214,170,255,.55)" picosSeg={picosSeg} />
                    <Envolvente p={p} l={l} pxf={pxf} alto={H.musica - 8} />
                    {p.musica.beats.map((b, i) => {
                      const f = (b - p.musica.inicio) * fps;
                      return f > 0 && f < l.total ? <i key={i} className="pulso" style={{ left: X(f) }} /> : null;
                    })}
                    <div className="et">♪ {p.musica.src.split('/').pop()}</div>
                  </div>
                )}
              </div>

              {/* SFX */}
              <div className="pista" style={{ height: H.sfx }} onPointerDown={(e) => e.target === e.currentTarget && buscar(e)}>
                {l.sfx.map((s) => (
                  <div key={s.id} className={`clip sfx ${enSel({ tipo: 'sfx', id: s.id }) ? 'on' : ''} ${faltan.has(s.src) ? 'falta' : ''}`} style={{ left: X(s.inicio), width: Math.max(6, X(s.duracion) - 1) }} onPointerDown={(e) => onSfx(e, s.id)} title={`${s.id} · ${s.src}`}>
                    <Onda src={s.src} ancho={Math.max(6, X(s.duracion))} alto={H.sfx - 8} pxf={pxf} fps={fps} color="rgba(255,190,170,.6)" picosSeg={picosSeg} />
                    <div className="et">{s.src.split('/').pop()?.replace(/\.\w+$/, '')}</div>
                  </div>
                ))}
              </div>

              {guia != null && <div className="cabezal" style={{ left: X(guia), background: '#7c5cff', opacity: 0.9 }} />}
              <Cabezal pxf={pxf} contenedor={pistas} />
            </div>
          </div>
        </div>
      </div>
      {pop && trans && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onPointerDown={() => setPop(null)} />
          <div className="pop" style={{ left: pop.x, top: Math.max(8, pop.y) }} data-prueba="pop-trans">
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Transición de entrada · {trans.nombre || trans.id}</div>
            <div className="tipos">
              {Object.entries(TRANS_INFO).map(([k, v]) => (
                <button
                  key={k}
                  className={trans.transicion.tipo === k ? 'on' : ''}
                  data-tipo={k}
                  onClick={() =>
                    editar('transicion', (d) => {
                      ponerTransicion(d.escenas.find((x) => x.id === trans.id)! as any, k, d.ajustes.fps);
                    })
                  }
                >
                  <b>{v.icono}</b>
                  {v.nombre}
                </button>
              ))}
            </div>
            <div className="campo">
              <label>Duración</label>
              <div className="fila">
                <input type="range" min={0} max={45} value={trans.transicion.duracion} onChange={(e) => editar('transicion-dur', (d) => void (d.escenas.find((x) => x.id === trans.id)!.transicion.duracion = Number(e.target.value)))} />
                <span style={{ width: 40, textAlign: 'right' }}>{trans.transicion.duracion} f</span>
              </div>
            </div>
            <button className="btn chico" onClick={() => irA(Math.max(0, l.escenas.find((x) => x.id === trans.id)!.inicio - 10))}>
              Ver la transición
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/** Curva de volumen de la música (ducking y fundidos) dibujada sobre su clip. */
const Envolvente: React.FC<{ p: TProyecto; l: TLinea; pxf: number; alto: number }> = ({ p, l, pxf, alto }) => {
  const paso = Math.max(1, Math.round(4 / pxf));
  const pts: string[] = [];
  const max = Math.max(0.05, p.musica.volumen, p.musica.volumenVoz) * 1.15;
  for (let f = 0; f <= l.total; f += paso) pts.push(`${(f * pxf).toFixed(1)},${(alto - (volumenMusica(p, l, f) / max) * (alto - 4) - 2).toFixed(1)}`);
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <polyline points={pts.join(' ')} fill="none" stroke="#f3d27a" strokeWidth={1.5} />
    </svg>
  );
};

const Cabezal: React.FC<{ pxf: number; contenedor: React.RefObject<HTMLDivElement | null> }> = ({ pxf, contenedor }) => {
  const frame = useEd((s) => s.frame);
  const rep = useEd((s) => s.reproduciendo);
  const x = frame * pxf;
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    // seguir al cabezal mientras se reproduce (o si se sale de la vista)
    if (x < el.scrollLeft + 20 || x > el.scrollLeft + el.clientWidth - 40) {
      if (rep || x < el.scrollLeft || x > el.scrollLeft + el.clientWidth) el.scrollLeft = Math.max(0, x - el.clientWidth * (rep ? 0.15 : 0.5));
    }
  }, [x, rep, contenedor]);
  return <div className="cabezal" style={{ left: x, top: -26 }} />;
};

// ——— Acciones (barra y atajos) ———

export const accionDividir = () => {
  const s = useEd.getState();
  if (!s.proyecto || !s.linea) return;
  let nuevo = null as string | null;
  s.editar('dividir', (d) => {
    nuevo = dividir(d, s.linea!, s.frame);
  });
  if (nuevo) {
    useEd.setState({ sel: { tipo: 'escena', id: nuevo } });
    s.avisar('Escena dividida en el cursor', 'ok');
  } else s.avisar('El cursor está en un corte: no hay nada que dividir');
};

export const accionBorrar = () => {
  const s = useEd.getState();
  const sel = s.sel;
  if (!sel || !s.proyecto) return s.avisar('Selecciona algo para borrar');
  if (s.multi.length) {
    // borrado por lotes: textos, elementos y escenas marcados
    const todos = [sel, ...s.multi];
    s.editar('borrar-lote', (d) => {
      for (const x of todos) {
        if (x.tipo === 'texto') {
          const e = d.escenas.find((y) => y.id === x.escena);
          if (e) e.textos = e.textos.filter((t) => t.id !== x.id);
        } else if (x.tipo === 'elemento') {
          const e = d.escenas.find((y) => y.id === x.escena);
          if (e) e.elementos = (e.elementos ?? []).filter((t) => t.id !== x.id);
        } else if (x.tipo === 'sfx') d.sfx = d.sfx.filter((y) => y.id !== x.id);
        else if (x.tipo === 'escena' && d.escenas.length > 1) borrarEscena(d, x.id);
      }
    });
    useEd.setState({ sel: null, multi: [] });
    return s.avisar(`${todos.length} elementos borrados (Ctrl+Z para deshacer)`);
  }
  if (sel.tipo === 'elemento') s.editar('borrar', (d) => {
    const e = d.escenas.find((y) => y.id === sel.escena)!;
    e.elementos = (e.elementos ?? []).filter((t) => t.id !== sel.id);
  });
  else if (sel.tipo === 'escena') {
    let ok = false;
    s.editar('borrar', (d) => {
      ok = borrarEscena(d, sel.id);
    });
    if (!ok) return s.avisar('No se puede borrar la única escena', 'error');
  } else if (sel.tipo === 'texto') s.editar('borrar', (d) => void (d.escenas.find((e) => e.id === sel.escena)!.textos = d.escenas.find((e) => e.id === sel.escena)!.textos.filter((t) => t.id !== sel.id)));
  else if (sel.tipo === 'sfx') s.editar('borrar', (d) => void (d.sfx = d.sfx.filter((x) => x.id !== sel.id)));
  else if (sel.tipo === 'frase') s.editar('borrar', (d) => void (d.voz.frases = d.voz.frases.filter((x) => x.id !== sel.id)));
  else if (sel.tipo === 'transicion') s.editar('borrar', (d) => void (d.escenas.find((e) => e.id === sel.id)!.transicion = { tipo: 'corte', duracion: 0 }));
  else if (sel.tipo === 'musica') s.editar('borrar', (d) => void (d.musica.src = null));
  else return;
  useEd.setState({ sel: null });
  s.avisar('Borrado (Ctrl+Z para deshacer)');
};

export const accionDuplicar = () => {
  const s = useEd.getState();
  const sel = s.sel;
  if (!sel || !s.proyecto || !s.linea) return s.avisar('Selecciona algo para duplicar');
  if (sel.tipo === 'escena') {
    let id = null as string | null;
    s.editar('duplicar', (d) => {
      id = duplicarEscena(d, s.linea!, sel.id);
    });
    if (id) useEd.setState({ sel: { tipo: 'escena', id } });
  } else if (sel.tipo === 'texto') {
    const id = nid('t');
    s.editar('duplicar', (d) => {
      const e = d.escenas.find((x) => x.id === sel.escena)!;
      const t = e.textos.find((x) => x.id === sel.id)!;
      e.textos.push({ ...JSON.parse(JSON.stringify(t)), id, y: t.y + 140 });
    });
    useEd.setState({ sel: { tipo: 'texto', escena: sel.escena, id } });
  } else if (sel.tipo === 'elemento') {
    const id = nid('el');
    s.editar('duplicar', (d) => {
      const e = d.escenas.find((x) => x.id === sel.escena)!;
      const t = (e.elementos ?? []).find((x) => x.id === sel.id)!;
      e.elementos!.push({ ...JSON.parse(JSON.stringify(t)), id, x: t.x + 40, y: t.y + 40 });
    });
    useEd.setState({ sel: { tipo: 'elemento', escena: sel.escena, id } });
  } else if (sel.tipo === 'sfx') {
    const id = nid('sfx-');
    s.editar('duplicar', (d) => {
      const x = d.sfx.find((y) => y.id === sel.id)!;
      d.sfx.push({ ...JSON.parse(JSON.stringify(x)), id, offset: x.offset + 15 });
    });
    useEd.setState({ sel: { tipo: 'sfx', id } });
  }
};

/** Tira de miniaturas de la escena (fotogramas de su toma principal) o un fondo con el nombre de la plantilla. */
const Tira: React.FC<{ esc: TEscena; r: EscenaR; ancho: number; pxf: number; fps: number; medios: Medio[] }> = React.memo(({ esc, r, ancho, pxf, fps, medios }) => {
  const t = esc.tomas[0];
  if (!t?.src || !/\.(mp4|webm|mov|m4v)$/i.test(t.src))
    return (
      <div className="tira">
        <div className="sin">{esc.plantilla}</div>
      </div>
    );
  const m = medios.find((x) => x.ruta === t.src);
  const alto = 46;
  const tw = Math.max(18, Math.round(alto * ((m?.ancho ?? 9) / (m?.alto ?? 16))));
  const n = Math.min(80, Math.max(1, Math.ceil(ancho / tw)));
  const imgs = [];
  for (let i = 0; i < n; i++) {
    const fl = esc.recorte + ((i + 0.5) * tw) / pxf;
    const tt = Math.max(0, Math.round(tTomaEn(esc, r.pre, fps, fl) * 4) / 4);
    imgs.push(<img key={i} src={`/api/miniatura?src=${encodeURIComponent(t.src)}&t=${tt}&h=96`} style={{ width: tw }} alt="" loading="lazy" draggable={false} />);
  }
  return <div className="tira">{imgs}</div>;
});

/** Cabecera de pista: icono, nombre y bloquear / ocultar / silenciar (+ «Portada» en la pista principal). */
const CabeceraPista: React.FC<{ id: string; nombre: string; ico: string; h: number }> = ({ id, nombre, ico, h }) => {
  const bloqueadas = useEd((s) => s.bloqueadas);
  const ocultas = useEd((s) => s.ocultas);
  const p = useEd((s) => s.proyecto)!;
  const bloq = bloqueadas.includes(id);
  const alternar = (k: 'bloqueadas' | 'ocultas') => {
    const v = useEd.getState()[k];
    useEd.setState({ [k]: v.includes(id) ? v.filter((x) => x !== id) : [...v, id] } as any);
  };
  const oculta = id === 'sub' ? !p.subtitulos.visible : id === 'voz' ? p.voz.activa === false : ocultas.includes(id);
  const sonido = id === 'voz' || id === 'musica' || id === 'sfx';
  return (
    <div className="cabecera" style={{ height: h }} data-cabecera={id}>
      <div className="nom" title={nombre}>
        <Ico n={ico} s={14} /> {nombre}
      </div>
      <button className={`btn-r ${bloq ? 'on' : ''}`} title={bloq ? 'Desbloquear pista' : 'Bloquear pista (no se puede mover nada)'} onClick={() => alternar('bloqueadas')}>
        <Ico n={bloq ? 'candado' : 'abierto'} s={13} />
      </button>
      {id !== 'escenas' && <button
        className={`btn-r ${oculta ? 'on' : ''}`}
        title={sonido ? (oculta ? 'Activar sonido' : id === 'voz' ? 'Desactivar la voz (también al exportar)' : 'Silenciar en la vista previa') : oculta ? 'Mostrar' : id === 'sub' ? 'Ocultar subtítulos (también al exportar)' : 'Ocultar en la vista previa'}
        data-prueba={`ver-${id}`}
        onClick={() => {
          const s = useEd.getState();
          if (id === 'sub') s.editar('sub-vis', (d) => void (d.subtitulos.visible = !d.subtitulos.visible));
          else if (id === 'voz') s.editar('voz-activa', (d) => void (d.voz.activa = d.voz.activa === false));
          else alternar('ocultas');
        }}
      >
        <Ico n={sonido ? (oculta ? 'mudo' : 'sfx') : oculta ? 'ojoNo' : 'ojo'} s={13} />
      </button>}
      {id === 'escenas' && (
        <button
          className="portada-btn"
          title="Crear portada (miniatura) con el fotograma del cursor"
          data-prueba="portada-pista"
          onClick={() => useEd.setState({ dialogo: 'exportar' })}
        >
          <Ico n="portada" s={14} />
          Portada
        </button>
      )}
    </div>
  );
};

export const accionRecortar = (lado: 'izq' | 'der') => {
  const s = useEd.getState();
  if (!s.proyecto || !s.linea) return;
  const i = s.linea.escenas.findIndex((e) => s.frame > e.inicio && s.frame < e.fin);
  if (i < 0) return s.avisar('El cursor está en un corte');
  const r = s.linea.escenas[i];
  const k = s.frame - r.inicio;
  s.editar('recortar-cursor', (d) => {
    const e = d.escenas[i];
    if (lado === 'der') e.duracion = k;
    else {
      e.recorte += k;
      e.duracion -= k;
    }
  });
  if (lado === 'izq') irA(r.inicio);
  s.avisar(lado === 'izq' ? 'Recortado el principio hasta el cursor' : 'Recortado el final desde el cursor', 'ok');
};

/** Congelar: divide en el cursor e inserta 1 s con la imagen quieta de las tomas en ese instante. */
export const accionCongelar = () => {
  const s = useEd.getState();
  if (!s.proyecto || !s.linea) return;
  const i = s.linea.escenas.findIndex((e) => s.frame > e.inicio && s.frame < e.fin);
  if (i < 0) return s.avisar('Pon el cursor dentro de una escena');
  const r = s.linea.escenas[i];
  const e0 = s.proyecto.escenas[i];
  if (!e0.tomas.length) return s.avisar('Esa escena no tiene tomas que congelar');
  const fps = s.linea.fps;
  const fl = s.frame - r.origen;
  let nueva = '';
  s.editar('congelar', (d) => {
    const b = dividir(d, s.linea!, s.frame);
    const j = d.escenas.findIndex((x) => x.id === b);
    const base = JSON.parse(JSON.stringify(d.escenas[j])) as TEscena;
    nueva = nid(`${e0.id}-congelado-`);
    const f: TEscena = {
      ...base,
      id: nueva,
      nombre: `${e0.nombre || e0.id} (congelado)`,
      duracion: fps,
      textos: [],
      transicion: { tipo: 'corte', duracion: 0 },
      tomas: base.tomas.map((t) => ({ ...t, curva: undefined, t0: tTomaEn(e0, r.pre, fps, fl), velocidad: 0, desde: undefined, hasta: undefined })),
    };
    d.escenas.splice(j, 0, f as any);
  });
  if (nueva) {
    useEd.setState({ sel: { tipo: 'escena', id: nueva } });
    s.avisar('Fotograma congelado 1 s', 'ok');
  }
};
