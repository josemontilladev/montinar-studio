/**
 * Crea la versión SIN VOZ de un proyecto (para cuando la voz sintética no convence):
 *   npx tsx herramientas/sin-voz.ts ../montilla-video/proyecto.json ../montilla-video/proyecto-sinvoz.json
 * - voz.activa = false (la voz se conserva, no suena) y la música ya no se agacha;
 * - subtítulos para leer: cada frase (y su escena) se alarga hasta ≤ 15 car./s y ≥ 0,9 s por bloque;
 * - efectos de transición un poco más presentes (×1,3);
 * - cortes llevados al pulso de la música más cercano (pulsos detectados con servidor/audio_pro.py).
 * La sonoridad (−14 LUFS) se ajusta después midiendo la mezcla: ver herramientas/sonoridad.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validarProyecto } from '../contrato/esquema';
import { adaptarSinVoz, cortesAlRitmo, resolverLinea } from '../contrato/linea';

const EDITOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) throw new Error('Uso: sin-voz.ts <proyecto.json> <salida.json>');
const proy = path.dirname(path.resolve(entrada));
const p = validarProyecto(JSON.parse(fs.readFileSync(entrada, 'utf8')));
const l0 = resolverLinea(p);

let q = adaptarSinVoz(p, { cps: 15, minSeg: 0.9 });
q.sfx = q.sfx.map((s) => ({ ...s, volumen: Math.min(1, Math.round(s.volumen * 1.3 * 100) / 100) }));

// pulsos de la música
if (q.musica.src) {
  const ff = path.join(proy, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe');
  const tmp = path.join(EDITOR, '.cache');
  fs.mkdirSync(tmp, { recursive: true });
  const cf = path.join(tmp, 'ritmo-conf.json'),
    out = path.join(tmp, 'ritmo-res.json');
  fs.writeFileSync(cf, JSON.stringify({ accion: 'ritmo', ffmpeg: fs.existsSync(ff) ? ff : 'ffmpeg', entrada: path.join(proy, 'public', q.musica.src) }));
  execFileSync(process.platform === 'win32' ? 'py' : 'python3', [path.join(EDITOR, 'servidor', 'audio_pro.py'), cf, out]);
  const r = JSON.parse(fs.readFileSync(out, 'utf8'));
  q.musica.beats = r.beats;
  q.musica.bpm = r.bpm;
  const c = cortesAlRitmo(q, 0.35);
  q = c.proyecto;
  console.log(`Música: ${r.bpm} BPM · ${c.movidos} cortes llevados al pulso`);
}
q.nombre = `${p.nombre} · sin voz`;
fs.writeFileSync(salida, JSON.stringify(validarProyecto(q), null, 1) + '\n');
const l1 = resolverLinea(q);
const fps = q.ajustes.fps;
console.log(`Duración ${(l0.total / fps).toFixed(2)} s → ${(l1.total / fps).toFixed(2)} s`);
for (const e of q.escenas) {
  const a = p.escenas.find((x) => x.id === e.id)!;
  if (a.duracion !== e.duracion) console.log(`  ${e.id}: ${(a.duracion / fps).toFixed(2)} → ${(e.duracion / fps).toFixed(2)} s`);
}
const cps = l1.bloques.map((b) => b.palabras.map((w) => w.p).join(' ').length / (b.hasta - b.desde));
console.log(`Subtítulos: ${l1.bloques.length} bloques · máx. ${Math.max(...cps).toFixed(1)} car./s · mín. ${Math.min(...l1.bloques.map((b) => b.hasta - b.desde)).toFixed(2)} s`);
