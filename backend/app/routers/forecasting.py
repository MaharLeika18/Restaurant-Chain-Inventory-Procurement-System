from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.forecast import DemandForecastOut
from app.services import forecasting as forecasting_service

router = APIRouter(prefix="/forecast", tags=["Demand Forecasting"])


@router.get("/branch/{branch_id}/ingredient/{ingredient_id}", response_model=DemandForecastOut)
def run_forecast(
    branch_id: int,
    ingredient_id: int,
    lookback_days: int = 30,
    forecast_period_days: int = 7,
    db: Session = Depends(get_db),
):
    """
    Moving-average demand forecast for one ingredient at one branch, using
    completed-order sales exploded through Recipe (or the raw consumption
    ledger as a fallback). Persists the result as a DemandForecast row.
    """
    return forecasting_service.forecast_demand(db, branch_id, ingredient_id, lookback_days, forecast_period_days)


@router.get("/branch/{branch_id}/history", response_model=list[DemandForecastOut])
def forecast_history(branch_id: int, ingredient_id: int | None = None, limit: int = 50, db: Session = Depends(get_db)):
    return forecasting_service.get_forecast_history(db, branch_id, ingredient_id, limit)
