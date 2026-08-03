"""财务记录模型"""

from datetime import datetime

from sqlalchemy import String, DateTime, Float, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class FinanceRecord(Base):
    __tablename__ = "finance_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # income / expense
    category: Mapped[str] = mapped_column(String(50), default="other")  # ticket/sponsorship/venue/material/labor/other
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    event = relationship("Event", back_populates="finance_records")
