/**
 * Capa de edición directa sobre el reproductor: cajas de los textos y elementos visibles en el fotograma actual.
 * Clic = seleccionar (Ctrl = añadir), arrastrar = mover (Mayús = en un eje), asa de esquina = tamaño, asa de arriba =
 * girar (Mayús = de 15 en 15°), doble clic = editar el texto ahí mismo, clic derecho = menú.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { TElemento, TTexto } from '@contrato/esquema';
import { escenaEn, tiempoLocal } from '@contrato/linea';
import { FUENTES } from '@proyecto';
import { estaSel, nid, seleccionar, ctrlPulsado, useEd } from './estado';
import { cajaTexto } from './Revision';
import { menuElemento, menuTexto } from './menus';
import { desplazamiento } from '@contrato/kit/seguir';

type Arr = { onMove: (dx: number, dy: number, ev: PointerEvent) => void; onEnd?: () => void };
const arrastrar = (e: React.PointerEvent, a: Arr) => {
  e.stopPropagation();
  e.preventDefault();
  const x0 = e.clientX,
    y0 = e.clientY;
  const mv = (ev: PointerEvent) => a.onMove(ev.clientX - x0, ev.clientY - y0, ev);
  const up = () => {
    window.removeEventListener('pointermove', mv);
    window.removeEventListener('pointerup', up);
    a.onEnd?.();
  };
  window.addEventListener('pointermove', mv);
  window.addEventListener('pointerup', up);
};

const fam = (k: string | undefined, def: string) => (FUENTES as Record<string, string>)[k ?? def] ?? k ?? def;

const EditorEnLinea: React.FC<{ t: TTexto; escena: string; k: number; caja: { x: number; y: number; w: number; h: number } }> = ({ t, escena, k, caja }) => {
  const p = useEd((s) => s.proyecto)!;
  const [v, setV] = useState(t.texto.split(' / ').join('\n'));
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const fin = (guardar: boolean) => {
    if (guardar) {
      const nuevo = v.split('\n').map((x) => x.trim()).filter(Boolean).join(' / ');
      if (nuevo && nuevo !== t.texto) useEd.getState().editar(`txt:${escena}:${t.id}:texto`, (d) => void (d.escenas.find((e) => e.id === escena)!.textos.find((x) => x.id === t.id)!.texto = nuevo));
    }
    useEd.setState({ editando: null });
  };
  const lineas = Math.max(1, v.split('\n').length);
  return (
    <textarea
      ref={ref}
      className="edicion-linea"
      data-prueba="edicion-linea"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => fin(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') fin(false);
        else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          fin(true);
        }
      }}
      style={{
        left: t.x * k,
        top: caja.y * k,
        width: t.w * k,
        height: Math.max(caja.h, lineas * t.tam * (t.interlineado ?? 1.05)) * k + 8,
        fontSize: t.tam * k,
        lineHeight: t.interlineado ?? 1.02,
        textAlign: t.alinear,
        fontFamily: `"${fam(t.fuente, t.tipo === 'nota' ? p.ajustes.fuentes.mono : p.ajustes.fuentes.sans)}", sans-serif`,
        fontWeight: t.estilo?.peso ?? (t.tipo === 'nota' ? 500 : 650),
        textTransform: t.estilo?.mayusculas ? 'uppercase' : undefined,
      }}
      title="Intro = guardar · Mayús+Intro = nueva línea · Esc = cancelar · *palabra* = acento"
    />
  );
};

export const CapaEdicion: React.FC<{ k: number }> = ({ k }) => {
  const p = useEd((s) => s.proyecto)!;
  const l = useEd((s) => s.linea)!;
  const frame = useEd((s) => s.frame);
  const sel = useEd((s) => s.sel);
  const multi = useEd((s) => s.multi);
  const editando = useEd((s) => s.editando);
  const reproduciendo = useEd((s) => s.reproduciendo);
  const previa = useEd((s) => s.previa);
  if (reproduciendo || previa) return null;
  const textos = l.textos.filter((x) => frame >= x.inicio && frame < x.fin);
  const i = escenaEn(l, frame);
  const esc = p.escenas[i];
  const r = l.escenas[i];
  const local = frame - (r?.origen ?? 0);
  const elementos: TElemento[] =
    esc && r
      ? (esc.elementos ?? []).filter((el) => {
          const a = tiempoLocal(el.desde, r.pre, l.fps, r.frase);
          const b = el.hasta == null ? Infinity : tiempoLocal(el.hasta, r.pre, l.fps, r.frase);
          return local >= a && local < b;
        })
      : [];

  const edTexto = (escena: string, id: string, ses: string, fn: (t: TTexto) => void) => useEd.getState().editar(ses, (d) => fn(d.escenas.find((e) => e.id === escena)!.textos.find((x) => x.id === id)! as TTexto));
  const edEl = (escena: string, id: string, ses: string, fn: (t: TElemento) => void) => useEd.getState().editar(ses, (d) => fn(d.escenas.find((e) => e.id === escena)!.elementos!.find((x) => x.id === id)! as TElemento));

  /** Mover (y girar / escalar) con asas; `tipo` = qué se arrastra. */
  const asas = (escena: string, id: string, esTexto: boolean, cx: number, cy: number, base: { x: number; y: number; w: number; h: number; tam?: number; rot: number; seguir?: { f: number; x: number; y: number }[] }) => {
    const ses = `drag:visor-${id}-${nid('')}`;
    const ed = (fn: (o: any) => void) => (esTexto ? edTexto(escena, id, ses, fn as any) : edEl(escena, id, ses, fn as any));
    const fl = local;
    return {
      mover: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        seleccionar(esTexto ? { tipo: 'texto', escena, id } : { tipo: 'elemento', escena, id });
        if (ctrlPulsado()) return e.stopPropagation();
        arrastrar(e, {
          onMove: (dx, dy, ev) => {
            let mx = dx / k,
              my = dy / k;
            if (ev.shiftKey) Math.abs(mx) > Math.abs(my) ? (my = 0) : (mx = 0);
            ed((o) => {
              // con seguimiento, arrastrar corrige la clave del fotograma actual (se crea si no existe)
              if (base.seguir?.length && fl >= base.seguir[0].f && fl <= base.seguir[base.seguir.length - 1].f) {
                const d0 = desplazamiento(base.seguir, fl);
                const ks = o.seguir as { f: number; x: number; y: number }[];
                const i = ks.findIndex((q) => q.f === fl);
                const nueva = { f: fl, x: Math.round(d0.x + mx), y: Math.round(d0.y + my) };
                if (i >= 0) ks[i] = nueva;
                else ks.splice(ks.findIndex((q) => q.f > fl), 0, nueva);
                return;
              }
              o.x = Math.round(base.x + mx);
              o.y = Math.round(base.y + my);
            });
          },
        });
      },
      escalar: (e: React.PointerEvent) =>
        arrastrar(e, {
          onMove: (_dx, _dy, ev) => {
            const caja = (e.target as HTMLElement).closest('.marco-player')!.getBoundingClientRect();
            const px = (ev.clientX - caja.left) / k,
              py = (ev.clientY - caja.top) / k;
            const d0 = Math.hypot(base.w / 2, base.h / 2) || 1;
            const f = Math.max(0.1, Math.hypot(px - cx, py - cy) / d0);
            ed((o) => {
              if (esTexto) {
                o.tam = Math.max(10, Math.round(base.tam! * f));
                // el ancho del bloque crece con el texto, centrado
                const w = Math.round(base.w * f);
                o.x = Math.round(base.x + (base.w - w) / 2);
                o.w = w;
              } else {
                const w = Math.max(10, Math.round(base.w * f)),
                  h = Math.max(4, Math.round(base.h * f));
                o.x = Math.round(cx - w / 2);
                o.y = Math.round(cy - h / 2);
                o.w = w;
                o.h = h;
              }
            });
          },
        }),
      girar: (e: React.PointerEvent) =>
        arrastrar(e, {
          onMove: (_dx, _dy, ev) => {
            const caja = (e.target as HTMLElement).closest('.marco-player')!.getBoundingClientRect();
            const px = (ev.clientX - caja.left) / k,
              py = (ev.clientY - caja.top) / k;
            let a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
            if (a > 180) a -= 360;
            a = ev.shiftKey ? Math.round(a / 15) * 15 : Math.abs(a) < 3 ? 0 : Math.round(a);
            ed((o) => void (o.rot = a));
          },
        }),
    };
  };

  return (
    <div className="capa-edicion" data-prueba="capa-edicion">
      {elementos.map((el) => {
        const on = estaSel({ sel, multi }, { tipo: 'elemento', escena: esc.id, id: el.id });
        const cx = el.x + el.w / 2,
          cy = el.y + el.h / 2;
        const a = asas(esc.id, el.id, false, cx, cy, { x: el.x, y: el.y, w: el.w, h: el.h, rot: el.rot, seguir: el.seguir });
        const dd = desplazamiento(el.seguir, local);
        return (
          <div
            key={el.id}
            className={`caja-ed ${on ? 'on' : ''}`}
            data-caja={`el:${el.id}`}
            style={{ left: (el.x + dd.x) * k, top: (el.y + dd.y) * k, width: el.w * k, height: el.h * k, transform: `rotate(${el.rot}deg)` }}
            onPointerDown={a.mover}
            onContextMenu={(e) => (e.preventDefault(), e.stopPropagation(), menuElemento(e.clientX, e.clientY, esc.id, el.id))}
          >
            {on && (
              <>
                <span className="asa esq" onPointerDown={a.escalar} title="Tamaño" />
                <span className="asa giro" onPointerDown={a.girar} title="Girar (Mayús: 15°)" />
              </>
            )}
          </div>
        );
      })}
      {textos.map((x) => {
        const t = x.texto;
        const c = cajaTexto(t, p);
        const on = estaSel({ sel, multi }, { tipo: 'texto', escena: x.escena, id: t.id });
        const cx = t.x + t.w / 2,
          cy = c.y + c.h / 2;
        if (editando?.id === t.id) return <EditorEnLinea key={t.id} t={t} escena={x.escena} k={k} caja={c} />;
        const a = asas(x.escena, t.id, true, cx, cy, { x: t.x, y: t.y, w: t.w, h: c.h, tam: t.tam, rot: t.rot ?? 0, seguir: t.seguir });
        const lt = frame - (l.escenas.find((q) => q.id === x.escena)?.origen ?? 0);
        const dd = desplazamiento(t.seguir, lt);
        const pad = 6 / k;
        return (
          <div
            key={`${x.escena}/${t.id}`}
            className={`caja-ed texto ${on ? 'on' : ''}`}
            data-caja={`tx:${t.id}`}
            style={{ left: (c.x + dd.x - pad) * k, top: (c.y + dd.y - pad) * k, width: (c.w + pad * 2) * k, height: (c.h + pad * 2) * k, transform: t.rot ? `rotate(${t.rot}deg)` : undefined, transformOrigin: `${(cx - c.x + pad) * k}px ${(c.h / 2 + pad) * k}px` }}
            onPointerDown={a.mover}
            onDoubleClick={(e) => (e.stopPropagation(), useEd.setState({ editando: { escena: x.escena, id: t.id } }))}
            onContextMenu={(e) => (e.preventDefault(), e.stopPropagation(), menuTexto(e.clientX, e.clientY, x.escena, t.id))}
            title="Doble clic: editar · arrastrar: mover · clic derecho: más"
          >
            {on && (
              <>
                <span className="asa esq" onPointerDown={a.escalar} title="Tamaño" />
                <span className="asa giro" onPointerDown={a.girar} title="Girar (Mayús: 15°)" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
