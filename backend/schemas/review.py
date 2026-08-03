"""活动复盘报告 Schema"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    overall_rating: int = Field(3, ge=1, le=5)
    attendance_rate: float | None = Field(None, ge=0, le=100)
    highlights: str | None = None
    issues: str | None = None
    improvements: str | None = None
    key_learnings: str | None = None
    reuse_suggestion: Literal["yes", "no", "maybe"] = "maybe"


class ReviewUpdate(BaseModel):
    overall_rating: int | None = Field(None, ge=1, le=5)
    attendance_rate: float | None = Field(None, ge=0, le=100)
    highlights: str | None = None
    issues: str | None = None
    improvements: str | None = None
    key_learnings: str | None = None
    reuse_suggestion: Literal["yes", "no", "maybe"] | None = None


class ReviewOut(BaseModel):
    id: int
    event_id: int
    user_id: int
    overall_rating: int
    attendance_rate: float | None = None
    highlights: str | None = None
    issues: str | None = None
    improvements: str | None = None
    key_learnings: str | None = None
    reuse_suggestion: str = "maybe"
    ai_summary: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ReviewListOut(BaseModel):
    total: int
    items: list[ReviewOut]
