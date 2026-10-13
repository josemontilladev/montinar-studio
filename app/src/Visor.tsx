/** Visor: @remotion/player con el componente del proyecto; los cambios del proyecto se ven al instante (inputProps). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { Video } from '@proyecto';
import { FORMATOS, type Formato, type TProyecto } from '@contrato/esquema';
import { escenaEn } from '@contrato/linea';
import { fmtT, irA, reproductor, useEd } from './estado';
import { Ico } from './iconos';
import { api, type Medio } from './api';
import { clavesZoomPunto } from './Movimiento';
import { CapaEdicion } from './CapaEdicion';
import { ElegirZona } from './Seguimiento';

const EXT_MEDIO = /\.(mp4|webm|mov|m4v|png|jpe?g|webp|gif|svg|avif|wav|mp3|m4a|aac|ogg|flac)$/i;

/** Rutas de medios que usa el proyecto (tomas, params, voz, música, efectos). */
export const mediosUsados = (p: TProyecto) => {
  const out = new Set<string>();
  const walk = (x: unknown) => {
    if (typeof x === 'string') {
      if (EXT_MEDIO.test(x) && !x.startsWith('falta:')) out.add(x);
    } else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') Object.values(x).forEach(walk);
  };
  p.escenas.forEach((e) => {
    e.tomas.forEach((t) => out.add(t.src));
    walk(e.params);
  });
  p.voz.frases.forEach((f) => out.add(f.archivo));
  if (p.musica.src) out.add(p.musica.src);
  p.sfx.forEach((s) => out.add(s.src));
  out.delete('');
  return out;
};

export const faltantes = (p: TProyecto | null, medios: Medio[]) => {
  if (!p || !medios.length) return [];
  const hay = new Set(medios.map((m) => m.ruta));
  return [...mediosUsados(p)].filter((r) => !hay.has(r));
};

/** Copia del proyecto con los medios que faltan marcados («falta:…») para que el vídeo muestre un aviso en vez de fallar. */
const marcarFaltantes = (p: TProyecto, medios: Medio[]): TProyecto => {
  const f = new Set(faltantes(p, medios));
  if (!f.size) return p;
  const m = (s: string) => (f.has(s) ? `falta:${s}` : s);
  const walk = (x: any): any => (typeof x === 'string' ? m(x) : Array.isArray(x) ? x.map(walk) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)])) : x);
  return {
    ...p,
    escenas: p.escenas.map((e) => ({ ...e, tomas: e.tomas.map((t) => ({ ...t, src: m(t.src) })), params: walk(e.params) })),
    voz: { ...p.voz, frases: p.voz.frases.map((x) => ({ ...x, archivo: m(x.archivo) })) },
    musica: { ...p.musica, src: p.musica.src ? m(p.musica.src) : null },
    sfx: p.sfx.map((s) => ({ ...s, src: m(s.src) })),
  };
};

/** Vista previa con los proxies listos («__proxy/<src>»: el servidor da la copia ligera). La exportación no los usa. */
const conProxies = (p: TProyecto, px: Record<string, string>): TProyecto => {
  if (!Object.values(px).includes('listo')) return p;
  const m = (s: string) => (px[s] === 'listo' ? `__proxy/${s}` : s);
  const walk = (x: any): any => (typeof x === 'string' ? m(x) : Array.isArray(x) ? x.map(walk) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)])) : x);
  return { ...p, escenas: p.escenas.map((e) => ({ ...e, tomas: e.tomas.map((t) => ({ ...t, src: m(t.src) })), params: walk(e.params) })) };
};

export const dimsFormato = (p: TProyecto, f: Formato) => (f === '9:16' ? { w: p.ajustes.ancho, h: p.ajustes.alto } : { w: FORMATOS[f].ancho, h: FORMATOS[f].alto });

const Zonas: React.FC<{ p: TProyecto; k: number; formato: Formato; w: number; h: number }> = ({ p, k, formato, w, h }) => {
  // las zonas se dibujan sobre el lienzo base (encajado si el formato no es 9:16)
  const bw = p.ajustes.ancho,
    bh = p.ajustes.alto;
  const kk = formato === '9:16' ? 1 : Math.min(w / bw, h / bh);
  const ox = (w - bw * kk) / 2,
    oy = (h - bh * kk) / 2;
  const s = k * kk;
  return (
    <div className="zonas">
      <div className="z" style={{ top: oy * k, height: p.ajustes.zonas.arriba * s, left: ox * k, right: ox * k }}>
        Zona de interfaz · {p.ajustes.zonas.arriba}px
      </div>
      <div className="z" style={{ top: (oy + (bh - p.ajustes.zonas.abajo) * kk) * k, height: p.ajustes.zonas.abajo * s, left: ox * k, right: ox * k }}>
        Zona de interfaz · {p.ajustes.zonas.abajo}px
      </div>
      <div className="lat" style={{ left: (ox + 60 * kk) * k }} />
      <div className="lat" style={{ left: (ox + (bw - 60) * kk) * k }} />
    </div>
  );
};

/** hh:mm:ss:ff */
export const tc = (f: number, fps: number) => {
  const t = Math.max(0, Math.floor(f));
  const ff = t % fps;
  const sTot = Math.floor(t / fps);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(sTot / 3600))}:${p(Math.floor(sTot / 60) % 60)}:${p(sTot % 60)}:${p(ff)}`;
};

const Tiempo: React.FC<{ total: number; fps: number }> = ({ total, fps }) => {
  const frame = useEd((s) => s.frame);
  return (
    <div className="tiempo" title={`Fotograma ${frame} · ${fps} fps`} data-prueba="tiempo">
      <b>{tc(frame, fps)}</b> <span style={{ opacity: 0.5 }}>/</span> {tc(total, fps)}
    </div>
  );
};

const Scrub: React.FC<{ total: number }> = ({ total }) => {
  const frame = useEd((s) => s.frame);
  const pct = total > 1 ? (frame / (total - 1)) * 100 : 0;
  return <input type="range" min={0} max={Math.max(0, total - 1)} value={frame} onChange={(e) => irA(Number(e.target.value))} aria-label="Posición" style={{ ['--p' as any]: `${pct}%` }} />;
};

/** Capa para «zoom a un punto»: el clic en el visor añade las claves de cámara de la escena. */
const ElegirPunto: React.FC<{ k: number; cw: number; ch: number }> = ({ k, cw, ch }) => {
  const elegirPunto = useEd((s) => s.elegirPunto);
  const proyecto = useEd((s) => s.proyecto)!;
  const linea = useEd((s) => s.linea)!;
  const formatoVista = useEd((s) => s.formatoVista);
  const fps = proyecto.ajustes.fps;
  return (
    <div
      className="elegir-punto"
      data-prueba="elegir-punto"
      title="Clic en el punto al que acercarse"
      onClick={(ev) => {
        const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
        const s = useEd.getState();
        const bw = proyecto.ajustes.ancho,
          bh = proyecto.ajustes.alto;
        const kk = formatoVista === '9:16' ? 1 : Math.min(cw / bw, ch / bh);
        const px = ((ev.clientX - r.left) / k - (cw - bw * kk) / 2) / kk;
        const py = ((ev.clientY - r.top) / k - (ch - bh * kk) / 2) / kk;
        const er = linea.escenas.find((x) => x.id === elegirPunto)!;
        const f = Math.max(0, Math.min(s.frame, er.fin - 1) - er.origen);
        s.editar('zoom-punto', (d) => {
          const e = d.escenas.find((x) => x.id === elegirPunto)!;
          e.camara = [...e.camara.filter((c) => c.f < f), ...clavesZoomPunto(f, px, py, bw, bh, fps)];
        });
        useEd.setState({ elegirPunto: null });
        s.avisar('Zoom a un punto añadido (acerca, mantiene y vuelve)', 'ok');
      }}
    />
  );
};

/** Ajuste manual del reencuadre del formato que se está viendo (se guarda en el proyecto y lo usa la exportación). */
const Reencuadre: React.FC<{ formato: Formato }> = ({ formato }) => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const frame = useEd((s) => s.frame);
  const i = escenaEn(l, frame);
  const e = p.escenas[i];
  const rf = p.ajustes.reencuadre?.[formato];
  const modo = rf?.modo ?? (formato === '16:9' ? 'adaptar' : 'recortar');
  const foco = e?.focos?.[formato] ?? e?.foco ?? 880;
  const ed = useEd.getState().editar;
  const ponerRf = (d: Partial<{ modo: 'adaptar' | 'recortar'; zoom: number }>) =>
    ed(`reencuadre-${formato}`, (x) => {
      x.ajustes.reencuadre ??= {};
      x.ajustes.reencuadre[formato] = { modo, zoom: rf?.zoom ?? 1, ...d };
    });
  return (
    <div className="reencuadre" data-prueba="reencuadre">
      <b>{formato}</b>
      <div className="seg">
        {(['recortar', 'adaptar'] as const).map((m) => (
          <button key={m} className={modo === m ? 'on' : ''} onClick={() => ponerRf({ modo: m })} data-modo-encuadre={m}>
            {m === 'recortar' ? 'Llenar (recortar)' : 'Encajar'}
          </button>
        ))}
      </div>
      {modo === 'recortar' && (
        <>
          <span>Zoom</span>
          <input type="range" min={1} max={2} step={0.05} value={rf?.zoom ?? 1} onChange={(ev) => ponerRf({ zoom: Number(ev.target.value) })} />
          <span>Posición de «{e?.nombre || e?.id}»</span>
          <input type="range" min={0} max={p.ajustes.alto} step={10} value={foco} data-prueba="foco-escena" onChange={(ev) => ed(`foco-${formato}-${e.id}`, (x) => void ((x.escenas[i].focos ??= {})[formato] = Number(ev.target.value)))} />
          {e?.focos?.[formato] != null && (
            <button className="btn-r" title="Volver al automático" onClick={() => ed('foco-0', (x) => void delete x.escenas[i].focos![formato])}>
              <Ico n="reiniciar" s={12} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export const Visor: React.FC = () => {
  const proyecto = useEd((s) => s.proyecto)!;
  const linea = useEd((s) => s.linea)!;
  const medios = useEd((s) => s.medios);
  const { bucle, zonas, formatoVista, zoomVisor, reproduciendo, elegirPunto } = useEd();
  const ref = useRef<PlayerRef>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 400, h: 600 });
  const [menuP, setMenuP] = useState(false);

  const ocultas = useEd((s) => s.ocultas);
  const previa = useEd((s) => s.previa);
  const proxies = useEd((s) => s.proxies);
  const usarProxies = useEd((s) => s.usarProxies);
  const editando = useEd((s) => s.editando);
  const vista = useMemo(() => {
    let v = marcarFaltantes(proyecto, medios);
    if (usarProxies) v = conProxies(v, proxies);
    if (previa) v = previa(v);
    // el texto que se edita en el visor se oculta en el vídeo (se ve el campo de edición)
    if (editando) v = { ...v, escenas: v.escenas.map((e) => (e.id === editando.escena ? { ...e, textos: e.textos.filter((t) => t.id !== editando.id) } : e)) };
    if (!ocultas.length) return v;
    // pistas ocultas / silenciadas solo en la vista previa
    return {
      ...v,
      escenas: ocultas.includes('textos') ? v.escenas.map((e) => ({ ...e, textos: [] })) : v.escenas,
      musica: ocultas.includes('musica') ? { ...v.musica, src: null } : v.musica,
      sfx: ocultas.includes('sfx') ? [] : v.sfx,
    };
  }, [proyecto, medios, ocultas, previa, editando, proxies, usarProxies]);
  const props = useMemo(() => ({ proyecto: vista, formato: formatoVista, encuadre: formatoVista === '4:5' || formatoVista === '1:1' ? 'recortar' : 'adaptar' }), [vista, formatoVista]);
  const { w: cw, h: ch } = dimsFormato(proyecto, formatoVista);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    reproductor.ref = p;
    let raf = 0;
    const onFrame = (e: { detail: { frame: number } }) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => useEd.setState({ frame: e.detail.frame }));
    };
    const onPlay = () => useEd.setState({ reproduciendo: true });
    const onPause = () => useEd.setState({ reproduciendo: false });
    p.addEventListener('frameupdate', onFrame as any);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    p.addEventListener('ended', onPause);
    // mantener la posición al recrear el reproductor
    p.seekTo(useEd.getState().frame);
    return () => {
      p.removeEventListener('frameupdate', onFrame as any);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
      p.removeEventListener('ended', onPause);
    };
  }, [formatoVista]);

  const fit = Math.min((tam.w - 24) / cw, (tam.h - 16) / ch);
  const k = zoomVisor > 0 ? zoomVisor : Math.max(0.05, fit);
  const w = Math.round(cw * k),
    h = Math.round(ch * k);
  const fps = proyecto.ajustes.fps;

  return (
    <section className="panel centro" data-prueba="reproductor">
      <div className="cab-panel">
        <span className="t">Reproductor</span>
        <span className="esp" />
        <span style={{ color: 'var(--tenue)', fontSize: 11.5 }}>
          {cw} × {ch} · {fps} fps
        </span>
        <div style={{ position: 'relative' }}>
          <button className="btn icono chico plano" title="Opciones del reproductor" onClick={() => setMenuP(!menuP)} data-prueba="menu-reproductor">
            <Ico n="menu" />
          </button>
          {menuP && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 79 }} onPointerDown={() => setMenuP(false)} />
              <div className="menu-flot" style={{ right: 0, top: 30, position: 'absolute' }}>
                <button onClick={() => useEd.setState({ zonas: !zonas })}>
                  <Ico n="zonas" s={15} /> Zonas seguras {zonas && <Ico n="ok" s={14} style={{ marginLeft: 'auto' }} />}
                </button>
                <button
                  onClick={() => {
                    const v = !useEd.getState().usarProxies;
                    useEd.setState({ usarProxies: v });
                    try {
                      localStorage.setItem('studio.proxies', v ? 'si' : 'no');
                    } catch {
                      /* sin almacenamiento */
                    }
                  }}
                  data-prueba="usar-proxies"
                >
                  <Ico n="velocidad" s={15} /> Usar proxies en la vista previa {useEd.getState().usarProxies && <Ico n="ok" s={14} style={{ marginLeft: 'auto' }} />}
                </button>
                <button onClick={() => api.generarProxy({ pesados: true }).then((l) => useEd.getState().avisar(l.length ? `Generando ${l.length} proxy(s) en segundo plano` : 'No hay vídeos pesados sin proxy', 'ok'))}>
                  <Ico n="regenerar" s={15} /> Generar proxies de los vídeos pesados
                </button>
                <button onClick={() => useEd.setState({ bucle: !bucle })}>
                  <Ico n="bucle" s={15} /> Repetir en bucle {bucle && <Ico n="ok" s={14} style={{ marginLeft: 'auto' }} />}
                </button>
                <hr />
                {[0, 0.25, 0.5, 0.75, 1].map((z) => (
                  <button key={z} onClick={() => useEd.setState({ zoomVisor: z })}>
                    <span style={{ width: 15 }} /> {z ? `${z * 100} %` : 'Ajustar a la ventana'} {zoomVisor === z && <Ico n="ok" s={14} style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="escenario" ref={caja}>
        <div className="marco-player" style={{ width: w, height: h }} data-prueba="visor">
          <Player
            key={formatoVista}
            ref={ref}
            component={Video as React.FC<any>}
            inputProps={props}
            durationInFrames={Math.max(1, linea.total)}
            fps={fps}
            compositionWidth={cw}
            compositionHeight={ch}
            style={{ width: w, height: h }}
            loop={bucle}
            controls={false}
            clickToPlay={false}
            spaceKeyToPlayOrPause={false}
            doubleClickToFullscreen
            allowFullscreen
            acknowledgeRemotionLicense
            numberOfSharedAudioTags={20}
            errorFallback={({ error }) => <div style={{ color: '#ff9a9a', padding: 20, fontSize: 14, background: '#1a0f0f', height: '100%' }}>Error en la vista previa: {error.message}</div>}
          />
          {zonas && <Zonas p={proyecto} k={k} formato={formatoVista} w={cw} h={ch} />}
          {elegirPunto && <ElegirPunto k={k} cw={cw} ch={ch} />}
          {!elegirPunto && formatoVista === '9:16' && <CapaEdicion k={k} />}
          {formatoVista === '9:16' && <ElegirZona k={k} />}
        </div>
      </div>
      {formatoVista !== '9:16' && <Reencuadre formato={formatoVista} />}
      <div className="pie-player">
        <div className="scrub">
          <Scrub total={linea.total} />
        </div>
        <div className="controles">
          <div className="izq-c">
            <Tiempo total={linea.total} fps={fps} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button className="btn icono chico plano" title="Fotograma anterior (←)" onClick={() => irA(useEd.getState().frame - 1)}>
              <Ico n="atras" />
            </button>
            <button className="boton-play" title="Reproducir / pausa (Espacio)" data-prueba="play" onClick={() => ref.current?.toggle()}>
              <Ico n={reproduciendo ? 'pausa' : 'play'} s={18} fill />
            </button>
            <button className="btn icono chico plano" title="Fotograma siguiente (→)" onClick={() => irA(useEd.getState().frame + 1)}>
              <Ico n="adelante" />
            </button>
          </div>
          <div className="der-c">
            <button className={`mini-btn ${zonas ? 'on' : ''}`} title="Zonas seguras (G)" onClick={() => useEd.setState({ zonas: !zonas })} data-prueba="zonas">
              Zonas
            </button>
            <select className="mini-btn" style={{ width: 'auto', padding: '0 4px', height: 22 }} value={formatoVista} onChange={(e) => useEd.setState({ formatoVista: e.target.value as Formato })} title="Proporción de la vista previa">
              <option value="9:16">9:16</option>
              <option value="4:5">4:5</option>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
            </select>
            <button className="btn icono chico plano" title="Ajustar a la ventana" onClick={() => useEd.setState({ zoomVisor: 0 })}>
              <Ico n="foco" />
            </button>
            <button className="btn icono chico plano" title="Pantalla completa (F)" onClick={() => ref.current?.requestFullscreen()}>
              <Ico n="pantalla" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
