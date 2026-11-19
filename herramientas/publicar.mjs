/**
 * Publica una versión nueva de MétricaSEO Studio en el origen de actualizaciones, en un solo paso:
 *
 *   npm run release                         sube el parche (2.1.2 → 2.1.3), compila y publica
 *   npm run release -- minor                2.1.2 → 2.2.0        (también: major, o una versión exacta 2.4.0)
 *   npm run release -- --notas "Qué cambia" texto que la app enseña en «Novedades»
 *   npm run release -- --sin-compilar       publica el instalador ya compilado de la versión actual
 *   npm run release -- --igual              compila y publica sin cambiar el número de versión
 *
 * Qué hace: comprueba tipos, sube "version" en package.json, compila el instalador (`npm run dist`)
 * y copia al origen los tres archivos que lee la app: el instalador, su .blockmap y latest.yml.
 * El origen es "actualizaciones" de electron/estudio.config.json. Con proveedor "carpeta" se copian
 * a sus carpetas ("rutas"; las relativas o con «~/» desde la carpeta personal de este equipo):
 *   - la primera se crea si no existe (es la de `dev`, que Syncthing lleva al otro equipo);
 *   - las demás solo si ya existen en este equipo (p. ej. la carpeta local de antes, para que la
 *     versión instalada aquí, que aún lee esa, dé el salto).
 * Con "generic" o "github" quedan listos en la carpeta de salida para subirlos a mano (este script
 * no sube nada a internet).
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leerJSON = (f) => JSON.parse(readFileSync(f, 'utf8'));
const args = process.argv.slice(2);
const opcion = (n) => args.includes(n);
const valor = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const notas = valor('--notas');
const paso = args.find((a) => !a.startsWith('--') && a !== notas);

// sin esto, `electron` arrancado desde el terminal de VS Code se comporta como node («bad option»)
const entorno = { ...process.env };
delete entorno.ELECTRON_RUN_AS_NODE;
const correr = (c) => execSync(c, { cwd: RAIZ, stdio: 'inherit', env: entorno });

const pkgRuta = join(RAIZ, 'package.json');
const pkg = leerJSON(pkgRuta);
const subir = (v, tipo) => {
  if (/^\d+\.\d+\.\d+$/.test(tipo ?? '')) return tipo;
  const [a, b, c] = v.split('.').map(Number);
  if (tipo === 'major') return `${a + 1}.0.0`;
  if (tipo === 'minor') return `${a}.${b + 1}.0`;
  if (!tipo || tipo === 'patch') return `${a}.${b}.${c + 1}`;
  throw new Error(`No entiendo «${tipo}»: usa patch, minor, major o una versión como 2.4.0`);
};

const conservar = opcion('--sin-compilar') || opcion('--igual');
const version = conservar ? pkg.version : subir(pkg.version, paso);
const salida = pkg.build.directories.output;
const canal = leerJSON(join(RAIZ, 'electron', 'estudio.config.json')).actualizaciones;

if (!opcion('--sin-compilar')) {
  console.log(`\n▸ Comprobando tipos…`);
  correr('npm run typecheck');
  if (version !== pkg.version) {
    // se cambia solo la línea de la versión, para no reformatear el resto del archivo
    const texto = readFileSync(pkgRuta, 'utf8');
    writeFileSync(pkgRuta, texto.replace(`"version": "${pkg.version}"`, `"version": "${version}"`));
    console.log(`▸ Versión ${pkg.version} → ${version}`);
  }
  console.log(`▸ Compilando el instalador de la ${version} (tarda unos minutos)…`);
  correr('npm run dist');
}

const yml = join(salida, 'latest.yml');
if (!existsSync(yml)) throw new Error(`No está ${yml}: la compilación no dejó los datos de actualización`);
let datos = readFileSync(yml, 'utf8');
const enYml = /^version:\s*(.+)$/m.exec(datos)?.[1]?.trim();
if (enYml !== version) throw new Error(`latest.yml es de la ${enYml} y se esperaba la ${version}: compila de nuevo (sin --sin-compilar)`);
const instalador = /^path:\s*(.+)$/m.exec(datos)?.[1]?.trim();
if (!instalador || !existsSync(join(salida, instalador))) throw new Error(`No está el instalador que nombra latest.yml (${instalador})`);
if (notas) {
  datos = datos.replace(/^releaseNotes:.*(\r?\n(  .*|$))*\r?\n?/m, '');
  datos = `${datos.trimEnd()}\nreleaseNotes: ${JSON.stringify(notas)}\n`;
  writeFileSync(yml, datos);
}
const archivos = [instalador, `${instalador}.blockmap`, 'latest.yml'].filter((a) => existsSync(join(salida, a)));
const mb = (f) => `${(statSync(f).size / 1048576).toFixed(1)} MB`;

const resolverRuta = (r) => {
  const t = String(r ?? '').trim();
  if (!t) return null;
  if (t === '~' || t.startsWith('~/') || t.startsWith('~\\')) return join(homedir(), t.slice(2));
  return isAbsolute(t) ? normalize(t) : join(homedir(), t);
};
const carpetas = canal?.proveedor === 'carpeta' ? [...(canal.rutas ?? []), canal.ruta].map(resolverRuta).filter(Boolean) : [];

if (carpetas.length) {
  const destinos = carpetas.filter((c, i) => i === 0 || existsSync(c));
  for (const destino of destinos) {
    mkdirSync(destino, { recursive: true });
    // primero el instalador y al final latest.yml: la app nunca ve una versión a medio copiar. Se copia con
    // un nombre acabado en «~» (Syncthing no lo sincroniza) y se renombra al final.
    for (const a of archivos) {
      const temporal = join(destino, `${a}~`);
      copyFileSync(join(salida, a), temporal);
      rmSync(join(destino, a), { force: true });
      renameSync(temporal, join(destino, a));
      console.log(`▸ ${destino}: copiado ${a} (${mb(join(destino, a))})`);
    }
    // solo se guarda la última versión: cada instalador pesa unos 300 MB
    for (const viejo of readdirSync(destino)) {
      if (/\.(exe|blockmap|tmp)$|~$/i.test(viejo) && !archivos.includes(viejo)) {
        rmSync(join(destino, viejo), { force: true });
        console.log(`▸ ${destino}: quitado ${viejo}`);
      }
    }
  }
  console.log(`\n✔ Versión ${version} publicada en:`);
  for (const d of destinos) console.log(`    ${d}`);
  console.log(`  Las apps instaladas que leen esas carpetas la descargan solas al abrirse (o en Menú → Buscar actualizaciones).`);
} else {
  console.log(`\n✔ Versión ${version} compilada. Este script no sube nada a internet.`);
  console.log(`  Sube estos archivos a ${canal?.url ?? (canal?.proveedor === 'github' ? `una release v${version} de ${canal.owner}/${canal.repo}` : 'tu origen de actualizaciones')}:`);
  for (const a of archivos) console.log(`    ${join(salida, a)} (${mb(join(salida, a))})`);
}
if (version !== pkg.version) console.log(`\n  Falta guardar el cambio de versión: git commit -am "Versión ${version}"`);
