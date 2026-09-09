import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 receipt images
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Lazy Google GenAI initialization
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Allowed models from official @google/genai guidelines
const ALLOWED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.1-pro-preview",
];

function resolveModel(requestedModel?: any): string {
  if (typeof requestedModel === "string" && ALLOWED_MODELS.includes(requestedModel)) {
    return requestedModel;
  }
  return "gemini-3.8-flash";
}

/**
 * Clean markdown formatting (e.g. ```json ... ```) and parse JSON safely.
 */
function cleanAndParseJson(rawText: string | undefined): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // If strict parse failed, attempt to find first '{' and last '}'
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
    throw err;
  }
}

/**
 * Checks if an error from Gemini API is transient (503 high demand, 429 rate limit, UNAVAILABLE).
 */
function isTransientError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code;
  const msg = `${err.message || ""} ${typeof err === "string" ? err : ""} ${JSON.stringify(err)}`;
  return (
    status === 503 ||
    status === 429 ||
    status === "UNAVAILABLE" ||
    status === "RESOURCE_EXHAUSTED" ||
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("high demand") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("try again later")
  );
}

/**
 * Executes a Gemini request with automatic exponential backoff retry on transient 503/429 errors,
 * and cascades to alternative valid models (gemini-3.1-flash-lite, gemini-flash-latest) if the preferred model is overloaded.
 */
async function executeWithRetryAndFallback<T>(
  generateFn: (model: string) => Promise<T>,
  preferredModel: string = "gemini-3.8-flash"
): Promise<{ result: T; modelUsed: string; fallbackUsed: boolean }> {
  // Ordered sequence of fallback models that share high throughput and vision/JSON support
  const candidateModels = [
    preferredModel,
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: any = null;

  for (let modelIdx = 0; modelIdx < candidateModels.length; modelIdx++) {
    const currentModel = candidateModels[modelIdx];
    const isPrimary = currentModel === preferredModel;
    const maxAttempts = isPrimary ? 2 : 1; // 2 attempts on preferred model, 1 attempt on fallback

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await generateFn(currentModel);
        if (!isPrimary) {
          console.info(`[Gemini API] Fallback model '${currentModel}' succeeded!`);
        }
        return {
          result,
          modelUsed: currentModel,
          fallbackUsed: !isPrimary,
        };
      } catch (err: any) {
        lastError = err;
        const transient = isTransientError(err);
        console.warn(
          `[Gemini API] Warning on model '${currentModel}' (attempt ${attempt}/${maxAttempts}): ${err?.message || err}`
        );

        // If non-transient, don't retry same model
        if (!transient) {
          break;
        }

        // Exponential backoff if more attempts on current model
        if (attempt < maxAttempts) {
          const delay = attempt * 1200 + Math.random() * 400;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError;
}

// Endpoint to list available models
app.get("/api/gemini/models", (req, res) => {
  res.json({
    success: true,
    defaultModel: "gemini-3.8-flash",
    models: ALLOWED_MODELS,
  });
});

// 1. Process receipt image (OCR + categorized transaction extraction)
app.post("/api/gemini/parse-receipt", async (req, res) => {
  try {
    const { imageBase64, mimeType, model: requestedModel } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 parameter." });
    }

    const ai = getGeminiClient();
    const modelToUse = resolveModel(requestedModel);
    const prompt = `Analiza este recibo o comprobante de pago con tu rol de experto en finanzas personales.
Extrae con la máxima precisión posible:
- fecha (formato YYYY-MM-DD, si el año no es claro usa el año actual)
- concepto (descripción clara y concisa de lo comprado o establecimiento)
- cantidad (número flotante positivo del importe total pagado)
- categoría sugerida: una de ['Alimentos & Supermercado', 'Transporte & Movilidad', 'Entretenimiento & Ocio', 'Servicios & Hogar', 'Salud & Bienestar', 'Educación & Libros', 'Ropa & Compras', 'Restaurantes & Cafeterías', 'Otros']
- comercio (nombre de la tienda, restaurante o proveedor)
- desglose (lista breve de los artículos principales si son visibles)
- notas (comentarios sobre si incluye propina, impuestos o descuentos)`;

    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");

    const { result: response, modelUsed, fallbackUsed } = await executeWithRetryAndFallback(
      async (model) => {
        return await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || "image/jpeg",
                },
              },
              { text: prompt },
            ],
          },
          config: {
            responseMimeType: "application/json",
            systemInstruction:
              "Eres un analizador financiero de recibos de alta precisión. Devuelve únicamente un objeto JSON con las claves: fecha, concepto, cantidad, categoria, comercio, desglose (array de strings), notas.",
          },
        });
      },
      modelToUse
    );

    const parsed = cleanAndParseJson(response.text);
    return res.json({
      success: true,
      modelUsed,
      fallbackUsed,
      data: parsed,
    });
  } catch (error: any) {
    console.error("Error processing receipt:", error);
    const isOverload = isTransientError(error);
    return res.status(isOverload ? 503 : 500).json({
      success: false,
      error: isOverload
        ? "El modelo de IA está experimentando alta demanda temporal."
        : "Error al procesar el recibo con IA",
      message: isOverload
        ? "Los servidores de IA están saturados temporalmente. Por favor intenta de nuevo en unos momentos."
        : error?.message || "Error desconocido",
      isTransient: isOverload,
    });
  }
});

// 2. Process verbal or natural language expense statement
app.post("/api/gemini/parse-verbal", async (req, res) => {
  try {
    const { text, currentDate, model: requestedModel } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "El texto del gasto es requerido." });
    }

    const ai = getGeminiClient();
    const modelToUse = resolveModel(requestedModel);
    const systemInstruction = `Eres un agente experto en finanzas personales y behavioral economics.
Tu tarea es interpretar gastos reportados en lenguaje natural o verbal por el usuario (ej. "Ayer gasté 450 en el super", "Me tomé un café de 65 pesos en Starbucks", "Pagué el gimnasio").
Instrucción clave:
- Extrae: fecha (YYYY-MM-DD considerando la fecha actual provista: ${currentDate || new Date().toISOString().split("T")[0]}), concepto, cantidad (número), categoría (debe ser una de: 'Alimentos & Supermercado', 'Transporte & Movilidad', 'Entretenimiento & Ocio', 'Servicios & Hogar', 'Salud & Bienestar', 'Educación & Libros', 'Ropa & Compras', 'Restaurantes & Cafeterías', 'Otros'), lugar o comercio.
- Si faltan detalles esenciales (como fecha, monto o lugar/concepto específico), marca "isComplete": false y formula una pregunta amable y cercana ("missingDetailsPrompt") solicitando los detalles faltantes (ej: "¡Entendido! ¿Cuánto pagaste exactamente y en qué fecha fue?").
- Si los datos son suficientes o fácilmente deducibles, marca "isComplete": true y "missingDetailsPrompt": null.`;

    const { result: response, modelUsed, fallbackUsed } = await executeWithRetryAndFallback(
      async (model) => {
        return await ai.models.generateContent({
          model,
          contents: text,
          config: {
            responseMimeType: "application/json",
            systemInstruction,
          },
        });
      },
      modelToUse
    );

    const parsed = cleanAndParseJson(response.text);
    return res.json({
      success: true,
      modelUsed,
      fallbackUsed,
      data: parsed,
    });
  } catch (error: any) {
    console.error("Error parsing verbal expense:", error);
    const isOverload = isTransientError(error);
    return res.status(isOverload ? 503 : 500).json({
      success: false,
      error: isOverload
        ? "El modelo de IA está experimentando alta demanda temporal."
        : "Error al interpretar el gasto verbal",
      message: isOverload
        ? "Los servidores de IA están ocupados temporalmente. Por favor intenta de nuevo en unos momentos."
        : error?.message || "Error desconocido",
      isTransient: isOverload,
    });
  }
});

// 3. Deep Behavioral Economics & Statistical Financial Analysis
app.post("/api/gemini/analyze-finances", async (req, res) => {
  try {
    const { currentMonthSummary, categoryStats, anomalies, previousMonthComparison, samplePatterns, model: requestedModel } = req.body;

    const ai = getGeminiClient();
    const modelToUse = resolveModel(requestedModel);
    const systemPrompt = `Eres un agente experto en análisis financiero personal y behavioral economics.
Tu rol es ayudar al usuario a entender y optimizar sus patrones de gasto combinando rigor estadístico con principios de economía conductual (sesgos cognitivos, contabilidad mental, efecto dotación, gratificación instantánea, fricciones de decisión y nudges de Thaler & Sunstein).

TONO: Profesional pero cercano, empático, sin juzgar. Usa datos y métricas para motivar cambios.

FORMATO DE RESPUESTA OBLIGATORIO (debe devolver un JSON estricto con las siguientes claves):
{
  "resumenEjecutivo": [
    "Punto clave 1 con métrica clara",
    "Punto clave 2 con contexto conductual",
    "Punto clave 3 con impacto financiero",
    "Punto clave 4 resumen general del periodo"
  ],
  "tablaCategorias": [
    {
      "categoria": "Nombre",
      "totalGastado": 0,
      "porcentajePresupuesto": 0,
      "tendencia": "↑", // "↑" subida, "↓" bajada, "=" estable
      "comentarioConductual": "Observación breve con sesgo detectado si aplica"
    }
  ],
  "topAnomalias": [
    {
      "concepto": "Concepto o comercio",
      "monto": 0,
      "categoria": "Categoría",
      "fecha": "YYYY-MM-DD",
      "desviacionesEstandar": 2.4, // Z-Score
      "explicacion": "Explicación estadística (comparado con la media de la categoría) y el factor conductual o contextual."
    }
  ],
  "recomendacionesAhorro": [
    {
      "titulo": "Nombre de la estrategia de behavioral economics",
      "sesgoAbordado": "ej. Sesgo del Presente / Fricción de Microgastos / Contabilidad Mental",
      "accionConcreta": "Acción específica y medible para aplicar hoy mismo",
      "contextoEstadistico": "Contexto numérico que justifica esta acción (ej. 'Representa el 18% del gasto variable semanal, ahorrando $X al mes')"
    }
  ],
  "comparativaMesAnterior": {
    "cambioTotalPorcentual": 0, // ej. +12.5 o -5.2
    "analisisComparativo": "Texto analítico detallando variaciones clave entre meses",
    "areasDeMejora": ["área 1", "área 2"]
  },
  "patronesProactivos": [
    "Veo que tu gasto en cafeterías sube 40% los viernes...",
    "Patrón conductual 2 detectado con datos"
  ]
}

INSTRUCCIONES ESPECIALES:
- Incluye siempre el contexto estadístico detrás de tus recomendaciones (media, desviación estándar, porcentajes).
- Proactivamente sugiere patrones identificados en los hábitos de consumo.
- No uses clichés ni sermones; usa el poder de los 'nudges' y las decisiones automáticas.`;

    const userContent = JSON.stringify({
      currentMonthSummary,
      categoryStats,
      anomalies,
      previousMonthComparison,
      samplePatterns,
    });

    const { result: response, modelUsed, fallbackUsed } = await executeWithRetryAndFallback(
      async (model) => {
        return await ai.models.generateContent({
          model,
          contents: userContent,
          config: {
            responseMimeType: "application/json",
            systemInstruction: systemPrompt,
          },
        });
      },
      modelToUse
    );

    const result = cleanAndParseJson(response.text);
    return res.json({
      success: true,
      modelUsed,
      fallbackUsed,
      data: result,
    });
  } catch (error: any) {
    console.error("Error analyzing finances:", error);
    const isOverload = isTransientError(error);
    return res.status(isOverload ? 503 : 500).json({
      success: false,
      error: isOverload
        ? "El modelo de IA está experimentando alta demanda temporal."
        : "Error al generar análisis con IA",
      message: isOverload
        ? "Los servidores de IA están saturados temporalmente. Por favor intenta de nuevo en unos momentos."
        : error?.message || "Error desconocido",
      isTransient: isOverload,
    });
  }
});

// 4. Conversational Financial & Behavioral Advisor Chat
app.post("/api/gemini/chat-advisor", async (req, res) => {
  try {
    const { message, history, financialContext, model: requestedModel } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Mensaje requerido." });
    }

    const ai = getGeminiClient();
    const modelToUse = resolveModel(requestedModel);
    const systemInstruction = `Eres un asesor financiero de élite especializado en economía conductual (Behavioral Economics).
Tu misión es guiar al usuario a comprender por qué gasta como gasta y cómo diseñar su entorno para ahorrar sin sufrir privaciones artificiales.
Contexto financiero del usuario:
${JSON.stringify(financialContext || {}, null, 2)}

Reglas de respuesta:
- Tono profesional pero cálido, cercano y libre de juicios.
- Si el usuario menciona un gasto verbal incompleto, solicita cortésmente los datos clave (fecha, monto, lugar).
- Utiliza conceptos de behavioral economics aplicados (fricción de gasto, arquitectura de decisiones, pre-compromiso, contabilidad mental).
- Respalda tus respuestas con los datos de las transacciones del usuario cuando sea relevante.
- Sé claro, conciso y accionable.`;

    const conversationParts: any[] = [];
    if (Array.isArray(history)) {
      history.slice(-10).forEach((item: any) => {
        conversationParts.push({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.content }],
        });
      });
    }

    conversationParts.push({
      role: "user",
      parts: [{ text: message }],
    });

    const { result: response, modelUsed, fallbackUsed } = await executeWithRetryAndFallback(
      async (model) => {
        return await ai.models.generateContent({
          model,
          contents: conversationParts,
          config: {
            systemInstruction,
          },
        });
      },
      modelToUse
    );

    return res.json({
      success: true,
      modelUsed,
      fallbackUsed,
      reply: response.text || "No fue posible generar una respuesta en este momento.",
    });
  } catch (error: any) {
    console.error("Error in advisor chat:", error);
    const isOverload = isTransientError(error);
    return res.status(isOverload ? 503 : 500).json({
      success: false,
      error: isOverload
        ? "El modelo de IA está experimentando alta demanda temporal."
        : "Error en el chat de asesoría",
      message: isOverload
        ? "Los servidores de IA están ocupados temporalmente. Por favor intenta de nuevo en unos momentos."
        : error?.message || "Error desconocido",
      isTransient: isOverload,
    });
  }
});

// 5. Goal-Specific Behavioral Savings Advice
app.post("/api/gemini/savings-goal-advice", async (req, res) => {
  try {
    const { goal, financialContext, model: requestedModel } = req.body;
    if (!goal) {
      return res.status(400).json({ error: "Datos de meta requeridos." });
    }

    const ai = getGeminiClient();
    const modelToUse = resolveModel(requestedModel);
    const systemInstruction = `Eres un asesor de élite en Behavioral Economics y finanzas personales.
Tu objetivo es analizar una meta de ahorro concreta de un usuario y generar consejos altamente personalizados, prácticos y matemáticamente fundamentados para optimizar y acelerar su ahorro, basándote en sus patrones de gasto reales (como picos de fin de semana, anomalías >2σ, microgastos o categorías con sobregasto).

Reglas de respuesta:
- Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "feasibilityScore": "Alta" | "Media" | "Desafiante",
  "feasibilityAnalysis": "Evaluación breve de viabilidad comparando la cuota requerida con los márgenes de gasto discrecional del usuario.",
  "motivationalNudge": "Mensaje motivador breve fundamentado en economía conductual (ej. pre-compromiso o aversión a la pérdida constructiva).",
  "customAdvice": [
    {
      "focusCategory": "Nombre de categoría real del usuario",
      "monthlySavingPotential": 1200,
      "tip": "Acción específica con arquitectura de decisiones (ej. regla de 48h, cuenta bloqueada, sustitución de hábitos)",
      "behavioralBias": "Sesgo cognitivo abordado (ej. Sesgo del Presente, Contabilidad Mental, The Latte Factor)",
      "impactWeeksAccelerated": 4
    }
  ]
}
- Proporciona entre 3 y 4 consejos concretos y realistas en customAdvice.
- No uses sermones genéricos como 'ahorra más'; utiliza nudges basados en la data proporcionada.`;

    const userPayload = JSON.stringify({
      goal,
      financialContext: financialContext || {},
    });

    const { result: response, modelUsed, fallbackUsed } = await executeWithRetryAndFallback(
      async (model) => {
        return await ai.models.generateContent({
          model,
          contents: userPayload,
          config: {
            responseMimeType: "application/json",
            systemInstruction,
          },
        });
      },
      modelToUse
    );

    const parsed = cleanAndParseJson(response.text);
    return res.json({
      success: true,
      modelUsed,
      fallbackUsed,
      data: parsed,
    });
  } catch (error: any) {
    console.error("Error in savings goal advice:", error);
    const isOverload = isTransientError(error);
    return res.status(isOverload ? 503 : 500).json({
      success: false,
      error: isOverload
        ? "El modelo de IA está experimentando alta demanda temporal."
        : "Error al generar consejos para la meta de ahorro",
      message: isOverload
        ? "Los servidores de IA están ocupados temporalmente. Por favor intenta de nuevo en unos momentos."
        : error?.message || "Error desconocido",
      isTransient: isOverload,
    });
  }
});

// Integrate Vite middleware in development or static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
