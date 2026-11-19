/**
 * «Preparar este equipo»: instala, sin permisos de administrador, lo que la app no lleva dentro y que la voz, los
 * subtítulos y los efectos de IA necesitan: un Python propio (el embebible oficial de python.org), sus paquetes de
 * PyPI y el modelo de whisper. Todo va a la carpeta local del usuario (%LOCALAPPDATA%\MetricaSEO Studio\runtime),
 * nunca a la carpeta sincronizada `dev`. Cada descarga se comprueba con la huella fijada en equipo-manifiesto.json
 * (herramientas/manifiesto-equipo.py) y se reanuda donde se quedó si se corta la conexión.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { EDITOR, FFMPEG } from './config';

type Archivo = { url: string; tam: number; sha256?: string; gitOid?: string };
type Wheel = Archivo & { nombre: string; version: string; archivo: string };
type Grupo = { titulo: string; usadoPara: string; modulos: string[]; paquetes: Wheel[] };
type Modelo = { repo: string; nombre: string; grupo: string; revision: string; archivos: (Archivo & { ruta: string })[] };
type Manifiesto = { python: Archivo & { version: string; archivo: string; pth: string }; pip: Wheel; grupos: Record<string, Grupo>; modelos: Modelo[] };

export const MANIFIESTO: Manifiesto = JSON.parse(fs.readFileSync(path.join(EDITOR, 'servidor', 'equipo-manifiesto.json'), 'utf8'));
export type GrupoId = 'base' | 'ia';

/** Carpeta del Python propio y sus descargas (local de este equipo: no se sincroniza). */
export const RUNTIME = process.env.STUDIO_RUNTIME ?? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'MetricaSEO Studio', 'runtime');
const PY_DIR = path.join(RUNTIME, 'python');
const PY_PROPIO = path.join(PY_DIR, 'python.exe');
const DESCARGAS = path.join(RUNTIME, 'descargas');
const MODELOS = path.join(RUNTIME, 'modelos');
const ESTADO = path.join(RUNTIME, 'estado.json');
/** Para probar como en un equipo vacío: no usar el Python del sistema. */
const SIN_SISTEMA = process.env.STUDIO_SIN_PYTHON_SISTEMA === '1';

type EstadoGuardado = { python?: string; grupos?: Partial<Record<GrupoId, string>>; modelos?: Record<string, string> };
const leerEstado = (): EstadoGuardado => {
  try {
    return JSON.parse(fs.readFileSync(ESTADO, 'utf8'));
  } catch {
    return {};
  }
};
const guardarEstado = (cambio: (e: EstadoGuardado) => void) => {
  const e = leerEstado();
  cambio(e);
  fs.mkdirSync(RUNTIME, { recursive: true });
  fs.writeFileSync(ESTADO, JSON.stringify(e, null, 1));
};

const pythonPropioListo = () => fs.existsSync(PY_PROPIO) && leerEstado().python === MANIFIESTO.python.version;

/** El Python que usa la app: el propio si está preparado; si no, el del sistema. */
export const pythonActual = () => {
  if (pythonPropioListo() || SIN_SISTEMA) return PY_PROPIO;
  return process.env.PYTHON ?? (process.platform === 'win32' ? 'py' : 'python3');
};
export const pythonEsPropio = () => pythonActual() === PY_PROPIO;

/** Carpeta local del modelo de whisper (si está completo) o el nombre, para que faster-whisper use su caché. */
export const rutaModeloWhisper = (nombre: string) => {
  const m = MANIFIESTO.modelos.find((x) => x.nombre === `faster-whisper-${nombre}`);
  if (m && leerEstado().modelos?.[m.nombre] === m.revision) return path.join(MODELOS, m.nombre);
  return nombre;
};

const cacheHf = () => process.env.HF_HUB_CACHE ?? path.join(process.env.HF_HOME ?? path.join(os.homedir(), '.cache', 'huggingface'), 'hub');
const modeloEnCacheHf = (m: Modelo) => {
  const snaps = path.join(cacheHf(), `models--${m.repo.replace('/', '--')}`, 'snapshots');
  try {
    return fs.readdirSync(snaps).some((s) => fs.existsSync(path.join(snaps, s, 'model.bin')));
  } catch {
    return false;
  }
};
const modeloListo = (m: Modelo) => leerEstado().modelos?.[m.nombre] === m.revision || modeloEnCacheHf(m);

const ejecutar = (cmd: string, args: string[], ms = 30000): Promise<{ ok: boolean; out: string }> =>
  new Promise((res) => execFile(cmd, args, { windowsHide: true, timeout: ms, env: { ...process.env, PYTHONIOENCODING: 'utf8' } }, (err, o, e) => res({ ok: !err, out: `${o}${e}`.trim() })));

/** Módulos de la lista que no se pueden importar con el Python actual. */
const modulosQueFaltan = async (modulos: string[]) => {
  const r = await ejecutar(pythonActual(), ['-c', `import importlib.util as u, json; print(json.dumps([m for m in ${JSON.stringify(modulos)} if u.find_spec(m) is None]))`]);
  if (!r.ok) return null; // no hay Python
  try {
    return JSON.parse(r.out.split('\n').pop() ?? '[]') as string[];
  } catch {
    return null;
  }
};

const mb = (b: number) => Math.round(b / 1e6);
const suma = (xs: { tam: number }[]) => xs.reduce((s, x) => s + x.tam, 0);

export type Componente = { id: string; nombre: string; estado: 'ok' | 'falta'; detalle: string; usadoPara: string; grupo: GrupoId; mb: number };
export type EstadoEquipo = { runtime: string; python: string; propio: boolean; componentes: Componente[]; faltaBase: boolean; mbBase: number; mbIa: number; trabajo: TrabajoEquipo | null };

/** Qué hay y qué falta en este equipo, con lo que pesaría descargarlo. */
export const estadoEquipo = async (): Promise<EstadoEquipo> => {
  const py = await ejecutar(pythonActual(), ['--version']);
  const propio = pythonEsPropio();
  const base = MANIFIESTO.grupos.base;
  const ia = MANIFIESTO.grupos.ia;
  const faltanBase = py.ok ? await modulosQueFaltan(base.modulos) : base.modulos;
  const faltanIa = py.ok ? await modulosQueFaltan(ia.modulos) : ia.modulos;
  const m = MANIFIESTO.modelos[0];
  const pesoPy = MANIFIESTO.python.tam + MANIFIESTO.pip.tam;
  // Preparar instala siempre el Python propio con sus paquetes (no se toca el del sistema)
  const necesitaPropio = !pythonPropioListo();
  const okBase = py.ok && faltanBase != null && faltanBase.length === 0;
  const okModelo = modeloListo(m);
  const componentes: Componente[] = [
    {
      id: 'python',
      nombre: `Python ${MANIFIESTO.python.version}`,
      grupo: 'base',
      estado: py.ok ? 'ok' : 'falta',
      detalle: py.ok ? `${py.out}${propio ? ' · el de la app' : ' · el del sistema'}` : 'no hay Python en este equipo',
      usadoPara: 'voz, subtítulos, audio y efectos de IA',
      mb: mb(pesoPy),
    },
    {
      id: 'base',
      nombre: base.titulo,
      grupo: 'base',
      estado: okBase ? 'ok' : 'falta',
      detalle: okBase ? 'instalado' : faltanBase ? `faltan: ${faltanBase.join(', ')}` : 'necesita Python',
      usadoPara: base.usadoPara,
      mb: mb(suma(base.paquetes)),
    },
    { id: 'modelo', nombre: 'Modelo de subtítulos (whisper «small»)', grupo: 'base', estado: okModelo ? 'ok' : 'falta', detalle: okModelo ? 'descargado' : 'no descargado', usadoPara: 'subtítulos automáticos', mb: mb(suma(m.archivos)) },
    {
      id: 'ia',
      nombre: ia.titulo,
      grupo: 'ia',
      estado: py.ok && faltanIa != null && faltanIa.length === 0 ? 'ok' : 'falta',
      detalle: py.ok && faltanIa && !faltanIa.length ? 'instalado' : 'opcional: quitar fondo usa además un modelo de unos 176 MB que se descarga la primera vez',
      usadoPara: ia.usadoPara,
      mb: mb(suma(ia.paquetes)),
    },
  ];
  const mbBase = mb((necesitaPropio ? pesoPy + suma(base.paquetes) : okBase ? 0 : suma(base.paquetes)) + (okModelo ? 0 : suma(m.archivos)));
  const baseInstalada = !necesitaPropio && leerEstado().grupos?.base === MANIFIESTO.python.version;
  const mbIa = mb((necesitaPropio ? pesoPy : 0) + (baseInstalada ? 0 : suma(base.paquetes)) + suma(ia.paquetes));
  return { runtime: RUNTIME, python: pythonActual(), propio, componentes, faltaBase: !okBase || !okModelo, mbBase, mbIa, trabajo: trabajoPublico() };
};

// ——— Descargas comprobadas y reanudables ———

class ErrorClaro extends Error {}

const huella = async (f: string, a: Archivo) => {
  const h = crypto.createHash(a.sha256 ? 'sha256' : 'sha1');
  if (!a.sha256) h.update(`blob ${a.tam}\0`);
  await new Promise<void>((res, rej) => fs.createReadStream(f).on('data', (d) => h.update(d)).on('end', res).on('error', rej));
  return h.digest('hex');
};
const verificado = async (f: string, a: Archivo) => {
  if (!fs.existsSync(f) || fs.statSync(f).size !== a.tam) return false;
  return (await huella(f, a)) === (a.sha256 ?? a.gitOid);
};

/** Descarga con reanudación (Range) y reintentos; deja el archivo solo si su huella coincide. */
const descargar = async (a: Archivo, destino: string, avance: (bytes: number) => void, cancelado: () => boolean) => {
  if (await verificado(destino, a)) return avance(a.tam);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const parcial = `${destino}.part`;
  let ultimoError: unknown = null;
  for (let intento = 0; intento < 6; intento++) {
    if (cancelado()) throw new ErrorClaro('Cancelado');
    const ya = fs.existsSync(parcial) ? fs.statSync(parcial).size : 0;
    if (ya > a.tam) fs.rmSync(parcial);
    const desde = ya > a.tam ? 0 : ya;
    avance(desde);
    try {
      const r = await fetch(a.url, { headers: desde ? { Range: `bytes=${desde}-` } : {}, redirect: 'follow' });
      if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status}`);
      const anadir = desde > 0 && r.status === 206;
      if (!anadir && desde > 0) avance(-desde);
      const out = fs.createWriteStream(parcial, { flags: anadir ? 'a' : 'w' });
      const lector = r.body!.getReader();
      for (;;) {
        if (cancelado()) {
          lector.cancel().catch(() => {});
          out.close();
          throw new ErrorClaro('Cancelado');
        }
        const { done, value } = await lector.read();
        if (done) break;
        if (!out.write(value)) await new Promise((res) => out.once('drain', res));
        avance(value.length);
      }
      await new Promise<void>((res, rej) => out.end((e?: Error | null) => (e ? rej(e) : res())));
      if (!(await verificado(parcial, a))) {
        avance(-fs.statSync(parcial).size);
        fs.rmSync(parcial, { force: true });
        throw new Error(`la huella de ${path.basename(destino)} no coincide`);
      }
      fs.renameSync(parcial, destino);
      return;
    } catch (e) {
      if (e instanceof ErrorClaro) throw e;
      if ((e as NodeJS.ErrnoException).code === 'ENOSPC') throw new ErrorClaro('El disco se ha llenado durante la descarga. Libera espacio y pulsa otra vez: seguirá donde lo dejó.');
      ultimoError = e;
      await new Promise((res) => setTimeout(res, Math.min(15000, 1500 * 2 ** intento)));
    }
  }
  throw new ErrorClaro(`No se pudo descargar ${path.basename(destino)} (${String((ultimoError as Error)?.message ?? ultimoError)}). Comprueba la conexión y pulsa otra vez: seguirá donde lo dejó.`);
};

const correr = (cmd: string, args: string[], cwd?: string): Promise<string> =>
  new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf8', PIP_DISABLE_PIP_VERSION_CHECK: '1' } });
    let out = '';
    p.stdout.on('data', (b) => (out += b));
    p.stderr.on('data', (b) => (out += b));
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res(out) : rej(new Error(out.slice(-1200) || `código ${c}`))));
  });

/** Traduce los fallos típicos de Windows a algo que el usuario pueda resolver. */
const explicar = (e: unknown) => {
  if (e instanceof ErrorClaro) return e.message;
  const m = String((e as Error)?.message ?? e);
  if (/EPERM|EACCES|EBUSY|Access is denied|Acceso denegado|WinError 5|WinError 32/i.test(m))
    return 'Windows o el antivirus bloqueó un archivo mientras se instalaba. Cierra otras ventanas de MétricaSEO Studio, permite la app en el antivirus si te lo pide y pulsa otra vez.';
  if (/DLL load failed|vcruntime|msvcp140/i.test(m))
    return 'A este equipo le falta el componente de Microsoft Visual C++ que usan los subtítulos. Instálalo desde https://aka.ms/vs/17/release/vc_redist.x64.exe (necesita permiso de administrador) y pulsa otra vez.';
  if (/ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(m)) return 'Sin conexión a internet. Conéctate y pulsa otra vez: seguirá donde lo dejó.';
  return m.slice(-600);
};

// ——— El trabajo de preparación ———

export type TrabajoEquipo = { grupos: GrupoId[]; estado: 'corriendo' | 'hecho' | 'error'; paso: string; pasos: string[]; indice: number; bytes: number; total: number; velocidad: number; restanteS: number | null; error?: string; resultado?: { voz?: string; subtitulos?: string; ia?: string }; inicio: number; fin?: number };
let trabajo: TrabajoEquipo | null = null;
let cancelar = false;
const trabajoPublico = () => (trabajo ? { ...trabajo } : null);
export const cancelarPreparacion = () => {
  if (trabajo?.estado === 'corriendo') cancelar = true;
};

const espacioLibre = (dir: string) => {
  try {
    let d = dir;
    while (!fs.existsSync(d)) d = path.dirname(d);
    const s = fs.statfsSync(d);
    return s.bavail * s.bsize;
  } catch {
    return Infinity;
  }
};

/** Habilita `import site` (pip y sus paquetes) en el Python embebible. */
const habilitarSite = () => {
  const pth = path.join(PY_DIR, MANIFIESTO.python.pth);
  const lineas = fs.readFileSync(pth, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !/^#?\s*import site/.test(l) && l.trim() !== 'Lib\\site-packages');
  fs.writeFileSync(pth, [...lineas, 'Lib\\site-packages', 'import site', ''].join('\r\n'));
};

const descomprimir = async (zip: string, destino: string, vaciar = true) => {
  if (vaciar) fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });
  try {
    await correr(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', zip, '-C', destino]);
  } catch {
    await correr('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${destino.replace(/'/g, "''")}' -Force`]);
  }
};

/**
 * Prepara este equipo para los grupos pedidos («base»: voz, subtítulos y audio; «ia»: efectos de IA). Con
 * `reinstalar` vuelve a instalar ese componente aunque esté. Corre en segundo plano: la app sigue usable.
 */
export const prepararEquipo = (grupos: GrupoId[], reinstalar?: 'python' | 'base' | 'modelo' | 'ia') => {
  if (trabajo?.estado === 'corriendo') return trabajoPublico();
  cancelar = false;
  const instalarPython = reinstalar === 'python' || !pythonPropioListo();
  const conIa = grupos.includes('ia') || reinstalar === 'ia';
  // los paquetes base solo si faltan (los de IA dependen de ellos) o se piden de nuevo
  const baseInstalada = !instalarPython && leerEstado().grupos?.base === MANIFIESTO.python.version;
  const conBase = instalarPython || reinstalar === 'base' || !baseInstalada;
  const m = MANIFIESTO.modelos[0];
  const conModelo = (grupos.includes('base') && !modeloListo(m)) || reinstalar === 'modelo';
  const wheels: Wheel[] = [...(conBase ? MANIFIESTO.grupos.base.paquetes : []), ...(conIa ? MANIFIESTO.grupos.ia.paquetes : [])];
  const descargas: { a: Archivo; f: string }[] = [
    ...(instalarPython ? [{ a: MANIFIESTO.python, f: path.join(DESCARGAS, MANIFIESTO.python.archivo) }, { a: MANIFIESTO.pip, f: path.join(DESCARGAS, MANIFIESTO.pip.archivo) }] : []),
    ...wheels.map((w) => ({ a: w, f: path.join(DESCARGAS, 'wheels', w.archivo) })),
    ...(conModelo ? m.archivos.map((a) => ({ a, f: path.join(MODELOS, `${m.nombre}.descarga`, a.ruta) })) : []),
  ];
  const pasos = ['Comprobando espacio y conexión', 'Descargando', ...(instalarPython ? ['Instalando Python'] : []), 'Instalando paquetes', ...(conModelo ? ['Colocando el modelo'] : []), 'Comprobando que todo funciona'];
  const t: TrabajoEquipo = { grupos, estado: 'corriendo', paso: pasos[0], pasos, indice: 0, bytes: 0, total: suma(descargas.map((d) => d.a)), velocidad: 0, restanteS: null, inicio: Date.now() };
  trabajo = t;
  const paso = (nombre: string) => {
    t.indice = pasos.indexOf(nombre);
    t.paso = nombre;
  };
  (async () => {
    try {
      // 1. espacio (lo descargado + lo instalado ocupa unas 2,5 veces la descarga) y conexión
      const necesario = t.total * 2.5 + 200e6;
      const libre = espacioLibre(RUNTIME);
      if (libre < necesario) throw new ErrorClaro(`No hay espacio suficiente en el disco: hacen falta unos ${(necesario / 1e9).toFixed(1)} GB libres y quedan ${(libre / 1e9).toFixed(1)} GB. Libera espacio y pulsa otra vez.`);
      if (descargas.length) {
        try {
          await fetch('https://pypi.org/simple/pip/', { method: 'HEAD' });
        } catch {
          throw new ErrorClaro('Sin conexión a internet. Conéctate y pulsa otra vez.');
        }
      }
      // 2. descargas (cuatro a la vez), con velocidad y tiempo restante
      paso('Descargando');
      const t0 = Date.now();
      const avance = (n: number) => {
        t.bytes = Math.max(0, t.bytes + n);
        const s = (Date.now() - t0) / 1000;
        if (s > 2) {
          t.velocidad = t.bytes / s;
          t.restanteS = t.velocidad > 0 ? Math.round((t.total - t.bytes) / t.velocidad) : null;
        }
      };
      const cola = [...descargas];
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          for (let d = cola.shift(); d; d = cola.shift()) await descargar(d.a, d.f, avance, () => cancelar);
        }),
      );
      t.bytes = t.total;
      t.restanteS = 0;
      // 3. Python propio con pip
      if (instalarPython) {
        paso('Instalando Python');
        await descomprimir(path.join(DESCARGAS, MANIFIESTO.python.archivo), PY_DIR);
        habilitarSite();
        // pip es un wheel de Python puro: basta con descomprimirlo en site-packages (lo que hace get-pip.py)
        await descomprimir(path.join(DESCARGAS, MANIFIESTO.pip.archivo), path.join(PY_DIR, 'Lib', 'site-packages'), false);
        await correr(PY_PROPIO, ['-m', 'pip', '--version']);
        guardarEstado((e) => {
          e.python = MANIFIESTO.python.version;
          e.grupos = {};
        });
      }
      // 4. paquetes, sin ir a internet: los wheels ya están comprobados
      paso('Instalando paquetes');
      if (cancelar) throw new ErrorClaro('Cancelado');
      const instalar = async (g: GrupoId) => {
        const archivos = MANIFIESTO.grupos[g].paquetes.map((w) => path.join(DESCARGAS, 'wheels', w.archivo));
        await correr(PY_PROPIO, ['-m', 'pip', 'install', '--no-index', '--no-deps', '--no-warn-script-location', ...(reinstalar ? ['--force-reinstall'] : []), ...archivos]);
        guardarEstado((e) => ((e.grupos ??= {})[g] = MANIFIESTO.python.version));
      };
      if (conBase) await instalar('base');
      if (conIa) await instalar('ia');
      // 5. modelo de whisper en su carpeta final
      if (conModelo) {
        paso('Colocando el modelo');
        const final = path.join(MODELOS, m.nombre);
        fs.rmSync(final, { recursive: true, force: true });
        fs.renameSync(path.join(MODELOS, `${m.nombre}.descarga`), final);
        guardarEstado((e) => ((e.modelos ??= {})[m.nombre] = m.revision));
      }
      // 6. prueba de punta a punta: una frase de voz y su transcripción; los módulos de IA se importan
      paso('Comprobando que todo funciona');
      t.resultado = await verificar(conIa);
      // las descargas ya instaladas sobran (el modelo ya está en su sitio)
      fs.rmSync(DESCARGAS, { recursive: true, force: true });
      t.estado = 'hecho';
      t.paso = 'Listo';
    } catch (e) {
      t.estado = 'error';
      t.error = explicar(e);
    } finally {
      t.fin = Date.now();
    }
  })();
  return trabajoPublico();
};

const verificar = async (conIa: boolean) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-equipo-'));
  const cf = path.join(dir, 'conf.json');
  const out = path.join(dir, 'res.json');
  fs.writeFileSync(cf, JSON.stringify({ ffmpeg: FFMPEG, modelo: rutaModeloWhisper('small'), carpeta: dir, ia: conIa }));
  try {
    await correr(pythonActual(), [path.join(EDITOR, 'servidor', 'verificar_equipo.py'), cf, out]);
    const r = JSON.parse(fs.readFileSync(out, 'utf8'));
    // un error normal: explicar() reconoce los típicos (DLL de Visual C++, antivirus)
    if (r.error) throw new Error(r.error);
    return r as { voz?: string; subtitulos?: string; ia?: string };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
