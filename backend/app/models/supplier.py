from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Numeric, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    supplier_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    contact_person: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    ingredient_links = relationship("SupplierIngredient", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class SupplierIngredient(Base):
    """
    Which supplier can provide which ingredient, at what price and lead time.
    A single ingredient can have several suppliers; each supplier can quote a
    different unit cost / lead time, which the reorder & PO logic uses.
    """
    __tablename__ = "supplier_ingredients"
    __table_args__ = (UniqueConstraint("supplier_id", "ingredient_id", name="uq_supplier_ingredient"),)

    supplier_ingredient_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.supplier_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    is_preferred: Mapped[bool] = mapped_column(default=False)

    supplier = relationship("Supplier", back_populates="ingredient_links")
    ingredient = relationship("Ingredient", back_populates="supplier_links")
