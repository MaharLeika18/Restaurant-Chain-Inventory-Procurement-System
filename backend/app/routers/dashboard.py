from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud.dashboard import (
    get_branch_consumption,
    get_ingredient,
    get_daily_consumption,
    build_forecast,
    save_forecast,
)

from app.schemas.dashboard import ConsumptionResponse, ForecastResponse

router = APIRouter(prefix="/cruddashboard", tags=["Dashboard"])

@router.get("/branch/{branch_id}/consumption", response_model=ConsumptionResponse)
def get_consumption(
    branch_id: int,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return get_branch_consumption(db, branch_id, days)


@router.get("/branch/{branch_id}/forecast/{ingredient_id}", response_model=ForecastResponse)
def get_forecast(
    branch_id: int,
    ingredient_id: int,
    horizon: int = Query(7, ge=1, le=90),
    history_days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    if not get_ingredient(db, ingredient_id):
        raise HTTPException(status_code=404, detail="Ingredient not found")

    dates, daily = get_daily_consumption(db, branch_id, ingredient_id, history_days)
    result = build_forecast(dates, daily, horizon)

    save_forecast(
        db, branch_id, ingredient_id,
        future_dates=result["dates"][-horizon:],
        future_values=result["predicted"][-horizon:],
        method="moving_average_14d",
        history_days=history_days,
    )
    return result

from app.schemas.dashboard import LowStockChartOut, InventoryValuationOut
from app.crud.dashboard import get_low_stock_chart, get_inventory_valuation


@router.get("/branch/{branch_id}/low-stock", response_model=LowStockChartOut)
def low_stock_chart(branch_id: int, limit: int = Query(10, ge=1, le=50),
                    db: Session = Depends(get_db)):
    return get_low_stock_chart(db, branch_id, limit)


@router.get("/branch/{branch_id}/inventory-valuation", response_model=InventoryValuationOut)
def inventory_valuation(branch_id: int, db: Session = Depends(get_db)):
    return get_inventory_valuation(db, branch_id)