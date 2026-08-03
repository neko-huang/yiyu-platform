"""游戏化 — 成就与积分 Schema"""

from datetime import datetime

from pydantic import BaseModel


class AchievementOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    icon: str
    condition_type: str
    condition_value: int
    is_limited: bool = False

    model_config = {"from_attributes": True}


class UserAchievementOut(BaseModel):
    id: int
    user_id: int
    achievement_id: int
    earned_at: datetime | None = None
    achievement: AchievementOut | None = None

    model_config = {"from_attributes": True}


class PointTransactionOut(BaseModel):
    id: int
    user_id: int
    points: int
    tx_type: str
    description: str | None = None
    related_event_id: int | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PointsSummary(BaseModel):
    total_points: int = 0
    level: int = 1
    achievements: list[UserAchievementOut] = []
    recent_transactions: list[PointTransactionOut] = []
