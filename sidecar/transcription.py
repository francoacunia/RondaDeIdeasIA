"""Transcripción local de voz con OpenAI Whisper (sin mandar audio a la nube)."""
from __future__ import annotations

import os

_modelo = None


def transcribir_archivo(ruta: str) -> str:
    """Transcribe un archivo de audio. Carga el modelo una sola vez.

    Whisper es una dependencia opcional (pesa varios GB con PyTorch);
    si no está instalado devolvemos un error claro con el paso a seguir.
    """
    global _modelo

    try:
        import whisper
    except ImportError:
        raise RuntimeError(
            "Whisper no está instalado en el sidecar. Para activar la voz corré: "
            "sidecar/.venv/bin/pip install -r sidecar/requirements-voz.txt "
            "(necesita Python 3.10+ y ffmpeg instalado)."
        )

    if _modelo is None:
        # "base" equilibra velocidad y calidad; "small" mejora la precisión.
        _modelo = whisper.load_model(os.getenv("WHISPER_MODEL", "base"))

    resultado = _modelo.transcribe(
        ruta,
        language=os.getenv("WHISPER_IDIOMA", "es"),
        fp16=False,
    )
    return str(resultado.get("text", "")).strip()
