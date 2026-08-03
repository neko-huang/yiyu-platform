"""认证服务：JWT 生成/验证 + 密码哈希"""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from config import ACCESS_TOKEN_EXPIRE_HOURS, ALGORITHM, SECRET_KEY, logger


# ---------------------------------------------------------------------------
# 密码 — 直接使用 bcrypt 库，避免 passlib 与 bcrypt>=4.0 的兼容性问题
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """哈希密码，返回 bcrypt 格式字符串 ($2b$...)"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """验证明文密码与哈希是否匹配"""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError) as exc:
        logger.warning("密码验证异常: %s", exc)
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """返回 payload dict 或 None（无效/过期）"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
