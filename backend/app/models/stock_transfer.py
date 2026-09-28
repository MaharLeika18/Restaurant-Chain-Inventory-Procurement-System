from datetime import datetime

from sqlalchemy import ForeignKey, Numeric, DateTime, Enum as SAEnum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import StockTransferStatus


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    transfer_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    from_branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    to_branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)

    status: Mapped[StockTransferStatus] = mapped_column(
        SAEnum(StockTransferStatus), default=StockTransferStatus.REQUESTED, nullable=False
    )
    requested_by: Mapped[int | None] = mapped_column(ForeignKey("employees.employee_id"), nullable=True)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("employees.employee_id"), nullable=True)

    requested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    from_branch = relationship("Branch", foreign_keys=[from_branch_id])
    to_branch = relationship("Branch", foreign_keys=[to_branch_id])
    items = relationship("StockTransferItem", back_populates="transfer", cascade="all, delete-orphan")


class StockTransferItem(Base):
    __tablename__ = "stock_transfer_items"

    transfer_item_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    transfer_id: Mapped[int] = mapped_column(ForeignKey("stock_transfers.transfer_id"), nullable=False)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.ingredient_id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)

    transfer = relationship("StockTransfer", back_populates="items")
    ingredient = relationship("Ingredient")
