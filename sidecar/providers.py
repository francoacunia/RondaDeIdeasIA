"""Conectores con cada proveedor de IA.

Todos los proveedores del consejo son GRATUITOS:
  - Groq        → modelos Llama servidos gratis y ultrarrápido (console.groq.com)
  - Gemini      → capa gratuita de Google AI Studio, con visión (aistudio.google.com)
  - OpenRouter  → modelos ":free"; acá lo usamos para DeepSeek (openrouter.ai)
  - Ollama      → 100 % local, sin clave

Cada función devuelve siempre un string: la respuesta del modelo o un
mensaje amigable (con ⚠️) si la clave falta o algo falló. Así la app
sigue funcionando aunque no tengas todas las claves configuradas.
"""
from __future__ import annotations

import asyncio
import os
from typing import List, Optional, Tuple

import httpx

TIEMPO_MAX = 180.0

# Una imagen adjunta llega como {"media_type": "image/png", "data": "<base64>"}
Imagenes = Optional[List[dict]]


def _sin_clave(nombre: str, variable: str, donde: str) -> str:
    return (
        f"⚠️ {nombre} no está configurado. Conseguí la clave gratis en {donde}, "
        f"agregala como {variable} en sidecar/.env y reiniciá el sidecar."
    )


async def _chat_openai(
    nombre: str,
    url: str,
    clave: str,
    modelo: str,
    sistema: str,
    prompt: str,
    extra_headers: Optional[dict] = None,
    pista_modelo: str = "",
    esperar_en_429: float = 20.0,
) -> str:
    """Llamada genérica a APIs con formato OpenAI (Groq, OpenRouter)."""
    cuerpo = {
        "model": modelo,
        "messages": [
            {"role": "system", "content": sistema},
            {"role": "user", "content": prompt},
        ],
    }
    headers = {"Authorization": f"Bearer {clave}"}
    if extra_headers:
        headers.update(extra_headers)

    try:
        async with httpx.AsyncClient(timeout=TIEMPO_MAX) as http:
            r = await http.post(url, headers=headers, json=cuerpo)
            if r.status_code == 429 and esperar_en_429 > 0:
                # Límite por minuto de la capa gratuita: una pausa y un reintento.
                await asyncio.sleep(esperar_en_429)
                r = await http.post(url, headers=headers, json=cuerpo)
    except httpx.HTTPError:
        return f"⚠️ No pude conectar con {nombre}. ¿Hay internet?"

    if r.status_code == 429:
        return (
            f"⚠️ {nombre}: alcanzaste el límite de la capa gratuita. "
            "Esperá un minuto y volvé a intentar."
        )
    if r.status_code in (401, 403):
        return f"⚠️ La clave de {nombre} no es válida."
    if r.status_code in (400, 404):
        return (
            f"⚠️ {nombre} rechazó el modelo '{modelo}' ({r.status_code}). "
            f"{pista_modelo or 'Cambialo en sidecar/.env.'}"
        )
    if r.status_code != 200:
        return f"⚠️ {nombre} devolvió un error ({r.status_code})."

    try:
        return r.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, ValueError, AttributeError):
        return f"⚠️ {nombre} devolvió una respuesta inesperada."


async def llamar_groq(sistema: str, prompt: str) -> str:
    """Groq (rol Creativo): modelos Llama gratis y muy rápidos."""
    clave = os.getenv("GROQ_API_KEY")
    if not clave:
        return _sin_clave("Groq", "GROQ_API_KEY", "https://console.groq.com/keys")
    return await _chat_openai(
        "Groq",
        "https://api.groq.com/openai/v1/chat/completions",
        clave,
        os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        sistema,
        prompt,
        pista_modelo=(
            "Mirá los modelos vigentes en console.groq.com/docs/models "
            "y actualizá GROQ_MODEL en sidecar/.env."
        ),
    )


async def llamar_openrouter(
    sistema: str, prompt: str, modelos: List[str]
) -> Tuple[str, Optional[str]]:
    """Modelos gratuitos (":free") de OpenRouter con cadena de suplentes.

    Prueba los modelos en orden hasta que uno responda (los endpoints
    gratuitos se saturan seguido). Devuelve (texto, modelo_que_respondió);
    si ninguno respondió, el modelo es None.
    """
    clave = os.getenv("OPENROUTER_API_KEY")
    if not clave:
        return (
            _sin_clave("OpenRouter", "OPENROUTER_API_KEY", "https://openrouter.ai/keys"),
            None,
        )

    ultimo_error = "⚠️ Sin modelos para probar."
    for modelo in modelos:
        texto = await _chat_openai(
            "OpenRouter",
            "https://openrouter.ai/api/v1/chat/completions",
            clave,
            modelo,
            sistema,
            prompt,
            extra_headers={
                "HTTP-Referer": "https://ronda-de-ideas-ia.local",
                "X-Title": "Ronda de ideas IA",
            },
            pista_modelo=(
                "Puede que ese modelo haya dejado de ser gratis. Elegí otro "
                "':free' en openrouter.ai/models y actualizá sidecar/.env."
            ),
            esperar_en_429=0,  # la cadena pasa al suplente en vez de esperar
        )
        if not texto.startswith("⚠️"):
            return texto, modelo
        ultimo_error = texto

    return (
        f"⚠️ Ningún modelo gratuito de OpenRouter respondió en este momento "
        f"(probé {len(modelos)}). Suele pasar en horas pico; reintentá en unos "
        f"minutos. Último error: {ultimo_error.replace('⚠️ ', '')}",
        None,
    )


async def llamar_gemini(sistema: str, prompt: str, imagenes: Imagenes = None) -> str:
    """Gemini (rol Lógica + Sintetizador visual) vía la API REST de Google."""
    clave = os.getenv("GEMINI_API_KEY")
    if not clave:
        return _sin_clave(
            "Gemini", "GEMINI_API_KEY", "https://aistudio.google.com/apikey"
        )

    modelo = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    partes: List[dict] = []
    for imagen in imagenes or []:
        partes.append(
            {
                "inline_data": {
                    "mime_type": imagen.get("media_type", "image/png"),
                    "data": imagen["data"],
                }
            }
        )
    partes.append({"text": prompt})

    cuerpo = {
        "system_instruction": {"parts": [{"text": sistema}]},
        "contents": [{"role": "user", "parts": partes}],
    }
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{modelo}:generateContent"
    )
    try:
        async with httpx.AsyncClient(timeout=TIEMPO_MAX) as http:
            r = await http.post(url, params={"key": clave}, json=cuerpo)
            if r.status_code == 429:
                return (
                    "⚠️ Gemini: alcanzaste el límite de la capa gratuita. "
                    "Esperá un minuto y volvé a intentar."
                )
            r.raise_for_status()
            datos = r.json()
            return datos["candidates"][0]["content"]["parts"][0]["text"].strip()
    except httpx.HTTPStatusError as e:
        return f"⚠️ Gemini devolvió un error ({e.response.status_code})."
    except (httpx.HTTPError, KeyError, IndexError):
        return "⚠️ No pude obtener respuesta de Gemini."


async def llamar_ollama(sistema: str, prompt: str, formato_json: bool = False) -> str:
    """El Juez local: corre en tu máquina con Ollama, sin nube ni clave."""
    base = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
    modelo = os.getenv("OLLAMA_MODEL", "llama3.1")

    cuerpo: dict = {
        "model": modelo,
        "stream": False,
        "messages": [
            {"role": "system", "content": sistema},
            {"role": "user", "content": prompt},
        ],
    }
    if formato_json:
        cuerpo["format"] = "json"

    try:
        async with httpx.AsyncClient(timeout=TIEMPO_MAX) as http:
            r = await http.post(f"{base}/api/chat", json=cuerpo)
    except httpx.ConnectError:
        return (
            "⚠️ No pude conectar con Ollama. Abrí la app de Ollama (o corré "
            "`ollama serve`) y volvé a intentar."
        )
    except httpx.HTTPError:
        return "⚠️ Ollama no respondió a tiempo."

    if r.status_code == 404:
        return (
            f"⚠️ El modelo '{modelo}' no está descargado en Ollama. "
            f"Corré en la terminal: ollama pull {modelo}"
        )
    if r.status_code != 200:
        return f"⚠️ Ollama devolvió un error ({r.status_code})."

    try:
        return r.json()["message"]["content"].strip()
    except (KeyError, ValueError):
        return "⚠️ Ollama devolvió una respuesta inesperada."
