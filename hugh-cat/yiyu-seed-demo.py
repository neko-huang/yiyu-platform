"""
益屿活动管理平台 — 演示种子数据导入脚本

用法:
    pip install httpx
    python yiyu-seed-demo.py

默认连接 http://localhost:8000，可通过环境变量 API_BASE 修改。
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta

import httpx

API_BASE = os.getenv("API_BASE", "http://localhost:8000").rstrip("/")
API_PREFIX = "/api/v1"

# ---------------------------------------------------------------------------
# 模拟数据
# ---------------------------------------------------------------------------

USERS = [
    {"username": "admin", "email": "admin@yiyu.com", "password": "admin123", "display_name": "益屿管理员", "role": "admin"},
    {"username": "zhangwei", "email": "zhangwei@example.com", "password": "test123", "display_name": "张薇"},
    {"username": "liming", "email": "liming@example.com", "password": "test123", "display_name": "李明"},
    {"username": "wangfang", "email": "wangfang@example.com", "password": "test123", "display_name": "王芳"},
    {"username": "chenlei", "email": "chenlei@example.com", "password": "test123", "display_name": "陈磊"},
    {"username": "zhaoyan", "email": "zhaoyan@example.com", "password": "test123", "display_name": "赵妍"},
    {"username": "liuyang", "email": "liuyang@example.com", "password": "test123", "display_name": "刘洋"},
    {"username": "sunping", "email": "sunping@example.com", "password": "test123", "display_name": "孙萍"},
]

PROFILES = {
    "zhangwei": {"bio": "热爱公益的社区活动策划人", "interests": ["公益", "教育", "环保"], "location": "北京", "gender": "female"},
    "liming": {"bio": "IT从业者，业余时间参与社区服务", "interests": ["科技", "公益", "运动"], "location": "北京", "gender": "male"},
    "wangfang": {"bio": "全职妈妈，社区亲子活动组织者", "interests": ["亲子", "教育", "手工"], "location": "北京", "gender": "female"},
    "chenlei": {"bio": "大学生志愿者，喜欢摄影和户外", "interests": ["摄影", "户外", "公益"], "location": "北京", "gender": "male"},
    "zhaoyan": {"bio": "退休教师，社区文艺活动积极分子", "interests": ["文艺", "阅读", "养生"], "location": "北京", "gender": "female"},
    "liuyang": {"bio": "自由职业者，关注社区发展", "interests": ["设计", "公益", "美食"], "location": "北京", "gender": "male"},
    "sunping": {"bio": "企业HR，业余组织团建活动", "interests": ["运动", "社交", "旅行"], "location": "北京", "gender": "female"},
}

# 一周三次活动，两周数据
EVENTS = [
    {
        "title": "益圈社区读书会 — 《非暴力沟通》共读",
        "description": "每周三晚上的线上读书会，一起阅读《非暴力沟通》，分享交流心得体会。适合希望提升沟通能力的社区成员。",
        "type": "online",
        "category": "读书",
        "start_time": (datetime.now() + timedelta(days=1, hours=18)).isoformat(),
        "end_time": (datetime.now() + timedelta(days=1, hours=20)).isoformat(),
        "location_name": "腾讯会议线上",
        "max_participants": 30,
        "price": 0,
        "tags": ["读书", "公益", "沟通", "益圈"],
        "status": "published",
        "organizer": "zhangwei",
    },
    {
        "title": "周末社区环保清洁日",
        "description": "一起行动！清理社区公共区域的垃圾，分类回收，用实际行动守护我们的家园。工具和手套由组织方提供。",
        "type": "offline",
        "category": "环保",
        "start_time": (datetime.now() + timedelta(days=3, hours=9)).isoformat(),
        "end_time": (datetime.now() + timedelta(days=3, hours=12)).isoformat(),
        "location_name": "朝阳区益圈社区公园",
        "latitude": 39.9042,
        "longitude": 116.4074,
        "max_participants": 50,
        "price": 0,
        "tags": ["环保", "公益", "社区", "益圈"],
        "status": "published",
        "organizer": "zhangwei",
    },
    {
        "title": "亲子手工课：变废为宝",
        "description": "家长和孩子一起动手，用废旧物品制作实用小物件。培养孩子的环保意识和动手能力，度过有意义的亲子时光。",
        "type": "offline",
        "category": "亲子",
        "start_time": (datetime.now() + timedelta(days=5, hours=14)).isoformat(),
        "end_time": (datetime.now() + timedelta(days=5, hours=16)).isoformat(),
        "location_name": "益圈社区活动中心 3楼",
        "max_participants": 20,
        "price": 0,
        "tags": ["亲子", "手工", "公益", "益圈"],
        "status": "published",
        "organizer": "wangfang",
    },
    {
        "title": "社区健康讲座：中医养生入门",
        "description": "邀请中医师为社区居民讲解常见养生知识，包括四季调理、食疗养生、穴位按摩等，现场可免费咨询。",
        "type": "offline",
        "category": "健康",
        "start_time": (datetime.now() + timedelta(days=7, hours=9)).isoformat(),
        "end_time": (datetime.now() + timedelta(days=7, hours=11)).isoformat(),
        "location_name": "益圈社区活动中心 多功能厅",
        "max_participants": 40,
        "price": 0,
        "tags": ["健康", "养生", "公益", "益圈"],
        "status": "published",
        "organizer": "zhaoyan",
    },
    {
        "title": "青年职场分享会：AI时代的职业选择",
        "description": "邀请在AI领域工作的社区青年分享行业趋势和职业发展经验，适合正在求职或考虑转行的年轻人。",
        "type": "hybrid",
        "category": "职场",
        "start_time": (datetime.now() + timedelta(days=8, hours=14)).isoformat(),
        "end_time": (datetime.now() + timedelta(days=8, hours=17)).isoformat(),
        "location_name": "益圈社区活动中心 + 线上同步",
        "max_participants": 35,
        "price": 0,
        "tags": ["职场", "AI", "分享", "益圈"],
        "status": "published",
        "organizer": "liming",
    },
    {
        "title": "社区摄影展：镜头下的北京胡同",
        "description": "面向社区摄影爱好者征集作品，评选优秀作品进行线下展览，同时举办摄影技巧交流沙龙。",
        "type": "offline",
        "category": "文艺",
        "start_time": (datetime.now() + timedelta(days=10, hours=10)).isoformat(),
        "end_time": (datetime.now() + timedelta(days=10, hours=16)).isoformat(),
        "location_name": "益圈社区文化长廊",
        "max_participants": 100,
        "price": 0,
        "tags": ["摄影", "文艺", "展览", "益圈"],
        "status": "published",
        "organizer": "chenlei",
    },
]

ACHIEVEMENTS = [
    {"name": "首次参与", "description": "第一次参加益圈社区活动", "icon": "🌟", "points": 10},
    {"name": "活动达人", "description": "累计参加 5 场活动", "icon": "🏆", "points": 50},
    {"name": "社区之星", "description": "累计参加 10 场活动", "icon": "⭐", "points": 100},
    {"name": "积极志愿者", "description": "组织超过 3 场活动", "icon": "💪", "points": 80},
    {"name": "分享使者", "description": "在讨论区发布 10 条评论", "icon": "💬", "points": 30},
    {"name": "环保卫士", "description": "参加环保类活动 3 次", "icon": "🌱", "points": 60},
    {"name": "书香门第", "description": "参加读书类活动 5 次", "icon": "📚", "points": 60},
    {"name": "最佳拍档", "description": "邀请 3 位朋友注册", "icon": "🤝", "points": 40},
]

FINANCE_RECORDS = [
    {"type": "income", "category": "捐赠", "amount": 5000, "description": "社区企业赞助 — 益圈读书会系列活动"},
    {"type": "income", "category": "捐赠", "amount": 3000, "description": "热心居民捐赠 — 环保活动物资"},
    {"type": "expense", "category": "物资", "amount": 800, "description": "环保清洁日活动物资（手套、垃圾袋、夹子）"},
    {"type": "expense", "category": "物资", "amount": 1200, "description": "亲子手工课材料包 × 20 份"},
    {"type": "expense", "category": "场地", "amount": 500, "description": "社区活动中心场地清洁费"},
    {"type": "expense", "category": "宣传", "amount": 300, "description": "活动海报打印 + 社区公告栏张贴"},
    {"type": "income", "category": "捐赠", "amount": 2000, "description": "个人捐赠 — 支持社区公益项目"},
    {"type": "expense", "category": "茶歇", "amount": 600, "description": "健康讲座茶歇点心"},
]


# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------

def log(msg: str):
    print(f"  {msg}")


def ok(msg: str):
    print(f"  ✅ {msg}")


def fail(msg: str):
    print(f"  ❌ {msg}")


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------

async def main():
    print()
    print("=" * 60)
    print("  益屿活动管理平台 — 演示种子数据导入")
    print("=" * 60)
    print(f"  目标: {API_BASE}{API_PREFIX}")
    print()

    users = {}  # username -> {id, token, ...}
    events = []  # list of created events

    async with httpx.AsyncClient(timeout=30) as client:
        # ---------------------------------------------------------------
        # 1. 注册用户
        # ---------------------------------------------------------------
        print("📝 第1步：注册用户")
        for u in USERS:
            try:
                r = await client.post(f"{API_BASE}{API_PREFIX}/auth/register", json={
                    "username": u["username"],
                    "email": u["email"],
                    "password": u["password"],
                })
                if r.status_code == 201:
                    data = r.json()
                    users[u["username"]] = {
                        "id": data["user"]["id"],
                        "token": data["access_token"],
                        "display_name": u["display_name"],
                        "role": u.get("role", "user"),
                    }
                    ok(f"注册 {u['display_name']} ({u['username']}) — ID={data['user']['id']}")
                elif r.status_code == 409:
                    # 用户已存在，尝试登录
                    log(f"{u['username']} 已存在，尝试登录...")
                    r2 = await client.post(f"{API_BASE}{API_PREFIX}/auth/login", json={
                        "username": u["username"],
                        "password": u["password"],
                    })
                    if r2.status_code == 200:
                        data = r2.json()
                        users[u["username"]] = {
                            "id": data["user"]["id"],
                            "token": data["access_token"],
                            "display_name": u["display_name"],
                            "role": u.get("role", "user"),
                        }
                        ok(f"登录 {u['display_name']} — ID={data['user']['id']}")
                    else:
                        fail(f"登录失败: {r2.text}")
                else:
                    fail(f"注册失败: {r.status_code} {r.text}")
            except Exception as e:
                fail(f"请求异常: {e}")

        if not users:
            print("\n⚠️  没有用户可用，请确保后端正在运行。")
            print("   启动方式: cd backend && uvicorn main:app --reload")
            print(f"   API_BASE={API_BASE} python yiyu-seed-demo.py\n")
            sys.exit(1)

        # ---------------------------------------------------------------
        # 2. 创建用户画像
        # ---------------------------------------------------------------
        print("\n👤 第2步：创建用户画像")
        for username, info in users.items():
            profile = PROFILES.get(username)
            if not profile:
                continue
            headers = {"Authorization": f"Bearer {info['token']}"}
            try:
                r = await client.post(f"{API_BASE}{API_PREFIX}/profiles/me", json=profile, headers=headers)
                if r.status_code == 201:
                    ok(f"{info['display_name']} 画像已创建")
                elif r.status_code == 409:
                    ok(f"{info['display_name']} 画像已存在")
                else:
                    log(f"  {r.status_code}: {r.text[:100]}")
            except Exception as e:
                fail(f"{info['display_name']} 画像创建失败: {e}")

        # ---------------------------------------------------------------
        # 3. 创建活动
        # ---------------------------------------------------------------
        print("\n📅 第3步：创建活动")
        for ev in EVENTS:
            organizer = users.get(ev["organizer"])
            if not organizer:
                log(f"  跳过活动「{ev['title']}」— 组织者未注册")
                continue
            headers = {"Authorization": f"Bearer {organizer['token']}"}
            payload = {k: v for k, v in ev.items() if k != "organizer"}
            try:
                r = await client.post(f"{API_BASE}{API_PREFIX}/events", json=payload, headers=headers)
                if r.status_code == 201:
                    data = r.json()
                    events.append(data)
                    ok(f"「{ev['title']}」已创建 — ID={data['id']}")
                else:
                    fail(f"创建失败: {r.status_code} {r.text[:150]}")
            except Exception as e:
                fail(f"请求异常: {e}")

        if not events:
            print("\n⚠️  没有活动被创建，请检查后端状态。")
            sys.exit(1)

        # ---------------------------------------------------------------
        # 4. 报名活动
        # ---------------------------------------------------------------
        print("\n📋 第4步：模拟报名")
        import random
        random.seed(42)
        for ev in events:
            # 每个活动随机选 3-8 个用户报名
            candidates = [u for u_name, u in users.items() if u["id"] != ev.get("organizer_id")]
            participants = random.sample(candidates, min(random.randint(3, 8), len(candidates)))
            for user in participants:
                headers = {"Authorization": f"Bearer {user['token']}"}
                try:
                    r = await client.post(
                        f"{API_BASE}{API_PREFIX}/events/{ev['id']}/register",
                        json={"form_data": {"name": user["display_name"], "note": "期待参加！"}},
                        headers=headers,
                    )
                    if r.status_code == 201:
                        pass  # 不逐个打印
                    elif r.status_code == 409:
                        pass  # 已报名
                except:
                    pass
            ok(f"「{ev['title']}」— {len(participants)} 人报名")

        # ---------------------------------------------------------------
        # 5. 创建财务记录（给第一个活动）
        # ---------------------------------------------------------------
        print("\n💰 第5步：创建财务记录")
        if events:
            admin = users.get("admin") or list(users.values())[0]
            headers = {"Authorization": f"Bearer {admin['token']}"}
            for rec in FINANCE_RECORDS:
                try:
                    # 财务记录关联到第一个活动
                    payload = {**rec, "event_id": events[0]["id"]}
                    r = await client.post(f"{API_BASE}{API_PREFIX}/finance", json=payload, headers=headers)
                    if r.status_code == 201:
                        ok(f"{rec['type']} {rec['amount']}元 — {rec['description'][:20]}...")
                    else:
                        log(f"  {r.status_code}: {r.text[:100]}")
                except Exception as e:
                    fail(f"财务记录失败: {e}")

        # ---------------------------------------------------------------
        # 6. 创建成就系统
        # ---------------------------------------------------------------
        print("\n🏆 第6步：创建成就定义")
        admin = users.get("admin") or list(users.values())[0]
        headers = {"Authorization": f"Bearer {admin['token']}"}
        for ach in ACHIEVEMENTS:
            try:
                r = await client.post(f"{API_BASE}{API_PREFIX}/achievements", json=ach, headers=headers)
                if r.status_code == 201:
                    ok(f"{ach['name']} ({ach['points']}分)")
                elif r.status_code == 409:
                    ok(f"{ach['name']} 已存在")
                else:
                    log(f"  {r.status_code}: {r.text[:100]}")
            except Exception as e:
                fail(f"成就创建失败: {e}")

        # ---------------------------------------------------------------
        # 7. 创建活动复盘
        # ---------------------------------------------------------------
        print("\n📝 第7步：创建活动复盘")
        for ev in events[:3]:  # 前3个活动有复盘
            org = users.get(ev.get("organizer_username") or EVENTS[events.index(ev)]["organizer"])
            if not org:
                continue
            headers = {"Authorization": f"Bearer {org['token']}"}
            review = {
                "rating": random.randint(4, 5),
                "comment": "活动顺利进行，参与者反馈积极，下次可以增加互动环节。" if random.random() > 0.5 else "整体效果不错，参与度超出预期，建议后续扩大规模。",
                "strengths": ["组织有序", "参与度高", "内容质量好"],
                "improvements": ["时间可以稍长", "场地可以更大"],
            }
            try:
                r = await client.post(
                    f"{API_BASE}{API_PREFIX}/events/{ev['id']}/review",
                    json=review,
                    headers=headers,
                )
                if r.status_code == 201:
                    ok(f"「{ev['title']}」复盘已创建")
                else:
                    log(f"  {r.status_code}: {r.text[:100]}")
            except Exception as e:
                fail(f"复盘失败: {e}")

        # ---------------------------------------------------------------
        # 完成
        # ---------------------------------------------------------------
        print()
        print("=" * 60)
        print("  ✅ 种子数据导入完成！")
        print("=" * 60)
        print(f"  用户: {len(users)} 个")
        print(f"  活动: {len(events)} 个")
        print(f"  财务: {len(FINANCE_RECORDS)} 条")
        print(f"  成就: {len(ACHIEVEMENTS)} 个")
        print()
        print(f"  管理员账号: admin / admin123")
        print(f"  测试账号:   zhangwei / test123 等")
        print()
        print(f"  📍 访问: {API_BASE}")
        print(f"  📖 文档: {API_BASE}/docs")
        print()


if __name__ == "__main__":
    asyncio.run(main())