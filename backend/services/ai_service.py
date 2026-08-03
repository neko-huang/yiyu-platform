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

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
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
