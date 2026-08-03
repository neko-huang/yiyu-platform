# 益屿平台 — 测试手册

> 版本：v1.0 | 更新日期：2026-08-03

---

## 一、测试环境准备

### 1.1 环境要求

| 组件 | 版本要求 |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

### 1.2 启动步骤

```bash
# 1. 克隆仓库
git clone https://github.com/neko-huang/yiyu-platform.git
cd yiyu-platform

# 2. 启动后端
cd backend
pip install -r requirements.txt
# 创建 .env 文件（参考 .env.example）
cp ../.env.example .env
# 编辑 .env 填入 DeepSeek API Key
python seed.py          # 初始化种子数据
python main.py          # 启动后端 (http://localhost:8000)

# 3. 启动前端（另开一个终端）
cd frontend
npm install
npm run dev             # 启动前端 (http://localhost:5173)
```

或使用一键启动脚本（Windows）：
```bash
run.bat all
```

### 1.3 测试账号

| 角色 | 用户名 | 密码 | 说明 |
|---|---|---|---|
| 管理员 | admin | admin123 | 系统管理员 |
| 管理员 | yiyu | yiyu123 | 益屿官方账号 |
| 普通用户 | lina | user123 | 兴趣：音乐、摄影 |
| 普通用户 | wangfang | user123 | 兴趣：读书、写作 |
| 普通用户 | zhangwei | user123 | 兴趣：运动、健身、户外 |
| 普通用户 | chenyu | user123 | 兴趣：科技、讲座 |
| 普通用户 | liuyang | user123 | 兴趣：音乐、户外 |
| 普通用户 | zhaojing | user123 | 兴趣：读书、美食 |
| 普通用户 | sunhao | user123 | 兴趣：运动、摄影 |
| 普通用户 | zhoumin | user123 | 兴趣：艺术、讲座、音乐 |

---

## 二、功能测试用例

### 2.1 注册流程

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| R1 | 访问 http://localhost:5173/register | 显示注册表单（用户名/邮箱/密码/确认密码） | | |
| R2 | 输入新用户名、邮箱、密码（≥6位）、确认密码，点击"注册" | 注册成功，自动登录并跳转到首页 | | |
| R3 | 使用已存在的用户名注册 | 提示"用户名或邮箱已存在" | | |
| R4 | 使用已存在的邮箱注册 | 提示"用户名或邮箱已存在" | | |
| R5 | 输入无效邮箱格式（如 abc） | 前端提示"请输入有效的邮箱地址" | | |
| R6 | 两次密码不一致 | 前端提示"两次输入的密码不一致" | | |
| R7 | 密码少于 6 位 | 前端提示"密码长度至少为6位" | | |
| R8 | 不填任何字段直接提交 | 前端提示"请填写所有必填字段" | | |

### 2.2 登录流程

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| L1 | 访问 http://localhost:5173/login | 显示登录表单 | | |
| L2 | 输入 admin / admin123，点击"登录" | 登录成功，跳转到首页，导航栏显示用户名 | | |
| L3 | 输入 user1 / user123（错误用户名） | 提示"用户名或密码错误" | | |
| L4 | 输入 admin / wrongpwd（错误密码） | 提示"用户名或密码错误" | | |
| L5 | 不填任何字段直接提交 | 前端提示"请输入用户名和密码" | | |
| L6 | 登录成功后刷新页面 | 保持登录状态（token 在 localStorage） | | |
| L7 | 点击导航栏"退出"按钮 | 清除 token，跳转到登录页 | | |

### 2.3 活动管理

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| E1 | 以管理员登录，访问"创建活动"页面 | 显示活动创建表单 | | |
| E2 | 填写完整活动信息（标题、描述、类型、分类、时间、地点、人数上限、价格），提交 | 创建成功，跳转到活动详情页 | | |
| E3 | 查看首页活动列表 | 显示所有已发布活动，含卡片信息（标题、时间、地点、价格、标签） | | |
| E4 | 点击某个活动卡片 | 跳转到活动详情页，显示完整信息 | | |
| E5 | 以普通用户（lina）登录，访问创建活动页面 | 普通用户也能创建活动（或提示权限不足，取决于设计） | | |
| E6 | 编辑已有活动（修改标题） | 修改成功，列表页显示新标题 | | |
| E7 | 不填必填字段直接提交 | 表单校验提示 | | |
| E8 | 活动列表为空时 | 显示空状态提示（"暂无活动"） | | |

### 2.4 报名流程

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| B1 | 以普通用户登录，打开活动详情页 | 显示"报名"按钮 | | |
| B2 | 点击"报名" | 弹出报名表单或确认弹窗，提交后显示"报名成功" | | |
| B3 | 对同一活动重复报名 | 提示"已报名，请勿重复报名" | | |
| B4 | 以管理员登录，进入活动管理页 | 显示报名列表，含状态（待审核/已通过/已拒绝/已签到） | | |
| B5 | 审核通过一个报名 | 状态变为"已通过" | | |
| B6 | 拒绝一个报名 | 状态变为"已拒绝" | | |
| B7 | 对已通过的报名执行签到 | 状态变为"已签到"，签到时间已记录 | | |
| B8 | 活动人数已满后报名 | 提示"报名人数已满" | | |

### 2.5 财务管理

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| F1 | 以管理员登录，进入某活动管理页的财务 tab | 显示该活动的财务记录列表 | | |
| F2 | 添加一条收入记录（门票收入，金额 500） | 记录创建成功，列表更新 | | |
| F3 | 添加一条支出记录（场地租赁，金额 300） | 记录创建成功，列表更新 | | |
| F4 | 查看财务汇总 | 显示总收入、总支出、净利润 | | |
| F5 | 按活动筛选财务记录 | 只显示该活动的记录 | | |

### 2.6 AI 方案生成

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| A1 | 登录后访问"AI 方案生成"页面 | 显示对话式输入界面 | | |
| A2 | 输入"我想办一场户外音乐节，预算 2 万"，提交 | AI 返回结构化方案（含概述、流程、预算、任务清单） | | |
| A3 | 等待 AI 响应时 | 显示加载状态 | | |
| A4 | AI 响应完成 | 方案内容可复制/查看 | | |
| A5 | 后端未配置 DEEPSEEK_API_KEY 时调用 | 返回友好错误提示（非 500 崩溃） | | |

### 2.7 地图功能

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| M1 | 登录后访问"活动地图"页面 | 显示地图，地图上有活动标记点 | | |
| M2 | 点击某个标记点 | 弹出活动信息气泡（标题、时间、地点） | | |
| M3 | 地图上查看不同位置的活动 | 标记点位置与活动设置的经纬度一致 | | |
| M4 | 线上活动（无经纬度） | 不在地图上显示标记 | | |

### 2.8 用户中心

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| U1 | 登录后访问"个人中心" | 显示用户信息（用户名、邮箱、角色、标签） | | |
| U2 | 修改显示名称 | 保存成功，页面更新 | | |
| U3 | 查看"我创建的活动" | 列出该用户创建的所有活动 | | |
| U4 | 查看"我的报名" | 列出该用户的所有报名记录及状态 | | |

### 2.9 管理后台

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| D1 | 以管理员登录，访问 /dashboard | 显示仪表盘（活动总数、活跃活动、报名总数、总收入） | | |
| D2 | 以普通用户登录，访问 /dashboard | 自动跳转到首页（无权限） | | |
| D3 | 仪表盘数据统计 | 数字与种子数据一致（10 个活动、若干报名和财务） | | |

### 2.10 权限控制

| # | 步骤 | 预期结果 | 实际结果 | ✅/❌ |
|---|---|---|---|---|
| P1 | 未登录状态访问 http://localhost:5173/ | 自动跳转到登录页 | | |
| P2 | 未登录状态访问 http://localhost:5173/profile | 自动跳转到登录页 | | |
| P3 | 登录后登录页 /login | 自动跳转到首页（已登录不再显示登录页） | | |
| P4 | 清除 localStorage 中的 token 后刷新 | 跳转到登录页 | | |

---

## 三、边界情况测试

| # | 场景 | 操作步骤 | 预期结果 | ✅/❌ |
|---|---|---|---|---|
| X1 | 后端未启动 | 启动前端但不启动后端，尝试登录 | 显示"网络连接失败"或类似错误提示 | |
| X2 | 并发注册同用户名 | 两个窗口同时用同一用户名注册 | 一个成功，另一个提示"用户名已存在" | |
| X3 | 超长输入 | 标题输入 1000 个字符 | 前端截断或后端返回校验错误 | |
| X4 | 特殊字符输入 | 用户名输入 `<script>alert(1)</script>` | 不执行脚本，正常处理或拒绝 | |
| X5 | 活动满员后报名 | 活动人数已达上限，尝试报名 | 提示"报名人数已满" | |
| X6 | 已结束活动的操作 | 尝试对已结束活动报名 | 提示"活动已结束，无法报名" | |
| X7 | Token 过期 | 手动修改 localStorage 中 token 为无效值 | 自动清除 token 并跳转登录页 | |
| X8 | 快速重复点击 | 连续快速点击"报名"按钮 | 防重复提交（loading 状态禁用按钮） | |
| X9 | 空数据展示 | 新建用户无任何活动/报名 | 页面显示空状态提示而非空白 | |

---

## 四、API 接口测试（curl 命令）

> 以下命令假设后端运行在 `http://localhost:8000`

### 4.1 认证接口

```bash
# 注册
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"test123456"}'

# 登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 获取当前用户信息（需要 token）
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# 更新用户信息
curl -X PUT http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"新昵称"}'
```

### 4.2 活动接口

```bash
# 获取活动列表
curl http://localhost:8000/api/v1/events

# 获取单个活动详情
curl http://localhost:8000/api/v1/events/1

# 创建活动（需要管理员 token）
curl -X POST http://localhost:8000/api/v1/events \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"测试活动","description":"测试描述","type":"offline",
    "category":"户外","start_time":"2026-09-01T10:00:00",
    "end_time":"2026-09-01T12:00:00","location_name":"测试地点",
    "latitude":31.23,"longitude":121.47,"max_participants":50,"price":0
  }'

# 更新活动
curl -X PUT http://localhost:8000/api/v1/events/1 \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"更新后的标题"}'

# 删除活动
curl -X DELETE http://localhost:8000/api/v1/events/1 \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 4.3 报名接口

```bash
# 报名活动
curl -X POST http://localhost:8000/api/v1/events/1/register \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"form_data":{"phone":"13800138000"}}'

# 获取活动报名列表
curl http://localhost:8000/api/v1/events/1/registrations \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# 审核报名（通过）
curl -X PUT http://localhost:8000/api/v1/registrations/1/status \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'

# 签到
curl -X POST http://localhost:8000/api/v1/registrations/1/check-in \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 4.4 财务接口

```bash
# 添加财务记录
curl -X POST http://localhost:8000/api/v1/events/1/finance \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"income","category":"ticket","amount":500,"description":"门票收入"}'

# 获取活动财务记录
curl http://localhost:8000/api/v1/events/1/finance \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# 获取财务汇总
curl http://localhost:8000/api/v1/events/1/finance/summary \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 4.5 AI 接口

```bash
# AI 方案生成
curl -X POST http://localhost:8000/api/v1/ai/generate \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"我想办一场户外音乐节","event_type":"offline","category":"音乐"}'
```

---

## 五、测试检查清单（汇总）

### 核心流程
- [ ] 注册 → 自动登录 → 进入首页
- [ ] 登录 → 进入首页 → 导航栏显示用户信息
- [ ] 创建活动 → 查看列表 → 查看详情 → 编辑
- [ ] 浏览活动 → 报名 → 查看报名状态
- [ ] 管理员审核报名 → 通过/拒绝 → 签到
- [ ] 添加财务记录 → 查看汇总
- [ ] AI 方案生成 → 查看方案

### 地图
- [ ] 地图页正常加载
- [ ] 活动标记点显示正确
- [ ] 点击标记显示活动信息

### 用户中心
- [ ] 查看/编辑个人资料
- [ ] 查看我创建的活动
- [ ] 查看我的报名记录

### 管理后台
- [ ] 管理员可访问 Dashboard
- [ ] 普通用户无法访问 Dashboard
- [ ] 统计数据正确

### 权限与安全
- [ ] 未登录跳转登录页
- [ ] Token 过期自动清除并跳转
- [ ] 错误密码提示正确
- [ ] 重复注册提示已存在

### 边界情况
- [ ] 后端未启动时前端友好提示
- [ ] 空数据页面显示空状态
- [ ] 满员活动不可报名
- [ ] 防重复提交生效
- [ ] 特殊字符不会导致 XSS

---

## 六、已知限制

| 编号 | 限制描述 | 影响 |
|---|---|---|
| K1 | 数据库为 SQLite，不支持并发写入 | 多人同时操作可能出现锁等待 |
| K2 | 无文件上传功能 | 活动封面、用户头像无法上传 |
| K3 | 无分页 | 数据量大时列表加载慢 |
| K4 | AI 功能依赖外部 API | API Key 未配置时功能不可用 |
| K5 | 无 HTTPS | 仅限本地开发使用，不适合生产环境 |
| K6 | 无全文搜索 | 搜索仅支持标题模糊匹配 |
| K7 | 无实时通知 | 报名状态变更需手动刷新 |
