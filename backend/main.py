"""FastAPI 入口 — 益屿活动管理平台"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from database import init_db
from routers.ai import router as ai_router
from routers.auth import router as auth_router
from routers.events import router as events_router
from routers.finance import router as finance_router
from routers.registrations import router as registrations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建表
    await init_db()
    yield


app = FastAPI(
    title="益屿活动管理平台 API",
    description="社区活动管理平台后端 — 活动管理、报名、财务、AI 方案生成",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(events_router, prefix=API_PREFIX)
app.include_router(registrations_router, prefix=API_PREFIX)
app.include_router(finance_router, prefix=API_PREFIX)
app.include_router(ai_router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {
        "name": "益屿活动管理平台 API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
