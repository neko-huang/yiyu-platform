"""AI 方案路由"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import AIPlan, User
from routers.dependencies import get_current_user
from schemas.ai_plan import (
    AIPlanGenerateRequest,
    AIPlanGenerateResponse,
    AIPlanOut,
    AIPlanSaveRequest,
)
from services.ai_service import generate_event_plan

router = APIRouter(prefix="/ai", tags=["AI 方案"])


@router.post("/plan/generate", response_model=AIPlanGenerateResponse)
async def generate_plan(
    payload: AIPlanGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """调用 DeepSeek 生成活动方案"""
    try:
        # 兼容前端 prompt 字段，也支持 idea 字段
        user_input = payload.prompt or payload.idea
        api_key = payload.api_key or None
        base_url = payload.base_url or None
        content = await generate_event_plan(
            user_input, payload.mode,
            api_key=api_key, base_url=base_url,
            city=payload.city,
            messages=payload.messages,
        )
    except httpx.HTTPStatusError as e:
        logger.warning("AI 服务返回错误: %s", e.response.status_code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI 服务返回错误: {e.response.status_code}",
        )
    except httpx.RequestError:
        logger.warning("无法连接 AI 服务")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="无法连接 AI 服务",
        )

    return AIPlanGenerateResponse(content=content)


@router.post("/plan/save", response_model=AIPlanOut, status_code=status.HTTP_201_CREATED)
async def save_plan(
    payload: AIPlanSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """保存方案到数据库"""
    plan = AIPlan(
        user_id=current_user.id,
        title=payload.title or "未命名方案",
        content=payload.content,
        conversation_history=payload.conversation_history,
        status="draft",
    )
    db.add(plan)
    await db.flush()
    await db.refresh(plan)
    logger.info("用户 %s 保存 AI 方案 %s", current_user.id, plan.id)
    return AIPlanOut.model_validate(plan)


@router.get("/plans", response_model=list[AIPlanOut])
async def list_plans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户的历史方案列表（分页）"""
    query = (
        select(AIPlan)
        .where(AIPlan.user_id == current_user.id)
        .order_by(AIPlan.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    return [AIPlanOut.model_validate(p) for p in result.scalars().all()]
