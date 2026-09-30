from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.enums import PurchaseOrderStatus, UserRole
from app.schemas.purchase_order import (
    PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderUpdateStatus, ReceiveShipment,
    PurchaseOrderEdit, FlagDiscrepancy, MatchReceivedQtyOut,
)
from app.crud import purchase_order as crud_po
from app.services import recommendations as recommendation_service
from app.services.auth import require_role

router = APIRouter(prefix="/purchase-orders", tags=["Procurement"])


@router.post("/generate-recommendations/{branch_id}", response_model=list[PurchaseOrderOut], status_code=201)
def generate_purchase_recommendations(branch_id: int, db: Session = Depends(get_db)):
    """
    Runs the reorder-point check for every ingredient at a branch and
    auto-drafts one PENDING_APPROVAL purchase order per supplier for
    whatever is at/below its PAR level. A manager still has to approve
    each one via /approve before it's sent to the supplier.
    """
    return recommendation_service.generate_recommendations_for_branch(db, branch_id)


@router.get("/", response_model=list[PurchaseOrderOut])
def list_purchase_orders(
    branch_id: int | None = None,
    status: PurchaseOrderStatus | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud_po.get_purchase_orders(db, branch_id=branch_id, status=status, skip=skip, limit=limit)


@router.post("/", response_model=PurchaseOrderOut, status_code=201)
def create_purchase_order(po_in: PurchaseOrderCreate, db: Session = Depends(get_db)):
    """A manager or staff member manually drafts a purchase order."""
    return crud_po.create_purchase_order(db, po_in, is_system_generated=False)


@router.get("/{po_id}", response_model=PurchaseOrderOut)
def get_po_status(po_id: int, db: Session = Depends(get_db)):
    """getPOStatus / general PO detail fetch."""
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return po


@router.patch("/{po_id}", response_model=PurchaseOrderOut)
def edit_po_before_approval(po_id: int, edit_in: PurchaseOrderEdit, db: Session = Depends(get_db)):
    """editPOBeforeApproval: change supplier, dates, notes, or replace the line items - PENDING_APPROVAL only."""
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return crud_po.edit_purchase_order(db, po, edit_in)


@router.patch("/{po_id}/status", response_model=PurchaseOrderOut)
def update_status(po_id: int, status_in: PurchaseOrderUpdateStatus, db: Session = Depends(get_db)):
    """
    General-purpose lifecycle driver: PENDING_APPROVAL -> APPROVED/REJECTED
    -> ORDERED -> (PARTIALLY_RECEIVED ->) RECEIVED, or CANCELLED along the
    way. See the single-purpose shortcuts below for the common transitions.
    """
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return crud_po.update_purchase_order_status(db, po, status_in)


@router.post("/{po_id}/approve", response_model=PurchaseOrderOut)
def approve_purchase_order(
    po_id: int, approved_by: int | None = None, db: Session = Depends(get_db),
    current_user=Depends(require_role(UserRole.MANAGER, UserRole.ADMIN)),
):
    """approvePurchaseOrder: PENDING_APPROVAL -> APPROVED. Requires a MANAGER or ADMIN login."""
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return crud_po.update_purchase_order_status(
        db, po,
        PurchaseOrderUpdateStatus(
            status=PurchaseOrderStatus.APPROVED,
            approved_by=approved_by if approved_by is not None else current_user.employee_id,
        ),
    )


@router.post("/{po_id}/reject", response_model=PurchaseOrderOut)
def reject_purchase_order(
    po_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_role(UserRole.MANAGER, UserRole.ADMIN)),
):
    """rejectPurchaseOrder: PENDING_APPROVAL -> REJECTED. Requires a MANAGER or ADMIN login."""
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return crud_po.update_purchase_order_status(db, po, PurchaseOrderUpdateStatus(status=PurchaseOrderStatus.REJECTED))


@router.post("/{po_id}/send", response_model=PurchaseOrderOut)
def send_purchase_order(po_id: int, db: Session = Depends(get_db)):
    """sendPurchaseOrder: APPROVED -> ORDERED (i.e. sent off to the supplier)."""
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return crud_po.update_purchase_order_status(db, po, PurchaseOrderUpdateStatus(status=PurchaseOrderStatus.ORDERED))


@router.post("/{po_id}/cancel", response_model=PurchaseOrderOut)
def cancel_purchase_order(
    po_id: int, db: Session = Depends(get_db),
    current_user=Depends(require_role(UserRole.MANAGER, UserRole.ADMIN)),
):
    """cancelPurchaseOrder: valid from APPROVED or ORDERED. Requires a MANAGER or ADMIN login."""
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return crud_po.update_purchase_order_status(db, po, PurchaseOrderUpdateStatus(status=PurchaseOrderStatus.CANCELLED))


@router.post("/{po_id}/receive", response_model=PurchaseOrderOut)
def receive_purchase_order(po_id: int, shipment_in: ReceiveShipment, db: Session = Depends(get_db)):
    """
    receivePurchaseOrder: branch confirms delivery - creates batches/lots and
    updates inventory. Auto-flags has_discrepancy if any line's fulfilled
    quantity doesn't match what was ordered once the PO is fully received.
    """
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return crud_po.receive_shipment(db, po, shipment_in)


@router.get("/{po_id}/match-received-qty", response_model=MatchReceivedQtyOut)
def match_received_qty(po_id: int, db: Session = Depends(get_db)):
    """matchReceivedQty: per-line comparison of ordered vs. fulfilled quantity."""
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    items = crud_po.match_received_qty(po)
    return MatchReceivedQtyOut(
        po_id=po_id,
        fully_matched=all(i["difference"] == 0 for i in items),
        items=items,
    )


@router.post("/{po_id}/flag-discrepancy", response_model=PurchaseOrderOut)
def flag_discrepancy(po_id: int, flag_in: FlagDiscrepancy, db: Session = Depends(get_db)):
    """flagDiscrepancy: manually note a mismatch (wrong item, damaged shipment, pricing issue, etc.)."""
    po = crud_po.get_purchase_order(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    return crud_po.flag_discrepancy(db, po, flag_in.discrepancy_notes)
