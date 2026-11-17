/** Panel derecho: propiedades de la selección (o atajos si no hay nada seleccionado). */
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import type { ElArte, ElForma, Elemento, ElImagen, ElTexto, Pagina } from '../esquema';
import { artKey, getArt, parseArtKey } from './biblioteca';
import { ColorField, IconButton, NumberField, Seccion, Selector } from './Campos';
import { Organizar, type Acciones } from './Organizar';
import { fitText } from './operaciones';

type Patch = (fn: (el: Elemento) => Elemento, mergeKey?: string) => void;
const NOMBRE = { art: 'Ilustración', shape: 'Forma', text: 'Texto', image: 'Imagen' };

const ATAJOS: [string, string][] = [
  ['Ctrl + Z / Ctrl + Y', 'deshacer / rehacer'],
  ['Ctrl + C / Ctrl + V', 'copiar / pegar'],
  ['Ctrl + D', 'duplicar'],
  ['Supr', 'eliminar'],
  ['Flechas', 'mover (Mayús: 10 px)'],
  ['Mayús', 'proporción / ángulos de 15°'],
  ['Alt', 'arrastrar sin imanes'],
  ['Ctrl + rueda', 'zoom'],
  ['Ctrl + S', 'guardar'],
];

export function Propiedades({ pagina, selected, actions }: { pagina: Pagina; selected: string[]; actions: Acciones }) {
  const els = pagina.elements.filter((e) => selected.includes(e.id));
  if (els.length === 0)
    return (
      <div className="space-y-3 p-4 text-xs text-base-content/60">
        <p className="font-medium text-base-content/85">Nada seleccionado</p>
        <p>Haz clic en un elemento para editarlo o arrastra en el lienzo para seleccionar varios. Doble clic en un texto para escribir.</p>
        <ul className="space-y-1.5">
          {ATAJOS.map(([k, t]) => (
            <li key={k} className="flex justify-between gap-2">
              <kbd className="kbd kbd-xs">{k}</kbd>
              <span className="text-right">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  const el = els.length === 1 ? els[0] : null;
  const patch: Patch = (fn, k) => actions.patch(selected, fn, k);
  return (
    <div data-propiedades>
      <div className="flex items-center justify-between border-b border-base-300 px-3 py-2.5">
        <span className="text-sm font-semibold">{el ? NOMBRE[el.type] : `${els.length} elementos`}</span>
        {el?.type === 'art' ? <span className="max-w-[10rem] truncate text-[0.7rem] text-base-content/50">{getArt(el.art)?.item.label ?? el.art}</span> : null}
      </div>
      {el ? <Geometria el={el} patch={patch} /> : null}
      {el?.type === 'text' ? <Tipografia el={el} patch={patch} /> : null}
      {el?.type === 'shape' ? <FormaSec el={el} patch={patch} /> : null}
      {el?.type === 'art' ? <ArteSec el={el} patch={patch} /> : null}
      {el?.type === 'image' ? <ImagenSec el={el} patch={patch} /> : null}
      {!el ? (
        <Seccion title="Apariencia">
          <NumberField label="Opacidad" suffix="%" value={Math.round(els[0].opacity * 100)} min={0} max={100} onChange={(v) => patch((e) => ({ ...e, opacity: v / 100 }), 'opacity')} />
        </Seccion>
      ) : null}
      <Organizar els={els} actions={actions} />
    </div>
  );
}

function Geometria({ el, patch }: { el: Elemento; patch: Patch }) {
  const put = (g: Partial<Elemento>, k: string) => patch((e) => ({ ...e, ...g }) as Elemento, `geo-${k}`);
  return (
    <Seccion title="Posición y tamaño">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={el.x} onChange={(v) => put({ x: v }, 'x')} />
        <NumberField label="Y" value={el.y} onChange={(v) => put({ y: v }, 'y')} />
        <NumberField label="Ancho" value={el.w} min={1} onChange={(v) => put({ w: Math.max(1, v) }, 'w')} />
        <NumberField label="Alto" value={el.h} min={1} onChange={(v) => put({ h: Math.max(1, v) }, 'h')} />
        <NumberField label="Rotación" suffix="°" value={el.rotation} min={-180} max={180} onChange={(v) => put({ rotation: v }, 'r')} />
        <NumberField label="Opacidad" suffix="%" value={Math.round(el.opacity * 100)} min={0} max={100} onChange={(v) => put({ opacity: v / 100 }, 'o')} />
      </div>
    </Seccion>
  );
}

const FAMILIAS = [
  { value: 'display' as const, label: 'Inter Tight (titulares)' },
  { value: 'body' as const, label: 'Inter (texto)' },
  { value: 'mono' as const, label: 'Monoespaciada' },
];
const PESOS = [400, 500, 600, 700, 800].map((v) => ({ value: v, label: { 400: 'Normal', 500: 'Media', 600: 'Seminegrita', 700: 'Negrita', 800: 'Extra negrita' }[v]! }));
const ALINEAR = [
  { value: 'left' as const, label: 'Izquierda', Icon: AlignLeft },
  { value: 'center' as const, label: 'Centro', Icon: AlignCenter },
  { value: 'right' as const, label: 'Derecha', Icon: AlignRight },
];

function Tipografia({ el, patch }: { el: ElTexto; patch: Patch }) {
  const t = (fn: (x: ElTexto) => ElTexto, k: string) => patch((e) => (e.type === 'text' ? fitText(fn(e)) : e), k);
  return (
    <Seccion title="Texto">
      <textarea aria-label="Contenido del texto" value={el.text} rows={3} maxLength={4000} onChange={(e) => t((x) => ({ ...x, text: e.target.value }), `text-${el.id}`)} className="textarea textarea-sm w-full bg-panel3 text-xs leading-snug" />
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Selector label="Fuente" value={el.fontFamily} options={FAMILIAS} onChange={(v) => t((x) => ({ ...x, fontFamily: v }), 'family')} />
        </div>
        <NumberField label="Tamaño" value={el.fontSize} min={4} max={1200} onChange={(v) => t((x) => ({ ...x, fontSize: v }), 'fontSize')} />
        <Selector label="Peso" value={el.fontWeight} options={PESOS} onChange={(v) => t((x) => ({ ...x, fontWeight: v }), 'weight')} />
        <NumberField label="Espaciado" suffix="%" step={0.5} value={Math.round(el.letterSpacing * 1000) / 10} min={-20} max={50} onChange={(v) => t((x) => ({ ...x, letterSpacing: v / 100 }), 'spacing')} />
        <NumberField label="Interlineado" step={0.05} value={el.lineHeight} min={0.7} max={3} onChange={(v) => t((x) => ({ ...x, lineHeight: v }), 'lineHeight')} />
      </div>
      <div className="flex gap-1" role="group" aria-label="Alineación">
        {ALINEAR.map(({ value, label, Icon }) => (
          <IconButton key={value} label={label} active={el.align === value} onClick={() => t((x) => ({ ...x, align: value }), 'align')}>
            <Icon className="size-3.5" />
          </IconButton>
        ))}
      </div>
      <ColorField label="Color del texto" value={el.color} onChange={(color) => t((x) => ({ ...x, color }), 'color')} />
    </Seccion>
  );
}

function FormaSec({ el, patch }: { el: ElForma; patch: Patch }) {
  const s = (fn: (x: ElForma) => ElForma, k: string) => patch((e) => (e.type === 'shape' ? fn(e) : e), k);
  const linea = el.shape === 'line';
  return (
    <Seccion title={linea ? 'Línea' : 'Relleno y borde'}>
      <ColorField label={linea ? 'Color' : 'Relleno'} value={el.fill} onChange={(fill) => s((x) => ({ ...x, fill, stroke: linea ? undefined : x.stroke }), 'fill')} />
      {linea ? null : <ColorField label="Borde" value={el.strokeWidth > 0 ? el.stroke : undefined} clearLabel="Sin borde" onClear={() => s((x) => ({ ...x, strokeWidth: 0 }), 'stroke')} onChange={(stroke) => s((x) => ({ ...x, stroke, strokeWidth: x.strokeWidth > 0 ? x.strokeWidth : 4 }), 'stroke')} />}
      <div className="grid grid-cols-2 gap-2">
        <NumberField label={linea ? 'Grosor' : 'Borde'} value={el.strokeWidth} min={0} max={200} onChange={(v) => s((x) => ({ ...x, strokeWidth: v }), 'sw')} />
        {el.shape === 'rect' ? <NumberField label="Radio" value={el.radius} min={0} max={2000} onChange={(v) => s((x) => ({ ...x, radius: v }), 'radius')} /> : null}
      </div>
    </Seccion>
  );
}

function ArteSec({ el, patch }: { el: ElArte; patch: Patch }) {
  const found = getArt(el.art);
  if (!found || (!found.item.tintable && !found.item.wordSlot)) return null;
  const a = (fn: (x: ElArte) => ElArte, k: string) => patch((e) => (e.type === 'art' ? fn(e) : e), k);
  const { base, param } = parseArtKey(el.art);
  return (
    <Seccion title="Ilustración">
      {found.item.wordSlot ? (
        <label className="block">
          <span className="mb-0.5 block text-[0.65rem] font-medium uppercase tracking-wide text-base-content/50">Cifra o palabra</span>
          <input value={param ?? ''} maxLength={10} placeholder="Por defecto" onChange={(e) => a((x) => ({ ...x, art: artKey(base, e.target.value) }), 'word')} className="input input-xs w-full bg-panel3 text-xs" />
        </label>
      ) : null}
      {found.item.tintable ? <ColorField label={base.startsWith('tpl-') ? 'Fondo para el que se dibuja' : 'Color de acento'} value={el.tint} onClear={() => a((x) => ({ ...x, tint: undefined }), 'tint')} onChange={(tint) => a((x) => ({ ...x, tint }), 'tint')} /> : null}
    </Seccion>
  );
}

function ImagenSec({ el, patch }: { el: ElImagen; patch: Patch }) {
  const i = (fn: (x: ElImagen) => ElImagen, k: string) => patch((e) => (e.type === 'image' ? fn(e) : e), k);
  return (
    <Seccion title="Imagen">
      <div className="join w-full">
        {(['cover', 'contain'] as const).map((f) => (
          <button key={f} type="button" className={`btn join-item btn-xs flex-1 ${el.fit === f ? 'btn-primary' : 'btn-ghost border-base-300'}`} onClick={() => i((x) => ({ ...x, fit: f }), 'fit')}>
            {f === 'cover' ? 'Rellenar' : 'Encajar'}
          </button>
        ))}
      </div>
      <NumberField label="Esquinas" value={el.radius} min={0} max={2000} onChange={(v) => i((x) => ({ ...x, radius: v }), 'radius')} />
      <p className="truncate text-[0.65rem] text-base-content/45" title={el.src}>
        {el.src.replace('recursos/', '')}
      </p>
    </Seccion>
  );
}
