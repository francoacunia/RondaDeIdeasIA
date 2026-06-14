import { useRef, useState } from "react";
import {
  ArrowUp,
  Clapperboard,
  Image as ImagenIcono,
  Loader2,
  Mic,
  Square,
  X,
} from "lucide-react";
import { transcribir } from "../lib/api";
import { useApp } from "../store";

export function InputBar() {
  const borrador = useApp((s) => s.borrador);
  const setBorrador = useApp((s) => s.setBorrador);
  const adjuntos = useApp((s) => s.adjuntos);
  const agregarAdjunto = useApp((s) => s.agregarAdjunto);
  const quitarAdjunto = useApp((s) => s.quitarAdjunto);
  const agregarMensaje = useApp((s) => s.agregarMensaje);
  const enviarPrompt = useApp((s) => s.enviarPrompt);
  const estado = useApp((s) => s.estado);

  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const grabadorRef = useRef<MediaRecorder | null>(null);
  const entradaImagen = useRef<HTMLInputElement>(null);
  const entradaVideo = useRef<HTMLInputElement>(null);

  const enviar = () => {
    void enviarPrompt(borrador);
  };

  /** Micrófono → MediaRecorder → Whisper local en el sidecar. */
  const alternarGrabacion = async () => {
    if (grabando) {
      grabadorRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const grabador = new MediaRecorder(stream);
      const trozos: BlobPart[] = [];

      grabador.ondataavailable = (e) => trozos.push(e.data);
      grabador.onstop = async () => {
        stream.getTracks().forEach((pista) => pista.stop());
        setGrabando(false);
        setTranscribiendo(true);
        try {
          const audio = new Blob(trozos, {
            type: grabador.mimeType || "audio/webm",
          });
          const texto = await transcribir(audio);
          const actual = useApp.getState().borrador;
          setBorrador(actual ? `${actual} ${texto}` : texto);
        } catch (e) {
          agregarMensaje({
            agente: "sistema",
            etiqueta: "Sistema",
            contenido: `⚠️ No pude transcribir el audio: ${e instanceof Error ? e.message : String(e)}`,
          });
        } finally {
          setTranscribiendo(false);
        }
      };

      grabador.start();
      grabadorRef.current = grabador;
      setGrabando(true);
    } catch {
      agregarMensaje({
        agente: "sistema",
        etiqueta: "Sistema",
        contenido:
          "⚠️ No pude acceder al micrófono. Revisá los permisos del sistema.",
      });
    }
  };

  /** Imagen → base64 → el Sintetizador (Claude/Gemini) la analiza en el debate. */
  const elegirImagen = (archivo: File) => {
    const lector = new FileReader();
    lector.onload = () => {
      const url = String(lector.result);
      const base64 = url.slice(url.indexOf(",") + 1);
      agregarAdjunto({
        tipo: "imagen",
        nombre: archivo.name,
        mediaType: archivo.type || "image/png",
        dataBase64: base64,
      });
    };
    lector.readAsDataURL(archivo);
  };

  const elegirVideo = (archivo: File) => {
    // MVP: el video viaja como referencia por nombre (sin análisis de frames).
    agregarAdjunto({ tipo: "video", nombre: archivo.name });
  };

  const claseIcono =
    "grid h-9 w-9 place-items-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200";

  return (
    <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-2">
      {adjuntos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 pb-2">
          {adjuntos.map((adjunto, i) => (
            <span
              key={`${adjunto.nombre}-${i}`}
              className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300"
            >
              {adjunto.tipo === "imagen" ? "🖼" : "🎬"} {adjunto.nombre}
              <button
                onClick={() => quitarAdjunto(i)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1">
        <button
          onClick={alternarGrabacion}
          title={grabando ? "Detener grabación" : "Charla en vivo (micrófono)"}
          className={`${claseIcono} ${grabando ? "bg-red-500/15 text-red-400" : ""}`}
        >
          {transcribiendo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : grabando ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={() => entradaImagen.current?.click()}
          title="Adjuntar imagen de referencia"
          className={claseIcono}
        >
          <ImagenIcono className="h-4 w-4" />
        </button>
        <input
          ref={entradaImagen}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) elegirImagen(archivo);
            e.target.value = "";
          }}
        />

        <button
          onClick={() => entradaVideo.current?.click()}
          title="Adjuntar archivo de video"
          className={claseIcono}
        >
          <Clapperboard className="h-4 w-4" />
        </button>
        <input
          ref={entradaVideo}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) elegirVideo(archivo);
            e.target.value = "";
          }}
        />

        <textarea
          rows={1}
          value={borrador}
          onChange={(e) => {
            setBorrador(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="¿En qué te ayudo hoy?"
          className="max-h-28 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />

        <button
          onClick={enviar}
          disabled={estado === "debatiendo" || !borrador.trim()}
          title="Enviar al consejo"
          className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-ink transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
