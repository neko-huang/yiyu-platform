"""SOP 模板路由"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import Event, SOPTemplate, User
from routers.dependencies import check_organizer, get_current_user, get_event_or_404
from schemas.sop_template import (
    SOPTemplateCreate,
    SOPTemplateUpdate,
    SOPTemplateOut,
    SOPTemplateListOut,
)

router = APIRouter(prefix="/sop-templates", tags=["SOP 模板"])


@router.post(
    "",
    response_model=SOPTemplateOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    payload: SOPTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建 SOP 模板"""
    template = SOPTemplate(
        user_id=current_user.id,
        name=payload.name,
        category=payload.category,
        description=payload.description,
        content=payload.content,
        tags=payload.tags,
        is_public=payload.is_public,
        source_event_id=payload.source_event_id,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    logger.info("用户 %s 创建 SOP 模板 %s", current_user.id, template.id)
    return SOPTemplateOut.model_validate(template)


@router.get("", response_model=SOPTemplateListOut)
async def list_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    keyword: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取 SOP 模板列表（自己的 + 公开的）"""
    # 基础过滤：自己的模板 + 公开模板
    base_filter = or_(
        SOPTemplate.user_id == current_user.id,
        SOPTemplate.is_public == True,
    )
    filters = [base_filter, SOPTemplate.is_active == True]

    if category:
        filters.append(SOPTemplate.category == category)
    if keyword:
        kw = f"%{keyword}%"
        filters.append(or_(SOPTemplate.name.ilike(kw), SOPTemplate.description.ilike(kw)))

    count_q = select(func.count()).select_from(SOPTemplate).where(*filters)
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(SOPTemplate)
        .where(*filters)
        .order_by(SOPTemplate.usage_count.desc(), SOPTemplate.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = [SOPTemplateOut.model_validate(t) for t in result.scalars().all()]

    return SOPTemplateListOut(total=total, page=page, page_size=page_size, items=items)


@router.get("/{template_id}", response_model=SOPTemplateOut)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个 SOP 模板"""
    result = await db.execute(
        select(SOPTemplate).where(SOPTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    if not template.is_public and template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此模板")
    return SOPTemplateOut.model_validate(template)


@router.put("/{template_id}", response_model=SOPTemplateOut)
async def update_template(
    template_id: int,
    payload: SOPTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新 SOP 模板"""
    result = await db.execute(
        select(SOPTemplate).where(SOPTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    if template.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权修改此模板")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    await db.flush()
    await db.refresh(template)
    return SOPTemplateOut.model_validate(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除 SOP 模板"""
    result = await db.execute(
        select(SOPTemplate).where(SOPTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    if template.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权删除此模板")

    await db.delete(template)
    logger.info("用户 %s 删除 SOP 模板 %s", current_user.id, template_id)


@router.post("/from-event/{event_id}", response_model=SOPTemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template_from_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """从活动自动生成 SOP 模板"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "只有活动组织者可以从此活动生成模板")

    # AI 生成 SOP 内容
    try:
        from services.ai_service import generate_sop_from_event

        event_data = {
            "title": event.title,
            "category": event.category or "通用",
            "type": event.type,
            "description": event.description or "",
            "max_participants": event.max_participants,
            "price": event.price,
            "location": event.location_name or "",
            "tags": event.tags or [],
        }
        content = await generate_sop_from_event(event_data)
    except Exception as e:
        logger.warning("AI SOP 生成失败: %s", e)
        content = f"# {event.title} 活动 SOP\n\n## 活动概述\n- 类别：{event.category}\n- 类型：{event.type}\n- 人数上限：{event.max_participants}\n- 票价：{event.price}元\n\n## 筹备清单\n- [ ] 场地确认\n- [ ] 物料准备\n- [ ] 人员分工\n- [ ] 宣传推广\n- [ ] 报名管理\n\n## 活动当天\n- [ ] 签到接待\n- [ ] 流程把控\n- [ ] 现场协调\n\n## 后期总结\n- [ ] 财务结算\n- [ ] 参与者反馈\n- [ ] 复盘总结"

    template = SOPTemplate(
        user_id=current_user.id,
        name=f"{event.title} - SOP模板",
        category=event.category or "通用",
        description=f"基于活动「{event.title}」自动生成的 SOP 模板",
        content=content,
        tags=event.tags or [],
        is_public=False,
        source_event_id=event_id,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    logger.info("从活动 %s 生成 SOP 模板 %s", event_id, template.id)
    return SOPTemplateOut.model_validate(template)


@router.post("/{template_id}/use", response_model=SOPTemplateOut)
async def use_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """标记使用模板（增加使用计数）"""
    result = await db.execute(
        select(SOPTemplate).where(SOPTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")

    template.usage_count += 1
    await db.flush()
    await db.refresh(template)
    return SOPTemplateOut.model_validate(template)
