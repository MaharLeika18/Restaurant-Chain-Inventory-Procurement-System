from datetime import datetime

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Branch(Base):
    __tablename__ = "branches"

    branch_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    employees = relationship("Employee", back_populates="branch")
    inventory_items = relationship("BranchIngredient", back_populates="branch")
    batches = relationship("Batch", back_populates="branch")
    transactions = relationship("InventoryTransaction", back_populates="branch")
    waste_logs = relationship("WasteLog", back_populates="branch")
    purchase_orders = relationship("PurchaseOrder", back_populates="branch")
    orders = relationship("OrderLog", back_populates="branch")
