"""回忆相册 Schema"""

from datetime import datetime

from pydantic import BaseModel


class AlbumCreate(BaseModel):
    title: str = "活动相册"
    description: str | None = None


class AlbumPhotoCreate(BaseModel):
    image_url: str
    caption: str | None = None


class AlbumPhotoOut(BaseModel):
    id: int
    album_id: int
    user_id: int
    image_url: str
    caption: str | None = None
    ai_caption: str | None = None
    sort_order: int = 0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AlbumOut(BaseModel):
    id: int
    event_id: int
    user_id: int
    title: str
    description: str | None = None
    created_at: datetime | None = None
    photos: list[AlbumPhotoOut] = []

    model_config = {"from_attributes": True}


class AlbumListOut(BaseModel):
    total: int
    items: list[AlbumOut]
