from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.inventory import (
    BranchIngredientCreate, BranchIngredientUpdate, BranchIngredientOut,
    BatchCreate, BatchOut,
    InventoryTransactionCreate, InventoryTransactionOut,
    WasteLogCreate, WasteLogOut,
)
from app.models.enums import InventoryTransactionType
from app.crud import inventory as crud_inventory

router = APIRouter(prefix="/inventory", tags=["Inventory Operations"])


@router.get("/branch/{branch_id}", response_model=list[BranchIngredientOut])
def get_current_stock(branch_id: int, category_id: int | None = None, db: Session = Depends(get_db)):
    """getCurrentStock, with optional filterByCategory via ?category_id=."""
    return crud_inventory.get_branch_inventory(db, branch_id, category_id=category_id)


@router.post("/branch-ingredient", response_model=BranchIngredientOut, status_code=201)
def start_tracking_ingredient(data_in: BranchIngredientCreate, db: Session = Depends(get_db)):
    """Start tracking a new ingredient at a branch (sets PAR level / opening stock)."""
    return crud_inventory.create_branch_ingredient(db, data_in)


@router.patch("/branch-ingredient/{branch_ingredient_id}", response_model=BranchIngredientOut)
def update_par_level(branch_ingredient_id: int, data_in: BranchIngredientUpdate, db: Session = Depends(get_db)):
    row = crud_inventory.get_branch_ingredient_by_id(db, branch_ingredient_id)
    if not row:
        raise HTTPException(status_code=404, detail="Branch ingredient record not found.")
    return crud_inventory.update_branch_ingredient(db, row, data_in)


@router.post("/batches", response_model=BatchOut, status_code=201)
def create_batch(batch_in: BatchCreate, db: Session = Depends(get_db)):
    """createBatch: record a newly received lot (outside of a formal PO, e.g. a walk-in delivery)."""
    return crud_inventory.create_batch(db, batch_in)


@router.get("/batches/branch/{branch_id}/ingredient/{ingredient_id}", response_model=list[BatchOut])
def list_batches(branch_id: int, ingredient_id: int, only_available: bool = True, db: Session = Depends(get_db)):
    return crud_inventory.get_batches_for_ingredient(db, branch_id, ingredient_id, only_available)


@router.get("/batches/branch/{branch_id}/expiring", response_model=list[BatchOut])
def expiration_tracking(branch_id: int, within_days: int = 7, db: Session = Depends(get_db)):
    return crud_inventory.get_expiring_batches(db, branch_id, within_days)


@router.post("/transactions", response_model=InventoryTransactionOut, status_code=201)
def record_inventory(txn_in: InventoryTransactionCreate, db: Session = Depends(get_db)):
    """
    recordInventory: general-purpose stock movement (CONSUMPTION, ADJUSTMENT,
    TRANSFER_IN/OUT). For a manual stock-count correction specifically, use
    POST /inventory/adjustments below - same effect, clearer intent in logs.
    For waste, use POST /inventory/waste instead (captures a reason).
    """
    return crud_inventory.record_transaction(db, txn_in)


@router.post("/adjustments", response_model=InventoryTransactionOut, status_code=201)
def record_adjustment(txn_in: InventoryTransactionCreate, db: Session = Depends(get_db)):
    """recordAdjustment: same as recordInventory, forced to type=ADJUSTMENT (stock count corrections)."""
    txn_in = txn_in.model_copy(update={"transaction_type": InventoryTransactionType.ADJUSTMENT})
    return crud_inventory.record_transaction(db, txn_in)


@router.get("/transactions/branch/{branch_id}", response_model=list[InventoryTransactionOut])
def list_transactions(branch_id: int, ingredient_id: int | None = None, limit: int = 200, db: Session = Depends(get_db)):
    return crud_inventory.get_transactions(db, branch_id, ingredient_id, limit)


@router.post("/waste", response_model=WasteLogOut, status_code=201)
def record_waste(waste_in: WasteLogCreate, db: Session = Depends(get_db)):
    """recordWaste: deducts stock and logs the reason (expired, spoiled, damaged, prep error, other)."""
    return crud_inventory.create_waste_log(db, waste_in)


@router.get("/waste/branch/{branch_id}", response_model=list[WasteLogOut])
def list_waste_logs(branch_id: int, ingredient_id: int | None = None, limit: int = 200, db: Session = Depends(get_db)):
    return crud_inventory.get_waste_logs(db, branch_id, ingredient_id, limit)
