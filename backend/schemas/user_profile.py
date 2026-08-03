"""用户画像相关 Schema"""

from datetime import date, datetime

from pydantic import BaseModel, Field


class UserProfileCreate(BaseModel):
    """创建画像（通常自动创建，此 Schema 用于显式初始化）"""
    avatar_url: str | None = Field(None, max_length=500)
    bio: str | None = None
    interests: list[str] = []
    location: str | None = Field(None, max_length=200)
    birth_date: date | None = None
    gender: str | None = Field(None, max_length=20)


class UserProfileUpdate(BaseModel):
    """更新画像 — 仅传入的字段会被更新"""
    avatar_url: str | None = Field(None, max_length=500)
    bio: str | None = None
    interests: list[str] | None = None
    location: str | None = Field(None, max_length=200)
    birth_date: date | None = None
    gender: str | None = Field(None, max_length=20)


class UserProfileOut(BaseModel):
    """完整画像输出（当前用户自己查看）"""
    id: int
    user_id: int
    avatar_url: str | None = None
    bio: str | None = None
    interests: list = []
    location: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    activity_count: int = 0
    participation_count: int = 0
    rating_avg: float = 0.0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserProfilePublicOut(BaseModel):
    """公开画像 — 隐藏敏感信息（birth_date、gender 等）"""
    user_id: int
    avatar_url: str | None = None
    bio: str | None = None
    interests: list = []
    location: str | None = None
    activity_count: int = 0
    participation_count: int = 0
    rating_avg: float = 0.0

    model_config = {"from_attributes": True}


class InterestAdd(BaseModel):
    """添加兴趣标签"""
    tag: str = Field(..., min_length=1, max_length=50)
