/**
 * Resolución de la línea de tiempo: convierte proyecto.json en posiciones absolutas (fotogramas) de escenas, frases,
 * palabras, textos, efectos y bloques de subtítulos. Lo usan igual la composición Remotion y el editor, así lo que se
 * ve en la línea de tiempo es exactamente lo que se renderiza. Sin dependencias (solo tipos).
 */
import type { TAncla, TClaveCamara, TEscena, TFrase, TPalabra, TProyecto, TSfx, TTexto, TTiempo, TToma } from './esquema';

export type EscenaR = {
  id: string;
  i: number;
  /** primer fotograma visible (corte) */
  inicio: number;
  /** fin del hueco en la pista principal (= inicio de la siguiente) */
  fin: number;
  /** último fotograma + 1 en que aún se ve (incluye la transición de entrada de la siguiente) */
  finVisible: number;
  /** fotograma absoluto del fotograma local 0 (inicio − recorte) */
  origen: number;
  /** fotogramas locales desde el origen hasta s = 0 (inicio de su frase) */
  pre: number;
  frase?: FraseR;
};

export type FraseR = TFrase & { inicio: number; fin: number; inicioSeg: number; palabrasAbs: TPalabra[] };
export type SfxR = TSfx & { inicio: number; fin: number };
export type TextoR = { escena: string; texto: TTexto; inicio: number; fin: number };
export type Bloque = { frase: string; palabras: TPalabra[]; desde: number; hasta: number; /** índices de palabras por línea */ lineas: number[][] };
/** Palabra de subtítulo en tiempo absoluto (s) con su origen, para editarla en la línea de tiempo. */
export type PalabraSub = TPalabra & { ref: { tipo: 'frase'; id: string; i: number } | { tipo: 'pista'; i: number } };

export type Linea = {
  fps: number;
  total: number;
  escenas: EscenaR[];
  frases: FraseR[];
  /** frases cuya escena ya no existe */
  huerfanas: string[];
  sfx: SfxR[];
  textos: TextoR[];
  bloques: Bloque[];
  palabrasSub: PalabraSub[];
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Segundo (relativo al inicio de la frase) en que empieza la n-ésima palabra que contiene `w`; `def` si no está. */
export const palabraEn = (frase: Pick<TFrase, 'palabras'> | undefined, w: string, n = 0, def = 0): number => {
  if (!frase) return def;
  const k = norm(w);
  const hits = frase.palabras.filter((p) => norm(p.p).includes(k));
  const h = hits[n] ?? hits[0];
  return h ? h.ini : def;
};

/** Fotograma local de un instante (número o ancla) para una escena con `pre` y frase. */
export const tiempoLocal = (t: TTiempo, pre: number, fps: number, frase?: Pick<TFrase, 'palabras'>): number => {
  if (typeof t === 'number') return t;
  const a = t as TAncla;
  return Math.round((palabraEn(frase, a.palabra, a.n ?? 0) + (a.seg ?? 0)) * fps + pre) + (a.frames ?? 0);
};

/** Segundo de la toma para s (segundos desde el inicio de la frase de la escena). */
export const tiempoToma = (t: TToma, s: number) => {
  let v: number;
  if (t.curva && t.curva.length >= 2) v = remap(s, t.curva, t.suave ?? 'lin');
  else v = (t.t0 ?? 0) + s * (t.velocidad ?? 1);
  if (t.desde != null) v = Math.max(t.desde, v);
  if (t.hasta != null) v = Math.min(t.hasta, v);
  return v;
};

/** Remapeo por tramos [[s, v], …] con curva suave opcional (fuera de rango sigue a velocidad 1). */
export const remap = (s: number, keys: [number, number][], ease: 'lin' | 'io' = 'lin') => {
  if (s <= keys[0][0]) return keys[0][1] + (s - keys[0][0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [s0, v0] = keys[i];
    const [s1, v1] = keys[i + 1];
    if (s <= s1) {
      const p = (s - s0) / (s1 - s0);
      if (ease !== 'io') return v0 + (v1 - v0) * p;
      // curva suave que nunca baja de 1× de velocidad (si el tramo va de media a ≥ 1×): se mezcla la cúbica con
      // una parte lineal; así una toma a 60 fps no repite fotogramas en los extremos del tramo
      const vel = Math.abs(v1 - v0) / Math.max(1e-6, s1 - s0);
      const m = vel >= 1 ? Math.min(1, 1 / vel) : 0;
      const io = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
      return v0 + (v1 - v0) * (m * p + (1 - m) * io);
    }
  }
  const [sl, vl] = keys[keys.length - 1];
  return vl + (s - sl);
};

const transDur = (e: TEscena | undefined) => (e && e.transicion.tipo !== 'corte' ? e.transicion.duracion : 0);

export const resolverLinea = (p: TProyecto): Linea => {
  const fps = p.ajustes.fps;
  let t = 0;
  const escenas: EscenaR[] = p.escenas.map((e, i) => {
    const r: EscenaR = { id: e.id, i, inicio: t, fin: t + e.duracion, finVisible: t + e.duracion, origen: t - e.recorte, pre: e.preDefecto };
    t += e.duracion;
    return r;
  });
  const total = Math.max(1, t);
  escenas.forEach((r, i) => {
    r.finVisible = Math.min(total, r.fin + transDur(p.escenas[i + 1]));
  });
  const porId = new Map(escenas.map((r) => [r.id, r]));

  const huerfanas: string[] = [];
  const frases: FraseR[] = [];
  for (const f of p.voz.frases) {
    const e = porId.get(f.escena);
    if (!e) {
      huerfanas.push(f.id);
      continue;
    }
    const inicio = e.origen + f.offset;
    const fin = inicio + Math.round(f.duracion * fps);
    frases.push({ ...f, inicio, fin, inicioSeg: inicio / fps, palabrasAbs: f.palabras.map((w) => ({ p: w.p, ini: w.ini + inicio / fps, fin: w.fin + inicio / fps })) });
  }
  frases.sort((a, b) => a.inicio - b.inicio);
  const fraseId = new Map(frases.map((f) => [f.id, f]));

  // pre de cada escena: si su frase está colocada en ella, la distancia real; si no, preDefecto
  p.escenas.forEach((e, i) => {
    const r = escenas[i];
    const f = e.frase ? fraseId.get(e.frase) : undefined;
    r.frase = f;
    if (f && f.escena === e.id) r.pre = f.inicio - r.origen;
  });

  const sfx: SfxR[] = [];
  for (const s of p.sfx) {
    const e = porId.get(s.escena);
    if (!e) continue;
    const local = s.ancla ? tiempoLocal(s.ancla, e.pre, fps, e.frase) : 0;
    const inicio = e.origen + local + s.offset;
    sfx.push({ ...s, inicio, fin: inicio + s.duracion });
  }

  const textos: TextoR[] = [];
  p.escenas.forEach((e, i) => {
    const r = escenas[i];
    for (const tx of e.textos) {
      const a = r.origen + tiempoLocal(tx.desde, r.pre, fps, r.frase);
      const b = tx.hasta == null ? r.finVisible : r.origen + tiempoLocal(tx.hasta, r.pre, fps, r.frase);
      textos.push({ escena: e.id, texto: tx, inicio: Math.max(r.inicio, a), fin: Math.min(r.finVisible, Math.max(a + 1, b)) });
    }
  });

  const palabrasSub = palabrasSubtitulo(p, frases);
  return { fps, total, escenas, frases, huerfanas, sfx, textos, bloques: trocear(p, palabrasSub), palabrasSub };
};

/** Palabras que van a los subtítulos: las de la voz (frases con subtítulos) o las de la pista propia. */
const palabrasSubtitulo = (p: TProyecto, frases: FraseR[]): PalabraSub[] => {
  const fps = p.ajustes.fps;
  if (p.subtitulos.origen === 'pista') {
    const t0 = p.subtitulos.pista.inicio / fps;
    return p.subtitulos.pista.palabras.map((w, i) => ({ p: w.p, ini: w.ini + t0, fin: w.fin + t0, ref: { tipo: 'pista' as const, i } })).sort((a, b) => a.ini - b.ini);
  }
  const out: PalabraSub[] = [];
  for (const f of frases) {
    if (!f.subtitulos) continue;
    f.palabrasAbs.forEach((w, i) => out.push({ ...w, ref: { tipo: 'frase', id: f.id, i } }));
  }
  return out;
};

/** Reparte las palabras de un bloque en líneas de como mucho `max` letras (0 = una línea). */
export const partirLineas = (ws: { p: string }[], max: number): number[][] => {
  if (!max) return [ws.map((_, i) => i)];
  const out: number[][] = [];
  let cur: number[] = [];
  let len = 0;
  ws.forEach((w, i) => {
    const l = w.p.length;
    if (cur.length && len + 1 + l > max) {
      out.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(i);
    len += (cur.length > 1 ? 1 : 0) + l;
  });
  if (cur.length) out.push(cur);
  return out;
};

/** Parte cada frase en bloques legibles (máx. N palabras / letras, cortando en la puntuación). Tiempos en segundos. */
const trocear = (p: TProyecto, ws: PalabraSub[]): Bloque[] => {
  const { maxPalabras, maxLetras, maxLetrasLinea } = p.subtitulos;
  const out: Bloque[] = [];
  const clave = (w: PalabraSub) => (w.ref.tipo === 'frase' ? w.ref.id : 'pista');
  let cur: PalabraSub[] = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({ frase: clave(cur[0]), palabras: cur.map(({ p: pp, ini, fin }) => ({ p: pp, ini, fin })), desde: 0, hasta: 0, lineas: partirLineas(cur, maxLetrasLinea) });
    cur = [];
  };
  ws.forEach((w, i) => {
    cur.push(w);
    const len = cur.map((x) => x.p).join(' ').length;
    const next = ws[i + 1];
    // corte: puntuación, tamaño, cambio de frase o silencio largo
    if (/[.,:;?!]$/.test(w.p) || cur.length >= maxPalabras || !next || clave(next) !== clave(w) || (w.ref.tipo === 'pista' && next.ini - w.fin > 0.7) || len + next.p.length > maxLetras) flush();
  });
  flush();
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    c.desde = c.palabras[0].ini - 0.08;
    const n = out[i + 1];
    const endSelf = c.palabras[c.palabras.length - 1].fin + 0.35;
    c.hasta = n && n.palabras[0].ini - endSelf < 0.6 ? n.palabras[0].ini - 0.08 : endSelf;
  }
  return out;
};

/** Volumen de la música en el fotograma f (ducking bajo la voz + fundidos). */
export const volumenMusica = (p: TProyecto, l: Linea, f: number) => {
  const m = p.musica;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  let base = m.volumen;
  if (m.ducking && p.voz.activa !== false && l.frases.length) {
    let d = 1e9;
    for (const s of l.frases) {
      const a = s.inicio - m.antes;
      const b = s.fin + m.despues;
      d = Math.min(d, f < a ? a - f : f > b ? f - b : 0);
    }
    const duck = 1 - clamp(d / Math.max(1, m.rampa));
    base = m.volumen - (m.volumen - m.volumenVoz) * duck;
  }
  const fadeIn = m.fadeIn > 0 ? m.fadeInDesde + (1 - m.fadeInDesde) * clamp(f / m.fadeIn) : 1;
  const fadeOut = m.fadeOut > 0 ? 1 - clamp((f - (l.total - m.fadeOut)) / (m.fadeOut - 2)) : 1;
  return base * fadeIn * fadeOut;
};

/** Escena (índice) que hay en el fotograma f de la pista principal. */
export const escenaEn = (l: Linea, f: number) => {
  const i = l.escenas.findIndex((e) => f >= e.inicio && f < e.fin);
  return i < 0 ? l.escenas.length - 1 : i;
};

// ——— Curvas de animación (las mismas en el vídeo y en el editor) ———

const bez = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  // Bézier cúbica (como CSS): resolver x(u) = t por Newton y devolver y(u)
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - t;
    const dx = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
    if (Math.abs(dx) < 1e-6) break;
    u = Math.max(0, Math.min(1, u - x / dx));
  }
  return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
};
export const CURVA_FN: Record<string, (t: number) => number> = {
  lineal: (t) => t,
  suave: bez(0.45, 0, 0.2, 1),
  expo: bez(0.16, 1, 0.3, 1),
  quint: bez(0.83, 0, 0.17, 1),
  muelle: (t) => 1 - Math.exp(-6 * t) * Math.cos(9 * t) * (1 - t),
};

/** Cámara en el fotograma local f: zoom, x, y (y la velocidad, para el desenfoque de movimiento). */
export const camaraEn = (claves: TClaveCamara[], f: number) => {
  const ks = [...claves].sort((a, b) => a.f - b.f);
  const at = (ff: number) => {
    if (!ks.length) return { z: 1, x: 0, y: 0 };
    if (ff <= ks[0].f) return { z: ks[0].zoom, x: ks[0].x, y: ks[0].y };
    const j = ks.findIndex((k) => k.f > ff);
    if (j < 0) {
      const k = ks[ks.length - 1];
      return { z: k.zoom, x: k.x, y: k.y };
    }
    const a = ks[j - 1],
      b = ks[j];
    const e = (CURVA_FN[a.curva ?? 'suave'] ?? CURVA_FN.suave)(Math.max(0, Math.min(1, (ff - a.f) / Math.max(1e-6, b.f - a.f))));
    return { z: a.zoom + (b.zoom - a.zoom) * e, x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
  };
  const c = at(f);
  const n = at(f + 1);
  return { ...c, vx: n.x - c.x, vy: n.y - c.y, vz: n.z - c.z };
};

/**
 * Cambia los fps del proyecto conservando los tiempos (todo lo que va en fotogramas se escala; lo que va en segundos
 * —voz, palabras, tomas— no cambia). Devuelve un proyecto nuevo.
 */
export const escalarFps = (p: TProyecto, fps: number): TProyecto => {
  const k = fps / p.ajustes.fps;
  const r = (x: number) => Math.round(x * k);
  const t = (x: TTiempo): TTiempo => (typeof x === 'number' ? r(x) : { ...x, frames: r(x.frames ?? 0) });
  const q: TProyecto = JSON.parse(JSON.stringify(p));
  q.ajustes.fps = fps;
  // duraciones: se redondea el final acumulado para que la suma no derive
  let acc = 0,
    accN = 0;
  for (const e of q.escenas) {
    acc += e.duracion;
    const fin = Math.round(acc * k);
    e.duracion = Math.max(1, fin - accN);
    accN = fin;
    e.recorte = r(e.recorte);
    e.preDefecto = r(e.preDefecto);
    e.transicion.duracion = r(e.transicion.duracion);
    e.camara = e.camara.map((c) => ({ ...c, f: r(c.f) }));
    e.textos = e.textos.map((x) => ({
      ...x,
      desde: t(x.desde),
      hasta: x.hasta == null ? null : t(x.hasta),
      escalonado: x.escalonado * k,
      ...(x.tiempos ? { tiempos: x.tiempos.map(t) } : {}),
      ...(x.sincroVoz ? { sincroVoz: { desfase: r(x.sincroVoz.desfase) } } : {}),
    }));
  }
  q.voz.frases = q.voz.frases.map((f) => ({ ...f, offset: r(f.offset) }));
  q.sfx = q.sfx.map((s) => ({ ...s, duracion: Math.max(1, r(s.duracion)), offset: r(s.offset), ...(s.ancla ? { ancla: { ...s.ancla, frames: r(s.ancla.frames ?? 0) } } : {}) }));
  const m = q.musica;
  Object.assign(m, { antes: r(m.antes), despues: r(m.despues), rampa: Math.max(1, r(m.rampa)), fadeIn: r(m.fadeIn), fadeOut: r(m.fadeOut) });
  q.subtitulos.pista.inicio = r(q.subtitulos.pista.inicio);
  return q;
};

/**
 * Versión sin voz para leer cómodo: alarga cada frase (y su escena) lo necesario para que ningún bloque de subtítulos
 * pase de «cps» caracteres por segundo ni dure menos de «minSeg» segundos. Las palabras se estiran en proporción, así las
 * animaciones ancladas a palabras siguen en su sitio. Devuelve un proyecto nuevo con la voz desactivada.
 */
export const adaptarSinVoz = (p: TProyecto, o: { cps?: number; minSeg?: number; margen?: number } = {}): TProyecto => {
  const cps = o.cps ?? 15,
    minSeg = o.minSeg ?? 1.1,
    margen = o.margen ?? 0.25;
  const q: TProyecto = JSON.parse(JSON.stringify(p));
  q.voz.activa = false;
  const fps = q.ajustes.fps;
  const l = resolverLinea(q);
  for (const f of q.voz.frases) {
    const bs = l.bloques.filter((b) => b.frase === f.id);
    let k = 1;
    for (const b of bs) {
      const n = b.palabras.map((w) => w.p).join(' ').length;
      const d = Math.max(0.05, b.hasta - b.desde);
      k = Math.max(k, n / cps / d, minSeg / d);
    }
    // frases sin subtítulos (p. ej. el gancho, que ya es un titular): basta con que se lea el texto
    if (!bs.length) k = Math.max(1, (f.texto.length / cps + margen) / Math.max(0.3, f.duracion));
    if (k <= 1.001) continue;
    k = Math.min(k, 2.5);
    const vieja = f.duracion;
    f.palabras = f.palabras.map((w) => ({ ...w, ini: Math.round(w.ini * k * 1000) / 1000, fin: Math.round(w.fin * k * 1000) / 1000 }));
    f.duracion = Math.round(vieja * k * 1000) / 1000;
    const e = q.escenas.find((x) => x.id === f.escena);
    if (e) e.duracion += Math.round((f.duracion - vieja) * fps);
  }
  return q;
};

/** Lleva cada corte entre escenas al pulso de la música más cercano (± `tolerancia` s, escenas de al menos 0,5 s). */
export const cortesAlRitmo = (p: TProyecto, tolerancia = 0.3): { proyecto: TProyecto; movidos: number } => {
  const q: TProyecto = JSON.parse(JSON.stringify(p));
  const fps = q.ajustes.fps;
  const bs = q.musica.beats.map((b) => Math.round((b - q.musica.inicio) * fps)).filter((f) => f > 0);
  let movidos = 0;
  if (!bs.length) return { proyecto: q, movidos };
  let acc = 0;
  for (let i = 0; i < q.escenas.length - 1; i++) {
    const e = q.escenas[i];
    const fin = acc + e.duracion;
    const b = bs.reduce((x, y) => (Math.abs(y - fin) < Math.abs(x - fin) ? y : x), bs[0]);
    if (Math.abs(b - fin) <= tolerancia * fps && b - acc >= 0.5 * fps && b !== fin) {
      const d = b - fin;
      e.duracion += d;
      q.escenas[i + 1].duracion = Math.max(1, q.escenas[i + 1].duracion - d);
      movidos++;
    }
    acc += e.duracion;
  }
  return { proyecto: q, movidos };
};
