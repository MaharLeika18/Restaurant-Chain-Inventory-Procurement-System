from datetime import datetime, date

from sqlalchemy import String, DateTime, Date, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Employee(Base):
    """
    A staff member's HR profile. Separate from `User` (login credentials)
    so someone can exist in the system (e.g. for PO approval history) even
    before/without having a login account, and so one person's profile
    isn't bloated with auth fields.
    """
    __tablename__ = "employees"

    employee_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.branch_id"), nullable=False)

    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "Branch Manager", "Cashier"
    contact_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="employees")
    user_account = relationship("User", back_populates="employee", uselist=False)
