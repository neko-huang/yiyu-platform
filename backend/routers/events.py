"""活动路由"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Event, User
from schemas.event import (
    EventCreate,
    EventListOut,
    EventMapItem,
    EventOut,
    EventUpdate,
)
from routers.dependencies import get_current_user

router = APIRouter(prefix="/events", tags=["活动"])


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

    # 总数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # 分页
    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Event.created_at.desc())
    result = await db.execute(query)
    events = result.scalars().all()

    # 标签过滤（SQLite JSON 无法原生查询，在 Python 中过滤）
    items = [EventOut.model_validate(e) for e in events]
    if tag:
        items = [e for e in items if tag in e.tags]

    return EventListOut(
        total=total if not tag else len(items),
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/map", response_model=list[EventMapItem])
async def get_events_map(db: AsyncSession = Depends(get_db)):
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
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="活动不存在")
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
    return EventOut.model_validate(event)


@router.put("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: int,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="活动不存在")

    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权修改此活动")

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
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="活动不存在")

    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权删除此活动")

    await db.delete(event)


@router.put("/{event_id}/publish", response_model=EventOut)
async def publish_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="活动不存在")

    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权发布此活动")

    event.status = "published"
    await db.flush()
    await db.refresh(event)
    return EventOut.model_validate(event)
