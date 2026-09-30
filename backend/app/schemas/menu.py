from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class RecipeIngredientBase(BaseModel):
    ingredient_id: int
    quantity_required: float = Field(gt=0)


class RecipeIngredientCreate(RecipeIngredientBase):
    pass


class RecipeIngredientOut(RecipeIngredientBase):
    model_config = ConfigDict(from_attributes=True)
    recipe_id: int
    menu_item_id: int


class MenuBase(BaseModel):
    dish_name: str
    description: str | None = None
    price: float = Field(ge=0)
    is_active: bool = True


class MenuCreate(MenuBase):
    recipe: list[RecipeIngredientCreate] = []


class MenuUpdate(BaseModel):
    dish_name: str | None = None
    description: str | None = None
    price: float | None = None
    is_active: bool | None = None


class MenuOut(MenuBase):
    model_config = ConfigDict(from_attributes=True)

    menu_item_id: int
    created_at: datetime
    recipe: list[RecipeIngredientOut] = []
