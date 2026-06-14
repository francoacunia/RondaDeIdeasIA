"""Punto de entrada del sidecar EMPAQUETADO (PyInstaller).

La app de escritorio (Tauri) ejecuta este binario al abrirse y lo cierra
al salir. No usa --reload ni nada de desarrollo.
"""
import multiprocessing
import os
import socket
import subprocess
import sys
import threading
import time

import uvicorn

import main


def _vigilar_huerfandad() -> None:
    """Si la app de escritorio muere, este proceso queda huérfano: nos
    apagamos solos para no dejar procesos colgados. (Solo en Unix; en
    Windows, Tauri mata el proceso hijo directamente.)"""
    if sys.platform.startswith("win"):
        return
    while True:
        if os.getppid() == 1:
            os._exit(0)
        time.sleep(2)


def _ollama_activo() -> bool:
    try:
        with socket.create_connection(("127.0.0.1", 11434), timeout=1):
            return True
    except OSError:
        return False


def _intentar_levantar_ollama() -> None:
    """Si Ollama está instalado pero apagado, lo despierta (mejor esfuerzo)."""
    if _ollama_activo():
        return
    if sys.platform == "darwin":
        comando = ["open", "-a", "Ollama"]
    elif sys.platform.startswith("win"):
        comando = ["cmd", "/c", "start", "", "ollama", "app"]
    else:
        comando = ["ollama", "serve"]
    try:
        subprocess.run(comando, check=False, capture_output=True, timeout=10)
    except Exception:
        pass  # si no está instalado, el Juez avisará en el debate


if __name__ == "__main__":
    multiprocessing.freeze_support()
    threading.Thread(target=_vigilar_huerfandad, daemon=True).start()
    _intentar_levantar_ollama()
    uvicorn.run(main.app, host="127.0.0.1", port=8765, log_level="info")
