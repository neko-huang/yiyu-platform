"""应用配置"""

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# 加载 .env 文件（开发环境）
load_dotenv()

# ---------------------------------------------------------------------------
# 路径
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# 数据库
# ---------------------------------------------------------------------------
_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DATA_DIR / 'yiyu.db'}")
# 自动转换 PostgreSQL URL 格式（如 Railway 提供的 postgresql:// → postgresql+asyncpg://）
if _DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in _DATABASE_URL:
    DATABASE_URL = _DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _DATABASE_URL.startswith("postgres://") and "+asyncpg" not in _DATABASE_URL:
    DATABASE_URL = _DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = _DATABASE_URL

# ---------------------------------------------------------------------------
# JWT — 生产环境必须通过环境变量设置 SECRET_KEY
# ---------------------------------------------------------------------------
_SECRET_KEY = os.getenv("SECRET_KEY", "")
if not _SECRET_KEY:
    print("⚠️  警告: SECRET_KEY 未设置，使用开发模式临时密钥。生产环境务必配置 SECRET_KEY 环境变量！", file=sys.stderr)
    SECRET_KEY = "dev-only-insecure-secret-key-do-not-use-in-production"
else:
    SECRET_KEY = _SECRET_KEY

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))

# ---------------------------------------------------------------------------
# CORS — 支持从环境变量配置，逗号分隔
# ---------------------------------------------------------------------------
_default_origins = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
_cors_env = os.getenv("CORS_ORIGINS", _default_origins)
CORS_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]

# ---------------------------------------------------------------------------
# DeepSeek API
# ---------------------------------------------------------------------------
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# ---------------------------------------------------------------------------
# 日志配置
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("yiyu")

# ---------------------------------------------------------------------------
# 高德地图 API
# ---------------------------------------------------------------------------
AMAP_KEY = os.getenv("AMAP_KEY", "")
