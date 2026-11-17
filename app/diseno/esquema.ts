/**
 * Documento del estudio de diseño (posts, flyers, carruseles, banners): un tamaño y 1..N páginas, cada una con su
 * fondo y sus elementos en unidades del lienzo (px de la imagen final a 1x). Lo validan la interfaz y el servidor.
 */
import { z } from 'zod';

const base = {
  id: z.string().min(1).max(40),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  /** Grados, alrededor del centro del elemento. */
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().optional(),
};

const color = z.string().max(40);

export const elementoSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('art'),
    /** Clave en la librería de ilustraciones (con «|palabra» en las plantillas). */
    art: z.string().min(1).max(120),
    tint: color.optional(),
  }),
  z.object({
    ...base,
    type: z.literal('shape'),
    shape: z.enum(['rect', 'ellipse', 'line']),
    fill: color.default('#74f5a1'),
    stroke: color.optional(),
    strokeWidth: z.number().min(0).max(200).default(0),
    radius: z.number().min(0).max(2000).default(0),
  }),
  z.object({
    ...base,
    type: z.literal('text'),
    text: z.string().max(4000),
    fontFamily: z.enum(['display', 'body', 'mono']).default('display'),
    fontSize: z.number().min(4).max(1200).default(64),
    fontWeight: z.number().min(100).max(900).default(700),
    color: color.default('#212121'),
    align: z.enum(['left', 'center', 'right']).default('left'),
    /** En em: -0.04 para los titulares apretados de la marca. */
    letterSpacing: z.number().min(-0.2).max(0.5).default(-0.03),
    lineHeight: z.number().min(0.7).max(3).default(1.05),
  }),
  z.object({
    ...base,
    type: z.literal('image'),
    /** Ruta dentro de la carpeta del diseño: «recursos/foto.png». */
    src: z.string().regex(/^recursos\/[^/\\]+$/).max(200),
    fit: z.enum(['cover', 'contain']).default('cover'),
    radius: z.number().min(0).max(2000).default(0),
  }),
]);

export const paginaSchema = z.object({
  id: z.string().min(1).max(40),
  background: color,
  dots: z.boolean().default(false),
  dotColor: color.optional(),
  elements: z.array(elementoSchema).max(300),
});

export const disenoSchema = z.object({
  version: z.literal(1),
  nombre: z.string().min(1).max(120),
  /** Formato de partida (id de FORMATOS o «personalizado»). */
  formato: z.string().max(40).default('personalizado'),
  ancho: z.number().int().min(64).max(8000),
  alto: z.number().int().min(64).max(8000),
  paginas: z.array(paginaSchema).min(1).max(60),
});

export type Elemento = z.infer<typeof elementoSchema>;
export type Pagina = z.infer<typeof paginaSchema>;
export type Diseno = z.infer<typeof disenoSchema>;
export type Tam = { w: number; h: number };
export type ElTexto = Extract<Elemento, { type: 'text' }>;
export type ElForma = Extract<Elemento, { type: 'shape' }>;
export type ElArte = Extract<Elemento, { type: 'art' }>;
export type ElImagen = Extract<Elemento, { type: 'image' }>;

export const validarDiseno = (x: unknown): Diseno => disenoSchema.parse(x);

export const FORMATOS: { id: string; nombre: string; desc: string; ancho: number; alto: number }[] = [
  { id: 'post', nombre: 'Post 4:5', desc: 'Instagram, LinkedIn', ancho: 1080, alto: 1350 },
  { id: 'cuadrado', nombre: 'Cuadrado', desc: 'Post 1:1', ancho: 1080, alto: 1080 },
  { id: 'historia', nombre: 'Historia / Reel', desc: 'Vertical 9:16', ancho: 1080, alto: 1920 },
  { id: 'horizontal', nombre: 'Horizontal 16:9', desc: 'Presentación, vídeo', ancho: 1920, alto: 1080 },
  { id: 'blog', nombre: 'Portada de blog', desc: 'Artículos de MétricaSEO', ancho: 1200, alto: 750 },
  { id: 'social', nombre: 'Imagen social', desc: 'Open Graph, X, enlaces', ancho: 1200, alto: 630 },
  { id: 'a4', nombre: 'Flyer A4', desc: 'Para imprimir o PDF', ancho: 1240, alto: 1754 },
  { id: 'facebook', nombre: 'Portada de Facebook', desc: 'Cabecera de página', ancho: 1640, alto: 624 },
  { id: 'youtube', nombre: 'Banner de YouTube', desc: 'Cabecera del canal', ancho: 2560, alto: 1440 },
];

const idCorto = () => Math.random().toString(36).slice(2, 10);
export const paginaVacia = (background = '#f3f3f3'): Pagina => ({ id: idCorto(), background, dots: false, elements: [] });

export const disenoNuevo = (nombre: string, formato: string, ancho: number, alto: number): Diseno => ({
  version: 1,
  nombre,
  formato,
  ancho: Math.round(ancho),
  alto: Math.round(alto),
  paginas: [paginaVacia()],
});
