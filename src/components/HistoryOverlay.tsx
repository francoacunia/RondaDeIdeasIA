import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import { Modal } from "./ui/Modal";
import { borrarSesion, listarSesiones, type SesionApi } from "../lib/api";
import { useApp } from "../store";

export function HistoryOverlay() {
  const setOverlay = useApp((s) => s.setOverlay);
  const abrirSesion = useApp((s) => s.abrirSesion);
  const [sesiones, setSesiones] = useState<SesionApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    try {
      setError(null);
      setSesiones(await listarSesiones());
    } catch {
      setError("No pude leer el historial. ¿Está encendido el motor?");
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const eliminar = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await borrarSesion(id);
    setSesiones((prev) => prev?.filter((s) => s.id !== id) ?? null);
    void useApp.getState().cargarStats();
  };

  const fecha = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Modal
      titulo="Historial de sesiones"
      subtitulo="Cada debate quedó guardado en tu compu. Tocá uno para volver a abrirlo."
      onCerrar={() => setOverlay(null)}
    >
      <div className="p-4">
        {error && <p className="p-4 text-sm text-red-400">{error}</p>}

        {!sesiones && !error && (
          <div className="flex items-center gap-2 p-6 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        )}

        {sesiones && sesiones.length === 0 && (
          <p className="p-6 text-center text-sm text-zinc-500">
            Todavía no hay sesiones. Mandá una idea al consejo y va a aparecer
            acá.
          </p>
        )}

        <div className="space-y-2">
          {sesiones?.map((s) => (
            <button
              key={s.id}
              onClick={() => void abrirSesion(s.id)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-800 text-accent">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-200">{s.titulo}</p>
                <p className="text-xs text-zinc-500">
                  {fecha(s.creada_en)} · {s.mensajes} mensajes
                </p>
              </div>
              <span
                onClick={(e) => void eliminar(e, s.id)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-600 opacity-0 transition-all hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
                title="Borrar esta sesión"
              >
                <Trash2 className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
