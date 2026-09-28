from datetime import datetime, date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.inventory import BranchIngredient, Batch, InventoryTransaction, WasteLog
from app.models.ingredient import Ingredient
from app.models.purchase_order import PurchaseOrder
from app.models.enums import InventoryTransactionType, PurchaseOrderStatus
from app.schemas.forecast import (
    InventoryValuationOut, InventoryValuationItem, SupplierPerformanceOut,
)
from app.schemas.reports import (
    ConsumptionItem, ConsumptionReportOut, WasteReportItem, WasteReportOut, SummaryReportOut,
)
from app.services.reorder import check_all_reorders_for_branch


def consumption_report(db: Session, branch_id: int, period_days: int = 30) -> ConsumptionReportOut:
    since = datetime.utcnow() - timedelta(days=period_days)
    rows = (
        db.query(
            InventoryTransaction.ingredient_id,
            Ingredient.ingredient_name,
            func.sum(InventoryTransaction.quantity).label("total"),
        )
        .join(Ingredient, Ingredient.ingredient_id == InventoryTransaction.ingredient_id)
        .filter(
            InventoryTransaction.branch_id == branch_id,
            InventoryTransaction.transaction_type == InventoryTransactionType.CONSUMPTION,
            InventoryTransaction.transaction_date >= since,
        )
        .group_by(InventoryTransaction.ingredient_id, Ingredient.ingredient_name)
        .all()
    )
    items = [
        ConsumptionItem(
            ingredient_id=r.ingredient_id,
            ingredient_name=r.ingredient_name,
            total_consumed=round(float(r.total), 3),
            average_daily=round(float(r.total) / period_days, 3),
        )
        for r in rows
    ]
    return ConsumptionReportOut(branch_id=branch_id, period_days=period_days, items=items)


def inventory_valuation(db: Session, branch_id: int) -> InventoryValuationOut:
    rows = (
        db.query(
            Batch.ingredient_id,
            Ingredient.ingredient_name,
            func.sum(Batch.quantity_remaining).label("qty"),
            func.sum(Batch.quantity_remaining * Batch.unit_cost).label("value"),
        )
        .join(Ingredient, Ingredient.ingredient_id == Batch.ingredient_id)
        .filter(Batch.branch_id == branch_id, Batch.quantity_remaining > 0)
        .group_by(Batch.ingredient_id, Ingredient.ingredient_name)
        .all()
    )
    items = [
        InventoryValuationItem(
            ingredient_id=r.ingredient_id,
            ingredient_name=r.ingredient_name,
            total_quantity=round(float(r.qty), 3),
            total_value=round(float(r.value), 2),
        )
        for r in rows
    ]
    return InventoryValuationOut(
        branch_id=branch_id,
        as_of_date=date.today(),
        items=items,
        total_inventory_value=round(sum(i.total_value for i in items), 2),
    )


def waste_report(db: Session, branch_id: int, period_days: int = 30) -> WasteReportOut:
    since = datetime.utcnow() - timedelta(days=period_days)
    rows = (
        db.query(WasteLog, Ingredient.ingredient_name, Batch.unit_cost)
        .join(Ingredient, Ingredient.ingredient_id == WasteLog.ingredient_id)
        .outerjoin(Batch, Batch.batch_id == WasteLog.batch_id)
        .filter(WasteLog.branch_id == branch_id, WasteLog.waste_date >= since)
        .all()
    )
    by_ingredient: dict[int, dict] = {}
    for waste, ingredient_name, unit_cost in rows:
        bucket = by_ingredient.setdefault(waste.ingredient_id, {
            "ingredient_name": ingredient_name, "quantity": 0.0, "cost": 0.0, "count": 0,
        })
        bucket["quantity"] += float(waste.quantity)
        bucket["cost"] += float(waste.quantity) * float(unit_cost or 0)
        bucket["count"] += 1

    items = [
        WasteReportItem(
            ingredient_id=ingredient_id,
            ingredient_name=b["ingredient_name"],
            total_quantity_wasted=round(b["quantity"], 3),
            estimated_cost=round(b["cost"], 2),
            incident_count=b["count"],
        )
        for ingredient_id, b in by_ingredient.items()
    ]
    return WasteReportOut(
        branch_id=branch_id,
        period_days=period_days,
        items=items,
        total_estimated_cost=round(sum(i.estimated_cost for i in items), 2),
    )


def supplier_performance(db: Session, supplier_id: int | None = None) -> list[SupplierPerformanceOut]:
    from app.models.supplier import Supplier

    query = db.query(PurchaseOrder).filter(PurchaseOrder.status == PurchaseOrderStatus.RECEIVED)
    if supplier_id is not None:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    received_orders = query.all()

    by_supplier: dict[int, dict] = {}
    for po in received_orders:
        bucket = by_supplier.setdefault(po.supplier_id, {"total": 0, "on_time": 0, "late": 0})
        bucket["total"] += 1
        if po.expected_delivery_date and po.actual_delivery_date:
            if po.actual_delivery_date <= po.expected_delivery_date:
                bucket["on_time"] += 1
            else:
                bucket["late"] += 1

    results = []
    for sid, b in by_supplier.items():
        supplier = db.get(Supplier, sid)
        rate = (b["on_time"] / b["total"]) if b["total"] > 0 else 0.0
        results.append(SupplierPerformanceOut(
            supplier_id=sid,
            supplier_name=supplier.supplier_name if supplier else "Unknown",
            total_purchase_orders=b["total"],
            total_delivered_on_time=b["on_time"],
            total_delivered_late=b["late"],
            on_time_delivery_rate=round(rate, 3),
        ))
    return results


def summary_report(db: Session, branch_id: int) -> SummaryReportOut:
    reorder_results = check_all_reorders_for_branch(db, branch_id)
    low_stock_count = sum(1 for r in reorder_results if r.needs_reorder)

    pending_pos = (
        db.query(func.count(PurchaseOrder.po_id))
        .filter(PurchaseOrder.branch_id == branch_id, PurchaseOrder.status == PurchaseOrderStatus.PENDING_APPROVAL)
        .scalar()
    )

    cutoff = date.today() + timedelta(days=7)
    expiring_count = (
        db.query(func.count(Batch.batch_id))
        .filter(
            Batch.branch_id == branch_id, Batch.quantity_remaining > 0,
            Batch.expiration_date.isnot(None), Batch.expiration_date <= cutoff,
        )
        .scalar()
    )

    valuation = inventory_valuation(db, branch_id)
    waste = waste_report(db, branch_id, period_days=7)

    return SummaryReportOut(
        branch_id=branch_id,
        as_of=date.today(),
        low_stock_count=low_stock_count,
        pending_purchase_orders=pending_pos or 0,
        expiring_batches_next_7_days=expiring_count or 0,
        total_inventory_value=valuation.total_inventory_value,
        waste_cost_last_7_days=waste.total_estimated_cost,
    )
