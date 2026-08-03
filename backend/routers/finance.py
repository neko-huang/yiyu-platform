"""财务路由"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import Event, FinanceRecord, User
from routers.dependencies import check_organizer, get_current_user, get_event_or_404
from schemas.finance import (
    FinanceListOut,
    FinanceRecordCreate,
    FinanceRecordOut,
    FinanceSummary,
)

router = APIRouter(tags=["财务"])


@router.post(
    "/events/{event_id}/finance",
    response_model=FinanceRecordOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_finance_record(
    event_id: int,
    payload: FinanceRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权操作此活动财务")

    record = FinanceRecord(
        event_id=event_id,
        type=payload.type,
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    logger.info("用户 %s 为活动 %s 创建财务记录 %s", current_user.id, event_id, record.id)
    return FinanceRecordOut.model_validate(record)


@router.get("/events/{event_id}/finance", response_model=FinanceListOut)
async def list_finance_records(
    event_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权查看此活动财务")

    # 总数
    count_query = select(func.count()).select_from(FinanceRecord).where(
        FinanceRecord.event_id == event_id
    )
    total = (await db.execute(count_query)).scalar() or 0

    # 分页查询
    query = (
        select(FinanceRecord)
        .where(FinanceRecord.event_id == event_id)
        .order_by(FinanceRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = [FinanceRecordOut.model_validate(r) for r in result.scalars().all()]

    return FinanceListOut(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/events/{event_id}/finance/summary", response_model=FinanceSummary)
async def finance_summary(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "无权查看此活动财务")

    result = await db.execute(
        select(FinanceRecord).where(FinanceRecord.event_id == event_id)
    )
    records = result.scalars().all()

    total_income = 0.0
    total_expense = 0.0
    income_by_category: dict[str, float] = {}
    expense_by_category: dict[str, float] = {}

    for r in records:
        if r.type == "income":
            total_income += r.amount
            income_by_category[r.category] = income_by_category.get(r.category, 0) + r.amount
        else:
            total_expense += r.amount
            expense_by_category[r.category] = expense_by_category.get(r.category, 0) + r.amount

    return FinanceSummary(
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        net_balance=round(total_income - total_expense, 2),
        income_by_category=income_by_category,
        expense_by_category=expense_by_category,
        record_count=len(records),
    )
