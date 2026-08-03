#!/bin/bash
# ============================================================
#  益屿活动管理平台 - 一键启动脚本 (macOS/Linux)
#  用法: ./run.sh [all|backend|frontend|stop]
# ============================================================

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

# 自动检测 python 命令
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "[ERROR] 未找到 Python，请先安装 Python 3.10+"
    echo "  macOS:   brew install python"
    echo "  Ubuntu:  sudo apt install python3 python3-venv python3-pip"
    exit 1
fi

if ! command -v npm &>/dev/null; then
    echo "[ERROR] 未找到 Node.js/npm，请先安装 Node.js 18+"
    echo "  macOS:   brew install node"
    echo "  Ubuntu:  sudo apt install nodejs npm"
    exit 1
fi

# 加载 .env（如存在）
if [ -f "$ROOT/.env" ]; then
    set -a
    source "$ROOT/.env"
    set +a
fi

# ---------- 功能函数 ----------

do_start_backend() {
    echo "正在启动后端..."
    if [ ! -d "$BACKEND_DIR/venv" ]; then
        echo "  [INFO] 首次运行，正在创建虚拟环境..."
        cd "$BACKEND_DIR"
        $PYTHON_CMD -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd "$ROOT"
    fi
    cd "$BACKEND_DIR"
    source venv/bin/activate
    nohup python main.py > "$BACKEND_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_DIR/.pid"
    cd "$ROOT"
    sleep 2
    echo "  [OK] 后端已启动 (PID: $BACKEND_PID)"
}

do_start_frontend() {
    echo "正在启动前端..."
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo "  [INFO] 首次运行，正在安装依赖 (可能需要几分钟)..."
        cd "$FRONTEND_DIR"
        npm install
        cd "$ROOT"
    fi
    cd "$FRONTEND_DIR"
    nohup npm run dev > "$FRONTEND_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$FRONTEND_DIR/.pid"
    cd "$ROOT"
    sleep 2
    echo "  [OK] 前端已启动 (PID: $FRONTEND_PID)"
}

do_stop_all() {
    echo "正在停止所有服务..."
    if [ -f "$BACKEND_DIR/.pid" ]; then
        kill "$(cat "$BACKEND_DIR/.pid")" 2>/dev/null && echo "  [OK] 后端已停止" || true
        rm -f "$BACKEND_DIR/.pid"
    fi
    if [ -f "$FRONTEND_DIR/.pid" ]; then
        kill "$(cat "$FRONTEND_DIR/.pid")" 2>/dev/null && echo "  [OK] 前端已停止" || true
        rm -f "$FRONTEND_DIR/.pid"
    fi
    # 兜底：按端口杀进程
    lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
    echo "  [OK] 所有服务已停止"
}

# ---------- 主逻辑 ----------

if [ $# -eq 0 ]; then
    # 交互菜单
    echo ""
    echo "  ================================"
    echo "    益屿活动管理平台 - 启动菜单"
    echo "  ================================"
    echo ""
    echo "    1. 启动全部 (前端 + 后端)"
    echo "    2. 仅启动后端"
    echo "    3. 仅启动前端"
    echo "    4. 重启全部 (先停后启)"
    echo "    5. 停止全部"
    echo "    0. 退出"
    echo ""
    read -p "请选择 [0-5]: " choice
else
    choice="$1"
fi

case "$choice" in
    1|all)
        do_start_backend
        do_start_frontend
        echo ""
        echo "  ========================================"
        echo "   [OK] 全部服务已启动!"
        echo "   后端: http://localhost:8000"
        echo "   前端: http://localhost:5173"
        echo "   API文档: http://localhost:8000/docs"
        echo "  ========================================"
        echo ""
        echo "  停止服务: ./run.sh stop"
        echo "  查看日志: tail -f backend/backend.log"
        echo ""
        ;;
    2|backend)
        do_start_backend
        echo "  [OK] 后端: http://localhost:8000"
        echo "  [OK] API文档: http://localhost:8000/docs"
        ;;
    3|frontend)
        do_start_frontend
        echo "  [OK] 前端: http://localhost:5173"
        ;;
    4|restart)
        do_stop_all
        sleep 2
        do_start_backend
        do_start_frontend
        echo "  [OK] 全部服务已重启"
        ;;
    5|stop)
        do_stop_all
        ;;
    0)
        exit 0
        ;;
    *)
        echo "未知命令: $choice"
        echo "用法: ./run.sh [all|backend|frontend|stop]"
        exit 1
        ;;
esac
