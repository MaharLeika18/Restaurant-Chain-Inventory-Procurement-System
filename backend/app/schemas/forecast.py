from datetime import datetime, date
from pydantic import BaseModel, ConfigDict


class DemandForecastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    forecast_id: int
    branch_id: int
    ingredient_id: int
    method: str
    historical_days_used: int
    forecast_daily_demand: float
    forecast_period_days: int
    forecast_total_demand: float
    forecast_date: date
    generated_at: datetime


class ReorderPredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    prediction_id: int
    branch_id: int
    ingredient_id: int
    current_stock_at_check: float
    par_level_at_check: float
    predicted_stockout_date: date | None
    suggested_order_quantity: float
    needs_reorder: bool
    generated_at: datetime


class SupplierPerformanceOut(BaseModel):
    supplier_id: int
    supplier_name: str
    total_purchase_orders: int
    total_delivered_on_time: int
    total_delivered_late: int
    on_time_delivery_rate: float


class InventoryValuationItem(BaseModel):
    ingredient_id: int
    ingredient_name: str
    total_quantity: float
    total_value: float


class InventoryValuationOut(BaseModel):
    branch_id: int
    as_of_date: date
    items: list[InventoryValuationItem]
    total_inventory_value: float
