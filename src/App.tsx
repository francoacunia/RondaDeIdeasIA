import { useEffect } from "react";
import { Plus, RotateCw } from "lucide-react";
import { TopBar } from "./components/TopBar";
import { PipelineCard } from "./components/PipelineCard";
import { StatCard } from "./components/StatCard";
import { FiltersCard } from "./components/FiltersCard";
import { ResourcesCard } from "./components/ResourcesCard";
import { CouncilPanel } from "./components/CouncilPanel";
import { HistoryOverlay } from "./components/HistoryOverlay";
import { SupportOverlay } from "./components/SupportOverlay";
import { AssistantOverlay } from "./components/AssistantOverlay";
import { useApp } from "./store";

export default function App() {
  const nuevaSesion = useApp((s) => s.nuevaSesion);
  const cargarStats = useApp((s) => s.cargarStats);
  const overlay = useApp((s) => s.overlay);

  useEffect(() => {
    void cargarStats();
  }, [cargarStats]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 px-6 pb-6 pt-4 text-zinc-100">
      <TopBar />

      <header className="mt-3 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">
          Ronda de ideas
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refrescar
          </button>
          <button
            onClick={nuevaSesion}
            className="flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva sesión
          </button>
        </div>
      </header>

      <main className="mt-4 grid min-h-0 flex-1 grid-cols-12 gap-4">
        {/* A) Columna izquierda — tarjeta destacada del pipeline */}
        <section className="col-span-3 flex min-h-0 flex-col gap-4">
          <PipelineCard />
          <StatCard />
        </section>

        {/* B + C) Columna central — filtros y recursos */}
        <section className="col-span-4 flex min-h-0 flex-col gap-4">
          <FiltersCard />
          <ResourcesCard />
        </section>

        {/* D) Columna derecha — consejo y debate */}
        <section className="col-span-5 min-h-0">
          <CouncilPanel />
        </section>
      </main>

      {overlay === "historial" && <HistoryOverlay />}
      {overlay === "soporte" && <SupportOverlay />}
      {overlay === "asistente" && <AssistantOverlay />}
    </div>
  );
}
