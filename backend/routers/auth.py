"""认证路由"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import User
from routers.dependencies import get_current_user
from schemas.user import Token, UserLogin, UserOut, UserRegister, UserUpdate
from services.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    logger.info("注册请求: username=%s, email=%s", payload.username, payload.email)

    # 检查用户名和邮箱唯一性
    existing = await db.execute(
        select(User).where(
            (User.username == payload.username) | (User.email == payload.email)
        )
    )
    if existing.scalar_one_or_none():
        logger.warning("注册失败: 用户名或邮箱已存在 username=%s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名或邮箱已存在",
        )

    # 哈希密码
    try:
        hashed = hash_password(payload.password)
    except Exception as exc:
        logger.error("密码哈希失败: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码处理失败，请稍后重试",
        )

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hashed,
        display_name=payload.username,
        role="user",
        tags=[],
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        logger.warning("注册失败: 数据库完整性冲突 username=%s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名或邮箱已存在",
        )
    except Exception as exc:
        await db.rollback()
        logger.error("数据库写入失败: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="数据库错误，请稍后重试",
        )

    await db.refresh(user)
    logger.info("用户写入成功: id=%s, username=%s", user.id, user.username)

    # 注册成功后自动签发 token，与登录接口返回格式一致
    try:
        token = create_access_token({"sub": str(user.id), "role": user.role})
        user_out = UserOut.model_validate(user)
        logger.info("新用户注册成功: %s (id=%s)", user.username, user.id)
        return Token(
            access_token=token,
            token_type="bearer",
            user=user_out,
        )
    except Exception as exc:
        logger.error("注册后处理失败 (token/序列化): %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册处理异常，请稍后重试",
        )


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            (User.username == payload.username) | (User.email == payload.username)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info("用户登录: %s (id=%s)", user.username, user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    await db.flush()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)
