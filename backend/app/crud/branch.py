from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchUpdate


def get_branch(db: Session, branch_id: int) -> Branch | None:
    return db.get(Branch, branch_id)


def get_branches(db: Session, skip: int = 0, limit: int = 100) -> list[Branch]:
    return db.query(Branch).offset(skip).limit(limit).all()


def create_branch(db: Session, branch_in: BranchCreate) -> Branch:
    branch = Branch(**branch_in.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


def update_branch(db: Session, branch: Branch, branch_in: BranchUpdate) -> Branch:
    for field, value in branch_in.model_dump(exclude_unset=True).items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch


def delete_branch(db: Session, branch: Branch) -> None:
    db.delete(branch)
    db.commit()
