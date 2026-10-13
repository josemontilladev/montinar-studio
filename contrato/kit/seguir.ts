/** Seguimiento de movimiento: desplazamiento (dx, dy) en el fotograma local f, interpolando entre claves. */
export type ClaveSeguir = { f: number; x: number; y: number };
export const desplazamiento = (ks: ClaveSeguir[] | undefined, f: number): { x: number; y: number } => {
  if (!ks?.length) return { x: 0, y: 0 };
  if (f <= ks[0].f) return { x: ks[0].x, y: ks[0].y };
  const u = ks[ks.length - 1];
  if (f >= u.f) return { x: u.x, y: u.y };
  // búsqueda binaria (las claves van ordenadas por f)
  let a = 0,
    b = ks.length - 1;
  while (b - a > 1) {
    const m = (a + b) >> 1;
    if (ks[m].f <= f) a = m;
    else b = m;
  }
  const k = (f - ks[a].f) / Math.max(1e-6, ks[b].f - ks[a].f);
  return { x: ks[a].x + (ks[b].x - ks[a].x) * k, y: ks[a].y + (ks[b].y - ks[a].y) * k };
};
