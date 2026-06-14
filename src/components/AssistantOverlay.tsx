import { useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Modal } from "./ui/Modal";
import { preguntarAsistente } from "../lib/api";
import { useApp } from "../store";

interface Turno {
  de: "vos" | "ri";
  texto: string;
}

const SUGERENCIAS = [
  "¿Qué hace cada IA del consejo?",
  "¿Para qué sirven los filtros de la izquierda?",
  "¿Cómo conviene plantear una idea?",
  "¿Qué significa el veredicto del Juez?",
];

export function AssistantOverlay() {
  const setOverlay = useApp((s) => s.setOverlay);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  const preguntar = async (pregunta: string) => {
    const limpio = pregunta.trim();
    if (!limpio || cargando) return;
    setTurnos((t) => [...t, { de: "vos", texto: limpio }]);
    setTexto("");
    setCargando(true);
    try {
      const respuesta = await preguntarAsistente(limpio);
      setTurnos((t) => [...t, { de: "ri", texto: respuesta }]);
    } catch {
      setTurnos((t) => [
        ...t,
        {
          de: "ri",
          texto:
            "Uy, no pude responder ahora mismo. Fijate en Soporte que las IAs estén conectadas y probá de nuevo.",
        },
      ]);
    } finally {
      setCargando(false);
      setTimeout(
        () => finRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    }
  };

  return (
    <Modal
      titulo="Asistente RI"
      subtitulo="Preguntame cualquier cosa sobre cómo funciona la app."
      onCerrar={() => setOverlay(null)}
      ancho="max-w-lg"
    >
      <div className="flex h-[60vh] flex-col">
        <div className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          {turnos.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-sm text-zinc-300">
                  ¡Hola Fran! Soy RI. Te explico cómo sacarle el jugo al consejo
                  de IAs. ¿Por dónde querés empezar?
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void preguntar(s)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-900"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turnos.map((t, i) =>
            t.de === "vos" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-ink">
                  {t.texto}
                </div>
              </div>
            ) : (
              <div
                key={i}
                className="flex items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                  RI
                </span>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                  {t.texto}
                </p>
              </div>
            ),
          )}

          {cargando && (
            <div className="flex items-center gap-2 px-1 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              RI está pensando…
            </div>
          )}
          <div ref={finRef} />
        </div>

        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-2">
            <textarea
              rows={1}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void preguntar(texto);
                }
              }}
              placeholder="Escribí tu duda…"
              className="max-h-28 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              onClick={() => void preguntar(texto)}
              disabled={cargando || !texto.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-ink transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
