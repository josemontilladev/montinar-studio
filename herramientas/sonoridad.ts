/**
 * Mide la sonoridad de la mezcla de un proyecto (render solo de audio + BS.1770) y ajusta ajustes.audio.ganancia para
 * llegar al objetivo sin pasar de −1 dBFS de pico. Repite la medida para comprobarlo.
 *   npx tsx herramientas/sonoridad.ts ../montilla-video proyecto-sinvoz.json -14
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validarProyecto } from '../contrato/esquema';

const EDITOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dir, archivo, objTxt] = process.argv.slice(2);
const proy = path.resolve(dir);
const fp = path.join(proy, archivo);
const obj = Number(objTxt ?? -14);
const cache = path.join(EDITOR, '.cache');
fs.mkdirSync(cache, { recursive: true });
const ff = path.join(proy, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe');
const py = process.platform === 'win32' ? 'py' : 'python3';

const medir = () => {
  const p = validarProyecto(JSON.parse(fs.readFileSync(fp, 'utf8')));
  const props = path.join(cache, 'sonoridad-props.json');
  const wav = path.join(cache, 'sonoridad-mezcla.wav');
  fs.writeFileSync(props, JSON.stringify({ proyecto: p, formato: '9:16' }));
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['remotion', 'render', 'Montilla', `"${wav}"`, '--codec=wav', `"--props=${props}"`, '--log=error'], { cwd: proy, stdio: 'inherit', shell: true });
  const cf = path.join(cache, 'lufs-conf.json'),
    out = path.join(cache, 'lufs-res.json');
  fs.writeFileSync(cf, JSON.stringify({ accion: 'lufs', ffmpeg: ff, entrada: wav }));
  execFileSync(py, [path.join(EDITOR, 'servidor', 'audio_pro.py'), cf, out]);
  return { p, r: JSON.parse(fs.readFileSync(out, 'utf8')) as { lufs: number; pico: number } };
};

const { p, r } = medir();
console.log(`Antes: ${r.lufs} LUFS · pico ${r.pico} dBFS · ganancia ${p.ajustes.audio.ganancia} dB`);
const g = Math.min(obj - r.lufs, -1 - r.pico);
p.ajustes.audio.ganancia = Math.round((p.ajustes.audio.ganancia + g) * 10) / 10;
p.ajustes.audio.objetivo = obj;
fs.writeFileSync(fp, JSON.stringify(p, null, 1) + '\n');
const d = medir().r;
console.log(`Después: ${d.lufs} LUFS · pico ${d.pico} dBFS · ganancia ${p.ajustes.audio.ganancia} dB (objetivo ${obj})`);
