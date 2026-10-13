/** Formulario para los parámetros de una plantilla del kit (según sus `campos`). */
import React from 'react';
import { useEd } from './estado';
import { Campo, ColorP, Num, Segmentos, Si, Texto } from './campos';

type CampoDef = { k: string; et: string; tipo: 'texto' | 'area' | 'lista' | 'numero' | 'color' | 'si' | 'opcion'; ops?: string[] };

export const PanelCampos: React.FC<{ escena: string; campos: CampoDef[]; params: Record<string, any> }> = ({ escena, campos, params }) => {
  const editar = useEd((s) => s.editar);
  const set = (k: string, v: unknown) =>
    editar(`campo:${escena}:${k}`, (d) => {
      const e = d.escenas.find((x) => x.id === escena);
      if (!e) return;
      if (v === undefined || v === '') delete e.params[k];
      else e.params[k] = v;
    });
  return (
    <div data-prueba="campos-plantilla">
      {campos.map((c) => {
        const v = params[c.k];
        let ctl: React.ReactNode;
        if (c.tipo === 'texto') ctl = <Texto v={v ?? ''} on={(x) => set(c.k, x)} prueba={`campo-${c.k}`} />;
        else if (c.tipo === 'area') ctl = <Texto v={v ?? ''} on={(x) => set(c.k, x)} area prueba={`campo-${c.k}`} />;
        else if (c.tipo === 'lista')
          ctl = (
            <textarea
              rows={Math.max(3, (Array.isArray(v) ? v.length : 3) + 1)}
              value={Array.isArray(v) ? v.join('\n') : String(v ?? '')}
              onChange={(e) => set(c.k, e.target.value.split('\n'))}
              data-prueba={`campo-${c.k}`}
            />
          );
        else if (c.tipo === 'numero') ctl = <Num v={v} on={(x) => set(c.k, x)} paso={0.05} />;
        else if (c.tipo === 'color') ctl = <ColorP v={v} on={(x) => set(c.k, x)} ninguno />;
        else if (c.tipo === 'si') ctl = <Si v={v !== false} on={(x) => set(c.k, x)} />;
        else ctl = <Segmentos v={String(v ?? c.ops?.[0] ?? '')} ops={(c.ops ?? []).map((o) => [o, o.charAt(0).toUpperCase() + o.slice(1)])} on={(x) => set(c.k, x)} />;
        return (
          <Campo key={c.k} et={c.et} col={c.tipo === 'area' || c.tipo === 'lista' || c.tipo === 'color'}>
            {ctl}
          </Campo>
        );
      })}
    </div>
  );
};
