"""报名路由"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import logger
from database import get_db
from models import Event, Registration, User
from routers.dependencies import check_organizer, get_current_user, get_event_or_404
from schemas.registration import (
    MyRegistrationListOut,
    MyRegistrationOut,
    RegistrationCreate,
    RegistrationListOut,
    RegistrationOut,
    RegistrationWithUserOut,
)

router = APIRouter(tags=["报名"])


@router.post(
    "/events/{event_id}/register",
    response_model=RegistrationOut,
    status_code=status.HTTP_201_CREATED,
)
async def register_for_event(
    event_id: int,
    payload: RegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 检查活动是否存在 & 已开放报名
    event = await get_event_or_404(event_id, db)
    if event.status not in ("published", "ongoing"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="活动未开放报名")

    # 检查是否已报名（仅检查有效状态的报名，rejected 的允许重新报名）
    existing = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.user_id == current_user.id,
            Registration.status.in_(["pending", "approved", "checked_in"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="已报名此活动")

    # 检查人数上限 — current_participants 维护的是 approved + checked_in 计数
    if event.max_participants and event.current_participants >= event.max_participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="活动报名人数已满")

    # MVP 阶段：自动通过报名，无需审核
    reg = Registration(
        event_id=event_id,
        user_id=current_user.id,
        status="approved",
        form_data=payload.form_data,
    )
    db.add(reg)
    # 更新活动参与人数
    event.current_participants += 1
    await db.flush()
    await db.refresh(reg)
    logger.info("用户 %s 报名活动 %s（当前 %s 人）", current_user.id, event_id, event.current_participants)
    return RegistrationOut.model_validate(reg)


@router.get("/events/{event_id}/registrations", response_model=RegistrationListOut)
async def list_registrations(
    event_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status", description="按状态筛选"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查看某活动的报名列表（仅组织者或 admin）"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权查看报名列表")

    base_query = (
        select(Registration, User)
        .join(User, Registration.user_id == User.id)
        .where(Registration.event_id == event_id)
    )
    if status_filter:
        base_query = base_query.where(Registration.status == status_filter)

    # 总数
    count_query = (
        select(func.count())
        .select_from(Registration)
        .where(Registration.event_id == event_id)
    )
    if status_filter:
        count_query = count_query.where(Registration.status == status_filter)
    total = (await db.execute(count_query)).scalar() or 0

    # 分页查询
    query = base_query.order_by(Registration.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for reg, user in rows:
        item = RegistrationWithUserOut.model_validate(reg)
        item.username = user.username
        item.display_name = user.display_name
        item.email = user.email
        items.append(item)

    return RegistrationListOut(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.put("/registrations/{reg_id}/approve", response_model=RegistrationOut)
async def approve_registration(
    reg_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg, event = await _get_registration_with_event(reg_id, db)
    check_organizer(event, current_user)

    if reg.status not in ("pending", "rejected"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前状态不允许审核通过")

    # 审核通过时，检查是否超过人数上限
    if event.max_participants and event.current_participants >= event.max_participants:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="活动报名人数已满，无法通过更多审核")

    reg.status = "approved"
    # 维护 current_participants 计数器（仅统计 approved + checked_in）
    event.current_participants += 1
    await db.flush()
    await db.refresh(reg)
    return RegistrationOut.model_validate(reg)


@router.put("/registrations/{reg_id}/reject", response_model=RegistrationOut)
async def reject_registration(
    reg_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg, event = await _get_registration_with_event(reg_id, db)
    check_organizer(event, current_user)

    if reg.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前状态不允许拒绝")

    reg.status = "rejected"
    await db.flush()
    await db.refresh(reg)
    return RegistrationOut.model_validate(reg)


@router.put("/registrations/{reg_id}/checkin", response_model=RegistrationOut)
async def checkin_registration(
    reg_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg, event = await _get_registration_with_event(reg_id, db)
    check_organizer(event, current_user)

    if reg.status != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅已通过的报名可以签到")

    reg.status = "checked_in"
    reg.checked_in_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(reg)
    return RegistrationOut.model_validate(reg)


# ---------------------------------------------------------------------------
# 辅助函数
# ---------------------------------------------------------------------------
async def _get_registration_with_event(reg_id: int, db: AsyncSession) -> tuple[Registration, Event]:
    result = await db.execute(
        select(Registration, Event)
        .join(Event, Registration.event_id == Event.id)
        .where(Registration.id == reg_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报名记录不存在")
    return row[0], row[1]
@router.get("/my/registrations", response_model=MyRegistrationListOut)
async def list_my_registrations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户报名（含已通过/已签到）的活动列表"""
    base_query = (
        select(Registration)
        .options(selectinload(Registration.event))
        .where(Registration.user_id == current_user.id)
        .order_by(Registration.created_at.desc())
    )
    count_query = select(func.count()).select_from(Registration).where(Registration.user_id == current_user.id)
    total = (await db.execute(count_query)).scalar() or 0

    query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return MyRegistrationListOut(
        total=total,
        page=page,
        page_size=page_size,
        items=[MyRegistrationOut.model_validate(r) for r in items],
    )