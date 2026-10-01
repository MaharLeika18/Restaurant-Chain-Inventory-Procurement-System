# backend/app/routers/dashboard.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.crud.dashboard import (
    get_branch_consumption,
    get_ingredient,
    get_daily_consumption,
    build_forecast,
    save_forecast,
)
from app.schemas.dashboard import ConsumptionResponse, ForecastResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/branch/{branch_id}/consumption", response_model=ConsumptionResponse)
def get_consumption(branch_id: int, days: int = 30, db: Session = Depends(get_db)):
    """Get ingredient consumption over the last N days, grouped by date and ingredient."""
    return get_branch_consumption(db, branch_id, days)


@router.get("/branch/{branch_id}/forecast/{ingredient_id}", response_model=ForecastResponse)
def get_forecast(
    branch_id: int,
    ingredient_id: int,
    horizon: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    if not get_ingredient(db, ingredient_id):
        raise HTTPException(status_code=404, detail="Ingredient not found")

    dates, actual = get_daily_consumption(db, branch_id, ingredient_id, 30)
    result = build_forecast(dates, actual, horizon)

    save_forecast(
        db, branch_id, ingredient_id,
        future_dates=result["dates"][-horizon:],
        future_values=result["predicted"][-horizon:],
        method="moving_average_14d",
    )
    return result