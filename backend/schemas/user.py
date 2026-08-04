"""用户相关 Schema"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: str  # 支持 username 或 email
    password: str


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    tags: list[str] | None = None
    social_media: dict | None = None  # {"xiaohongshu": "xxx", "weibo": "xxx", ...}


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    display_name: str | None = None
    role: str = "user"
    tags: list = []
    avatar_url: str | None = None
    social_media: dict | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
