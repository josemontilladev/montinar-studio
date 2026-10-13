/** Inspector de subtítulos: transcripción automática, estilos, posición, troceado y exportación .srt / .vtt. */
import React, { useState } from 'react';
import type { Draft } from 'immer';
import { FUENTES } from '@proyecto';
import type { TProyecto } from '@contrato/esquema';
import { useEd } from './estado';
import { Campo, ColorP, Deslizador, Num, Segmentos, Si, Texto } from './campos';
import { ESTILOS_SUB, aSrt, aVtt, descargar, transcribir } from './subtitulos';
import { Ico } from './iconos';

const fuentes = [...new Set(Object.keys(FUENTES).filter((k) => !['sans', 'serif', 'mono'].includes(k)))];

/** Miniatura del estilo (dibujada con CSS). */
const Muestra: React.FC<{ id: string }> = ({ id }) => {
  const w = ['Tu', 'web', 'vende'];
  const base: React.CSSProperties = { fontWeight: 700, fontSize: 12, display: 'inline-block', margin: '0 2px' };
  return (
    <div style={{ height: 34, display: 'grid', placeItems: 'center', borderRadius: 6, background: 'linear-gradient(135deg,#3a3a48,#22222b)' }}>
      <div style={{ padding: id === 'resaltado' || id === 'karaoke' ? '2px 6px' : 0, borderRadius: 6, background: id === 'resaltado' || id === 'karaoke' ? 'rgba(10,10,12,.85)' : 'transparent' }}>
        {w.map((x, i) =>
          id === 'resaltado' ? (
            <span key={i} style={{ ...base, padding: '0 3px', borderRadius: 3, background: i === 1 ? '#C8FF3B' : 'transparent', color: i === 1 ? '#0a0a0c' : '#eee' }}>
              {x}
            </span>
          ) : id === 'karaoke' ? (
            <span key={i} style={{ ...base, color: i < 1 ? '#C8FF3B' : '#eee', backgroundImage: i === 1 ? 'linear-gradient(90deg,#C8FF3B 50%,#eee 50%)' : undefined, WebkitBackgroundClip: i === 1 ? 'text' : undefined, WebkitTextFillColor: i === 1 ? 'transparent' : undefined }}>
              {x}
            </span>
          ) : id === 'pop' ? (
            <span key={i} style={{ ...base, fontSize: i === 1 ? 15 : 12, color: i === 1 ? '#C8FF3B' : '#fff', opacity: i === 2 ? 0.15 : 1, textTransform: 'uppercase' }}>
              {x}
            </span>
          ) : (
            <span key={i} style={{ ...base, fontWeight: 600, color: '#fff', textShadow: '0 1px 3px #000' }}>
              {x}
            </span>
          ),
        )}
      </div>
    </div>
  );
};

export const PanelSub: React.FC<{ parte?: 'todo' | 'auto' | 'estilo' }> = ({ parte = 'todo' }) => {
  const s = useEd((x) => x.proyecto!.subtitulos);
  const p = useEd((x) => x.proyecto!);
  const l = useEd((x) => x.linea!);
  const medios = useEd((x) => x.medios);
  const trabajos = useEd((x) => x.trabajos);
  const editar = useEd((x) => x.editar);
  const [fuente, setFuente] = useState<'voz' | 'pista'>(s.origen);
  const [usarGuion, setUsarGuion] = useState(true);
  const [modelo, setModelo] = useState('small');
  const [src, setSrc] = useState(s.pista.src ?? '');
  const [inicio, setInicio] = useState(s.pista.inicio);
  const ed = (c: string, fn: (x: Draft<TProyecto['subtitulos']>) => void) => editar(`sub:${c}`, (d) => fn(d.subtitulos));
  const tr = trabajos.find((t) => t.tipo === 'subtitulos' && t.estado === 'corriendo');
  const audios = medios.filter((m) => m.tipo === 'audio' || m.tipo === 'video');
  const nombre = (p.nombre || 'video').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  const cps = l.bloques.map((b) => b.palabras.map((w) => w.p).join(' ').length / Math.max(0.2, b.hasta - b.desde));
  const rapidos = cps.filter((c) => c > 17).length;
  return (
    <>
      {(parte === 'todo') && (
      <>
      <div className="cab-insp">
        <div style={{ flex: 1 }}>
          <div className="tipo">Subtítulos</div>
          <div className="tit">
            {l.palabrasSub.length} palabras · {l.bloques.length} bloques
          </div>
        </div>
        <Si v={s.visible} on={(v) => ed('vis', (x) => void (x.visible = v))} et="Visibles" prueba="sub-visible" />
      </div>

      </>
      )}
      {(parte === 'todo' || parte === 'auto') && (
      <>
      <div className="seccion">
        <h4>Subtítulos automáticos</h4>
        <Segmentos
          v={fuente}
          ops={[
            ['voz', 'Voz del proyecto'],
            ['pista', 'Otro audio'],
          ]}
          on={(v) => setFuente(v as any)}
          prueba="sub-fuente"
        />
        <div style={{ height: 8 }} />
        {fuente === 'voz' ? (
          <Si v={usarGuion} on={setUsarGuion} et="Escribir como el guion (solo tiempos de whisper)" />
        ) : (
          <>
            <Campo et="Audio / vídeo">
              <select value={src} onChange={(e) => setSrc(e.target.value)} data-prueba="sub-src">
                <option value="">(elige un archivo)</option>
                {audios.map((m) => (
                  <option key={m.ruta} value={m.ruta}>
                    {m.ruta}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo et="Empieza en">
              <Num v={inicio} on={(n) => setInicio(Math.max(0, Math.round(n)))} suf="f" />
            </Campo>
          </>
        )}
        <Campo et="Modelo" title="small = equilibrio; base = rápido; medium = más preciso y lento">
          <Segmentos
            v={modelo}
            ops={[
              ['base', 'Rápido'],
              ['small', 'Normal'],
              ['medium', 'Preciso'],
            ]}
            on={setModelo}
          />
        </Campo>
        {tr ? (
          <div className="trabajo" style={{ boxShadow: 'none' }}>
            <div className="et">{tr.etapa}</div>
            <div className="prog">
              <i style={{ width: `${Math.round(tr.progreso * 100)}%` }} />
            </div>
          </div>
        ) : (
          <button className="btn prim" style={{ width: '100%' }} data-prueba="transcribir" disabled={fuente === 'pista' && !src} onClick={() => transcribir(fuente === 'voz' ? { fuente, usarGuion, modelo } : { fuente, src, inicio, modelo })}>
            <Ico n="sub" /> Transcribir (español)
          </button>
        )}
        <div className="ayuda">faster-whisper en local, con tiempo por palabra. Luego se corrigen en la pista «Subtítulos»: doble clic en una palabra para cambiarla, arrastrar para moverla, bordes para ajustar.</div>
        {s.origen === 'pista' && (
          <div className="fila">
            <span className="chip ancla">Pista propia: {s.pista.src}</span>
            <button className="btn chico" onClick={() => ed('origen', (x) => void (x.origen = 'voz'))}>
              Usar la voz
            </button>
          </div>
        )}
      </div>

      </>
      )}
      {(parte === 'todo' || parte === 'estilo') && (
      <>
      <div className="seccion">
        <h4>Estilo</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ESTILOS_SUB.map((e) => (
            <button key={e.id} className={`opcion ${s.estilo === e.id ? 'on' : ''}`} style={{ padding: 6 }} title={e.desc} data-estilo-sub={e.id} onClick={() => ed('estilo', (x) => void Object.assign(x, e.aplicar))}>
              <Muestra id={e.id} />
              <b style={{ marginTop: 5, fontSize: 12 }}>{e.nombre}</b>
            </button>
          ))}
        </div>
        <div style={{ height: 10 }} />
        <Campo et="Fuente">
          <select value={s.fuente ?? ''} onChange={(e) => ed('fuente', (x) => void (e.target.value ? (x.fuente = e.target.value) : delete x.fuente))}>
            <option value="">Sans de la marca</option>
            {fuentes.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Campo>
        <Campo et="Tamaño">
          <Deslizador v={s.tam} min={24} max={120} on={(n) => ed('tam', (x) => void (x.tam = n))} suf="px" />
        </Campo>
        <Si v={s.mayusculas} on={(v) => ed('may', (x) => void (x.mayusculas = v))} et="MAYÚSCULAS" />
        <Si v={s.sombra} on={(v) => ed('sombra', (x) => void (x.sombra = v))} et="Sombra" />
        <div style={{ height: 8 }} />
        <Campo et="Texto">
          <ColorP v={s.color} on={(v) => ed('c', (x) => void (x.color = v ?? 'bone'))} />
        </Campo>
        <Campo et="Resalte">
          <ColorP v={s.resalte} on={(v) => ed('r', (x) => void (x.resalte = v ?? 'acid'))} />
        </Campo>
        <Campo et="Texto resaltado">
          <ColorP v={s.colorResalte} on={(v) => ed('cr', (x) => void (x.colorResalte = v ?? 'ink'))} />
        </Campo>
        <Campo et="Caja">
          <Texto v={s.fondo} on={(v) => ed('f', (x) => void (x.fondo = v))} />
        </Campo>
      </div>

      </>
      )}
      {(parte === 'todo') && (
      <>
      <div className="seccion">
        <h4>Posición y bloques</h4>
        <Campo et="Posición">
          <Segmentos
            v={s.posicion}
            ops={[
              ['auto', 'Sobre la zona segura'],
              ['manual', 'Manual'],
            ]}
            on={(v) => ed('pos', (x) => void (x.posicion = v as any))}
            prueba="sub-posicion"
          />
        </Campo>
        {s.posicion === 'manual' && (
          <Campo et="Altura (y)">
            <Num v={s.y} on={(n) => ed('y', (x) => void (x.y = n))} suf="px" />
          </Campo>
        )}
        <Campo et="Palabras / bloque">
          <Num v={s.maxPalabras} on={(n) => ed('mp', (x) => void (x.maxPalabras = Math.max(1, Math.round(n))))} min={1} />
        </Campo>
        <Campo et="Letras / bloque">
          <Num v={s.maxLetras} on={(n) => ed('ml', (x) => void (x.maxLetras = Math.max(4, Math.round(n))))} min={4} />
        </Campo>
        <Campo et="Letras / línea" title="0 = una sola línea">
          <Num v={s.maxLetrasLinea} on={(n) => ed('mll', (x) => void (x.maxLetrasLinea = Math.max(0, Math.round(n))))} min={0} />
        </Campo>
        <div className={`chip ${rapidos ? 'aviso' : ''}`}>
          Velocidad de lectura: máx. {Math.max(0, ...cps).toFixed(0)} car./s{rapidos ? ` · ${rapidos} bloque(s) por encima de 17` : ' · bien'}
        </div>
      </div>

      </>
      )}
      {(parte === 'todo') && (
      <>
      <div className="seccion">
        <h4>Exportar aparte</h4>
        <div className="fila">
          <button className="btn" data-prueba="srt" onClick={() => descargar(`${nombre}.srt`, aSrt(l, p))}>
            <Ico n="exportar" /> .srt
          </button>
          <button className="btn" onClick={() => descargar(`${nombre}.vtt`, aVtt(l, p), 'text/vtt')}>
            <Ico n="exportar" /> .vtt
          </button>
        </div>
        <div className="ayuda">Al exportar el vídeo también se pueden guardar junto al .mp4 (opción «Subtítulos aparte»).</div>
      </div>
      </>
      )}
    </>
  );
};
