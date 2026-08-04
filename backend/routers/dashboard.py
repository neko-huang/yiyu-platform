"""仪表盘统计路由"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Event, FinanceRecord, Registration, User
from routers.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["仪表盘"])


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的仪表盘统计数据"""
    # 我创建的活动
    events_result = await db.execute(
        select(Event).where(Event.organizer_id == current_user.id)
    )
    my_events = events_result.scalars().all()
    total_events = len(my_events)
    active_events = sum(
        1 for e in my_events if e.status in ("published", "ongoing")
    )

    # 我收到的报名总数
    if my_events:
        event_ids = [e.id for e in my_events]
        reg_count = await db.execute(
            select(func.count()).select_from(Registration).where(
                Registration.event_id.in_(event_ids),
                Registration.status.in_(["approved", "checked_in"]),
            )
        )
        total_registrations = reg_count.scalar() or 0
    else:
        total_registrations = 0

    # 我创建活动的总收入
    if my_events:
        income_result = await db.execute(
            select(func.coalesce(func.sum(FinanceRecord.amount), 0))
            .where(
                FinanceRecord.event_id.in_(event_ids),
                FinanceRecord.type == "income",
            )
        )
        total_income = round(float(income_result.scalar() or 0), 2)
    else:
        total_income = 0

    return {
        "total_events": total_events,
        "active_events": active_events,
        "total_registrations": total_registrations,
        "total_income": total_income,
    }