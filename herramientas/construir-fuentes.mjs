// Descarga la biblioteca de tipografías (solo licencias OFL-1.1 / Apache-2.0) a recursos/fuentes, con catálogo y licencias.
//   node herramientas/construir-fuentes.mjs
// Fuente de datos: API de Fontsource (las mismas fuentes de Google Fonts, con su licencia). Se guardan los pesos
// 400 y 700 (o los que haya), estilo normal, subconjunto latino (incluye á é í ó ú ñ ü ¿ ¡).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(RAIZ, 'recursos', 'fuentes');
const LISTA = {
  Sans: ['inter', 'roboto', 'open-sans', 'montserrat', 'poppins', 'lato', 'nunito', 'raleway', 'work-sans', 'dm-sans', 'manrope', 'outfit', 'plus-jakarta-sans', 'rubik', 'space-grotesk', 'sora', 'urbanist', 'figtree', 'karla', 'mulish', 'archivo', 'lexend'],
  Serif: ['playfair-display', 'merriweather', 'lora', 'dm-serif-display', 'libre-baskerville', 'cormorant-garamond', 'eb-garamond', 'crimson-pro', 'fraunces', 'instrument-serif', 'bitter', 'noto-serif', 'young-serif', 'gloock'],
  Display: ['bebas-neue', 'anton', 'archivo-black', 'righteous', 'bungee', 'alfa-slab-one', 'lobster', 'abril-fatface', 'black-ops-one', 'monoton', 'bowlby-one', 'titan-one', 'rubik-mono-one', 'shrikhand', 'fredoka', 'syne', 'bricolage-grotesque', 'unbounded'],
  Manuscrita: ['pacifico', 'dancing-script', 'caveat', 'satisfy', 'great-vibes', 'kalam', 'permanent-marker', 'shadows-into-light', 'indie-flower', 'sacramento', 'amatic-sc', 'homemade-apple', 'yellowtail', 'patrick-hand'],
  Mono: ['jetbrains-mono', 'fira-code', 'space-mono', 'ibm-plex-mono', 'roboto-mono', 'source-code-pro', 'geist-mono', 'dm-mono'],
  Condensada: ['oswald', 'barlow-condensed', 'roboto-condensed', 'fjalla-one', 'saira-condensed', 'teko', 'big-shoulders-display', 'antonio', 'league-gothic', 'pathway-gothic-one'],
};
const PERMITIDAS = ['OFL-1.1', 'Apache-2.0'];

fs.mkdirSync(DEST, { recursive: true });
const catalogo = [];
const rechazadas = [];
for (const [categoria, ids] of Object.entries(LISTA)) {
  for (const id of ids) {
    try {
      const r = await fetch(`https://api.fontsource.org/v1/fonts/${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const f = await r.json();
      if (!PERMITIDAS.includes(f.license)) {
        rechazadas.push(`${id} (${f.license})`);
        continue;
      }
      const pesos = [400, 700].filter((w) => f.weights.includes(w));
      if (!pesos.length) pesos.push(f.weights.includes(400) ? 400 : f.weights[0]);
      const archivos = [];
      for (const w of pesos) {
        const url = f.variants?.[w]?.normal?.latin?.url?.woff2;
        if (!url) continue;
        const dir = path.join(DEST, id);
        fs.mkdirSync(dir, { recursive: true });
        const destino = path.join(dir, `${w}.woff2`);
        if (!fs.existsSync(destino)) {
          const b = Buffer.from(await (await fetch(url)).arrayBuffer());
          fs.writeFileSync(destino, b);
        }
        archivos.push({ peso: w, archivo: `${id}/${w}.woff2` });
      }
      if (!archivos.length) {
        rechazadas.push(`${id} (sin woff2 latino)`);
        continue;
      }
      catalogo.push({ id, familia: f.family, categoria, licencia: f.license, origen: f.source || 'https://github.com/google/fonts', version: f.version, archivos });
      process.stdout.write(`${f.family} · `);
    } catch (e) {
      rechazadas.push(`${id} (${e.message})`);
    }
  }
}
fs.writeFileSync(path.join(DEST, 'catalogo.json'), JSON.stringify(catalogo, null, 1));
const lic = [
  '# Licencias de las tipografías incluidas',
  '',
  'Todas las tipografías de `recursos/fuentes/` son de código abierto y se distribuyen con la app bajo su licencia:',
  '- **OFL-1.1**: SIL Open Font License 1.1 — https://openfontlicense.org (se pueden usar, incrustar y redistribuir; no se pueden vender solas).',
  '- **Apache-2.0**: Apache License 2.0 — https://www.apache.org/licenses/LICENSE-2.0',
  '',
  'Origen: Google Fonts (https://github.com/google/fonts), descargadas a través de Fontsource (https://fontsource.org).',
  '',
  '| Familia | Categoría | Licencia | Versión | Origen |',
  '|---|---|---|---|---|',
  ...catalogo.map((f) => `| ${f.familia} | ${f.categoria} | ${f.licencia} | ${f.version} | ${f.origen} |`),
  '',
  `Total: ${catalogo.length} familias.`,
  rechazadas.length ? `\nNo incluidas: ${rechazadas.join(', ')}.` : '',
];
fs.writeFileSync(path.join(RAIZ, 'LICENCIAS-FUENTES.md'), lic.join('\n') + '\n');
console.log(`\n${catalogo.length} familias · rechazadas: ${rechazadas.join(', ') || 'ninguna'}`);
