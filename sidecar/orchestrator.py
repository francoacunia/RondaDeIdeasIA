"""Pipeline multi-agente: el consejo debate en secuencia y el Juez local decide.

Orden del debate (todos los proveedores son gratuitos):
  1. Groq      (Creativo)  — abre el debate, propone ángulos nuevos.
  2. Gemini    (Lógica)    — revisa supuestos y riesgos. Ve imágenes.
  3. Técnico   (OpenRouter)— evalúa factibilidad.
  4. Estratega (OpenRouter)— sintetiza y cierra el debate.
  5. Ollama   (Juez local) — lee los filtros de la interfaz y emite el
                             veredicto estructurado (JSON).

Los endpoints gratuitos de OpenRouter se saturan seguido, así que el Técnico
y el Estratega usan una CADENA DE SUPLENTES: titular primero y, si está
saturado, los alternativos en orden. Si Groq o Gemini fallan, también se
reintenta con esa cadena. La etiqueta del mensaje muestra qué modelo
respondió de verdad.
"""
from __future__ import annotations

import json
import os
import re
from typing import AsyncGenerator, List, Optional

from database import guardar_mensaje
from mermaid_utils import extraer_mermaid
from providers import llamar_gemini, llamar_groq, llamar_ollama, llamar_openrouter

# ---------------------------------------------------------------------------
# Roles del consejo
# ---------------------------------------------------------------------------

ROL_GROQ = (
    "Sos Groq, la voz CREATIVA del consejo «Ronda de ideas IA». "
    "Abrís el debate: resumí la idea del usuario en una frase y aportá 2 o 3 "
    "propuestas creativas, ángulos originales o combinaciones inesperadas. "
    "Si un mapa mental o un flujo ayuda a entender la idea, incluí UN bloque "
    "```mermaid``` corto (graph TD)."
)

ROL_GEMINI = (
    "Sos Gemini, la voz LÓGICA del consejo «Ronda de ideas IA». "
    "Leés lo que dijeron antes y analizás la coherencia: supuestos débiles, "
    "contradicciones, riesgos y qué falta validar. Si hay imágenes de "
    "referencia adjuntas, analizalas y sumalas a tu análisis. No repitas "
    "lo ya dicho; respondé al debate."
)

ROL_TECNICO = (
    "Sos la voz TÉCNICA del consejo «Ronda de ideas IA». "
    "Evaluás la implementación: arquitectura posible, herramientas, esfuerzo "
    "y deuda técnica. Cerrá con una estimación de complejidad técnica "
    "(baja, media o alta) en una línea."
)

ROL_ESTRATEGA = (
    "Sos la voz ESTRATEGA del consejo «Ronda de ideas IA». "
    "Sos el último en hablar antes del Juez: sintetizá los aportes del "
    "debate, marcá la decisión clave que habría que tomar y qué validarías "
    "primero (la prueba más barata que confirme o tire abajo la idea)."
)


# --- Cadenas de modelos gratuitos de OpenRouter ----------------------------

ALTERNATIVOS_DEF = (
    "nvidia/nemotron-3-super-120b-a12b:free,"
    "qwen/qwen3-coder:free,"
    "nousresearch/hermes-3-llama-3.1-405b:free,"
    "meta-llama/llama-3.3-70b-instruct:free"
)


def _alternativos() -> List[str]:
    crudo = os.getenv("OPENROUTER_MODELS_ALTERNATIVOS", ALTERNATIVOS_DEF)
    return [m.strip() for m in crudo.split(",") if m.strip()]


def _cadena(variable: str, titular_defecto: str) -> List[str]:
    titular = os.getenv(variable, titular_defecto)
    return [titular] + [m for m in _alternativos() if m != titular]


def _nombre_corto(modelo: Optional[str]) -> str:
    if not modelo:
        return ""
    return modelo.split("/")[-1].replace(":free", "")

ROL_JUEZ = (
    "Sos el JUEZ del consejo «Ronda de ideas IA». Corrés localmente con "
    "Ollama, sin nube. Leíste el debate completo y tenés que emitir un "
    "veredicto estructurado respetando las preferencias del usuario."
)


def _describir(valor: int, bajo: str, medio: str, alto: str) -> str:
    if valor <= 33:
        return bajo
    if valor <= 66:
        return medio
    return alto


def _contexto_filtros(filtros: dict) -> str:
    return (
        "Preferencias del usuario (filtros de la interfaz): "
        f"costo {_describir(filtros['costo'], 'bajo', 'medio', 'alto')}, "
        f"viabilidad {_describir(filtros['viabilidad'], 'fácil', 'intermedia', 'difícil/ambiciosa')}, "
        f"plazo {_describir(filtros['plazo'], 'corto', 'medio', 'largo')}."
    )


def _tono(filtros: dict) -> str:
    if filtros.get("brutal"):
        return (
            "Modo HONESTIDAD BRUTAL: decí los problemas sin suavizarlos, "
            "sin diplomacia vacía. Si la idea es floja, decilo y explicá por qué."
        )
    return "Modo sinceridad alta: sé honesto pero constructivo."


def _sistema_debate(rol_base: str, filtros: dict) -> str:
    return (
        f"{rol_base}\n\n{_contexto_filtros(filtros)}\n{_tono(filtros)}\n"
        "Respondé en español, en menos de 150 palabras "
        "(sin contar el diagrama si incluís uno)."
    )


AGENTES_DEBATE = [
    {
        "id": "groq",
        "etiqueta": "Groq · Creativo",
        "rol": ROL_GROQ,
    },
    {
        "id": "gemini",
        "etiqueta": "Gemini · Lógica",
        "rol": ROL_GEMINI,
    },
    {
        "id": "tecnico",
        "etiqueta": "Técnico (OpenRouter)",
        "rol": ROL_TECNICO,
    },
    {
        "id": "estratega",
        "etiqueta": "Estratega (OpenRouter)",
        "rol": ROL_ESTRATEGA,
    },
]


# ---------------------------------------------------------------------------
# Veredicto del Juez
# ---------------------------------------------------------------------------

def _sistema_juez(filtros: dict) -> str:
    sinceridad = "honestidad brutal" if filtros.get("brutal") else "sinceridad alta"
    return (
        f"{ROL_JUEZ}\n\n"
        f"{_contexto_filtros(filtros)}\n"
        f"Umbral de consenso exigido: {filtros['umbral']}%.\n"
        f"Modo de sinceridad: {sinceridad}.\n\n"
        "Respondé SOLO con un objeto JSON válido, sin texto extra, con esta "
        "forma exacta:\n"
        '{"consenso": <entero 0-100>, '
        '"veredicto": "aprobada" | "rechazada" | "iterar", '
        '"resumen": "<2 o 3 frases en español>", '
        '"acciones": ["<próximo paso concreto>", "..."]}\n'
        "Si el consenso que estimás es menor que el umbral, el veredicto no "
        'puede ser "aprobada".'
    )


def interpretar_veredicto(crudo: str, umbral: int) -> dict:
    """Convierte la salida del Juez en una estructura confiable."""
    base = {
        "consenso": 0,
        "veredicto": "sin-veredicto",
        "resumen": (crudo or "").strip(),
        "acciones": [],
    }
    if not crudo or crudo.lstrip().startswith("⚠️"):
        return base

    datos = None
    try:
        datos = json.loads(crudo)
    except ValueError:
        bloque = re.search(r"\{.*\}", crudo, re.DOTALL)
        if bloque:
            try:
                datos = json.loads(bloque.group(0))
            except ValueError:
                datos = None
    if not isinstance(datos, dict):
        return base

    try:
        consenso = max(0, min(100, int(float(datos.get("consenso", 0)))))
    except (TypeError, ValueError):
        consenso = 0

    veredicto = str(datos.get("veredicto", "iterar")).strip().lower()
    if veredicto not in ("aprobada", "rechazada", "iterar"):
        veredicto = "iterar"
    if veredicto == "aprobada" and consenso < umbral:
        veredicto = "iterar"

    acciones_crudas = datos.get("acciones", [])
    acciones = []
    if isinstance(acciones_crudas, list):
        acciones = [str(a).strip() for a in acciones_crudas if str(a).strip()][:6]

    resumen = str(datos.get("resumen", "")).strip() or base["resumen"]
    return {
        "consenso": consenso,
        "veredicto": veredicto,
        "resumen": resumen,
        "acciones": acciones,
    }


def _formatear_veredicto(veredicto: dict, umbral: int) -> str:
    lineas = [
        f"Veredicto: {veredicto['veredicto'].upper()} — "
        f"consenso {veredicto['consenso']}% (umbral {umbral}%)",
        "",
        veredicto["resumen"],
    ]
    if veredicto["acciones"]:
        lineas += [""] + ["Próximos pasos:"] + [f"• {a}" for a in veredicto["acciones"]]
    return "\n".join(lineas)


# ---------------------------------------------------------------------------
# Debate completo (generador de eventos para el SSE)
# ---------------------------------------------------------------------------

async def correr_debate(
    sesion_id: int,
    prompt_usuario: str,
    filtros: dict,
    adjuntos: Optional[List[dict]] = None,
) -> AsyncGenerator[dict, None]:
    adjuntos = adjuntos or []
    guardar_mensaje(sesion_id, "user", "Vos", prompt_usuario)

    # Imágenes en base64 para los agentes con visión (Claude y Gemini).
    imagenes = [
        {"media_type": a.get("mediaType") or "image/png", "data": a["dataBase64"]}
        for a in adjuntos
        if a.get("tipo") == "imagen" and a.get("dataBase64")
    ]
    videos = [a.get("nombre", "video") for a in adjuntos if a.get("tipo") == "video"]

    transcripcion = [f"Idea del usuario: {prompt_usuario}"]
    if imagenes:
        transcripcion.append(
            f"(El usuario adjuntó {len(imagenes)} imagen(es) de referencia visual.)"
        )
    if videos:
        transcripcion.append(
            "(El usuario adjuntó video(s) de referencia: "
            + ", ".join(videos)
            + ". El análisis de video llega en una próxima versión.)"
        )

    # --- Debate secuencial -------------------------------------------------
    for agente in AGENTES_DEBATE:
        contexto = "\n\n".join(transcripcion)
        sistema = _sistema_debate(agente["rol"], filtros)
        etiqueta = agente["etiqueta"]

        if agente["id"] == "groq":
            texto = await llamar_groq(sistema, contexto)
        elif agente["id"] == "gemini":
            # Gemini es el único del consejo con visión: recibe las imágenes.
            texto = await llamar_gemini(sistema, contexto, imagenes or None)
        elif agente["id"] == "tecnico":
            texto, modelo = await llamar_openrouter(
                sistema,
                contexto,
                _cadena("OPENROUTER_MODEL_TECNICO", "openai/gpt-oss-120b:free"),
            )
            if modelo:
                etiqueta = f"{_nombre_corto(modelo)} · Técnico (OpenRouter)"
        else:  # estratega
            texto, modelo = await llamar_openrouter(
                sistema,
                contexto,
                _cadena(
                    "OPENROUTER_MODEL_ESTRATEGA",
                    "nvidia/nemotron-3-ultra-550b-a55b:free",
                ),
            )
            if modelo:
                etiqueta = f"{_nombre_corto(modelo)} · Estratega (OpenRouter)"

        # Red de seguridad: si Groq o Gemini fallaron y hay clave de
        # OpenRouter, reintentamos con la cadena de modelos gratuitos.
        if (
            texto.startswith("⚠️")
            and agente["id"] in ("groq", "gemini")
            and os.getenv("OPENROUTER_API_KEY")
        ):
            reintento, modelo = await llamar_openrouter(
                sistema, contexto, _alternativos()
            )
            if not reintento.startswith("⚠️"):
                texto = (
                    f"(vía respaldo gratuito de OpenRouter: "
                    f"{_nombre_corto(modelo)})\n{reintento}"
                )

        mermaid = extraer_mermaid(texto)
        guardar_mensaje(sesion_id, agente["id"], etiqueta, texto, mermaid)
        transcripcion.append(f"{etiqueta} dijo:\n{texto}")

        yield {
            "type": "message",
            "agente": agente["id"],
            "etiqueta": etiqueta,
            "contenido": texto,
            "mermaid": mermaid,
        }

    # --- Veredicto del Juez local (Ollama) ---------------------------------
    contexto_final = "\n\n".join(transcripcion)
    crudo = await llamar_ollama(_sistema_juez(filtros), contexto_final, formato_json=True)
    veredicto = interpretar_veredicto(crudo, int(filtros["umbral"]))
    contenido = _formatear_veredicto(veredicto, int(filtros["umbral"]))

    guardar_mensaje(sesion_id, "juez", "Ollama · Juez local", contenido)

    yield {"type": "verdict", "contenido": contenido, **veredicto}
    yield {"type": "done"}
