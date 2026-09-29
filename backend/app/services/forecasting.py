"""
Demand forecasting from historical sales.

Primary source: completed Order Items exploded through each dish's Recipe,
which gives real per-ingredient usage driven by what customers actually
ordered. Falls back to the raw inventory CONSUMPTION ledger (manual
deductions) for an ingredient/branch pair with no order history yet - e.g.
before the POS side of the system has been used.

Uses a simple moving average over a lookback window (default 30 days).
Swap in exponential smoothing or a proper time-series model later without
changing the API/persisted-table shape.
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.inventory import InventoryTransaction
from app.models.ingredient import Ingredient
from app.models.order import OrderLog, OrderItem
from app.models.menu import RecipeIngredient
from app.models.forecast import DemandForecast
from app.models.enums import InventoryTransactionType, OrderStatus
from app.schemas.forecast import DemandForecastOut


def _demand_from_orders(db: Session, branch_id: int, ingredient_id: int, since: datetime) -> tuple[float, int]:
    """Total quantity of `ingredient_id` used by completed orders at this
    branch since `since`, exploded through each dish's recipe."""
    order_items = (
        db.query(OrderItem, OrderLog.completed_at)
        .join(OrderLog, OrderItem.order_id == OrderLog.order_id)
        .filter(
            OrderLog.branch_id == branch_id,
            OrderLog.status == OrderStatus.COMPLETED,
            OrderLog.completed_at.isnot(None),
            OrderLog.completed_at >= since,
        )
        .all()
    )
    if not order_items:
        return 0.0, 0

    recipe_qty_cache: dict[int, float] = {}
    total = 0.0
    earliest: datetime | None = None
    for order_item, completed_at in order_items:
        if order_item.menu_item_id not in recipe_qty_cache:
            line = (
                db.query(RecipeIngredient)
                .filter(
                    RecipeIngredient.menu_item_id == order_item.menu_item_id,
                    RecipeIngredient.ingredient_id == ingredient_id,
                )
                .first()
            )
            recipe_qty_cache[order_item.menu_item_id] = float(line.quantity_required) if line else 0.0

        qty_per_serving = recipe_qty_cache[order_item.menu_item_id]
        if qty_per_serving <= 0:
            continue
        total += qty_per_serving * order_item.quantity
        if earliest is None or completed_at < earliest:
            earliest = completed_at

    if total <= 0 or earliest is None:
        return 0.0, 0
    days_with_data = max((datetime.now(timezone.utc).replace(tzinfo=None) - earliest).days, 1)
    return total, days_with_data


def _demand_from_consumption_ledger(db: Session, branch_id: int, ingredient_id: int, since: datetime) -> tuple[float, int]:
    """Fallback: raw CONSUMPTION transactions (manual deductions, no POS order behind them)."""
    total = (
        db.query(func.coalesce(func.sum(InventoryTransaction.quantity), 0))
        .filter(
            InventoryTransaction.branch_id == branch_id,
            InventoryTransaction.ingredient_id == ingredient_id,
            InventoryTransaction.transaction_type == InventoryTransactionType.CONSUMPTION,
            InventoryTransaction.transaction_date >= since,
        )
        .scalar()
    )
    earliest = (
        db.query(func.min(InventoryTransaction.transaction_date))
        .filter(
            InventoryTransaction.branch_id == branch_id,
            InventoryTransaction.ingredient_id == ingredient_id,
            InventoryTransaction.transaction_type == InventoryTransactionType.CONSUMPTION,
            InventoryTransaction.transaction_date >= since,
        )
        .scalar()
    )
    if earliest is None:
        return 0.0, 0
    days_with_data = max((datetime.now(timezone.utc).replace(tzinfo=None) - earliest).days, 1)
    return float(total), days_with_data


def average_daily_demand(db: Session, branch_id: int, ingredient_id: int, lookback_days: int = 30) -> tuple[float, int, str]:
    """Returns (avg_daily_demand, days_of_history_used, method)."""
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=lookback_days)

    total, days_with_data = _demand_from_orders(db, branch_id, ingredient_id, since)
    method = "order_history"
    if total <= 0:
        total, days_with_data = _demand_from_consumption_ledger(db, branch_id, ingredient_id, since)
        method = "consumption_ledger"

    avg_daily = (total / days_with_data) if days_with_data > 0 else 0.0
    return avg_daily, days_with_data, method


def forecast_demand(
    db: Session, branch_id: int, ingredient_id: int, lookback_days: int = 30, forecast_period_days: int = 7,
) -> DemandForecast:
    """Computes a forecast and persists it as a DemandForecast row (so
    forecast accuracy/history can be reviewed later)."""
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found.")

    avg_daily, days_used, method = average_daily_demand(db, branch_id, ingredient_id, lookback_days)

    forecast = DemandForecast(
        branch_id=branch_id,
        ingredient_id=ingredient_id,
        method=method,
        historical_days_used=days_used,
        forecast_daily_demand=round(avg_daily, 3),
        forecast_period_days=forecast_period_days,
        forecast_total_demand=round(avg_daily * forecast_period_days, 3),
    )
    db.add(forecast)
    db.commit()
    db.refresh(forecast)
    return forecast


def get_forecast_history(db: Session, branch_id: int, ingredient_id: int | None = None, limit: int = 50) -> list[DemandForecast]:
    query = db.query(DemandForecast).filter(DemandForecast.branch_id == branch_id)
    if ingredient_id is not None:
        query = query.filter(DemandForecast.ingredient_id == ingredient_id)
    return query.order_by(DemandForecast.generated_at.desc()).limit(limit).all()
