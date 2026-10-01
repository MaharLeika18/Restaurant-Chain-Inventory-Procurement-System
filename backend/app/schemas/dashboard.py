# backend/app/schemas/dashboard.py
from pydantic import BaseModel
from typing import Dict, List


class ConsumptionByDate(BaseModel):
    date: str  # Changed from `date` to `str`
    total: float
    by_ingredient: Dict[str, float]


class ConsumptionResponse(BaseModel):
    by_date: List[ConsumptionByDate]
    by_ingredient: Dict[str, List[float]]


from datetime import date

class ForecastResponse(BaseModel):
    dates: list[date]
    predicted: list[float | None]
    actual: list[float | None]

class LowStockChartOut(BaseModel):
    categories: list[str]        # ingredient names
    current: list[float]
    par: list[float]
    below_par_count: int


class InventoryValuationOut(BaseModel):
    categories: list[str]        # ingredient category names
    values: list[float]
    total: float