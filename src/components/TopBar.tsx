import { useEffect, useState } from "react";
import { Bell, ChevronDown, Sparkles } from "lucide-react";
import { salud } from "../lib/api";
import { useApp } from "../store";

export function TopBar() {
  const setOverlay = useApp((s) => s.setOverlay);
  const [conectado, setConectado] = useState<boolean | null>(null);

  useEffect(() => {
    let activo = true;
    const verificar = async () => {
      const ok = await salud();
      if (activo) setConectado(ok);
    };
    verificar();
    const intervalo = setInterval(verificar, 10_000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  return (
    <nav className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        <button
          onClick={() => setOverlay("asistente")}
          title="Asistente RI — dudas sobre la app"
          className="flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 transition-colors hover:border-accent/50 hover:bg-zinc-900"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold tracking-wide">RI</span>
        </button>
        <div className="flex items-center gap-5 text-sm text-zinc-400">
          <button className="text-zinc-100">Panel</button>
          <button
            onClick={() => setOverlay("historial")}
            className="transition-colors hover:text-zinc-200"
          >
            Historial
          </button>
          <button
            onClick={() => setOverlay("soporte")}
            className="transition-colors hover:text-zinc-200"
          >
            Soporte
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span
          className="flex items-center gap-1.5 text-xs text-zinc-500"
          title="Estado del orquestador local (sidecar Python)"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              conectado === null
                ? "bg-zinc-600"
                : conectado
                  ? "bg-emerald-400"
                  : "bg-red-400"
            }`}
          />
          {conectado === null
            ? "verificando…"
            : conectado
              ? "sidecar activo"
              : "sidecar apagado"}
        </span>
        <button className="text-zinc-400 transition-colors hover:text-zinc-200">
          <Bell className="h-4 w-4" />
        </button>
        <button className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs font-bold text-ink">
            F
          </span>
          <span className="text-sm text-zinc-300">Fran</span>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      </div>
    </nav>
  );
}
