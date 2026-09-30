from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

from app.models.enums import UserRole


class EmployeeBase(BaseModel):
    branch_id: int
    full_name: str
    position: str | None = None
    contact_number: str | None = None
    hire_date: date | None = None
    is_active: bool = True


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    branch_id: int | None = None
    full_name: str | None = None
    position: str | None = None
    contact_number: str | None = None
    hire_date: date | None = None
    is_active: bool | None = None


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    employee_id: int
    created_at: datetime


class UserCreate(BaseModel):
    employee_id: int
    username: str
    password: str  # plaintext in the request; the API hashes it before storing
    role: UserRole


class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None  # plaintext; re-hashed if provided
    role: UserRole | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    employee_id: int
    username: str
    role: UserRole
    last_login: datetime | None
    created_at: datetime
