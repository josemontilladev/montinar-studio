/** Barra de título: menú, guardado automático, nombre del proyecto centrado, voz, revisión y Exportar. */
import React, { useEffect, useState } from 'react';
import { useEd } from './estado';
import { api } from './api';
import { Ico } from './iconos';
import { guardarAhora } from './guardado';
import { buscarActualizaciones } from './Actualizacion';

/** Puente con la app de escritorio (preload de Electron); en el navegador no existe. */
export const studio: undefined | { escritorio: true; accion: (a: string, x?: unknown) => Promise<any> } = (window as any).studio;

type Item = { et: string; ico?: string; kbd?: string; fn?: () => void; off?: boolean; sub?: Item[] } | 'sep';

const MenuFlot: React.FC<{ x: number; y: number; items: Item[]; cerrar: () => void }> = ({ x, y, items, cerrar }) => {
  const [sub, setSub] = useState<null | { y: number; items: Item[] }>(null);
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 79 }} onPointerDown={cerrar} />
      <div className="menu-flot" style={{ left: x, top: y }} data-prueba="menu">
        {items.map((it, i) =>
          it === 'sep' ? (
            <hr key={i} />
          ) : (
            <button
              key={i}
              disabled={it.off}
              onMouseEnter={(e) => setSub(it.sub ? { y: (e.currentTarget as HTMLElement).getBoundingClientRect().top - 5, items: it.sub } : null)}
              onClick={() => {
                if (it.sub) return;
                cerrar();
                it.fn?.();
              }}
            >
              {it.ico ? <Ico n={it.ico} s={15} /> : <span style={{ width: 15 }} />}
              {it.et}
              {it.kbd && <kbd>{it.kbd}</kbd>}
              {it.sub && <Ico n="adelante" s={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ),
        )}
      </div>
      {sub && (
        <div className="menu-flot" style={{ left: x + 232, top: sub.y, zIndex: 81 }}>
          {sub.items.map((it, i) =>
            it === 'sep' ? (
              <hr key={i} />
            ) : (
              <button
                key={i}
                disabled={it.off}
                onClick={() => {
                  cerrar();
                  it.fn?.();
                }}
              >
                {it.et}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
};

export const BarraTitulo: React.FC = () => {
  const p = useEd((s) => s.proyecto)!;
  const { pasado, futuro, guardado, ultimoGuardado, errorGuardado, editar, deshacer, rehacer, frame, formatoVista } = useEd();
  const [menu, setMenu] = useState<null | { x: number; y: number }>(null);
  const [recientes, setRecientes] = useState<string[]>([]);
  useEffect(() => {
    studio?.accion('recientes').then((r) => setRecientes(r ?? [])).catch(() => {});
  }, [menu]);
  const hora = ultimoGuardado ? new Date(ultimoGuardado).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '';
  const dlg = (d: any) => useEd.setState({ dialogo: d });
  const fotograma = async () => {
    try {
      await guardarAhora();
      await api.fotograma({ proyecto: useEd.getState().proyecto, formato: formatoVista, frame, nombre: p.nombre });
      useEd.getState().avisar(`Renderizando el fotograma ${frame}…`);
    } catch (e: any) {
      useEd.getState().avisar(e.message, 'error');
    }
  };
  const items: Item[] = [
    { et: 'Inicio (proyectos y plantillas)', ico: 'plantillas', fn: () => dlg('inicio') },
    { et: 'Grabar pantalla y cámara…', ico: 'monitor', fn: () => dlg('grabar') },
    'sep',
    ...(studio
      ? ([
          { et: 'Abrir proyecto…', ico: 'carpeta', kbd: 'Ctrl+O', fn: () => studio!.accion('abrir') },
          { et: 'Proyectos recientes', ico: 'versiones', sub: recientes.length ? recientes.map((r) => ({ et: r, fn: () => studio!.accion('abrir', r) })) : [{ et: '(ninguno)', off: true }] },
          'sep',
        ] as Item[])
      : []),
    { et: 'Guardar y crear versión', ico: 'okCirc', kbd: 'Ctrl+S', fn: () => guardarAhora(true, 'manual').then(() => useEd.getState().avisar('Guardado · versión creada', 'ok')) },
    { et: 'Versiones…', ico: 'versiones', fn: () => dlg('versiones') },
    'sep',
    { et: 'Exportar…', ico: 'exportar', kbd: 'Ctrl+E', fn: () => dlg('exportar') },
    { et: 'Exportar fotograma (PNG)', ico: 'fotograma', fn: fotograma },
    ...(studio ? ([{ et: 'Abrir carpeta de salida', ico: 'carpeta', fn: () => studio!.accion('salida') }] as Item[]) : []),
    'sep',
    { et: 'Deshacer', ico: 'deshacer', kbd: 'Ctrl+Z', fn: deshacer, off: !pasado.length },
    { et: 'Rehacer', ico: 'rehacer', kbd: 'Ctrl+Y', fn: rehacer, off: !futuro.length },
    'sep',
    { et: 'Revisión de calidad', ico: 'revision', fn: () => dlg('revision') },
    { et: 'Dependencias', ico: 'ajustes', fn: () => dlg('dependencias') },
    { et: 'Atajos de teclado', ico: 'teclado', kbd: '?', fn: () => dlg('atajos') },
    ...(studio ? ([{ et: 'Buscar actualizaciones', ico: 'regenerar', fn: () => buscarActualizaciones() }] as Item[]) : []),
    ...(studio ? (['sep', { et: 'Salir', ico: 'cerrar', fn: () => studio!.accion('salir') }] as Item[]) : []),
  ];
  return (
    <header className={`titulo ${studio ? 'escritorio' : ''}`} data-prueba="titulo">
      <div className="marca">
        <img src="/__studio/icon.png" alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        MétricaSEO Studio
      </div>
      <button className="btn chico" style={{ marginLeft: 6 }} onClick={(e) => setMenu({ x: (e.currentTarget as HTMLElement).getBoundingClientRect().left, y: 36 })} data-prueba="menu-btn">
        Menú <Ico n="abajo" s={13} />
      </button>
      <ProgresoExportar />
      <div className={`auto ${guardado}`} title={errorGuardado ?? 'Guardado automático en proyecto.json'} data-prueba="guardado">
        <Ico n={guardado === 'error' ? 'cerrar' : 'okCirc'} s={14} />
        {guardado === 'guardado' ? `Guardado automático ${hora}` : guardado === 'guardando' ? 'Guardando…' : guardado === 'pendiente' ? 'Cambios sin guardar…' : `Error al guardar: ${errorGuardado ?? ''}`.slice(0, 50)}
      </div>
      <div className="centro-t">
        <input type="text" value={p.nombre} onChange={(e) => editar("nombre", (d) => void (d.nombre = e.target.value))} title="Nombre del proyecto" />
      </div>
      <div className="der">
        <button className="btn icono chico plano" title="Deshacer (Ctrl+Z)" disabled={!pasado.length} onClick={deshacer} data-prueba="deshacer">
          <Ico n="deshacer" />
        </button>
        <button className="btn icono chico plano" title="Rehacer (Ctrl+Y)" disabled={!futuro.length} onClick={rehacer} data-prueba="rehacer">
          <Ico n="rehacer" />
        </button>
        <span className="sep" />
        <button className={`btn chico ${p.voz.activa === false ? '' : 'activo'}`} data-prueba="voz-activa" title="Voz en off activada / desactivada (se conserva; sin voz la música no se agacha)" onClick={() => editar('voz-activa', (d) => void (d.voz.activa = d.voz.activa === false))}>
          <Ico n={p.voz.activa === false ? 'mudo' : 'voz'} s={14} /> Voz
        </button>
        <button className="btn chico" onClick={() => dlg('revision')} title="Revisión de calidad" data-prueba="abrir-revision">
          <Ico n="revision" s={14} /> Revisión
        </button>
        <button className="btn chico" onClick={() => dlg('atajos')} title="Atajos de teclado">
          <Ico n="teclado" s={14} /> Atajos
        </button>
        <button className="btn chico prim" style={{ height: 28, padding: '0 14px' }} onClick={() => dlg('exportar')} data-prueba="exportar">
          <Ico n="exportar" s={15} /> Exportar
        </button>
      </div>
      {menu && <MenuFlot x={menu.x} y={menu.y} items={items} cerrar={() => setMenu(null)} />}
    </header>
  );
};


/** Exportaciones en segundo plano: progreso en la barra de título (se puede seguir editando). */
const ProgresoExportar: React.FC = () => {
  const ts = useEd((s) => s.trabajos);
  const corr = ts.filter((t) => t.tipo === 'exportar' && t.estado === 'corriendo');
  if (!corr.length) return null;
  const activo = corr.find((t) => !t.etapa.startsWith('En cola')) ?? corr[0];
  const p = Math.round(activo.progreso * 100);
  return (
    <div className="prog-titulo" title={`${activo.titulo} · ${activo.etapa}`} data-prueba="progreso-exportar">
      <Ico n="exportar" s={13} />
      <span>
        Exportando {p} %{corr.length > 1 ? ` · ${corr.length - 1} en cola` : ''}
      </span>
      <i>
        <b style={{ width: `${p}%` }} />
      </i>
    </div>
  );
};
