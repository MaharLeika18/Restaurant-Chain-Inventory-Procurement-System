from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.menu import Menu, RecipeIngredient
from app.schemas.menu import MenuCreate, MenuUpdate, RecipeIngredientCreate


def get_menu_item(db: Session, menu_item_id: int) -> Menu | None:
    return (
        db.query(Menu)
        .options(joinedload(Menu.recipe))
        .filter(Menu.menu_item_id == menu_item_id)
        .first()
    )


def get_menu_items(db: Session, active_only: bool = False, skip: int = 0, limit: int = 100) -> list[Menu]:
    query = db.query(Menu).options(joinedload(Menu.recipe))
    if active_only:
        query = query.filter(Menu.is_active.is_(True))
    return query.offset(skip).limit(limit).all()


def create_menu_item(db: Session, menu_in: MenuCreate) -> Menu:
    menu_item = Menu(
        dish_name=menu_in.dish_name,
        description=menu_in.description,
        price=menu_in.price,
        is_active=menu_in.is_active,
    )
    for line in menu_in.recipe:
        menu_item.recipe.append(RecipeIngredient(
            ingredient_id=line.ingredient_id, quantity_required=line.quantity_required
        ))
    db.add(menu_item)
    db.commit()
    db.refresh(menu_item)
    return menu_item


def update_menu_item(db: Session, menu_item: Menu, menu_in: MenuUpdate) -> Menu:
    for field, value in menu_in.model_dump(exclude_unset=True).items():
        setattr(menu_item, field, value)
    db.commit()
    db.refresh(menu_item)
    return menu_item


def set_recipe(db: Session, menu_item: Menu, recipe_in: list[RecipeIngredientCreate]) -> Menu:
    """Replace a dish's entire recipe/bill-of-materials in one call."""
    menu_item.recipe.clear()
    db.flush()
    for line in recipe_in:
        menu_item.recipe.append(RecipeIngredient(
            ingredient_id=line.ingredient_id, quantity_required=line.quantity_required
        ))
    db.commit()
    db.refresh(menu_item)
    return menu_item


def delete_menu_item(db: Session, menu_item: Menu) -> None:
    db.delete(menu_item)
    db.commit()
