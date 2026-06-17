@echo off
title AI Interview Platform - Launcher
cls
echo ==========================================================
echo           Starting AI Interview Platform Services
echo ==========================================================
echo.

echo [1/1] Launching the integrated platform startup script...
start "AI Interview Platform" cmd /c "..\venv\Scripts\python.exe run.py"

echo.
echo ==========================================================
echo           Launcher started. Check the new window for status.
echo ==========================================================
echo.
echo You can now use the platform in your browser after startup completes.
echo.
pause
