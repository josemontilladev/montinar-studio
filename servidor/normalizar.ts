/**
 * Normalización de sonoridad de un vídeo ya renderizado (EBU R128 / loudnorm en dos pasadas, con limitador de pico
 * real). El vídeo se copia sin recodificar; el audio se recodifica en AAC 192 kbps a 48 kHz.
 *   npx tsx servidor/normalizar.ts entrada.mp4 salida.mp4 [-14] [-1]
 */
import fs from 'node:fs';
import { execFile } from 'node:child_process';

const correr = (ff: string, args: string[]): Promise<string> =>
  new Promise((res, rej) =>
    execFile(ff, args, { windowsHide: true, maxBuffer: 1 << 26 }, (err, _o, se) => (err ? rej(new Error(String(se).slice(-600))) : res(String(se)))),
  );

export type Medida = { input_i: string; input_tp: string; input_lra: string; input_thresh: string; target_offset: string };

export const medirSonoridad = async (ff: string, entrada: string, objetivo = -14, pico = -1): Promise<Medida> => {
  const se = await correr(ff, ['-hide_banner', '-i', entrada, '-vn', '-af', `loudnorm=I=${objetivo}:TP=${pico}:LRA=11:print_format=json`, '-f', 'null', '-']);
  const j = se.slice(se.lastIndexOf('{'), se.lastIndexOf('}') + 1);
  return JSON.parse(j);
};

export const normalizarSonoridad = async (ff: string, entrada: string, salida: string, objetivo = -14, pico = -1) => {
  const m = await medirSonoridad(ff, entrada, objetivo, pico);
  const tmp = salida + '.normalizando.mp4';
  const af = `loudnorm=I=${objetivo}:TP=${pico}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await correr(ff, ['-hide_banner', '-y', '-i', entrada, '-c:v', 'copy', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp]);
  fs.renameSync(tmp, salida);
  const d = await medirSonoridad(ff, salida, objetivo, pico);
  return { antes: { lufs: Number(m.input_i), pico: Number(m.input_tp) }, despues: { lufs: Number(d.input_i), pico: Number(d.input_tp) } };
};

// uso desde la línea de comandos
if (process.argv[1]?.endsWith('normalizar.ts') && process.argv.length >= 4) {
  const [entrada, salida, obj, pk] = process.argv.slice(2);
  const ff = process.env.FFMPEG ?? 'ffmpeg';
  normalizarSonoridad(ff, entrada, salida, Number(obj ?? -14), Number(pk ?? -1)).then((r) => console.log(JSON.stringify(r)));
}
