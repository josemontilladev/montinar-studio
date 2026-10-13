/** Audio profesional en el editor: mejorar voz, sonoridad de la mezcla (LUFS), ritmo de la música y cortes al ritmo. */
import React, { useState } from 'react';
import { api, type Trabajo } from './api';
import { useEd } from './estado';
import { Ico } from './iconos';
import { Segmentos } from './campos';

type Pend = { tipo: 'mejorar' } | { tipo: 'sonoridad' };
const pendientes = new Map<string, Pend>();
let ultimaSonoridad: { lufs: number; pico: number; t: number } | null = null;

export const PLATAFORMAS_LUFS: [string, number][] = [
  ['Redes (Reels, TikTok, Shorts)', -14],
  ['YouTube', -14],
  ['Voz / podcast', -16],
];

export const aplicarAudio = (ts: Trabajo[]) => {
  for (const t of ts) {
    const p = pendientes.get(t.id);
    if (!p || t.estado === 'corriendo') continue;
    pendientes.delete(t.id);
    const s = useEd.getState();
    if (t.estado !== 'hecho') {
      if (t.estado === 'error') s.avisar(`Falló: ${t.error ?? ''}`.slice(0, 200), 'error');
      continue;
    }
    if (p.tipo === 'mejorar') {
      const r = t.resultado as Record<string, { salida: string; antes: number; despues: number }>;
      s.editar('voz-mejorada', (d) => {
        for (const f of d.voz.frases) {
          const x = r[f.id];
          if (!x) continue;
          f.tomas.unshift({ archivo: f.archivo, duracion: f.duracion, palabras: f.palabras, texto: f.palabras.map((w) => w.p).join(' '), fecha: new Date().toISOString() });
          f.tomas = f.tomas.slice(0, 12);
          f.archivo = x.salida;
        }
      });
      s.avisar(`Voz mejorada: ${Object.keys(r).length} frase(s) a −16 LUFS`, 'ok');
    } else {
      ultimaSonoridad = { ...(t.resultado as { lufs: number; pico: number }), t: Date.now() };
      useEd.setState({ aviso: { texto: `Mezcla: ${ultimaSonoridad.lufs} LUFS · pico ${ultimaSonoridad.pico} dBFS`, tipo: 'ok', t: Date.now() } });
    }
  }
};

export const mejorarVoces = async (ids?: string[]) => {
  const s = useEd.getState();
  const fs = s.proyecto!.voz.frases.filter((f) => f.archivo && (!ids || ids.includes(f.id)));
  try {
    const r = await api.mejorarVoz(fs.map((f) => ({ id: f.id, src: f.archivo })));
    pendientes.set(r.trabajo.id, { tipo: 'mejorar' });
    useEd.setState({ trabajos: [r.trabajo, ...useEd.getState().trabajos] });
  } catch (e: any) {
    s.avisar(e.message, 'error');
  }
};

/** Mejorar la voz de una frase (botón del inspector de voz). */
export const BotonMejorarVoz: React.FC<{ id: string }> = ({ id }) => {
  const tr = useEd((s) => s.trabajos.find((t) => t.tipo === 'audio' && t.estado === 'corriendo'));
  return (
    <button className="btn" disabled={!!tr} onClick={() => mejorarVoces([id])} data-prueba="mejorar-voz" title="Paso alto, reducción de ruido, presencia, compresión y −16 LUFS">
      <Ico n="voz" /> {tr ? 'Procesando…' : 'Mejorar voz'}
    </button>
  );
};

/** Sección «Mezcla» del inspector de música: sonoridad, normalizar y mejorar todas las voces. */
export const SeccionMezcla: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const trabajos = useEd((s) => s.trabajos);
  const editar = useEd((s) => s.editar);
  useEd((s) => s.aviso); // re-dibujar al llegar el resultado
  const midiendo = trabajos.find((t) => t.titulo === 'Medir sonoridad de la mezcla' && t.estado === 'corriendo');
  const obj = p.ajustes.audio.objetivo;
  const r = ultimaSonoridad;
  const gan = p.ajustes.audio.ganancia;
  // ganancia para llegar al objetivo sin pasar de −1 dBFS de pico
  const sugerida = r ? Math.min(obj - r.lufs, -1 - r.pico) : 0;
  return (
    <div className="seccion" data-prueba="mezcla">
      <h4>Mezcla y sonoridad</h4>
      <div className="campo">
        <label>Objetivo</label>
        <Segmentos v={String(obj)} ops={[['-14', '−14 LUFS (redes)'], ['-16', '−16 (voz)']]} on={(v) => editar('obj', (d) => void (d.ajustes.audio.objetivo = Number(v)))} />
      </div>
      <div className="campo">
        <label>Ganancia</label>
        <span>
          {gan > 0 ? '+' : ''}
          {gan.toFixed(1)} dB
        </span>
      </div>
      {midiendo ? (
        <div className="trabajo" style={{ boxShadow: 'none' }}>
          <div className="et">{midiendo.etapa}</div>
          <div className="prog">
            <i style={{ width: `${Math.round(midiendo.progreso * 100)}%` }} />
          </div>
        </div>
      ) : (
        <button
          className="btn"
          style={{ width: '100%' }}
          data-prueba="medir-sonoridad"
          onClick={async () => {
            const x = await api.sonoridad(p);
            pendientes.set(x.trabajo.id, { tipo: 'sonoridad' });
            useEd.setState({ trabajos: [x.trabajo, ...useEd.getState().trabajos] });
          }}
        >
          Medir la mezcla (LUFS)
        </button>
      )}
      {r && (
        <div style={{ marginTop: 8 }}>
          <div className={`chip ${Math.abs(r.lufs - obj) > 1 || r.pico > -1 ? 'aviso' : ''}`} data-prueba="lufs">
            {r.lufs} LUFS · pico {r.pico} dBFS
          </div>
          {Math.abs(r.lufs - obj) > 0.5 && (
            <button
              className="btn chico"
              style={{ marginTop: 6 }}
              data-prueba="normalizar"
              onClick={() => {
                editar('normalizar', (d) => void (d.ajustes.audio.ganancia = Math.round((gan + sugerida) * 10) / 10));
                ultimaSonoridad = r ? { ...r, lufs: Math.round((r.lufs + sugerida) * 10) / 10, pico: Math.round((r.pico + sugerida) * 10) / 10 } : null;
              }}
            >
              Normalizar a {obj} LUFS ({sugerida > 0 ? '+' : ''}
              {sugerida.toFixed(1)} dB)
            </button>
          )}
        </div>
      )}
      <div style={{ height: 10 }} />
      <button className="btn" style={{ width: '100%' }} onClick={() => mejorarVoces()} data-prueba="mejorar-todas">
        <Ico n="voz" /> Mejorar todas las voces
      </button>
      <div className="ayuda">Limpieza de ruido, ecualización de presencia, compresión suave y −16 LUFS por frase. Cada frase guarda su toma anterior.</div>
    </div>
  );
};

/** Sección «Ritmo»: detectar pulsos y ajustar los cortes al pulso más cercano. */
export const SeccionRitmo: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const editar = useEd((s) => s.editar);
  const [ocupado, setOcupado] = useState(false);
  const m = p.musica;
  const beatsF = () => m.beats.map((b) => Math.round((b - m.inicio) * l.fps)).filter((f) => f > 0);
  return (
    <div className="seccion" data-prueba="ritmo">
      <h4>Ritmo</h4>
      <div className="fila">
        <button
          className="btn"
          disabled={!m.src || ocupado}
          data-prueba="detectar-ritmo"
          onClick={async () => {
            setOcupado(true);
            try {
              const r = await api.ritmo(m.src!);
              editar('ritmo', (d) => void ((d.musica.beats = r.beats), (d.musica.bpm = r.bpm)));
              useEd.getState().avisar(`${r.bpm} BPM · ${r.beats.length} pulsos`, 'ok');
            } catch (e: any) {
              useEd.getState().avisar(e.message, 'error');
            }
            setOcupado(false);
          }}
        >
          {ocupado ? 'Analizando…' : 'Detectar pulsos'}
        </button>
        {m.bpm && <span className="chip">{m.bpm} BPM</span>}
      </div>
      {m.beats.length > 0 && (
        <>
          <button
            className="btn"
            style={{ width: '100%', marginTop: 8 }}
            data-prueba="cortes-ritmo"
            onClick={() => {
              const bs = beatsF();
              let n = 0;
              editar('cortes-ritmo', (d) => {
                // cada corte (inicio de escena) al pulso más cercano (±0,3 s), sin dejar escenas de menos de 0,5 s
                let acc = 0;
                for (let i = 0; i < d.escenas.length - 1; i++) {
                  const e = d.escenas[i];
                  const fin = acc + e.duracion;
                  const b = bs.reduce((x, y) => (Math.abs(y - fin) < Math.abs(x - fin) ? y : x), bs[0]);
                  if (Math.abs(b - fin) <= 0.3 * l.fps && b - acc >= 0.5 * l.fps && b !== fin) {
                    const dlt = b - fin;
                    e.duracion += dlt;
                    d.escenas[i + 1].duracion = Math.max(1, d.escenas[i + 1].duracion - dlt);
                    n++;
                  }
                  acc += e.duracion;
                }
              });
              useEd.getState().avisar(`${n} corte(s) ajustados al ritmo`, 'ok');
            }}
          >
            Ajustar cortes al ritmo
          </button>
          <div className="ayuda">Los pulsos se ven en la pista de música y el imán se pega a ellos.</div>
        </>
      )}
    </div>
  );
};

/** Biblioteca de efectos originales (Audio). */
export const useSfxBiblioteca = () => {
  const [lista, setLista] = useState<string[] | null>(null);
  React.useEffect(() => {
    api.sfxBiblioteca().then(setLista).catch(() => setLista([]));
  }, []);
  return lista;
};
