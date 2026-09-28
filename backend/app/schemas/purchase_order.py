from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PurchaseOrderStatus


class PurchaseOrderItemBase(BaseModel):
    ingredient_id: int
    ordered_quantity: float = Field(gt=0)
    unit_cost: float = Field(ge=0)


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemOut(PurchaseOrderItemBase):
    model_config = ConfigDict(from_attributes=True)

    po_item_id: int
    fulfilled_quantity: float


class PurchaseOrderCreate(BaseModel):
    branch_id: int
    supplier_id: int
    created_by: int | None = None
    expected_delivery_date: date | None = None
    notes: str | None = None
    items: list[PurchaseOrderItemCreate]


class PurchaseOrderEdit(BaseModel):
    """Edit a PO while it's still PENDING_APPROVAL - line items, supplier, dates, notes."""
    supplier_id: int | None = None
    expected_delivery_date: date | None = None
    notes: str | None = None
    items: list[PurchaseOrderItemCreate] | None = None  # when given, replaces the whole item list


class FlagDiscrepancy(BaseModel):
    discrepancy_notes: str


class PurchaseOrderUpdateStatus(BaseModel):
    status: PurchaseOrderStatus
    approved_by: int | None = None


class ReceiveItem(BaseModel):
    po_item_id: int
    quantity_received: float = Field(gt=0)
    lot_number: str | None = None
    expiration_date: date | None = None


class ReceiveShipment(BaseModel):
    """Used when a branch physically receives some/all items of a PO."""
    items: list[ReceiveItem]
    actual_delivery_date: date | None = None


class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    po_id: int
    branch_id: int
    supplier_id: int
    status: PurchaseOrderStatus
    is_system_generated: bool
    created_by: int | None
    approved_by: int | None
    created_at: datetime
    approved_at: datetime | None
    expected_delivery_date: date | None
    actual_delivery_date: date | None
    notes: str | None
    has_discrepancy: bool
    discrepancy_notes: str | None
    items: list[PurchaseOrderItemOut]


class MatchReceivedQtyItem(BaseModel):
    po_item_id: int
    ingredient_id: int
    ordered_quantity: float
    fulfilled_quantity: float
    difference: float  # fulfilled - ordered; negative = short, positive = over-delivered


class MatchReceivedQtyOut(BaseModel):
    po_id: int
    fully_matched: bool
    items: list[MatchReceivedQtyItem]
