"""活动相关 Schema"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, model_validator


class EventType(str, Enum):
    """活动类型"""
    offline = "offline"
    online = "online"
    hybrid = "hybrid"


class EventStatus(str, Enum):
    """活动状态"""
    draft = "draft"
    pending = "pending"
    published = "published"
    ongoing = "ongoing"
    finished = "finished"
    archived = "archived"


# 合法的状态流转
VALID_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"pending", "published"},
    "pending": {"published", "draft"},
    "published": {"ongoing", "archived"},
    "ongoing": {"finished"},
    "finished": {"archived"},
    "archived": set(),  # 终态，不可再变更
}


class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    type: EventType = EventType.offline
    category: str | None = Field(None, max_length=50)
    start_time: datetime | None = None
    end_time: datetime | None = None
    location_name: str | None = Field(None, max_length=200)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    max_participants: int | None = Field(None, ge=1, le=100000)
    price: float = Field(0.0, ge=0)
    cover_image: str | None = Field(None, max_length=500)
    tags: list[str] = []

    @model_validator(mode="after")
    def validate_time_range(self):
        """确保结束时间不早于开始时间"""
        if self.start_time and self.end_time and self.end_time < self.start_time:
            raise ValueError("结束时间不能早于开始时间")
        return self


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    """活动更新 — 不允许直接修改 status，状态变更须通过专用接口"""
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    type: EventType | None = None
    category: str | None = Field(None, max_length=50)
    start_time: datetime | None = None
    end_time: datetime | None = None
    location_name: str | None = Field(None, max_length=200)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    max_participants: int | None = Field(None, ge=1, le=100000)
    price: float | None = Field(None, ge=0)
    cover_image: str | None = Field(None, max_length=500)
    tags: list[str] | None = None

    @model_validator(mode="after")
    def validate_time_range(self):
        """确保结束时间不早于开始时间"""
        if self.start_time and self.end_time and self.end_time < self.start_time:
            raise ValueError("结束时间不能早于开始时间")
        return self


class EventOrganizerOut(BaseModel):
    """活动组织者摘要信息"""
    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class EventOut(EventBase):
    id: int
    organizer_id: int
    organizer: EventOrganizerOut | None = None
    current_participants: int = 0
    status: str = "draft"
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class EventListOut(BaseModel):
    """活动列表分页响应"""
    total: int
    page: int
    page_size: int
    items: list[EventOut]


class EventMapItem(BaseModel):
    """地图数据项"""
    id: int
    title: str
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    start_time: datetime | None = None
    category: str | None = None


class RecommendationItem(EventOut):
    """推荐活动项 — 包含匹配原因和匹配分数"""
    match_reasons: list[str] = []
    match_score: float = 0.0


class RecommendationListOut(BaseModel):
    """推荐活动列表响应"""
    total: int
    items: list[RecommendationItem]
    strategy: str = "default"  # personalized / popular / default
