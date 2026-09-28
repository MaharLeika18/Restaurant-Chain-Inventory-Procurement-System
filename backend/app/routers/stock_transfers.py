from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.stock_transfer import StockTransferCreate, StockTransferOut, StockTransferUpdateStatus
from app.models.enums import StockTransferStatus, UserRole
from app.crud import stock_transfer as crud_transfer
from app.services.auth import require_role

router = APIRouter(prefix="/stock-transfers", tags=["Stock Transfers"])


@router.get("/", response_model=list[StockTransferOut])
def list_transfers(branch_id: int | None = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List transfers, optionally filtered to ones where a branch is either the source or destination."""
    return crud_transfer.get_transfers(db, branch_id=branch_id, skip=skip, limit=limit)


@router.post("/", response_model=StockTransferOut, status_code=201)
def create_transfer(transfer_in: StockTransferCreate, db: Session = Depends(get_db)):
    """Request moving excess stock from one branch to another that's running low."""
    return crud_transfer.create_transfer(db, transfer_in)


@router.get("/{transfer_id}", response_model=StockTransferOut)
def get_transfer(transfer_id: int, db: Session = Depends(get_db)):
    transfer = crud_transfer.get_transfer(db, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found.")
    return transfer


@router.patch("/{transfer_id}/status", response_model=StockTransferOut)
def update_transfer_status(transfer_id: int, status_in: StockTransferUpdateStatus, db: Session = Depends(get_db)):
    """
    Drives the transfer lifecycle: REQUESTED -> APPROVED -> IN_TRANSIT ->
    COMPLETED (or CANCELLED along the way). Moving to COMPLETED is what
    actually deducts stock from the source branch and adds it to the
    destination branch's inventory. See /approve and /receive below for
    single-purpose shortcuts to the two manager-facing transitions.
    """
    transfer = crud_transfer.get_transfer(db, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found.")
    return crud_transfer.update_transfer_status(db, transfer, status_in)


@router.post("/{transfer_id}/approve", response_model=StockTransferOut)
def approve_transfer(
    transfer_id: int, approved_by: int | None = None, db: Session = Depends(get_db),
    current_user=Depends(require_role(UserRole.MANAGER, UserRole.ADMIN)),
):
    """approveTransfer: REQUESTED -> APPROVED. Requires a MANAGER or ADMIN login."""
    transfer = crud_transfer.get_transfer(db, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found.")
    return crud_transfer.update_transfer_status(
        db, transfer,
        StockTransferUpdateStatus(
            status=StockTransferStatus.APPROVED,
            approved_by=approved_by if approved_by is not None else current_user.employee_id,
        ),
    )


@router.post("/{transfer_id}/in-transit", response_model=StockTransferOut)
def mark_in_transit(transfer_id: int, db: Session = Depends(get_db)):
    """APPROVED -> IN_TRANSIT, once the sending branch has dispatched the stock."""
    transfer = crud_transfer.get_transfer(db, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found.")
    return crud_transfer.update_transfer_status(
        db, transfer, StockTransferUpdateStatus(status=StockTransferStatus.IN_TRANSIT)
    )


@router.post("/{transfer_id}/receive", response_model=StockTransferOut)
def receive_transfer(transfer_id: int, db: Session = Depends(get_db)):
    """receiveTransfer: IN_TRANSIT -> COMPLETED. This is what actually moves the stock."""
    transfer = crud_transfer.get_transfer(db, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found.")
    return crud_transfer.update_transfer_status(
        db, transfer, StockTransferUpdateStatus(status=StockTransferStatus.COMPLETED)
    )
