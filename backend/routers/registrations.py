"""报名路由"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Event, Registration, User
from schemas.registration import RegistrationCreate, RegistrationOut, RegistrationWithUserOut
from routers.dependencies import get_current_user

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
    # 检查活动是否存在 & 已发布
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="活动不存在")
    if event.status not in ("published", "ongoing"):
        raise HTTPException(status_code=400, detail="活动未开放报名")

    # 检查是否已报名
    existing = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="已报名此活动")

    # 检查人数上限
    if event.max_participants and event.current_participants >= event.max_participants:
        raise HTTPException(status_code=400, detail="活动报名人数已满")

    reg = Registration(
        event_id=event_id,
        user_id=current_user.id,
        status="pending",
        form_data=payload.form_data,
    )
    db.add(reg)
    event.current_participants += 1
    await db.flush()
    await db.refresh(reg)
    return RegistrationOut.model_validate(reg)


@router.get("/events/{event_id}/registrations", response_model=list[RegistrationWithUserOut])
async def list_registrations(
    event_id: int,
    status_filter: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查看某活动的报名列表（仅组织者或 admin）"""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="活动不存在")

    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权查看报名列表")

    query = (
        select(Registration, User)
        .join(User, Registration.user_id == User.id)
        .where(Registration.event_id == event_id)
    )
    if status_filter:
        query = query.where(Registration.status == status_filter)
    query = query.order_by(Registration.created_at.desc())

    result = await db.execute(query)
    rows = result.all()

    items = []
    for reg, user in rows:
        item = RegistrationWithUserOut.model_validate(reg)
        item.username = user.username
        item.display_name = user.display_name
        item.email = user.email
        items.append(item)
    return items


@router.put("/registrations/{reg_id}/approve", response_model=RegistrationOut)
async def approve_registration(
    reg_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg, event = await _get_registration_with_event(reg_id, db)
    _check_organizer(event, current_user)

    if reg.status not in ("pending", "rejected"):
        raise HTTPException(status_code=400, detail="当前状态不允许审核通过")

    reg.status = "approved"
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
    _check_organizer(event, current_user)

    if reg.status != "pending":
        raise HTTPException(status_code=400, detail="当前状态不允许拒绝")

    reg.status = "rejected"
    event.current_participants = max(0, event.current_participants - 1)
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
    _check_organizer(event, current_user)

    if reg.status != "approved":
        raise HTTPException(status_code=400, detail="仅已通过的报名可以签到")

    reg.status = "checked_in"
    reg.checked_in_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(reg)
    return RegistrationOut.model_validate(reg)


# ---------------------------------------------------------------------------
# 辅助函数
# ---------------------------------------------------------------------------
async def _get_registration_with_event(reg_id: int, db: AsyncSession):
    result = await db.execute(
        select(Registration, Event)
        .join(Event, Registration.event_id == Event.id)
        .where(Registration.id == reg_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="报名记录不存在")
    return row


def _check_organizer(event: Event, user: User):
    if event.organizer_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作")
