import { CalendarDays } from "lucide-react";
import { useApp } from "../store";

const ALTURAS = [55, 100, 78, 62, 88, 47, 34, 52, 24, 38, 18, 28];

export function PipelineCard() {
  const stats = useApp((s) => s.stats);

  return (
    <div className="flex flex-1 flex-col rounded-3xl bg-accent p-5 text-ink">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-ink/70">
          Rondas de consenso
        </span>
        <CalendarDays className="h-4 w-4 text-ink/50" />
      </div>

      <p className="mt-2 text-5xl font-semibold tracking-tight">
        {stats.rondas.toLocaleString("es-AR")}
      </p>
      <p className="mt-1 text-sm text-ink/60">
        {stats.rondas === 0
          ? "Todavía no hubo veredictos"
          : `${stats.tasaAprobacion.toLocaleString("es-AR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} % de ideas aprobadas`}
      </p>

      {/* Gráfico de barras minimalista: tenue hasta que haya actividad real */}
      <div className="mt-auto flex h-28 items-end gap-1.5 pt-6">
        {ALTURAS.map((altura, i) => (
          <div
            key={i}
            className={`w-2.5 rounded-full ${
              stats.rondas > 0 ? "bg-ink" : "bg-ink/15"
            }`}
            style={{ height: `${altura}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {ALTURAS.map((_, i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        ))}
      </div>
    </div>
  );
}
