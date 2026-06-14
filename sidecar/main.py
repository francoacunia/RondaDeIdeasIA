"""Sidecar de «Ronda de ideas IA»: orquestador FastAPI que corre junto a la UI.

Endpoints principales:
  GET  /api/salud                  — chequeo de vida
  POST /api/sesiones               — crea una sesión de debate (SQLite)
  GET  /api/sesiones               — historial de sesiones
  GET  /api/sesiones/{id}/mensajes — mensajes guardados de una sesión
  DELETE /api/sesiones/{id}        — borra una sesión del historial
  POST /api/debate                 — corre el debate multi-agente (SSE)
  POST /api/transcribir            — audio del micrófono → Whisper local
  POST /api/vision                 — imagen base64 → análisis del Sintetizador
  GET  /api/estado                 — estado de cada IA (Soporte)
  POST /api/estado/probar          — prueba real de cada IA (a pedido)
  GET  /api/config                 — qué claves están cargadas (enmascaradas)
  POST /api/config                 — guarda las API keys del usuario
  POST /api/asistente              — asistente «RI»: dudas sobre la app
"""
from __future__ import annotations

import json
import os
import tempfile
from contextlib import asynccontextmanager
from typing import List, Optional

from dotenv import load_dotenv

from rutas import ruta_env

# Claves: en desarrollo viven en sidecar/.env; en la app empaquetada,
# en la carpeta de datos del sistema (ver rutas.py).
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
load_dotenv(ruta_env())

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database import MensajeDebate, SesionDB, SesionDebate, iniciar_db
from orchestrator import correr_debate
from providers import llamar_gemini
from soporte import (
    CLAVES_EDITABLES,
    estado_proveedores,
    guardar_claves,
    probar_proveedores,
    responder_asistente,
)
from transcription import transcribir_archivo


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    iniciar_db()
    yield


app = FastAPI(title="Ronda de ideas IA — Sidecar", lifespan=ciclo_de_vida)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "tauri://localhost",
        "http://tauri.localhost",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Modelos de entrada
# ---------------------------------------------------------------------------

class FiltrosEntrada(BaseModel):
    costo: int = 50
    viabilidad: int = 50
    plazo: int = 50
    umbral: int = 70
    brutal: bool = False


class AdjuntoEntrada(BaseModel):
    tipo: str
    nombre: str = ""
    mediaType: Optional[str] = None
    dataBase64: Optional[str] = None


class DebateEntrada(BaseModel):
    sesion_id: int
    prompt: str
    filtros: FiltrosEntrada = FiltrosEntrada()
    adjuntos: List[AdjuntoEntrada] = []


class SesionEntrada(BaseModel):
    titulo: str = "Sesión sin título"


class VisionEntrada(BaseModel):
    imagen_base64: str
    media_type: str = "image/png"
    prompt: str = (
        "Describí esta imagen de referencia visual y qué elementos "
        "aporta a la idea en discusión."
    )


class ClavesEntrada(BaseModel):
    claves: dict


class AsistenteEntrada(BaseModel):
    pregunta: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/salud")
def salud():
    return {"ok": True, "servicio": "ronda-de-ideas-ia"}


@app.post("/api/sesiones")
def crear_sesion(entrada: SesionEntrada):
    with SesionDB() as db:
        sesion = SesionDebate(titulo=entrada.titulo or "Sesión sin título")
        db.add(sesion)
        db.commit()
        return {"id": sesion.id, "titulo": sesion.titulo}


@app.get("/api/stats")
def estadisticas():
    """Contadores reales del dashboard, calculados desde SQLite."""
    with SesionDB() as db:
        veredictos = (
            db.query(MensajeDebate).filter(MensajeDebate.agente == "juez").all()
        )
        rondas = len(veredictos)
        aprobadas = sum(
            1 for m in veredictos if m.contenido.startswith("Veredicto: APROBADA")
        )
        tasa = round(aprobadas * 100 / rondas, 1) if rondas else 0.0
        return {"rondas": rondas, "aprobadas": aprobadas, "tasa_aprobacion": tasa}


@app.get("/api/sesiones")
def listar_sesiones():
    with SesionDB() as db:
        sesiones = db.query(SesionDebate).order_by(SesionDebate.creada_en.desc()).all()
        return [
            {
                "id": s.id,
                "titulo": s.titulo,
                "creada_en": s.creada_en.isoformat(),
                "mensajes": len(s.mensajes),
            }
            for s in sesiones
        ]


@app.get("/api/sesiones/{sesion_id}/mensajes")
def mensajes_de_sesion(sesion_id: int):
    with SesionDB() as db:
        mensajes = (
            db.query(MensajeDebate)
            .filter(MensajeDebate.sesion_id == sesion_id)
            .order_by(MensajeDebate.creado_en)
            .all()
        )
        return [
            {
                "agente": m.agente,
                "etiqueta": m.etiqueta,
                "contenido": m.contenido,
                "mermaid": m.mermaid,
                "creado_en": m.creado_en.isoformat(),
            }
            for m in mensajes
        ]


@app.delete("/api/sesiones/{sesion_id}")
def borrar_sesion(sesion_id: int):
    with SesionDB() as db:
        sesion = db.get(SesionDebate, sesion_id)
        if sesion is None:
            raise HTTPException(status_code=404, detail="La sesión no existe.")
        db.delete(sesion)
        db.commit()
        return {"ok": True}


# ---------------------------------------------------------------------------
# Soporte: estado de las IAs, claves y asistente
# ---------------------------------------------------------------------------

@app.get("/api/estado")
async def estado():
    return await estado_proveedores()


@app.post("/api/estado/probar")
async def estado_probar():
    return await probar_proveedores()


@app.get("/api/config")
def config():
    """Qué claves están cargadas (enmascaradas, nunca el valor completo)."""
    salida = {}
    for clave in CLAVES_EDITABLES:
        valor = os.getenv(clave, "")
        salida[clave] = {
            "cargada": bool(valor),
            "vista": (f"{valor[:4]}…{valor[-4:]}" if len(valor) > 8 else ""),
        }
    return {"claves": salida}


@app.post("/api/config")
def guardar_config(entrada: ClavesEntrada):
    # Solo aceptamos claves conocidas y valores no vacíos.
    cambios = {
        k: v.strip()
        for k, v in entrada.claves.items()
        if k in CLAVES_EDITABLES and isinstance(v, str) and v.strip()
    }
    if not cambios:
        raise HTTPException(status_code=400, detail="No hay claves válidas para guardar.")
    guardar_claves(cambios)
    return {"ok": True, "guardadas": list(cambios.keys())}


@app.post("/api/asistente")
async def asistente(entrada: AsistenteEntrada):
    pregunta = entrada.pregunta.strip()
    if not pregunta:
        raise HTTPException(status_code=400, detail="La pregunta está vacía.")
    return {"respuesta": await responder_asistente(pregunta)}


@app.post("/api/debate")
async def debate(entrada: DebateEntrada):
    with SesionDB() as db:
        if db.get(SesionDebate, entrada.sesion_id) is None:
            raise HTTPException(status_code=404, detail="La sesión no existe.")
        sesion = db.get(SesionDebate, entrada.sesion_id)
        sesion.filtros_json = entrada.filtros.model_dump_json()
        db.commit()

    async def generador():
        try:
            async for evento in correr_debate(
                entrada.sesion_id,
                entrada.prompt,
                entrada.filtros.model_dump(),
                [a.model_dump() for a in entrada.adjuntos],
            ):
                yield f"data: {json.dumps(evento, ensure_ascii=False)}\n\n"
        except Exception as e:  # nunca cortamos el stream sin avisar a la UI
            error = {"type": "error", "detalle": str(e)}
            yield f"data: {json.dumps(error, ensure_ascii=False)}\n\n"
            yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(generador(), media_type="text/event-stream")


@app.post("/api/transcribir")
async def transcribir(audio: UploadFile = File(...)):
    sufijo = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=sufijo, delete=False) as temporal:
        temporal.write(await audio.read())
        ruta = temporal.name
    try:
        # Whisper bloquea el proceso: lo corremos en un hilo aparte.
        texto = await run_in_threadpool(transcribir_archivo, ruta)
        return {"texto": texto}
    except RuntimeError as e:
        raise HTTPException(status_code=501, detail=str(e))
    finally:
        os.unlink(ruta)


@app.post("/api/vision")
async def vision(entrada: VisionEntrada):
    sistema = (
        "Sos el Sintetizador visual del consejo «Ronda de ideas IA». "
        "Analizás imágenes de referencia para alimentar el debate."
    )
    analisis = await llamar_gemini(
        sistema,
        entrada.prompt,
        [{"media_type": entrada.media_type, "data": entrada.imagen_base64}],
    )
    return {"analisis": analisis}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8765, reload=True)
