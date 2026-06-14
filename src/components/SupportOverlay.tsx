import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Modal } from "./ui/Modal";
import {
  guardarClaves,
  obtenerEstado,
  probarProveedores,
  type ProveedorEstado,
  type PruebaResultado,
} from "../lib/api";
import { useApp } from "../store";

export function SupportOverlay() {
  const setOverlay = useApp((s) => s.setOverlay);
  const [estado, setEstado] = useState<ProveedorEstado[] | null>(null);
  const [pruebas, setPruebas] = useState<Record<string, PruebaResultado>>({});
  const [probando, setProbando] = useState(false);
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = async () => {
    try {
      setEstado(await obtenerEstado());
    } catch {
      setAviso("No pude leer el estado. ¿Está encendido el motor?");
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const probar = async () => {
    setProbando(true);
    setAviso(null);
    try {
      setPruebas(await probarProveedores());
    } catch {
      setAviso("No pude correr la prueba.");
    } finally {
      setProbando(false);
    }
  };

  const guardar = async () => {
    const claves = Object.fromEntries(
      Object.entries(borradores).filter(([, v]) => v.trim()),
    );
    if (Object.keys(claves).length === 0) return;
    setGuardando(true);
    setAviso(null);
    try {
      await guardarClaves(claves);
      setBorradores({});
      setAviso("✓ Claves guardadas. Ya quedan activas.");
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No pude guardar las claves.");
    } finally {
      setGuardando(false);
    }
  };

  const icono = (p: ProveedorEstado) => {
    const prueba = pruebas[p.id];
    const ok = prueba ? prueba.responde : p.configurado;
    return ok ? (
      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
    ) : (
      <XCircle className="h-5 w-5 text-zinc-600" />
    );
  };

  return (
    <Modal
      titulo="Soporte · estado de las IAs"
      subtitulo="Mirá qué IA está lista y cargá tus propias claves (todas gratis)."
      onCerrar={() => setOverlay(null)}
      ancho="max-w-xl"
    >
      <div className="space-y-5 p-5">
        {/* Estado de cada proveedor */}
        <div className="space-y-2">
          {!estado && (
            <div className="flex items-center gap-2 p-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          )}
          {estado?.map((p) => {
            const prueba = pruebas[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
              >
                {icono(p)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">
                      {p.nombre}
                    </span>
                    {p.local && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                        local
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{p.rol}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {prueba ? prueba.detalle : p.detalle}
                    {p.clave_enmascarada && !prueba
                      ? ` (${p.clave_enmascarada})`
                      : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={probar}
          disabled={probando}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {probando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {probando ? "Probando cada IA…" : "Probar conexión de cada IA"}
        </button>

        {/* Editor de claves */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-zinc-200">
              Tus claves de API
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Pegá tu propia clave (gratuita) de cada servicio. Se guardan solo en
            tu computadora.
          </p>

          <div className="mt-3 space-y-3">
            {estado
              ?.filter((p) => p.clave)
              .map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400">{p.nombre}</label>
                    <a
                      href={p.obtener}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      Conseguir clave <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={borradores[p.clave!] ?? ""}
                    placeholder={
                      p.configurado ? "•••••••• (ya cargada)" : "Pegá tu clave acá"
                    }
                    onChange={(e) =>
                      setBorradores((b) => ({
                        ...b,
                        [p.clave!]: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none"
                  />
                </div>
              ))}
          </div>

          <button
            onClick={guardar}
            disabled={guardando}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar claves
          </button>
        </div>

        {aviso && (
          <p
            className={`text-center text-xs ${
              aviso.startsWith("✓") ? "text-emerald-400" : "text-zinc-400"
            }`}
          >
            {aviso}
          </p>
        )}

        <p className="text-center text-[11px] leading-relaxed text-zinc-600">
          El Juez (Ollama) corre en tu compu, sin clave. Si aparece en gris,
          abrí la app de Ollama y descargá el modelo con «ollama pull llama3.1».
        </p>
      </div>
    </Modal>
  );
}
