"""
Bridges the reorder-point check to an actual purchase order: for every
ingredient at a branch that's at/below its reorder point, pick that
ingredient's preferred (or cheapest) supplier and group the recommended
quantities into one draft PO per supplier. Draft POs are created as
PENDING_APPROVAL and is_system_generated=True; a manager still has to
approve them before they go to the supplier.
"""
from collections import defaultdict
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.purchase_order import PurchaseOrder
from app.models.supplier import SupplierIngredient
from app.models.enums import PurchaseOrderStatus
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderItemCreate
from app.services.reorder import check_all_reorders_for_branch
from app.crud.purchase_order import create_purchase_order


def _pick_supplier_for_ingredient(db: Session, ingredient_id: int) -> SupplierIngredient | None:
    return (
        db.query(SupplierIngredient)
        .filter(SupplierIngredient.ingredient_id == ingredient_id)
        .order_by(SupplierIngredient.is_preferred.desc(), SupplierIngredient.unit_cost.asc())
        .first()
    )


def generate_recommendations_for_branch(db: Session, branch_id: int) -> list[PurchaseOrder]:
    reorder_results = [r for r in check_all_reorders_for_branch(db, branch_id) if r.needs_reorder]
    if not reorder_results:
        return []

    # Group line items by the supplier that would fulfill them, since one PO -> one supplier.
    items_by_supplier: dict[int, list[PurchaseOrderItemCreate]] = defaultdict(list)
    lead_days_by_supplier: dict[int, int] = defaultdict(int)
    skipped_no_supplier: list[str] = []

    for result in reorder_results:
        link = _pick_supplier_for_ingredient(db, result.ingredient_id)
        if link is None:
            skipped_no_supplier.append(result.ingredient_name)
            continue
        lead_days_by_supplier[link.supplier_id] = max(lead_days_by_supplier[link.supplier_id], link.lead_time_days or 0)
        items_by_supplier[link.supplier_id].append(PurchaseOrderItemCreate(
            ingredient_id=result.ingredient_id,
            ordered_quantity=result.suggested_order_quantity,
            unit_cost=float(link.unit_cost),
        ))

    if not items_by_supplier and skipped_no_supplier:
        raise HTTPException(
            status_code=400,
            detail=f"These ingredients need reordering but have no supplier linked yet: "
                   f"{', '.join(skipped_no_supplier)}.",
        )

    created_orders = []
    for supplier_id, items in items_by_supplier.items():
        po = create_purchase_order(
            db,
            PurchaseOrderCreate(
                branch_id=branch_id,
                supplier_id=supplier_id,
                expected_delivery_date=date.today() + timedelta(days=lead_days_by_supplier[supplier_id]),
                notes="Auto-generated from reorder-point check.",
                items=items,
            ),
            is_system_generated=True,
        )
        created_orders.append(po)

    return created_orders
