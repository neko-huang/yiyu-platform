"""FastAPI 入口 — 益屿活动管理平台"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from config import CORS_ORIGINS, logger
from database import init_db
from routers.ai import router as ai_router
from routers.auth import router as auth_router
from routers.events import router as events_router
from routers.finance import router as finance_router
from routers.registrations import router as registrations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建表
    logger.info("初始化数据库...")
    await init_db()
    logger.info("应用启动完成")
    yield
    logger.info("应用关闭")


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


# ---------------------------------------------------------------------------
# 全局异常处理 — 防止错误堆栈暴露给前端
# ---------------------------------------------------------------------------
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.warning("数据库完整性错误: %s | 路径: %s", exc, request.url.path)
    return JSONResponse(
        status_code=409,
        content={"detail": "数据冲突，请检查输入是否重复"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("未处理的异常: %s | 路径: %s", exc, request.url.path, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误，请稍后重试"},
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
