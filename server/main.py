"""FastAPI backend: Gemini-powered endpoints + static serving in production.

Replaces the previous Express/server.ts backend. In development, the
frontend runs as its own Vite dev server which proxies /api to this
service (see vite.config.ts). In production, this app also serves the
built frontend (dist/) directly.
"""
from __future__ import annotations

import base64
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from google.genai import types

from server.gemini import (
    ALLOWED_MODELS,
    DEFAULT_MODEL,
    clean_and_parse_json,
    execute_with_retry_and_fallback,
    get_client,
    is_transient_error,
    resolve_model,
)
from server.prompts import (
    advisor_system_instruction,
    analysis_system_prompt,
    analysis_user_content,
    receipt_prompt,
    receipt_system_instruction,
    savings_goal_system_instruction,
    savings_goal_user_content,
    verbal_system_instruction,
)
from server.schemas import (
    AnalyzeFinancesRequest,
    ChatAdvisorRequest,
    ParseReceiptRequest,
    ParseVerbalRequest,
    SavingsGoalAdviceRequest,
)

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT_DIR / "dist"
DATA_URL_PREFIX_RE = re.compile(r"^data:[a-zA-Z0-9/+-]+;base64,")

app = FastAPI(title="Agente de Análisis Financiero Personal")


def _ai_error_response(error: Exception, fallback_message: str) -> JSONResponse:
    is_overload = is_transient_error(error)
    return JSONResponse(
        status_code=503 if is_overload else 500,
        content={
            "success": False,
            "error": (
                "El modelo de IA está experimentando alta demanda temporal."
                if is_overload
                else fallback_message
            ),
            "message": (
                "Los servidores de IA están saturados temporalmente. Por favor "
                "intenta de nuevo en unos momentos."
                if is_overload
                else (str(error) or "Error desconocido")
            ),
            "isTransient": is_overload,
        },
    )


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/gemini/models")
async def list_models() -> dict[str, Any]:
    return {"success": True, "defaultModel": DEFAULT_MODEL, "models": ALLOWED_MODELS}


# 1. Process receipt image (OCR + categorized transaction extraction)
@app.post("/api/gemini/parse-receipt")
async def parse_receipt(body: ParseReceiptRequest) -> dict[str, Any]:
    try:
        client = get_client()
        model_to_use = resolve_model(body.model)
        clean_base64 = DATA_URL_PREFIX_RE.sub("", body.imageBase64)
        try:
            image_bytes = base64.b64decode(clean_base64, validate=True)
        except Exception as decode_err:
            raise HTTPException(status_code=400, detail="imageBase64 inválido.") from decode_err

        async def generate(model: str):
            return await client.aio.models.generate_content(
                model=model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=body.mimeType or "image/jpeg"),
                    receipt_prompt(),
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    system_instruction=receipt_system_instruction(),
                ),
            )

        result = await execute_with_retry_and_fallback(generate, model_to_use)
        parsed = clean_and_parse_json(result.response.text)
        return {
            "success": True,
            "modelUsed": result.model_used,
            "fallbackUsed": result.fallback_used,
            "data": parsed,
        }
    except HTTPException:
        raise
    except Exception as error:  # noqa: BLE001
        print(f"Error processing receipt: {error}")
        return _ai_error_response(error, "Error al procesar el recibo con IA")


# 2. Process verbal or natural language expense statement
@app.post("/api/gemini/parse-verbal")
async def parse_verbal(body: ParseVerbalRequest) -> dict[str, Any]:
    try:
        client = get_client()
        model_to_use = resolve_model(body.model)
        system_instruction = verbal_system_instruction(body.currentDate)

        async def generate(model: str):
            return await client.aio.models.generate_content(
                model=model,
                contents=body.text,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    system_instruction=system_instruction,
                ),
            )

        result = await execute_with_retry_and_fallback(generate, model_to_use)
        parsed = clean_and_parse_json(result.response.text)
        return {
            "success": True,
            "modelUsed": result.model_used,
            "fallbackUsed": result.fallback_used,
            "data": parsed,
        }
    except Exception as error:  # noqa: BLE001
        print(f"Error parsing verbal expense: {error}")
        return _ai_error_response(error, "Error al interpretar el gasto verbal")


# 3. Deep Behavioral Economics & Statistical Financial Analysis
@app.post("/api/gemini/analyze-finances")
async def analyze_finances(body: AnalyzeFinancesRequest) -> dict[str, Any]:
    try:
        client = get_client()
        model_to_use = resolve_model(body.model)
        user_content = analysis_user_content(
            body.currentMonthSummary,
            body.categoryStats,
            body.anomalies,
            body.previousMonthComparison,
            body.samplePatterns,
        )

        async def generate(model: str):
            return await client.aio.models.generate_content(
                model=model,
                contents=user_content,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    system_instruction=analysis_system_prompt(),
                ),
            )

        result = await execute_with_retry_and_fallback(generate, model_to_use)
        parsed = clean_and_parse_json(result.response.text)
        return {
            "success": True,
            "modelUsed": result.model_used,
            "fallbackUsed": result.fallback_used,
            "data": parsed,
        }
    except Exception as error:  # noqa: BLE001
        print(f"Error analyzing finances: {error}")
        return _ai_error_response(error, "Error al generar análisis con IA")


# 4. Conversational Financial & Behavioral Advisor Chat
@app.post("/api/gemini/chat-advisor")
async def chat_advisor(body: ChatAdvisorRequest) -> dict[str, Any]:
    try:
        client = get_client()
        model_to_use = resolve_model(body.model)
        system_instruction = advisor_system_instruction(body.financialContext)

        conversation_parts: list[types.Content] = [
            types.Content(
                role="user" if item.role == "user" else "model",
                parts=[types.Part(text=item.content)],
            )
            for item in body.history[-10:]
        ]
        conversation_parts.append(
            types.Content(role="user", parts=[types.Part(text=body.message)])
        )

        async def generate(model: str):
            return await client.aio.models.generate_content(
                model=model,
                contents=conversation_parts,
                config=types.GenerateContentConfig(system_instruction=system_instruction),
            )

        result = await execute_with_retry_and_fallback(generate, model_to_use)
        return {
            "success": True,
            "modelUsed": result.model_used,
            "fallbackUsed": result.fallback_used,
            "reply": result.response.text or "No fue posible generar una respuesta en este momento.",
        }
    except Exception as error:  # noqa: BLE001
        print(f"Error in advisor chat: {error}")
        return _ai_error_response(error, "Error en el chat de asesoría")


# 5. Goal-Specific Behavioral Savings Advice
@app.post("/api/gemini/savings-goal-advice")
async def savings_goal_advice(body: SavingsGoalAdviceRequest) -> dict[str, Any]:
    try:
        client = get_client()
        model_to_use = resolve_model(body.model)
        user_payload = savings_goal_user_content(body.goal, body.financialContext)

        async def generate(model: str):
            return await client.aio.models.generate_content(
                model=model,
                contents=user_payload,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    system_instruction=savings_goal_system_instruction(),
                ),
            )

        result = await execute_with_retry_and_fallback(generate, model_to_use)
        parsed = clean_and_parse_json(result.response.text)
        return {
            "success": True,
            "modelUsed": result.model_used,
            "fallbackUsed": result.fallback_used,
            "data": parsed,
        }
    except Exception as error:  # noqa: BLE001
        print(f"Error in savings goal advice: {error}")
        return _ai_error_response(error, "Error al generar consejos para la meta de ahorro")


# Serve the built frontend in production. In development the frontend runs
# as its own Vite dev server (see package.json "dev" script) and proxies
# /api requests here, so no static mount is needed.
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        candidate = DIST_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST_DIR / "index.html")
