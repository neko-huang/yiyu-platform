"""积分与成就自动触发服务"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import Achievement, PointTransaction, UserAchievement, User


# ---------------------------------------------------------------------------
# 积分常量
# ---------------------------------------------------------------------------
POINTS_REGISTER = 50       # 报名活动
POINTS_CHECKIN = 100       # 签到
POINTS_CREATE_EVENT = 200  # 创建活动
POINTS_PHOTO = 10          # 上传照片
POINTS_REVIEW = 30         # 写复盘


async def award_points(
    db: AsyncSession,
    user_id: int,
    points: int,
    tx_type: str,
    description: str,
    related_event_id: int | None = None,
) -> PointTransaction:
    """给用户加分并记录交易"""
    tx = PointTransaction(
        user_id=user_id,
        points=points,
        tx_type=tx_type,
        description=description,
        related_event_id=related_event_id,
    )
    db.add(tx)
    await db.flush()
    await db.refresh(tx)
    return tx


async def check_and_unlock_achievements(
    db: AsyncSession,
    user_id: int,
) -> list[UserAchievement]:
    """检查用户是否达成新的成就，自动解锁"""
    # 获取所有成就定义
    result = await db.execute(select(Achievement))
    all_achievements = result.scalars().all()

    # 获取用户已解锁的成就
    unlocked = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == user_id)
    )
    unlocked_ids = {ua.achievement_id for ua in unlocked.scalars().all()}

    # 获取用户统计数据
    stats = await _get_user_stats(db, user_id)

    new_unlocks = []
    for ach in all_achievements:
        if ach.id in unlocked_ids:
            continue

        matched = False
        if ach.condition_type == "participate_count":
            matched = stats["participated"] >= ach.condition_value
        elif ach.condition_type == "organize_count":
            matched = stats["organized"] >= ach.condition_value
        elif ach.condition_type == "photo_count":
            matched = stats["photos"] >= ach.condition_value
        elif ach.condition_type == "review_count":
            matched = stats["reviews"] >= ach.condition_value
        elif ach.condition_type == "checkin_count":
            matched = stats["checkins"] >= ach.condition_value
        elif ach.condition_type == "points_total":
            matched = stats["total_points"] >= ach.condition_value

        if matched:
            ua = UserAchievement(
                user_id=user_id,
                achievement_id=ach.id,
            )
            db.add(ua)
            await db.flush()
            await db.refresh(ua)
            new_unlocks.append(ua)

    return new_unlocks


async def _get_user_stats(db: AsyncSession, user_id: int) -> dict:
    """获取用户各项统计数据"""
    from models import Event, Registration, AlbumPhoto, EventReview

    # 报名次数（已通过 + 已签到）
    reg_count = await db.scalar(
        select(func.count())
        .select_from(Registration)
        .where(
            Registration.user_id == user_id,
            Registration.status.in_(["approved", "checked_in"]),
        )
    )

    # 签到次数
    checkin_count = await db.scalar(
        select(func.count())
        .select_from(Registration)
        .where(
            Registration.user_id == user_id,
            Registration.status == "checked_in",
        )
    )

    # 创建活动次数
    org_count = await db.scalar(
        select(func.count())
        .select_from(Event)
        .where(Event.organizer_id == user_id)
    )

    # 上传照片数
    photo_count = await db.scalar(
        select(func.count())
        .select_from(AlbumPhoto)
        .where(AlbumPhoto.user_id == user_id)
    )

    # 复盘数
    review_count = await db.scalar(
        select(func.count())
        .select_from(EventReview)
        .where(EventReview.user_id == user_id)
    )

    # 总积分
    points_total = await db.scalar(
        select(func.coalesce(func.sum(PointTransaction.points), 0))
        .where(PointTransaction.user_id == user_id)
    )

    return {
        "participated": reg_count or 0,
        "organized": org_count or 0,
        "photos": photo_count or 0,
        "reviews": review_count or 0,
        "checkins": checkin_count or 0,
        "total_points": points_total or 0,
    }