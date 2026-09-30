from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SupplierBase(BaseModel):
    supplier_name: str
    contact_person: str | None = None
    contact_number: str | None = None
    email: str | None = None
    address: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    supplier_name: str | None = None
    contact_person: str | None = None
    contact_number: str | None = None
    email: str | None = None
    address: str | None = None


class SupplierOut(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    supplier_id: int
    created_at: datetime


class SupplierIngredientBase(BaseModel):
    supplier_id: int
    ingredient_id: int
    unit_cost: float
    lead_time_days: int = 3
    is_preferred: bool = False


class SupplierIngredientCreate(SupplierIngredientBase):
    pass


class SupplierIngredientUpdate(BaseModel):
    unit_cost: float | None = None
    lead_time_days: int | None = None
    is_preferred: bool | None = None


class SupplierIngredientOut(SupplierIngredientBase):
    model_config = ConfigDict(from_attributes=True)
    supplier_ingredient_id: int
