/**
 * Tema del estudio: la lógica es la compartida de toda la app (app/marca/tema.ts, misma clave que el editor de
 * vídeo); aquí solo vive el botón sol/luna con las clases de daisyUI.
 */
import { Moon, Sun } from 'lucide-react';
import { useTema } from '../marca/tema';

export { iniciarTema } from '../marca/tema';

/** Botón sol/luna de la barra superior, como el de la web. */
export function BotonTema() {
  const [tema, alternar] = useTema();
  return (
    <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={alternar} title={tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'} aria-label="Cambiar tema" data-tema>
      {tema === 'oscuro' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
