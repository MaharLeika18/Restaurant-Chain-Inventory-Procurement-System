from datetime import date
from pydantic import BaseModel


class ConsumptionByDate(BaseModel):
    date: date
    total: float
    by_ingredient: dict[str, float]


class BranchConsumptionOut(BaseModel):
    by_date: list[ConsumptionByDate]
    by_ingredient: dict[str, list[float]]


class IngredientForecastOut(BaseModel):
    dates: list[date]
    predicted: list[float | None]
    actual: list[float | None]