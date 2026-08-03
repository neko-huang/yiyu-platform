"""活动复盘报告模型"""

from datetime import datetime

from sqlalchemy import String, Text, DateTime, Integer, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class EventReview(Base):
    __tablename__ = "event_reviews"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # 复盘内容
    overall_rating: Mapped[int] = mapped_column(Integer, default=3)  # 1-5 评分
    attendance_rate: Mapped[float | None] = mapped_column(Float, nullable=True)  # 实际到场率
    highlights: Mapped[str | None] = mapped_column(Text, nullable=True)  # 亮点（Markdown）
    issues: Mapped[str | None] = mapped_column(Text, nullable=True)  # 问题与不足
    improvements: Mapped[str | None] = mapped_column(Text, nullable=True)  # 改进建议
    key_learnings: Mapped[str | None] = mapped_column(Text, nullable=True)  # 关键经验
    reuse_suggestion: Mapped[str] = mapped_column(String(20), default="maybe")  # yes/no/maybe

    # AI 生成的复盘摘要
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    event = relationship("Event", back_populates="reviews")
