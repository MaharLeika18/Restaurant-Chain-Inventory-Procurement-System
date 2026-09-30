from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ingredient import (
    IngredientCreate, IngredientUpdate, IngredientOut,
    IngredientCategoryCreate, IngredientCategoryOut,
)
from app.crud import ingredient as crud_ingredient

router = APIRouter(prefix="/ingredients", tags=["Ingredients"])


@router.get("/", response_model=list[IngredientOut])
def list_ingredients(category_id: int | None = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """filterByCategory via ?category_id=."""
    return crud_ingredient.get_ingredients(db, category_id=category_id, skip=skip, limit=limit)


@router.post("/", response_model=IngredientOut, status_code=201)
def create_ingredient(ingredient_in: IngredientCreate, db: Session = Depends(get_db)):
    return crud_ingredient.create_ingredient(db, ingredient_in)


@router.get("/categories", response_model=list[IngredientCategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return crud_ingredient.get_categories(db)


@router.post("/categories", response_model=IngredientCategoryOut, status_code=201)
def create_category(category_in: IngredientCategoryCreate, db: Session = Depends(get_db)):
    return crud_ingredient.create_category(db, category_in)


@router.get("/{ingredient_id}", response_model=IngredientOut)
def get_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    ingredient = crud_ingredient.get_ingredient(db, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found.")
    return ingredient


@router.patch("/{ingredient_id}", response_model=IngredientOut)
def update_ingredient(ingredient_id: int, ingredient_in: IngredientUpdate, db: Session = Depends(get_db)):
    ingredient = crud_ingredient.get_ingredient(db, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found.")
    return crud_ingredient.update_ingredient(db, ingredient, ingredient_in)


@router.delete("/{ingredient_id}", status_code=204)
def delete_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    ingredient = crud_ingredient.get_ingredient(db, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found.")
    crud_ingredient.delete_ingredient(db, ingredient)
