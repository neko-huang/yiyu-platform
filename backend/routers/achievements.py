"""游戏化 — 成就与积分路由"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select, desc as sa_desc
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import Achievement, PointTransaction, User, UserAchievement
from routers.dependencies import get_admin_user, get_current_user
from schemas.achievement import (
    AchievementOut,
    PointTransactionOut,
    PointsSummary,
    UserAchievementOut,
)

router = APIRouter(tags=["成就与积分"])


# ---------------------------------------------------------------------------
# 积分等级计算
# ---------------------------------------------------------------------------
def _calc_level(total_points: int) -> int:
    """根据积分计算等级（每 200 分升一级，最高 100 级）"""
    return min(total_points // 200 + 1, 100)


# ---------------------------------------------------------------------------
# 管理员手动加分请求体
# ---------------------------------------------------------------------------
class ManualPointsInput(BaseModel):
    target_user_id: int
    points: int
    description: str | None = None


# ---------------------------------------------------------------------------
# 排行榜条目
# ---------------------------------------------------------------------------
class LeaderboardEntry(BaseModel):
    user_id: int
    display_name: str
    avatar_url: str | None = None
    total_points: int
    rank: int


# ---------------------------------------------------------------------------
# 路由
# ---------------------------------------------------------------------------

@router.get(
    "/achievements",
    response_model=list[AchievementOut],
)
async def list_achievements(
    db: AsyncSession = Depends(get_db),
):
    """获取所有成就定义"""
    result = await db.execute(select(Achievement).order_by(Achievement.id))
    return [AchievementOut.model_validate(a) for a in result.scalars().all()]


@router.get(
    "/users/me/points",
    response_model=PointsSummary,
)
async def get_my_points(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户积分概览"""
    # 计算总积分
    total_q = select(func.coalesce(func.sum(PointTransaction.points), 0)).where(
        PointTransaction.user_id == current_user.id
    )
    total_points = (await db.execute(total_q)).scalar() or 0

    # 已解锁成就
    ach_q = (
        select(UserAchievement)
        .where(UserAchievement.user_id == current_user.id)
        .order_by(UserAchievement.earned_at.desc())
    )
    ach_result = await db.execute(ach_q)
    user_achievements = ach_result.scalars().all()

    # 为每个成就加载详情
    achievement_ids = [ua.achievement_id for ua in user_achievements]
    ach_list = []
    if achievement_ids:
        detail_q = select(Achievement).where(Achievement.id.in_(achievement_ids))
        detail_result = await db.execute(detail_q)
        ach_map = {a.id: a for a in detail_result.scalars().all()}
        for ua in user_achievements:
            out = UserAchievementOut.model_validate(ua)
            out.achievement = AchievementOut.model_validate(ach_map[ua.achievement_id])
            ach_list.append(out)

    # 最近交易记录（10 条）
    tx_q = (
        select(PointTransaction)
        .where(PointTransaction.user_id == current_user.id)
        .order_by(PointTransaction.created_at.desc())
        .limit(10)
    )
    tx_result = await db.execute(tx_q)
    tx_list = [PointTransactionOut.model_validate(t) for t in tx_result.scalars().all()]

    return PointsSummary(
        total_points=total_points,
        level=_calc_level(total_points),
        achievements=ach_list,
        recent_transactions=tx_list,
    )


@router.post(
    "/users/me/points/earn",
    response_model=PointTransactionOut,
    status_code=status.HTTP_201_CREATED,
)
async def manual_earn_points(
    payload: ManualPointsInput,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """管理员手动为用户加分"""
    # 检查目标用户存在
    target_q = select(User).where(User.id == payload.target_user_id)
    target_result = await db.execute(target_q)
    target_user = target_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="目标用户不存在")

    tx = PointTransaction(
        user_id=payload.target_user_id,
        points=payload.points,
        tx_type="admin_grant",
        description=payload.description,
    )
    db.add(tx)
    await db.flush()
    await db.refresh(tx)
    logger.info(
        "管理员 %s 为用户 %s 加 %s 分 (tx %s)",
        admin.id, payload.target_user_id, payload.points, tx.id,
    )
    return PointTransactionOut.model_validate(tx)


@router.get(
    "/users/me/achievements",
    response_model=list[UserAchievementOut],
)
async def get_my_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户已解锁成就"""
    q = (
        select(UserAchievement)
        .where(UserAchievement.user_id == current_user.id)
        .order_by(UserAchievement.earned_at.desc())
    )
    result = await db.execute(q)
    user_achievements = result.scalars().all()

    if not user_achievements:
        return []

    # 加载成就详情
    achievement_ids = [ua.achievement_id for ua in user_achievements]
    detail_q = select(Achievement).where(Achievement.id.in_(achievement_ids))
    detail_result = await db.execute(detail_q)
    ach_map = {a.id: a for a in detail_result.scalars().all()}

    out_list = []
    for ua in user_achievements:
        out = UserAchievementOut.model_validate(ua)
        out.achievement = AchievementOut.model_validate(ach_map[ua.achievement_id])
        out_list.append(out)
    return out_list


@router.get(
    "/leaderboard",
    response_model=list[LeaderboardEntry],
)
async def get_leaderboard(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """积分排行榜"""
    # 按用户聚合积分
    q = (
        select(
            PointTransaction.user_id,
            func.sum(PointTransaction.points).label("total_points"),
        )
        .group_by(PointTransaction.user_id)
        .order_by(sa_desc("total_points"))
        .limit(limit)
    )
    result = await db.execute(q)
    rows = result.all()

    if not rows:
        return []

    # 批量获取用户信息
    user_ids = [r.user_id for r in rows]
    users_q = select(User).where(User.id.in_(user_ids))
    users_result = await db.execute(users_q)
    users_map = {u.id: u for u in users_result.scalars().all()}

    entries = []
    for rank, row in enumerate(rows, start=1):
        user = users_map.get(row.user_id)
        entries.append(
            LeaderboardEntry(
                user_id=row.user_id,
                display_name=(user.display_name or user.username) if user else f"用户{row.user_id}",
                avatar_url=user.avatar_url if user else None,
                total_points=row.total_points,
                rank=rank,
            )
        )
    return entries
