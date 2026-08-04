"""回忆相册路由"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import logger
from database import get_db
from models import Album, AlbumPhoto, User
from routers.dependencies import get_current_user, get_event_or_404
from schemas.album import (
    AlbumCreate,
    AlbumListOut,
    AlbumOut,
    AlbumPhotoCreate,
    AlbumPhotoOut,
)
from services.points import award_points, check_and_unlock_achievements, POINTS_PHOTO

router = APIRouter(tags=["回忆相册"])


@router.post(
    "/events/{event_id}/albums",
    response_model=AlbumOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_album(
    event_id: int,
    payload: AlbumCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """为活动创建相册"""
    event = await get_event_or_404(event_id, db)

    # 仅活动组织者可创建相册
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅活动组织者可创建相册")

    album = Album(
        event_id=event_id,
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
    )
    db.add(album)
    await db.flush()
    await db.refresh(album)
    logger.info("用户 %s 为活动 %s 创建相册 %s", current_user.id, event_id, album.id)
    return AlbumOut.model_validate(album)


@router.get(
    "/events/{event_id}/albums",
    response_model=AlbumListOut,
)
async def list_albums(
    event_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取活动相册列表"""
    count_query = select(func.count()).select_from(Album).where(
        Album.event_id == event_id
    )
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        select(Album)
        .options(selectinload(Album.photos))
        .where(Album.event_id == event_id)
        .order_by(Album.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = [AlbumOut.model_validate(a) for a in result.scalars().unique().all()]

    return AlbumListOut(total=total, items=items)


@router.post(
    "/albums/{album_id}/photos",
    response_model=AlbumPhotoOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_photo(
    album_id: int,
    payload: AlbumPhotoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """向相册添加照片"""
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")

    # 获取当前最大 sort_order
    max_order_q = select(func.max(AlbumPhoto.sort_order)).where(
        AlbumPhoto.album_id == album_id
    )
    max_order = (await db.execute(max_order_q)).scalar() or 0

    photo = AlbumPhoto(
        album_id=album_id,
        user_id=current_user.id,
        image_url=payload.image_url,
        caption=payload.caption,
        sort_order=max_order + 1,
    )
    db.add(photo)
    await db.flush()
    await db.refresh(photo)

    # 上传照片送积分
    await award_points(
        db, current_user.id, POINTS_PHOTO, "upload_photo",
        f"上传照片：{photo.caption or '活动照片'}", album.event_id,
    )
    await check_and_unlock_achievements(db, current_user.id)

    await db.commit()
    await db.refresh(photo)
    logger.info("用户 %s 向相册 %s 添加照片 %s，获得 %s 积分", current_user.id, album_id, photo.id, POINTS_PHOTO)
    return AlbumPhotoOut.model_validate(photo)


@router.get(
    "/albums/{album_id}",
    response_model=AlbumOut,
)
async def get_album(
    album_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取相册详情（含照片列表）"""
    query = (
        select(Album)
        .options(selectinload(Album.photos))
        .where(Album.id == album_id)
    )
    result = await db.execute(query)
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")
    return AlbumOut.model_validate(album)


@router.delete(
    "/albums/{album_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_photo(
    album_id: int,
    photo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除相册中的照片（仅本人或管理员可删）"""
    query = (
        select(AlbumPhoto)
        .where(AlbumPhoto.id == photo_id, AlbumPhoto.album_id == album_id)
    )
    result = await db.execute(query)
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")

    if photo.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权删除此照片")

    await db.delete(photo)
    logger.info("用户 %s 删除相册 %s 中的照片 %s", current_user.id, album_id, photo_id)
