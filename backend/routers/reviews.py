"""活动复盘报告路由"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import Event, EventReview, User
from routers.dependencies import check_organizer, get_current_user, get_event_or_404
from schemas.review import ReviewCreate, ReviewUpdate, ReviewOut, ReviewListOut
from services.points import award_points, check_and_unlock_achievements, POINTS_REVIEW

router = APIRouter(prefix="/reviews", tags=["活动复盘"])


@router.post(
    "/events/{event_id}/review",
    response_model=ReviewOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    event_id: int,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """为活动创建复盘报告"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "只有活动组织者可以创建复盘报告")

    # 检查是否已有复盘
    existing = await db.execute(
        select(EventReview).where(EventReview.event_id == event_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该活动已有复盘报告，请直接编辑",
        )

    review = EventReview(
        event_id=event_id,
        user_id=current_user.id,
        overall_rating=payload.overall_rating,
        attendance_rate=payload.attendance_rate,
        highlights=payload.highlights,
        issues=payload.issues,
        improvements=payload.improvements,
        key_learnings=payload.key_learnings,
        reuse_suggestion=payload.reuse_suggestion,
    )
    db.add(review)
    await db.flush()
    await db.refresh(review)

    # 创建复盘送积分
    await award_points(
        db, current_user.id, POINTS_REVIEW, "create_review",
        f"创建活动复盘：{event_id}", event_id,
    )
    await check_and_unlock_achievements(db, current_user.id)

    await db.commit()
    await db.refresh(review)
    logger.info("用户 %s 为活动 %s 创建复盘报告 %s，获得 %s 积分", current_user.id, event_id, review.id, POINTS_REVIEW)
    return ReviewOut.model_validate(review)


@router.get("/events/{event_id}/review", response_model=ReviewOut)
async def get_review(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取活动的复盘报告（公开）"""
    result = await db.execute(
        select(EventReview).where(EventReview.event_id == event_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="该活动暂无复盘报告")
    return ReviewOut.model_validate(review)


@router.put("/events/{event_id}/review", response_model=ReviewOut)
async def update_review(
    event_id: int,
    payload: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新活动的复盘报告"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "只有活动组织者可以编辑复盘报告")

    result = await db.execute(
        select(EventReview).where(EventReview.event_id == event_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="复盘报告不存在")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)

    await db.flush()
    await db.refresh(review)
    return ReviewOut.model_validate(review)


@router.get("/my/reviews", response_model=ReviewListOut)
async def list_my_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户创建的所有复盘报告"""
    count_q = select(func.count()).select_from(EventReview).where(
        EventReview.user_id == current_user.id
    )
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(EventReview)
        .where(EventReview.user_id == current_user.id)
        .order_by(EventReview.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = [ReviewOut.model_validate(r) for r in result.scalars().all()]

    return ReviewListOut(total=total, items=items)


@router.post("/events/{event_id}/review/ai-summary", response_model=ReviewOut)
async def generate_ai_review_summary(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI 生成活动复盘摘要"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "只有活动组织者可以使用 AI 复盘")

    result = await db.execute(
        select(EventReview).where(EventReview.event_id == event_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="请先创建复盘报告再生成 AI 摘要")

    try:
        from services.ai_service import generate_review_summary

        # 构建复盘上下文
        context_parts = [f"活动名称：{event.title}"]
        if event.category:
            context_parts.append(f"活动类别：{event.category}")
        context_parts.append(f"参与人数：{event.current_participants}/{event.max_participants}")
        context_parts.append(f"活动票价：{event.price}元")

        if review.highlights:
            context_parts.append(f"\n亮点：{review.highlights}")
        if review.issues:
            context_parts.append(f"\n问题：{review.issues}")
        if review.improvements:
            context_parts.append(f"\n改进建议：{review.improvements}")
        if review.key_learnings:
            context_parts.append(f"\n经验：{review.key_learnings}")

        ai_summary = await generate_review_summary("\n".join(context_parts))
        review.ai_summary = ai_summary
        await db.flush()
        await db.refresh(review)

    except Exception as e:
        logger.warning("AI 复盘摘要生成失败: %s", e)
        raise HTTPException(status_code=502, detail="AI 服务暂时不可用，请稍后重试")

    return ReviewOut.model_validate(review)
