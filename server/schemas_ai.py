"""Response schemas for Gemini structured-output calls (response_schema).

Without a schema, response_mime_type="application/json" only asks the model
to produce JSON — it doesn't enforce it, and long/complex responses
occasionally come back with a stray bracket or missing comma that breaks
clean_and_parse_json's best-effort recovery. Passing one of these as
response_schema switches Gemini to constrained decoding, which guarantees
syntactically valid JSON matching the shape (see server/gemini.py
run_json_endpoint, which prefers response.parsed when a schema was used).

Mirrors FinancialAnalysisResult in src/types.ts.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class TablaCategoriaItem(BaseModel):
    categoria: str
    totalGastado: float
    porcentajePresupuesto: float
    tendencia: str
    comentarioConductual: Optional[str] = None


class TopAnomaliaItem(BaseModel):
    concepto: str
    monto: float
    categoria: str
    fecha: str
    desviacionesEstandar: float
    explicacion: str


class RecomendacionAhorroItem(BaseModel):
    titulo: str
    sesgoAbordado: str
    accionConcreta: str
    contextoEstadistico: str


class ComparativaMesAnterior(BaseModel):
    cambioTotalPorcentual: float
    analisisComparativo: str
    areasDeMejora: list[str]


class FinancialAnalysisSchema(BaseModel):
    resumenEjecutivo: list[str]
    tablaCategorias: list[TablaCategoriaItem]
    topAnomalias: list[TopAnomaliaItem]
    recomendacionesAhorro: list[RecomendacionAhorroItem]
    comparativaMesAnterior: ComparativaMesAnterior
    patronesProactivos: list[str]
