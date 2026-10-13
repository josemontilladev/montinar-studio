/**
 * Contrato de datos del editor de vídeo (proyecto.json).
 *
 * Este archivo es la fuente de verdad: vive en editor-video/contrato y se COPIA tal cual en cada proyecto Remotion
 * compatible (src/contrato/). No importa nada del proyecto ni del editor: solo zod.
 *
 * Unidades: tiempos de la línea en FOTOGRAMAS (enteros) salvo que el nombre diga «seg»; posiciones en px del lienzo
 * base (ajustes.ancho × ajustes.alto, p. ej. 1080 × 1920).
 */
import { z } from 'zod';

export const CONTRATO_VERSION = 1;

/** Color: clave de ajustes.paleta («ink», «acid»…) o cualquier color CSS («#fff», «rgba(…)»). */
export const Color = z.string().min(1);

/**
 * Ancla a una palabra de la frase de voz de la escena: el instante = inicio de la palabra + seg (segundos) + frames.
 * `palabra` se busca como subcadena, sin distinguir mayúsculas; `n` = qué aparición (0 = la primera).
 */
export const Ancla = z.object({
  palabra: z.string(),
  n: z.number().int().min(0).default(0),
  seg: z.number().default(0),
  frames: z.number().default(0),
});

/** Instante dentro de una escena: fotograma local (número) o ancla a palabra. */
export const Tiempo = z.union([z.number(), Ancla]);

export const ANIMACIONES = ['mascara', 'fundido', 'pop', 'maquina', 'ninguna'] as const;

/** Estilo visual del texto (galería de estilos): contorno, sombras, fondo/burbuja, degradado y tipografía. */
export const EstiloTexto = z.object({
  trazo: z.object({ color: z.string(), ancho: z.number() }).optional(),
  sombra: z.object({ color: z.string(), x: z.number(), y: z.number(), blur: z.number() }).optional(),
  sombra2: z.object({ color: z.string(), x: z.number(), y: z.number(), blur: z.number() }).optional(),
  brilloColor: z.string().optional(),
  fondo: z.object({ color: z.string(), radio: z.number(), pad: z.number(), tipo: z.enum(['caja', 'burbuja', 'cinta', 'subrayado', 'marco']) }).optional(),
  degradado: z.object({ de: z.string(), a: z.string(), angulo: z.number() }).optional(),
  peso: z.number().optional(),
  mayusculas: z.boolean().optional(),
  espaciado: z.number().optional(),
  cursiva: z.boolean().optional(),
});

export const Texto = z.object({
  id: z.string().min(1),
  /** titulo = titular cinético grande · nota = etiqueta mono pequeña */
  tipo: z.enum(['titulo', 'nota']).default('titulo'),
  /** «/» separa líneas · *entre asteriscos* = palabra con acento (serif cursiva y color de acento) */
  texto: z.string(),
  desde: Tiempo.default(0),
  /** null = hasta el final de la escena */
  hasta: Tiempo.nullable().default(null),
  x: z.number().default(60),
  y: z.number().default(250),
  w: z.number().default(960),
  tam: z.number().positive().default(96),
  /** familia («sans», «serif», «mono» o un nombre de ajustes.fuentes.extra) */
  fuente: z.string().optional(),
  color: Color.default('ink'),
  acento: Color.optional(),
  alinear: z.enum(['left', 'center', 'right']).default('left'),
  /** animación de entrada (ver kit/biblioteca: ANIM_ENTRADA) */
  animacion: z.string().default('mascara'),
  /** salida y bucle opcionales, y duraciones (s) */
  salida: z.string().nullable().optional(),
  bucle: z.string().nullable().optional(),
  durEntrada: z.number().optional(),
  durSalida: z.number().optional(),
  /** estilo visual (contorno, sombra, fondo, degradado…) */
  estilo: EstiloTexto.optional(),
  /** giro en grados (asas del visor) */
  rot: z.number().optional(),
  /** seguimiento de movimiento: desplazamiento (px del lienzo) por fotograma local real */
  seguir: z.array(z.object({ f: z.number(), x: z.number(), y: z.number() })).optional(),
  /** fotogramas entre palabras */
  escalonado: z.number().default(2.5),
  interlineado: z.number().optional(),
  /** entrada de cada palabra (si se da, manda sobre `desde` + escalonado) */
  tiempos: z.array(Tiempo).optional(),
  /** cada palabra entra cuando la dice la voz (+ desfase en fotogramas) */
  sincroVoz: z.object({ desfase: z.number().default(0) }).optional(),
  /** nota: cuadradito de color delante */
  punto: Color.optional(),
  /** la plantilla dibuja este texto en un sitio concreto (si no, va encima de la escena) */
  grupo: z.string().optional(),
  /** resplandor (0 = nada) */
  brillo: z.number().min(0).max(1).default(0),
});

/** Una toma (vídeo/imagen de public/) usada por la escena. t(s) = t0 + s · velocidad, limitado a [desde, hasta]. */
export const Toma = z.object({
  rol: z.string().default('principal'),
  /** ruta relativa a public/ («footage/m-intro.mp4») */
  src: z.string(),
  /** segundo de la toma en el instante s = 0 (cuando empieza la voz de la escena, o el inicio si no tiene voz) */
  t0: z.number().default(0),
  velocidad: z.number().default(1),
  /** punto de entrada / salida (segundos de la toma) */
  desde: z.number().optional(),
  hasta: z.number().optional(),
  /** remapeo por tramos [[s, t], …] (manda sobre t0/velocidad) */
  curva: z.array(z.tuple([z.number(), z.number()])).optional(),
  suave: z.enum(['lin', 'io']).default('lin'),
});

export const CURVAS = ['suave', 'lineal', 'expo', 'quint', 'muelle'] as const;

export const ClaveCamara = z.object({
  /** fotograma local de la escena */
  f: z.number(),
  /** curva del tramo que sale de esta clave hacia la siguiente */
  curva: z.enum(CURVAS).default('suave'),
  zoom: z.number().positive().default(1),
  x: z.number().default(0),
  y: z.number().default(0),
});

export const TRANSICIONES = ['corte', 'fundido', 'desenfoque', 'circulo', 'cortina', 'empuje', 'barrido', 'deslizar', 'zoom', 'match', 'scroll'] as const;

/** Elemento gráfico (pegatina): forma, flecha, insignia, rótulo, red social… (kit/elementos.tsx). */
export const Elemento = z.object({
  id: z.string().min(1),
  tipo: z.string(),
  x: z.number().default(390),
  y: z.number().default(800),
  w: z.number().default(300),
  h: z.number().default(300),
  rot: z.number().default(0),
  color: z.string().default('acid'),
  color2: z.string().default('ink'),
  texto: z.string().default(''),
  desde: z.union([z.number(), z.object({ palabra: z.string(), n: z.number().default(0), seg: z.number().default(0), frames: z.number().default(0) })]).default(0),
  hasta: z.union([z.number(), z.object({ palabra: z.string(), n: z.number().default(0), seg: z.number().default(0), frames: z.number().default(0) })]).nullable().default(null),
  entrada: z.string().default('pop'),
  opacidad: z.number().min(0).max(1).default(1),
  seguir: z.array(z.object({ f: z.number(), x: z.number(), y: z.number() })).optional(),
});

/** Transición de ENTRADA de la escena (la escena nueva se dibuja encima de la anterior durante `duracion`). */
export const Transicion = z.object({
  /** ver kit/biblioteca: TRANSICIONES_INFO */
  tipo: z.string().default('corte'),
  duracion: z.number().int().min(0).default(0),
  ox: z.number().optional(),
  oy: z.number().optional(),
});

export const Escena = z.object({
  id: z.string().min(1),
  nombre: z.string().default(''),
  /** id de plantilla registrada por el proyecto (src/editor.ts → plantillas) */
  plantilla: z.string().min(1),
  /** fotogramas que ocupa en la pista principal (sin contar la transición de la siguiente) */
  duracion: z.number().int().min(1),
  /** fotogramas recortados al principio (punto de entrada) */
  recorte: z.number().int().min(0).default(0),
  /** frase de voz con la que se sincroniza la plantilla (palabras ancla) */
  frase: z.string().nullable().default(null),
  /** si la frase no está colocada en esta escena: fotogramas desde el inicio hasta s = 0 */
  preDefecto: z.number().default(7),
  /** fondo: tono de papel («bone», «bone2», «ink», «acid») o color */
  fondo: z.string().optional(),
  /** dibujar el marco del dispositivo (teléfono / navegador) */
  marco: z.boolean().default(true),
  tomas: z.array(Toma).default([]),
  camara: z.array(ClaveCamara).default([]),
  textos: z.array(Texto).default([]),
  transicion: Transicion.default({ tipo: 'corte', duracion: 0 }),
  /** parámetros propios de la plantilla */
  params: z.record(z.string(), z.any()).default({}),
  /** acabado: destellos de luz y desenfoque de movimiento en la cámara */
  efectos: z
    .object({ luz: z.enum(['ninguna', 'calida', 'fria', 'neon']).default('ninguna'), intensidad: z.number().min(0).max(1).default(0.5), desenfoqueMovimiento: z.boolean().default(true) })
    .default({ luz: 'ninguna', intensidad: 0.5, desenfoqueMovimiento: true }),
  /** centro de interés vertical (px del lienzo) para reencuadrar a 4:5 / 1:1 */
  foco: z.number().optional(),
  /** ajuste manual del reencuadre por formato («4:5», «1:1», «16:9»): centro vertical (px del lienzo) */
  focos: z.record(z.string(), z.number()).optional(),
  /** filtro de color (kit/biblioteca: FILTROS) */
  filtro: z.object({ id: z.string(), intensidad: z.number().min(0).max(1).default(1) }).nullable().default(null),
  /** efectos de la biblioteca (kit/biblioteca: EFECTOS) */
  extras: z.array(z.object({ id: z.string(), intensidad: z.number().min(0).max(1).default(0.7) })).default([]),
  /** pegatinas y elementos gráficos */
  elementos: z.array(Elemento).default([]),
});

export const Palabra = z.object({ p: z.string(), ini: z.number(), fin: z.number() });

export const TomaVoz = z.object({
  archivo: z.string(),
  duracion: z.number(),
  palabras: z.array(Palabra),
  texto: z.string().default(''),
  fecha: z.string().default(''),
});

export const Frase = z.object({
  id: z.string().min(1),
  /** lo que se dice y lo que sale en los subtítulos */
  texto: z.string(),
  /** cómo se pronuncia (opcional) */
  dicho: z.string().optional(),
  /** id de la voz (Piper: nombre del .onnx; edge: nombre neuronal). Vacío = la de voz.voz */
  voz: z.string().optional(),
  /** escena a la que va pegada (se mueve con ella) y fotogramas desde el ORIGEN de esa escena */
  escena: z.string(),
  offset: z.number().int().default(7),
  archivo: z.string(),
  duracion: z.number().min(0),
  palabras: z.array(Palabra).default([]),
  volumen: z.number().min(0).max(2).default(1),
  subtitulos: z.boolean().default(true),
  /** tomas anteriores (para volver a una) */
  tomas: z.array(TomaVoz).default([]),
});

export const Voz = z.object({
  /** false = vídeo sin voz: no suena (se conserva para volver a activarla), la música no se agacha */
  activa: z.boolean().default(true),
  motor: z.string().default('piper'),
  voz: z.string().default(''),
  frases: z.array(Frase).default([]),
});

export const ESTILOS_SUB = ['resaltado', 'karaoke', 'pop', 'limpio'] as const;

/** Pista de subtítulos propia (transcrita de un audio cualquiera): palabras en segundos desde `inicio` (fotograma). */
export const PistaSub = z.object({ src: z.string().nullable().default(null), inicio: z.number().default(0), palabras: z.array(Palabra).default([]) });

export const Subtitulos = z.object({
  visible: z.boolean().default(true),
  /** voz = las palabras de las frases de voz · pista = la pista propia (transcripción de otro audio) */
  origen: z.enum(['voz', 'pista']).default('voz'),
  pista: PistaSub.default({ src: null, inicio: 0, palabras: [] }),
  estilo: z.enum(ESTILOS_SUB).default('resaltado'),
  /** auto = encima de la zona segura inferior; manual = `y` */
  posicion: z.enum(['manual', 'auto']).default('manual'),
  /** letras por línea dentro de un bloque (0 = una sola línea que se parte sola) */
  maxLetrasLinea: z.number().int().min(0).default(0),
  y: z.number().default(1390),
  alto: z.number().default(150),
  tam: z.number().default(54),
  fuente: z.string().optional(),
  color: Color.default('bone'),
  resalte: Color.default('acid'),
  colorResalte: Color.default('ink'),
  fondo: z.string().default('rgba(10,10,12,0.86)'),
  maxPalabras: z.number().int().min(1).default(4),
  maxLetras: z.number().int().min(4).default(24),
  mayusculas: z.boolean().default(false),
  /** sombra/contorno del texto (estilo «limpio») */
  sombra: z.boolean().default(true),
  /** estilo de la galería aplicado (informativo) */
  preset: z.string().optional(),
  /** contorno de las letras */
  trazo: z.object({ color: z.string(), ancho: z.number() }).nullable().default(null),
  /** cómo se marca la palabra que suena */
  resalteModo: z.enum(['fondo', 'color', 'subrayado', 'escala']).default('fondo'),
  cajaRadio: z.number().default(28),
  peso: z.number().default(650),
  sombraColor: z.string().nullable().default(null),
});

export const Musica = z.object({
  src: z.string().nullable().default(null),
  /** volumen cuando no hay voz */
  volumen: z.number().min(0).max(2).default(0.5),
  ducking: z.boolean().default(true),
  /** volumen mientras habla la voz */
  volumenVoz: z.number().min(0).max(2).default(0.17),
  /** fotogramas antes / después de cada frase en que ya está agachada, y rampa */
  antes: z.number().default(5),
  despues: z.number().default(6),
  rampa: z.number().default(9),
  fadeIn: z.number().default(6),
  fadeInDesde: z.number().default(0.6),
  fadeOut: z.number().default(40),
  /** segundo de la pista en que empieza */
  inicio: z.number().default(0),
  /** pulsos detectados (segundos de la pista) y tempo */
  beats: z.array(z.number()).default([]),
  bpm: z.number().nullable().default(null),
});

export const Sfx = z.object({
  id: z.string().min(1),
  src: z.string(),
  volumen: z.number().min(0).max(2).default(0.3),
  /** fotogramas que suena (corte) */
  duracion: z.number().int().min(1).default(30),
  /** pegado a una escena: origen de la escena + (ancla a palabra de su frase) + offset */
  escena: z.string(),
  ancla: Ancla.optional(),
  offset: z.number().default(0),
});

export const Ajustes = z.object({
  ancho: z.number().int().default(1080),
  alto: z.number().int().default(1920),
  fps: z.number().int().default(30),
  siteUrl: z.string().default(''),
  whatsapp: z.string().default(''),
  legal: z.string().default(''),
  paleta: z.record(z.string(), z.string()).default({}),
  fuentes: z
    .object({ sans: z.string().default('Geist'), serif: z.string().default('Instrument Serif'), mono: z.string().default('Geist Mono') })
    .default({ sans: 'Geist', serif: 'Instrument Serif', mono: 'Geist Mono' }),
  zonas: z.object({ arriba: z.number().default(220), abajo: z.number().default(380) }).default({ arriba: 220, abajo: 380 }),
  fondo: z.string().default('#0A0A0C'),
  vineta: z.number().default(0.22),
  grano: z.number().default(0.06),
  /** kit de marca */
  marca: z
    .object({ nombre: z.string().default(''), logo: z.string().nullable().default(null), eslogan: z.string().default(''), cta: z.string().default('') })
    .default({ nombre: '', logo: null, eslogan: '', cta: '' }),
  /** tipografías de la biblioteca copiadas al proyecto (public/fuentes) para que funcionen sin conexión */
  /** reencuadre por formato: «recortar» (llenar el cuadro siguiendo el foco) o «adaptar» (encajar sobre fondo) y zoom extra */
  reencuadre: z.record(z.string(), z.object({ modo: z.enum(['adaptar', 'recortar']), zoom: z.number().min(1).max(3).default(1) })).optional(),
  fuentesExtra: z.array(z.object({ familia: z.string(), archivos: z.array(z.object({ src: z.string(), peso: z.number() })) })).default([]),
  /** ganancia global de la mezcla (dB) y objetivo de sonoridad (LUFS) */
  audio: z.object({ ganancia: z.number().default(0), objetivo: z.number().default(-14) }).default({ ganancia: 0, objetivo: -14 }),
});

export const Proyecto = z.object({
  version: z.literal(CONTRATO_VERSION).default(CONTRATO_VERSION),
  nombre: z.string().default('Proyecto'),
  ajustes: Ajustes,
  escenas: z.array(Escena).min(1),
  voz: Voz.default({ activa: true, motor: 'piper', voz: '', frases: [] }),
  subtitulos: Subtitulos.default(Subtitulos.parse({})),
  musica: Musica.default(Musica.parse({})),
  sfx: z.array(Sfx).default([]),
});

export const FORMATOS = {
  '9:16': { ancho: 1080, alto: 1920, nombre: 'Vertical 9:16 · 1080 × 1920' },
  '4:5': { ancho: 1080, alto: 1350, nombre: 'Feed 4:5 · 1080 × 1350' },
  '1:1': { ancho: 1080, alto: 1080, nombre: 'Cuadrado 1:1 · 1080 × 1080' },
  '16:9': { ancho: 1920, alto: 1080, nombre: 'Horizontal 16:9 · 1920 × 1080' },
} as const;
export type Formato = keyof typeof FORMATOS;

/**
 * Props de la composición: { proyecto, formato } y opciones de salida:
 * encuadre (adaptar = lienzo encajado sobre fondo; recortar = reencuadre automático al foco de cada escena),
 * sinSubtitulos (para exportarlos aparte) y portada (título encima, para miniaturas).
 */
export const PropsVideo = z.object({
  proyecto: Proyecto,
  formato: z.enum(['9:16', '4:5', '1:1', '16:9']).default('9:16'),
  encuadre: z.enum(['adaptar', 'recortar']).default('adaptar'),
  sinSubtitulos: z.boolean().default(false),
  portada: z.object({ titulo: z.string(), subtitulo: z.string().default('') }).nullable().default(null),
});

export type TAncla = z.infer<typeof Ancla>;
export type TTiempo = z.infer<typeof Tiempo>;
export type TTexto = z.infer<typeof Texto>;
export type TEstiloTexto = z.infer<typeof EstiloTexto>;
export type TElemento = z.infer<typeof Elemento>;
export type TToma = z.infer<typeof Toma>;
export type TClaveCamara = z.infer<typeof ClaveCamara>;
export type TTransicion = z.infer<typeof Transicion>;
export type TEscena = z.infer<typeof Escena>;
export type TPalabra = z.infer<typeof Palabra>;
export type TFrase = z.infer<typeof Frase>;
export type TSfx = z.infer<typeof Sfx>;
export type TMusica = z.infer<typeof Musica>;
export type TSubtitulos = z.infer<typeof Subtitulos>;
export type TAjustes = z.infer<typeof Ajustes>;
export type TProyecto = z.infer<typeof Proyecto>;
export type TPropsVideo = { proyecto: TProyecto; formato?: Formato; encuadre?: 'adaptar' | 'recortar'; sinSubtitulos?: boolean; portada?: { titulo: string; subtitulo?: string } | null };

/** Valida y completa valores por defecto. Lanza un error legible si algo no cuadra. */
export const validarProyecto = (x: unknown): TProyecto => {
  const r = Proyecto.safeParse(x);
  if (!r.success) {
    const msg = r.error.issues
      .slice(0, 8)
      .map((i) => `· ${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('\n');
    throw new Error(`proyecto.json no es válido:\n${msg}`);
  }
  return r.data;
};
