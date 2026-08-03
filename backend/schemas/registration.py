"""报名相关 Schema"""

from datetime import datetime

from pydantic import BaseModel, Field


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
