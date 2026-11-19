// Llena la biblioteca sincronizada de MétricaSEO Studio (~/dev/Metrica SEO/studio-biblioteca) con todo el material
// reutilizable de MétricaSEO: logos, gráficos (posts, portadas, capturas del panel y de la web), clips de vídeo
// (vídeos terminados y recorridos), música, efectos, tipografías y el kit de marca.
//   node herramientas/llenar-biblioteca.mjs           copia lo que falte o haya cambiado (no borra nada)
//   node herramientas/llenar-biblioteca.mjs --sin-clips   sin los vídeos (lo más pesado)
// Se puede repetir cuando haya material nuevo. Las fuentes viven en este equipo (Videos\MetricaSEO y los repos de
// dev); la biblioteca es lo que se sincroniza.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();
const DEV = path.join(HOME, 'dev', 'Metrica SEO');
const DESTINO = process.env.STUDIO_COMPARTIDA ?? path.join(DEV, 'studio-biblioteca');
const BIB = path.join(DESTINO, 'biblioteca');
const VID = path.join(HOME, 'Videos', 'MetricaSEO');
const V4 = path.join(VID, 'v4');
const PROMO = path.join(DEV, 'metricaseo-promo');
const PANEL = path.join(DEV, 'metrica-seo');
const SIN_CLIPS = process.argv.includes('--sin-clips');

const cuenta = {};
let bytes = 0;
const copiar = (tipo, de, nombre) => {
  if (!fs.existsSync(de)) return;
  const dir = path.join(BIB, tipo);
  fs.mkdirSync(dir, { recursive: true });
  const a = path.join(dir, nombre);
  const st = fs.statSync(de);
  if (fs.existsSync(a)) {
    const sa = fs.statSync(a);
    if (sa.size === st.size && sa.mtimeMs >= st.mtimeMs) return;
  }
  fs.copyFileSync(de, a);
  cuenta[tipo] = (cuenta[tipo] ?? 0) + 1;
  bytes += st.size;
};
/** Archivos de una carpeta (sin subcarpetas) que cumplen `re`. */
const archivos = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => re.test(n) && fs.statSync(path.join(dir, n)).isFile()) : []);
/** Recorre subcarpetas (las que empiezan por _ o . no: versiones anteriores y papeleras). */
const recorrer = (dir, re, fn, rel = '') => {
  if (!fs.existsSync(dir)) return;
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith('_') || n.startsWith('.')) continue;
    const f = path.join(dir, n);
    if (fs.statSync(f).isDirectory()) recorrer(f, re, fn, rel ? `${rel}-${n}` : n);
    else if (re.test(n)) fn(f, n, rel);
  }
};
const IMG = /\.(png|jpe?g|webp|svg|gif|avif)$/i;
const MP4 = /\.(mp4|webm|mov)$/i;
const AUD = /\.(wav|mp3|m4a|ogg|flac)$/i;

// ── logos ──
for (const n of archivos(path.join(PANEL, 'public', 'brand'), IMG)) copiar('logos', path.join(PANEL, 'public', 'brand', n), n.startsWith('metricaseo') ? n : `terceros-${n}`);
for (const n of archivos(path.join(V4, 'perfiles'), /^(logo|avatar)-.*\.png$/i)) copiar('logos', path.join(V4, 'perfiles', n), `metricaseo-${n}`);

// ── gráficos ──
recorrer(path.join(V4, 'posts'), IMG, (f, n) => copiar('graficos', f, `post-${n}`));
for (const n of archivos(path.join(V4, 'videos', 'portadas'), IMG)) copiar('graficos', path.join(V4, 'videos', 'portadas', n), `portada-${n.replace(/^metricaseo-/, '')}`);
for (const n of archivos(path.join(V4, 'videos', 'miniaturas-youtube'), IMG)) copiar('graficos', path.join(V4, 'videos', 'miniaturas-youtube', n), `miniatura-youtube-${n.replace(/^metricaseo-/, '')}`);
for (const n of archivos(path.join(V4, 'perfiles'), IMG).filter((x) => !/^(logo|avatar)-/i.test(x))) copiar('graficos', path.join(V4, 'perfiles', n), `perfil-${n}`);
for (const n of archivos(path.join(V4, 'material-panel', 'shots'), IMG)) copiar('graficos', path.join(V4, 'material-panel', 'shots', n), `panel-${n}`);
for (const n of archivos(path.join(V4, 'material-panel', 'alto'), IMG)) copiar('graficos', path.join(V4, 'material-panel', 'alto', n), `panel-completo-${n}`);
for (const n of archivos(path.join(PROMO, 'public', 'v4', 'panel'), IMG)) copiar('graficos', path.join(PROMO, 'public', 'v4', 'panel', n), `panel-recorte-${n}`);
for (const n of archivos(path.join(V4, 'material-web', 'shots'), IMG)) copiar('graficos', path.join(V4, 'material-web', 'shots', n), `web-${n}`);
for (const n of archivos(path.join(V4, 'material-web', 'blog'), IMG)) copiar('graficos', path.join(V4, 'material-web', 'blog', n), `blog-${n}`);
for (const n of archivos(VID, /^poster-.*\.png$/i)) copiar('graficos', path.join(VID, n), `metricaseo-${n}`);

// ── clips de vídeo ──
if (!SIN_CLIPS) {
  for (const n of archivos(path.join(V4, 'videos'), MP4)) copiar('clips', path.join(V4, 'videos', n), `video-${n.replace(/^metricaseo-/, '')}`);
  for (const n of archivos(path.join(V4, 'material-panel', 'scroll'), MP4)) copiar('clips', path.join(V4, 'material-panel', 'scroll', n), `panel-recorrido-${n}`);
  for (const n of archivos(path.join(V4, 'material-web', 'scroll'), MP4)) copiar('clips', path.join(V4, 'material-web', 'scroll', n), `web-recorrido-${n}`);
}

// ── música ──
for (const n of archivos(path.join(PROMO, 'public', 'v4', 'music'), AUD)) copiar('musica', path.join(PROMO, 'public', 'v4', 'music', n), `musica-video-${n}`);
for (const n of archivos(path.join(VID, 'musica-muestras'), /\.mp3$/i)) copiar('musica', path.join(VID, 'musica-muestras', n), `musica-estilo-${n.replace(/^\d+-/, '')}`);
copiar('musica', path.join(PROMO, 'public', 'audio', 'music.wav'), 'musica-tema-marca.wav');

// ── efectos de sonido ──
for (const n of archivos(path.join(PROMO, 'public', 'audio'), /^sfx-.*\.wav$/i)) copiar('sfx', path.join(PROMO, 'public', 'audio', n), `marca-${n}`);
for (const n of archivos(path.join(VID, 'audio'), /^sfx-.*\.wav$/i)) copiar('sfx', path.join(VID, 'audio', n), `marca-${n}`);

// ── tipografías (el nombre del archivo es la familia al usarla) ──
const FUENTES = path.join(PANEL, 'public', 'fonts');
copiar('fuentes', path.join(FUENTES, 'inter-tight-latin-v1.woff2'), 'Inter Tight.woff2');
copiar('fuentes', path.join(FUENTES, 'inter-latin-v1.woff2'), 'Inter.woff2');
copiar('fuentes', path.join(FUENTES, 'poppins-logo-v1.woff2'), 'Poppins.woff2');

// ── kit de marca MétricaSEO (pestaña Marca → aplicar) ──
const MARCAS = path.join(DESTINO, 'marcas');
fs.mkdirSync(path.join(MARCAS, 'recursos'), { recursive: true });
const logo = path.join(PANEL, 'public', 'brand', 'metricaseo-logo-512.png');
if (fs.existsSync(logo)) fs.copyFileSync(logo, path.join(MARCAS, 'recursos', 'metricaseo-logo.png'));
const kit = {
  id: 'metricaseo',
  nombre: 'MétricaSEO',
  kit: {
    paleta: { ink: '#212121', bg: '#f3f3f3', surface: '#ffffff', mint: '#74f5a1', mintSoft: '#d5fce3', green: '#12a150', muted: '#5c5c5c', line: '#e2e2e2' },
    fuentes: { sans: 'Inter Tight', serif: 'Inter', mono: 'Inter' },
    fuentesExtra: [],
    marca: { nombre: 'MétricaSEO', logo: null, eslogan: 'El SEO de todos tus clientes, en un solo panel.', cta: 'Empieza gratis' },
    siteUrl: 'metricaseo.site',
    legal: 'RIF V-24266163-6',
  },
  logoArchivo: fs.existsSync(logo) ? 'metricaseo-logo.png' : null,
  fecha: new Date().toISOString(),
};
const fKit = path.join(MARCAS, 'metricaseo.json');
if (!fs.existsSync(fKit)) fs.writeFileSync(fKit, JSON.stringify(kit, null, 1));

fs.writeFileSync(
  path.join(DESTINO, 'LEEME.txt'),
  [
    'Biblioteca de MétricaSEO Studio (sincronizada con Syncthing entre los equipos).',
    '',
    'biblioteca\\logos       logos de MétricaSEO (y de terceros: Google Ads, Analytics, Meta)',
    'biblioteca\\graficos    posts, carruseles, portadas, miniaturas, perfiles y capturas del panel y de la web',
    'biblioteca\\clips       vídeos terminados y recorridos del panel y de la web',
    'biblioteca\\musica      música de cada vídeo, un ejemplo de cada estilo y el tema de marca',
    'biblioteca\\sfx         efectos de sonido de marca',
    'biblioteca\\fuentes     Inter Tight, Inter y Poppins',
    'biblioteca\\plantillas  escenas guardadas como plantilla desde el editor',
    'marcas                 kits de marca (MétricaSEO)',
    'Diseños, Videos        diseños del estudio de diseño y proyectos de vídeo nuevos',
    '',
    'Para añadir el material nuevo: node herramientas\\llenar-biblioteca.mjs (en editor-video).',
    'Las capturas del panel son de clientes de ejemplo con datos inventados; no añadas capturas de clientes reales.',
    '',
  ].join('\r\n'),
);

const total = (dir) => {
  let s = 0;
  for (const n of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const f = path.join(dir, n);
    const st = fs.statSync(f);
    s += st.isDirectory() ? total(f) : st.size;
  }
  return s;
};
console.log('Copiados:', JSON.stringify(cuenta), `(${(bytes / 1048576).toFixed(0)} MB)`);
console.log(`Biblioteca en ${DESTINO}: ${(total(DESTINO) / 1048576).toFixed(0)} MB en total`);
