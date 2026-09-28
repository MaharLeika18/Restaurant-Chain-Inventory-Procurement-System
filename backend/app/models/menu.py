from datetime import datetime

from sqlalchemy import String, DateTime, Numeric, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Menu(Base):
    """A dish served chain-wide. Kept branch-agnostic like Ingredient, since
    the menu is the same everywhere; per-branch availability toggles could
    be added later without changing this table."""
    __tablename__ = "menu_items"

    menu_item_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dish_name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recipe = relationship("RecipeIngredient", back_populates="menu_item", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="menu_item")


class RecipeIngredient(Base):
    """One line of a dish's recipe/bill-of-materials: how much of one
    ingredient a single serving of a menu item requires. An order for that
    dish explodes through these rows to deduct ingredient stock."""
    __tablename__ = "recipe_ingredients"
    __table_args__ = (UniqueConstraint("menu_item_id", "ingredient_id", name="uq_recipe_ingredient"),)

    recipe_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.menu_item_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)
    quantity_required: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)  # per one serving

    menu_item = relationship("Menu", back_populates="recipe")
    ingredient = relationship("Ingredient", back_populates="recipe_uses")
