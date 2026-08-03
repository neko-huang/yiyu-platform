"""DeepSeek AI 服务封装"""

import httpx

from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL

SYSTEM_PROMPT = """你是一位资深的社区活动策划专家。请根据用户的想法，生成一份结构化的活动方案。

方案必须使用 Markdown 格式，并包含以下章节（用 ## 二级标题分隔）：

## 活动概述
简要描述活动名称、主题、目标受众、预期规模和核心价值。

## 流程时间表
以表格形式列出活动各环节的时间安排，包括：时间、环节、负责人、备注。

## 预算估算
以表格形式列出预算明细，包括：项目、类别（场地/物料/人力/餐饮/其他）、预算金额、备注。最后给出总预算。

## 任务清单
以 Markdown 待办列表形式列出活动筹备的所有任务，按筹备阶段分组（前期准备 / 活动当天 / 后期总结）。

## 风险预案
列出可能的风险及应对措施，以表格形式呈现：风险描述、影响程度、应对方案、负责人。

请确保内容具体、可执行，金额单位为人民币元。"""


async def _call_deepseek(system_prompt: str, user_content: str, max_tokens: int = 4096) -> str:
    """DeepSeek API 通用调用封装"""
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.7,
        "max_tokens": max_tokens,
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()
    return data["choices"][0]["message"]["content"]


async def generate_event_plan(idea: str, mode: str = "direct") -> str:
    """
    调用 DeepSeek API 生成活动方案。

    Args:
        idea: 用户的想法描述
        mode: "direct" 直接生成 / "guided" 引导式（暂同 direct）

    Returns:
        生成的 Markdown 方案文本
    """
    user_content = f"请为以下活动想法生成一份详细的活动方案：\n\n{idea}"
    return await _call_deepseek(SYSTEM_PROMPT, user_content)


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
COPYWRITING_PROMPTS = {
    "wechat": "你是微信公众号编辑。请根据活动信息撰写一篇微信公众号推广文案，包含标题、正文（300字左右）、CTA按钮文案。语气亲切专业。",
    "xiaohongshu": "你是小红书博主。请根据活动信息撰写一篇小红书风格的种草笔记，包含标题（带emoji）、正文（200字左右）、标签。语气活泼有感染力。",
    "weibo": "你是微博运营。请根据活动信息撰写一条微博推广文案（140字以内），带话题标签和emoji。",
    "friends": "你是朋友圈文案高手。请根据活动信息撰写一条朋友圈推广文案（100字以内），自然不做作，引发好奇。",
}


async def generate_copywriting(event_data: dict, platform: str) -> str:
    """
    根据活动信息和目标平台生成推广文案。

    Args:
        event_data: 活动信息字典（title, category, description, location, price 等）
        platform: 目标平台 (wechat / xiaohongshu / weibo / friends)

    Returns:
        生成的文案文本
    """
    system_prompt = COPYWRITING_PROMPTS.get(platform)
    if not system_prompt:
        raise ValueError(f"不支持的平台: {platform}，可选: {list(COPYWRITING_PROMPTS.keys())}")

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
    if event_data.get("stage"):
        stage_map = {"before": "活动预热推广", "during": "活动中实时传播", "after": "活动回顾总结"}
        info_lines.append(f"\n文案阶段：{stage_map.get(event_data['stage'], '活动推广')}")

    user_content = "请为以下活动生成推广文案：\n\n" + "\n".join(info_lines)
    return await _call_deepseek(system_prompt, user_content, max_tokens=2048)
