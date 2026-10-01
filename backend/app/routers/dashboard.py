# backend/app/routers/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.crud.dashboard import (
    get_branch_consumption,
    get_ingredient,
    get_daily_consumption,
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
    branch_id: int, ingredient_id: int, db: Session = Depends(get_db)
):
    """Get predicted vs actual demand for an ingredient at a branch."""
    ingredient = get_ingredient(db, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    # Get actual consumption history (last 30 days)
    dates, actual = get_daily_consumption(db, branch_id, ingredient_id, 30)
    
    # TODO: Implement forecast prediction logic here
    # For now, return actual consumption as placeholder
    predicted = actual.copy()  # Replace with real forecast algorithm
    
    return {
        "dates": [d.isoformat() for d in dates],
        "predicted": predicted,
        "actual": actual,
    }