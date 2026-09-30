from datetime import datetime, date

from sqlalchemy import ForeignKey, Numeric, DateTime, Date, Enum as SAEnum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import PurchaseOrderStatus


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    po_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.supplier_id"), nullable=False)

    status: Mapped[PurchaseOrderStatus] = mapped_column(
        SAEnum(PurchaseOrderStatus), default=PurchaseOrderStatus.PENDING_APPROVAL, nullable=False
    )
    is_system_generated: Mapped[bool] = mapped_column(default=False)  # True = auto reorder recommendation

    created_by: Mapped[int | None] = mapped_column(ForeignKey("employees.employee_id"), nullable=True)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("employees.employee_id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    has_discrepancy: Mapped[bool] = mapped_column(default=False)
    discrepancy_notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    branch = relationship("Branch", back_populates="purchase_orders")
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    po_item_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.po_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)

    ordered_quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    fulfilled_quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    ingredient = relationship("Ingredient")
