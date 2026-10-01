# backend/app/schemas/dashboard.py
from pydantic import BaseModel
from typing import Dict, List
from datetime import date


class ConsumptionByDate(BaseModel):
    date: date
    total: float
    by_ingredient: Dict[str, float]


class ConsumptionResponse(BaseModel):
    by_date: List[ConsumptionByDate]
    by_ingredient: Dict[str, List[float]]


class ForecastResponse(BaseModel):
    dates: list[date]
    predicted: list[float | None]
    actual: list[float | None]