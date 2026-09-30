from datetime import datetime, date

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.enums import PurchaseOrderStatus
from app.schemas.purchase_order import (
    PurchaseOrderCreate, PurchaseOrderUpdateStatus, ReceiveShipment, PurchaseOrderEdit,
)
from app.schemas.inventory import BatchCreate
from app.crud.inventory import create_batch

# Allowed forward transitions for a purchase order's lifecycle
_VALID_TRANSITIONS: dict[PurchaseOrderStatus, set[PurchaseOrderStatus]] = {
    PurchaseOrderStatus.PENDING_APPROVAL: {PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.REJECTED},
    PurchaseOrderStatus.APPROVED: {PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.CANCELLED},
    PurchaseOrderStatus.ORDERED: {PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED},
    PurchaseOrderStatus.PARTIALLY_RECEIVED: {PurchaseOrderStatus.RECEIVED},
    PurchaseOrderStatus.REJECTED: set(),
    PurchaseOrderStatus.RECEIVED: set(),
    PurchaseOrderStatus.CANCELLED: set(),
}


def _check_and_flag_discrepancy(po: PurchaseOrder) -> None:
    """Auto-flags has_discrepancy when a PO is being closed out as RECEIVED
    but some line's fulfilled quantity doesn't match what was ordered -
    covers both over-delivery and a manager closing out a short shipment."""
    mismatched = [i for i in po.items if float(i.fulfilled_quantity) != float(i.ordered_quantity)]
    if mismatched:
        po.has_discrepancy = True
        summary = "; ".join(
            f"ingredient {i.ingredient_id}: ordered {i.ordered_quantity}, got {i.fulfilled_quantity}"
            for i in mismatched
        )
        po.discrepancy_notes = f"Auto-flagged on receipt - {summary}"


def get_purchase_order(db: Session, po_id: int) -> PurchaseOrder | None:
    return (
        db.query(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .filter(PurchaseOrder.po_id == po_id)
        .first()
    )


def get_purchase_orders(
    db: Session, branch_id: int | None = None, status: PurchaseOrderStatus | None = None,
    skip: int = 0, limit: int = 100,
) -> list[PurchaseOrder]:
    query = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.items))
    if branch_id is not None:
        query = query.filter(PurchaseOrder.branch_id == branch_id)
    if status is not None:
        query = query.filter(PurchaseOrder.status == status)
    return query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()


def create_purchase_order(
    db: Session, po_in: PurchaseOrderCreate, is_system_generated: bool = False
) -> PurchaseOrder:
    if not po_in.items:
        raise HTTPException(status_code=400, detail="A purchase order needs at least one line item.")

    po = PurchaseOrder(
        branch_id=po_in.branch_id,
        supplier_id=po_in.supplier_id,
        created_by=po_in.created_by,
        expected_delivery_date=po_in.expected_delivery_date,
        notes=po_in.notes,
        is_system_generated=is_system_generated,
        status=PurchaseOrderStatus.PENDING_APPROVAL,
    )
    for item_in in po_in.items:
        po.items.append(PurchaseOrderItem(
            ingredient_id=item_in.ingredient_id,
            ordered_quantity=item_in.ordered_quantity,
            unit_cost=item_in.unit_cost,
        ))

    db.add(po)
    db.commit()
    db.refresh(po)
    return po


def edit_purchase_order(db: Session, po: PurchaseOrder, edit_in: PurchaseOrderEdit) -> PurchaseOrder:
    """editPOBeforeApproval: only allowed while still PENDING_APPROVAL."""
    if po.status != PurchaseOrderStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400,
            detail="A purchase order can only be edited while PENDING_APPROVAL.",
        )

    if edit_in.supplier_id is not None:
        po.supplier_id = edit_in.supplier_id
    if edit_in.expected_delivery_date is not None:
        po.expected_delivery_date = edit_in.expected_delivery_date
    if edit_in.notes is not None:
        po.notes = edit_in.notes
    if edit_in.items is not None:
        if not edit_in.items:
            raise HTTPException(status_code=400, detail="A purchase order needs at least one line item.")
        po.items.clear()
        db.flush()
        for item_in in edit_in.items:
            po.items.append(PurchaseOrderItem(
                ingredient_id=item_in.ingredient_id,
                ordered_quantity=item_in.ordered_quantity,
                unit_cost=item_in.unit_cost,
            ))

    db.commit()
    db.refresh(po)
    return po


def flag_discrepancy(db: Session, po: PurchaseOrder, notes: str) -> PurchaseOrder:
    po.has_discrepancy = True
    po.discrepancy_notes = notes
    db.commit()
    db.refresh(po)
    return po


def match_received_qty(po: PurchaseOrder) -> list[dict]:
    """matchReceivedQty: per-line comparison of what was ordered vs what's arrived so far."""
    return [
        {
            "po_item_id": item.po_item_id,
            "ingredient_id": item.ingredient_id,
            "ordered_quantity": float(item.ordered_quantity),
            "fulfilled_quantity": float(item.fulfilled_quantity),
            "difference": float(item.fulfilled_quantity) - float(item.ordered_quantity),
        }
        for item in po.items
    ]


def update_purchase_order_status(
    db: Session, po: PurchaseOrder, status_in: PurchaseOrderUpdateStatus
) -> PurchaseOrder:
    allowed_next = _VALID_TRANSITIONS.get(po.status, set())
    if status_in.status not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move a purchase order from {po.status.value} to {status_in.status.value}.",
        )

    po.status = status_in.status
    if status_in.status == PurchaseOrderStatus.APPROVED:
        po.approved_by = status_in.approved_by
        po.approved_at = datetime.utcnow()
    if status_in.status == PurchaseOrderStatus.RECEIVED:
        if po.actual_delivery_date is None:
            po.actual_delivery_date = date.today()
        _check_and_flag_discrepancy(po)

    db.commit()
    db.refresh(po)
    return po


def receive_shipment(db: Session, po: PurchaseOrder, shipment_in: ReceiveShipment) -> PurchaseOrder:
    """
    Branch confirms physical receipt of some/all PO line items: creates a
    Batch (and RECEIPT ledger entry) per item received via app.crud.inventory,
    updates quantity_received on each line, and rolls the PO status forward.
    """
    if po.status not in (PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.PARTIALLY_RECEIVED):
        raise HTTPException(
            status_code=400,
            detail="Only an ORDERED or PARTIALLY_RECEIVED purchase order can receive a shipment.",
        )

    items_by_id = {item.po_item_id: item for item in po.items}

    for received in shipment_in.items:
        po_item = items_by_id.get(received.po_item_id)
        if po_item is None:
            raise HTTPException(status_code=404, detail=f"PO item {received.po_item_id} not found on this order.")

        # No upper bound enforced here: a supplier occasionally over-ships, and that's
        # fine to record - it just won't match ordered_quantity, so it'll surface as a
        # discrepancy once the PO is closed out as RECEIVED (see _check_and_flag_discrepancy).

        create_batch(db, BatchCreate(
            branch_id=po.branch_id,
            ingredient_id=po_item.ingredient_id,
            supplier_id=po.supplier_id,
            purchase_order_item_id=po_item.po_item_id,
            lot_number=received.lot_number,
            quantity_received=received.quantity_received,
            unit_cost=float(po_item.unit_cost),
            expiration_date=received.expiration_date,
        ))
        po_item.fulfilled_quantity = float(po_item.fulfilled_quantity) + received.quantity_received

    fully_received = all(float(i.fulfilled_quantity) >= float(i.ordered_quantity) for i in po.items)
    po.status = PurchaseOrderStatus.RECEIVED if fully_received else PurchaseOrderStatus.PARTIALLY_RECEIVED
    if shipment_in.actual_delivery_date:
        po.actual_delivery_date = shipment_in.actual_delivery_date
    elif po.status == PurchaseOrderStatus.RECEIVED and po.actual_delivery_date is None:
        po.actual_delivery_date = date.today()

    if po.status == PurchaseOrderStatus.RECEIVED:
        _check_and_flag_discrepancy(po)

    db.commit()
    db.refresh(po)
    return po
