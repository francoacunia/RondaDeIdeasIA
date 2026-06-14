import type { Adjunto, EventoDebate, Filtros } from "./types";

/** Dirección del sidecar Python (FastAPI). */
export const BASE_API = "http://127.0.0.1:8765";

export async function salud(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE_API}/api/salud`);
    return r.ok;
  } catch {
    return false;
  }
}

export interface StatsApi {
  rondas: number;
  aprobadas: number;
  tasa_aprobacion: number;
}

/** Contadores reales del dashboard (veredictos guardados en SQLite). */
export async function obtenerStats(): Promise<StatsApi | null> {
  try {
    const r = await fetch(`${BASE_API}/api/stats`);
    if (!r.ok) return null;
    return (await r.json()) as StatsApi;
  } catch {
    return null;
  }
}

export async function crearSesion(titulo: string): Promise<number> {
  const r = await fetch(`${BASE_API}/api/sesiones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo }),
  });
  if (!r.ok) throw new Error(`El sidecar respondió ${r.status}`);
  const datos = await r.json();
  return datos.id as number;
}

interface CargaDebate {
  sesion_id: number;
  prompt: string;
  filtros: Filtros;
  adjuntos: Adjunto[];
}

/**
 * Inicia el debate y va entregando cada intervención (SSE) a medida
 * que los agentes responden.
 */
export async function streamDebate(
  carga: CargaDebate,
  onEvento: (evento: EventoDebate) => void,
): Promise<void> {
  const r = await fetch(`${BASE_API}/api/debate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(carga),
  });
  if (!r.ok || !r.body) throw new Error(`El sidecar respondió ${r.status}`);

  const lector = r.body.getReader();
  const decodificador = new TextDecoder();
  let bufer = "";

  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    bufer += decodificador.decode(value, { stream: true });

    let corte: number;
    while ((corte = bufer.indexOf("\n\n")) >= 0) {
      const bloque = bufer.slice(0, corte);
      bufer = bufer.slice(corte + 2);
      const linea = bloque.split("\n").find((l) => l.startsWith("data: "));
      if (!linea) continue;
      const evento = JSON.parse(linea.slice(6)) as EventoDebate;
      if (evento.type === "done") return;
      onEvento(evento);
    }
  }
}

// --- Historial -------------------------------------------------------------

export interface SesionApi {
  id: number;
  titulo: string;
  creada_en: string;
  mensajes: number;
}

export interface MensajeApi {
  agente: string;
  etiqueta: string;
  contenido: string;
  mermaid: string | null;
  creado_en: string;
}

export async function listarSesiones(): Promise<SesionApi[]> {
  const r = await fetch(`${BASE_API}/api/sesiones`);
  if (!r.ok) throw new Error(`El sidecar respondió ${r.status}`);
  return (await r.json()) as SesionApi[];
}

export async function mensajesDeSesion(id: number): Promise<MensajeApi[]> {
  const r = await fetch(`${BASE_API}/api/sesiones/${id}/mensajes`);
  if (!r.ok) throw new Error(`El sidecar respondió ${r.status}`);
  return (await r.json()) as MensajeApi[];
}

export async function borrarSesion(id: number): Promise<void> {
  const r = await fetch(`${BASE_API}/api/sesiones/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`El sidecar respondió ${r.status}`);
}

// --- Soporte: estado de las IAs y claves ------------------------------------

export interface ProveedorEstado {
  id: string;
  nombre: string;
  rol: string;
  local: boolean;
  clave: string | null;
  obtener: string;
  configurado: boolean;
  detalle: string;
  clave_enmascarada: string;
}

export async function obtenerEstado(): Promise<ProveedorEstado[]> {
  const r = await fetch(`${BASE_API}/api/estado`);
  if (!r.ok) throw new Error(`El sidecar respondió ${r.status}`);
  const datos = await r.json();
  return datos.proveedores as ProveedorEstado[];
}

export interface PruebaResultado {
  responde: boolean;
  detalle: string;
}

export async function probarProveedores(): Promise<
  Record<string, PruebaResultado>
> {
  const r = await fetch(`${BASE_API}/api/estado/probar`, { method: "POST" });
  if (!r.ok) throw new Error(`El sidecar respondió ${r.status}`);
  const datos = await r.json();
  return datos.resultados as Record<string, PruebaResultado>;
}

export async function guardarClaves(
  claves: Record<string, string>,
): Promise<string[]> {
  const r = await fetch(`${BASE_API}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claves }),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => null);
    throw new Error(error?.detail ?? `El sidecar respondió ${r.status}`);
  }
  const datos = await r.json();
  return datos.guardadas as string[];
}

// --- Asistente «RI» ---------------------------------------------------------

export async function preguntarAsistente(pregunta: string): Promise<string> {
  const r = await fetch(`${BASE_API}/api/asistente`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pregunta }),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => null);
    throw new Error(error?.detail ?? `El sidecar respondió ${r.status}`);
  }
  const datos = await r.json();
  return datos.respuesta as string;
}

/** Manda el audio del micrófono al sidecar para transcribirlo con Whisper local. */
export async function transcribir(audio: Blob): Promise<string> {
  const formulario = new FormData();
  formulario.append("audio", audio, "grabacion.webm");
  const r = await fetch(`${BASE_API}/api/transcribir`, {
    method: "POST",
    body: formulario,
  });
  if (!r.ok) {
    const error = await r.json().catch(() => null);
    throw new Error(error?.detail ?? `El sidecar respondió ${r.status}`);
  }
  const datos = await r.json();
  return datos.texto as string;
}
