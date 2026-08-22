@echo off
title Local C++ AI Server
cd /d "%~dp0"
echo ===================================================
echo   LOCAL C++ AI - ALGORITHM & LOGIC SYSTEM
echo ===================================================
echo Starting server on http://127.0.0.1:8000 ...
.\.venv\Scripts\python.exe run.py
pause
