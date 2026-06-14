"""Rutas de datos de la app, según el sistema operativo.

Centraliza dónde viven la base SQLite y el .env con las claves, para que
la misma base de código funcione en macOS, Windows y Linux.
"""
from __future__ import annotations

import os
import sys


def carpeta_datos() -> str:
    """Carpeta donde la app guarda base de datos y claves.

    - Desarrollo (sin empaquetar): junto al código, en sidecar/datos.
    - macOS:   ~/Library/Application Support/RondaDeIdeasIA
    - Windows: %APPDATA%/RondaDeIdeasIA
    - Linux:   ~/.local/share/RondaDeIdeasIA
    """
    if not getattr(sys, "frozen", False):
        base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos")
    elif sys.platform == "darwin":
        base = os.path.expanduser("~/Library/Application Support/RondaDeIdeasIA")
    elif sys.platform.startswith("win"):
        raiz = os.environ.get("APPDATA", os.path.expanduser("~"))
        base = os.path.join(raiz, "RondaDeIdeasIA")
    else:
        base = os.path.expanduser("~/.local/share/RondaDeIdeasIA")
    os.makedirs(base, exist_ok=True)
    return base


def ruta_env() -> str:
    """El .env que la app empaquetada lee de verdad (en la carpeta de datos)."""
    return os.path.join(carpeta_datos(), ".env")
