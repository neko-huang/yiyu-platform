"""
种子数据脚本 — 益屿活动管理平台

运行方式:
    cd backend
    python seed.py

创建演示数据，包括用户、活动、报名、财务、复盘、SOP 模板等。
"""

import asyncio
from datetime import date, datetime, timedelta

from sqlalchemy import select

from database import async_session, engine, Base
from models import (
    User, UserProfile, Event, Registration, FinanceRecord,
    EventReview, SOPTemplate, Discussion, Achievement,
    UserAchievement, PointTransaction, Album, AlbumPhoto, Copywriting,
)
from services.auth import hash_password


# =============================================
# 演示头像（使用 picsum 占位图）
# =============================================
AVATARS = [
    "https://picsum.photos/seed/user1/200/200",
    "https://picsum.photos/seed/user2/200/200",
    "https://picsum.photos/seed/user3/200/200",
    "https://picsum.photos/seed/user4/200/200",
    "https://picsum.photos/seed/user5/200/200",
]

COVER_IMAGES = [
    "https://picsum.photos/seed/cover1/800/400",
    "https://picsum.photos/seed/cover2/800/400",
    "https://picsum.photos/seed/cover3/800/400",
    "https://picsum.photos/seed/cover4/800/400",
    "https://picsum.photos/seed/cover5/800/400",
    "https://picsum.photos/seed/cover6/800/400",
    "https://picsum.photos/seed/cover7/800/400",
    "https://picsum.photos/seed/cover8/800/400",
    "https://picsum.photos/seed/cover9/800/400",
    "https://picsum.photos/seed/cover10/800/400",
]

PHOTO_IMAGES = [
    "https://picsum.photos/seed/photo1/400/300",
    "https://picsum.photos/seed/photo2/400/300",
    "https://picsum.photos/seed/photo3/400/300",
    "https://picsum.photos/seed/photo4/400/300",
    "https://picsum.photos/seed/photo5/400/300",
    "https://picsum.photos/seed/photo6/400/300",
]


# =============================================
# 演示数据
# =============================================
USERS_DATA = [
    dict(username="admin", email="admin@yiyu.com", password="admin123",
         display_name="系统管理员", role="admin",
         tags=["管理", "运营"],
         profile=dict(bio="益屿平台系统管理员，负责平台运营与活动审核。",
                      interests=["管理", "运营", "活动策划"],
                      location="上海", birth_date=date(1988, 3, 15), gender="male")),
    dict(username="alice", email="alice@example.com", password="alice123",
         display_name="爱丽丝", role="user",
         tags=["户外", "摄影", "旅行"],
         profile=dict(bio="户外爱好者，周末喜欢爬山和徒步，偶尔拍拍风景照。",
                      interests=["户外", "摄影", "徒步", "旅行"],
                      location="北京", birth_date=date(1995, 7, 22), gender="female")),
    dict(username="bob", email="bob@example.com", password="bob123",
         display_name="Bob", role="user",
         tags=["技术", "创业", "读书"],
         profile=dict(bio="独立开发者，喜欢参加技术沙龙和创业分享会。",
                      interests=["技术", "创业", "读书", "AI"],
                      location="深圳", birth_date=date(1992, 11, 8), gender="male")),
    dict(username="carol", email="carol@example.com", password="carol123",
         display_name="小卡", role="user",
         tags=["美食", "手作", "社交"],
         profile=dict(bio="美食博主，喜欢组织线下聚餐和手作工坊。",
                      interests=["美食", "手作", "社交", "插花"],
                      location="杭州", birth_date=date(1998, 2, 14), gender="female")),
    dict(username="david", email="david@example.com", password="david123",
         display_name="大伟", role="user",
         tags=["运动", "公益", "音乐"],
         profile=dict(bio="运动达人，马拉松爱好者，也喜欢做公益和弹吉他。",
                      interests=["运动", "公益", "音乐", "跑步"],
                      location="广州", birth_date=date(1990, 9, 30), gender="male")),
]

EVENTS_DATA = [
    dict(title="🏔️ 香山红叶徒步之旅",
         description="## 活动亮点\n\n秋天到了，一起去香山看红叶吧！\n\n### 行程安排\n- **09:00** 香山公园东门集合\n- **09:30** 开始徒步登山\n- **12:00** 山顶野餐（自带午餐）\n- **14:00** 下山，自由活动\n- **16:00** 活动结束\n\n### 注意事项\n- 穿舒适的运动鞋\n- 自带水和午餐\n- 建议携带相机📷",
         organizer_index=1, type="offline", category="户外",
         start_offset=7, duration_hours=7,
         location_name="北京香山公园", latitude=39.9919, longitude=116.1795,
         max_participants=20, price=0, status="published",
         cover_idx=0, tags=["户外", "徒步", "摄影", "秋游"]),
    dict(title="💻 AI 开发者沙龙：大模型应用实战",
         description="## 活动介绍\n\n本次沙龙聚焦大模型在实际业务中的应用，邀请多位一线开发者分享实战经验。\n\n### 分享主题\n1. **RAG 系统搭建最佳实践**\n2. **AI Agent 设计模式**\n3. **模型微调落地经验**\n\n### 适合人群\n- 有编程基础的开发者\n- 对 AI 应用感兴趣的产品经理\n- 技术创业者\n\n**名额有限，先到先得！**",
         organizer_index=2, type="offline", category="技术",
         start_offset=14, duration_hours=4,
         location_name="北京市海淀区中关村创业大街", latitude=39.9819, longitude=116.3119,
         max_participants=50, price=29.9, status="published",
         cover_idx=1, tags=["技术", "AI", "大模型", "创业"]),
    dict(title="🍰 周末烘焙工坊：手作蛋糕体验",
         description="## 活动内容\n\n零基础也能做！专业烘焙师手把手教你做一款超好看的蛋糕。\n\n### 你将学到\n- 戚风蛋糕胚制作\n- 奶油打发技巧\n- 裱花基础手法\n- 水果装饰摆盘\n\n### 费用包含\n所有食材、工具使用、成品打包盒\n\n**每人可带走一个 6 寸蛋糕哦！**",
         organizer_index=3, type="offline", category="美食",
         start_offset=3, duration_hours=3,
         location_name="杭州市西湖区文三路", latitude=30.2741, longitude=120.1551,
         max_participants=12, price=168, status="published",
         cover_idx=2, tags=["美食", "烘焙", "手作", "社交"]),
    dict(title="🏃 城市夜跑·奥森站",
         description="## 活动介绍\n\n每周三晚上的城市夜跑，这次在奥林匹克森林公园。\n\n### 路线\n- 5km 入门组（配速 7:00）\n- 10km 进阶组（配速 5:30）\n\n### 流程\n- 19:00 集合热身\n- 19:30 开跑\n- 20:30 拉伸放松\n- 21:00 合影解散\n\n跑完一起喝饮料聊天 🥤",
         organizer_index=4, type="offline", category="运动",
         start_offset=2, duration_hours=2,
         location_name="北京奥林匹克森林公园南门", latitude=40.0170, longitude=116.3914,
         max_participants=30, price=0, status="published",
         cover_idx=3, tags=["运动", "跑步", "夜跑", "健身"]),
    dict(title="🎸 草地音乐夜市",
         description="## 活动介绍\n\n带上你的吉他和野餐垫，来一场夏夜草地音乐会！\n\n### 节目单\n- **开放麦环节**：谁都可以上台唱一首\n- **即兴合奏**：现场组队玩音乐\n- **乐器体验**：尤克里里、手鼓免费体验\n\n### 建议携带\n- 吉他/尤克里里/口琴等乐器\n- 野餐垫或折叠椅\n- 零食饮料分享\n\n不管会不会乐器，欢迎来听歌～",
         organizer_index=4, type="offline", category="音乐",
         start_offset=10, duration_hours=4,
         location_name="广州二沙岛音乐公园草坪", latitude=23.1129, longitude=113.2865,
         max_participants=60, price=0, status="published",
         cover_idx=4, tags=["音乐", "户外", "社交", "夏夜"]),
    dict(title="📚 读书会：2024 年度好书分享",
         description="## 本期主题\n\n每人推荐一本 2024 年读过的好书，分享你的阅读感悟。\n\n### 活动流程\n1. 破冰自我介绍\n2. 每人 5 分钟分享\n3. 自由讨论交流\n4. 投票选出最佳推荐\n\n### 往期推荐书目\n- 《置身事内》\n- 《纳瓦尔宝典》\n- 《芯片战争》\n\n**参加请提前准备一本想要分享的书**",
         organizer_index=2, type="offline", category="读书",
         start_offset=21, duration_hours=2.5,
         location_name="深圳南山区科技园咖啡馆", latitude=22.5431, longitude=113.9538,
         max_participants=15, price=0, status="published",
         cover_idx=5, tags=["读书", "社交", "成长", "分享"]),
    dict(title="🌱 城市农场体验日",
         description="## 活动介绍\n\n远离城市喧嚣，来城市农场体验一日田园生活！\n\n### 活动内容\n- 🥬 蔬菜种植体验\n- 🐔 喂鸡捡鸡蛋\n- 🍳 农场午餐（现摘现做）\n- 🌿 多肉植物 DIY\n\n### 适合\n亲子家庭、情侣、朋友结伴\n\n**农场提供遮阳帽和饮用水**",
         organizer_index=3, type="offline", category="亲子",
         start_offset=17, duration_hours=6,
         location_name="上海崇明岛开心农场", latitude=31.6170, longitude=121.5720,
         max_participants=25, price=99, status="published",
         cover_idx=6, tags=["亲子", "户外", "自然", "体验"]),
    dict(title="🎯 产品经理实战工作坊",
         description="## 工作坊内容\n\n一天时间，从 0 到 1 完成一个产品方案设计。\n\n### 你将收获\n- ✅ 需求分析方法论\n- ✅ 用户画像绘制技巧\n- ✅ 原型设计实操\n- ✅ 产品路演展示\n\n### 导师\n资深产品总监，10 年互联网产品经验\n\n**自带电脑，现场实操！**",
         organizer_index=2, type="offline", category="技术",
         start_offset=28, duration_hours=6,
         location_name="深圳市福田区车公庙", latitude=22.5362, longitude=114.0225,
         max_participants=20, price=199, status="published",
         cover_idx=7, tags=["产品", "职场", "技能", "成长"]),
    dict(title="♻️ 社区旧物交换市集",
         description="## 活动介绍\n\n把你的闲置变成别人的宝藏！\n\n### 可以交换什么\n- 📚 书籍、杂志\n- 👗 衣物、配饰\n- 🎮 游戏、玩具\n- 🏺 家居小物\n- 🎵 唱片、乐器\n\n### 规则\n- 物品需干净完好\n- 无需金钱，以物易物\n- 未交换物品可捐赠给社区\n\n**一起践行可持续生活！**",
         organizer_index=1, type="offline", category="公益",
         start_offset=5, duration_hours=4,
         location_name="北京市朝阳区望京SOHO广场", latitude=39.9950, longitude=116.4750,
         max_participants=40, price=0, status="published",
         cover_idx=8, tags=["公益", "环保", "社区", "社交"]),
    dict(title="🎨 零基础油画体验：画一幅星空",
         description="## 活动介绍\n\n没有绘画基础也不用怕，专业老师带你一步一步画出一幅属于你的星空。\n\n### 包含\n- 🖼️ 40x50cm 画布\n- 🎨 全部颜料和画笔\n- 👩‍🏫 专业老师指导\n- ☕ 下午茶一份\n\n### 时长\n约 2.5 小时，画完可以带走哦！\n\n**周末放松心情的好选择～**",
         organizer_index=3, type="offline", category="艺术",
         start_offset=12, duration_hours=2.5,
         location_name="杭州市拱墅区小河直街", latitude=30.3018, longitude=120.1362,
         max_participants=10, price=198, status="published",
         cover_idx=9, tags=["艺术", "绘画", "手作", "休闲"]),
]

FINISHED_EVENTS_INDICES = [0, 3, 5]  # 已结束的活动索引


async def seed():
    print("🚀 初始化数据库...")

    # 重建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 数据库表已重建")

    now = datetime.now()
    users = []
    events = []

    async with async_session() as session:
        # ========== 创建用户 ==========
        print("👤 创建演示用户...")
        for i, ud in enumerate(USERS_DATA):
            user = User(
                username=ud["username"],
                email=ud["email"],
                hashed_password=hash_password(ud["password"]),
                display_name=ud["display_name"],
                role=ud["role"],
                tags=ud["tags"],
                avatar_url=AVATARS[i],
            )
            session.add(user)
            await session.flush()
            users.append(user)

            profile = UserProfile(
                user_id=user.id,
                avatar_url=AVATARS[i],
                **ud["profile"],
            )
            session.add(profile)

        print(f"   ✅ 创建了 {len(users)} 个用户")

        # ========== 创建活动 ==========
        print("📅 创建演示活动...")
        for i, ed in enumerate(EVENTS_DATA):
            start = now + timedelta(days=ed["start_offset"])
            end = start + timedelta(hours=ed["duration_hours"])

            # 已结束的活动：时间设为过去
            if i in FINISHED_EVENTS_INDICES:
                start = now - timedelta(days=30 - ed["start_offset"])
                end = start + timedelta(hours=ed["duration_hours"])
                status = "finished"
            else:
                status = ed["status"]

            event = Event(
                title=ed["title"],
                description=ed["description"],
                organizer_id=users[ed["organizer_index"]].id,
                type=ed["type"],
                category=ed["category"],
                start_time=start,
                end_time=end,
                location_name=ed["location_name"],
                latitude=ed["latitude"],
                longitude=ed["longitude"],
                max_participants=ed["max_participants"],
                price=ed["price"],
                status=status,
                cover_image=COVER_IMAGES[ed["cover_idx"]],
                tags=ed["tags"],
            )
            session.add(event)
            await session.flush()
            events.append(event)

        print(f"   ✅ 创建了 {len(events)} 个活动")

        # ========== 创建报名记录 ==========
        print("📝 创建报名记录...")
        reg_count = 0
        for ei, event in enumerate(events):
            event_current = 0
            # 每个活动有 2-4 个报名用户
            num_regs = min(2 + ei % 3, len(users) - 1)
            for ui in range(1, num_regs + 1):
                if ui >= len(users):
                    break
                # 承办人不报名自己的活动
                org_id = EVENTS_DATA[ei]["organizer_index"]
                if ui == org_id:
                    continue
                status = "approved"
                if event.status == "finished":
                    status = "checked_in"
                    reg = Registration(
                        event_id=event.id,
                        user_id=users[ui].id,
                        status=status,
                        form_data={"name": users[ui].display_name, "phone": "138****{:04d}".format(ui * 1000 + ei)},
                        checked_in_at=event.start_time + timedelta(minutes=15),
                    )
                else:
                    reg = Registration(
                        event_id=event.id,
                        user_id=users[ui].id,
                        status=status,
                        form_data={"name": users[ui].display_name, "phone": "138****{:04d}".format(ui * 1000 + ei)},
                    )
                session.add(reg)
                event_current += 1
                reg_count += 1
            event.current_participants = event_current

        print(f"   ✅ 创建了 {reg_count} 条报名记录")

        # ========== 创建财务记录 ==========
        print("💰 创建财务记录...")
        fin_count = 0
        for ei, event in enumerate(events):
            if event.price > 0:
                # 收入：按报名人数计算
                income = event.current_participants * event.price
                session.add(FinanceRecord(
                    event_id=event.id, type="income", category="ticket",
                    amount=income,
                    description=f"门票收入（{event.current_participants}人 × ¥{event.price}）",
                ))
                fin_count += 1
                # 支出：场地、物料等
                expenses = [
                    ("场地租赁", event.price * 2),
                    ("物料采购", event.price * 0.5),
                    ("茶歇", event.price * 0.3),
                ]
                for desc, amt in expenses:
                    session.add(FinanceRecord(
                        event_id=event.id, type="expense", category="venue",
                        amount=round(amt, 2),
                        description=desc,
                    ))
                    fin_count += 1

        print(f"   ✅ 创建了 {fin_count} 条财务记录")

        # ========== 创建复盘报告 ==========
        print("📋 创建复盘报告...")
        review_count = 0
        for ei in FINISHED_EVENTS_INDICES:
            event = events[ei]
            org_id = EVENTS_DATA[ei]["organizer_index"]
            session.add(EventReview(
                event_id=event.id,
                user_id=users[org_id].id,
                overall_rating=4 + ei % 2,
                attendance_rate=round(0.7 + ei * 0.05, 2),
                highlights="活动氛围很好，参与者反馈积极。\n- 签到流程顺畅\n- 内容安排合理\n- 互动环节效果好",
                issues="- 时间略紧，部分环节可延长\n- 场地音响设备需提前测试",
                improvements="- 下次增加中间休息时间\n- 提前一天再次确认场地设备",
                key_learnings="提前做好详细的时间规划和应急预案，活动执行会更流畅。",
                reuse_suggestion="yes" if ei > 0 else "maybe",
            ))
            review_count += 1

        print(f"   ✅ 创建了 {review_count} 条复盘报告")

        # ========== 创建 SOP 模板 ==========
        print("📄 创建 SOP 模板...")
        sop_templates = [
            dict(name="户外徒步活动 SOP", category="户外",
                 description="适用于户外徒步、登山、露营等活动的标准流程。",
                 content="## 户外徒步活动 SOP\n\n### 活动前（7天）\n- [ ] 确定路线并踩点\n- [ ] 查看天气预报\n- [ ] 准备急救包\n\n### 活动前（3天）\n- [ ] 发布活动详情\n- [ ] 确认参与人数\n- [ ] 购买保险\n\n### 活动当天\n- [ ] 集合签到\n- [ ] 热身运动\n- [ ] 出发前安全说明\n- [ ] 活动过程中每1小时清点人数\n\n### 活动后\n- [ ] 照片分享\n- [ ] 收集反馈\n- [ ] 发布活动总结",
                 tags=["户外", "徒步", "SOP"], is_public=True, usage_count=12),
            dict(name="技术沙龙标准流程", category="技术",
                 description="举办技术沙龙/开发者 Meetup 的标准化流程。",
                 content="## 技术沙龙标准流程\n\n### 活动前（14天）\n- [ ] 确定主题和嘉宾\n- [ ] 预订场地\n- [ ] 发布活动通知\n\n### 活动前（3天）\n- [ ] 确认嘉宾行程\n- [ ] 测试设备\n- [ ] 准备签到二维码\n\n### 活动当天\n- [ ] 提前1小时到场布置\n- [ ] 签到引导\n- [ ] 主持人开场\n- [ ] 嘉宾分享（每场45min+15minQ&A）\n- [ ] 自由交流\n\n### 活动后\n- [ ] 整理分享资料\n- [ ] 发布回顾文章\n- [ ] 感谢嘉宾",
                 tags=["技术", "沙龙", "SOP"], is_public=True, usage_count=8),
            dict(name="手作工坊执行清单", category="美食",
                 description="手作类（烘焙、手工等）活动的执行清单。",
                 content="## 手作工坊执行清单\n\n### 物料准备\n- [ ] 确认食材/材料清单\n- [ ] 准备工具（每人一套）\n- [ ] 准备包装盒\n\n### 场地布置\n- [ ] 操作台布局\n- [ ] 清洗区安排\n- [ ] 拍照区设置\n\n### 活动流程\n- [ ] 老师演示（15min）\n- [ ] 学员实操（60min）\n- [ ] 老师巡回指导\n- [ ] 成品展示拍照\n\n### 收尾\n- [ ] 工具清洗归位\n- [ ] 剩余材料处理\n- [ ] 活动照片分享",
                 tags=["手作", "美食", "SOP"], is_public=True, usage_count=5),
        ]
        for st in sop_templates:
            session.add(SOPTemplate(
                user_id=users[1].id,
                name=st["name"],
                category=st["category"],
                description=st["description"],
                content=st["content"],
                tags=st["tags"],
                is_public=st["is_public"],
                usage_count=st["usage_count"],
            ))

        print(f"   ✅ 创建了 {len(sop_templates)} 个 SOP 模板")

        # ========== 创建讨论区消息 ==========
        print("💬 创建讨论区消息...")
        discussions_data = [
            (0, 1, "好期待这次活动！请问需要带什么特别的东西吗？", False),
            (0, 0, "穿舒适的运动鞋，带好水和午餐就好，不需要特别准备 😊", False),
            (0, 3, "我也报名了！到时候一起拍照呀 📸", False),
            (1, 4, "请问有线上直播吗？我在广州过不去", False),
            (1, 0, "目前是纯线下活动，会后我们会整理分享资料发给大家～", False),
            (1, 2, "期待各位大神的分享！", False),
            (3, 1, "今晚夜跑，有人一起从地铁站走过去吗？", False),
            (3, 4, "我！南门集合对吧？", False),
            (2, 2, "还有名额吗？想带朋友一起来", False),
            (2, 0, "还剩 3 个名额，要来的话尽快报名哦", False),
        ]
        for ei, ui, content, is_ann in discussions_data:
            session.add(Discussion(
                event_id=events[ei].id,
                user_id=users[ui].id,
                content=content,
                is_announcement=is_ann,
            ))

        # 活动公告
        session.add(Discussion(
            event_id=events[0].id,
            user_id=users[0].id,
            content="📢 温馨提示：本周六天气预报晴，气温 15-22°C，适合户外活动。请准时 9:00 在香山公园东门集合！",
            is_announcement=True,
        ))

        print(f"   ✅ 创建了讨论区消息")

        # ========== 创建成就系统 ==========
        print("🏆 创建成就系统...")
        achievements = [
            Achievement(name="活动新人", description="第一次参加活动", icon="🌟",
                        condition_type="registration_count", condition_value=1),
            Achievement(name="社交达人", description="参加 5 次活动", icon="🎯",
                        condition_type="registration_count", condition_value=5, is_limited=False),
            Achievement(name="活动达人", description="参加 10 次活动", icon="🏅",
                        condition_type="registration_count", condition_value=10),
            Achievement(name="热心组织者", description="组织 3 次活动", icon="👑",
                        condition_type="org_count", condition_value=3),
            Achievement(name="签到王", description="签到 5 次活动", icon="✅",
                        condition_type="checkin_count", condition_value=5),
            Achievement(name="评论家", description="发表 3 条评论", icon="💬",
                        condition_type="discussion_count", condition_value=3),
        ]
        for ach in achievements:
            session.add(ach)
        await session.flush()

        # 为用户颁发成就
        user_achievements = [
            (1, 0), (1, 1), (2, 0), (2, 1), (3, 0), (4, 0), (4, 1),
        ]
        for ui, ai in user_achievements:
            session.add(UserAchievement(user_id=users[ui].id, achievement_id=achievements[ai].id))

        # 积分记录
        points_data = [
            (1, 50, "报名活动", 0), (1, 30, "签到活动", 3),
            (2, 50, "报名活动", 1), (2, 20, "发表评论", None),
            (3, 50, "报名活动", 2), (3, 30, "签到活动", 2),
            (4, 50, "报名活动", 3), (4, 30, "签到活动", 3), (4, 20, "发表评论", None),
        ]
        for ui, pts, desc, rel_ei in points_data:
            session.add(PointTransaction(
                user_id=users[ui].id, points=pts, tx_type="earn",
                description=desc,
                related_event_id=events[rel_ei].id if rel_ei is not None else None,
            ))

        print(f"   ✅ 创建了成就和积分数据")

        # ========== 创建活动相册 ==========
        print("📸 创建活动相册...")
        for ei in FINISHED_EVENTS_INDICES:
            event = events[ei]
            org_id = EVENTS_DATA[ei]["organizer_index"]
            album = Album(
                event_id=event.id,
                user_id=users[org_id].id,
                title=f"{event.title} 精彩瞬间",
                description="活动照片记录",
            )
            session.add(album)
            await session.flush()

            for pi in range(3):
                session.add(AlbumPhoto(
                    album_id=album.id,
                    user_id=users[org_id].id,
                    image_url=PHOTO_IMAGES[pi],
                    caption=f"活动照片 {pi + 1}",
                    sort_order=pi,
                ))

        print(f"   ✅ 创建了活动相册")

        # ========== 提交 ==========
        await session.commit()

    print()
    print("=" * 55)
    print("✨ 演示数据初始化完成！")
    print("=" * 55)
    print()
    print("  演示账号:")
    print("  ─────────────────────────────────────────")
    for ud in USERS_DATA:
        print(f"  👤 {ud['display_name']:　<6}  /  {ud['username']} / {ud['password']}")
    print()
    print("  运行服务: uvicorn main:app --reload")
    print("  API 文档: http://localhost:8000/docs")
    print()


if __name__ == "__main__":
    asyncio.run(seed())