from datetime import date, datetime, timedelta

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.models.inventory_transaction import InventoryTransaction
from app.models.demand_forecast import DemandForecast

CONSUMPTION = "CONSUMPTION"


def get_branch_consumption(db: Session, branch_id: int, days: int) -> dict:
    end = date.today()
    start = end - timedelta(days=days - 1)
    day_col = cast(InventoryTransaction.created_at, Date)

    rows = (
        db.query(
            day_col.label("day"),
            Ingredient.ingredient_name.label("name"),
            # abs() because ledgers often store consumption as negative quantities
            func.sum(func.abs(InventoryTransaction.quantity)).label("qty"),
        )
        .join(Ingredient, Ingredient.ingredient_id == InventoryTransaction.ingredient_id)
        .filter(
            InventoryTransaction.branch_id == branch_id,
            InventoryTransaction.transaction_type == CONSUMPTION,
            day_col >= start,
            day_col <= end,
        )
        .group_by(day_col, Ingredient.ingredient_name)
        .all()
    )

    all_dates = [start + timedelta(days=i) for i in range(days)]
    per_day: dict[date, dict[str, float]] = {d: {} for d in all_dates}
    names: set[str] = set()

    for r in rows:
        per_day[r.day][r.name] = round(float(r.qty), 2)
        names.add(r.name)

    by_date = [
        {
            "date": d,
            "total": round(sum(per_day[d].values()), 2),
            "by_ingredient": per_day[d],
        }
        for d in all_dates
    ]
    by_ingredient = {
        name: [per_day[d].get(name, 0.0) for d in all_dates]
        for name in sorted(names)
    }
    return {"by_date": by_date, "by_ingredient": by_ingredient}


def get_ingredient(db: Session, ingredient_id: int):
    return (
        db.query(Ingredient).filter(Ingredient.ingredient_id == ingredient_id).first()
    )


def get_daily_consumption(
    db: Session, branch_id: int, ingredient_id: int, history_days: int
) -> tuple[list[date], list[float]]:
    end = date.today()
    start = end - timedelta(days=history_days - 1)
    day_col = cast(InventoryTransaction.created_at, Date)

    rows = (
        db.query(
            day_col.label("day"),
            func.sum(func.abs(InventoryTransaction.quantity)).label("qty"),
        )
        .filter(
            InventoryTransaction.branch_id == branch_id,
            InventoryTransaction.ingredient_id == ingredient_id,
            InventoryTransaction.transaction_type == CONSUMPTION,
            day_col >= start,
            day_col <= end,
        )
        .group_by(day_col)
        .all()
    )
    by_day = {r.day: float(r.qty) for r in rows}
    dates = [start + timedelta(days=i) for i in range(history_days)]
    return dates, [by_day.get(d, 0.0) for d in dates]


def save_forecast(
    db: Session,
    branch_id: int,
    ingredient_id: int,
    future_dates: list[date],
    future_values: list[float],
    method: str,
) -> None:
    """Persist the future points so the dashboard can show forecast history."""
    generated_at = datetime.utcnow()
    db.add_all(
        [
            DemandForecast(
                branch_id=branch_id,
                ingredient_id=ingredient_id,
                forecast_date=d,
                predicted_quantity=v,
                method=method,
                generated_at=generated_at,
            )
            for d, v in zip(future_dates, future_values)
        ]
    )
    db.commit()