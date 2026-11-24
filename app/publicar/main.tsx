import { createRoot } from 'react-dom/client';
import './estilos.css';
import { Publicar } from './Publicar';
import { iniciarTema } from '../diseno/tema';

iniciarTema();

createRoot(document.getElementById('raiz')!).render(<Publicar />);
