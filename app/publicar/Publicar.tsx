/**
 * Panel «Publicar»: las próximas publicaciones de YouTube y LinkedIn del calendario (y las atrasadas sin publicar),
 * con vista previa, texto editable y envío: YouTube «Subir y programar»; LinkedIn «Publicar ahora» o «a su hora»
 * (cola local: la app tiene que estar abierta). Ajustes › Redes en Redes.tsx.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, Check, Copy, ExternalLink, Eye, FileText, Info, LoaderCircle, RotateCcw, Send, Settings, TriangleAlert, Upload, X } from 'lucide-react';
import { Logo } from '../marca/Logo';
import { BotonTema } from '../diseno/tema';
import { abrirUrl, bytes, dia, enEscritorio, ErrorOp, fechaHora, op, tam, urlCentro, zonaCorta, type Estado, type EstadoPub, type Evento, type Publicacion, type Red } from './api';
import { Redes } from './Redes';

const COLOR: Record<Red, string> = { youtube: '#e62117', linkedin: '#0a66c2' };
const NOMBRE_RED: Record<Red, string> = { youtube: 'YouTube', linkedin: 'LinkedIn' };
const TIPO: Record<string, string> = { video: 'Vídeo', short: 'Short', imagen: 'Post con imagen', documento: 'Carrusel (PDF)', texto: 'Solo texto' };
const ESTADO: Record<EstadoPub, { t: string; c: string }> = {
  pendiente: { t: 'Pendiente', c: 'badge-ghost' },
  atrasada: { t: 'Atrasada', c: 'badge-warning' },
  'en-cola': { t: 'En cola', c: 'badge-info' },
  subiendo: { t: 'Enviando…', c: 'badge-info' },
  programada: { t: 'Programada', c: 'badge-success' },
  publicada: { t: 'Publicada', c: 'badge-success' },
  error: { t: 'Error', c: 'badge-error' },
};

const param = (k: string) => new URLSearchParams(location.search).get(k);

export function Publicar() {
  const [vista, setVista] = useState<'publicar' | 'redes'>(param('vista') === 'redes' ? 'redes' : 'publicar');
  const [est, setEst] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ t: string; tipo: 'ok' | 'error' } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [filtroRed, setFiltroRed] = useState<'todas' | Red>('todas');
  const [rango, setRango] = useState<14 | 0>(14);

  const cargar = useCallback(async () => {
    try {
      setEst(await op<Estado>('estado'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  const avisar = useCallback((t: string, tipo: 'ok' | 'error' = 'ok') => {
    setAviso({ t, tipo });
    window.clearTimeout((avisar as any).t);
    (avisar as any).t = window.setTimeout(() => setAviso(null), tipo === 'error' ? 9000 : 4000);
  }, []);

  useEffect(() => {
    if (enEscritorio()) document.documentElement.classList.add('escritorio');
    cargar();
    // eventos del proceso principal: progreso y fin de cada envío
    let t = 0;
    (window as any).__publicar = (e: Evento) => {
      if (e.tipo === 'progreso') {
        setEst((s) => (s ? { ...s, publicaciones: s.publicaciones.map((p) => (p.id === e.id ? { ...p, estado: 'subiendo', trabajo: { etapa: e.etapa, progreso: e.progreso } } : p)) } : s));
        return;
      }
      if (e.tipo === 'fin') avisar(e.ok ? (e.avisos?.length ? 'Enviado, con avisos (míralos en la publicación)' : 'Enviado') : `Error: ${e.mensaje}`, e.ok ? 'ok' : 'error');
      window.clearTimeout(t);
      t = window.setTimeout(cargar, 150);
    };
    // la hora avanza (atrasadas, cola) y la carpeta sincronizada puede cambiar
    const i = window.setInterval(cargar, 30000);
    return () => window.clearInterval(i);
  }, [cargar, avisar]);

  const volver = () => (location.href = param('desde') === 'diseno' ? '/diseno.html' : '/');
  const zona = est?.ajustes.zonaVista ?? 'America/Caracas';

  const lista = useMemo(() => {
    if (!est) return [];
    const ahora = Date.now();
    return est.publicaciones.filter((p) => (filtroRed === 'todas' || p.red === filtroRed) && (rango === 0 || p.instante < ahora || p.instante <= ahora + rango * 864e5));
  }, [est, filtroRed, rango]);
  const elegida = lista.find((p) => p.id === sel) ?? lista[0] ?? null;

  return (
    <div className="flex h-screen flex-col bg-base-200 text-base-content">
      <header className="barra-app flex h-10 shrink-0 items-center gap-3 border-b border-base-300 bg-fondo px-4">
        <Logo />
        <span className="h-5 w-px bg-base-300" aria-hidden="true" />
        <h1 className="text-[0.95rem] font-semibold">Publicar en redes</h1>
        <div role="tablist" className="tabs tabs-box tabs-sm ml-3 bg-panel3">
          <button type="button" role="tab" className={`tab ${vista === 'publicar' ? 'tab-active' : ''}`} onClick={() => setVista('publicar')} data-tab="publicar">
            <Send className="mr-1.5 size-3.5" /> Publicar
          </button>
          <button type="button" role="tab" className={`tab ${vista === 'redes' ? 'tab-active' : ''}`} onClick={() => setVista('redes')} data-tab="redes">
            <Settings className="mr-1.5 size-3.5" /> Ajustes · Redes
          </button>
        </div>
        <span className="flex-1" />
        <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={volver}>
          <ArrowLeft className="size-4" /> {param('desde') === 'diseno' ? 'Estudio de diseño' : 'Editor'}
        </button>
        <BotonTema />
      </header>

      {aviso && (
        <div className="toast toast-end toast-bottom z-50">
          <div className={`alert ${aviso.tipo === 'error' ? 'alert-error' : 'alert-success'} max-w-md text-sm`} data-aviso>
            {aviso.t}
          </div>
        </div>
      )}

      {!enEscritorio() ? (
        <Centrado titulo="Solo en la app de escritorio">Publicar necesita la app MétricaSEO Studio: guarda las credenciales cifradas en este equipo y abre el navegador para conectar las cuentas.</Centrado>
      ) : error && !est ? (
        <Centrado titulo="No se pudo cargar">{error}</Centrado>
      ) : !est ? (
        <Centrado titulo="Cargando…">
          <LoaderCircle className="mx-auto size-5 animate-spin" />
        </Centrado>
      ) : vista === 'redes' ? (
        <Redes est={est} recargar={cargar} avisar={avisar} />
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[380px] shrink-0 flex-col border-r border-base-300 bg-fondo">
            <Cuentas est={est} irAjustes={() => setVista('redes')} />
            <div className="flex items-center gap-2 border-b border-base-300 px-3 py-2">
              <select className="select select-xs w-28" value={filtroRed} onChange={(e) => setFiltroRed(e.target.value as any)} aria-label="Red">
                <option value="todas">Todas</option>
                <option value="youtube">YouTube</option>
                <option value="linkedin">LinkedIn</option>
              </select>
              <select className="select select-xs w-36" value={rango} onChange={(e) => setRango(Number(e.target.value) as any)} aria-label="Rango">
                <option value={14}>Próximas 2 semanas</option>
                <option value={0}>Todo el plan</option>
              </select>
              <span className="ml-auto whitespace-nowrap text-[0.7rem] text-suave">{lista.length} publicaciones</span>
            </div>
            <Lista lista={lista} zona={zona} sel={elegida?.id ?? null} onSel={setSel} hechas={est.hechas} />
          </aside>
          <main className="min-w-0 flex-1 overflow-y-auto">
            <Avisos est={est} recargar={cargar} avisar={avisar} />
            {elegida ? <Detalle key={elegida.id} p={elegida} est={est} recargar={cargar} avisar={avisar} /> : <Centrado titulo="Nada por publicar">No hay publicaciones de YouTube ni LinkedIn en este rango.</Centrado>}
          </main>
        </div>
      )}
    </div>
  );
}

function Centrado({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center p-8">
      <div className="max-w-md rounded-box border border-base-300 bg-base-100 p-6 text-center">
        <h2 className="mb-2 font-semibold">{titulo}</h2>
        <div className="text-sm text-suave">{children}</div>
      </div>
    </div>
  );
}

function Punto({ red }: { red: Red }) {
  return <i className="inline-block size-2 shrink-0 rounded-full" style={{ background: COLOR[red] }} aria-hidden="true" />;
}

function Cuentas({ est, irAjustes }: { est: Estado; irAjustes: () => void }) {
  const fila = (red: Red) => {
    const c = est.cuentas[red];
    const dias = c.expira && red === 'linkedin' ? Math.floor((c.expira - Date.now()) / 864e5) : null;
    return (
      <button type="button" onClick={irAjustes} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-panel3" data-cuenta={red}>
        <Punto red={red} />
        <b className="w-16 font-semibold">{NOMBRE_RED[red]}</b>
        {c.conectada ? (
          <span className="truncate text-suave">
            {c.cuenta?.nombre ?? 'Conectada'}
            {dias != null && dias < 10 && <span className="text-warning"> · caduca en {Math.max(0, dias)} d</span>}
          </span>
        ) : (
          <span className="text-warning">{c.credenciales ? 'Sin conectar' : 'Sin configurar'} · Ajustes</span>
        )}
      </button>
    );
  };
  return (
    <div className="border-b border-base-300 p-2">
      {fila('youtube')}
      {fila('linkedin')}
    </div>
  );
}

function Lista({ lista, zona, sel, onSel, hechas }: { lista: Publicacion[]; zona: string; sel: string | null; onSel: (id: string) => void; hechas: Estado['hechas'] }) {
  const grupos = new Map<string, Publicacion[]>();
  for (const p of lista) {
    const k = dia(p.instante, zona);
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-6" data-lista>
      {[...grupos].map(([d, ps]) => (
        <section key={d}>
          <h3 className="sticky top-0 z-10 bg-fondo px-4 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-wide text-tenue">{d}</h3>
          {ps.map((p) => (
            <button key={p.id} type="button" onClick={() => onSel(p.id)} data-pub={p.id} className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-2 py-2 text-left transition ${p.id === sel ? 'bg-panel3 ring-1 ring-base-300' : 'hover:bg-panel2'}`}>
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-miniatura">{p.vistaPrevia.img ? <img src={urlCentro(p.vistaPrevia.img)} alt="" className="size-full object-cover" loading="lazy" /> : <FileText className="size-4 text-tenue" />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[0.7rem] text-suave">
                  <Punto red={p.red} /> {NOMBRE_RED[p.red]} · {TIPO[p.tipo] ?? p.formato} · {fechaHora(p.instante, zona).split(' · ')[1]}
                </span>
                <span className="block truncate text-[0.82rem] font-medium">{p.titulo}</span>
              </span>
              <span className={`badge badge-xs ${ESTADO[p.estado].c}`}>{ESTADO[p.estado].t}</span>
            </button>
          ))}
        </section>
      ))}
      {hechas.length > 0 && (
        <details className="mx-4 mt-4 text-xs">
          <summary className="cursor-pointer text-suave">Publicadas y programadas ({hechas.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {hechas.map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                {h.red && <Punto red={h.red} />}
                <span className="min-w-0 flex-1 truncate">{h.titulo}</span>
                <span className={`badge badge-xs ${ESTADO[h.estado].c}`}>{ESTADO[h.estado].t}</span>
                {h.url && (
                  <button type="button" className="link" onClick={() => abrirUrl(h.url!)}>
                    ver
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Avisos generales: sin centro de contenido, calendario sin textos y cola vencida con la app cerrada. */
function Avisos({ est, recargar, avisar }: { est: Estado; recargar: () => void; avisar: (t: string, tipo?: 'ok' | 'error') => void }) {
  const accion = async (nombre: string, id: string, ok: string) => {
    try {
      await op(nombre, { id });
      avisar(ok);
    } catch (e: any) {
      avisar(e.message, 'error');
    }
    recargar();
  };
  return (
    <div className="space-y-2 px-6 pt-4 empty:hidden">
      {!est.carpetaCentro && (
        <div role="alert" className="alert alert-warning text-sm">
          <TriangleAlert className="size-4" />
          <span>
            No encuentro el calendario (calendario-data.json) en: {est.carpetasBuscadas.join(' · ')}. Espera a que la carpeta <b>dev</b> termine de sincronizar o elige otra carpeta en Ajustes · Redes.
          </span>
        </div>
      )}
      {est.carpetaCentro && !est.conTextos && (
        <div role="alert" className="alert alert-warning text-sm">
          <TriangleAlert className="size-4" />
          <span>
            El calendario no trae los textos completos. En metricaseo-promo: <code>node --no-warnings scripts/v4/calendario.mjs && node --no-warnings scripts/v4/centro.mjs</code>
          </span>
        </div>
      )}
      {est.atrasadasCola.length > 0 && (
        <div role="alert" className="alert alert-warning items-start text-sm" data-atrasadas-cola>
          <TriangleAlert className="mt-0.5 size-4" />
          <div className="flex-1">
            <b>{est.atrasadasCola.length === 1 ? 'Una publicación de LinkedIn venció' : `${est.atrasadasCola.length} publicaciones de LinkedIn vencieron`} con la app cerrada.</b> No se publican solas: confirma cada una.
            <ul className="mt-2 space-y-1">
              {est.atrasadasCola.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {a.titulo} · era el {fechaHora(a.instante, est.ajustes.zonaVista)}
                  </span>
                  <button type="button" className="btn btn-xs btn-primary" onClick={() => accion('linkedin-publicar', a.id, 'Publicando en LinkedIn…')}>
                    Publicar ahora
                  </button>
                  <button type="button" className="btn btn-xs" onClick={() => accion('linkedin-desencolar', a.id, 'Quitada de la cola')}>
                    Quitar de la cola
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Detalle({ p, est, recargar, avisar }: { p: Publicacion; est: Estado; recargar: () => void; avisar: (t: string, tipo?: 'ok' | 'error') => void }) {
  const [titulo, setTitulo] = useState(p.titulo);
  const [texto, setTexto] = useState(p.texto);
  const [comentario, setComentario] = useState(p.comentario);
  const [lista, setLista] = useState(p.lista ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [listasYT, setListasYT] = useState<string[]>([]);
  const sucio = titulo !== p.titulo || texto !== p.texto || comentario !== p.comentario || lista !== (p.lista ?? '');
  const guardando = useRef<Promise<unknown> | null>(null);
  const zona = est.ajustes.zonaVista;
  const cuenta = est.cuentas[p.red];
  const enviando = p.estado === 'subiendo' || !!p.trabajo;
  const hecho = p.estado === 'publicada' || p.estado === 'programada';
  const ahora = Date.now();
  const pasada = p.instante - ahora < 15 * 60 * 1000;

  useEffect(() => {
    if (p.red === 'youtube' && cuenta.conectada)
      op<{ listas: string[] }>('listas-youtube')
        .then((r) => setListasYT(r.listas))
        .catch(() => {});
  }, [p.red, cuenta.conectada]);

  const guardar = async () => {
    if (!sucio) return;
    guardando.current = op('editar', { id: p.id, cambios: { titulo, texto, comentario, lista } });
    await guardando.current;
    recargar();
  };
  const restablecer = async () => {
    await op('restablecer', { id: p.id });
    setTitulo(p.original.titulo);
    setTexto(p.original.texto);
    setComentario(p.original.comentario);
    setLista(p.original.lista ?? '');
    recargar();
  };
  const hacer = async (nombre: string, datos: Record<string, unknown> = {}, ok = '') => {
    setOcupado(true);
    try {
      await guardar();
      await op(nombre, { id: p.id, ...datos });
      if (ok) avisar(ok);
    } catch (e: any) {
      if (e instanceof ErrorOp && e.codigo === 'confirmar') {
        if (window.confirm(`${e.message}\n\n¿Subir y publicar en YouTube ahora mismo?`)) return hacer(nombre, { ...datos, confirmarAhora: true }, ok);
      } else avisar(e.message, 'error');
    } finally {
      setOcupado(false);
      recargar();
    }
  };
  const copiar = (t: string) => navigator.clipboard.writeText(t).then(() => avisar('Copiado'));

  const lim = p.red === 'youtube' ? { titulo: 100, texto: 5000 } : { titulo: 200, texto: 3000 };
  const usoTexto = p.red === 'youtube' ? bytes(texto) : [...texto].length;

  return (
    <div className="mx-auto max-w-5xl p-6" data-detalle={p.id}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="badge gap-1.5 border-base-300 bg-base-100">
          <Punto red={p.red} /> {NOMBRE_RED[p.red]} · {TIPO[p.tipo] ?? p.formato}
        </span>
        <span className={`badge ${ESTADO[p.estado].c}`} data-estado>
          {ESTADO[p.estado].t}
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          <CalendarClock className="size-4 text-suave" />
          <b>{fechaHora(p.instante, zona)}</b>
          <span className="text-suave">({zonaCorta(zona, p.instante)})</span>
        </span>
        <span className="text-xs text-tenue" title="Las horas del calendario están en esta zona; se cambia en Ajustes · Redes">
          calendario: {p.hora} {zonaCorta(p.zona, p.instante)}
        </span>
        {p.editada && <span className="badge badge-outline badge-sm">Texto editado</span>}
      </div>

      {p.trabajo && (
        <div className="mb-4 rounded-box border border-base-300 bg-base-100 p-3" data-progreso>
          <div className="mb-1.5 flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" /> {p.trabajo.etapa}
            {p.trabajo.progreso != null && <span className="text-suave">{Math.round(p.trabajo.progreso * 100)} %</span>}
            <button type="button" className="btn btn-ghost btn-xs ml-auto" onClick={() => op('cancelar', { id: p.id })}>
              Cancelar
            </button>
          </div>
          <progress className="progress progress-success w-full" value={p.trabajo.progreso != null ? p.trabajo.progreso * 100 : undefined} max={100} />
        </div>
      )}
      {p.estado === 'error' && p.mensaje && (
        <div role="alert" className="alert alert-error mb-4 text-sm" data-error>
          <TriangleAlert className="size-4" />
          <span>{p.mensaje}</span>
        </div>
      )}
      {p.avisos.length > 0 && (
        <div role="alert" className="alert alert-warning mb-4 items-start text-sm">
          <Info className="mt-0.5 size-4" />
          <ul className="list-disc space-y-1 pl-4">
            {p.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {p.url && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Check className="size-4 text-success" /> {p.estado === 'programada' ? 'Subido y programado:' : 'Publicado:'}
          <button type="button" className="link" onClick={() => abrirUrl(p.url!)}>
            {p.url}
          </button>
          {p.studio && (
            <button type="button" className="btn btn-ghost btn-xs gap-1" onClick={() => abrirUrl(p.studio!)}>
              <ExternalLink className="size-3" /> YouTube Studio
            </button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <Vista p={p} />
          <div className="rounded-box border border-base-300 bg-base-100 p-3 text-xs">
            <h4 className="mb-2 font-semibold">Archivos (centro de contenido)</h4>
            <ul className="space-y-1">
              {p.archivos.map((a) => (
                <li key={a.rel} className="flex items-center gap-1.5">
                  {a.existe ? <Check className="size-3 shrink-0 text-success" /> : <X className="size-3 shrink-0 text-error" />}
                  <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" title={a.rel} onClick={() => op('mostrar-archivo', { rel: a.rel })}>
                    {a.etiqueta}
                  </button>
                  <span className="text-tenue">{a.existe ? tam(a.tam) : 'falta'}</span>
                </li>
              ))}
            </ul>
            {p.faltan.length > 0 && <p className="mt-2 text-warning">Faltan archivos: espera a que la carpeta dev termine de sincronizar.</p>}
            {p.red === 'linkedin' && p.tipo === 'documento' && (
              <button type="button" className="btn btn-xs mt-3 gap-1" disabled={ocupado} onClick={() => hacer('vista-pdf', {}, 'PDF creado')}>
                <Eye className="size-3" /> Ver el PDF ({p.imagenes?.length} páginas)
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-semibold">
              {p.red === 'youtube' ? 'Título de YouTube' : p.tipo === 'documento' ? 'Título del documento' : 'Título (solo para ti y el vídeo)'}
              <span className={[...titulo].length > lim.titulo ? 'text-error' : 'text-tenue'}>
                {[...titulo].length}/{lim.titulo}
              </span>
            </span>
            <input className="input input-sm w-full" value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={guardar} disabled={hecho || enviando} data-campo="titulo" />
          </label>
          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-semibold">
              {p.red === 'youtube' ? 'Descripción (con enlaces UTM y hashtags)' : 'Texto del post'}
              <span className={usoTexto > lim.texto ? 'text-error' : 'text-tenue'}>
                {usoTexto}/{lim.texto} {p.red === 'youtube' ? 'bytes' : ''}
              </span>
            </span>
            <textarea className="textarea textarea-sm h-64 w-full font-[inherit] leading-relaxed" value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={guardar} disabled={hecho || enviando} data-campo="texto" />
          </label>
          {p.red === 'youtube' && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Lista de reproducción (si existe en el canal con ese nombre)</span>
              <input className="input input-sm w-full" list="listas-yt" value={lista} onChange={(e) => setLista(e.target.value)} onBlur={guardar} placeholder="Sin lista" disabled={hecho || enviando} data-campo="lista" />
              <datalist id="listas-yt">
                {listasYT.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </label>
          )}
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs font-semibold">
              {p.red === 'youtube' ? 'Comentario para fijar (a mano, cuando el vídeo sea público)' : 'Primer comentario (se pone al publicar)'}
              <button type="button" className="btn btn-ghost btn-xs gap-1" onClick={() => copiar(comentario)} disabled={!comentario}>
                <Copy className="size-3" /> Copiar
              </button>
            </span>
            <textarea className="textarea textarea-sm h-20 w-full font-[inherit]" value={comentario} onChange={(e) => setComentario(e.target.value)} onBlur={guardar} disabled={hecho || enviando} data-campo="comentario" />
          </label>
          {p.red === 'youtube' && p.etiquetas && <p className="text-xs text-suave">Etiquetas: {p.etiquetas.join(', ') || '—'} · Categoría y «no es para niños» en Ajustes · Redes.</p>}

          <div className="flex flex-wrap items-center gap-2 border-t border-base-300 pt-4">
            {p.red === 'youtube' && (!hecho || (p.subidoYa && p.avisos.length > 0)) && (
              <button type="button" className="btn-marca" disabled={ocupado || enviando || !cuenta.conectada || !p.video} onClick={() => hacer('youtube-subir', {}, 'Subiendo a YouTube…')} data-accion="youtube-subir">
                {p.subidoYa ? 'Reintentar lo que faltó' : pasada ? 'Subir y publicar ya' : 'Subir y programar'}
                <span className="btn-marca-ico">
                  <Upload className="size-3.5" />
                </span>
              </button>
            )}
            {p.red === 'linkedin' && !hecho && (
              <>
                <button type="button" className="btn-marca" disabled={ocupado || enviando || !cuenta.conectada} onClick={() => window.confirm('¿Publicar en LinkedIn ahora mismo?') && hacer('linkedin-publicar', {}, 'Publicando en LinkedIn…')} data-accion="linkedin-publicar">
                  Publicar ahora
                  <span className="btn-marca-ico">
                    <Send className="size-3.5" />
                  </span>
                </button>
                {p.enCola ? (
                  <button type="button" className="btn btn-sm" disabled={ocupado || enviando} onClick={() => hacer('linkedin-desencolar', {}, 'Quitada de la cola')} data-accion="linkedin-desencolar">
                    Quitar de la cola
                  </button>
                ) : (
                  <button type="button" className="btn btn-sm gap-1.5" disabled={ocupado || enviando || !cuenta.conectada || p.instante <= ahora} onClick={() => hacer('linkedin-encolar', {}, `En cola: se publicará el ${fechaHora(p.instante, zona)} si la app está abierta`)} data-accion="linkedin-encolar">
                    <CalendarClock className="size-4" /> Publicar a su hora
                  </button>
                )}
              </>
            )}
            {!cuenta.conectada && !hecho && <span className="text-xs text-warning">Conecta {NOMBRE_RED[p.red]} en Ajustes · Redes.</span>}
            <span className="flex-1" />
            {p.editada && !hecho && (
              <button type="button" className="btn btn-ghost btn-xs gap-1" onClick={restablecer}>
                <RotateCcw className="size-3" /> Texto del calendario
              </button>
            )}
            {hecho || p.estado === 'error' ? (
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => window.confirm('¿Volver a «pendiente»? (no borra nada de la red)') && hacer('marcar', { estado: 'pendiente' })}>
                Marcar como pendiente
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => window.confirm('¿Marcar como publicada (la publicaste a mano)?') && hacer('marcar', { estado: 'publicada' })}>
                Marcar como publicada
              </button>
            )}
          </div>
          {p.red === 'linkedin' && !hecho && (
            <p className="flex items-start gap-1.5 text-xs text-suave">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                LinkedIn no permite programar por API: «Publicar a su hora» deja el post en una cola de este equipo y lo publica a la hora <b>solo si MétricaSEO Studio está abierto</b> (el equipo no se suspende mientras haya cola). Si la hora pasa con la app cerrada, al abrirla te pedirá confirmación.
              </span>
            </p>
          )}
          {p.red === 'youtube' && !hecho && (
            <p className="flex items-start gap-1.5 text-xs text-suave">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>YouTube programa el vídeo en sus servidores (privado hasta la hora, luego público): no hace falta tener la app abierta. Se sube el vídeo, la miniatura, los subtítulos .srt en español y, si existe, la lista.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Vista({ p }: { p: Publicacion }) {
  const vertical = p.tipo === 'short' || /9x16/.test(p.video ?? '');
  if (p.video && p.red === 'linkedin')
    return <video src={urlCentro(p.video)} poster={p.vistaPrevia.img ? urlCentro(p.vistaPrevia.img) : undefined} controls className={`w-full rounded-box border border-base-300 bg-black ${vertical ? 'aspect-[9/16]' : 'aspect-video'}`} />;
  if (p.red === 'youtube')
    return (
      <div className="space-y-2">
        {p.miniatura && <img src={urlCentro(p.miniatura)} alt="Miniatura" className={`w-full rounded-box border border-base-300 object-cover ${vertical ? 'aspect-[9/16]' : 'aspect-video'}`} />}
        {p.video && <video src={urlCentro(p.video)} controls preload="metadata" className={`w-full rounded-box border border-base-300 bg-black ${vertical ? 'aspect-[9/16]' : 'aspect-video'}`} />}
      </div>
    );
  const imgs = p.imagenes ?? [];
  if (!imgs.length) return null;
  return (
    <div className="space-y-2">
      <img src={urlCentro(imgs[0])} alt={p.alt ?? ''} className="w-full rounded-box border border-base-300" />
      {imgs.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5">
          {imgs.slice(1).map((f) => (
            <img key={f} src={urlCentro(f)} alt="" className="aspect-[4/5] w-full rounded-md border border-base-300 object-cover" loading="lazy" />
          ))}
        </div>
      )}
    </div>
  );
}
