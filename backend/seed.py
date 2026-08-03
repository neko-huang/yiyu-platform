"""
种子数据脚本 — 益屿活动管理平台

运行方式:
    cd backend
    python seed.py

创建:
    - 2 个管理员 (admin/admin123, yiyu/yiyu123)
    - 8 个普通用户
    - 10 个不同类别的活动
    - 每个活动有报名记录和财务记录
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from database import async_session, engine, init_db
from models import AIPlan, Event, FinanceRecord, Registration, User
from services.auth import hash_password

# ---------------------------------------------------------------------------
# 用户数据
# ---------------------------------------------------------------------------
USERS = [
    {"username": "admin", "email": "admin@yiyu.com", "password": "admin123",
     "display_name": "系统管理员", "role": "admin", "tags": ["管理", "运营"]},
    {"username": "yiyu", "email": "yiyu@yiyu.com", "password": "yiyu123",
     "display_name": "益屿", "role": "admin", "tags": ["策划", "户外", "读书"]},
    {"username": "lina", "email": "lina@yiyu.com", "password": "user123",
     "display_name": "李娜", "role": "user", "tags": ["音乐", "摄影"]},
    {"username": "wangfang", "email": "wangfang@yiyu.com", "password": "user123",
     "display_name": "王芳", "role": "user", "tags": ["读书", "写作"]},
    {"username": "zhangwei", "email": "zhangwei@yiyu.com", "password": "user123",
     "display_name": "张伟", "role": "user", "tags": ["运动", "健身", "户外"]},
    {"username": "chenyu", "email": "chenyu@yiyu.com", "password": "user123",
     "display_name": "陈宇", "role": "user", "tags": ["科技", "讲座"]},
    {"username": "liuyang", "email": "liuyang@yiyu.com", "password": "user123",
     "display_name": "刘洋", "role": "user", "tags": ["音乐", "户外"]},
    {"username": "zhaojing", "email": "zhaojing@yiyu.com", "password": "user123",
     "display_name": "赵静", "role": "user", "tags": ["读书", "美食"]},
    {"username": "sunhao", "email": "sunhao@yiyu.com", "password": "user123",
     "display_name": "孙浩", "role": "user", "tags": ["运动", "摄影"]},
    {"username": "zhoumin", "email": "zhoumin@yiyu.com", "password": "user123",
     "display_name": "周敏", "role": "user", "tags": ["艺术", "讲座", "音乐"]},
]

# ---------------------------------------------------------------------------
# 活动数据 (10 个不同类别)
# ---------------------------------------------------------------------------
now = datetime.now(timezone.utc)


def _dt(days_offset, hour=14):
    return (now + timedelta(days=days_offset)).replace(hour=hour, minute=0, second=0, microsecond=0)


EVENTS = [
    {
        "title": "周末城市徒步：穿越老城区",
        "description": "一起穿越城市老城区，探索历史建筑与市井文化。全程约8公里，适合各年龄段参与者。途中设置3个打卡点，集齐印章可获纪念品。",
        "type": "offline",
        "category": "户外",
        "start_time": _dt(5, 9),
        "end_time": _dt(5, 12),
        "location_name": "人民广场集合点",
        "latitude": 31.2304,
        "longitude": 121.4737,
        "max_participants": 50,
        "price": 0,
        "status": "published",
        "cover_image": None,
        "tags": ["户外", "徒步", "城市探索"],
    },
    {
        "title": "独立音乐人 Live House之夜",
        "description": "本土独立音乐人专场演出，涵盖民谣、后摇、电子三种风格。现场提供饮品，氛围轻松，欢迎音乐爱好者交流。",
        "type": "offline",
        "category": "音乐",
        "start_time": _dt(7, 19),
        "end_time": _dt(7, 22),
        "location_name": "蓝调音乐空间",
        "latitude": 31.2200,
        "longitude": 121.4500,
        "max_participants": 120,
        "price": 80,
        "status": "published",
        "cover_image": None,
        "tags": ["音乐", "现场演出", "社交"],
    },
    {
        "title": "《百年孤独》读书分享会",
        "description": "共读马尔克斯经典之作，探讨魔幻现实主义文学的魅力。参与者需提前阅读指定章节，现场有领读人引导讨论。",
        "type": "offline",
        "category": "读书会",
        "start_time": _dt(3, 14),
        "end_time": _dt(3, 17),
        "location_name": "知行书屋",
        "latitude": 31.2350,
        "longitude": 121.4800,
        "max_participants": 20,
        "price": 20,
        "status": "published",
        "cover_image": None,
        "tags": ["读书", "文学", "分享"],
    },
    {
        "title": "城市羽毛球友谊赛",
        "description": "业余羽毛球爱好者友谊赛，设男单、女单、混双三个项目。需自备球拍，比赛用球由主办方提供。设一二三等奖。",
        "type": "offline",
        "category": "运动",
        "start_time": _dt(10, 9),
        "end_time": _dt(10, 17),
        "location_name": "市体育中心羽毛球馆",
        "latitude": 31.2100,
        "longitude": 121.4900,
        "max_participants": 32,
        "price": 50,
        "status": "published",
        "cover_image": None,
        "tags": ["运动", "羽毛球", "比赛"],
    },
    {
        "title": "AI 时代的职业发展讲座",
        "description": "邀请行业资深从业者分享 AI 浪潮下各行业的变革趋势与个人职业规划建议。线上+线下同步进行，线上链接报名后发送。",
        "type": "hybrid",
        "category": "讲座",
        "start_time": _dt(4, 19),
        "end_time": _dt(4, 21),
        "location_name": "创新中心多功能厅 / 线上 Zoom",
        "latitude": 31.2250,
        "longitude": 121.4600,
        "max_participants": 200,
        "price": 0,
        "status": "published",
        "cover_image": None,
        "tags": ["讲座", "科技", "职业发展"],
    },
    {
        "title": "城市美食地图探店（第三期）",
        "description": "探访城市隐藏的美食店铺，从弄堂小吃到创意餐厅，一网打尽。每期路线不同，本期聚焦老城厢区域。",
        "type": "offline",
        "category": "美食",
        "start_time": _dt(6, 11),
        "end_time": _dt(6, 15),
        "location_name": "老城厢美食街",
        "latitude": 31.2180,
        "longitude": 121.4850,
        "max_participants": 15,
        "price": 100,
        "status": "published",
        "cover_image": None,
        "tags": ["美食", "探店", "社交"],
    },
    {
        "title": "户外摄影工作坊：日落与夜景",
        "description": "专业摄影师带领，从基础构图到长曝光技巧，手把手教学。地点选在城市滨江区域，日落时分拍摄最佳。",
        "type": "offline",
        "category": "摄影",
        "start_time": _dt(8, 16),
        "end_time": _dt(8, 20),
        "location_name": "滨江观景平台",
        "latitude": 31.2400,
        "longitude": 121.5000,
        "max_participants": 12,
        "price": 150,
        "status": "published",
        "cover_image": None,
        "tags": ["摄影", "户外", "工作坊"],
    },
    {
        "title": "社区公益跑步活动",
        "description": "每周六早晨的社区公益跑，每跑一公里主办方捐赠1元给山区儿童教育基金。欢迎所有跑步爱好者参与。",
        "type": "offline",
        "category": "运动",
        "start_time": _dt(2, 7),
        "end_time": _dt(2, 9),
        "location_name": "社区公园北门",
        "latitude": 31.2280,
        "longitude": 121.4700,
        "max_participants": 100,
        "price": 0,
        "status": "published",
        "cover_image": None,
        "tags": ["运动", "公益", "跑步"],
    },
    {
        "title": "手工陶艺体验工坊",
        "description": "在专业陶艺师指导下体验拉坯、塑形、上色等全套陶艺流程。作品可带走烧制完成。适合零基础爱好者。",
        "type": "offline",
        "category": "艺术",
        "start_time": _dt(9, 13),
        "end_time": _dt(9, 16),
        "location_name": "创意园区陶艺工作室",
        "latitude": 31.2150,
        "longitude": 121.4550,
        "max_participants": 10,
        "price": 200,
        "status": "published",
        "cover_image": None,
        "tags": ["艺术", "手工", "体验"],
    },
    {
        "title": "线上编程马拉松：48小时挑战",
        "description": "48小时线上编程挑战赛，主题为「智慧社区」。个人或组队参加，优秀作品将获得奖金和展示机会。全程线上进行。",
        "type": "online",
        "category": "科技",
        "start_time": _dt(12, 9),
        "end_time": _dt(14, 9),
        "location_name": "线上（Discord + GitHub）",
        "latitude": None,
        "longitude": None,
        "max_participants": 500,
        "price": 0,
        "status": "published",
        "cover_image": None,
        "tags": ["科技", "编程", "比赛", "线上"],
    },
]

# ---------------------------------------------------------------------------
# 财务记录模板
# ---------------------------------------------------------------------------
FINANCE_TEMPLATES = [
    # 收入
    {"type": "income", "category": "ticket", "description": "门票收入", "amount_range": (500, 5000)},
    {"type": "income", "category": "sponsorship", "description": "赞助商赞助", "amount_range": (1000, 8000)},
    # 支出
    {"type": "expense", "category": "venue", "description": "场地租赁费", "amount_range": (500, 3000)},
    {"type": "expense", "category": "material", "description": "物料采购", "amount_range": (200, 1500)},
    {"type": "expense", "category": "labor", "description": "工作人员酬劳", "amount_range": (300, 2000)},
    {"type": "expense", "category": "other", "description": "杂项支出", "amount_range": (50, 500)},
]


async def seed():
    print("🚀 开始初始化数据库...")

    # 删除旧数据库表并重建
    from database import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 数据库表已重建")

    async with async_session() as session:
        # ---------------------------------------------------------------
        # 1. 创建用户
        # ---------------------------------------------------------------
        print("👤 创建用户...")
        user_objs = []
        for u in USERS:
            user = User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                display_name=u["display_name"],
                role=u["role"],
                tags=u.get("tags", []),
                avatar_url=None,
            )
            session.add(user)
            user_objs.append(user)

        await session.flush()
        admins = [u for u in user_objs if u.role == "admin"]
        regular_users = [u for u in user_objs if u.role == "user"]
        print(f"   ✅ 创建 {len(admins)} 个管理员 + {len(regular_users)} 个普通用户")

        # ---------------------------------------------------------------
        # 2. 创建活动
        # ---------------------------------------------------------------
        print("📅 创建活动...")
        event_objs = []
        for i, ev_data in enumerate(EVENTS):
            organizer = admins[i % len(admins)]
            event = Event(
                **ev_data,
                organizer_id=organizer.id,
                current_participants=0,
            )
            session.add(event)
            event_objs.append(event)

        await session.flush()
        print(f"   ✅ 创建 {len(event_objs)} 个活动")

        # ---------------------------------------------------------------
        # 3. 创建报名记录
        # ---------------------------------------------------------------
        print("📝 创建报名记录...")
        reg_count = 0
        for event in event_objs:
            # 每个活动随机 3-8 个报名
            num_regs = random.randint(3, 8)
            participants = random.sample(regular_users, min(num_regs, len(regular_users)))

            statuses = ["approved", "approved", "checked_in", "pending", "rejected"]
            for j, p_user in enumerate(participants):
                status = statuses[j % len(statuses)]
                reg = Registration(
                    event_id=event.id,
                    user_id=p_user.id,
                    status=status,
                    form_data={
                        "phone": f"138{random.randint(10000000, 99999999)}",
                        "note": f"我是{p_user.display_name}，期待参加！",
                    },
                    checked_in_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48))
                    if status == "checked_in"
                    else None,
                )
                session.add(reg)
                if status in ("approved", "checked_in"):
                    event.current_participants += 1
                reg_count += 1

        await session.flush()
        print(f"   ✅ 创建 {reg_count} 条报名记录")

        # ---------------------------------------------------------------
        # 4. 创建财务记录
        # ---------------------------------------------------------------
        print("💰 创建财务记录...")
        fin_count = 0
        for event in event_objs:
            # 每个活动随机 3-5 条财务记录
            num_records = random.randint(3, 5)
            templates = random.sample(FINANCE_TEMPLATES, min(num_records, len(FINANCE_TEMPLATES)))
            for tmpl in templates:
                amount = round(random.uniform(*tmpl["amount_range"]), 2)
                record = FinanceRecord(
                    event_id=event.id,
                    type=tmpl["type"],
                    category=tmpl["category"],
                    amount=amount,
                    description=tmpl["description"],
                )
                session.add(record)
                fin_count += 1

        await session.flush()
        print(f"   ✅ 创建 {fin_count} 条财务记录")

        # ---------------------------------------------------------------
        # 5. 创建 AI 方案示例
        # ---------------------------------------------------------------
        print("🤖 创建 AI 方案示例...")
        sample_plan = AIPlan(
            user_id=admins[0].id,
            title="城市文化音乐节方案（AI 生成）",
            content="""## 活动概述

**活动名称：** 城市文化音乐节
**主题：** 声音中的城市记忆
**目标受众：** 18-35岁城市青年、音乐爱好者
**预期规模：** 300-500人
**核心价值：** 通过音乐连接城市文化，打造沉浸式音乐体验

## 流程时间表

| 时间 | 环节 | 负责人 | 备注 |
|------|------|--------|------|
| 14:00-14:30 | 签到入场 | 志愿者组 | 发放手环和节目单 |
| 14:30-15:00 | 开场致辞 | 主办方 | 介绍活动背景 |
| 15:00-16:30 | 本土乐队演出 | 演出组 | 3支乐队轮演 |
| 16:30-17:00 | 互动环节 | 主持组 | 观众点歌互动 |
| 17:00-18:30 | 嘉宾演出 | 演出组 | 知名音乐人 |
| 18:30-19:00 | 闭幕合影 | 全员 | |

## 预算估算

| 项目 | 类别 | 预算金额 | 备注 |
|------|------|----------|------|
| 场地租赁 | 场地 | 5,000 | 户外广场 |
| 音响设备 | 物料 | 3,000 | 含调音师 |
| 乐队酬劳 | 人力 | 6,000 | 4支乐队 |
| 宣传物料 | 物料 | 1,500 | 海报、传单 |
| 安保人员 | 人力 | 2,000 | 4人 |
| **总计** | | **17,500** | |

## 任务清单

### 前期准备
- [ ] 确定场地并签订合同
- [ ] 邀请演出乐队
- [ ] 制作宣传海报
- [ ] 采购物料
- [ ] 招募志愿者

### 活动当天
- [ ] 场地布置
- [ ] 设备调试
- [ ] 签到引导
- [ ] 现场秩序维护

### 后期总结
- [ ] 财务结算
- [ ] 收集反馈
- [ ] 活动复盘报告

## 风险预案

| 风险描述 | 影响程度 | 应对方案 | 负责人 |
|----------|----------|----------|--------|
| 天气突变 | 高 | 准备备选室内场地 | 场务组 |
| 设备故障 | 中 | 备用音响设备 | 技术组 |
| 人流超限 | 中 | 设置入口限流 | 安保组 |
| 乐队迟到 | 低 | 调整演出顺序 | 演出组 |
""",
            conversation_history=[
                {"role": "user", "content": "我想办一个城市文化音乐节"},
                {"role": "assistant", "content": "好的，已为您生成方案..."},
            ],
            status="draft",
        )
        session.add(sample_plan)
        await session.flush()
        print("   ✅ 创建 1 条 AI 方案示例")

        await session.commit()

    print("\n" + "=" * 50)
    print("✨ 种子数据创建完成！")
    print("=" * 50)
    print(f"  用户: {len(USERS)} 个 (2 管理员 + 8 普通)")
    print(f"  活动: {len(EVENTS)} 个")
    print(f"  报名: {reg_count} 条")
    print(f"  财务: {fin_count} 条")
    print(f"  AI方案: 1 条")
    print()
    print("  管理员账号:")
    print("    admin / admin123")
    print("    yiyu / yiyu123")
    print()
    print("  启动服务: uvicorn main:app --reload")
    print("  API 文档: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(seed())
