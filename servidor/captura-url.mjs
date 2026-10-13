/**
 * De una URL propia a tomas de vídeo (60 fps exactos con reloj virtual, el mismo núcleo que scripts/captura.mjs del
 * proyecto Montilla). Respeta robots.txt, no inicia sesión ni rellena formularios (si la página pide contraseña, se
 * para). Pensado para webs propias o hechas por la agencia.
 *
 *   node captura-url.mjs <config.json> <salida.json>
 * config = { url, carpeta (public/footage del proyecto nuevo), navegador (chrome-headless-shell), ffmpeg, segundos }
 * stdout: «PROGRESO a/b texto». Salida: { titulo, descripcion, h1, secciones: [{ texto, y }], tomas: [{ nombre, archivo, segundos, viewport }] }
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const conf = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const FPS = 60;
const OUT = conf.carpeta;
const RAW = path.join(os.tmpdir(), `studio-captura-${Date.now().toString(36)}`);
fs.mkdirSync(OUT, { recursive: true });
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms));
const progreso = (a, b, t) => console.log(`PROGRESO ${a}/${b} ${t}`);

/** robots.txt: ¿se permite esta ruta para cualquier agente («*»)? */
const permitido = async (url) => {
  const u = new URL(url);
  try {
    const r = await fetch(`${u.origin}/robots.txt`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return true;
    let aplica = false;
    const reglas = [];
    for (const l of (await r.text()).split(/\r?\n/)) {
      const [k, ...v] = l.split(':');
      const val = v.join(':').trim();
      if (/^user-agent$/i.test(k.trim())) aplica = val === '*';
      else if (aplica && /^(dis)?allow$/i.test(k.trim()) && val) reglas.push({ permitir: /^allow$/i.test(k.trim()), ruta: val });
    }
    const p = u.pathname + u.search;
    const casa = reglas.filter((x) => p.startsWith(x.ruta.replace(/\*$/, ''))).sort((a, b) => b.ruta.length - a.ruta.length)[0];
    return !casa || casa.permitir;
  } catch {
    return true;
  }
};

/** Reloj virtual (se inyecta en cada documento antes que cualquier script de la web). */
const RELOJ = () => {
  const R = { raf: window.requestAnimationFrame.bind(window), Date: window.Date, now: performance.now.bind(performance) };
  window.__real = R;
  let now = 0;
  const t0 = R.Date.now();
  const rafs = new Map();
  let rid = 1;
  const timers = new Map();
  let tid = 1;
  performance.now = () => now;
  function VDate(...a) {
    if (!new.target) return new R.Date(t0 + now).toString();
    return a.length ? new R.Date(...a) : new R.Date(t0 + now);
  }
  VDate.prototype = R.Date.prototype;
  VDate.now = () => t0 + now;
  VDate.parse = R.Date.parse;
  VDate.UTC = R.Date.UTC;
  window.Date = VDate;
  window.requestAnimationFrame = (cb) => {
    const id = rid++;
    rafs.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => rafs.delete(id);
  window.setTimeout = (cb, ms = 0, ...args) => {
    const id = tid++;
    timers.set(id, { at: now + Math.max(0, Number(ms) || 0), cb, args });
    return id;
  };
  window.setInterval = (cb, ms = 0, ...args) => {
    const id = tid++;
    const every = Math.max(1, Number(ms) || 0);
    timers.set(id, { at: now + every, cb, args, every });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  const inicioAnim = new WeakMap();
  const inicioVideo = new WeakMap();
  const ejecutar = (f, args) => {
    try {
      typeof f === 'function' ? f(...args) : (0, eval)(String(f));
    } catch (e) {
      console.error(e);
    }
  };
  window.__vt = {
    get now() {
      return now;
    },
    /** Avanza dt ms de reloj virtual: temporizadores en orden, rAF, animaciones CSS y vídeos. */
    paso(dt) {
      const fin = now + dt;
      for (let guard = 0; guard < 10000; guard++) {
        let sig = null;
        for (const [id, t] of timers) if (t.at <= fin && (!sig || t.at < sig[1].at)) sig = [id, t];
        if (!sig) break;
        const [id, t] = sig;
        now = Math.max(now, t.at);
        if (t.every) t.at += t.every;
        else timers.delete(id);
        ejecutar(t.cb, t.args);
      }
      now = fin;
      const cbs = [...rafs.values()];
      rafs.clear();
      for (const cb of cbs) ejecutar(cb, [now]);
      for (const a of document.getAnimations()) {
        let s = inicioAnim.get(a);
        if (s == null) {
          s = now - dt - (a.currentTime ?? 0);
          inicioAnim.set(a, s);
        }
        try {
          if (a.playState !== 'paused') a.pause();
          a.currentTime = now - s;
        } catch {}
      }
      for (const v of document.querySelectorAll('video')) {
        let s = inicioVideo.get(v);
        if (s == null) {
          s = now - v.currentTime * 1000;
          inicioVideo.set(v, s);
        }
        v.pause();
        const d = v.duration || 0;
        let t = (now - s) / 1000;
        if (d) t = v.loop ? t % d : Math.min(t, d - 0.01);
        if (Math.abs(v.currentTime - t) > 0.001) v.currentTime = t;
      }
    },
    /** Espera a que el navegador haya pintado el estado actual (dos rAF reales). */
    pintado: () => new Promise((r) => R.raf(() => R.raf(() => r()))),
  };
};

/** Lo que reciben las tomas: todo en tiempo de la web (ms virtuales). */
const crearCtx = (page, cdp, dir, vel) => {
  let n = 0;
  let grabando = false;
  const escrituras = [];
  const dt = (1000 / FPS) * vel;
  const fotograma = async () => {
    await page.evaluate((dt) => window.__vt.paso(dt), dt);
    await page.evaluate(() => window.__vt.pintado());
    if (!grabando) return;
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
    escrituras.push(fs.promises.writeFile(path.join(dir, `${String(n++).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64')));
  };
  const esperar = async (ms) => {
    const k = Math.max(1, Math.round(ms / dt));
    for (let i = 0; i < k; i++) await fotograma();
  };
  /** Lanza una animación dentro de la página (no se espera: avanza con el reloj) y deja pasar `ms`. */
  const animarScroll = async (y, ms, modo) => {
    await page.evaluate(
      (y, ms, modo) => {
        const L = window.__lenis;
        const y0 = window.scrollY;
        const target = typeof y === 'string' ? document.querySelector(y).getBoundingClientRect().top + y0 : y;
        const t0 = performance.now();
        const quint = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
        const lineal = (t) => (t < 0.15 ? (t / 0.15) ** 2 * 0.075 : t > 0.85 ? 1 - ((1 - t) / 0.15) ** 2 * 0.075 : 0.075 + ((t - 0.15) / 0.7) * 0.85);
        const ease = modo === 'lineal' ? lineal : quint;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          const v = y0 + (target - y0) * ease(k);
          if (L) L.scrollTo(v, { immediate: true, force: true });
          else window.scrollTo(0, v);
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      y,
      ms,
      modo,
    );
    await esperar(ms + 20);
  };
  return {
    page,
    esperar,
    scroll: (y, ms) => animarScroll(y, ms, 'quint'),
    scrollLineal: (y, ms) => animarScroll(y, ms, 'lineal'),
    tap: async (sel) => {
      const el = await page.waitForSelector(sel, { visible: true });
      await el.click();
      await fotograma();
    },
    /** Arrastre (ratón o dedo) con curva suave, un paso por fotograma. */
    arrastrar: async (x0, y0, x1, y1, ms) => {
      const pasos = Math.max(2, Math.round(ms / dt));
      await page.mouse.move(x0, y0);
      await page.mouse.down();
      for (let i = 1; i <= pasos; i++) {
        const t = i / pasos;
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        await page.mouse.move(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e);
        await fotograma();
      }
      await page.mouse.up();
    },
    /** Salto inmediato (para preparar): repite hasta que el destino quede arriba. */
    saltar: async (y) => {
      for (let i = 0; i < 8; i++) {
        const off = await page.evaluate((y) => {
          const L = window.__lenis;
          L?.resize();
          const el = typeof y === 'string' ? document.querySelector(y) : null;
          const target = el ? el.getBoundingClientRect().top + window.scrollY : y;
          window.scrollTo(0, target);
          L?.scrollTo(target, { immediate: true, force: true });
          return target;
        }, y);
        await esperar(450);
        const ok = await page.evaluate(
          (y, off) => {
            const el = typeof y === 'string' ? document.querySelector(y) : null;
            return el ? Math.abs(el.getBoundingClientRect().top) < 4 : Math.abs(window.scrollY - off) < 4;
          },
          y,
          off,
        );
        if (ok) return;
        await animarScroll(y, 1200, 'quint');
      }
    },
    grabar: (v) => (grabando = v),
    total: () => n,
    fin: () => Promise.all(escrituras),
  };
};


const tomas = [];
const grabar = async (browser, nombre, vp, url, run, desdeCarga = false) => {
  const dir = path.join(RAW, nombre);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport(vp);
  if (vp.isMobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
  await page.evaluateOnNewDocument(RELOJ);
  const cdp = await page.createCDPSession();
  const c = crearCtx(page, cdp, dir, 1);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  if (await page.$('input[type=password]')) throw new Error('La página pide iniciar sesión: no se graba (solo páginas públicas propias).');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const imgs = [...document.images];
    imgs.forEach((im) => ((im.loading = 'eager'), (im.decoding = 'sync')));
    await Promise.all(imgs.map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((r) => (im.onload = im.onerror = r)))));
  });
  await sleepReal(300);
  if (!desdeCarga) {
    await c.esperar(1500);
    // si hay una intro o pantalla de carga a pantalla completa, se espera (tiempo de la web) a que desaparezca
    for (let i = 0; i < 30; i++) {
      const tapa = await page.evaluate(() =>
        [...document.querySelectorAll('body *')].some((el) => {
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05 || cs.pointerEvents === 'none') return false;
          const r = el.getBoundingClientRect();
          return r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.9;
        }),
      );
      if (!tapa) break;
      await c.esperar(500);
    }
  }
  c.grabar(true);
  await run(c);
  c.grabar(false);
  await c.fin();
  await page.close();
  const n = c.total();
  const archivo = path.join(OUT, `${nombre}.mp4`);
  execFileSync(conf.ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart', archivo]);
  fs.writeFileSync(path.join(OUT, `${nombre}.json`), JSON.stringify({ name: nombre, viewport: vp, frames: n, fps: FPS, duration: n / FPS, captura: 'reloj virtual', url }, null, 2));
  fs.rmSync(dir, { recursive: true, force: true });
  tomas.push({ nombre, archivo, segundos: n / FPS, viewport: vp.isMobile ? 'movil' : 'escritorio' });
};

const url = new URL(conf.url).toString();
if (!/^https?:$/.test(new URL(url).protocol)) throw new Error('Solo direcciones http(s)');
if (!(await permitido(url))) throw new Error('El robots.txt de ese sitio no permite recorrer esa página: no se graba.');
const browser = await puppeteer.launch({ executablePath: conf.navegador, headless: 'shell', args: ['--hide-scrollbars', '--force-color-profile=srgb', '--mute-audio'] });
try {
  // datos de la página: título, descripción y titulares (para los textos del vídeo)
  const pg = await browser.newPage();
  await pg.setViewport(MOBILE);
  await pg.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  if (await pg.$('input[type=password]')) throw new Error('La página pide iniciar sesión: no se graba (solo páginas públicas propias).');
  const info = await pg.evaluate(() => {
    const limpio = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const secciones = [...document.querySelectorAll('h2')].map((h) => ({ texto: limpio(h.innerText), y: h.getBoundingClientRect().top + scrollY })).filter((x) => x.texto && x.texto.length < 90);
    return { titulo: limpio(document.title), descripcion: limpio(document.querySelector('meta[name=description]')?.getAttribute('content')), h1: limpio(document.querySelector('h1')?.innerText), secciones: secciones.slice(0, 6), alto: document.documentElement.scrollHeight, colorTema: document.querySelector('meta[name=theme-color]')?.getAttribute('content') ?? null };
  });
  await pg.close();
  const seg = Math.max(6, Math.min(30, conf.segundos ?? 14));
  const pasos = 3 + Math.min(3, info.secciones.length);
  let k = 0;
  progreso(++k, pasos, 'Portada en el móvil');
  await grabar(browser, 'web-portada', MOBILE, url, (c) => c.esperar(4500), true);
  progreso(++k, pasos, 'Recorrido por la página (móvil)');
  await grabar(browser, 'web-recorrido', MOBILE, url, async (c) => {
    await c.esperar(400);
    const fin = await c.page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await c.scrollLineal(fin, seg * 1000);
    await c.esperar(500);
  });
  progreso(++k, pasos, 'Escritorio');
  await grabar(browser, 'web-escritorio', DESKTOP, url, async (c) => {
    await c.esperar(1500);
    const fin = await c.page.evaluate(() => Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 3));
    await c.scrollLineal(fin, 6000);
    await c.esperar(400);
  });
  for (const [i, s] of info.secciones.slice(0, 3).entries()) {
    progreso(++k, pasos, `Sección «${s.texto.slice(0, 30)}»`);
    await grabar(browser, `web-seccion-${i + 1}`, MOBILE, url, async (c) => {
      await c.saltar(Math.max(0, s.y - 120));
      await c.esperar(300);
      await c.scrollLineal(Math.max(0, s.y - 120) + 700, 3500);
      await c.esperar(300);
    });
  }
  fs.writeFileSync(process.argv[3], JSON.stringify({ ...info, url, tomas }, null, 1));
} finally {
  await browser.close();
  fs.rmSync(RAW, { recursive: true, force: true });
}
