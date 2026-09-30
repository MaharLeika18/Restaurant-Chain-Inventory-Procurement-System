from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.branch import BranchCreate, BranchUpdate, BranchOut
from app.crud import branch as crud_branch

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.get("/", response_model=list[BranchOut])
def list_branches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_branch.get_branches(db, skip=skip, limit=limit)


@router.post("/", response_model=BranchOut, status_code=201)
def create_branch(branch_in: BranchCreate, db: Session = Depends(get_db)):
    return crud_branch.create_branch(db, branch_in)


@router.get("/{branch_id}", response_model=BranchOut)
def get_branch(branch_id: int, db: Session = Depends(get_db)):
    branch = crud_branch.get_branch(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found.")
    return branch


@router.patch("/{branch_id}", response_model=BranchOut)
def update_branch(branch_id: int, branch_in: BranchUpdate, db: Session = Depends(get_db)):
    branch = crud_branch.get_branch(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found.")
    return crud_branch.update_branch(db, branch, branch_in)


@router.delete("/{branch_id}", status_code=204)
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    branch = crud_branch.get_branch(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found.")
    crud_branch.delete_branch(db, branch)
