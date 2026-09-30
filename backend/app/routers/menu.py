from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.menu import MenuCreate, MenuUpdate, MenuOut, RecipeIngredientCreate, RecipeIngredientOut
from app.crud import menu as crud_menu

router = APIRouter(prefix="/menu", tags=["Menu & Recipes"])


@router.get("/", response_model=list[MenuOut])
def list_menu_items(active_only: bool = False, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_menu.get_menu_items(db, active_only=active_only, skip=skip, limit=limit)


@router.post("/", response_model=MenuOut, status_code=201)
def create_menu_item(menu_in: MenuCreate, db: Session = Depends(get_db)):
    """Create a dish, optionally with its recipe (ingredient list) in the same call."""
    return crud_menu.create_menu_item(db, menu_in)


@router.get("/{menu_item_id}", response_model=MenuOut)
def get_menu_item(menu_item_id: int, db: Session = Depends(get_db)):
    menu_item = crud_menu.get_menu_item(db, menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    return menu_item


@router.patch("/{menu_item_id}", response_model=MenuOut)
def update_menu_item(menu_item_id: int, menu_in: MenuUpdate, db: Session = Depends(get_db)):
    menu_item = crud_menu.get_menu_item(db, menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    return crud_menu.update_menu_item(db, menu_item, menu_in)


@router.put("/{menu_item_id}/recipe", response_model=MenuOut)
def set_recipe(menu_item_id: int, recipe_in: list[RecipeIngredientCreate], db: Session = Depends(get_db)):
    """Replace a dish's whole recipe/bill-of-materials in one call."""
    menu_item = crud_menu.get_menu_item(db, menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    return crud_menu.set_recipe(db, menu_item, recipe_in)


@router.delete("/{menu_item_id}", status_code=204)
def delete_menu_item(menu_item_id: int, db: Session = Depends(get_db)):
    menu_item = crud_menu.get_menu_item(db, menu_item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    crud_menu.delete_menu_item(db, menu_item)
