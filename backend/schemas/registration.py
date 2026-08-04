"""报名相关 Schema"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class RegistrationStatus(str, Enum):
    """报名状态"""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    checked_in = "checked_in"


class RegistrationCreate(BaseModel):
    form_data: dict = Field(default_factory=dict)


class RegistrationOut(BaseModel):
    id: int
    event_id: int
    user_id: int
    status: str = "pending"
    form_data: dict = {}
    checked_in_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class RegistrationWithUserOut(RegistrationOut):
    """包含用户信息的报名记录"""
    username: str | None = None
    display_name: str | None = None
    email: str | None = None


class RegistrationListOut(BaseModel):
    """报名列表分页响应"""
    total: int
    page: int
    page_size: int
    items: list[RegistrationWithUserOut]
class MyRegistrationEvent(BaseModel):
    """报名记录中的活动简略信息"""
    id: int
    title: str
    description: str | None = None
    type: str = "offline"
    category: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    location_name: str | None = None
    status: str = "draft"
    cover_image: str | None = None
    tags: list[str] = []
    current_participants: int = 0
    max_participants: int | None = None
    price: float = 0.0

    model_config = {"from_attributes": True}


class MyRegistrationOut(BaseModel):
    """我的报名记录（含活动信息）"""
    id: int
    event_id: int
    status: str
    form_data: dict = {}
    checked_in_at: datetime | None = None
    created_at: datetime | None = None
    event: MyRegistrationEvent

    model_config = {"from_attributes": True}


class MyRegistrationListOut(BaseModel):
    """我的报名列表分页响应"""
    total: int
    page: int
    page_size: int
    items: list[MyRegistrationOut]