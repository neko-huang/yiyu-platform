"""数据库连接 & Session 管理"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import DATABASE_URL

logger = logging.getLogger("yiyu.database")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """所有 ORM 模型的基类"""

    pass


async def get_db() -> AsyncSession:
    """FastAPI 依赖：获取数据库 session

    自动在成功时提交、异常时回滚，确保 session 总是被正确关闭。
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """创建所有表（开发 / seed 时使用）

    确保所有模型在调用 create_all 前已被导入并注册到 Base.metadata。
    """
    # 显式导入所有模型，确保 Base.metadata 包含全部表定义
    import models  # noqa: F401 — 触发 models/__init__.py 中的全部导入

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 迁移：添加 social_media 列到 users 表（兼容已有数据库）
    async with engine.begin() as conn:
        def _add_column(conn):
            import sqlalchemy as sa
            from sqlalchemy import inspect
            inspector = inspect(conn)
            columns = [c["name"] for c in inspector.get_columns("users")]
            if "social_media" not in columns:
                conn.execute(sa.text("ALTER TABLE users ADD COLUMN social_media JSON"))
                logger.info("迁移：users 表添加 social_media 列")
        await conn.run_sync(_add_column)

    logger.info("数据库表已就绪")
