"""活动讨论区路由"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import Discussion, User
from routers.dependencies import check_organizer, get_current_user, get_event_or_404
from schemas.discussion import DiscussionCreate, DiscussionListOut, DiscussionOut

router = APIRouter(prefix="/discussions", tags=["讨论区"])


@router.post(
    "/events/{event_id}/discussions",
    response_model=DiscussionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_discussion(
    event_id: int,
    payload: DiscussionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发帖（需登录）"""
    event = await get_event_or_404(event_id, db)

    discussion = Discussion(
        event_id=event_id,
        user_id=current_user.id,
        content=payload.content,
        parent_id=payload.parent_id,
        is_announcement=payload.is_announcement,
    )
    db.add(discussion)
    await db.flush()
    await db.refresh(discussion)

    out = DiscussionOut.model_validate(discussion)
    out.user_display_name = current_user.display_name or current_user.username
    out.user_avatar_url = current_user.avatar_url

    logger.info("用户 %s 在活动 %s 发帖 %s", current_user.id, event_id, discussion.id)
    return out


@router.get(
    "/events/{event_id}/discussions",
    response_model=DiscussionListOut,
)
async def list_discussions(
    event_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取讨论列表（分页）"""
    count_query = select(func.count()).select_from(Discussion).where(
        Discussion.event_id == event_id
    )
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        select(Discussion)
        .where(Discussion.event_id == event_id)
        .order_by(Discussion.is_announcement.desc(), Discussion.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    discussions = result.scalars().all()

    # 批量查询发帖用户信息
    user_ids = list({d.user_id for d in discussions})
    users_query = select(User).where(User.id.in_(user_ids))
    users_result = await db.execute(users_query)
    users_map = {u.id: u for u in users_result.scalars().all()}

    items = []
    for d in discussions:
        out = DiscussionOut.model_validate(d)
        user = users_map.get(d.user_id)
        if user:
            out.user_display_name = user.display_name or user.username
            out.user_avatar_url = user.avatar_url
        items.append(out)

    return DiscussionListOut(total=total, items=items)


@router.delete(
    "/discussions/{discussion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_discussion(
    discussion_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除帖子（仅本人或管理员）"""
    result = await db.execute(
        select(Discussion).where(Discussion.id == discussion_id)
    )
    discussion = result.scalar_one_or_none()
    if not discussion:
        raise HTTPException(status_code=404, detail="帖子不存在")

    if discussion.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权删除此帖子")

    await db.delete(discussion)
    logger.info("用户 %s 删除讨论帖 %s", current_user.id, discussion_id)


@router.post(
    "/events/{event_id}/discussions/announce",
    response_model=DiscussionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_announcement(
    event_id: int,
    payload: DiscussionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发布公告（仅组织者）"""
    event = await get_event_or_404(event_id, db)
    check_organizer(event, current_user, "只有活动组织者可以发布公告")

    discussion = Discussion(
        event_id=event_id,
        user_id=current_user.id,
        content=payload.content,
        is_announcement=True,
    )
    db.add(discussion)
    await db.flush()
    await db.refresh(discussion)

    out = DiscussionOut.model_validate(discussion)
    out.user_display_name = current_user.display_name or current_user.username
    out.user_avatar_url = current_user.avatar_url

    logger.info("组织者 %s 在活动 %s 发布公告 %s", current_user.id, event_id, discussion.id)
    return out
