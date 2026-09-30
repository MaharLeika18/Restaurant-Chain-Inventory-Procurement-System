from datetime import date
from pydantic import BaseModel


class ConsumptionItem(BaseModel):
    ingredient_id: int
    ingredient_name: str
    total_consumed: float
    average_daily: float


class ConsumptionReportOut(BaseModel):
    branch_id: int
    period_days: int
    items: list[ConsumptionItem]


class WasteReportItem(BaseModel):
    ingredient_id: int
    ingredient_name: str
    total_quantity_wasted: float
    estimated_cost: float
    incident_count: int


class WasteReportOut(BaseModel):
    branch_id: int
    period_days: int
    items: list[WasteReportItem]
    total_estimated_cost: float


class SummaryReportOut(BaseModel):
    branch_id: int
    as_of: date
    low_stock_count: int
    pending_purchase_orders: int
    expiring_batches_next_7_days: int
    total_inventory_value: float
    waste_cost_last_7_days: float
