/** Exportar: preajustes por plataforma, reencuadre, H.264/H.265, subtítulos quemados o aparte, rango y miniatura. */
import React, { useMemo, useState } from 'react';
import { fondoCierra } from './campos';
import { FORMATOS, validarProyecto, type Formato } from '@contrato/esquema';
import { fmtT, useEd } from './estado';
import { api } from './api';
import { Ico } from './iconos';
import { guardarAhora } from './guardado';
import { aSrt, aVtt } from './subtitulos';
import { PanelRevision, revisar, ultimoResultado, type Plataforma } from './Revision';

type Preset = { id: string; nombre: string; formato: Formato; encuadre: 'adaptar' | 'recortar'; revision: Plataforma; desc: string };
export const PRESETS: Preset[] = [
  { id: 'reels', nombre: 'Reels', formato: '9:16', encuadre: 'adaptar', revision: 'reels', desc: '1080 × 1920 · Instagram' },
  { id: 'tiktok', nombre: 'TikTok', formato: '9:16', encuadre: 'adaptar', revision: 'tiktok', desc: '1080 × 1920' },
  { id: 'shorts', nombre: 'Shorts', formato: '9:16', encuadre: 'adaptar', revision: 'shorts', desc: '1080 × 1920 · YouTube' },
  { id: 'feed45', nombre: 'Feed 4:5', formato: '4:5', encuadre: 'recortar', revision: 'reels', desc: '1080 × 1350 · reencuadre automático' },
  { id: 'feed11', nombre: 'Feed 1:1', formato: '1:1', encuadre: 'recortar', revision: 'reels', desc: '1080 × 1080 · reencuadre automático' },
  { id: 'youtube', nombre: 'YouTube 16:9', formato: '16:9', encuadre: 'adaptar', revision: 'shorts', desc: '1920 × 1080 · encajado sobre fondo' },
];

const Forma: React.FC<{ f: Formato }> = ({ f }) => {
  const r = FORMATOS[f].ancho / FORMATOS[f].alto;
  const h = r < 1 ? 34 : 34 / r;
  return <div className="forma" style={{ height: Math.max(14, h), width: Math.max(14, h * r) }} />;
};

export const DExportar: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const sel = useEd((s) => s.sel);
  const frame = useEd((s) => s.frame);
  const medios = useEd((s) => s.medios);
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [encuadre, setEncuadre] = useState<'adaptar' | 'recortar'>(PRESETS[0].encuadre);
  const [calidad, setCalidad] = useState<'alta' | 'media' | 'borrador'>('alta');
  const [codec, setCodec] = useState<'h264' | 'h265'>('h264');
  const [subs, setSubs] = useState<'quemados' | 'aparte' | 'ambos'>('quemados');
  const [rango, setRango] = useState<'todo' | 'escena' | 'manual'>('todo');
  const [a, setA] = useState(0);
  const [b, setB] = useState(Math.min(l.total - 1, l.fps * 3 - 1));
  const [verRev, setVerRev] = useState(false);
  const [normalizar, setNormalizar] = useState(true);
  const [titulo, setTitulo] = useState(p.escenas[0]?.textos[0]?.texto.replace(/\*/g, '') ?? p.nombre);
  const [enviando, setEnviando] = useState(false);
  const escSel = sel?.tipo === 'escena' ? l.escenas.find((e) => e.id === sel.id) : null;
  const r: [number, number] | null = rango === 'todo' ? null : rango === 'escena' && escSel ? [escSel.inicio, escSel.fin - 1] : [Math.max(0, a), Math.min(l.total - 1, b)];
  const fps = p.ajustes.fps;
  const cerrar = () => useEd.setState({ dialogo: null });
  const problemas = useMemo(() => revisar(p, l, preset.revision, medios, { sonoridad: ultimoResultado('sonoridad'), fluidez: ultimoResultado('fluidez') }), [p, l, preset, medios]);
  const errores = problemas.filter((x) => x.nivel === 'error').length;
  const avisos = problemas.filter((x) => x.nivel === 'aviso').length;
  const exportar = async (lote?: Preset[]) => {
    setEnviando(true);
    try {
      validarProyecto(p);
      await guardarAhora();
      for (const pr of lote ?? [preset]) {
        await api.exportar({
          proyecto: p,
          formato: pr.formato,
          encuadre: lote ? pr.encuadre : encuadre,
          calidad,
          codec,
          rango: r,
          nombre: p.nombre,
          plataforma: pr.nombre,
          normalizar: normalizar ? p.ajustes.audio.objetivo : null,
          subtitulos: subs,
          srt: subs !== 'quemados' ? aSrt(l, p) : undefined,
          vtt: subs !== 'quemados' ? aVtt(l, p) : undefined,
        });
      }
      useEd.getState().avisar(lote ? `${lote.length} exportaciones en cola` : 'Exportación en marcha', 'ok');
      cerrar();
    } catch (e: any) {
      useEd.getState().avisar(e.message, 'error');
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="velo" {...fondoCierra(() => cerrar())}>
      <div className="dialogo" style={{ width: 720 }} data-prueba="dialogo-exportar">
        <div className="cab">
          <h3>Exportar</h3>
          <button className="btn icono chico" onClick={cerrar}>
            <Ico n="cerrar" />
          </button>
        </div>
        <div className="cuerpo">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Plataforma</div>
          <div className="opciones">
            {PRESETS.map((x) => (
              <button
                key={x.id}
                className={`opcion ${preset.id === x.id ? 'on' : ''}`}
                onClick={() => {
                  setPreset(x);
                  setEncuadre(x.encuadre);
                }}
                data-preset={x.id}
                data-formato={x.formato}
              >
                <Forma f={x.formato} />
                <b>{x.nombre}</b>
                <span>{x.desc}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Calidad</div>
              <div className="seg">
                {(
                  [
                    ['alta', 'Alta'],
                    ['media', 'Media'],
                    ['borrador', 'Borrador'],
                  ] as const
                ).map(([k, n]) => (
                  <button key={k} className={calidad === k ? 'on' : ''} onClick={() => setCalidad(k)} data-calidad={k}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="ayuda">{calidad === 'alta' ? (fps >= 50 ? '18 Mbps a 60 fps (12 Mbps en H.265)' : '10 Mbps') : calidad === 'media' ? 'CRF 20, más ligero' : 'Mitad de tamaño, rápido'}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Códec</div>
              <div className="seg">
                <button className={codec === 'h264' ? 'on' : ''} onClick={() => setCodec('h264')}>
                  H.264 (compatible)
                </button>
                <button className={codec === 'h265' ? 'on' : ''} onClick={() => setCodec('h265')} data-codec="h265">
                  H.265 (más ligero)
                </button>
              </div>
            </div>
            <AcelHW />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Subtítulos</div>
              <div className="seg">
                {(
                  [
                    ['quemados', 'En el vídeo'],
                    ['aparte', 'Aparte (.srt/.vtt)'],
                    ['ambos', 'Ambos'],
                  ] as const
                ).map(([k, n]) => (
                  <button key={k} className={subs === k ? 'on' : ''} onClick={() => setSubs(k)} data-subs={k}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Encuadre {preset.formato !== '9:16' ? `(${preset.formato})` : ''}</div>
              <div className="seg">
                <button className={encuadre === 'adaptar' ? 'on' : ''} onClick={() => setEncuadre('adaptar')} disabled={preset.formato === '9:16'}>
                  Encajar
                </button>
                <button className={encuadre === 'recortar' ? 'on' : ''} onClick={() => setEncuadre('recortar')} disabled={preset.formato === '9:16' || preset.formato === '16:9'} data-encuadre="recortar">
                  Reencuadrar
                </button>
              </div>
            </div>
          </div>
          <label className="fila" style={{ marginTop: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={normalizar} onChange={(e) => setNormalizar(e.target.checked)} data-prueba="normalizar-export" />
            Normalizar la sonoridad a {p.ajustes.audio.objetivo} LUFS (limitador a −1 dBTP)
          </label>
          <div style={{ fontWeight: 600, margin: '14px 0 6px' }}>Rango</div>
          <div className="seg" style={{ marginBottom: 8 }}>
            <button className={rango === 'todo' ? 'on' : ''} onClick={() => setRango('todo')} data-rango="todo">
              Todo ({fmtT(l.total, fps)})
            </button>
            <button className={rango === 'escena' ? 'on' : ''} onClick={() => setRango('escena')} disabled={!escSel} data-rango="escena">
              Escena seleccionada
            </button>
            <button className={rango === 'manual' ? 'on' : ''} onClick={() => setRango('manual')} data-rango="manual">
              Fotogramas…
            </button>
          </div>
          {rango === 'manual' && (
            <div className="fila" style={{ marginBottom: 8 }}>
              desde <input type="number" value={a} onChange={(e) => setA(Number(e.target.value))} style={{ width: 90 }} data-prueba="rango-a" /> hasta <input type="number" value={b} onChange={(e) => setB(Number(e.target.value))} style={{ width: 90 }} data-prueba="rango-b" />
              <span style={{ color: 'var(--tenue)' }}>({((b - a + 1) / fps).toFixed(1)} s)</span>
            </div>
          )}

          <div className="seccion" style={{ padding: '12px 0 0', borderBottom: 0, borderTop: '1px solid var(--borde)', marginTop: 10 }}>
            <h4>
              Revisión para {preset.nombre}
              <span className="esp" />
              <span className={`chip ${errores ? 'error' : avisos ? 'aviso' : ''}`} data-prueba="revision-chip">
                {errores ? `${errores} error(es) · ` : ''}
                {avisos} aviso(s)
              </span>
              <button className="btn chico" onClick={() => setVerRev(!verRev)}>
                {verRev ? 'Ocultar' : 'Ver'}
              </button>
            </h4>
            {verRev && <PanelRevision compacto plataforma={preset.revision} />}
          </div>

          <div className="seccion" style={{ padding: '12px 0 0', borderBottom: 0, borderTop: '1px solid var(--borde)', marginTop: 10 }}>
            <h4>Miniatura / portada</h4>
            <div className="fila">
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (/ = salto de línea)" data-prueba="portada-titulo" />
              <button
                className="btn"
                data-prueba="portada"
                onClick={async () => {
                  await guardarAhora();
                  await api.fotograma({ proyecto: p, formato: preset.formato, frame, nombre: p.nombre, portada: { titulo, subtitulo: p.ajustes.marca?.eslogan ?? '' }, encuadre });
                  useEd.getState().avisar(`Generando portada del fotograma ${frame}…`);
                }}
              >
                <Ico n="imagen" /> Crear portada (f {frame})
              </button>
            </div>
            <div className="ayuda">Usa el fotograma del cursor, con el título encima, el logo de la marca y la web.</div>
          </div>
        </div>
        <div className="pie">
          <button className="btn" onClick={cerrar}>
            Cancelar
          </button>
          <button className="btn" disabled={enviando} data-prueba="exportar-4-formatos" onClick={() => exportar(PRESETS.filter((x) => ['reels', 'feed11', 'feed45', 'youtube'].includes(x.id)))} title="9:16, 1:1, 4:5 y 16:9 de una vez (cada uno con su reencuadre; ajústalo en el reproductor eligiendo el formato)">
            <Ico n="exportar" s={14} /> Los 4 formatos
          </button>
          <button className="btn" disabled={enviando} onClick={() => exportar(PRESETS.filter((x) => ['reels', 'feed45', 'youtube'].includes(x.id)))} title="Reels 9:16 + Feed 4:5 + YouTube 16:9, uno detrás de otro">
            Exportar 3 formatos
          </button>
          <button className="btn prim" disabled={enviando || errores > 0} data-prueba="exportar-ok" onClick={() => exportar()} title={errores ? 'Corrige los errores de la revisión' : ''}>
            <Ico n="exportar" /> Exportar {preset.nombre}
            {r ? ` · ${r[1] - r[0] + 1} f` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

/** «Aceleración por hardware»: NVENC / QSV / AMF si el equipo los tiene (con prueba de velocidad). */
const AcelHW: React.FC = () => {
  const [g, setG] = useState<null | { disponibles: string[]; preferencia: string; elegida: string | null; prueba: any }>(null);
  const [probando, setProbando] = useState(false);
  const cargar = () => fetch('/api/gpu').then((r) => r.json()).then(setG).catch(() => {});
  React.useEffect(() => {
    cargar();
  }, []);
  const N: Record<string, string> = { nvenc: 'NVIDIA NVENC', qsv: 'Intel Quick Sync', amf: 'AMD AMF', cpu: 'CPU (x264)' };
  return (
    <div data-prueba="aceleracion">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Aceleración por hardware</div>
      {!g ? (
        <div className="ayuda">Detectando la tarjeta gráfica…</div>
      ) : (
        <>
          <div className="fila" style={{ gap: 6 }}>
            <select
              value={g.preferencia}
              onChange={async (e) => {
                await fetch('/api/gpu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aceleracion: e.target.value }) });
                cargar();
              }}
              data-prueba="acel-pref"
            >
              <option value="auto">Automática{g.disponibles[0] ? ` (${N[g.disponibles[0]]})` : ' (no hay GPU compatible)'}</option>
              <option value="no">Desactivada (solo CPU)</option>
              {g.disponibles.map((d) => (
                <option key={d} value={d}>
                  {N[d]}
                </option>
              ))}
            </select>
            <button
              className="btn chico"
              disabled={probando}
              data-prueba="acel-probar"
              onClick={async () => {
                setProbando(true);
                await fetch('/api/gpu/prueba', { method: 'POST' }).catch(() => {});
                await cargar();
                setProbando(false);
              }}
            >
              {probando ? 'Midiendo…' : 'Probar velocidad'}
            </button>
          </div>
          <div className="ayuda">
            {g.elegida ? `Se codifica con ${N[g.elegida]}; si falla, se repite con la CPU.` : 'Se codifica con la CPU.'}
            {g.prueba && ` Última prueba: ${Object.entries(g.prueba.resultados as Record<string, { fps: number }>).map(([k, v]) => `${N[k] ?? k} ${v.fps} fps`).join(' · ')}.`}
          </div>
        </>
      )}
    </div>
  );
};
