import { useEffect, useRef } from 'react';
import type { ElTexto } from '../esquema';
import { FONT_STACKS } from './Lienzo';
import { textContentWidth } from './operaciones';
import { SEL } from './Marcas';

/** Área de texto sobre un texto del lienzo (misma fuente, tamaño y giro) para escribir encima. Escape o clic fuera termina. */
export function EditorTexto({ el, scale, onChange, onDone }: { el: ElTexto; scale: number; onChange: (text: string) => void; onDone: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const width = Math.max(el.w, textContentWidth(el) + el.fontSize * 0.5);
  const left = el.align === 'center' ? el.x + el.w / 2 - width / 2 : el.align === 'right' ? el.x + el.w - width : el.x;
  return (
    <textarea
      ref={ref}
      aria-label="Editar texto"
      data-editor-texto
      value={el.text}
      maxLength={4000}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          onDone();
        }
        e.stopPropagation();
      }}
      rows={el.text.split('\n').length}
      className="absolute z-10 m-0 resize-none overflow-hidden whitespace-pre border-0 bg-transparent p-0 outline-2 outline-offset-2"
      style={{
        outlineColor: SEL,
        left: left * scale,
        top: el.y * scale,
        width: width * scale,
        height: el.h * scale,
        fontFamily: FONT_STACKS[el.fontFamily],
        fontSize: el.fontSize * scale,
        fontWeight: el.fontWeight,
        lineHeight: el.lineHeight,
        letterSpacing: `${el.letterSpacing}em`,
        color: el.color,
        opacity: el.opacity,
        textAlign: el.align,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: `${((el.x + el.w / 2 - left) / width) * 100}% 50%`,
        caretColor: SEL,
      }}
    />
  );
}
