"""AI 多平台文案 Schema"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CopywritingCreate(BaseModel):
    platform: Literal["wechat", "xiaohongshu", "weibo", "friends"]
    stage: Literal["before", "during", "after"] = "before"


class CopywritingOut(BaseModel):
    id: int
    event_id: int
    user_id: int
    platform: str
    content: str | None = None
    stage: str = "before"
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
