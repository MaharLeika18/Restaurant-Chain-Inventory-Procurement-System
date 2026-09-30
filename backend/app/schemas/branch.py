from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BranchBase(BaseModel):
    branch_name: str
    address: str | None = None
    contact_number: str | None = None


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    branch_name: str | None = None
    address: str | None = None
    contact_number: str | None = None


class BranchOut(BranchBase):
    model_config = ConfigDict(from_attributes=True)

    branch_id: int
    created_at: datetime
