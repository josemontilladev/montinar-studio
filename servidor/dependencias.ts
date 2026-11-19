/** Estado de las dependencias (lo que trae la app y lo externo), con instrucciones para arreglar lo que falte. */
import fs from 'node:fs';
import path from 'node:path';
import { DESC, EDITOR, FFMPEG, FFPROBE, PROY, contratoIgual, rutas } from './config';

export type Dep = { id: string; nombre: string; grupo: 'Incluido en la app' | 'Proyecto'; estado: 'ok' | 'aviso' | 'falta'; detalle: string; arreglo?: string; usadoPara: string };

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
  // Voces de Piper: solo si el proyecto las declara (el kit de MétricaSEO usa edge-tts y no las necesita)
  if (DESC.voz?.voces) {
    const voces = path.join(PROY, DESC.voz.voces);
    const nVoces = fs.existsSync(voces) ? fs.readdirSync(voces).filter((f) => f.endsWith('.onnx')).length : 0;
    d.push({
      id: 'voces',
      nombre: 'Voces de Piper (.onnx)',
      grupo: 'Proyecto',
      estado: nVoces ? 'ok' : 'falta',
      detalle: nVoces ? `${nVoces} voz/voces en ${DESC.voz.voces}` : 'no hay voces',
      arreglo: nVoces ? undefined : 'Descarga es_MX-claude-high.onnx (+ .onnx.json) de huggingface.co/rhasspy/piper-voices a tools/voces',
      usadoPara: 'regenerar voz',
    });
  }
  // Python, sus paquetes y el modelo de subtítulos: sección «Este equipo» (/api/equipo), con instalación automática
  return d;
};
