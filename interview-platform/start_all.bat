@echo off
title AI Interview Platform - Launcher
cls
echo ==========================================================
echo           Starting AI Interview Platform Services
echo ==========================================================
echo.

:: 1. Start Native Redis Server
echo [1/3] Starting Native Windows Redis Server...
start "Redis Server" cmd /c "redis\redis-server.exe redis\redis.windows.conf"
timeout /t 2 /nobreak >nul

:: 2. Start FastAPI Server
echo [2/3] Starting FastAPI Server...
start "FastAPI Server" cmd /c "..\.venv\Scripts\python.exe run.py"
timeout /t 2 /nobreak >nul

:: 3. Start Celery Worker (AI Processing)
echo [3/3] Starting Celery Worker (Concurrency=1)...
start "Celery Worker" cmd /c "..\.venv\Scripts\python.exe run_celery.py"

echo.
echo ==========================================================
echo           All Services Started Successfully!
echo ==========================================================
echo.
echo You can now use the platform in your browser.
echo Do not close the other open cmd windows.
echo.
pause
