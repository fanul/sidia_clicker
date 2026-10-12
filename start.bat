@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SIDIA Dashboard

rem ============================================================
rem  SIDIA Dashboard - start
rem  Usage:  start.bat              -> start dashboard only
rem          start.bat run          -> start dashboard + run automation
rem          start.bat run headless -> same, browser hidden
rem  Port is read from PORT in .env (default 3333)
rem ============================================================

set "APP_PORT=3333"
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        if /i "%%a"=="PORT" set "APP_PORT=%%b"
    )
)
set "APP_PORT=%APP_PORT: =%"
set "PORT=%APP_PORT%"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan. Install dari https://nodejs.org lalu jalankan ulang.
    pause
    exit /b 1
)

if not exist "node_modules\chart.js" (
    echo [INFO] Menginstall dependencies, mohon tunggu...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install gagal.
        pause
        exit /b 1
    )
)

if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
        echo [INFO] File .env dibuat dari .env.example.
        echo [INFO] Isi SIDIA_USERNAME dan SIDIA_PASSWORD di .env sebelum menjalankan automation.
    )
)

netstat -ano | findstr /R /C:":%APP_PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo [INFO] Dashboard sudah berjalan di port %APP_PORT%.
    start "" "http://localhost:%APP_PORT%"
    exit /b 0
)

set "SERVER_ARGS="
if /i "%~1"=="run" set "SERVER_ARGS=--autorun"
if /i "%~2"=="headless" set "SERVER_ARGS=%SERVER_ARGS% --headless"

if not exist "data" mkdir "data"

echo [INFO] Menjalankan dashboard di http://localhost:%APP_PORT% ...
start "SIDIA Dashboard Server" /min cmd /c "node server.js %SERVER_ARGS% >> data\server.log 2>&1"

timeout /t 3 /nobreak >nul
start "" "http://localhost:%APP_PORT%"

echo [OK] Dashboard berjalan. Untuk menghentikan jalankan stop.bat
endlocal
exit /b 0
