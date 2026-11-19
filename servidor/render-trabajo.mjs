// Proceso aparte para renderizar (vídeo o fotograma) con @remotion/bundler + @remotion/renderer DEL PROYECTO.
// Recibe la configuración como JSON en argv[2] y escribe el progreso como líneas JSON en stdout.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const conf = JSON.parse(process.argv[2]);
const say = (o) => process.stdout.write(JSON.stringify(o) + '\n');
// Remotion del proyecto (misma versión con la que se diseñó); si no lo tiene, el que trae el editor
const reqProy = createRequire(path.join(conf.proyecto, 'package.json'));
const reqEditor = createRequire(import.meta.url);
/** Carpeta de la app (junto a sus node_modules). */
const EDITOR_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolver = (m) => {
  try {
    return reqProy.resolve(m);
  } catch {
    return reqEditor.resolve(m);
  }
};
const imp = (m) => import(pathToFileURL(resolver(m)).href);
/** Chrome headless shell incluido con la app (para exportar sin conexión), si existe */
const chromeIncluido = (() => {
  const base = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'recursos', 'chrome-headless-shell');
  if (!fs.existsSync(base)) return null;
  const buscar = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        const r = buscar(p);
        if (r) return r;
      } else if (/^chrome-headless-shell(\.exe)?$/.test(e.name)) return p;
    }
    return null;
  };
  return buscar(base);
})();
const navegador = chromeIncluido && !process.env.STUDIO_CHROME_DEL_PROYECTO ? { browserExecutable: chromeIncluido } : {};

/** Huella de src/ + public/ + package.json: si no cambia, se reutiliza el bundle anterior. */
const huella = () => {
  const h = crypto.createHash('sha1');
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const st = fs.statSync(p);
        h.update(`${p}:${st.size}:${st.mtimeMs}\n`);
      }
    }
  };
  walk(path.dirname(conf.entrada));
  walk(conf.publico);
  for (const f of ['package.json', 'remotion.config.ts']) {
    const p = path.join(conf.proyecto, f);
    if (fs.existsSync(p)) h.update(`${p}:${fs.statSync(p).mtimeMs}`);
  }
  return h.digest('hex').slice(0, 12);
};

try {
  const { bundle } = await imp('@remotion/bundler');
  const { renderMedia, renderStill, selectComposition } = await imp('@remotion/renderer');
  const inputProps = JSON.parse(fs.readFileSync(conf.props, 'utf8'));

  const id = huella();
  const outDir = path.join(conf.cache, `bundle-${id}`);
  let serveUrl = outDir;
  if (!fs.existsSync(path.join(outDir, 'index.html'))) {
    say({ tipo: 'progreso', p: 0.01, etapa: 'Preparando el proyecto (bundle)…' });
    // se borran bundles viejos
    for (const d of fs.readdirSync(conf.cache)) if (d.startsWith('bundle-')) fs.rmSync(path.join(conf.cache, d), { recursive: true, force: true });
    serveUrl = await bundle({
      entryPoint: conf.entrada,
      publicDir: conf.publico,
      outDir,
      // el código del proyecto sin node_modules propios (llegó por Syncthing a otro equipo): sus paquetes
      // se buscan primero junto a él y, si no están, en los que trae la app
      webpackOverride: (c) => ({
        ...c,
        resolve: { ...c.resolve, modules: [...(c.resolve?.modules ?? ['node_modules']), path.join(EDITOR_RAIZ, 'node_modules')] },
      }),
      onProgress: (p) => say({ tipo: 'progreso', p: 0.15 * (p / 100), etapa: `Preparando el proyecto (bundle) ${Math.round(p)} %` }),
    });
  } else say({ tipo: 'progreso', p: 0.15, etapa: 'Bundle en caché' });

  say({ tipo: 'progreso', p: 0.16, etapa: 'Calculando la composición…' });
  const composition = await selectComposition({ serveUrl, id: conf.composicion, inputProps, ...navegador });
  say({ tipo: 'log', texto: `${composition.width}×${composition.height} · ${composition.durationInFrames} fotogramas · ${composition.fps} fps` });

  if (conf.soloAudio) {
    // solo la mezcla de audio (para medir la sonoridad)
    await renderMedia({
      composition,
      serveUrl,
      codec: 'wav',
      outputLocation: conf.salida,
      inputProps,
      concurrency: conf.concurrencia,
      overwrite: true,
      ...navegador,
      onProgress: ({ progress }) => say({ tipo: 'progreso', p: 0.16 + 0.7 * progress, etapa: `Mezclando audio ${Math.round(progress * 100)} %` }),
    });
  } else if (conf.fotograma != null) {
    say({ tipo: 'progreso', p: 0.5, etapa: `Renderizando fotograma ${conf.fotograma}…` });
    await renderStill({ composition, serveUrl, output: conf.salida, frame: Math.min(composition.durationInFrames - 1, Math.max(0, conf.fotograma)), inputProps, imageFormat: 'png', ...navegador });
  } else {
    const Q = {
      alta: { videoBitrate: conf.codec === 'h265' ? (composition.fps >= 50 ? '12M' : '7M') : composition.fps >= 50 ? '18M' : '10M', jpegQuality: 95, scale: 1, ...(conf.codec === 'h265' ? {} : { x264Preset: 'slow' }) },
      media: { crf: 20, jpegQuality: 90, scale: 1 },
      borrador: { crf: 28, jpegQuality: 80, scale: 0.5 },
    }[conf.calidad] ?? { crf: 20, jpegQuality: 90, scale: 1 };
    // codificación por hardware: se cambia el codificador en la orden de ffmpeg que arma Remotion
    const ffmpegOverride = conf.acel
      ? ({ args }) => {
          const a = [...args];
          const i = a.indexOf('-c:v');
          if (i < 0 || !/^libx26[45]$/.test(a[i + 1])) return a;
          const hevc = a[i + 1] === 'libx265';
          a[i + 1] = `${hevc ? 'hevc' : 'h264'}_${conf.acel}`;
          const quitar = (k, n = 1) => {
            const j = a.indexOf(k);
            if (j >= 0) a.splice(j, n + 1);
          };
          const ci = a.indexOf('-crf');
          const crf = ci >= 0 ? a[ci + 1] : null;
          quitar('-crf');
          quitar('-preset');
          quitar('-x264-params');
          quitar('-x265-params');
          // «Alta» pide un bitrate (-b:v): en VBR NVENC se queda muy por debajo con fondos planos (≈5 de 10 Mbps),
          // así que con bitrate fijo va en CBR y entrega lo prometido.
          const bv = a[a.indexOf('-b:v') + 1];
          const tasa = a.includes('-b:v') && bv ? ['-rc', 'cbr', '-maxrate', bv, '-bufsize', `${parseInt(bv, 10) * 2}M`] : ['-rc', 'vbr'];
          const extra =
            conf.acel === 'nvenc'
              ? ['-preset', 'p5', '-tune', 'hq', ...tasa, ...(hevc ? [] : ['-profile:v', 'high']), ...(crf ? ['-cq', crf] : [])]
              : conf.acel === 'qsv'
                ? ['-preset', 'slow', ...(crf ? ['-global_quality', crf] : [])]
                : ['-quality', 'quality', ...(crf ? ['-rc', 'cqp', '-qp_i', crf, '-qp_p', crf] : [])];
          if (conf.acel === 'qsv') {
            const pf = a.indexOf('-pix_fmt');
            if (pf >= 0) a[pf + 1] = 'nv12';
          }
          a.splice(i + 2, 0, ...extra);
          return a;
        }
      : undefined;
    const rango = conf.rango ? [Math.max(0, conf.rango[0]), Math.min(composition.durationInFrames - 1, conf.rango[1])] : null;
    const total = rango ? rango[1] - rango[0] + 1 : composition.durationInFrames;
    await renderMedia({
      composition,
      serveUrl,
      codec: conf.codec === 'h265' ? 'h265' : 'h264',
      outputLocation: conf.salida,
      inputProps,
      imageFormat: 'jpeg',
      pixelFormat: 'yuv420p',
      colorSpace: 'bt709',
      audioCodec: 'aac',
      audioBitrate: '192k',
      concurrency: conf.concurrencia,
      overwrite: true,
      ...navegador,
      ...(rango ? { frameRange: rango } : {}),
      ...(ffmpegOverride ? { ffmpegOverride } : {}),
      ...Q,
      onProgress: ({ progress, renderedFrames, encodedFrames, stitchStage }) =>
        say({
          tipo: 'progreso',
          p: 0.16 + 0.84 * progress,
          etapa: stitchStage === 'muxing' ? 'Uniendo audio y vídeo…' : `Fotograma ${renderedFrames} / ${total} · codificados ${encodedFrames}`,
        }),
    });
  }
  say({ tipo: 'progreso', p: 1, etapa: 'Listo' });
  process.exit(0);
} catch (e) {
  say({ tipo: 'log', texto: String(e?.stack ?? e).slice(0, 1500) });
  process.exit(1);
}
