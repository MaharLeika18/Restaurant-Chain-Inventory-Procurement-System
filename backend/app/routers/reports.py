from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.inventory import ReorderCheckOut
from app.schemas.reports import ConsumptionReportOut, WasteReportOut, SummaryReportOut
from app.schemas.forecast import InventoryValuationOut, SupplierPerformanceOut
from app.schemas.inventory import BatchOut
from app.services import reports as report_service
from app.services import reorder as reorder_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard / Reports"])


@router.get("/branch/{branch_id}/low-stock", response_model=list[ReorderCheckOut])
def low_stock(branch_id: int, db: Session = Depends(get_db)):
    return [r for r in reorder_service.check_all_reorders_for_branch(db, branch_id) if r.needs_reorder]


@router.get("/branch/{branch_id}/consumption", response_model=ConsumptionReportOut)
def consumption(branch_id: int, period_days: int = 30, db: Session = Depends(get_db)):
    return report_service.consumption_report(db, branch_id, period_days)


@router.get("/branch/{branch_id}/inventory-valuation", response_model=InventoryValuationOut)
def inventory_valuation(branch_id: int, db: Session = Depends(get_db)):
    return report_service.inventory_valuation(db, branch_id)


@router.get("/branch/{branch_id}/waste-report", response_model=WasteReportOut)
def waste(branch_id: int, period_days: int = 30, db: Session = Depends(get_db)):
    return report_service.waste_report(db, branch_id, period_days)


@router.get("/branch/{branch_id}/expiration-tracking", response_model=list[BatchOut])
def expiration_tracking(branch_id: int, within_days: int = 7, db: Session = Depends(get_db)):
    from app.crud.inventory import get_expiring_batches
    return get_expiring_batches(db, branch_id, within_days)


@router.get("/supplier-performance", response_model=list[SupplierPerformanceOut])
def supplier_performance(supplier_id: int | None = None, db: Session = Depends(get_db)):
    return report_service.supplier_performance(db, supplier_id)


@router.get("/branch/{branch_id}/summary", response_model=SummaryReportOut)
def summary(branch_id: int, db: Session = Depends(get_db)):
    """Rolls up low-stock count, pending POs, expiring batches, inventory value, and recent waste cost."""
    return report_service.summary_report(db, branch_id)
