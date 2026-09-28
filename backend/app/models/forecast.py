from datetime import datetime, date

from sqlalchemy import ForeignKey, Numeric, DateTime, Date, String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DemandForecast(Base):
    """
    A stored forecast run: predicted daily/period demand for one ingredient
    at one branch, generated from historical Order Item sales exploded
    through Recipe (falls back to raw CONSUMPTION transactions if no order
    history exists yet). Kept as a table (rather than computed only on
    request) so forecast accuracy can be tracked over time.
    """
    __tablename__ = "demand_forecasts"

    forecast_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)

    method: Mapped[str] = mapped_column(String(50), nullable=False, default="moving_average")
    historical_days_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    forecast_daily_demand: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    forecast_period_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    forecast_total_demand: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)

    forecast_date: Mapped[date] = mapped_column(Date, default=date.today)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch")
    ingredient = relationship("Ingredient")


class ReorderPrediction(Base):
    """
    A stored snapshot of a reorder-point check: what the stock and PAR level
    looked like when it ran, whether it triggered, and what was suggested.
    Persisting these (instead of only computing live) lets the team show a
    history/audit trail of when the system flagged low stock.
    """
    __tablename__ = "reorder_predictions"

    prediction_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)

    current_stock_at_check: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    par_level_at_check: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    predicted_stockout_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    suggested_order_quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    needs_reorder: Mapped[bool] = mapped_column(Boolean, nullable=False)

    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch")
    ingredient = relationship("Ingredient")
