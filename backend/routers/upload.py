"""文件上传路由"""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from config import BASE_DIR, logger
from models import User
from routers.dependencies import get_current_user

router = APIRouter(prefix="/upload", tags=["文件上传"])

# ---------------------------------------------------------------------------
# 上传目录配置
# ---------------------------------------------------------------------------
UPLOAD_DIR = BASE_DIR / "uploads"
AVATAR_DIR = UPLOAD_DIR / "avatars"
IMAGE_DIR = UPLOAD_DIR / "images"

# 确保目录存在
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# 限制配置
# ---------------------------------------------------------------------------
AVATAR_MAX_SIZE = 2 * 1024 * 1024   # 2MB
IMAGE_MAX_SIZE = 5 * 1024 * 1024    # 5MB

AVATAR_ALLOWED_TYPES = {"image/jpeg", "image/png"}
IMAGE_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

CONTENT_TYPE_EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


async def _save_upload(
    file: UploadFile,
    max_size: int,
    allowed_types: set[str],
    save_dir: Path,
) -> str:
    """通用文件保存逻辑，返回可访问的 URL 路径"""
    # 检查文件类型
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型: {file.content_type}，允许的类型: {', '.join(sorted(allowed_types))}",
        )

    # 读取文件内容并检查大小
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件大小超过限制 (最大 {max_size // 1024 // 1024}MB)",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件内容为空",
        )

    # 生成唯一文件名并保存
    ext = CONTENT_TYPE_EXT_MAP.get(file.content_type, ".jpg")
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = save_dir / filename
    filepath.write_bytes(content)

    logger.info("文件上传成功: %s (%d bytes)", filepath, len(content))
    return f"/uploads/{save_dir.name}/{filename}"


@router.post("/avatar", status_code=status.HTTP_201_CREATED)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """上传头像（限制 2MB，支持 jpg/png）"""
    url = await _save_upload(file, AVATAR_MAX_SIZE, AVATAR_ALLOWED_TYPES, AVATAR_DIR)
    return {"url": url}


@router.post("/image", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """上传图片（限制 5MB，支持 jpg/png/webp）"""
    url = await _save_upload(file, IMAGE_MAX_SIZE, IMAGE_ALLOWED_TYPES, IMAGE_DIR)
    return {"url": url}
