/**
 * Trae la librería de ilustraciones de MétricaSEO al estudio de diseño (app/diseno/espejo).
 *   node herramientas/sincronizar-diseno.mjs [ruta-a-metrica-seo]
 *
 * Copia tal cual (reescribiendo los imports «@/…» a rutas locales) las portadas del blog (postCovers), las plantillas
 * (GeneratedCover), las piezas de la librería del diseñador y las fuentes de la marca. Genera además
 * «portadasBlog.ts» con todas las colecciones COVERS_* que encuentre, para que las ilustraciones nuevas del blog
 * aparezcan solas en la librería. Solo toca app/diseno/espejo: el editor (app/diseno/editor) es código propio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EDITOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = path.resolve(EDITOR, process.argv[2] ?? '../metrica-seo');
const DESTINO = path.join(EDITOR, 'app', 'diseno', 'espejo');
const SRC = path.join(ORIGEN, 'src');

if (!fs.existsSync(path.join(SRC, 'client'))) {
  console.error(`No encuentro metrica-seo en ${ORIGEN}`);
  process.exit(1);
}

const DISENADOR = 'client/features/admin/content/designer';
const POSTCOVERS = 'client/features/marketing/content/postCovers';
const archivos = [
  'content/cover-types.ts',
  'client/features/marketing/content/GeneratedCover.tsx',
  ...fs.readdirSync(path.join(SRC, POSTCOVERS)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${POSTCOVERS}/${f}`),
  ...fs.readdirSync(path.join(SRC, DISENADOR)).filter((f) => /^(library\w*|coverLibrary)\.tsx?$/.test(f)).map((f) => `${DISENADOR}/${f}`),
];
const FUENTES = ['inter-latin-v1.woff2', 'inter-latin-ext-v1.woff2', 'inter-tight-latin-v1.woff2', 'inter-tight-latin-ext-v1.woff2'];

const base = (rel) => path.basename(rel).replace(/\.tsx?$/, '');
const copiados = new Set([...archivos.map(base), 'PostCover']);
const CABECERA = '// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.\n';

// limpiar la copia anterior (solo .ts/.tsx y fuentes de esta carpeta)
fs.mkdirSync(path.join(DESTINO, 'fuentes'), { recursive: true });
for (const f of fs.readdirSync(DESTINO)) if (/\.tsx?$/.test(f)) fs.rmSync(path.join(DESTINO, f));

const errores = [];
for (const rel of archivos) {
  let txt = fs.readFileSync(path.join(SRC, rel), 'utf8');
  txt = txt.replace(/from\s+"@\/([^"]+)"/g, (_m, imp) => {
    const b = imp.split('/').pop();
    if (!copiados.has(b)) errores.push(`${rel}: import @/${imp} no está en la copia`);
    return `from "./${b}"`;
  });
  fs.writeFileSync(path.join(DESTINO, path.basename(rel)), CABECERA + txt);
}

// PostCover.tsx es un componente del blog con Tailwind; las portadas solo usan su tipo Field
fs.writeFileSync(path.join(DESTINO, 'PostCover.ts'), `${CABECERA}export type Field = "ink" | "mint" | "green" | "soft" | "white" | "mintSoft";\n`);

// índice de todas las colecciones de portadas del blog (COVERS_E, COVERS_SECTORES…)
const colecciones = [];
for (const f of fs.readdirSync(DESTINO).filter((x) => /^covers\w+\.tsx$/.test(x))) {
  const txt = fs.readFileSync(path.join(DESTINO, f), 'utf8');
  for (const m of txt.matchAll(/export const (COVERS_\w+)/g)) colecciones.push({ nombre: m[1], archivo: f.replace(/\.tsx$/, '') });
}
fs.writeFileSync(
  path.join(DESTINO, 'portadasBlog.ts'),
  CABECERA +
    `import type { ComponentType } from "react";\nimport type { Field } from "./PostCover";\n` +
    colecciones.map((c) => `import { ${c.nombre} } from "./${c.archivo}";`).join('\n') +
    `\n\n/** Portadas del blog por slug (las de coversA–D están en BESPOKE de libraryCovers). */\nexport const PORTADAS_BLOG: Record<string, { Art: ComponentType; field: Field }> = {\n` +
    colecciones.map((c) => `  ...${c.nombre},`).join('\n') +
    `\n};\n`,
);

let fuentes = 0;
for (const f of FUENTES) {
  const de = path.join(ORIGEN, 'public', 'fonts', f);
  if (fs.existsSync(de)) {
    fs.copyFileSync(de, path.join(DESTINO, 'fuentes', f));
    fuentes++;
  } else errores.push(`falta la fuente ${f}`);
}

console.log(`Copiados ${archivos.length} archivos, ${colecciones.length} colecciones de portadas y ${fuentes} fuentes en ${path.relative(EDITOR, DESTINO)}`);
if (errores.length) {
  console.error(errores.join('\n'));
  process.exit(1);
}
