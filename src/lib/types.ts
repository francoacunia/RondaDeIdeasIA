/** Filtros de la interfaz que lee el Agente Juez (Ollama). */
export interface Filtros {
  /** 0 = costo bajo · 100 = costo alto */
  costo: number;
  /** 0 = fácil · 100 = difícil */
  viabilidad: number;
  /** 0 = corto plazo · 100 = largo plazo */
  plazo: number;
  /** Umbral de consenso en %, 50–100 */
  umbral: number;
  /** false = sinceridad alta · true = honestidad brutal */
  brutal: boolean;
}

export type IdAgente =
  | "user"
  | "groq"
  | "gemini"
  | "tecnico"
  | "estratega"
  | "juez"
  | "sistema";

export interface MensajeChat {
  id: string;
  agente: IdAgente | string;
  etiqueta: string;
  contenido: string;
  mermaid?: string | null;
  hora: string;
}

export interface Veredicto {
  consenso: number;
  veredicto: string;
  resumen: string;
  acciones: string[];
}

export interface Adjunto {
  tipo: "imagen" | "video";
  nombre: string;
  mediaType?: string;
  dataBase64?: string;
}

/** Eventos SSE que emite el sidecar durante el debate. */
export type EventoDebate =
  | {
      type: "message";
      agente: string;
      etiqueta: string;
      contenido: string;
      mermaid?: string | null;
    }
  | {
      type: "verdict";
      consenso: number;
      veredicto: string;
      resumen: string;
      acciones: string[];
      contenido: string;
    }
  | { type: "error"; detalle: string }
  | { type: "done" };
