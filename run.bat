@echo off
chcp 65001 >nul 2>nul

:: ============================================================
::  YiYu Platform - One-click Launcher
::  Usage: run.bat [all|backend|frontend|stop]
:: ============================================================

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

:: ---------- Check prerequisites ----------
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+
    echo Download: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js/npm not found. Please install Node.js 18+
    echo Download: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: ---------- Load .env if exists ----------
if not exist "%ROOT%.env" goto :skip_env
for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%.env") do (
    if not "%%A"=="" (
        if not "%%B"=="" (
            set "%%A=%%B"
        )
    )
)
:skip_env

:: ---------- Command dispatch ----------
if "%~1"=="" goto :menu
if "%~1"=="all" goto :start_all
if "%~1"=="backend" goto :start_backend
if "%~1"=="frontend" goto :start_frontend
if "%~1"=="stop" goto :stop_all
echo Unknown command: %~1
echo Usage: run.bat [all^|backend^|frontend^|stop]
echo.
pause
exit /b 1

:menu
echo.
echo  ================================
echo    YiYu Platform Launcher Menu
echo  ================================
echo.
echo    1. Start all (backend + frontend)
echo    2. Start backend only
echo    3. Start frontend only
echo    4. Restart all (stop then start)
echo    5. Stop all
echo    0. Exit
echo.
set /p "choice=Select [0-5]: "
if "%choice%"=="1" goto :start_all
if "%choice%"=="2" goto :start_backend
if "%choice%"=="3" goto :start_frontend
if "%choice%"=="4" goto :restart_all
if "%choice%"=="5" goto :stop_all
if "%choice%"=="0" exit /b 0
echo Invalid choice, please try again.
echo.
goto :menu

:: ==================== Start ====================

:start_all
call :do_start_backend
if errorlevel 1 (
    echo.
    pause
    exit /b 1
)
call :do_start_frontend
if errorlevel 1 (
    echo.
    pause
    exit /b 1
)
echo.
echo  ========================================
echo   [OK] All services started!
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo  ========================================
echo.
echo  Closing this window will NOT stop services.
echo  To stop: run.bat stop
echo.
pause
exit /b 0

:restart_all
call :stop_all
timeout /t 2 /nobreak >nul
goto :start_all

:start_backend
call :do_start_backend
if errorlevel 1 (
    echo.
    pause
    exit /b 1
)
echo.
echo  [OK] Backend: http://localhost:8000
echo  [OK] API Docs: http://localhost:8000/docs
echo.
pause
exit /b 0

:start_frontend
call :do_start_frontend
if errorlevel 1 (
    echo.
    pause
    exit /b 1
)
echo.
echo  [OK] Frontend: http://localhost:5173
echo.
pause
exit /b 0

:: ==================== Stop ====================

:stop_all
echo Stopping all services...
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%p /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING" 2^>nul') do taskkill /PID %%p /F >nul 2>&1
echo  [OK] All services stopped.
echo.
pause
exit /b 0

:: ==================== Subroutines ====================

:do_start_backend
echo Starting backend...
if exist "%BACKEND_DIR%\venv" goto :backend_venv_ok
echo  [INFO] First run - creating virtual environment...
cd /d "%BACKEND_DIR%"
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    exit /b 1
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
cd /d "%ROOT%"
goto :backend_launch

:backend_venv_ok
cd /d "%BACKEND_DIR%"
call venv\Scripts\activate.bat
cd /d "%ROOT%"

:backend_launch
start "YiYu-Backend" /d "%BACKEND_DIR%" cmd /k "call venv\Scripts\activate.bat && python main.py"
timeout /t 3 /nobreak >nul
exit /b 0

:do_start_frontend
echo Starting frontend...
if exist "%FRONTEND_DIR%\node_modules" goto :frontend_deps_ok
echo  [INFO] First run - installing dependencies (may take a few minutes)...
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed
    exit /b 1
)
cd /d "%ROOT%"
goto :frontend_launch

:frontend_deps_ok

:frontend_launch
start "YiYu-Frontend" /d "%FRONTEND_DIR%" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul
exit /b 0
