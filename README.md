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

- **前端**: React 18 + TypeScript + Ant Design / TailwindCSS
- **后端**: Python FastAPI
- **数据库**: PostgreSQL + Redis
- **地图**: 高德地图 SDK / Leaflet
- **AI**: DeepSeek API (v4-flash / max)
- **部署**: Docker + Nginx, 阿里云/腾讯云

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/RootUser2129786127/yiyu-platform.git
cd yiyu-platform

# 后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

## 项目结构

```
yiyu-platform/
├── backend/          # FastAPI 后端
├── frontend/         # React 前端
├── docs/             # 项目文档
│   ├── PRD.md        # 产品需求文档
│   ├── ARCHITECTURE.md  # 系统架构
│   ├── TECH_ROADMAP.md  # 技术路线图
│   └── AI_ASSISTED_PLANNING.md  # AI方案生成功能设计
├── docker/           # Docker 配置
├── scripts/          # 部署/运维脚本
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
