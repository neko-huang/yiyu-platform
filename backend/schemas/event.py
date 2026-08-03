"""活动相关 Schema"""

from datetime import datetime

from pydantic import BaseModel, Field


class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    type: str = "offline"  # offline / online / hybrid
    category: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    max_participants: int | None = None
    price: float = 0.0
    cover_image: str | None = None
    tags: list[str] = []


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: str | None = None
    category: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    max_participants: int | None = None
    price: float | None = None
    status: str | None = None
    cover_image: str | None = None
    tags: list[str] | None = None


class EventOut(EventBase):
    id: int
    organizer_id: int
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
