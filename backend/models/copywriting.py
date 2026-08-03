"""AI 多平台文案模型"""

from datetime import datetime

from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Copywriting(Base):
    __tablename__ = "copywritings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(30), nullable=False)  # wechat/xiaohongshu/weibo/friends
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    stage: Mapped[str] = mapped_column(String(20), default="before")  # before/during/after
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
