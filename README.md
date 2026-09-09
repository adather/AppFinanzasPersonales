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

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion / Motion.
- **Backend / Servidor**: Node.js, Express, Vite en modo middleware.
- **Inteligencia Artificial**: SDK oficial `@google/genai` (Google Gen AI SDK).
  - Modelos soportados: `gemini-3.8-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-2.5-pro`.
  - Mecanismo de reintentos con retroceso exponencial (*exponential backoff*) y conmutación por error (*fallback*) ante picos de demanda (HTTP 503 / 429).

---

## 📋 Requisitos Previos

- Node.js 18 o superior.
- npm o yarn.
- Una API Key de Google Gemini (obtenible en [Google AI Studio](https://aistudio.google.com/)).

---

## ⚙️ Instalación y Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd <NOMBRE_DEL_DIRECTORIO>
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de entorno:**
   Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   Configura tu clave de API:
   ```env
   GEMINI_API_KEY="tu_api_key_de_gemini_aqui"
   ```

4. **Iniciar en modo desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación se abrirá en `http://localhost:3000`.

5. **Construir para producción:**
   ```bash
   npm run build
   npm start
   ```

---

## 📄 Licencia

Distribuido bajo la Licencia MIT.
