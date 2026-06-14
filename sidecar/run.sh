#!/usr/bin/env bash
# Levanta el sidecar. La primera vez crea el entorno virtual e instala
# las dependencias básicas (livianas) automáticamente.
set -e
cd "$(dirname "$0")"

PY=""
for candidato in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$candidato" >/dev/null 2>&1; then
    PY="$candidato"
    break
  fi
done

if [ -z "$PY" ]; then
  echo "[sidecar] No encontré Python 3. Instalalo con: brew install python@3.12" >&2
  exit 1
fi

if [ ! -d .venv ]; then
  echo "[sidecar] Primera vez: creando entorno virtual con $PY…"
  "$PY" -m venv .venv
  ./.venv/bin/pip install --quiet --upgrade pip
  echo "[sidecar] Instalando dependencias (FastAPI, SQLAlchemy, Anthropic…)"
  ./.venv/bin/pip install --quiet -r requirements.txt
  echo "[sidecar] Listo. Para activar la voz (Whisper):"
  echo "[sidecar]   ./.venv/bin/pip install -r requirements-voz.txt"
fi

exec ./.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8765 --reload
