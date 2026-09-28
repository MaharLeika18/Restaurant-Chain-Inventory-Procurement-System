from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OrderStatus


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = Field(gt=0)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_item_id: int
    menu_item_id: int
    quantity: int
    unit_price: float
    subtotal: float


class OrderCreate(BaseModel):
    branch_id: int
    employee_id: int | None = None
    payment_method: str | None = None
    items: list[OrderItemCreate]


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int
    branch_id: int
    employee_id: int | None
    status: OrderStatus
    payment_method: str | None
    total_amount: float
    order_datetime: datetime
    completed_at: datetime | None
    items: list[OrderItemOut]
