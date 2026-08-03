"""财务路由"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Event, FinanceRecord, User
from schemas.finance import FinanceRecordCreate, FinanceRecordOut, FinanceSummary
from routers.dependencies import get_current_user

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
    event = await _get_event_or_404(event_id, db)
    _check_organizer(event, current_user)

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
    return FinanceRecordOut.model_validate(record)


@router.get("/events/{event_id}/finance", response_model=list[FinanceRecordOut])
async def list_finance_records(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_or_404(event_id, db)
    _check_organizer(event, current_user)

    result = await db.execute(
        select(FinanceRecord)
        .where(FinanceRecord.event_id == event_id)
        .order_by(FinanceRecord.created_at.desc())
    )
    return [FinanceRecordOut.model_validate(r) for r in result.scalars().all()]


@router.get("/events/{event_id}/finance/summary", response_model=FinanceSummary)
async def finance_summary(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_or_404(event_id, db)
    _check_organizer(event, current_user)

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


# ---------------------------------------------------------------------------
# 辅助函数
# ---------------------------------------------------------------------------
async def _get_event_or_404(event_id: int, db: AsyncSession) -> Event:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="活动不存在")
    return event


def _check_organizer(event: Event, user: User):
    if event.organizer_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作此活动财务")
