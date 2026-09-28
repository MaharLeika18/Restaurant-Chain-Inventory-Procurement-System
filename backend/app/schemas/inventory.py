from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import InventoryTransactionType, WasteReason


class BranchIngredientBase(BaseModel):
    branch_id: int
    ingredient_id: int
    par_level: float = 0


class BranchIngredientCreate(BranchIngredientBase):
    current_stock: float = 0


class BranchIngredientUpdate(BaseModel):
    par_level: float | None = None


class BranchIngredientOut(BranchIngredientBase):
    model_config = ConfigDict(from_attributes=True)

    branch_ingredient_id: int
    current_stock: float
    nearest_expiry_date: date | None
    last_updated: datetime


class BatchBase(BaseModel):
    branch_id: int
    ingredient_id: int
    supplier_id: int | None = None
    purchase_order_item_id: int | None = None
    lot_number: str | None = None
    quantity_received: float = Field(gt=0)
    unit_cost: float = Field(ge=0)
    expiration_date: date | None = None


class BatchCreate(BatchBase):
    pass


class BatchOut(BatchBase):
    model_config = ConfigDict(from_attributes=True)

    batch_id: int
    quantity_remaining: float
    received_date: date


class InventoryTransactionBase(BaseModel):
    branch_id: int
    ingredient_id: int
    transaction_type: InventoryTransactionType
    quantity: float = Field(gt=0)
    batch_id: int | None = None
    reference: str | None = None
    notes: str | None = None
    recorded_by: int | None = None


class InventoryTransactionCreate(InventoryTransactionBase):
    pass


class InventoryTransactionOut(InventoryTransactionBase):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: int
    transaction_date: datetime


class WasteLogCreate(BaseModel):
    branch_id: int
    ingredient_id: int
    batch_id: int | None = None
    quantity: float = Field(gt=0)
    reason: WasteReason
    notes: str | None = None
    recorded_by: int | None = None


class WasteLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    waste_id: int
    branch_id: int
    ingredient_id: int
    batch_id: int | None
    transaction_id: int | None
    quantity: float
    reason: WasteReason
    notes: str | None
    recorded_by: int | None
    waste_date: datetime


class ReorderCheckOut(BaseModel):
    """Result of running the reorder-point algorithm for one branch/ingredient."""
    branch_id: int
    ingredient_id: int
    ingredient_name: str
    current_stock: float
    par_level: float
    days_of_stock_remaining: float | None
    needs_reorder: bool
    suggested_order_quantity: float
