@echo off
chcp 65001 >nul 2>nul

:: ============================================================
::  益屿活动管理平台 - 一键启动脚本
::  用法: run.bat [all|backend|frontend|stop]
:: ============================================================

:: 用 wrapper 模式：无论主逻辑成功还是失败，窗口都不会闪退
call :main
echo.
echo 按任意键关闭窗口...
pause >nul
exit /b 0

:main
set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

:: ---------- 检查基础环境 ----------
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 未找到 Python，请先安装 Python 3.10+
    echo 下载地址: https://www.python.org/downloads/
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 未找到 Node.js/npm，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    exit /b 1
)

:: ---------- 加载 .env ----------
if not exist "%ROOT%.env" goto :skip_env
for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%.env") do (
    if not "%%A"=="" (
        if not "%%B"=="" (
            set "%%A=%%B"
        )
    )
)
:skip_env

:: ---------- 命令分发 ----------
if "%~1"=="" goto :menu
if "%~1"=="all" goto :start_all
if "%~1"=="backend" goto :start_backend
if "%~1"=="frontend" goto :start_frontend
if "%~1"=="stop" goto :stop_all
echo 未知命令: %~1
echo 用法: run.bat [all^|backend^|frontend^|stop]
exit /b 1

:menu
echo.
echo  ================================
echo    益屿活动管理平台 - 启动菜单
echo  ================================
echo.
echo    1. 启动全部 (前端 + 后端)
echo    2. 仅启动后端
echo    3. 仅启动前端
echo    4. 重启全部 (先停后启)
echo    5. 停止全部
echo    0. 退出
echo.
set /p "choice=请选择 [0-5]: "
if "%choice%"=="1" goto :start_all
if "%choice%"=="2" goto :start_backend
if "%choice%"=="3" goto :start_frontend
if "%choice%"=="4" goto :restart_all
if "%choice%"=="5" goto :stop_all
if "%choice%"=="0" exit /b 0
echo 无效选择，请重新输入
echo.
goto :menu

:: ==================== 启动 ====================

:start_all
call :do_start_backend
if errorlevel 1 exit /b 1
call :do_start_frontend
if errorlevel 1 exit /b 1
echo.
echo  ========================================
echo   [OK] 全部服务已启动!
echo   后端: http://localhost:8000
echo   前端: http://localhost:5173
echo   API文档: http://localhost:8000/docs
echo  ========================================
echo.
echo  关闭此窗口不会停止服务。
echo  停止服务请运行: run.bat stop
exit /b 0

:restart_all
call :stop_all
timeout /t 2 /nobreak >nul
goto :start_all

:start_backend
call :do_start_backend
if errorlevel 1 exit /b 1
echo.
echo  [OK] 后端: http://localhost:8000
echo  [OK] API文档: http://localhost:8000/docs
exit /b 0

:start_frontend
call :do_start_frontend
if errorlevel 1 exit /b 1
echo.
echo  [OK] 前端: http://localhost:5173
exit /b 0

:: ==================== 停止 ====================

:stop_all
echo 正在停止所有服务...
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%p /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%p /F >nul 2>&1
echo  [OK] 所有服务已停止
exit /b 0

:: ==================== 子过程 ====================

:do_start_backend
echo 正在启动后端...
if exist "%BACKEND_DIR%\venv" goto :backend_skip_venv
echo  [INFO] 首次运行，正在创建虚拟环境...
cd /d "%BACKEND_DIR%"
python -m venv venv
if errorlevel 1 (
    echo [ERROR] 创建虚拟环境失败
    exit /b 1
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] 安装依赖失败
    exit /b 1
)
cd /d "%ROOT%"
:backend_skip_venv
start "YiYu-Backend" /d "%BACKEND_DIR%" cmd /k "call venv\Scripts\activate.bat && python main.py"
timeout /t 3 /nobreak >nul
exit /b 0

:do_start_frontend
echo 正在启动前端...
if exist "%FRONTEND_DIR%\node_modules" goto :frontend_skip_npm
echo  [INFO] 首次运行，正在安装依赖 (可能需要几分钟)...
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
    echo [ERROR] npm install 失败
    exit /b 1
)
cd /d "%ROOT%"
:frontend_skip_npm
start "YiYu-Frontend" /d "%FRONTEND_DIR%" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul
exit /b 0
