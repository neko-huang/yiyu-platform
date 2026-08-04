"""活动路由"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import logger
from database import get_db
from models import Event, Registration, User, UserProfile
from routers.dependencies import (
    check_organizer,
    get_current_user,
    get_event_or_404,
    get_optional_current_user,
)
from schemas.event import (
    VALID_STATUS_TRANSITIONS,
    EventCreate,
    EventListOut,
    EventMapItem,
    EventOut,
    EventUpdate,
    RecommendationItem,
    RecommendationListOut,
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
    query = select(Event).options(selectinload(Event.organizer))

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


@router.get("/search", response_model=EventListOut)
async def search_events(
    q: str | None = Query(None, description="关键词搜索（标题 + 描述）"),
    category: str | None = Query(None, description="按分类筛选"),
    city: str | None = Query(None, description="按城市/地点筛选"),
    start_date: datetime | None = Query(None, description="活动开始时间下限"),
    end_date: datetime | None = Query(None, description="活动开始时间上限"),
    tags: str | None = Query(None, description="标签筛选，逗号分隔（如: 户外,徒步）"),
    sort: str = Query("latest", description="排序: latest(最新) / popular(最热)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """活动搜索 — 支持关键词、分类、城市、日期范围、标签筛选和排序

    公开接口，无需认证。默认只返回已发布(published/ongoing)的活动。
    """
    query = select(Event).options(selectinload(Event.organizer)).where(
        Event.status.in_(["published", "ongoing"])
    )

    # 关键词搜索 — 标题 + 描述模糊匹配
    if q:
        keyword = f"%{q}%"
        query = query.where(
            or_(
                Event.title.ilike(keyword),
                Event.description.ilike(keyword),
            )
        )

    # 分类筛选
    if category:
        query = query.where(Event.category == category)

    # 城市/地点筛选
    if city:
        query = query.where(Event.location_name.ilike(f"%{city}%"))

    # 日期范围筛选
    if start_date:
        query = query.where(Event.start_time >= start_date)
    if end_date:
        query = query.where(Event.start_time <= end_date)

    # 标签筛选 — SQLite JSON 限制，在 Python 层过滤
    tag_list = None
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    if tag_list:
        # 有标签过滤时，先获取全部候选再在 Python 中精确过滤
        result = await db.execute(query)
        events = result.scalars().all()
        filtered = [
            e for e in events
            if any(tag in (e.tags or []) for tag in tag_list)
        ]

        # 排序
        if sort == "popular":
            filtered.sort(key=lambda e: (e.current_participants or 0), reverse=True)
        else:
            filtered.sort(key=lambda e: e.start_time or datetime.min, reverse=True)

        total = len(filtered)
        start = (page - 1) * page_size
        end = start + page_size
        items = [EventOut.model_validate(e) for e in filtered[start:end]]
    else:
        # 无标签过滤，直接在 SQL 层分页
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # 排序
        if sort == "popular":
            query = query.order_by(Event.current_participants.desc())
        else:
            query = query.order_by(Event.start_time.desc())

        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        events = result.scalars().all()
        items = [EventOut.model_validate(e) for e in events]

    return EventListOut(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/recommendations", response_model=RecommendationListOut)
async def get_recommendations(
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=20, description="返回数量"),
):
    """活动推荐 — 基于用户画像个性化推荐，无画像时返回热门活动

    公开接口。如携带有效 token，则基于用户兴趣标签、历史参与分类和城市进行推荐；
    未登录或无画像数据时，返回最新热门活动作为默认推荐。
    """
    # 获取已发布的活动作为候选集
    result = await db.execute(
        select(Event).options(selectinload(Event.organizer)).where(Event.status.in_(["published", "ongoing"]))
    )
    all_events = result.scalars().all()

    # 尝试获取用户画像和历史报名
    profile = None
    history_categories = set()

    if current_user:
        # 获取用户画像
        profile_result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == current_user.id)
        )
        profile = profile_result.scalar_one_or_none()

        # 获取用户历史参与的活动分类
        reg_result = await db.execute(
            select(Event.category)
            .join(Registration, Registration.event_id == Event.id)
            .where(
                Registration.user_id == current_user.id,
                Registration.status.in_(["approved", "checked_in"]),
            )
            .distinct()
        )
        history_categories = {row[0] for row in reg_result.all() if row[0]}

    # 如果有画像或历史数据，进行个性化推荐
    if profile or history_categories:
        user_interests = set(profile.interests or []) if profile else set()
        user_location = profile.location if profile else None

        scored_events = []
        for event in all_events:
            score = 0.0
            reasons = []

            # 1. 基于兴趣标签匹配活动标签
            event_tags = set(event.tags or [])
            matched_tags = user_interests & event_tags
            if matched_tags:
                score += len(matched_tags) * 3
                reasons.append(f"匹配兴趣: {', '.join(matched_tags)}")

            # 2. 基于历史参与的活动分类推荐同类活动
            if event.category and event.category in history_categories:
                score += 2
                reasons.append(f"你参与过「{event.category}」类活动")

            # 3. 基于城市推荐本地活动
            if user_location and event.location_name:
                if user_location in event.location_name or event.location_name in user_location:
                    score += 1
                    reasons.append("本地活动")

            # 热度加分（参与人数越多加分越多，但权重低于匹配项）
            score += min((event.current_participants or 0) / 10, 2)

            scored_events.append((event, score, reasons))

        # 按匹配分数降序排列
        scored_events.sort(key=lambda x: x[1], reverse=True)

        # 取前 limit 个
        top = scored_events[:limit]
        items = [
            RecommendationItem(
                **EventOut.model_validate(event).model_dump(),
                match_reasons=reasons if score > 0 else [],
                match_score=round(score, 2),
            )
            for event, score, reasons in top
        ]

        strategy = "personalized"
    else:
        # 无画像数据 — 返回最新热门活动作为默认推荐
        sorted_events = sorted(
            all_events,
            key=lambda e: (e.current_participants or 0, e.start_time or datetime.min),
            reverse=True,
        )
        top = sorted_events[:limit]
        items = [
            RecommendationItem(
                **EventOut.model_validate(e).model_dump(),
                match_reasons=["热门推荐"],
                match_score=float(e.current_participants or 0),
            )
            for e in top
        ]
        strategy = "popular"

    return RecommendationListOut(
        total=len(items),
        items=items,
        strategy=strategy,
    )


@router.get("/my", response_model=EventListOut)
async def list_my_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户创建的活动"""
    base_query = (
        select(Event)
        .where(Event.organizer_id == current_user.id)
        .order_by(Event.created_at.desc())
    )
    count_query = select(func.count()).select_from(Event).where(Event.organizer_id == current_user.id)
    total = (await db.execute(count_query)).scalar() or 0

    query = base_query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return EventListOut(
        total=total,
        page=page,
        page_size=page_size,
        items=[EventOut.model_validate(e) for e in items],
    )


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