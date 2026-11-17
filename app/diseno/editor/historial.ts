import { useCallback, useRef, useState } from 'react';
import type { Diseno } from '../esquema';

const MAX = 150;
const MERGE_MS = 1200;

export type Historial = {
  doc: Diseno;
  /** El documento más reciente (también a mitad de un arrastre). */
  current: () => Diseno;
  /** Un cambio = un paso de deshacer. Los cambios con la misma `mergeKey` seguidos (escribir, arrastrar un color) comparten paso. */
  commit: (next: Diseno, mergeKey?: string) => void;
  /** Gesto continuo (mover, redimensionar, rotar): se ve cada paso y todo el gesto es un solo deshacer. */
  begin: () => void;
  preview: (next: Diseno) => void;
  end: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

/** Documento con deshacer/rehacer (pilas de estados anteriores y posteriores). */
export function useHistorial(inicial: Diseno): Historial {
  const [doc, setDoc] = useState(inicial);
  const [, setVersion] = useState(0);
  const ref = useRef(inicial);
  const past = useRef<Diseno[]>([]);
  const future = useRef<Diseno[]>([]);
  const gesture = useRef<Diseno | null>(null);
  const lastMerge = useRef<{ key: string; at: number } | null>(null);

  const emit = useCallback((d: Diseno) => {
    ref.current = d;
    setDoc(d);
  }, []);
  const push = (prev: Diseno) => {
    past.current = [...past.current, prev].slice(-MAX);
    future.current = [];
  };

  const commit = useCallback(
    (next: Diseno, mergeKey?: string) => {
      const prev = ref.current;
      if (prev === next) return;
      const now = Date.now();
      const last = lastMerge.current;
      const merge = mergeKey !== undefined && last?.key === mergeKey && now - last.at < MERGE_MS;
      if (!merge) push(prev);
      lastMerge.current = mergeKey ? { key: mergeKey, at: now } : null;
      emit(next);
    },
    [emit],
  );
  const begin = useCallback(() => {
    gesture.current = ref.current;
  }, []);
  const preview = useCallback((next: Diseno) => emit(next), [emit]);
  const end = useCallback(() => {
    const b = gesture.current;
    gesture.current = null;
    if (b && b !== ref.current) {
      push(b);
      lastMerge.current = null;
      setVersion((v) => v + 1);
    }
  }, []);
  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, ref.current];
    lastMerge.current = null;
    emit(prev);
  }, [emit]);
  const redo = useCallback(() => {
    const next = future.current.at(-1);
    if (!next) return;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, ref.current];
    lastMerge.current = null;
    emit(next);
  }, [emit]);
  const current = useCallback(() => ref.current, []);

  return { doc, current, commit, begin, preview, end, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
