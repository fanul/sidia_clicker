@echo off
title SIDIA Automation Runner
cd /d "%~dp0"

echo ===================================================
echo   Menjalankan SIDIA Automation (Mode Layar Aktif)
echo ===================================================
echo.

node index.js

echo.
echo ===================================================
echo   Otomasi selesai.
echo ===================================================
pause
