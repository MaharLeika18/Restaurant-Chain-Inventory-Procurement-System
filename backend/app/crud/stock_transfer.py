from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.stock_transfer import StockTransfer, StockTransferItem
from app.models.enums import StockTransferStatus, InventoryTransactionType
from app.schemas.stock_transfer import StockTransferCreate, StockTransferUpdateStatus
from app.schemas.inventory import InventoryTransactionCreate
from app.crud.inventory import record_transaction, get_branch_ingredient

_VALID_TRANSITIONS: dict[StockTransferStatus, set[StockTransferStatus]] = {
    StockTransferStatus.REQUESTED: {StockTransferStatus.APPROVED, StockTransferStatus.CANCELLED},
    StockTransferStatus.APPROVED: {StockTransferStatus.IN_TRANSIT, StockTransferStatus.CANCELLED},
    StockTransferStatus.IN_TRANSIT: {StockTransferStatus.COMPLETED},
    StockTransferStatus.COMPLETED: set(),
    StockTransferStatus.CANCELLED: set(),
}


def get_transfer(db: Session, transfer_id: int) -> StockTransfer | None:
    return (
        db.query(StockTransfer)
        .options(joinedload(StockTransfer.items))
        .filter(StockTransfer.transfer_id == transfer_id)
        .first()
    )


def get_transfers(db: Session, branch_id: int | None = None, skip: int = 0, limit: int = 100) -> list[StockTransfer]:
    query = db.query(StockTransfer).options(joinedload(StockTransfer.items))
    if branch_id is not None:
        query = query.filter(
            (StockTransfer.from_branch_id == branch_id) | (StockTransfer.to_branch_id == branch_id)
        )
    return query.order_by(StockTransfer.requested_at.desc()).offset(skip).limit(limit).all()


def create_transfer(db: Session, transfer_in: StockTransferCreate) -> StockTransfer:
    if transfer_in.from_branch_id == transfer_in.to_branch_id:
        raise HTTPException(status_code=400, detail="Source and destination branch must be different.")
    if not transfer_in.items:
        raise HTTPException(status_code=400, detail="A transfer needs at least one line item.")

    # Make sure the sending branch actually has enough of each ingredient before we let it be requested.
    for item in transfer_in.items:
        source_stock = get_branch_ingredient(db, transfer_in.from_branch_id, item.ingredient_id)
        available = float(source_stock.current_stock) if source_stock else 0
        if available < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Source branch only has {available} of ingredient {item.ingredient_id}, "
                       f"cannot request {item.quantity}.",
            )

    transfer = StockTransfer(
        from_branch_id=transfer_in.from_branch_id,
        to_branch_id=transfer_in.to_branch_id,
        requested_by=transfer_in.requested_by,
        notes=transfer_in.notes,
        status=StockTransferStatus.REQUESTED,
    )
    for item_in in transfer_in.items:
        transfer.items.append(StockTransferItem(ingredient_id=item_in.ingredient_id, quantity=item_in.quantity))

    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return transfer


def update_transfer_status(
    db: Session, transfer: StockTransfer, status_in: StockTransferUpdateStatus
) -> StockTransfer:
    allowed_next = _VALID_TRANSITIONS.get(transfer.status, set())
    if status_in.status not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move a transfer from {transfer.status.value} to {status_in.status.value}.",
        )

    if status_in.status == StockTransferStatus.COMPLETED:
        # Move the stock for real: TRANSFER_OUT from source, TRANSFER_IN to destination.
        for item in transfer.items:
            record_transaction(db, InventoryTransactionCreate(
                branch_id=transfer.from_branch_id,
                ingredient_id=item.ingredient_id,
                transaction_type=InventoryTransactionType.TRANSFER_OUT,
                quantity=float(item.quantity),
                notes=f"Stock transfer #{transfer.transfer_id} to branch {transfer.to_branch_id}",
            ))
            record_transaction(db, InventoryTransactionCreate(
                branch_id=transfer.to_branch_id,
                ingredient_id=item.ingredient_id,
                transaction_type=InventoryTransactionType.TRANSFER_IN,
                quantity=float(item.quantity),
                notes=f"Stock transfer #{transfer.transfer_id} from branch {transfer.from_branch_id}",
            ))
        transfer.completed_at = datetime.utcnow()

    if status_in.status == StockTransferStatus.APPROVED:
        transfer.approved_by = status_in.approved_by

    transfer.status = status_in.status
    db.commit()
    db.refresh(transfer)
    return transfer
