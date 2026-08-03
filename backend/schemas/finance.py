"""财务相关 Schema"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FinanceRecordCreate(BaseModel):
    type: Literal["income", "expense"]
    category: str = "other"  # ticket/sponsorship/venue/material/labor/other
    amount: float = Field(..., gt=0)
    description: str | None = Field(None, max_length=500)


class FinanceRecordOut(BaseModel):
    id: int
    event_id: int
    type: str
    category: str
    amount: float
    description: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class FinanceSummary(BaseModel):
    total_income: float = 0.0
    total_expense: float = 0.0
    net_balance: float = 0.0
    income_by_category: dict[str, float] = {}
    expense_by_category: dict[str, float] = {}
    record_count: int = 0


class FinanceListOut(BaseModel):
    """财务记录列表分页响应"""
    total: int
    page: int
    page_size: int
    items: list[FinanceRecordOut]
