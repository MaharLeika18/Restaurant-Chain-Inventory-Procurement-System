from datetime import datetime

from sqlalchemy import String, DateTime, Numeric, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import OrderStatus


class OrderLog(Base):
    """A single customer transaction at a branch."""
    __tablename__ = "order_logs"

    order_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.employee_id"), nullable=True)

    status: Mapped[OrderStatus] = mapped_column(SAEnum(OrderStatus), default=OrderStatus.OPEN, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)  # cash, card, e-wallet, etc.
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    order_datetime: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    branch = relationship("Branch", back_populates="orders")
    employee = relationship("Employee")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """One dish ordered within a transaction."""
    __tablename__ = "order_items"

    order_item_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("order_logs.order_id"), nullable=False)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.menu_item_id"), nullable=False)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)  # snapshot of Menu.price at order time
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    order = relationship("OrderLog", back_populates="items")
    menu_item = relationship("Menu", back_populates="order_items")
