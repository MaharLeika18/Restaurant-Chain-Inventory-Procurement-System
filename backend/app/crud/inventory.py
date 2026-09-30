from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.inventory import BranchIngredient, Batch, InventoryTransaction, WasteLog
from app.models.enums import InventoryTransactionType
from app.schemas.inventory import (
    BranchIngredientCreate, BranchIngredientUpdate, BatchCreate,
    InventoryTransactionCreate, WasteLogCreate,
)

# Transaction types that increase current_stock vs. decrease it
_INCREASING = {InventoryTransactionType.RECEIPT, InventoryTransactionType.TRANSFER_IN, InventoryTransactionType.ADJUSTMENT}
_DECREASING = {InventoryTransactionType.CONSUMPTION, InventoryTransactionType.WASTE, InventoryTransactionType.TRANSFER_OUT}


def get_branch_ingredient(db: Session, branch_id: int, ingredient_id: int) -> BranchIngredient | None:
    return (
        db.query(BranchIngredient)
        .filter(BranchIngredient.branch_id == branch_id, BranchIngredient.ingredient_id == ingredient_id)
        .first()
    )


def get_branch_ingredient_by_id(db: Session, branch_ingredient_id: int) -> BranchIngredient | None:
    return db.get(BranchIngredient, branch_ingredient_id)


def get_branch_inventory(db: Session, branch_id: int, category_id: int | None = None) -> list[BranchIngredient]:
    from app.models.ingredient import Ingredient

    query = db.query(BranchIngredient).filter(BranchIngredient.branch_id == branch_id)
    if category_id is not None:
        query = query.join(Ingredient, Ingredient.ingredient_id == BranchIngredient.ingredient_id).filter(
            Ingredient.category_id == category_id
        )
    return query.all()


def create_branch_ingredient(db: Session, data_in: BranchIngredientCreate) -> BranchIngredient:
    existing = get_branch_ingredient(db, data_in.branch_id, data_in.ingredient_id)
    if existing:
        raise HTTPException(status_code=409, detail="This ingredient is already tracked for this branch.")
    row = BranchIngredient(**data_in.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_branch_ingredient(
    db: Session, row: BranchIngredient, data_in: BranchIngredientUpdate
) -> BranchIngredient:
    for field, value in data_in.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


def _refresh_nearest_expiry(db: Session, branch_id: int, ingredient_id: int) -> None:
    """Recompute BranchIngredient.nearest_expiry_date from currently-available batches."""
    branch_ingredient = get_branch_ingredient(db, branch_id, ingredient_id)
    if branch_ingredient is None:
        return
    soonest = (
        db.query(func.min(Batch.expiration_date))
        .filter(
            Batch.branch_id == branch_id,
            Batch.ingredient_id == ingredient_id,
            Batch.quantity_remaining > 0,
            Batch.expiration_date.isnot(None),
        )
        .scalar()
    )
    branch_ingredient.nearest_expiry_date = soonest


def create_batch(db: Session, batch_in: BatchCreate) -> Batch:
    """
    Receive a new lot of an ingredient at a branch: creates the Batch row,
    bumps (or creates) the BranchIngredient running total, writes a RECEIPT
    transaction to the ledger, and refreshes the branch's nearest-expiry cache.
    """
    batch = Batch(**batch_in.model_dump(), quantity_remaining=batch_in.quantity_received)
    db.add(batch)
    db.flush()  # get batch.batch_id without committing yet

    branch_ingredient = get_branch_ingredient(db, batch_in.branch_id, batch_in.ingredient_id)
    if branch_ingredient is None:
        branch_ingredient = BranchIngredient(
            branch_id=batch_in.branch_id,
            ingredient_id=batch_in.ingredient_id,
            current_stock=0,
        )
        db.add(branch_ingredient)
        db.flush()

    branch_ingredient.current_stock = float(branch_ingredient.current_stock) + batch_in.quantity_received

    transaction = InventoryTransaction(
        branch_id=batch_in.branch_id,
        ingredient_id=batch_in.ingredient_id,
        batch_id=batch.batch_id,
        transaction_type=InventoryTransactionType.RECEIPT,
        quantity=batch_in.quantity_received,
        reference=f"batch:{batch.batch_id}",
        notes=f"Batch received{f' (lot {batch_in.lot_number})' if batch_in.lot_number else ''}",
    )
    db.add(transaction)

    db.flush()
    _refresh_nearest_expiry(db, batch_in.branch_id, batch_in.ingredient_id)

    db.commit()
    db.refresh(batch)
    return batch


def get_batches_for_ingredient(
    db: Session, branch_id: int, ingredient_id: int, only_available: bool = True
) -> list[Batch]:
    query = db.query(Batch).filter(Batch.branch_id == branch_id, Batch.ingredient_id == ingredient_id)
    if only_available:
        query = query.filter(Batch.quantity_remaining > 0)
    # FIFO by default; expiring-soonest-first is the usual pick strategy for perishables
    return query.order_by(Batch.expiration_date.asc().nulls_last(), Batch.received_date.asc()).all()


def get_expiring_batches(db: Session, branch_id: int, within_days: int = 7) -> list[Batch]:
    cutoff = date.today() + timedelta(days=within_days)
    return (
        db.query(Batch)
        .filter(
            Batch.branch_id == branch_id,
            Batch.quantity_remaining > 0,
            Batch.expiration_date.isnot(None),
            Batch.expiration_date <= cutoff,
        )
        .order_by(Batch.expiration_date.asc())
        .all()
    )


def _consume_from_batches(
    db: Session, branch_id: int, ingredient_id: int, quantity: float, batch_id: int | None = None
) -> None:
    """
    Draw `quantity` out of the available batches. If `batch_id` is given,
    draw only from that specific lot (used when waste is tied to a known
    batch); otherwise draw FIFO/soonest-expiring-first across all batches.
    """
    remaining_to_consume = quantity
    if batch_id is not None:
        batch = db.get(Batch, batch_id)
        if batch is None:
            raise HTTPException(status_code=404, detail="Batch not found.")
        take = min(float(batch.quantity_remaining), remaining_to_consume)
        batch.quantity_remaining = float(batch.quantity_remaining) - take
        remaining_to_consume -= take
    else:
        for batch in get_batches_for_ingredient(db, branch_id, ingredient_id, only_available=True):
            if remaining_to_consume <= 0:
                break
            take = min(float(batch.quantity_remaining), remaining_to_consume)
            batch.quantity_remaining = float(batch.quantity_remaining) - take
            remaining_to_consume -= take
    # If batches don't fully cover the quantity (e.g. no batch history seeded),
    # we still trust the branch-level total rather than blocking the request.


def record_transaction(db: Session, txn_in: InventoryTransactionCreate) -> InventoryTransaction:
    """
    Record a CONSUMPTION / TRANSFER_OUT / TRANSFER_IN / ADJUSTMENT movement,
    updating the branch's running stock total. For WASTE, prefer
    crud.inventory.create_waste_log() instead, which also records the reason.
    """
    branch_ingredient = get_branch_ingredient(db, txn_in.branch_id, txn_in.ingredient_id)
    if branch_ingredient is None:
        if txn_in.transaction_type in _INCREASING:
            # e.g. first-ever TRANSFER_IN of an ingredient a branch hasn't stocked before
            branch_ingredient = BranchIngredient(
                branch_id=txn_in.branch_id, ingredient_id=txn_in.ingredient_id, current_stock=0,
            )
            db.add(branch_ingredient)
            db.flush()
        else:
            raise HTTPException(status_code=404, detail="This ingredient is not tracked for this branch yet.")

    if txn_in.transaction_type in _DECREASING:
        if float(branch_ingredient.current_stock) < txn_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock: have {branch_ingredient.current_stock}, "
                       f"requested {txn_in.quantity}.",
            )
        _consume_from_batches(db, txn_in.branch_id, txn_in.ingredient_id, txn_in.quantity, txn_in.batch_id)
        branch_ingredient.current_stock = float(branch_ingredient.current_stock) - txn_in.quantity
    elif txn_in.transaction_type in _INCREASING:
        branch_ingredient.current_stock = float(branch_ingredient.current_stock) + txn_in.quantity
    else:
        raise HTTPException(status_code=400, detail="Unsupported transaction type for this endpoint.")

    transaction = InventoryTransaction(**txn_in.model_dump())
    db.add(transaction)
    db.flush()
    _refresh_nearest_expiry(db, txn_in.branch_id, txn_in.ingredient_id)

    db.commit()
    db.refresh(transaction)
    return transaction


def create_waste_log(db: Session, waste_in: WasteLogCreate) -> WasteLog:
    """Record spoiled/damaged/expired stock: deducts inventory (FIFO, or a
    specific batch if given), writes a WASTE ledger entry, and logs the reason."""
    branch_ingredient = get_branch_ingredient(db, waste_in.branch_id, waste_in.ingredient_id)
    if branch_ingredient is None:
        raise HTTPException(status_code=404, detail="This ingredient is not tracked for this branch yet.")
    if float(branch_ingredient.current_stock) < waste_in.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stock to waste: have {branch_ingredient.current_stock}, "
                   f"requested {waste_in.quantity}.",
        )

    _consume_from_batches(db, waste_in.branch_id, waste_in.ingredient_id, waste_in.quantity, waste_in.batch_id)
    branch_ingredient.current_stock = float(branch_ingredient.current_stock) - waste_in.quantity

    transaction = InventoryTransaction(
        branch_id=waste_in.branch_id,
        ingredient_id=waste_in.ingredient_id,
        batch_id=waste_in.batch_id,
        transaction_type=InventoryTransactionType.WASTE,
        quantity=waste_in.quantity,
        notes=f"Waste: {waste_in.reason.value}" + (f" - {waste_in.notes}" if waste_in.notes else ""),
        recorded_by=waste_in.recorded_by,
    )
    db.add(transaction)
    db.flush()

    waste_log = WasteLog(
        branch_id=waste_in.branch_id,
        ingredient_id=waste_in.ingredient_id,
        batch_id=waste_in.batch_id,
        transaction_id=transaction.transaction_id,
        quantity=waste_in.quantity,
        reason=waste_in.reason,
        notes=waste_in.notes,
        recorded_by=waste_in.recorded_by,
    )
    db.add(waste_log)
    _refresh_nearest_expiry(db, waste_in.branch_id, waste_in.ingredient_id)

    db.commit()
    db.refresh(waste_log)
    return waste_log


def get_waste_logs(db: Session, branch_id: int, ingredient_id: int | None = None, limit: int = 200) -> list[WasteLog]:
    query = db.query(WasteLog).filter(WasteLog.branch_id == branch_id)
    if ingredient_id is not None:
        query = query.filter(WasteLog.ingredient_id == ingredient_id)
    return query.order_by(WasteLog.waste_date.desc()).limit(limit).all()


def get_transactions(
    db: Session, branch_id: int, ingredient_id: int | None = None, limit: int = 200
) -> list[InventoryTransaction]:
    query = db.query(InventoryTransaction).filter(InventoryTransaction.branch_id == branch_id)
    if ingredient_id is not None:
        query = query.filter(InventoryTransaction.ingredient_id == ingredient_id)
    return query.order_by(InventoryTransaction.transaction_date.desc()).limit(limit).all()
