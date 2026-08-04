# 益屿 - 活动管理平台

> 为活动组织者提供全生命周期管理：从策划到执行，从分析到复用。

## 项目简介

益屿是一个面向活动组织者（B端）和参与者（C端）的活动管理平台，覆盖活动全生命周期：

- **策划阶段**：AI辅助生成可行方案，SOP模板复用
- **执行阶段**：活动发布、报名管理、地图展示、实时互动
- **复盘阶段**：财务分析、效益评估、回忆沉淀
- **增长阶段**：用户画像、智能推荐、内容营销

## 核心功能

| 模块 | 功能 | 说明 |
|------|------|------|
| 活动管理 | 创建/报名/地图展示 | 管理端+用户端均可发起 |
| AI方案生成 | 想法→可行方案 | 对话式引导，AI辅助策划 |
| 财务与效益 | 收支记录/效益分析/收益预测 | 数据可视化+复盘报告 |
| 标准化流程 | SOP提炼/模板复用 | 优秀项目沉淀为可复用方案 |
| 内容与营销 | AI文案生成/回忆相册/分享 | 活动前中后全链路内容 |
| 用户画像 | 兴趣标签/行为分析/智能推荐 | 精准匹配活动与用户 |
| 沟通协作 | 用户↔管理方沟通通道 | 消息/工单系统 |

## 技术栈

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **后端**: Python 3.11 + FastAPI + SQLAlchemy 2.0
- **数据库**: SQLite (MVP) / PostgreSQL (生产)
- **地图**: Leaflet + OpenStreetMap (免费，无需API Key)
- **AI**: DeepSeek API (v4-flash)
- **部署**: Docker + Nginx

---

## 本地部署指南

> 📖 完整的安装指南（含各平台详细步骤、依赖清单、常见问题）请查看 [安装指南](docs/SETUP_GUIDE.md)

### 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Python | 3.10+ | 后端运行环境 |
| Node.js | 18+ | 前端运行环境 |
| npm | 9+ | 前端包管理 |
| Git | 任意 | 代码克隆 |

### 第一步：克隆仓库

```bash
git clone https://github.com/neko-huang/yiyu-platform.git
cd yiyu-platform
```

### 第二步：后端部署

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（可选，AI功能需要）
# 方式1: 创建 .env 文件
echo "DEEPSEEK_API_KEY=your-api-key-here" > .env

# 方式2: 直接导出环境变量
export DEEPSEEK_API_KEY=your-api-key-here  # macOS/Linux
set DEEPSEEK_API_KEY=your-api-key-here     # Windows CMD

# 初始化数据库（创建管理员账号）
python seed.py

# 启动后端服务
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**后端启动成功后：**
- API 服务: http://localhost:8000
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

**默认管理员账号：**
| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

**需要测试数据？** 使用 [yiyu-mock-data](https://github.com/neko-huang/yiyu-mock-data) 仓库，克隆后运行 `python seed.py` 即可导入 25 个用户、55+ 活动。

### 第三步：前端部署

**新开一个终端窗口**，保持后端运行：

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 配置环境变量（可选）
# 创建 .env.local 文件
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

# 启动开发服务器
npm run dev
```

**前端启动成功后：**
- 访问地址: http://localhost:5173

### 第四步：验证部署

1. **打开浏览器** 访问 http://localhost:5173
2. **登录测试**：使用 `admin` / `admin123` 登录
3. **功能验证**：
   - ✅ 首页显示活动列表
   - ✅ 点击活动查看详情
   - ✅ 地图页显示活动位置
   - ✅ 创建活动表单正常
   - ✅ AI策划页面可用（需配置API Key）

---

## 一键启动（Docker）

如果你已安装 Docker，可以用一条命令启动全部：

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY

# 启动服务
docker-compose up -d

# 访问
# 前端: http://localhost:3000
# 后端: http://localhost:8000
```

---

## 项目结构

```
yiyu-platform/
├── backend/              # FastAPI 后端
│   ├── main.py          # 入口文件
│   ├── config.py        # 配置
│   ├── database.py      # 数据库连接
│   ├── models/          # 数据模型
│   ├── schemas/         # Pydantic 验证
│   ├── routers/         # API 路由
│   ├── services/        # 业务逻辑
│   ├── seed.py          # 模拟数据
│   └── requirements.txt # Python 依赖
├── frontend/             # React 前端
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   ├── api/         # API 请求
│   │   └── contexts/    # React Context
│   ├── package.json     # Node 依赖
│   └── vite.config.js   # Vite 配置
├── docs/                 # 项目文档
├── docker-compose.yml    # Docker 编排
└── README.md
```

## 里程碑

- [x] Phase 0: 项目规划与文档 (2026.08.03)
- [ ] Phase 1: 本地可运行原型 (2周)
- [ ] Phase 2: 核心功能完善 (2-4周)
- [ ] Phase 3: 云端部署上线 (1周)

## 文档

- [产品需求文档](docs/PRD.md)
- [系统架构](docs/ARCHITECTURE.md)
- [技术路线图](docs/TECH_ROADMAP.md)
- [AI辅助方案生成](docs/AI_ASSISTED_PLANNING.md)

## License

MIT
