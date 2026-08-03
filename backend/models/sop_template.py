"""SOP 模板模型"""

from datetime import datetime

from sqlalchemy import String, Text, DateTime, Integer, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from database import Base


class SOPTemplate(Base):
    __tablename__ = "sop_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="通用")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)  # Markdown SOP 内容
    tags: Mapped[list] = mapped_column(JSON, default=list)
    source_event_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("events.id"), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)  # 是否公开模板
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)  # 使用次数

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
