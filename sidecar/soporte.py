"""Soporte de la app: estado de las IAs, prueba en vivo y asistente de ayuda.

- Estado de proveedores: ¿tiene clave? ¿responde? (Ollama se chequea local).
- Asistente «RI»: responde dudas sobre la app entera (qué hace cada IA,
  cómo plantear ideas, qué significan los filtros, etc.).
- Edición de claves: guarda las API keys en el .env de la app para que
  cualquier persona pueda usar las suyas sin tocar archivos a mano.
"""
from __future__ import annotations

import os
from typing import List

import httpx

from orchestrator import _alternativos
from providers import (
    llamar_gemini,
    llamar_groq,
    llamar_ollama,
    llamar_openrouter,
)
from rutas import ruta_env

# ---------------------------------------------------------------------------
# Catálogo de proveedores (lo que muestra la pantalla de Soporte)
# ---------------------------------------------------------------------------

PROVEEDORES = [
    {
        "id": "groq",
        "nombre": "Groq",
        "rol": "Creativo · abre el debate",
        "clave": "GROQ_API_KEY",
        "local": False,
        "obtener": "https://console.groq.com/keys",
    },
    {
        "id": "gemini",
        "nombre": "Gemini",
        "rol": "Lógica · revisa supuestos y mira imágenes",
        "clave": "GEMINI_API_KEY",
        "local": False,
        "obtener": "https://aistudio.google.com/apikey",
    },
    {
        "id": "openrouter",
        "nombre": "OpenRouter",
        "rol": "Técnico + Estratega · evalúa y sintetiza",
        "clave": "OPENROUTER_API_KEY",
        "local": False,
        "obtener": "https://openrouter.ai/keys",
    },
    {
        "id": "ollama",
        "nombre": "Ollama",
        "rol": "Juez local · dicta el veredicto (sin nube)",
        "clave": None,
        "local": True,
        "obtener": "https://ollama.com/download",
    },
]

CLAVES_EDITABLES = ["GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"]


def _enmascarar(valor: str) -> str:
    if not valor:
        return ""
    if len(valor) <= 8:
        return "••••"
    return f"{valor[:4]}…{valor[-4:]}"


async def _estado_ollama() -> dict:
    """Chequea Ollama localmente (sin gastar cuota de nada)."""
    base = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
    modelo = os.getenv("OLLAMA_MODEL", "llama3.1")
    try:
        async with httpx.AsyncClient(timeout=4) as http:
            r = await http.get(f"{base}/api/tags")
            r.raise_for_status()
            instalados = [m["name"] for m in r.json().get("models", [])]
    except httpx.HTTPError:
        return {
            "configurado": False,
            "detalle": "Ollama está apagado o no instalado.",
        }
    tiene = any(m.split(":")[0] == modelo.split(":")[0] for m in instalados)
    if tiene:
        return {"configurado": True, "detalle": f"Modelo {modelo} listo."}
    return {
        "configurado": False,
        "detalle": f"Falta el modelo: corré «ollama pull {modelo}».",
    }


async def estado_proveedores() -> dict:
    """Estado rápido de cada IA, sin gastar cuota (salvo el ping local a Ollama)."""
    filas = []
    for p in PROVEEDORES:
        if p["local"]:
            estado = await _estado_ollama()
            filas.append({**_meta(p), **estado, "clave_enmascarada": ""})
        else:
            valor = os.getenv(p["clave"], "")
            filas.append(
                {
                    **_meta(p),
                    "configurado": bool(valor),
                    "detalle": "Clave cargada." if valor else "Falta la clave.",
                    "clave_enmascarada": _enmascarar(valor),
                }
            )
    return {"proveedores": filas}


def _meta(p: dict) -> dict:
    return {
        "id": p["id"],
        "nombre": p["nombre"],
        "rol": p["rol"],
        "local": p["local"],
        "clave": p["clave"],
        "obtener": p["obtener"],
    }


async def probar_proveedores() -> dict:
    """Prueba REAL de cada IA (una llamada mínima). La dispara el usuario."""
    saludo = "Respondé solo con la palabra: OK"
    sistema = "Sos un test de conexión. Respondé brevísimo."

    async def ok(texto: str) -> dict:
        bien = not texto.startswith("⚠️")
        return {
            "responde": bien,
            "detalle": "Responde bien." if bien else texto.replace("⚠️ ", ""),
        }

    groq = await ok(await llamar_groq(sistema, saludo))
    gemini = await ok(await llamar_gemini(sistema, saludo))
    or_texto, or_modelo = await llamar_openrouter(sistema, saludo, _alternativos())
    openrouter = await ok(or_texto)
    if openrouter["responde"] and or_modelo:
        openrouter["detalle"] = f"Responde ({or_modelo.split('/')[-1]})."
    ollama = await ok(await llamar_ollama("Sos un test.", saludo))

    return {
        "resultados": {
            "groq": groq,
            "gemini": gemini,
            "openrouter": openrouter,
            "ollama": ollama,
        }
    }


# ---------------------------------------------------------------------------
# Edición de claves (para compartir la app sin tocar archivos)
# ---------------------------------------------------------------------------

def guardar_claves(cambios: dict) -> None:
    """Actualiza/inserta solo las claves indicadas, preservando el resto."""
    ruta = ruta_env()
    lineas = []
    if os.path.exists(ruta):
        with open(ruta, "r", encoding="utf-8") as f:
            lineas = f.read().splitlines()

    restantes = dict(cambios)
    salida = []
    for linea in lineas:
        clave_linea = linea.split("=", 1)[0].strip() if "=" in linea else ""
        if clave_linea in restantes:
            salida.append(f"{clave_linea}={restantes.pop(clave_linea)}")
        else:
            salida.append(linea)
    for clave, valor in restantes.items():
        salida.append(f"{clave}={valor}")

    with open(ruta, "w", encoding="utf-8") as f:
        f.write("\n".join(salida) + "\n")

    # Que tome efecto sin reiniciar la app.
    for clave, valor in cambios.items():
        os.environ[clave] = valor


# ---------------------------------------------------------------------------
# Asistente «RI»: dudas sobre la app entera
# ---------------------------------------------------------------------------

SISTEMA_ASISTENTE = (
    "Sos «RI», el asistente de la app de escritorio «Ronda de ideas IA». "
    "Ayudás al usuario a entender y aprovechar la app. Hablás en español "
    "rioplatense (voseo), cálido y breve (máximo ~120 palabras), sin tecnicismos "
    "innecesarios. El usuario NO es programador.\n\n"
    "QUÉ ES LA APP: un consejo de IAs debate las ideas del usuario y un juez "
    "local emite un veredicto. El usuario escribe una idea y el consejo la "
    "discute en orden.\n\n"
    "EL CONSEJO (en orden):\n"
    "• Groq (Creativo): abre el debate, propone ángulos y combinaciones nuevas. "
    "Es gratis y muy rápido.\n"
    "• Gemini (Lógica): revisa supuestos, contradicciones y riesgos. Además es "
    "el único que puede mirar imágenes que adjuntes.\n"
    "• Técnico (vía OpenRouter): evalúa qué tan factible es construirla y cuánto "
    "esfuerzo lleva.\n"
    "• Estratega (vía OpenRouter): cierra el debate, marca la decisión clave y "
    "qué conviene validar primero.\n"
    "• Ollama (Juez local): corre en la propia computadora, sin internet ni "
    "claves. Lee los filtros y dicta el veredicto final: aprobada, iterar o "
    "rechazada, con un porcentaje de consenso.\n\n"
    "LOS FILTROS (a la izquierda) que el Juez tiene en cuenta:\n"
    "• Costo (bajo↔alto), Viabilidad (fácil↔difícil), Plazo (corto↔largo).\n"
    "• Umbral de consenso: el % mínimo para que una idea pueda aprobarse.\n"
    "• Sinceridad alta / Honestidad brutal: si está en brutal, el consejo no "
    "suaviza las críticas.\n\n"
    "OTRAS FUNCIONES: el micrófono transcribe tu voz localmente; podés adjuntar "
    "imágenes (las mira Gemini); si una IA genera un diagrama, aparece en "
    "«Recursos»; el historial guarda cada sesión.\n\n"
    "CÓMO PLANTEAR IDEAS: animá a describir la idea en una o dos frases, con el "
    "objetivo y para quién es. Si preguntan algo que no es sobre la app, "
    "respondé igual con buena onda pero sugerí planteárselo al consejo con el "
    "botón de enviar.\n\n"
    "Si te preguntan «qué hace X», explicá el rol de esa IA en una o dos frases."
)


async def responder_asistente(pregunta: str) -> str:
    """Responde con Groq (rápido) y cae a OpenRouter si Groq no está."""
    texto = await llamar_groq(SISTEMA_ASISTENTE, pregunta)
    if texto.startswith("⚠️") and os.getenv("OPENROUTER_API_KEY"):
        alt, _ = await llamar_openrouter(
            SISTEMA_ASISTENTE, pregunta, _alternativos()
        )
        if not alt.startswith("⚠️"):
            return alt
    if texto.startswith("⚠️"):
        # Sin nube: respuesta de respaldo local con lo esencial.
        return (
            "No pude conectar con la nube ahora mismo, pero te cuento lo básico: "
            "escribí tu idea y el consejo la debate (Groq propone, Gemini revisa, "
            "el Técnico evalúa y el Estratega cierra). Después, Ollama —que corre "
            "en tu compu— dicta el veredicto según los filtros de la izquierda. "
            "Probá de nuevo en un minuto para una respuesta más completa."
        )
    return texto


def _claves_lista() -> List[str]:
    return CLAVES_EDITABLES
