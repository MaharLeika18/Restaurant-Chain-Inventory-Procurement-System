from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IngredientCategory(Base):
    __tablename__ = "ingredient_categories"

    category_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    ingredients = relationship("Ingredient", back_populates="category")


class Ingredient(Base):
    """
    Chain-wide ingredient catalog (e.g. "Chicken Breast", unit kg). Kept
    branch-agnostic on purpose so a Recipe can reference one ingredient row
    regardless of which branch is cooking it. Per-branch stock, PAR level,
    and nearest expiry live in BranchIngredient below.
    """
    __tablename__ = "ingredients"

    ingredient_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ingredient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String(20), nullable=False)  # kg, L, pcs, etc.
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("ingredient_categories.category_id"), nullable=True
    )
    is_perishable: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    category = relationship("IngredientCategory", back_populates="ingredients")
    branch_stock = relationship("BranchIngredient", back_populates="ingredient")
    supplier_links = relationship("SupplierIngredient", back_populates="ingredient")
    batches = relationship("Batch", back_populates="ingredient")
    transactions = relationship("InventoryTransaction", back_populates="ingredient")
    recipe_uses = relationship("RecipeIngredient", back_populates="ingredient")
