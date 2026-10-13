/**
 * Música libre: pistas ORIGINALES sintetizadas por la app (CC0, sin muestras de terceros), por ánimo y BPM, con
 * vista previa, forma de onda y «encajar al ritmo» (los golpes de cada pista se conocen exactamente).
 */
import React, { useEffect, useRef, useState } from 'react';
import { cortesAlRitmo } from '@contrato/linea';
import { useEd } from './estado';
import { api } from './api';
import { Ico } from './iconos';

type Pista = { id: string; nombre: string; animo: string; bpm: number; segundos: number; archivo: string; golpes: number[]; onda: number[]; licencia: string };

const Onda: React.FC<{ v: number[]; p: number }> = ({ v, p }) => (
  <svg viewBox={`0 0 ${v.length} 20`} preserveAspectRatio="none" className="onda-musica">
    {v.map((x, i) => (
      <rect key={i} x={i} y={10 - x * 10} width={0.7} height={Math.max(0.4, x * 20)} fill={i / v.length < p ? 'var(--acento)' : 'var(--onda)'} />
    ))}
  </svg>
);

export const MusicaLibre: React.FC = () => {
  const [lista, setLista] = useState<Pista[]>([]);
  const [animo, setAnimo] = useState('Todos');
  const [sonando, setSonando] = useState<string | null>(null);
  const [prog, setProg] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const actual = useEd((s) => s.proyecto!.musica.src);
  useEffect(() => {
    fetch('/recursos/musica/catalogo.json')
      .then((r) => r.json())
      .then(setLista)
      .catch(() => setLista([]));
    return () => audio.current?.pause();
  }, []);
  const animos = ['Todos', ...new Set(lista.map((x) => x.animo))];
  const oir = (x: Pista) => {
    audio.current?.pause();
    if (sonando === x.id) return setSonando(null);
    const a = new Audio(`/recursos/musica/${x.archivo}`);
    a.ontimeupdate = () => setProg(a.currentTime / x.segundos);
    a.onended = () => setSonando(null);
    a.play();
    audio.current = a;
    setSonando(x.id);
  };
  const usar = async (x: Pista) => {
    const r = await fetch('/api/musica-libre/usar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: x.id }) }).then((y) => y.json());
    if (r.error) return useEd.getState().avisar(r.error, 'error');
    useEd.setState({ medios: await api.medios() });
    useEd.getState().editar('musica-libre', (d) => {
      d.musica.src = r.ruta;
      d.musica.inicio = 0;
      d.musica.beats = x.golpes;
      d.musica.bpm = x.bpm;
    });
    useEd.getState().avisar(`Música «${x.nombre}» (${x.bpm} BPM) con sus golpes para encajar al ritmo`, 'ok');
  };
  return (
    <div data-prueba="musica-libre">
      <div className="subtit">Música libre · original de la app (CC0)</div>
      <div className="chips-cat" style={{ padding: '0 10px 6px', flexWrap: 'wrap' }}>
        {animos.map((a) => (
          <button key={a} className={animo === a ? 'on' : ''} onClick={() => setAnimo(a)} data-animo={a}>
            {a}
          </button>
        ))}
      </div>
      {lista
        .filter((x) => animo === 'Todos' || x.animo === animo)
        .map((x) => {
          const enUso = actual?.endsWith(`/${x.archivo}`);
          return (
            <div key={x.id} className="item pista-libre" style={{ cursor: 'default' }} data-pista={x.id} title={x.licencia}>
              <button className="btn chico icono" onClick={() => oir(x)}>
                <Ico n={sonando === x.id ? 'pausa' : 'play'} s={13} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t">
                  {x.nombre} <span className="chip" style={{ fontSize: 10 }}>{x.animo}</span>
                </div>
                <div className="d">
                  {x.bpm} BPM · {Math.round(x.segundos)} s
                </div>
                <Onda v={x.onda} p={sonando === x.id ? prog : 0} />
              </div>
              <button className={`btn chico ${enUso ? 'activo' : ''}`} onClick={() => usar(x)} data-usar-pista={x.id}>
                {enUso ? 'En uso' : 'Usar'}
              </button>
            </div>
          );
        })}
      {actual && useEd.getState().proyecto!.musica.beats.length > 0 && (
        <div style={{ padding: '6px 10px' }}>
          <button
            className="btn"
            style={{ width: '100%' }}
            data-prueba="encajar-ritmo"
            onClick={() => {
              const s = useEd.getState();
              const r = cortesAlRitmo(s.proyecto!, 0.35);
              s.reemplazar(r.proyecto, 'cortes-al-ritmo');
              s.avisar(`${r.movidos} cortes encajados en el golpe más cercano`, 'ok');
            }}
          >
            <Ico n="rayo" s={14} /> Encajar los cortes al ritmo
          </button>
        </div>
      )}
    </div>
  );
};
