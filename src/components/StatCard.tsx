import { ArrowUpRight } from "lucide-react";
import { useApp } from "../store";

export function StatCard() {
  const aprobadas = useApp((s) => s.stats.aprobadas);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-zinc-400">
          Ideas aprobadas por el consejo
        </span>
        <ArrowUpRight className="h-4 w-4 text-zinc-500" />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {aprobadas.toLocaleString("es-AR")}
      </p>
    </div>
  );
}
