import { create } from "zustand";
import {
  crearSesion,
  mensajesDeSesion,
  obtenerStats,
  streamDebate,
} from "./lib/api";
import type { Adjunto, Filtros, MensajeChat, Veredicto } from "./lib/types";

interface Estadisticas {
  rondas: number;
  aprobadas: number;
  tasaAprobacion: number;
}

type RecursoId = "mapa" | "requisitos" | "costo";
export type Overlay = "historial" | "soporte" | "asistente" | null;

interface EstadoApp {
  filtros: Filtros;
  mensajes: MensajeChat[];
  adjuntos: Adjunto[];
  borrador: string;
  sesionId: number | null;
  estado: "inactivo" | "debatiendo";
  mermaidCode: string | null;
  recursoActivo: RecursoId;
  veredicto: Veredicto | null;
  stats: Estadisticas;
  overlay: Overlay;

  setFiltro: (campo: keyof Filtros, valor: number | boolean) => void;
  setBorrador: (texto: string) => void;
  setRecursoActivo: (recurso: RecursoId) => void;
  setOverlay: (overlay: Overlay) => void;
  agregarAdjunto: (adjunto: Adjunto) => void;
  quitarAdjunto: (indice: number) => void;
  agregarMensaje: (mensaje: Omit<MensajeChat, "id" | "hora">) => void;
  nuevaSesion: () => void;
  cargarStats: () => Promise<void>;
  abrirSesion: (id: number) => Promise<void>;
  enviarPrompt: (texto: string) => Promise<void>;
}

let contadorId = 0;
const ahora = () =>
  new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export const useApp = create<EstadoApp>()((set, get) => ({
  filtros: { costo: 40, viabilidad: 50, plazo: 35, umbral: 70, brutal: false },
  mensajes: [],
  adjuntos: [],
  borrador: "",
  sesionId: null,
  estado: "inactivo",
  mermaidCode: null,
  recursoActivo: "mapa",
  veredicto: null,
  stats: { rondas: 0, aprobadas: 0, tasaAprobacion: 0 },
  overlay: null,

  setFiltro: (campo, valor) =>
    set((s) => ({ filtros: { ...s.filtros, [campo]: valor } })),

  setBorrador: (texto) => set({ borrador: texto }),

  setRecursoActivo: (recurso) => set({ recursoActivo: recurso }),

  setOverlay: (overlay) => set({ overlay }),

  agregarAdjunto: (adjunto) =>
    set((s) => ({ adjuntos: [...s.adjuntos, adjunto] })),

  quitarAdjunto: (indice) =>
    set((s) => ({ adjuntos: s.adjuntos.filter((_, i) => i !== indice) })),

  agregarMensaje: (mensaje) =>
    set((s) => ({
      mensajes: [
        ...s.mensajes,
        { ...mensaje, id: `m-${++contadorId}`, hora: ahora() },
      ],
    })),

  nuevaSesion: () =>
    set({
      mensajes: [],
      sesionId: null,
      mermaidCode: null,
      veredicto: null,
      adjuntos: [],
      borrador: "",
    }),

  cargarStats: async () => {
    const stats = await obtenerStats();
    if (stats) {
      set({
        stats: {
          rondas: stats.rondas,
          aprobadas: stats.aprobadas,
          tasaAprobacion: stats.tasa_aprobacion,
        },
      });
    }
  },

  abrirSesion: async (id) => {
    const mensajes = await mensajesDeSesion(id);
    let contador = 0;
    let ultimoMermaid: string | null = null;
    const cargados: MensajeChat[] = mensajes.map((m) => {
      if (m.mermaid) ultimoMermaid = m.mermaid;
      return {
        id: `h-${id}-${++contador}`,
        agente: m.agente,
        etiqueta: m.etiqueta,
        contenido: m.contenido,
        mermaid: m.mermaid,
        hora: new Date(m.creado_en).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });
    set({
      mensajes: cargados,
      sesionId: id,
      mermaidCode: ultimoMermaid,
      recursoActivo: "mapa",
      veredicto: null,
      adjuntos: [],
      borrador: "",
      overlay: null,
    });
  },

  enviarPrompt: async (texto) => {
    const limpio = texto.trim();
    const { estado, agregarMensaje } = get();
    if (!limpio || estado === "debatiendo") return;

    agregarMensaje({ agente: "user", etiqueta: "Vos", contenido: limpio });
    set({ estado: "debatiendo", borrador: "" });

    try {
      let sid = get().sesionId;
      if (sid === null) {
        sid = await crearSesion(limpio.slice(0, 80));
        set({ sesionId: sid });
      }

      const adjuntos = get().adjuntos;
      set({ adjuntos: [] });

      await streamDebate(
        { sesion_id: sid, prompt: limpio, filtros: get().filtros, adjuntos },
        (evento) => {
          if (evento.type === "message") {
            agregarMensaje({
              agente: evento.agente,
              etiqueta: evento.etiqueta,
              contenido: evento.contenido,
              mermaid: evento.mermaid ?? null,
            });
            if (evento.mermaid) {
              set({ mermaidCode: evento.mermaid, recursoActivo: "mapa" });
            }
          } else if (evento.type === "verdict") {
            agregarMensaje({
              agente: "juez",
              etiqueta: "Ollama · Juez local",
              contenido: evento.contenido,
            });
            set({
              veredicto: {
                consenso: evento.consenso,
                veredicto: evento.veredicto,
                resumen: evento.resumen,
                acciones: evento.acciones,
              },
            });
            // La base de datos es la fuente de verdad de los contadores.
            void get().cargarStats();
          } else if (evento.type === "error") {
            agregarMensaje({
              agente: "sistema",
              etiqueta: "Sistema",
              contenido: `⚠️ ${evento.detalle}`,
            });
          }
        },
      );
    } catch (e) {
      agregarMensaje({
        agente: "sistema",
        etiqueta: "Sistema",
        contenido: `⚠️ No pude hablar con el orquestador local. ¿Está corriendo el sidecar? (${String(e)})`,
      });
    } finally {
      set({ estado: "inactivo" });
    }
  },
}));
