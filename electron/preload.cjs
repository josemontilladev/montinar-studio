// Puente mínimo entre la interfaz y la app de escritorio (menú propio en la barra de título).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studio', {
  escritorio: true,
  accion: (a, x) => ipcRenderer.invoke('accion', a, x),
});
