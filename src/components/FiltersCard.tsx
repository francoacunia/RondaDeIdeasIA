import { SlidersHorizontal } from "lucide-react";
import { Slider } from "./ui/Slider";
import { Toggle } from "./ui/Toggle";
import { useApp } from "../store";

export function FiltersCard() {
  const filtros = useApp((s) => s.filtros);
  const setFiltro = useApp((s) => s.setFiltro);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">Filtros de ideas</span>
        <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
      </div>

      <div className="mt-4 space-y-4">
        <Slider
          etiqueta="Costo"
          detalle="Bajo — Alto"
          valor={filtros.costo}
          onCambio={(v) => setFiltro("costo", v)}
        />
        <Slider
          etiqueta="Viabilidad"
          detalle="Fácil — Difícil"
          valor={filtros.viabilidad}
          onCambio={(v) => setFiltro("viabilidad", v)}
        />
        <Slider
          etiqueta="Plazo"
          detalle="Corto — Largo"
          valor={filtros.plazo}
          onCambio={(v) => setFiltro("plazo", v)}
        />
        <Slider
          etiqueta="Umbral de consenso"
          detalle={`${filtros.umbral} %`}
          valor={filtros.umbral}
          min={50}
          max={100}
          onCambio={(v) => setFiltro("umbral", v)}
        />

        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <div>
            <p className="text-sm text-zinc-200">
              {filtros.brutal ? "Honestidad brutal" : "Sinceridad alta"}
            </p>
            <p className="text-xs text-zinc-500">
              {filtros.brutal
                ? "El consejo no suaviza nada"
                : "Honesto pero constructivo"}
            </p>
          </div>
          <Toggle
            activo={filtros.brutal}
            onCambio={(v) => setFiltro("brutal", v)}
            etiquetaAccesible="Alternar entre sinceridad alta y honestidad brutal"
          />
        </div>
      </div>
    </div>
  );
}
