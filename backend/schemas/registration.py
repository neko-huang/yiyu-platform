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
