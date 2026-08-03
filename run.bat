@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
::  益屿活动管理平台 - 一键启动脚本
::  用法: run.bat [all|backend|frontend|stop]
:: ============================================================

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

:: 默认加载 .env（如存在）
if exist "%ROOT%.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%.env") do (
        set "line=%%A"
        if not "!line:~0,1!"=="#" (
            set "%%A=%%B"
        )
    )
)

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
set /p choice="请选择 [0-5]: "
if "%choice%"=="1" goto :start_all
if "%choice%"=="2" goto :start_backend
if "%choice%"=="3" goto :start_frontend
if "%choice%"=="4" goto :restart_all
if "%choice%"=="5" goto :stop_all
if "%choice%"=="0" exit /b 0
echo 无效选择
goto :menu

:start_all
call :do_start_backend
call :do_start_frontend
echo.
echo  [OK] 全部服务已启动
echo    后端: http://localhost:8000
echo    前端: http://localhost:5173
echo    API 文档: http://localhost:8000/docs
echo.
exit /b 0

:restart_all
call :stop_all
timeout /t 2 /nobreak >nul
goto :start_all

:start_backend
call :do_start_backend
echo.
echo  [OK] 后端已启动: http://localhost:8000
echo  [OK] API 文档: http://localhost:8000/docs
echo.
exit /b 0

:start_frontend
call :do_start_frontend
echo.
echo  [OK] 前端已启动: http://localhost:5173
echo.
exit /b 0

:stop_all
echo 正在停止所有服务...
:: 终止 uvicorn 进程
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
:: 终止 vite 进程
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
echo  [OK] 所有服务已停止
exit /b 0

:do_start_backend
echo 正在启动后端...
cd /d "%BACKEND_DIR%"
if not exist "venv" (
    echo  [INFO] 首次运行，正在创建虚拟环境...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)
start "YiYu-Backend" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && set DEEPSEEK_API_KEY=%DEEPSEEK_API_KEY% && python main.py"
cd /d "%ROOT%"
timeout /t 3 /nobreak >nul
exit /b 0

:do_start_frontend
echo 正在启动前端...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    echo  [INFO] 首次运行，正在安装依赖...
    call npm install
)
start "YiYu-Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"
cd /d "%ROOT%"
timeout /t 2 /nobreak >nul
exit /b 0
