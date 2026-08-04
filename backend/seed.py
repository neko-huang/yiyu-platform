"""
种子数据脚本 — 益屿活动管理平台

运行方式:
    cd backend
    python seed.py

创建:
    - 1 个管理员账号 (admin / admin123)

如需完整测试数据（25个用户、55+活动），请使用 yiyu-mock-data 仓库：
    https://github.com/neko-huang/yiyu-mock-data
"""

import asyncio
from datetime import date

from sqlalchemy import select

from database import async_session, engine, Base
from models import User, UserProfile
from services.auth import hash_password


async def seed():
    print("🚀 初始化数据库...")

    # 重建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 数据库表已重建")

    async with async_session() as session:
        # 创建管理员
        print("👤 创建管理员账号...")
        admin = User(
            username="admin",
            email="admin@yiyu.com",
            hashed_password=hash_password("admin123"),
            display_name="系统管理员",
            role="admin",
            tags=["管理", "运营"],
        )
        session.add(admin)
        await session.flush()

        # 创建管理员画像
        profile = UserProfile(
            user_id=admin.id,
            bio="益屿平台系统管理员，负责平台运营与活动审核。",
            interests=["管理", "运营", "活动策划"],
            location="上海",
            birth_date=date(1988, 3, 15),
            gender="male",
        )
        session.add(profile)
        await session.commit()

    print()
    print("=" * 50)
    print("✨ 初始化完成！")
    print("=" * 50)
    print("  管理员账号: admin / admin123")
    print()
    print("  启动服务: uvicorn main:app --reload")
    print("  API 文档: http://localhost:8000/docs")
    print()
    print("  💡 需要测试数据？使用 yiyu-mock-data 仓库:")
    print("     https://github.com/neko-huang/yiyu-mock-data")
    print("     git clone + pip install -r requirements.txt + python seed.py")


if __name__ == "__main__":
    asyncio.run(seed())