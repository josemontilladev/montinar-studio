import { createRoot } from 'react-dom/client';
import './estilos.css';
import { Estudio } from './Estudio';
import { iniciarTema } from './tema';

iniciarTema();

createRoot(document.getElementById('raiz')!).render(<Estudio />);
