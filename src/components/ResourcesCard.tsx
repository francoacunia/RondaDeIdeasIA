import { FileText, ListChecks, Network, Scale } from "lucide-react";
import { MermaidPreview } from "./MermaidPreview";
import { useApp } from "../store";

const RECURSOS = [
  { id: "mapa", titulo: "Mapa mental", Icono: Network },
  { id: "requisitos", titulo: "Lista de requisitos", Icono: ListChecks },
  { id: "costo", titulo: "Costo-beneficio", Icono: Scale },
] as const;

const VACIOS: Record<string, string> = {
  mapa: "Cuando un agente incluya un diagrama Mermaid en el debate, se renderiza acá automáticamente.",
  requisitos:
    "Pedile al consejo una lista de requisitos y este bloque la va a mostrar.",
  costo:
    "Pedí un análisis costo-beneficio (probá con honestidad brutal activada).",
};

export function ResourcesCard() {
  const mermaidCode = useApp((s) => s.mermaidCode);
  const recursoActivo = useApp((s) => s.recursoActivo);
  const setRecursoActivo = useApp((s) => s.setRecursoActivo);

  const mostrarMermaid = recursoActivo === "mapa" && mermaidCode;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">Recursos generados</span>
        <FileText className="h-4 w-4 text-zinc-500" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {RECURSOS.map(({ id, titulo, Icono }) => (
          <button
            key={id}
            onClick={() => setRecursoActivo(id)}
            className={`rounded-2xl border p-3 text-left transition-colors ${
              recursoActivo === id
                ? "border-accent/50 bg-zinc-900"
                : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900"
            }`}
          >
            <Icono
              className={`h-4 w-4 ${
                recursoActivo === id ? "text-accent" : "text-zinc-500"
              }`}
            />
            <p className="mt-2 text-xs leading-tight text-zinc-300">{titulo}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40">
        {mostrarMermaid ? (
          <MermaidPreview codigo={mermaidCode} />
        ) : (
          <p className="grid h-full place-items-center p-6 text-center text-xs leading-relaxed text-zinc-600">
            {VACIOS[recursoActivo]}
          </p>
        )}
      </div>
    </div>
  );
}
