from datetime import datetime, date

from sqlalchemy import (
    ForeignKey, Numeric, DateTime, Date, String, Enum as SAEnum,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import InventoryTransactionType, WasteReason


class BranchIngredient(Base):
    """
    Per-branch stock row for an ingredient: the running total plus the PAR
    level used to trigger reordering. This is the fast/aggregate number;
    `Batch` rows hold the FIFO/lot-level detail underneath it.
    """
    __tablename__ = "branch_ingredients"
    __table_args__ = (UniqueConstraint("branch_id", "ingredient_id", name="uq_branch_ingredient"),)

    branch_ingredient_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)

    current_stock: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)

    # PAR level: the target/trigger stock level a manager sets for this branch.
    # When current_stock falls to/below this, the ingredient is flagged for reorder.
    par_level: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)

    # Cached convenience field = the soonest expiration_date among this branch's
    # available batches of this ingredient. The source of truth is still Batch;
    # this column just saves a join for dashboards/list views and is kept in
    # sync whenever a batch is received or consumed (see crud/inventory.py).
    nearest_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branch = relationship("Branch", back_populates="inventory_items")
    ingredient = relationship("Ingredient", back_populates="branch_stock")


class Batch(Base):
    """
    A single received lot of an ingredient at a branch. Enables batch/lot
    tracking, expiration tracking, and FIFO consumption/valuation.
    """
    __tablename__ = "batches"

    batch_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.supplier_id"), nullable=True)
    purchase_order_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("purchase_order_items.po_item_id"), nullable=True
    )

    lot_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity_received: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    quantity_remaining: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    received_date: Mapped[date] = mapped_column(Date, default=date.today)
    expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    branch = relationship("Branch", back_populates="batches")
    ingredient = relationship("Ingredient", back_populates="batches")
    supplier = relationship("Supplier")


class InventoryTransaction(Base):
    """
    Append-only ledger of every stock movement (receipt, consumption,
    adjustment, transfer in/out, waste). BranchIngredient.current_stock is
    the running total this ledger reconciles to. Waste entries carry the
    "why" in a linked WasteLog row rather than here.
    """
    __tablename__ = "inventory_transactions"

    transaction_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("batches.batch_id"), nullable=True)

    transaction_type: Mapped[InventoryTransactionType] = mapped_column(
        SAEnum(InventoryTransactionType), nullable=False
    )
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)  # always positive; type gives direction
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "order:123", "transfer:7"
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("employees.employee_id"), nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="transactions")
    ingredient = relationship("Ingredient", back_populates="transactions")
    batch = relationship("Batch")


class WasteLog(Base):
    """
    Detail record for spoiled/damaged/expired stock. Creating one also
    writes a matching WASTE InventoryTransaction and deducts branch stock
    (drawn from batches FIFO), same as a PO receipt writes a RECEIPT row.
    """
    __tablename__ = "waste_logs"

    waste_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("batches.batch_id"), nullable=True)
    transaction_id: Mapped[int | None] = mapped_column(ForeignKey("inventory_transactions.transaction_id"), nullable=True)

    quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    reason: Mapped[WasteReason] = mapped_column(SAEnum(WasteReason), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("employees.employee_id"), nullable=True)
    waste_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="waste_logs")
    ingredient = relationship("Ingredient")
    batch = relationship("Batch")
