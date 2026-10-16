@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SIDIA Dashboard - Stop

rem ============================================================
rem  SIDIA Dashboard & Chrome Port 9222 - Stop
rem  Menghentikan server dashboard (Port 3333), otomasi,
rem  dan proses orphan Google Chrome di Port 9222 serta
rem  membersihkan file lock profil secara tuntas.
rem ============================================================

set "APP_PORT=3333"
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        if /i "%%a"=="PORT" set "APP_PORT=%%b"
    )
)
set "APP_PORT=%APP_PORT: =%"

echo [1/3] Memeriksa proses di Port Dashboard (%APP_PORT%)...
set "FOUND_APP="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%APP_PORT%" ^| findstr "LISTENING"') do (
    set "FOUND_APP=1"
    echo [INFO] Menghentikan proses Dashboard PID %%p di port %APP_PORT% ...
    taskkill /PID %%p /T /F >nul 2>&1
)
if not defined FOUND_APP (
    echo [INFO] Tidak ada proses yang berjalan di port %APP_PORT%.
)

echo [2/3] Memeriksa proses Google Chrome orphan (Port 9222 & Otomasi)...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*--remote-debugging-port=9222*' -or $_.CommandLine -like '*AutomationProfile*' -or $_.CommandLine -like '*browser-profile*' } | ForEach-Object { Write-Host '[INFO] Menghentikan Chrome orphan PID' $_.ProcessId; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo [3/3] Membersihkan file lock profil Chrome...
set "PROFILE_DIR=%LOCALAPPDATA%\Google\Chrome\AutomationProfile"
if exist "%PROFILE_DIR%\lockfile" del /f /q "%PROFILE_DIR%\lockfile" >nul 2>&1
if exist "%PROFILE_DIR%\LOCK" del /f /q "%PROFILE_DIR%\LOCK" >nul 2>&1
if exist "%PROFILE_DIR%\Default\LOCK" del /f /q "%PROFILE_DIR%\Default\LOCK" >nul 2>&1
echo [OK] Pembersihan selesai. Semua server dan orphan Chrome telah dihentikan.

endlocal
exit /b 0
