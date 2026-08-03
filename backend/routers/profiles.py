"""用户画像路由"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import User, UserProfile
from routers.dependencies import get_current_user
from schemas.user_profile import (
    InterestAdd,
    UserProfileCreate,
    UserProfileOut,
    UserProfilePublicOut,
    UserProfileUpdate,
)

router = APIRouter(prefix="/profiles", tags=["用户画像"])


async def get_or_create_profile(user_id: int, db: AsyncSession) -> UserProfile:
    """获取用户画像，不存在则自动创建"""
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        await db.flush()
        await db.refresh(profile)
    return profile


@router.get("/me", response_model=UserProfileOut)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户画像"""
    profile = await get_or_create_profile(current_user.id, db)
    return UserProfileOut.model_validate(profile)


@router.put("/me", response_model=UserProfileOut)
async def update_my_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新当前用户画像"""
    profile = await get_or_create_profile(current_user.id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    await db.flush()
    await db.refresh(profile)
    logger.info("用户 %s 更新画像", current_user.id)
    return UserProfileOut.model_validate(profile)


@router.post("/me", response_model=UserProfileOut, status_code=status.HTTP_201_CREATED)
async def create_my_profile(
    payload: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """显式创建当前用户画像（如已存在则返回已有画像）"""
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    existing = result.scalar_one_or_none()
    if existing is not None:
        return UserProfileOut.model_validate(existing)

    profile = UserProfile(user_id=current_user.id, **payload.model_dump())
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    logger.info("用户 %s 创建画像", current_user.id)
    return UserProfileOut.model_validate(profile)


@router.get("/{user_id}", response_model=UserProfilePublicOut)
async def get_public_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取其他用户的公开画像（不包含敏感信息）"""
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户画像不存在",
        )
    return UserProfilePublicOut.model_validate(profile)


@router.post("/me/interests", response_model=UserProfileOut)
async def add_interest(
    payload: InterestAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """添加兴趣标签"""
    profile = await get_or_create_profile(current_user.id, db)

    if payload.tag not in profile.interests:
        profile.interests = profile.interests + [payload.tag]

    await db.flush()
    await db.refresh(profile)
    return UserProfileOut.model_validate(profile)


@router.delete("/me/interests/{tag}", response_model=UserProfileOut)
async def remove_interest(
    tag: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """移除兴趣标签"""
    profile = await get_or_create_profile(current_user.id, db)

    if tag in profile.interests:
        profile.interests = [t for t in profile.interests if t != tag]

    await db.flush()
    await db.refresh(profile)
    return UserProfileOut.model_validate(profile)
