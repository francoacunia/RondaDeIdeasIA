# Ronda de ideas IA — Guía para empezar 🧠✨

¡Hola! Esta app es como tener un **consejo de inteligencias artificiales** que
debaten tus ideas y, al final, un juez te da un veredicto. Vos escribís una
idea y cuatro IAs la discuten entre ellas para ayudarte a mejorarla.

Para que funcione, hay que hacer una preparación **una sola vez** (unos 15
minutos). Esta guía te lleva de la mano, pasito a pasito. No necesitás saber
nada de programación. 🙌

---

## ¿Qué vas a necesitar?

1. **Tres claves gratuitas** (son como contraseñas que le dan permiso a la app
   para usar cada IA). Las sacás de tres páginas web, gratis.
2. **Un programa llamado Ollama** (es el "juez" y funciona dentro de tu
   computadora, sin internet).

Tranquila que vamos juntas con cada cosa. 💪

---

## Parte 1 · Conseguir las tres claves gratis

Pensá cada clave como la llave de una puerta: la app necesita una llave para
hablar con cada IA. Las tres son **gratis**. Vas a copiar y pegar tres textos
largos. Te recomiendo ir guardándolos en una nota mientras los sacás.

> 💡 **Truco:** abrí una nota (el Bloc de notas / Notas) y andá pegando ahí
> cada clave con su nombre, así no se te pierden. Después las pasás a la app.

### 🟠 Clave 1 — Groq (la IA creativa)

1. Entrá a 👉 **https://console.groq.com/keys**
2. Iniciá sesión con tu cuenta de Google (el botón "Continue with Google").
3. Apretá el botón **"Create API Key"** (Crear clave).
4. Ponele cualquier nombre, por ejemplo `ronda`, y dale **Submit/Create**.
5. Te va a aparecer un texto largo que **empieza con `gsk_`**. Apretá
   **"Copy"** y pegalo en tu nota. ✅

> ⚠️ Importante: esa clave **se muestra una sola vez**. Si cerrás la ventana sin
> copiarla, no pasa nada: borrás esa y creás otra nueva.

### 🔵 Clave 2 — Gemini (la IA lógica, de Google)

1. Entrá a 👉 **https://aistudio.google.com/apikey**
2. Iniciá sesión con tu cuenta de Google.
3. Apretá **"Create API key"** (Crear clave de API).
4. Si te pregunta por un proyecto, elegí el que te ofrece por defecto y aceptá.
5. Te aparece un texto largo que **empieza con `AIza`**. Copialo y pegalo en tu
   nota. ✅

### 🟣 Clave 3 — OpenRouter (las IAs técnica y estratega)

1. Entrá a 👉 **https://openrouter.ai/keys**
2. Iniciá sesión (podés usar Google de nuevo).
3. Apretá **"Create Key"** (Crear clave).
4. Ponele un nombre cualquiera y confirmá.
5. Te aparece un texto largo que **empieza con `sk-or-v1-`**. Copialo y pegalo
   en tu nota. ✅

🎉 **¡Listo! Ya tenés las tres claves.** Deberías tener algo así en tu nota:

```
Groq:        gsk_xxxxxxxxxxxxxxxxxxxx
Gemini:      AIzaxxxxxxxxxxxxxxxxxxxx
OpenRouter:  sk-or-v1-xxxxxxxxxxxxxxx
```

---

## Parte 2 · Instalar Ollama (el juez local)

Ollama es un programa gratis que hace de **juez** del consejo. Funciona dentro
de tu computadora, sin enviar nada a internet.

1. Entrá a 👉 **https://ollama.com/download** y descargá la versión para tu
   sistema (Windows o Mac).
2. Instalalo como cualquier programa (siguiente, siguiente, listo).
3. Abrilo una vez para que quede funcionando (vas a ver su iconito arriba, cerca
   del reloj).
4. Ahora hay que descargarle su "cerebro". Abrí la **Terminal**:
   - **Windows:** apretá la tecla de Windows, escribí `cmd`, Enter.
   - **Mac:** apretá `Cmd + Espacio`, escribí `Terminal`, Enter.
5. Pegá esto y apretá Enter:

   ```
   ollama pull llama3.1
   ```

6. Va a descargar un archivo de unos 5 GB (puede tardar según tu internet).
   Cuando termine y vuelva a aparecer la línea para escribir, ya está. ✅

> Esto se hace **una sola vez**. La próxima vez solo abrís Ollama y listo.

---

## Parte 3 · Poner las claves dentro de la app

¡La parte más fácil! Ya no se tocan archivos ni nada raro.

1. Abrí la app **Ronda de ideas IA** (doble clic en su ícono).
2. Esperá unos 15 segunditos la primera vez: arriba a la derecha vas a ver un
   puntito que pasa de rojo a **verde** ("sidecar activo"). Eso quiere decir
   que el motor encendió.
3. Arriba, apretá el botón **"Soporte"**.
4. Vas a ver la lista de las IAs y, más abajo, una sección **"Tus claves de
   API"** con tres casillas: Groq, Gemini y OpenRouter.
5. Pegá cada clave en su casilla (la que copiaste en tu nota va en la que tiene
   su nombre).
6. Apretá **"Guardar claves"**. Te va a decir "✓ Claves guardadas".
7. Apretá el botón **"Probar conexión de cada IA"**. Si todo está bien, las
   cuatro se ponen con un ✅ verde. 🎉

¡Eso es todo! Ya podés cerrar Soporte y empezar a usar la app.

---

## Parte 4 · Usar la app 🚀

1. En el recuadro de la derecha (abajo), escribí tu idea. Por ejemplo:
   *"Quiero abrir un emprendimiento de velas aromáticas"*.
2. Apretá la flechita para enviar.
3. Mirá cómo las IAs van debatiendo una por una, y al final el **Juez** te da un
   veredicto: aprobada, para iterar (mejorar) o rechazada, con un porcentaje.
4. A la izquierda podés mover los **filtros** (costo, plazo, etc.) para decirle
   al juez qué te importa más.

> 💬 **¿Dudas?** Apretá la **estrella "RI"** arriba a la izquierda. Es un
> asistente que te explica todo lo de la app: qué hace cada IA, para qué sirven
> los filtros, cómo plantear mejor una idea. Preguntale lo que quieras.

---

## Si algo no anda 🛠️

| Lo que ves | Qué hacer |
|---|---|
| Arriba dice **"sidecar apagado"** (puntito rojo) | Esperá 20 segundos. Si sigue, cerrá la app y volvé a abrirla. |
| Una IA aparece en **gris** en Soporte | Le falta la clave: volvé a la Parte 3 y pegala bien. |
| El **Juez (Ollama)** aparece en gris | Abrí el programa Ollama. Si dice que falta el modelo, repetí el `ollama pull llama3.1` de la Parte 2. |
| Dice **"límite de la capa gratuita"** | Las versiones gratis tienen un tope por minuto/día. Esperá un ratito y probá de nuevo. |

---

## Preguntas comunes ❓

**¿Es realmente gratis?** Sí. Las tres claves y Ollama son gratuitos. Las
versiones gratis tienen límites de uso por día, pero alcanzan de sobra para
probar y usar la app normalmente.

**¿Mis ideas se las queda alguien?** Tus claves y tu historial de debates se
guardan **solo en tu computadora**. El juez (Ollama) ni siquiera usa internet.

**¿Tengo que hacer todo esto cada vez?** No. Las claves y Ollama se configuran
**una sola vez**. Después, solo abrís la app y a debatir. 😊

---

¡A disfrutarla! Si te trabás en algún paso, mandale captura a Fran. 💛
