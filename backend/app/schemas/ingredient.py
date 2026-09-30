from datetime import datetime
from pydantic import BaseModel, ConfigDict


class IngredientCategoryBase(BaseModel):
    category_name: str


class IngredientCategoryCreate(IngredientCategoryBase):
    pass


class IngredientCategoryOut(IngredientCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    category_id: int


class IngredientBase(BaseModel):
    ingredient_name: str
    unit_of_measure: str
    category_id: int | None = None
    is_perishable: bool = True


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(BaseModel):
    ingredient_name: str | None = None
    unit_of_measure: str | None = None
    category_id: int | None = None
    is_perishable: bool | None = None


class IngredientOut(IngredientBase):
    model_config = ConfigDict(from_attributes=True)

    ingredient_id: int
    created_at: datetime
