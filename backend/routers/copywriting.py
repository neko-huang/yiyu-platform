"""AI 多平台文案路由"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import Copywriting, User
from routers.dependencies import get_current_user, get_event_or_404
from schemas.copywriting import CopywritingCreate, CopywritingOut

router = APIRouter(prefix="/copywriting", tags=["AI 文案"])


@router.post(
    "/events/{event_id}/copywriting",
    response_model=CopywritingOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_event_copywriting(
    event_id: int,
    payload: CopywritingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """调用 AI 生成指定平台的推广文案"""
    event = await get_event_or_404(event_id, db)

    # 构建活动上下文数据
    event_data = {
        "title": event.title,
        "category": event.category,
        "type": event.type,
        "description": event.description,
        "location": event.location_name,
        "price": event.price,
        "max_participants": event.max_participants,
        "tags": event.tags,
        "stage": payload.stage,
    }

    try:
        from services.ai_service import generate_copywriting

        content = await generate_copywriting(event_data, payload.platform)
    except Exception as e:
        logger.warning("AI 文案生成失败: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI 服务暂时不可用，请稍后重试",
        )

    record = Copywriting(
        event_id=event_id,
        user_id=current_user.id,
        platform=payload.platform,
        content=content,
        stage=payload.stage,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    logger.info(
        "用户 %s 为活动 %s 生成 %s 平台文案 %s",
        current_user.id, event_id, payload.platform, record.id,
    )
    return CopywritingOut.model_validate(record)


@router.get(
    "/events/{event_id}/copywriting",
    response_model=list[CopywritingOut],
)
async def list_event_copywriting(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取活动的所有文案"""
    query = (
        select(Copywriting)
        .where(Copywriting.event_id == event_id)
        .order_by(Copywriting.created_at.desc())
    )
    result = await db.execute(query)
    items = result.scalars().all()
    return [CopywritingOut.model_validate(c) for c in items]
