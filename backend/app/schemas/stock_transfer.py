from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import StockTransferStatus


class StockTransferItemCreate(BaseModel):
    ingredient_id: int
    quantity: float = Field(gt=0)


class StockTransferItemOut(StockTransferItemCreate):
    model_config = ConfigDict(from_attributes=True)
    transfer_item_id: int


class StockTransferCreate(BaseModel):
    from_branch_id: int
    to_branch_id: int
    requested_by: int | None = None
    notes: str | None = None
    items: list[StockTransferItemCreate]


class StockTransferUpdateStatus(BaseModel):
    status: StockTransferStatus
    approved_by: int | None = None


class StockTransferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transfer_id: int
    from_branch_id: int
    to_branch_id: int
    status: StockTransferStatus
    requested_by: int | None
    approved_by: int | None
    requested_at: datetime
    completed_at: datetime | None
    notes: str | None
    items: list[StockTransferItemOut]
