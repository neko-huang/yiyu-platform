"""活动讨论区 Schema"""

from datetime import datetime

from pydantic import BaseModel, Field


class DiscussionCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: int | None = None
    is_announcement: bool = False


class DiscussionOut(BaseModel):
    id: int
    event_id: int
    user_id: int
    content: str
    parent_id: int | None = None
    is_announcement: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    # 补充字段（路由中手动赋值）
    user_display_name: str = ""
    user_avatar_url: str | None = None

    model_config = {"from_attributes": True}


class DiscussionListOut(BaseModel):
    total: int
    items: list[DiscussionOut]
