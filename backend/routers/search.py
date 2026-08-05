"""搜索联想代理路由"""

import httpx
from fastapi import APIRouter, HTTPException, Query

from config import AMAP_KEY, logger

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/suggestions")
async def get_location_suggestions(
    keywords: str = Query(..., description="搜索关键词"),
    city: str = Query("", description="城市名，空则全国"),
):
    """高德地图搜索联想代理接口，解决浏览器 CORS 限制"""
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

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="高德搜索服务异常")

        data = resp.json()

        if data.get("status") != "1":
            logger.warning("高德搜索联想返回异常: %s", data.get("info"))
            return {"tips": [], "info": data.get("info", "未知错误")}

        # 过滤掉没有 location 的 tips
        tips = [t for t in data.get("tips", []) if t.get("location")]
        return {"tips": tips[:10]}


@router.get("/poi-detail")
async def get_poi_detail(
    id: str = Query(..., description="POI ID"),
):
    """高德地图 POI 详情代理接口"""
    if not AMAP_KEY:
        raise HTTPException(status_code=500, detail="AMAP_KEY not configured")

    url = "https://restapi.amap.com/v3/place/detail"
    params = {
        "key": AMAP_KEY,
        "id": id,
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="高德POI详情服务异常")

        data = resp.json()

        if data.get("status") != "1" or not data.get("pois"):
            return {"poi": None}

        return {"poi": data["pois"][0]}
