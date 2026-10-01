from datetime import date, datetime, timedelta

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.models.inventory import InventoryTransaction
from app.models.forecast import DemandForecast
from app.models.enums import InventoryTransactionType


CONSUMPTION = InventoryTransactionType.CONSUMPTION


def get_branch_consumption(db: Session, branch_id: int, days: int) -> dict:
    """
    Return consumption grouped by date and ingredient for one branch over the
    last `days` days.

    Response shape:
    {
      "by_date": [
        {"date": "YYYY-MM-DD", "total": 12.5, "by_ingredient": {"Chicken Breast": 7.5, "Rice": 5.0}},
        ...
      ],
      "by_ingredient": {
        "Chicken Breast": [0.0, 7.5, ...],
        "Rice": [0.0, 5.0, ...]
      }
    }
    """
    end = date.today()
    start = end - timedelta(days=days - 1)

    day_col = cast(InventoryTransaction.transaction_date, Date)

    rows = (
        db.query(
            day_col.label("day"),
            Ingredient.ingredient_name.label("ingredient_name"),
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

    for row in rows:
        per_day[row.day][row.ingredient_name] = round(float(row.qty), 2)
        names.add(row.ingredient_name)

    by_date = [
        {
            "date": d.isoformat(),
            "total": round(sum(per_day[d].values()), 2),
            "by_ingredient": per_day[d],
        }
        for d in all_dates
    ]

    by_ingredient = {
        name: [per_day[d].get(name, 0.0) for d in all_dates]
        for name in sorted(names)
    }

    return {
        "by_date": by_date,
        "by_ingredient": by_ingredient,
    }


def get_ingredient(db: Session, ingredient_id: int):
    return (
        db.query(Ingredient)
        .filter(Ingredient.ingredient_id == ingredient_id)
        .first()
    )


def get_daily_consumption(
    db: Session,
    branch_id: int,
    ingredient_id: int,
    history_days: int,
) -> tuple[list[date], list[float]]:
    """
    Return daily actual consumption for one ingredient at one branch.
    """
    end = date.today()
    start = end - timedelta(days=history_days - 1)

    day_col = cast(InventoryTransaction.transaction_date, Date)

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

    by_day = {row.day: float(row.qty) for row in rows}
    dates = [start + timedelta(days=i) for i in range(history_days)]
    return dates, [by_day.get(d, 0.0) for d in dates]


def get_forecast_data(
    db: Session, branch_id: int, ingredient_id: int
) -> dict:
    """
    Fetch the latest forecast for an ingredient and return predicted vs actual.
    """
    # Get the latest forecast run for this ingredient
    forecasts = (
        db.query(DemandForecast)
        .filter(
            DemandForecast.branch_id == branch_id,
            DemandForecast.ingredient_id == ingredient_id,
        )
        .order_by(DemandForecast.generated_at.desc())
        .limit(7)  # Get last 7 forecasted days
        .all()
    )

    if not forecasts:
        return {"dates": [], "predicted": [], "actual": []}

    # Get actual consumption for the same period
    forecast_dates = sorted(set(f.forecast_date for f in forecasts))
    predicted_by_date = {
        f.forecast_date: f.forecast_daily_demand for f in forecasts
    }

    actual_data = get_daily_consumption(
        db, branch_id, ingredient_id, len(forecast_dates)
    )
    actual_by_date = {d: v for d, v in zip(actual_data[0], actual_data[1])}

    return {
        "dates": [d.isoformat() for d in forecast_dates],
        "predicted": [predicted_by_date.get(d, 0.0) for d in forecast_dates],
        "actual": [actual_by_date.get(d, 0.0) for d in forecast_dates],
    }


def save_forecast(
    db: Session,
    branch_id: int,
    ingredient_id: int,
    future_dates: list[date],
    future_values: list[float],
    method: str,
) -> None:
    """
    Persist future forecast points as DemandForecast records.
    """
    generated_at = datetime.utcnow()

    db.add_all(
        [
            DemandForecast(
                branch_id=branch_id,
                ingredient_id=ingredient_id,
                method=method,
                historical_days_used=len(future_values),
                forecast_daily_demand=float(v),
                forecast_period_days=len(future_dates),
                forecast_total_demand=float(sum(future_values)),
                forecast_date=d,
                generated_at=generated_at,
            )
            for d, v in zip(future_dates, future_values)
        ]
    )
    db.commit()
