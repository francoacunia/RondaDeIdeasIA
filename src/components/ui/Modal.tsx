import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface PropsModal {
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
}

export function Modal({
  titulo,
  subtitulo,
  onCerrar,
  children,
  ancho = "max-w-lg",
}: PropsModal) {
  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className={`flex max-h-[82vh] w-full ${ancho} flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-800 p-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{titulo}</h2>
            {subtitulo && (
              <p className="mt-0.5 text-sm text-zinc-500">{subtitulo}</p>
            )}
          </div>
          <button
            onClick={onCerrar}
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
