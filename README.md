# Ronda de ideas IA

App de escritorio local donde un **consejo de IAs debate tus ideas** y un juez
local (Ollama, sin nube) emite el veredicto final según tus filtros de costo,
viabilidad y plazo. **Todos los proveedores son gratuitos.**

- **Groq · Creativo** — abre el debate y propone ángulos nuevos (Llama, gratis y ultrarrápido).
- **Gemini · Lógica** — revisa supuestos, contradicciones y riesgos. Analiza imágenes.
- **Técnico (OpenRouter)** — evalúa factibilidad y esfuerzo. Titular: `gpt-oss-120b:free`.
- **Estratega (OpenRouter)** — sintetiza el debate y marca el próximo paso. Titular: `nemotron-3-ultra-550b:free`.
- **Ollama · Juez local** — lee tus filtros y dicta el veredicto (corre en tu Mac).

Los endpoints gratuitos de OpenRouter se saturan en horas pico, así que el
Técnico y el Estratega tienen **cadena de suplentes**: si el titular no
responde, prueban los alternativos en orden (configurables en `sidecar/.env`).
La etiqueta de cada mensaje muestra qué modelo respondió de verdad.

Si un agente incluye un diagrama **Mermaid**, se renderiza solo en la tarjeta
de **Recursos**. Cada sesión y cada mensaje quedan guardados en **SQLite**
(`sidecar/datos/ronda.db`).

## Stack

| Capa | Tecnología |
|---|---|
| Escritorio | Tauri v2 |
| Interfaz | React + TypeScript + Tailwind CSS v4 (Bento Grid, modo oscuro) |
| Orquestador | Python (FastAPI) como proceso secundario (sidecar) |
| Voz | OpenAI Whisper local (opcional) |
| Persistencia | SQLite + SQLAlchemy |

## Requisitos (una sola vez)

1. **Node.js** — ya lo tenés ✓
2. **Rust** (lo necesita Tauri):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   Cerrá y reabrí la terminal al terminar.
3. **Python 3.10 o más nuevo** (recomendado; tu Mac trae 3.9 que alcanza para
   todo menos la voz):
   ```bash
   brew install python@3.12
   ```
4. **Ollama con un modelo descargado** (el Juez local):
   ```bash
   ollama pull llama3.1
   ```
5. **ffmpeg** (para la voz) — ya lo tenés ✓

## Puesta en marcha

```bash
cd ~/RondaDeIdeasIA
npm install                          # dependencias de la interfaz

cp sidecar/.env.example sidecar/.env # y completá tus claves de API
```

Abrí `sidecar/.env` y pegá las claves. **Las tres son gratuitas**:

| Clave | Dónde crearla |
|---|---|
| `GROQ_API_KEY` | <https://console.groq.com/keys> |
| `GEMINI_API_KEY` | <https://aistudio.google.com/apikey> |
| `OPENROUTER_API_KEY` | <https://openrouter.ai/keys> |

**No hace falta tenerlas todas**: los agentes sin clave aparecen en el debate
con un aviso y el resto sigue funcionando. El Juez (Ollama) y Whisper son
100 % locales, sin clave.

### Correr la app de escritorio

```bash
npm run tauri dev
```

Esto compila la ventana nativa **y levanta solos** la interfaz (Vite) y el
sidecar de Python al mismo tiempo (la primera vez, el sidecar crea su entorno
e instala sus dependencias automáticamente; tardará un par de minutos).

> La primera compilación de Rust tarda varios minutos. Las siguientes son rápidas.

### Correr solo en el navegador (sin Rust)

Mientras no tengas Rust instalado podés probar todo igual:

```bash
npm run dev:all
```

y abrí <http://localhost:5173>.

### Activar la voz (Whisper local)

```bash
sidecar/.venv/bin/pip install -r sidecar/requirements-voz.txt
```

Es opcional y pesado (instala PyTorch). Necesita Python 3.10+ y ffmpeg.
Después, el botón del micrófono graba, transcribe localmente y pega el texto
en la barra de entrada.

## Estructura

```
RondaDeIdeasIA/
├── src/                    # Interfaz React (Bento Grid)
│   ├── components/         # Tarjetas: pipeline, filtros, recursos, consejo
│   ├── lib/                # Tipos y cliente del sidecar (SSE)
│   └── store.ts            # Estado global (zustand)
├── src-tauri/              # App nativa (Tauri v2, Rust)
├── sidecar/                # Orquestador Python (FastAPI)
│   ├── main.py             # Endpoints (debate SSE, voz, visión, sesiones)
│   ├── orchestrator.py     # Pipeline multi-agente + veredicto del Juez
│   ├── providers.py        # Groq / Gemini / OpenRouter (DeepSeek) / Ollama
│   ├── database.py         # SQLite + SQLAlchemy
│   ├── transcription.py    # Whisper local
│   └── mermaid_utils.py    # Detección de diagramas Mermaid
└── scripts/                # Generador del ícono
```

## App de escritorio (doble clic, sin terminal)

```bash
bash scripts/empaquetar.sh
```

Ese comando congela el sidecar Python en un binario (PyInstaller), compila
la app nativa con el binario adentro y deja **"Ronda de ideas IA.app" en tu
Escritorio**. La abrís con doble clic y todo arranca solo: la ventana, el
orquestador e incluso Ollama si estaba cerrado.

La app empaquetada guarda sus datos y claves en
`~/Library/Application Support/RondaDeIdeasIA/` (`ronda.db` y `.env`).
Si cambiás una clave, editá ese `.env` y reabrí la app.

Lo único que la app necesita tener instalado aparte es **Ollama** (el Juez
local) y conexión a internet para los 4 agentes de la nube.

### Cargar las claves desde la propia app

No hace falta tocar archivos: abrí **Soporte** (arriba) y pegá tus claves
gratuitas de Groq, Gemini y OpenRouter. Ahí mismo ves el estado de cada IA
y un botón para probar la conexión de todas. Esto hace que la app sea
**compartible**: quien la reciba pone sus propias claves sin editar nada.

### Asistente RI

El botón **RI** (la estrella, arriba a la izquierda) abre un asistente que
responde dudas sobre la app: qué hace cada IA, para qué sirven los filtros,
cómo plantear una idea, etc.

## Versión para Windows

El código ya está preparado para Windows, pero **el instalador de Windows
hay que generarlo en Windows** (un binario hecho en Mac no corre en Windows).
Dos caminos:

1. **GitHub Actions (recomendado, no necesitás una PC con Windows):** subí el
   repo a GitHub y entrá a la pestaña *Actions* → *Compilar app* → *Run
   workflow*. A los pocos minutos vas a poder descargar el instalador `.exe`
   desde *Artifacts*. El workflow ya está en `.github/workflows/build.yml`.
2. **En una PC con Windows:** instalá Node, Python, Rust y
   [los requisitos de Tauri](https://tauri.app/start/prerequisites/), y corré
   los mismos pasos que `scripts/empaquetar.sh` (PyInstaller + `npm run tauri
   build`). Genera un `.msi`/`.exe`.

En ambos casos el instalador **no lleva claves adentro**: quien lo use carga
las suyas desde la pantalla de Soporte. También necesita instalar **Ollama
para Windows** y descargar el modelo (`ollama pull llama3.1`).

## Problemas comunes

| Síntoma | Solución |
|---|---|
| "sidecar apagado" arriba a la derecha | Corré `npm run dev:all` (o esperá: la primera vez instala dependencias) |
| El Juez dice que no conecta con Ollama | Abrí la app de Ollama o corré `ollama serve` |
| El Juez dice que falta el modelo | `ollama pull llama3.1` |
| Un agente aparece con ⚠️ "no está configurado" | Falta su clave en `sidecar/.env` |
| ⚠️ "límite de la capa gratuita alcanzado" | Los planes gratis tienen tope por minuto; esperá un toque y reintentá |
| OpenRouter rechaza el modelo `:free` | Habilitá la opción en <https://openrouter.ai/settings/privacy> o elegí otro modelo gratis en <https://openrouter.ai/models> |
| El micrófono devuelve error 501 | Falta instalar `requirements-voz.txt` (ver arriba) |
| Rust falla con `error[E0119]` mencionando `time` | En `src-tauri/` corré: `cargo update time --precise 0.3.47` (la 0.3.48 rompe `cookie` y `tauri-utils`) |
| "Port 5173 is already in use" al iniciar | Hay otra instancia corriendo; cerrala o reiniciá la terminal |
