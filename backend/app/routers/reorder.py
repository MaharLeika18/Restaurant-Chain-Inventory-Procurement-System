from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.inventory import ReorderCheckOut
from app.schemas.forecast import ReorderPredictionOut
from app.crud.inventory import get_branch_ingredient_by_id
from app.services import reorder as reorder_service

router = APIRouter(prefix="/reorder", tags=["Reorder Recommendations"])


@router.get("/branch/{branch_id}", response_model=list[ReorderCheckOut])
def check_branch_reorders(branch_id: int, db: Session = Depends(get_db)):
    """Live reorder-point check across every ingredient tracked at a branch (not persisted)."""
    return reorder_service.check_all_reorders_for_branch(db, branch_id)


@router.get("/branch-ingredient/{branch_ingredient_id}", response_model=ReorderCheckOut)
def check_single_reorder(branch_ingredient_id: int, db: Session = Depends(get_db)):
    row = get_branch_ingredient_by_id(db, branch_ingredient_id)
    if not row:
        raise HTTPException(status_code=404, detail="Branch ingredient record not found.")
    return reorder_service.check_reorder(db, row, row.ingredient)


@router.post("/branch/{branch_id}/generate", response_model=list[ReorderPredictionOut], status_code=201)
def generate_and_save_predictions(branch_id: int, db: Session = Depends(get_db)):
    """Runs the check for every ingredient and persists a ReorderPrediction snapshot per ingredient (dashboard action)."""
    return reorder_service.save_reorder_predictions_for_branch(db, branch_id)


@router.get("/branch/{branch_id}/history", response_model=list[ReorderPredictionOut])
def reorder_prediction_history(branch_id: int, ingredient_id: int | None = None, limit: int = 50, db: Session = Depends(get_db)):
    return reorder_service.get_reorder_prediction_history(db, branch_id, ingredient_id, limit)
