"""AI 方案相关 Schema"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AIPlanGenerateRequest(BaseModel):
    idea: str | None = Field(None, min_length=1, description="用户想法描述")
    mode: Literal["direct", "guided"] = "direct"
    prompt: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    city: str | None = Field(None, max_length=100, description="用户所在城市")
    messages: list[dict] | None = Field(None, description="对话历史，用于多轮对话上下文")
    edited_plan: str | None = Field(None, description="用户手动编辑后的方案，作为下一轮调整的样本")


class AIPlanGenerateResponse(BaseModel):
    content: str = Field(..., description="生成的方案 Markdown 文本")


class AIPlanSaveRequest(BaseModel):
    title: str | None = None
    content: str
    conversation_history: list[dict] = Field(default_factory=list)


class AIPlanOut(BaseModel):
    id: int
    user_id: int
    title: str | None = None
    content: str | None = None
    conversation_history: list = []
    status: str = "draft"
    event_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
