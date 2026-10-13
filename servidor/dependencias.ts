/** Estado de las dependencias (lo que trae la app y lo externo), con instrucciones para arreglar lo que falte. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { DESC, EDITOR, FFMPEG, FFPROBE, PROY, contratoIgual, rutas } from './config';
import { PYTHON } from './trabajos';

export type Dep = { id: string; nombre: string; grupo: 'Incluido en la app' | 'Proyecto' | 'Externo (Python)'; estado: 'ok' | 'aviso' | 'falta'; detalle: string; arreglo?: string; usadoPara: string };

const ejecutar = (cmd: string, args: string[]): Promise<{ ok: boolean; out: string }> =>
  new Promise((res) => execFile(cmd, args, { windowsHide: true, timeout: 20000 }, (err, o, e) => res({ ok: !err, out: `${o}${e}`.trim() })));

export const revisarDependencias = async (): Promise<Dep[]> => {
  const d: Dep[] = [];
  d.push({ id: 'node', nombre: 'Node / Electron', grupo: 'Incluido en la app', estado: 'ok', detalle: `Node ${process.versions.node}${process.versions.electron ? ` · Electron ${process.versions.electron}` : ''}`, usadoPara: 'servidor del editor' });
  // Remotion para renderizar
  const proyRemotion = fs.existsSync(path.join(PROY, 'node_modules', '@remotion', 'renderer'));
  const appRemotion = fs.existsSync(path.join(EDITOR, 'node_modules', '@remotion', 'renderer'));
  d.push({
    id: 'remotion',
    nombre: 'Remotion (renderizador)',
    grupo: 'Incluido en la app',
    estado: proyRemotion || appRemotion ? 'ok' : 'falta',
    detalle: proyRemotion ? 'el del proyecto' : appRemotion ? 'el incluido en la app (el proyecto no tiene node_modules)' : 'no encontrado',
    arreglo: proyRemotion || appRemotion ? undefined : 'En la carpeta del proyecto: npm install',
    usadoPara: 'exportar vídeo y fotogramas',
  });
  const chrome = path.join(EDITOR, 'recursos', 'chrome-headless-shell');
  d.push({
    id: 'chrome',
    nombre: 'Chrome Headless Shell',
    grupo: 'Incluido en la app',
    estado: fs.existsSync(chrome) ? 'ok' : 'aviso',
    detalle: fs.existsSync(chrome) ? 'incluido: se exporta sin conexión' : 'no incluido: Remotion lo descargará en la primera exportación (necesita internet)',
    usadoPara: 'exportar',
  });
  const ff = fs.existsSync(FFMPEG) && fs.existsSync(FFPROBE);
  d.push({ id: 'ffmpeg', nombre: 'ffmpeg / ffprobe', grupo: 'Incluido en la app', estado: ff ? 'ok' : 'falta', detalle: ff ? FFMPEG : 'no se encuentran los binarios de Remotion', arreglo: ff ? undefined : 'Reinstala la app o ejecuta npm install en el proyecto', usadoPara: 'ondas, duración de medios, normalizar sonoridad' });
  // Proyecto
  let valido = true;
  try {
    JSON.parse(fs.readFileSync(rutas.proyecto, 'utf8'));
  } catch {
    valido = false;
  }
  d.push({ id: 'proyecto', nombre: 'proyecto.json', grupo: 'Proyecto', estado: valido ? 'ok' : 'falta', detalle: rutas.proyecto, arreglo: valido ? undefined : 'Recupera una versión en Versiones o revisa el archivo', usadoPara: 'todo' });
  d.push({ id: 'contrato', nombre: 'Contrato (src/contrato)', grupo: 'Proyecto', estado: contratoIgual() ? 'ok' : 'aviso', detalle: contratoIgual() ? 'igual que el del editor' : 'distinto al del editor', arreglo: contratoIgual() ? undefined : 'Copia editor-video/contrato a src/contrato del proyecto', usadoPara: 'que la vista previa y el render coincidan' });
  const voces = DESC.voz?.voces ? path.join(PROY, DESC.voz.voces) : null;
  const nVoces = voces && fs.existsSync(voces) ? fs.readdirSync(voces).filter((f) => f.endsWith('.onnx')).length : 0;
  d.push({
    id: 'voces',
    nombre: 'Voces de Piper (.onnx)',
    grupo: 'Proyecto',
    estado: !DESC.voz ? 'aviso' : nVoces ? 'ok' : 'falta',
    detalle: !DESC.voz ? 'el proyecto no declara script de voz' : nVoces ? `${nVoces} voz/voces en ${DESC.voz.voces}` : 'no hay voces',
    arreglo: nVoces ? undefined : 'Descarga es_MX-claude-high.onnx (+ .onnx.json) de huggingface.co/rhasspy/piper-voices a tools/voces',
    usadoPara: 'regenerar voz',
  });
  // Python
  const py = await ejecutar(PYTHON, ['--version']);
  d.push({
    id: 'python',
    nombre: 'Python 3',
    grupo: 'Externo (Python)',
    estado: py.ok ? 'ok' : 'falta',
    detalle: py.ok ? py.out : `no se encuentra «${PYTHON}»`,
    arreglo: py.ok ? undefined : 'Instala Python 3.11+ desde python.org (marca «Add to PATH»)',
    usadoPara: 'voz, subtítulos automáticos, audio, fluidez',
  });
  if (py.ok) {
    const mods: [string, string, string][] = [
      ['faster_whisper', 'faster-whisper', 'subtítulos automáticos y tiempos de palabra'],
      ['piper', 'piper-tts', 'regenerar voz'],
      ['numpy', 'numpy', 'audio y fluidez'],
      ['scipy', 'scipy', 'mejorar voz, ritmo, sonoridad'],
      ['av', 'av', 'control de fluidez'],
    ];
    const r = await ejecutar(PYTHON, ['-c', `import importlib.util as u, json; print(json.dumps([m for m in ${JSON.stringify(mods.map((m) => m[0]))} if u.find_spec(m) is None]))`]);
    let faltan: string[] = [];
    try {
      faltan = JSON.parse(r.out.split('\n').pop() ?? '[]');
    } catch {}
    for (const [m, pip, uso] of mods)
      d.push({ id: `py-${m}`, nombre: pip, grupo: 'Externo (Python)', estado: faltan.includes(m) ? 'falta' : 'ok', detalle: faltan.includes(m) ? 'no instalado' : 'instalado', arreglo: faltan.includes(m) ? `${PYTHON} -m pip install ${pip}` : undefined, usadoPara: uso });
    const hf = path.join(os.homedir(), '.cache', 'huggingface', 'hub');
    const modelo = fs.existsSync(hf) && fs.readdirSync(hf).some((f) => f.includes('faster-whisper-small'));
    d.push({ id: 'whisper-small', nombre: 'Modelo whisper «small»', grupo: 'Externo (Python)', estado: modelo ? 'ok' : 'aviso', detalle: modelo ? 'descargado' : 'se descargará la primera vez (unos 480 MB, necesita internet)', usadoPara: 'subtítulos automáticos' });
  }
  return d;
};
