"""SOP 模板 Schema"""

from datetime import datetime

from pydantic import BaseModel, Field


class SOPTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field("通用", max_length=50)
    description: str | None = None
    content: str | None = None
    tags: list[str] = []
    is_public: bool = False
    source_event_id: int | None = None


class SOPTemplateUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    category: str | None = Field(None, max_length=50)
    description: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    is_public: bool | None = None
    is_active: bool | None = None


class SOPTemplateOut(BaseModel):
    id: int
    user_id: int
    name: str
    category: str
    description: str | None = None
    content: str | None = None
    tags: list = []
    source_event_id: int | None = None
    is_public: bool = False
    is_active: bool = True
    usage_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class SOPTemplateListOut(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[SOPTemplateOut]
