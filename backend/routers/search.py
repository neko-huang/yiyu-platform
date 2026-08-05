"""搜索联想代理路由 — 使用高德 Web 服务 API"""

import httpx
from fastapi import APIRouter, HTTPException, Query

from config import AMAP_KEY, logger

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/suggestions")
async def get_location_suggestions(
    keywords: str = Query(..., description="搜索关键词"),
    city: str = Query("", description="城市名，空则全国"),
):
    """高德地图搜索联想代理接口"""
    if not AMAP_KEY:
        raise HTTPException(status_code=500, detail="AMAP_KEY not configured")

    url = "https://restapi.amap.com/v3/assistant/inputtips"
    params = {
        "key": AMAP_KEY,
        "keywords": keywords,
        "city": city,
        "citylimit": "false",
        "datatype": "poi",
        "offset": 10,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
    except httpx.RequestError as e:
        logger.error("高德搜索请求失败: %s", e)
        raise HTTPException(status_code=502, detail="搜索服务不可达")

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="高德搜索服务异常")

    data = resp.json()

    if data.get("status") != "1":
        logger.warning("高德搜索联想返回异常: %s", data.get("info"))
        return {"tips": [], "info": data.get("info", "未知错误")}

    tips = [t for t in data.get("tips", []) if t.get("location")]
    return {"tips": tips[:10]}


@router.get("/reverse-geocode")
async def reverse_geocode(
    location: str = Query(..., description="坐标，格式: lng,lat"),
):
    """高德逆地理编码代理接口 — 将坐标转换为具体地址名称"""
    if not AMAP_KEY:
        raise HTTPException(status_code=500, detail="AMAP_KEY not configured")

    url = "https://restapi.amap.com/v3/geocode/regeo"
    params = {
        "key": AMAP_KEY,
        "location": location,
        "radius": 1000,
        "extensions": "all",
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
    except httpx.RequestError as e:
        logger.error("逆地理编码请求失败: %s", e)
        raise HTTPException(status_code=502, detail="地理编码服务不可达")

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="地理编码服务异常")

    data = resp.json()

    if data.get("status") != "1" or not data.get("regeocode"):
        logger.warning("逆地理编码返回异常: %s", data.get("info"))
        return {"name": None, "address": None}

    rg = data["regeocode"]
    # 优先使用附近 POI 名称
    pois = rg.get("pois", [])
    name = pois[0].get("name") if pois else None
    address = rg.get("formatted_address", "")

    return {"name": name, "address": address}
