// Copia de metrica-seo: la escribe herramientas/sincronizar-diseno.mjs. No la edites aquí.
/** Building blocks, brand pieces: key, label, drawing, viewBox, options. */
import * as A from "./libraryCardsA";
import * as B from "./libraryCardsB";
import * as CC from "./libraryCardsC";
import * as Bits from "./libraryBits";
import * as G from "./libraryGlyphs";
import * as Brand from "./libraryBrand";
import type { LibraryItem } from "./libraryTypes";
import type { VB } from "./libraryCovers";

export type Piece = [
  key: string,
  label: string,
  Render: LibraryItem["Render"],
  viewBox: VB,
  opts?: Partial<LibraryItem>,
];

export const PIECES: Piece[] = [
  [
    "piece-checklist",
    "Checklist",
    A.ChecklistCard,
    [136, 60, 234, 302],
    { tags: "tareas lista auditoria" },
  ],
  [
    "piece-health",
    "Anillo de salud",
    A.HealthRing,
    [348, 136, 200, 204],
    { wordSlot: true, tags: "puntuacion score" },
  ],
  [
    "piece-line-chart",
    "Gráfica de líneas",
    A.LineChartCard,
    [76, 80, 352, 250],
    { tags: "chart tendencia" },
  ],
  [
    "piece-stat",
    "Tarjeta de cifra",
    A.StatCard,
    [364, 186, 208, 152],
    { wordSlot: true, tags: "kpi numero" },
  ],
  [
    "piece-kpi",
    "KPI",
    A.KpiTile,
    [-2, -2, 184, 126],
    { wordSlot: true, tags: "metrica numero" },
  ],
  [
    "piece-kpi-grid",
    "Panel de KPIs",
    A.KpiGrid,
    [122, 110, 256, 190],
    { tags: "metricas informe" },
  ],
  [
    "piece-bars",
    "Gráfica de barras",
    B.BarChartCard,
    [-2, -2, 304, 232],
    { wordSlot: true, tags: "barras sesiones" },
  ],
  [
    "piece-chat",
    "Respuesta de IA",
    B.ChatBubble,
    [100, 80, 358, 228],
    { tags: "chatgpt citas burbuja" },
  ],
  [
    "piece-source",
    "Fuente citada",
    B.SourceCard,
    [388, 194, 192, 132],
    { tags: "cita web" },
  ],
  [
    "piece-browser",
    "Navegador",
    B.BrowserWindow,
    [-2, -2, 414, 272],
    { tags: "ventana web pagina" },
  ],
  [
    "piece-serp",
    "Resultado de Google",
    B.SerpSnippet,
    [68, 88, 380, 168],
    { tags: "serp snippet busqueda" },
  ],
  [
    "piece-ranking",
    "Ranking",
    CC.RankingList,
    [92, 66, 278, 274],
    { tags: "posiciones lista" },
  ],
  [
    "piece-position",
    "Posición media",
    CC.PositionCard,
    [330, 174, 234, 172],
    { wordSlot: true, tags: "grafica posicion" },
  ],
  [
    "piece-report",
    "Informe",
    CC.ReportSheet,
    [116, 56, 270, 308],
    { tags: "reporte hoja" },
  ],
  [
    "piece-timeline",
    "Cronograma",
    CC.TimelineBoard,
    [76, 70, 488, 276],
    { tags: "gantt plan meses" },
  ],
  [
    "piece-page",
    "Página",
    CC.PageCard,
    [-2, -2, 122, 148],
    { tags: "documento url" },
  ],
  [
    "piece-url",
    "Barra de URL",
    Bits.UrlBar,
    [60, 80, 520, 66],
    { tags: "utm direccion enlace" },
  ],
  [
    "piece-utm",
    "Etiquetas UTM",
    Bits.UtmTags,
    [108, 130, 280, 196],
    { tags: "chips etiquetas" },
  ],
  [
    "piece-link",
    "Enlace",
    Bits.LinkChain,
    [438, 197, 130, 130],
    { tags: "cadena link" },
  ],
  [
    "piece-plane",
    "Avión de papel",
    Bits.PaperPlane,
    [420, 100, 132, 118],
    { tags: "enviar" },
  ],
  [
    "piece-trail",
    "Trazo punteado",
    Bits.DashedTrail,
    [0, 4, 136, 94],
    { tags: "flecha camino" },
  ],
  [
    "piece-magnifier",
    "Lupa",
    Bits.Magnifier,
    [404, 184, 156, 156],
    { tags: "buscar" },
  ],
  [
    "piece-cursor",
    "Clic",
    Bits.ClickCursor,
    [322, 148, 38, 70],
    { tags: "cursor raton puntero" },
  ],
  [
    "piece-sparkle",
    "Destellos",
    G.Sparkles,
    [0, 0, 92, 76],
    { tags: "ia brillo" },
  ],
  [
    "piece-trend",
    "Flecha de tendencia",
    G.TrendArrow,
    [0, 8, 104, 64],
    { tags: "subida crecimiento" },
  ],
  [
    "piece-warning",
    "Aviso",
    G.WarningBadge,
    [0, 0, 64, 70],
    { tags: "alerta error" },
  ],
  ["piece-check", "Check", G.CheckBadge, [0, 0, 64, 70], { tags: "ok hecho" }],
  [
    "piece-calendar",
    "Calendario",
    G.CalendarCard,
    [-2, -2, 208, 220],
    { tags: "fecha mes" },
  ],
  [
    "piece-tag",
    "Etiqueta",
    G.TagShape,
    [0, 0, 132, 70],
    { tags: "tag precio" },
  ],
  [
    "piece-pill",
    "Píldora",
    G.PillShape,
    [0, 0, 150, 49],
    { tags: "pill estado" },
  ],
];

export const BRAND: Piece[] = [
  [
    "brand-logo",
    "Logo MétricaSEO",
    Brand.BrandLogo,
    [5, 11, 180, 33],
    { size: 420, tags: "marca lockup" },
  ],
  [
    "brand-wordmark",
    "Logo compacto",
    Brand.BrandWordmark,
    [0, 0, 180, 40],
    { size: 340 },
  ],
  [
    "brand-m",
    "M de la marca",
    Brand.BrandM,
    [5, 9.3, 37.7, 33.7],
    { size: 160 },
  ],
  [
    "brand-tile",
    "Icono de la app",
    Brand.BrandTile,
    [0, 0, 48, 48],
    { size: 140 },
  ],
  [
    "brand-dot",
    "Punto de acento",
    Brand.BrandDot,
    [0, 0, 20, 20],
    { size: 48 },
  ],
  [
    "brand-marker",
    "Subrayado marcador",
    Brand.MarkerUnderline,
    [0, 0, 200, 30],
    { size: 360 },
  ],
];
