/** Orden de capas, alinear / distribuir, duplicar, bloquear y eliminar. */
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Copy, Lock, LockOpen, Trash2, type LucideIcon } from 'lucide-react';
import type { Elemento } from '../esquema';
import { IconButton, Seccion } from './Campos';
import type { AlignMode, LayerMove } from './operaciones';

export type Acciones = {
  patch: (ids: string[], fn: (el: Elemento) => Elemento, mergeKey?: string) => void;
  duplicate: () => void;
  remove: () => void;
  layer: (move: LayerMove) => void;
  toggleLock: () => void;
  align: (mode: AlignMode) => void;
  distribute: (eje: 'h' | 'v') => void;
};

const ALIGN: { mode: AlignMode; label: string; Icon: LucideIcon }[] = [
  { mode: 'left', label: 'Alinear a la izquierda', Icon: AlignStartVertical },
  { mode: 'hcenter', label: 'Centrar en horizontal', Icon: AlignCenterVertical },
  { mode: 'right', label: 'Alinear a la derecha', Icon: AlignEndVertical },
  { mode: 'top', label: 'Alinear arriba', Icon: AlignStartHorizontal },
  { mode: 'vmiddle', label: 'Centrar en vertical', Icon: AlignCenterHorizontal },
  { mode: 'bottom', label: 'Alinear abajo', Icon: AlignEndHorizontal },
];
const CAPAS: { move: LayerMove; label: string; Icon: LucideIcon }[] = [
  { move: 'front', label: 'Al frente', Icon: ArrowUpToLine },
  { move: 'forward', label: 'Adelante', Icon: ArrowUp },
  { move: 'backward', label: 'Atrás', Icon: ArrowDown },
  { move: 'back', label: 'Al fondo', Icon: ArrowDownToLine },
];

const boton = 'btn btn-ghost btn-xs justify-start gap-1 whitespace-nowrap border border-base-300 px-1.5 text-[0.7rem] font-normal';

export function Organizar({ els, actions }: { els: Elemento[]; actions: Acciones }) {
  const locked = els.every((e) => e.locked);
  return (
    <>
      <Seccion title={els.length > 1 ? 'Alinear entre sí' : 'Alinear a la página'}>
        <div className="flex flex-wrap gap-1">
          {ALIGN.map(({ mode, label, Icon }) => (
            <IconButton key={mode} label={label} onClick={() => actions.align(mode)}>
              <Icon className="size-3.5" />
            </IconButton>
          ))}
          <IconButton label="Distribuir en horizontal (3 o más)" disabled={els.length < 3} onClick={() => actions.distribute('h')}>
            <AlignHorizontalDistributeCenter className="size-3.5" />
          </IconButton>
          <IconButton label="Distribuir en vertical (3 o más)" disabled={els.length < 3} onClick={() => actions.distribute('v')}>
            <AlignVerticalDistributeCenter className="size-3.5" />
          </IconButton>
        </div>
      </Seccion>
      <Seccion title="Orden">
        <div className="grid grid-cols-2 gap-1">
          {CAPAS.map(({ move, label, Icon }) => (
            <button key={move} type="button" onClick={() => actions.layer(move)} className={boton}>
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </Seccion>
      <Seccion title="Acciones">
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={actions.duplicate} className={boton} title="Ctrl+D">
            <Copy className="size-3.5" />
            Duplicar
          </button>
          <button type="button" onClick={actions.toggleLock} className={boton} data-accion="bloquear">
            {locked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
            {locked ? 'Desbloquear' : 'Bloquear'}
          </button>
          <button type="button" onClick={actions.remove} className={`${boton} text-error hover:bg-error/10`} title="Supr">
            <Trash2 className="size-3.5" />
            Eliminar
          </button>
        </div>
      </Seccion>
    </>
  );
}
