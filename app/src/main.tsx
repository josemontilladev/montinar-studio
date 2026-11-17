import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos.css';
import { irA, useEd } from './estado';

// acceso al estado desde la consola / pruebas automáticas
(window as any).__ed = useEd;
(window as any).__irA = irA;
// para el menú de la app de escritorio
(window as any).__guardar = () => import('./guardado').then((m) => m.guardarAhora(true, 'manual'));
// cierre limpio desde la app de escritorio: guarda y marca el diario como cerrado (no se ofrecerá recuperar)
(window as any).__cerrar = () =>
  import('./guardado')
    .then((m) => m.guardarAhora(false))
    .then(() => fetch('/api/diario/cerrar', { method: 'POST' }));

// estudio de diseño (segunda página, /diseno.html): desde el menú de la app de escritorio o desde Inicio
(window as any).__nuevoDiseno = () => import('./InicioDisenos').then((m) => m.irADiseno('?nuevo=1'));
(window as any).__abrirDisenos = () => import('./InicioDisenos').then((m) => m.irADiseno());

createRoot(document.getElementById('raiz')!).render(<App />);
