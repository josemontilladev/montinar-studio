/** Raíz del estudio de diseño: «Mis diseños» o el editor de uno (?d=<id>); ?nuevo=<formato> crea uno nuevo. */
import { useCallback, useEffect, useState } from 'react';
import { disenoNuevo, FORMATOS, type Diseno } from './esquema';
import { apiDisenos } from './api';
import { avisar, CapaUi, ElegirFormato, pedirTexto } from './Dialogos';
import { Galeria } from './Galeria';
import { Editor } from './editor/Editor';
import { AvisoSinProyecto, useSinProyecto } from './AvisoSinProyecto';

const param = (k: string) => new URLSearchParams(location.search).get(k);
const ponerUrl = (q: string) => history.replaceState(null, '', `/diseno.html${q}`);
export const irAVideo = () => (location.href = '/?inicio=1');

export function Estudio() {
  const [abierto, setAbierto] = useState<{ id: string; doc: Diseno; clave: number } | null>(null);
  const [elegir, setElegir] = useState(false);
  const [cargando, setCargando] = useState(!!param('d'));
  // sin proyecto de vídeo (otro equipo sin la carpeta dev sincronizada): el editor de vídeo no puede abrirse
  const sinProyecto = useSinProyecto();
  const aVideo = useCallback(() => {
    if (sinProyecto?.sinProyecto) {
      avisar('No hay ningún proyecto de vídeo en este equipo: mira el aviso de «Mis diseños».', 'info');
      return;
    }
    irAVideo();
  }, [sinProyecto]);

  const abrir = useCallback(async (id: string) => {
    try {
      setCargando(true);
      const doc = await apiDisenos.abrir(id);
      setAbierto({ id, doc, clave: Date.now() });
      ponerUrl(`?d=${encodeURIComponent(id)}`);
      document.title = `${doc.nombre} · Estudio de diseño`;
    } catch (e: any) {
      avisar(`No se pudo abrir el diseño: ${e.message}`, 'error');
      ponerUrl('');
    } finally {
      setCargando(false);
    }
  }, []);

  const crear = useCallback(
    async (formato: string, ancho: number, alto: number) => {
      const f = FORMATOS.find((x) => x.id === formato);
      const nombre = await pedirTexto('Nuevo diseño', 'Nombre del diseño', `${f?.nombre ?? `${ancho}×${alto}`} ${new Date().toLocaleDateString('es')}`);
      if (!nombre) return;
      try {
        const { id } = await apiDisenos.crear(disenoNuevo(nombre, formato, ancho, alto));
        await abrir(id);
      } catch (e: any) {
        avisar(e.message, 'error');
      }
    },
    [abrir],
  );

  const nuevo = useCallback(
    (formato?: string) => {
      const f = FORMATOS.find((x) => x.id === formato);
      if (f) crear(f.id, f.ancho, f.alto);
      else setElegir(true);
    },
    [crear],
  );
  const galeria = useCallback(() => {
    setAbierto(null);
    ponerUrl('');
    document.title = 'Estudio de diseño · MetricaSEO Studio';
  }, []);

  useEffect(() => {
    const d = param('d');
    const n = param('nuevo');
    if (d) abrir(d);
    else if (n) {
      ponerUrl('');
      nuevo(n);
    }
    if ((window as any).studio?.escritorio) document.documentElement.classList.add('escritorio');
  }, []);

  // para el menú de la app de escritorio (y el editor de vídeo)
  useEffect(() => {
    (window as any).__nuevoDiseno = () => nuevo();
    (window as any).__abrirDisenos = () => ((window as any).__guardar?.() ?? Promise.resolve()).finally(galeria);
  }, [nuevo, galeria]);

  return (
    <>
      {abierto ? (
        <Editor key={abierto.clave} id={abierto.id} inicial={abierto.doc} onSalir={galeria} onVideo={aVideo} onRenombrado={(id, doc) => (setAbierto({ id, doc, clave: abierto.clave }), ponerUrl(`?d=${encodeURIComponent(id)}`))} />
      ) : cargando ? (
        <div className="grid h-full place-items-center">
          <span className="loading loading-spinner text-primary" />
        </div>
      ) : (
        <Galeria onAbrir={abrir} onNuevo={nuevo} onVideo={aVideo} aviso={sinProyecto?.sinProyecto ? <AvisoSinProyecto estado={sinProyecto} /> : null} />
      )}
      {elegir ? (
        <ElegirFormato
          titulo="Nuevo diseño"
          boton="Crear diseño"
          onCerrar={() => setElegir(false)}
          onElegir={(f, w, h) => {
            setElegir(false);
            crear(f, w, h);
          }}
        />
      ) : null}
      <CapaUi />
    </>
  );
}
