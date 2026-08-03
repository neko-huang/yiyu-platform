"""活动路由"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import Event, User
from routers.dependencies import check_organizer, get_current_user, get_event_or_404
from schemas.event import (
    VALID_STATUS_TRANSITIONS,
    EventCreate,
    EventListOut,
    EventMapItem,
    EventOut,
    EventUpdate,
)

router = APIRouter(prefix="/events", tags=["活动"])


def _validate_status_transition(current: str, target: str) -> None:
    """校验活动状态流转是否合法"""
    allowed = VALID_STATUS_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"活动状态不允许从「{current}」变更为「{target}」",
        )


@router.get("", response_model=EventListOut)
async def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, description="按状态筛选"),
    category: str | None = Query(None, description="按类别筛选"),
    tag: str | None = Query(None, description="按标签筛选"),
    keyword: str | None = Query(None, description="关键词搜索"),
    db: AsyncSession = Depends(get_db),
):
    """获取活动列表（支持分页、筛选）"""
    query = select(Event)

    if status:
        query = query.where(Event.status == status)
    if category:
        query = query.where(Event.category == category)
    if keyword:
        query = query.where(Event.title.contains(keyword))

    # 标签过滤需要先在 SQL 层获取候选集，再在 Python 中精确过滤
    # 如果有 tag 过滤，需要先获取全部匹配项再过滤（SQLite JSON 限制）
    if tag:
        # 不分页，先获取所有候选，在 Python 中过滤标签
        result = await db.execute(query.order_by(Event.created_at.desc()))
        events = result.scalars().all()
        items = [EventOut.model_validate(e) for e in events if tag in e.tags]
        total = len(items)
        # 手动分页
        start = (page - 1) * page_size
        end = start + page_size
        items = items[start:end]
    else:
        # 总数
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # 分页
        query = query.offset((page - 1) * page_size).limit(page_size).order_by(Event.created_at.desc())
        result = await db.execute(query)
        events = result.scalars().all()
        items = [EventOut.model_validate(e) for e in events]

    return EventListOut(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/map", response_model=list[EventMapItem])
async def get_events_map(
    db: AsyncSession = Depends(get_db),
):
    """获取所有已发布活动的地理位置数据"""
    result = await db.execute(
        select(Event).where(Event.status.in_(["published", "ongoing", "finished"]))
    )
    events = result.scalars().all()
    return [
        EventMapItem(
            id=e.id,
            title=e.title,
            location_name=e.location_name,
            latitude=e.latitude,
            longitude=e.longitude,
            start_time=e.start_time,
            category=e.category,
        )
        for e in events
        if e.latitude is not None and e.longitude is not None
    ]


@router.get("/{event_id}", response_model=EventOut)
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    event = await get_event_or_404(event_id, db)
    return EventOut.model_validate(event)


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = Event(
        **payload.model_dump(),
        organizer_id=current_user.id,
        status="draft",
        current_participants=0,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    logger.info("用户 %s 创建活动 %s", current_user.id, event.id)
    return EventOut.model_validate(event)


@router.put("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: int,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权修改此活动")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    await db.flush()
    await db.refresh(event)
    return EventOut.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权删除此活动")

    await db.delete(event)
    logger.info("用户 %s 删除活动 %s", current_user.id, event_id)


@router.put("/{event_id}/publish", response_model=EventOut)
async def publish_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权发布此活动")

    _validate_status_transition(event.status, "published")

    event.status = "published"
    await db.flush()
    await db.refresh(event)
    logger.info("活动 %s 已发布", event_id)
    return EventOut.model_validate(event)


@router.put("/{event_id}/start", response_model=EventOut)
async def start_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将活动状态从 published 变更为 ongoing"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权操作此活动")

    _validate_status_transition(event.status, "ongoing")

    event.status = "ongoing"
    await db.flush()
    await db.refresh(event)
    return EventOut.model_validate(event)


@router.put("/{event_id}/finish", response_model=EventOut)
async def finish_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将活动状态从 ongoing 变更为 finished"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权操作此活动")

    _validate_status_transition(event.status, "finished")

    event.status = "finished"
    await db.flush()
    await db.refresh(event)
    return EventOut.model_validate(event)


@router.put("/{event_id}/archive", response_model=EventOut)
async def archive_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将活动状态归档"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权操作此活动")

    _validate_status_transition(event.status, "archived")

    event.status = "archived"
    await db.flush()
    await db.refresh(event)
    return EventOut.model_validate(event)
