#!/usr/bin/env bash
# Empaqueta TODO en una app de doble clic:
#   1. Congela el sidecar Python en un binario (PyInstaller)
#   2. Compila la app nativa (Tauri) con el binario adentro
#   3. Copia la app al Escritorio
#
# Uso:  bash scripts/empaquetar.sh
set -e
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"

echo "── 1/3 Congelando el sidecar Python…"
cd sidecar
if [ ! -d .venv ]; then
  bash run.sh & sleep 5; kill %1 2>/dev/null || true   # crea el venv si no existe
fi
./.venv/bin/pip show pyinstaller >/dev/null 2>&1 || ./.venv/bin/pip install --quiet pyinstaller
./.venv/bin/pyinstaller --onefile --name ronda-sidecar --clean --noconfirm lanzador.py
cd ..

TRIPLE=$(rustc -vV | grep host | cut -d' ' -f2)
mkdir -p src-tauri/binaries
cp sidecar/dist/ronda-sidecar "src-tauri/binaries/ronda-sidecar-$TRIPLE"

echo "── 2/3 Compilando la app nativa (esto tarda unos minutos)…"
npm run tauri build

echo "── 3/3 Copiando al Escritorio…"
APP="src-tauri/target/release/bundle/macos/Ronda de ideas IA.app"
rm -rf "$HOME/Desktop/Ronda de ideas IA.app"
cp -R "$APP" "$HOME/Desktop/"

# Las claves viven en ~/Library/Application Support/RondaDeIdeasIA/.env
SOPORTE="$HOME/Library/Application Support/RondaDeIdeasIA"
mkdir -p "$SOPORTE"
[ -f "$SOPORTE/.env" ] || cp sidecar/.env "$SOPORTE/.env" 2>/dev/null || true

echo "✔ Listo: la app quedó en el Escritorio (doble clic para abrirla)."
