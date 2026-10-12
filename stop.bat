@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SIDIA Dashboard - Stop

rem ============================================================
rem  SIDIA Dashboard - stop
rem  Stops the process listening on the dashboard port together
rem  with its child processes (automation + browser).
rem ============================================================

set "APP_PORT=3333"
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        if /i "%%a"=="PORT" set "APP_PORT=%%b"
    )
)
set "APP_PORT=%APP_PORT: =%"

set "FOUND="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%APP_PORT% .*LISTENING"') do (
    set "FOUND=1"
    echo [INFO] Menghentikan proses PID %%p di port %APP_PORT% ...
    taskkill /PID %%p /T /F >nul 2>&1
)

if not defined FOUND (
    echo [INFO] Tidak ada proses yang berjalan di port %APP_PORT%.
    exit /b 0
)

echo [OK] Dashboard dihentikan.
echo [INFO] Jika automation sedang berjalan saat dihentikan, setting sleep Windows mungkin belum dipulihkan:
echo        powercfg /change standby-timeout-ac 30
echo        powercfg /change monitor-timeout-ac 10
endlocal
exit /b 0
