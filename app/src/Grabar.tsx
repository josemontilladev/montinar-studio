/**
 * Grabar pantalla y cámara dentro de la app: pantalla o ventana (en la app de escritorio se elige con miniaturas),
 * cámara opcional en una esquina (imagen sobre imagen) y micrófono. Al parar, la grabación se sube al proyecto, se
 * convierte a MP4 (H.264 + AAC) en segundo plano y aparece en Medios.
 */
import React, { useEffect, useRef, useState } from 'react';
import { fondoCierra } from './campos';
import { useEd } from './estado';
import { api } from './api';
import { Ico } from './iconos';
import { accion, enEscritorio } from './escritorio';

type Fuente = { id: string; nombre: string; miniatura: string; tipo: 'screen' | 'window' };
type Modo = 'pantalla' | 'camara';
const ESQUINAS = { 'abajo-der': 'Abajo derecha', 'abajo-izq': 'Abajo izquierda', 'arriba-der': 'Arriba derecha', 'arriba-izq': 'Arriba izquierda' } as const;

export const DGrabar: React.FC = () => {
  const cerrar = () => useEd.setState({ dialogo: null });
  const [modo, setModo] = useState<Modo>('pantalla');
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [fuente, setFuente] = useState<string | null>(null);
  const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [camara, setCamara] = useState<string>('');
  const [mic, setMic] = useState<string>('');
  const [conCam, setConCam] = useState(true);
  const [conMic, setConMic] = useState(true);
  const [esquina, setEsquina] = useState<keyof typeof ESQUINAS>('abajo-der');
  const [estado, setEstado] = useState<'listo' | 'grabando' | 'subiendo'>('listo');
  const [seg, setSeg] = useState(0);
  const vista = useRef<HTMLVideoElement>(null);
  const rec = useRef<{ mr: MediaRecorder; parar: () => void } | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  useEffect(() => {
    if (estado === 'grabando' && vista.current && flujo.current) {
      vista.current.srcObject = flujo.current;
      vista.current.play().catch(() => {});
    }
  }, [estado]);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((ds) => {
        setCamaras(ds.filter((d) => d.kind === 'videoinput'));
        setMics(ds.filter((d) => d.kind === 'audioinput'));
      })
      .catch(() => {});
    if (enEscritorio())
      accion('fuentes-pantalla').then((l: Fuente[] | null) => {
        setFuentes(l ?? []);
        if (l?.length) setFuente(l[0].id);
      });
  }, []);

  const empezar = async () => {
    try {
      const pistas: MediaStream[] = [];
      let pantalla: MediaStream | null = null;
      if (modo === 'pantalla') {
        if (enEscritorio() && fuente) await accion('elegir-fuente', fuente);
        pantalla = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
        pistas.push(pantalla);
      }
      const cam = (modo === 'camara' || conCam) && camaras.length ? await navigator.mediaDevices.getUserMedia({ video: { deviceId: camara || undefined, width: 1280, height: 720 } }) : null;
      const micro = conMic && mics.length ? await navigator.mediaDevices.getUserMedia({ audio: { deviceId: mic || undefined, echoCancellation: true, noiseSuppression: true } }) : null;
      // composición en un lienzo: pantalla de fondo y cámara en una esquina (o solo la cámara)
      const vP = pantalla ? Object.assign(document.createElement('video'), { srcObject: pantalla, muted: true }) : null;
      const vC = cam ? Object.assign(document.createElement('video'), { srcObject: cam, muted: true }) : null;
      await Promise.all([vP?.play(), vC?.play()]);
      const base = vP ?? vC!;
      await new Promise((r) => setTimeout(r, 200));
      const W = base.videoWidth || 1280,
        H = base.videoHeight || 720;
      const lienzo = Object.assign(document.createElement('canvas'), { width: W - (W % 2), height: H - (H % 2) });
      const ctx = lienzo.getContext('2d')!;
      let vivo = true;
      const dibujar = () => {
        if (!vivo) return;
        ctx.drawImage(base, 0, 0, lienzo.width, lienzo.height);
        if (vP && vC) {
          const cw = Math.round(lienzo.width * 0.24),
            ch = Math.round((cw * (vC.videoHeight || 720)) / (vC.videoWidth || 1280));
          const m = Math.round(lienzo.width * 0.02);
          const x = esquina.endsWith('der') ? lienzo.width - cw - m : m;
          const y = esquina.startsWith('abajo') ? lienzo.height - ch - m : m;
          ctx.save();
          ctx.beginPath();
          (ctx as any).roundRect?.(x, y, cw, ch, Math.round(cw * 0.06)) ?? ctx.rect(x, y, cw, ch);
          ctx.clip();
          ctx.drawImage(vC, x, y, cw, ch);
          ctx.restore();
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.strokeRect(x, y, cw, ch);
        }
        requestAnimationFrame(dibujar);
      };
      dibujar();
      const salida = lienzo.captureStream(30);
      if (micro) for (const t of micro.getAudioTracks()) salida.addTrack(t);
      flujo.current = salida;
      const tipo = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';
      const mr = new MediaRecorder(salida, { mimeType: tipo, videoBitsPerSecond: 8_000_000 });
      const trozos: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && trozos.push(e.data);
      const t0 = Date.now();
      const reloj = setInterval(() => setSeg(Math.round((Date.now() - t0) / 1000)), 500);
      const parar = () => {
        clearInterval(reloj);
        vivo = false;
        for (const s of [pantalla, cam, micro, ...pistas]) s?.getTracks().forEach((t) => t.stop());
      };
      mr.onstop = async () => {
        parar();
        setEstado('subiendo');
        const d = new Date();
        const p2 = (n: number) => String(n).padStart(2, '0');
        const nombre = `grabacion-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}.webm`;
        const f = new File(trozos, nombre, { type: 'video/webm' });
        try {
          const r = await api.subir(f, 'grabaciones');
          await fetch('/api/grabacion/convertir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruta: r.ruta }) });
          useEd.getState().avisar('Grabación guardada: se está convirtiendo a MP4 y aparecerá en Medios', 'ok');
          cerrar();
        } catch (e: any) {
          useEd.getState().avisar(`No se pudo guardar la grabación: ${e.message}`, 'error');
          setEstado('listo');
        }
      };
      // si el usuario corta la captura desde el sistema, se para la grabación
      pantalla?.getVideoTracks()[0]?.addEventListener('ended', () => mr.state === 'recording' && mr.stop());
      mr.start(1000);
      rec.current = { mr, parar };
      setEstado('grabando');
    } catch (e: any) {
      useEd.getState().avisar(`No se pudo empezar a grabar: ${e.message}`, 'error');
    }
  };

  return (
    <div className="velo" {...fondoCierra(() => estado === 'listo' && cerrar())}>
      <div className="dialogo" style={{ width: 720 }} data-prueba="dialogo-grabar">
        <div className="cab">
          <h3>Grabar pantalla y cámara</h3>
          {estado === 'listo' && (
            <button className="btn icono chico" onClick={cerrar}>
              <Ico n="cerrar" />
            </button>
          )}
        </div>
        <div className="cuerpo" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {estado === 'listo' ? (
            <>
              <div className="seg">
                <button className={modo === 'pantalla' ? 'on' : ''} onClick={() => setModo('pantalla')} data-modo="pantalla">
                  Pantalla o ventana
                </button>
                <button className={modo === 'camara' ? 'on' : ''} onClick={() => setModo('camara')} data-modo="camara">
                  Solo cámara
                </button>
              </div>
              {modo === 'pantalla' && enEscritorio() && (
                <div className="fuentes-pantalla">
                  {fuentes.map((f) => (
                    <button key={f.id} className={fuente === f.id ? 'on' : ''} onClick={() => setFuente(f.id)} title={f.nombre}>
                      <img src={f.miniatura} alt="" />
                      <span>{f.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
              {modo === 'pantalla' && !enEscritorio() && <div className="ayuda">Al empezar, el navegador pregunta qué pantalla o ventana grabar.</div>}
              <div className="fila" style={{ gap: 10, flexWrap: 'wrap' }}>
                {modo === 'pantalla' && (
                  <label className="fila" style={{ gap: 6 }}>
                    <input type="checkbox" checked={conCam} onChange={(e) => setConCam(e.target.checked)} disabled={!camaras.length} /> Cámara en una esquina
                  </label>
                )}
                {(conCam || modo === 'camara') && camaras.length > 0 && (
                  <select value={camara} onChange={(e) => setCamara(e.target.value)} style={{ width: 200 }}>
                    {camaras.map((c, i) => (
                      <option key={c.deviceId || i} value={c.deviceId}>
                        {c.label || `Cámara ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                {modo === 'pantalla' && conCam && (
                  <select value={esquina} onChange={(e) => setEsquina(e.target.value as any)} style={{ width: 150 }}>
                    {Object.entries(ESQUINAS).map(([k, n]) => (
                      <option key={k} value={k}>
                        {n}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="fila" style={{ gap: 10 }}>
                <label className="fila" style={{ gap: 6 }}>
                  <input type="checkbox" checked={conMic} onChange={(e) => setConMic(e.target.checked)} disabled={!mics.length} /> Micrófono
                </label>
                {conMic && mics.length > 0 && (
                  <select value={mic} onChange={(e) => setMic(e.target.value)} style={{ width: 240 }}>
                    {mics.map((c, i) => (
                      <option key={c.deviceId || i} value={c.deviceId}>
                        {c.label || `Micrófono ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                {!mics.length && <span className="ayuda">No se encontró micrófono</span>}
              </div>
              <div className="fila" style={{ justifyContent: 'flex-end' }}>
                <button className="btn prim" onClick={empezar} data-prueba="empezar-grabar" disabled={modo === 'camara' && !camaras.length}>
                  <Ico n="voz" s={14} /> Empezar a grabar
                </button>
              </div>
            </>
          ) : (
            <>
              <video ref={vista} muted playsInline style={{ width: '100%', maxHeight: 360, background: '#000', borderRadius: 8 }} />
              <div className="fila" style={{ justifyContent: 'space-between' }}>
                <span className="rec-indicador">
                  <i /> {estado === 'grabando' ? `Grabando ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}` : 'Guardando…'}
                </span>
                {estado === 'grabando' && (
                  <button className="btn prim" onClick={() => rec.current?.mr.stop()} data-prueba="parar-grabar">
                    Parar y guardar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
