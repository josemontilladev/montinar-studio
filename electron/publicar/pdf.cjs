/**
 * Carrusel → PDF para el «documento» de LinkedIn: una página por imagen, del tamaño exacto de la primera imagen,
 * con el navegador de Electron (printToPDF). Sin dependencias nuevas.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

/** HTML con una página por imagen (pruebas: pruebas/pdf.test.cjs). */
const htmlCarrusel = (imagenes, { ancho, alto }) => `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${ancho}px ${alto}px; margin: 0 }
html, body { margin: 0; padding: 0; background: #ffffff }
.p { width: ${ancho}px; height: ${alto}px; overflow: hidden; break-after: page; display: flex; align-items: center; justify-content: center }
.p:last-child { break-after: auto }
img { width: 100%; height: 100%; object-fit: contain; display: block }
</style></head><body>${imagenes.map((f) => `<div class="p"><img src="${pathToFileURL(f).href}"></div>`).join('')}</body></html>`;

/**
 * @param {{ BrowserWindow: any, nativeImage: any }} electron
 * @param {string[]} imagenes rutas absolutas, en orden
 * @param {string} destino ruta del .pdf
 */
const carruselAPdf = async ({ BrowserWindow, nativeImage }, imagenes, destino) => {
  if (!imagenes.length) throw new Error('El carrusel no tiene imágenes.');
  if (imagenes.length > 300) throw new Error('LinkedIn admite documentos de hasta 300 páginas.');
  const faltan = imagenes.filter((f) => !fs.existsSync(f));
  if (faltan.length) throw new Error(`Faltan imágenes del carrusel: ${faltan.map((f) => path.basename(f)).join(', ')}`);
  const { width: ancho, height: alto } = nativeImage.createFromPath(imagenes[0]).getSize();
  if (!ancho || !alto) throw new Error(`No se pudo leer la imagen ${path.basename(imagenes[0])}.`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-pdf-'));
  const html = path.join(tmp, 'carrusel.html');
  fs.writeFileSync(html, htmlCarrusel(imagenes, { ancho, alto }));
  const w = new BrowserWindow({ show: false, width: 800, height: 1000, webPreferences: { offscreen: false, sandbox: true, javascript: false } });
  try {
    await w.loadFile(html);
    // que estén todas las imágenes decodificadas antes de imprimir
    await new Promise((r) => setTimeout(r, 300));
    const pdf = await w.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, pdf);
    return { ruta: destino, paginas: imagenes.length, tam: pdf.length, ancho, alto };
  } finally {
    w.destroy();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};

module.exports = { htmlCarrusel, carruselAPdf };
