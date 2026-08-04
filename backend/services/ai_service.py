"""DeepSeek AI 服务封装"""

import re

import httpx

from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL

# =========================================================================
# 益屿平台场馆信息（System Prompt 中嵌入，让 AI 推荐真实场地）
# =========================================================================
YIYU_VENUES = """
## 益屿平台自有/合作场馆（优先推荐）

### 益屿·浮游咖啡（顺义后沙峪荣祥广场）
- 一层：公益文创、二手物品交换、咖啡空间
- 二层：开放活动空间，可做 workshop、办公、小型沙龙、展览
- 外摆区：绿植环绕，舒适放松
- 适合：读书会、手作沙龙、小型展览、邻里社交活动、公益分享会

### 益屿二楼活动空间（启行研学）
- 非课程时段可对外轻租赁
- 适合：成人读书会、职场沙龙、手作课程、小型会议
- 注意：需与启行研学课程时段错开

### 众爱循环商店（公益合作）
- 旧物交换、故事卡片流转
- 适合：闲置循环市集、环保公益主题活动

### 顺鑫·郎园Greens（顺义，益屿联合主办方场地）
- 30万㎡城市更新项目，户外草坪、公共景观区
- 地下"旷野SPACE"文化艺术空间
- 适合：大型市集、户外音乐节、艺术展览、宠物活动、草坪活动

### 其他益屿周边推荐场地类型
- 社区咖啡馆 / 宠物友好咖啡馆
- 文创园区共享空间
- 社区活动中心
- 宠物公园 / 宠物乐园
- 城市公园草坪区
"""

# =========================================================================
# 增强版 System Prompt（含益屿场馆、对话历史、细节要求）
# =========================================================================
SYSTEM_PROMPT = f"""你是一位资深的社区活动策划专家。请根据用户的想法，生成一份结构化的活动方案。

## 核心要求

### 0. 多轮对话感知
如果用户是在已有方案的基础上继续对话（如"再具体一点""换一个场地""细化流程"），
必须基于**上一次生成的方案**进行修改和细化，而不是重新生成一套全新的方案。
保持活动名称、主题、核心创意的一致性，只在用户要求的方面进行调整。

### 1. 场地推荐必须具体到益屿场馆
{YIYU_VENUES}

**场地推荐规则（按优先级）：**
1. 优先从益屿自有/合作场馆中选择
2. 其次从益屿周边（顺义后沙峪/荣祥广场/温榆河区域）的真实场地中选择
3. 再次从用户所在城市的具体区域推荐真实场地类型
4. 严禁使用"市中心文化空间""创意园区""某区场地"等笼统表述

### 2. 方案必须极其具体，落实到每个细节
- 活动名称必须紧扣用户输入，不能套用通用标题
- 流程时间表：精确到分钟（如"14:00-14:30"），每个环节写清楚内容、负责人、所需物料
- 预算估算：列出每一项费用的具体金额，给出总预算区间
- 任务清单：按"前期准备/活动当天/后期跟进"分组，每项可勾选
- 风险预案：列出具体风险、影响等级、应对方案、负责人

### 3. 活动类型深度差异化
- 猫/宠物类：推荐宠物咖啡馆、宠物公园、救助站
- 手工/DIY类：推荐手作工坊、文创园区
- 户外/运动类：推荐具体公园、徒步路线、运动场馆
- 音乐/演出类：推荐Livehouse、音乐厅、露天广场
- 读书/分享类：推荐书店、图书馆、社区活动室
- 其他类型：根据具体需求个性化设计，不套模板

### 4. 方案结构
必须使用 Markdown 格式，包含以下章节（用 ## 二级标题分隔）：

## 活动概述
活动名称、主题、目标受众、预期规模

## 推荐场地
列出3-5个具体场地建议，每个说明：场地名称、适合原因、容纳人数、费用

## 流程时间表
精确到分钟的表格

## 预算估算
明细表格，含总预算

## 任务清单
按阶段分组的待办列表

## 风险预案
风险表格+应对措施

### 5. 杜绝通用模板
- 每个方案必须有独特的核心亮点
- 不同活动类型产出截然不同的方案内容
- 金额单位为人民币元"""


async def _call_deepseek(
    system_prompt: str,
    user_content: str,
    max_tokens: int = 4096,
    api_key: str | None = None,
    base_url: str | None = None,
    messages: list[dict] | None = None,
) -> str:
    """DeepSeek API 通用调用封装

    支持前端传入自定义 api_key 和 base_url（优先级高于环境变量）
    支持传入 messages 构建多轮对话
    """
    effective_key = api_key or DEEPSEEK_API_KEY
    effective_base_url = (base_url or DEEPSEEK_BASE_URL).rstrip("/")

    headers = {
        "Authorization": f"Bearer {effective_key}",
        "Content-Type": "application/json",
    }

    if messages:
        # 多轮对话：将 system prompt 作为第一条消息，后面拼接历史消息
        api_messages = [{"role": "system", "content": system_prompt}]
        # 过滤掉 system 角色的历史消息，只保留 user/assistant
        for msg in messages:
            if msg.get("role") in ("user", "assistant"):
                api_messages.append(msg)
        # 用增强后的 user_content（含 city/edited_plan/venue 信息）替换最后一条 user 消息
        # 避免丢失 generate_event_plan 中构建的丰富上下文
        if api_messages and api_messages[-1].get("role") == "user":
            api_messages[-1] = {"role": "user", "content": user_content}
        else:
            api_messages.append({"role": "user", "content": user_content})
    else:
        api_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": api_messages,
        "temperature": 0.7,
        "max_tokens": max_tokens,
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{effective_base_url}/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()
    return data["choices"][0]["message"]["content"]


async def generate_event_plan(
    idea: str,
    mode: str = "direct",
    api_key: str | None = None,
    base_url: str | None = None,
    city: str | None = None,
    messages: list[dict] | None = None,
    edited_plan: str | None = None,
) -> str:
    """
    调用 DeepSeek API 生成活动方案。

    Args:
        idea: 用户的想法描述
        mode: "direct" 直接生成 / "guided" 引导式（暂同 direct）
        city: 用户所在城市
        messages: 对话历史，用于多轮对话上下文
        edited_plan: 用户手动编辑后的方案，作为调整样本

    Returns:
        生成的 Markdown 方案文本
    """
    # 1. 构建用户输入
    parts = [f"请为以下活动想法生成一份详细、具体的活动方案：\n\n"]
    parts.append(f"用户想法：{idea}")

    # 2. 城市信息
    if city:
        parts.append(f"\n活动所在城市：{city}")

    # 3. 如果用户编辑过方案，作为样本传给 AI
    if edited_plan:
        parts.append(
            f"\n\n## 📝 用户手动修改后的方案（请基于此版本继续调整，保持一致性和连贯性）\n\n"
            f"{edited_plan}\n\n"
            f"请基于以上修改后的方案版本进行细化和调整，保持活动名称、核心创意的一致，"
            f"只在需要修改的方面进行调整。不要重新生成一套全新的方案。"
        )

    # 4. 搜索益屿周边真实场地（增强联网能力）
    if city:
        try:
            venue_info = await _search_venues(city)
            if venue_info:
                parts.append(
                    f"\n\n## 🌐 联网搜索到的 {city} 及周边真实场地信息（请优先参考）\n\n"
                    f"{venue_info}\n\n"
                    "以上是联网搜索到的真实场地信息，请作为场地推荐的核心参考。"
                )
        except Exception:
            pass  # 搜索失败不影响主流程

    parts.append(
        "\n\n请严格遵循系统提示中的要求，深度差异化、场地具体化、杜绝通用模板。"
    )
    user_content = "".join(parts)

    return await _call_deepseek(
        SYSTEM_PROMPT, user_content,
        api_key=api_key, base_url=base_url,
        messages=messages,
    )


async def _search_venues(city: str) -> str:
    """搜索指定城市的活动场地和场馆信息，返回格式化文本

    使用 DuckDuckGo HTML 搜索接口（POST），比 Lite 接口更稳定。
    备选：DuckDuckGo Instant Answer API（GET）。
    """
    search_queries = [
        f"{city} 活动场地 场馆 出租 包场",
        f"{city} 咖啡馆 活动空间 文创园区",
        f"{city} 宠物友好 公园 户外 活动场地",
    ]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }

    all_results = []
    for query in search_queries:
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                # 方案 A：DuckDuckGo HTML 搜索（POST，更稳定）
                resp = await client.post(
                    "https://html.duckduckgo.com/html/",
                    data={"q": query},
                    headers=headers,
                )
                html = resp.text

                # HTML 接口结果结构：<a class="result__a">标题</a> + <a class="result__snippet">摘要</a>
                titles = re.findall(
                    r'<a[^>]*class="result__a"[^>]*>(.*?)</a>',
                    html, re.DOTALL
                )
                snippets = re.findall(
                    r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
                    html, re.DOTALL
                )

                # 方案 A 失败时，回退到 Instant Answer API（方案 B）
                if not titles:
                    resp_b = await client.get(
                        "https://api.duckduckgo.com/",
                        params={"q": query, "format": "json", "no_html": "1"},
                        headers=headers,
                    )
                    data_b = resp_b.json()
                    titles, snippets = [], []
                    # Instant Answer API 返回 RelatedTopics
                    for topic in (data_b.get("RelatedTopics") or [])[:5]:
                        if "Text" in topic:
                            titles.append(topic.get("Text", "")[:80])
                            snippets.append("")
                        elif "Topics" in topic:
                            for sub in topic["Topics"][:3]:
                                titles.append(sub.get("Text", "")[:80])
                                snippets.append("")
                                if len(titles) >= 5:
                                    break

                if titles:
                    results = []
                    for i, title in enumerate(titles[:5]):
                        clean = re.sub(r'<[^>]+>', '', title).strip()
                        if not clean:
                            continue
                        snippet = ""
                        if i < len(snippets):
                            snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
                        results.append(f"- {clean}")
                        if snippet and len(snippet) < 200:
                            results.append(f"  {snippet}")
                    if results:
                        all_results.append(f"【{query}】\n" + "\n".join(results))
        except Exception:
            continue

    if not all_results:
        return ""

    return "\n\n".join(all_results)


REVIEW_SYSTEM_PROMPT = """你是一位经验丰富的活动运营专家。请根据提供的活动信息和复盘要点，生成一份结构化的复盘摘要。

摘要必须使用 Markdown 格式，包含：

## 总体评价
用 2-3 句话概括活动整体表现。

## 关键数据亮点
从数据角度提炼活动的突出表现。

## 值得复用的经验
提炼出可以标准化、复用到未来活动的最佳实践（3-5 条）。

## 需要改进的方面
指出需要改进的关键点，给出具体可操作的建议。

## 综合建议
基于以上分析，给出下一次同类活动的整体建议。

请确保语言简洁专业，建议具有可操作性。"""


async def generate_review_summary(context: str) -> str:
    """
    基于活动复盘数据生成 AI 摘要。

    Args:
        context: 活动信息 + 复盘要点的拼接文本

    Returns:
        结构化的 Markdown 复盘摘要
    """
    user_content = f"请根据以下活动的复盘信息，生成一份专业的复盘摘要：\n\n{context}"
    return await _call_deepseek(REVIEW_SYSTEM_PROMPT, user_content, max_tokens=2048)


SOP_SYSTEM_PROMPT = """你是一位资深的活动运营专家，擅长将成功的活动经验标准化为可复用的 SOP（标准操作流程）。

请根据提供的活动信息，生成一份完整的 SOP 模板。

模板必须使用 Markdown 格式，包含以下章节：

## 活动概述
活动类型、适用场景、预期规模、关键成功因素。

## 筹备阶段（活动前 2-4 周）
以编号列表形式列出每个步骤，包含：步骤名称、负责人角色、所需资源、注意事项、时间节点。

## 宣传推广（活动前 1-2 周）
推广渠道选择、宣传物料清单、文案要点、推广时间表。

## 现场执行（活动当天）
按时间线列出执行流程，包含时间节点、环节、负责人、检查要点。

## 物料清单
以表格形式列出所需物料：名称、数量、预算、采购渠道、负责人。

## 预算模板
以表格形式列出标准预算项：项目、类别、预算金额、实际金额、备注。

## 后期收尾（活动后 1 周内）
财务结算、参与者反馈收集、复盘总结、资料归档。

## 风险提示
常见风险及应对措施。

请确保内容具体、可直接复用，金额单位为人民币元。"""


async def generate_sop_from_event(event_data: dict) -> str:
    """
    基于活动信息自动生成 SOP 模板。

    Args:
        event_data: 活动信息字典（title, category, type, description 等）

    Returns:
        Markdown 格式的 SOP 模板
    """
    info_lines = [
        f"活动名称：{event_data.get('title', '未命名')}",
        f"活动类别：{event_data.get('category', '通用')}",
        f"活动类型：{event_data.get('type', 'offline')}",
        f"人数上限：{event_data.get('max_participants', '未知')}",
        f"票价：{event_data.get('price', 0)}元",
        f"地点：{event_data.get('location', '待定')}",
    ]
    if event_data.get("tags"):
        info_lines.append(f"标签：{', '.join(event_data['tags'])}")
    if event_data.get("description"):
        info_lines.append(f"\n活动描述：{event_data['description']}")

    user_content = "请为以下活动生成一份标准 SOP 模板：\n\n" + "\n".join(info_lines)
    return await _call_deepseek(SOP_SYSTEM_PROMPT, user_content, max_tokens=4096)

# ---------------------------------------------------------------------------
# AI 多平台文案生成
# ---------------------------------------------------------------------------
# 各平台基础 prompt
# ---------------------------------------------------------------------------
COPYWRITING_BASE_PROMPTS = {
    "wechat": "你是微信公众号编辑。语气亲切专业。",
    "xiaohongshu": "你是小红书博主。语气活泼有感染力，带emoji。",
    "weibo": "你是微博运营。140字以内，带话题标签。",
    "friends": "你是朋友圈文案高手。100字以内，自然不做作，引发好奇。",
}

# 各 stage 额外指令
STAGE_INSTRUCTIONS = {
    "before": (
        "文案目标：活动预热、吸引报名。\n"
        "核心内容：强调活动亮点、稀缺性、早鸟优惠、参与价值。\n"
        "结尾：明确的时间地点、报名方式、CTA（如点击链接报名）。"
    ),
    "during": (
        "文案目标：实时传播活动现场氛围。\n"
        "核心内容：现场精彩瞬间、参与者反馈、实时花絮、氛围感。\n"
        "结尾：引导未到场的观众关注后续活动或线上参与。"
    ),
    "after": (
        "文案目标：活动回顾总结。\n"
        "核心内容：活动成果总结、关键数据（参与人数、好评率）、精彩瞬间回顾、感谢参与者。\n"
        "结尾：预告下次活动，引导关注平台。"
    ),
}


async def generate_copywriting(event_data: dict, platform: str) -> str:
    """
    根据活动信息和目标平台生成推广文案，区分预热/进行中/回顾三个 stage。

    Args:
        event_data: 活动信息字典（title, category, description, location, price 等）
        platform: 目标平台 (wechat / xiaohongshu / weibo / friends)

    Returns:
        生成的文案文本
    """
    base_prompt = COPYWRITING_BASE_PROMPTS.get(platform)
    if not base_prompt:
        raise ValueError(f"不支持的平台: {platform}，可选: {list(COPYWRITING_BASE_PROMPTS.keys())}")

    stage = event_data.get("stage", "before")
    stage_instruction = STAGE_INSTRUCTIONS.get(stage, STAGE_INSTRUCTIONS["before"])
    stage_label = {"before": "活动预热推广", "during": "活动中实时传播", "after": "活动回顾总结"}.get(stage, "活动推广")

    system_prompt = (
        f"{base_prompt}\n\n"
        f"【文案阶段：{stage_label}】\n"
        f"{stage_instruction}"
    )

    info_lines = [
        f"活动名称：{event_data.get('title', '未命名')}",
        f"活动类别：{event_data.get('category', '通用')}",
        f"活动类型：{event_data.get('type', 'offline')}",
        f"地点：{event_data.get('location', '待定')}",
        f"票价：{event_data.get('price', 0)}元",
        f"人数上限：{event_data.get('max_participants', '未知')}",
    ]
    if event_data.get("tags"):
        info_lines.append(f"标签：{', '.join(event_data['tags'])}")
    if event_data.get("description"):
        info_lines.append(f"\n活动描述：{event_data['description']}")

    user_content = "请为以下活动生成推广文案：\n\n" + "\n".join(info_lines)
    return await _call_deepseek(system_prompt, user_content, max_tokens=2048)
