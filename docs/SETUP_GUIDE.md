# 益屿平台 — 依赖与安装指南

> 适用于 Windows 10/11、macOS 12+、Ubuntu 20.04+

---

## 一、环境依赖总览

| 依赖 | 最低版本 | 推荐版本 | 用途 | 必须 |
|------|---------|---------|------|------|
| Python | 3.10 | 3.11+ | 后端运行环境 | ✅ |
| pip | 23.0+ | 最新 | Python 包管理 | ✅ |
| Node.js | 18.0 | 20 LTS | 前端运行环境 | ✅ |
| npm | 9.0+ | 10+ | 前端包管理 | ✅ |
| Git | 任意 | 最新 | 代码克隆 | ✅ |

### 可选依赖

| 依赖 | 用途 | 说明 |
|------|------|------|
| Docker + Docker Compose | 容器化部署 | 生产环境推荐，本地开发可选 |
| DeepSeek API Key | AI 功能 | 无 Key 时 AI 相关功能不可用，其余功能正常 |

---

## 二、各平台安装指南

### Windows 10/11

#### 1. 安装 Python

1. 访问 https://www.python.org/downloads/
2. 下载 Python 3.11+ 安装包（如 `python-3.11.x-amd64.exe`）
3. **安装时务必勾选 "Add Python to PATH"**
4. 安装完成后，打开 CMD 验证：
   ```cmd
   python --version
   pip --version
   ```

> ⚠️ 如果忘记勾选 "Add to PATH"，可以重新运行安装程序 → Modify → 勾选 PATH

#### 2. 安装 Node.js

1. 访问 https://nodejs.org/
2. 下载 **LTS 版本**（推荐 20.x）
3. 运行安装程序，默认选项即可
4. 验证：
   ```cmd
   node --version
   npm --version
   ```

#### 3. 安装 Git

1. 访问 https://git-scm.com/download/win
2. 下载并运行安装程序，默认选项即可
3. 验证：
   ```cmd
   git --version
   ```

---

### macOS

#### 方式 A：使用 Homebrew（推荐）

```bash
# 安装 Homebrew（如未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Python
brew install python

# 安装 Node.js
brew install node

# 安装 Git（macOS 自带，也可更新）
brew install git
```

#### 方式 B：手动安装

| 软件 | 下载地址 |
|------|---------|
| Python | https://www.python.org/downloads/macos/ |
| Node.js | https://nodejs.org/ (选 LTS) |
| Git | https://git-scm.com/download/mac |

安装后验证：
```bash
python3 --version
node --version
npm --version
git --version
```

---

### Ubuntu / Debian

```bash
# 更新包索引
sudo apt update

# 安装 Python + pip + venv
sudo apt install -y python3 python3-pip python3-venv

# 安装 Node.js（推荐通过 NodeSource 安装最新 LTS）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Git
sudo apt install -y git

# 验证
python3 --version
pip3 --version
node --version
npm --version
git --version
```

---

## 三、项目安装

### 1. 克隆仓库

```bash
git clone https://github.com/neko-huang/yiyu-platform.git
cd yiyu-platform
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 DeepSeek API Key（可选）
# DEEPSEEK_API_KEY=sk-your-actual-key
```

> 💡 不配置 API Key 也可以运行，只是 AI 方案生成、AI 文案等功能不可用。

### 3. 后端安装

**Windows:**
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**macOS / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. 前端安装

**所有平台：**
```bash
cd frontend
npm install
```

### 5. 初始化测试数据（可选）

```bash
cd backend
# 确保虚拟环境已激活
python seed.py
```

这会创建测试账号和示例活动数据。

---

## 四、启动项目

### 方式 A：一键启动（推荐）

**Windows:**
```cmd
:: 双击 run.bat 或在 CMD 中运行
run.bat

:: 也支持命令行参数
run.bat all       :: 启动全部
run.bat backend   :: 仅启动后端
run.bat frontend  :: 仅启动前端
run.bat stop      :: 停止全部
```

**macOS / Linux:**
```bash
chmod +x run.sh    # 首次需要赋予执行权限
./run.sh           # 交互式菜单

# 也支持命令行参数
./run.sh all       # 启动全部
./run.sh backend   # 仅启动后端
./run.sh frontend  # 仅启动前端
./run.sh stop      # 停止全部
```

### 方式 B：手动启动

需要两个终端窗口：

**终端 1 — 后端:**
```bash
cd backend
# 激活虚拟环境（参考上方步骤）
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
python main.py
```

**终端 2 — 前端:**
```bash
cd frontend
npm run dev
```

### 方式 C：Docker 部署（需安装 Docker）

```bash
cp .env.example .env
# 编辑 .env 填入配置
docker compose up -d
```

---

## 五、验证安装

启动成功后访问以下地址：

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端页面 | http://localhost:5173 | 主应用 |
| 后端 API | http://localhost:8000 | API 根路径 |
| API 文档 | http://localhost:8000/docs | Swagger UI 交互式文档 |
| 健康检查 | http://localhost:8000/health | 返回 `{"status":"ok"}` |

### 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 管理员 | yiyu | yiyu123 |
| 普通用户 | lina / wangfang / zhangwei 等 | user123 |

### 快速验证清单

- [ ] 访问 http://localhost:5173 能看到首页
- [ ] 使用 admin / admin123 能登录
- [ ] 活动列表正常加载
- [ ] 注册新用户成功
- [ ] 创建活动表单正常
- [ ] http://localhost:8000/docs 能查看 API 文档
- [ ] （如配置了 API Key）AI 策划功能可用

---

## 六、Python 依赖清单

| 包名 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.115.6 | Web 框架 |
| uvicorn | 0.34.0 | ASGI 服务器 |
| sqlalchemy | 2.0.36 | ORM 数据库 |
| aiosqlite | 0.20.0 | SQLite 异步驱动 |
| python-jose | 3.3.0 | JWT 令牌 |
| passlib | 1.7.4 | 密码哈希 |
| bcrypt | 4.0.1 | 加密算法 |
| pydantic | 2.10.4 | 数据验证 |
| pydantic-settings | 2.7.0 | 配置管理 |
| python-multipart | 0.0.20 | 文件上传 |
| httpx | 0.28.1 | HTTP 客户端（调 DeepSeek API） |
| email-validator | 2.2.0 | 邮箱格式验证 |

## 七、前端依赖清单

### 运行时依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| react | 18.3.x | UI 框架 |
| react-dom | 18.3.x | DOM 渲染 |
| react-router-dom | 6.26.x | 路由管理 |
| axios | 1.7.x | HTTP 请求 |
| leaflet | 1.9.x | 地图引擎 |
| react-leaflet | 4.2.x | React 地图组件 |
| react-markdown | 9.0.x | Markdown 渲染 |

### 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| typescript | 5.5.x | 类型检查 |
| vite | 5.4.x | 构建工具 |
| tailwindcss | 3.4.x | CSS 框架 |
| postcss | 8.4.x | CSS 处理 |
| autoprefixer | 10.4.x | 浏览器兼容 |

---

## 八、常见问题

### Q: Windows 运行 `run.bat` 闪退
确保 Python 和 Node.js 已正确安装并加入 PATH。可以在 CMD 中运行 `run.bat` 查看具体错误信息。

### Q: macOS 提示 `python` 命令未找到
macOS 上 Python 命令可能是 `python3`，`run.sh` 已自动处理。如果手动运行，使用 `python3` 代替 `python`。

### Q: npm install 很慢或失败
可以使用国内镜像：
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### Q: pip install 很慢
可以使用国内镜像：
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q: 端口 8000 或 5173 被占用
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <进程号> /F

# macOS / Linux
lsof -i :8000
kill -9 <PID>
```

### Q: bcrypt 安装报错
bcrypt 4.0.1 需要 Rust 编译环境。如果安装失败，可以尝试：
```bash
# 方式1：使用预编译版本
pip install bcrypt==4.0.1 --only-binary :all:

# 方式2：升级 pip 后重试
pip install --upgrade pip
pip install bcrypt==4.0.1
```

### Q: AI 功能提示 API Key 未配置
在 `.env` 文件中配置 `DEEPSEEK_API_KEY`，重启后端即可。没有 API Key 不影响其他功能。
