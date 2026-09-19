# Agente de Análisis Financiero Personal

Aplicación full-stack de finanzas personales y economía conductual (*behavioral economics*) impulsada por la API de Google Gemini y TypeScript/React. Diseñada para analizar patrones de gasto, detectar anomalías estadísticas mediante desviación estándar y puntajes Z, escanear recibos físicos con visión artificial, registrar transacciones por voz y guiar metas de ahorro.

---

## 🚀 Características Principales

1. **Dashboard Ejecutivo Inteligente**:
   - Diagnóstico financiero integral impulsado por modelos Gemini (con arquitectura de tolerancia a fallos y fallback automático).
   - Desglose por categorías, distribución de presupuesto y recomendaciones basadas en finanzas del comportamiento.

2. **Detección Estadística de Anomalías**:
   - Cálculo en tiempo real de media, varianza, desviación estándar ($\sigma$) y puntuación Z por categoría.
   - Detección automática de gastos atípicos ($Z > 2.0$) con explicaciones contextuales de la IA.

3. **Escaneo de Recibos con Visión Artificial**:
   - Carga y análisis OCR multimodal de facturas y tickets de compra.
   - Extracción automatizada de comercio, fecha, monto, desglose de partidas y categoría.

4. **Registro de Gastos por Voz / Texto**:
   - Interpretación de lenguaje natural con soporte de dictado por micrófono (Web Speech API).
   - Detección de datos faltantes con diálogo conversacional asistido por IA.

5. **Gestión y Exportación de Transacciones**:
   - Búsqueda en tiempo real, filtros por categoría, ordenamiento y filtro exclusivo de anomalías.
   - **Exportación a CSV** con compatibilidad universal (BOM UTF-8 para Excel, Numbers y Google Sheets), permitiendo exportar tanto transacciones filtradas como el historial completo.

6. **Metas de Ahorro y Asesoría**:
   - Seguimiento visual de progreso de objetivos de ahorro.
   - Consejos personalizados con IA según la capacidad de ahorro y horizonte temporal.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Lucide React, Framer Motion / Motion.
- **Backend / Servidor**: Python, FastAPI, Uvicorn (ASGI). El frontend corre como servidor de desarrollo Vite independiente y hace proxy de `/api` hacia FastAPI; en producción, FastAPI sirve también el build estático del frontend.
- **Inteligencia Artificial**: SDK oficial `google-genai` (Google Gen AI SDK para Python).
  - Modelos soportados: `gemini-3.8-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-3.1-pro-preview`.
  - Mecanismo de reintentos con retroceso exponencial (*exponential backoff*) y conmutación por error (*fallback*) ante picos de demanda (HTTP 503 / 429), implementado en [server/gemini.py](server/gemini.py).

---

## 📋 Requisitos Previos

- Node.js 18 o superior (frontend).
- Python 3.10 o superior + [uv](https://docs.astral.sh/uv/) (backend).
- npm o yarn.
- Una API Key de Google Gemini (obtenible en [Google AI Studio](https://aistudio.google.com/)).

---

## ⚙️ Instalación y Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd <NOMBRE_DEL_DIRECTORIO>
   ```

2. **Instalar dependencias del frontend:**
   ```bash
   npm install
   ```

3. **Instalar dependencias del backend:**
   ```bash
   uv sync
   ```
   Esto crea el entorno virtual en `.venv/` e instala las dependencias fijadas en `uv.lock`. No necesitas activar el entorno manualmente: los scripts de `npm` (y los comandos de este README) usan `uv run`, que lo resuelve automáticamente.

4. **Variables de entorno:**
   Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   Configura tu clave de API:
   ```env
   GEMINI_API_KEY="tu_api_key_de_gemini_aqui"
   ```

5. **Iniciar en modo desarrollo** (levanta Vite en `:3000` y FastAPI en `:8000` a la vez):
   ```bash
   npm run dev
   ```
   La aplicación se abrirá en `http://localhost:3000`.

6. **Construir para producción:**
   ```bash
   npm run build
   npm start
   ```
   `npm start` levanta únicamente FastAPI en el puerto 3000, sirviendo tanto la API como el build estático (`dist/`).

---

## 🐳 Docker

La imagen se construye en dos etapas: Node compila el frontend (`vite build`) y una imagen Python liviana (`python:3.12-slim` + `uv`) sirve la API y el build estático desde un único proceso `uvicorn` en el puerto 3000.

1. **Construir la imagen:**
   ```bash
   docker build -t agente-financiero .
   ```

2. **Ejecutarla localmente** (pasando la API key como variable de entorno, nunca dentro de la imagen):
   ```bash
   docker run -d --name agente-financiero -p 3000:3000 \
     -e GEMINI_API_KEY="tu_api_key_de_gemini_aqui" \
     agente-financiero
   ```
   Verifica que esté arriba con `curl http://localhost:3000/api/health`.

3. **Publicar en un registro** (Docker Hub, GHCR, ECR, etc.) cuando estés listo:
   ```bash
   docker tag agente-financiero <tu-registro>/agente-financiero:<tag>
   docker push <tu-registro>/agente-financiero:<tag>
   ```
   Ajusta `<tu-registro>` y `<tag>` a donde vayas a alojarlo (por ejemplo `docker.io/tuusuario/agente-financiero:latest` o `ghcr.io/tuusuario/agente-financiero:latest`); antes de hacer push necesitas `docker login` en ese registro.

La imagen incluye un `HEALTHCHECK` sobre `/api/health` y no contiene `node_modules` ni el entorno virtual del build (ver `.dockerignore`) — el runtime final solo lleva el código de `server/`, el build de `dist/` y las dependencias Python resueltas por `uv`.

---

## 📄 Licencia

Distribuido bajo la Licencia MIT.
