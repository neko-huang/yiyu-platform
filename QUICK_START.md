#益屿# 活动管理平台 - 快速开始

## 前置要求
- Node.js 18+
- Python 3.10+
- PostgreSQL 15
- Redis 7

## 本地开发

### 方式一：Docker Compose（推荐）
```bash
docker-compose up -d
```

### 方式二：手动启动

**后端**:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**前端**:
```bash
cd frontend
npm install
npm run dev
```

### 访问
- 前端: http://localhost:3000
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs
