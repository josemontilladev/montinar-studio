/**
 * Logotipo de MétricaSEO (el de metricaseo.site): la «M» con el punto de la tilde, «etrica» y «seo» en verde, en
 * Poppins 600, seguido de la etiqueta del producto («Studio») en Inter Tight. Lo usan el editor de vídeo y el
 * estudio de diseño. El tamaño sale del font-size (o de --logo-tam).
 */
import './logo.css';

export function Logo({ etiqueta = 'Studio', className = '', title }: { etiqueta?: string; className?: string; title?: string }) {
  return (
    <span className={`ms-logo ${className}`} role="img" aria-label={`MétricaSEO ${etiqueta}`.trim()} title={title}>
      <span className="ms-logo-marca">
        <svg className="ms-logo-m" viewBox="5.25 6 36.51 36.75" aria-hidden="true" focusable="false">
          <path d="M8 40 V18 L21 31 L32.37 19.63" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="42.8" cy="16.6" r="3.53" className="ms-logo-punto" />
        </svg>
        <span className="ms-logo-palabra" aria-hidden="true">
          etrica<span className="ms-logo-seo">seo</span>
        </span>
      </span>
      {etiqueta && (
        <span className="ms-logo-etiqueta" aria-hidden="true">
          {etiqueta}
        </span>
      )}
    </span>
  );
}
