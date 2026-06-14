import { GitBranch } from "lucide-react";
import type { MensajeChat } from "../lib/types";

const ESTILOS: Record<
  string,
  { texto: string; fondo: string; inicial: string; borde?: string }
> = {
  groq: { texto: "text-orange-300", fondo: "bg-orange-400/10", inicial: "Gr" },
  gemini: { texto: "text-sky-300", fondo: "bg-sky-400/10", inicial: "Ge" },
  tecnico: {
    texto: "text-violet-300",
    fondo: "bg-violet-400/10",
    inicial: "T",
  },
  estratega: {
    texto: "text-rose-300",
    fondo: "bg-rose-400/10",
    inicial: "E",
  },
  juez: {
    texto: "text-emerald-300",
    fondo: "bg-emerald-400/10",
    inicial: "J",
    borde: "border-emerald-400/30",
  },
  sistema: { texto: "text-zinc-400", fondo: "bg-zinc-700/30", inicial: "S" },
};

export function AgentMessage({ mensaje }: { mensaje: MensajeChat }) {
  if (mensaje.agente === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-ink">
          {mensaje.contenido}
        </div>
      </div>
    );
  }

  const estilo = ESTILOS[mensaje.agente] ?? ESTILOS.sistema;

  return (
    <div
      className={`rounded-2xl border bg-zinc-900/70 p-3 ${
        estilo.borde ?? "border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${estilo.fondo} ${estilo.texto}`}
        >
          {estilo.inicial}
        </span>
        <span className="text-xs font-medium text-zinc-400">
          {mensaje.etiqueta}
        </span>
        <span className="ml-auto text-[10px] text-zinc-600">
          {mensaje.hora}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
        {mensaje.contenido}
      </p>
      {mensaje.mermaid && (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] text-zinc-400">
          <GitBranch className="h-3 w-3 text-accent" />
          Diagrama enviado a Recursos
        </span>
      )}
    </div>
  );
}
