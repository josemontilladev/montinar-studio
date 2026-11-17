import { useEffect, useRef } from 'react';

export type Teclas = {
  undo: () => void;
  redo: () => void;
  remove: () => void;
  duplicate: () => void;
  nudge: (dx: number, dy: number) => void;
  escape: () => void;
  selectAll: () => void;
  enter: () => void;
  copy: () => void;
  cut: () => void;
  /** Pegar: archivos del portapapeles del sistema (imágenes) o los elementos copiados. */
  paste: (files: File[]) => void;
  save: () => void;
  zoom: (z: 'fit' | 'mas' | 'menos' | 1) => void;
  hasSelection: () => boolean;
};

const escribiendo = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button', 'color'].includes(t.type)));

const FLECHAS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/** Atajos de teclado del estudio (nunca mientras se escribe en un campo). */
export function useTeclas(handlers: Teclas, activo: boolean) {
  const h = useRef(handlers);
  h.current = handlers;
  useEffect(() => {
    if (!activo) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      if (mod && k === 's') return run(h.current.save);
      if (document.querySelector('dialog[open]')) return;
      if (escribiendo(e.target)) return;
      if (mod && k === 'z') run(e.shiftKey ? h.current.redo : h.current.undo);
      else if (mod && k === 'y') run(h.current.redo);
      else if (mod && k === 'd') run(h.current.duplicate);
      else if (mod && k === 'a') run(h.current.selectAll);
      else if (mod && k === 'c') run(h.current.copy);
      else if (mod && k === 'x') run(h.current.cut);
      else if (mod && (k === '0' || k === '1')) run(() => h.current.zoom(k === '0' ? 'fit' : 1));
      else if (mod && (k === '+' || k === '=')) run(() => h.current.zoom('mas'));
      else if (mod && k === '-') run(() => h.current.zoom('menos'));
      else if (k === 'escape') run(h.current.escape);
      else if (!h.current.hasSelection()) return;
      else if (k === 'delete' || k === 'backspace') run(h.current.remove);
      else if (k === 'enter' && !(document.activeElement instanceof HTMLButtonElement)) run(h.current.enter);
      else if (e.key in FLECHAS) {
        const [dx, dy] = FLECHAS[e.key];
        const paso = e.shiftKey ? 10 : 1;
        run(() => h.current.nudge(dx * paso, dy * paso));
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (escribiendo(e.target) || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      h.current.paste([...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/')));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, [activo]);
}
