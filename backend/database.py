"""数据库连接 & Session 管理"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """所有 ORM 模型的基类"""

    pass


async def get_db() -> AsyncSession:
    """FastAPI 依赖：获取数据库 session"""
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
    """创建所有表（开发 / seed 时使用）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
