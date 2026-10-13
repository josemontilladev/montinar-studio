/**
 * Cambia los fps de un proyecto.json conservando los tiempos (guarda una copia .antes-<fps>fps.json).
 *   npx tsx herramientas/cambiar-fps.ts ../montilla-video/proyecto.json 60
 */
import fs from 'node:fs';
import { validarProyecto } from '../contrato/esquema';
import { escalarFps, resolverLinea } from '../contrato/linea';

const [archivo, fpsTxt] = process.argv.slice(2);
const fps = Number(fpsTxt);
if (!archivo || !fps) throw new Error('Uso: cambiar-fps.ts <proyecto.json> <fps>');
const p = validarProyecto(JSON.parse(fs.readFileSync(archivo, 'utf8')));
fs.copyFileSync(archivo, archivo.replace(/\.json$/, `.antes-${p.ajustes.fps}fps.json`));
const q = escalarFps(p, fps);
fs.writeFileSync(archivo, JSON.stringify(validarProyecto(q), null, 1) + '\n');
const a = resolverLinea(p),
  b = resolverLinea(q);
console.log(`${p.ajustes.fps} → ${fps} fps · duración ${(a.total / p.ajustes.fps).toFixed(3)} s → ${(b.total / fps).toFixed(3)} s (${a.total} → ${b.total} fotogramas)`);
