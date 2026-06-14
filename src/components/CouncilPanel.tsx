import { useEffect, useRef } from "react";
import { History, Loader2 } from "lucide-react";
import { AgentMessage } from "./AgentMessage";
import { InputBar } from "./InputBar";
import { useApp } from "../store";

const SUGERENCIAS = [
  {
    titulo: "Lluvia de ideas",
    detalle: "Proponé un tema y el consejo lo debate",
    prompt: "Quiero hacer una lluvia de ideas sobre: ",
  },
  {
    titulo: "Evaluar una idea",
    detalle: "Veredicto con costo, viabilidad y plazo",
    prompt: "Evalúen esta idea y denme un veredicto: ",
  },
  {
    titulo: "Mapa mental",
    detalle: "Pedí un diagrama Mermaid de la idea",
    prompt: "Armen un mapa mental (en Mermaid) de esta idea: ",
  },
  {
    titulo: "Costo-beneficio",
    detalle: "Análisis rápido, sin vueltas",
    prompt: "Háganme un análisis costo-beneficio de: ",
  },
];

const PESTANIAS = ["Hoy", "Consejo", "Veredictos"];

export function CouncilPanel() {
  const mensajes = useApp((s) => s.mensajes);
  const estado = useApp((s) => s.estado);
  const setBorrador = useApp((s) => s.setBorrador);
  const setOverlay = useApp((s) => s.setOverlay);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mensajes, estado]);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {PESTANIAS.map((pestania, i) => (
            <button
              key={pestania}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                i === 0
                  ? "bg-accent font-medium text-ink"
                  : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {pestania}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOverlay("historial")}
          title="Ver historial de sesiones"
          className="text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <History className="h-4 w-4" />
        </button>
      </div>

      {/* Feed del debate con scroll independiente */}
      <div
        ref={feedRef}
        className="scroll-slim mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {mensajes.length === 0 && (
          <div className="inline-block rounded-2xl rounded-tl-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300">
            ¿Sobre qué idea debatimos hoy?
          </div>
        )}

        {mensajes.map((mensaje) => (
          <AgentMessage key={mensaje.id} mensaje={mensaje} />
        ))}

        {estado === "debatiendo" && (
          <div className="flex items-center gap-2 px-1 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            El consejo está deliberando…
          </div>
        )}
      </div>

      {/* Accesos rápidos (solo con el feed vacío) */}
      {mensajes.length === 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {SUGERENCIAS.map((sugerencia) => (
            <button
              key={sugerencia.titulo}
              onClick={() => setBorrador(sugerencia.prompt)}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-left transition-colors hover:bg-zinc-900"
            >
              <p className="text-sm text-zinc-200">{sugerencia.titulo}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {sugerencia.detalle}
              </p>
            </button>
          ))}
        </div>
      )}

      <InputBar />
    </div>
  );
}
