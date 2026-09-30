from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient, IngredientCategory
from app.schemas.ingredient import IngredientCreate, IngredientUpdate, IngredientCategoryCreate


def get_ingredient(db: Session, ingredient_id: int) -> Ingredient | None:
    return db.get(Ingredient, ingredient_id)


def get_ingredients(db: Session, category_id: int | None = None, skip: int = 0, limit: int = 100) -> list[Ingredient]:
    query = db.query(Ingredient)
    if category_id is not None:
        query = query.filter(Ingredient.category_id == category_id)
    return query.offset(skip).limit(limit).all()


def create_ingredient(db: Session, ingredient_in: IngredientCreate) -> Ingredient:
    ingredient = Ingredient(**ingredient_in.model_dump())
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient


def update_ingredient(db: Session, ingredient: Ingredient, ingredient_in: IngredientUpdate) -> Ingredient:
    for field, value in ingredient_in.model_dump(exclude_unset=True).items():
        setattr(ingredient, field, value)
    db.commit()
    db.refresh(ingredient)
    return ingredient


def delete_ingredient(db: Session, ingredient: Ingredient) -> None:
    db.delete(ingredient)
    db.commit()


def get_categories(db: Session) -> list[IngredientCategory]:
    return db.query(IngredientCategory).all()


def create_category(db: Session, category_in: IngredientCategoryCreate) -> IngredientCategory:
    category = IngredientCategory(**category_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
