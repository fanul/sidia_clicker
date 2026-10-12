@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SIDIA Dashboard - Update

rem ============================================================
rem  SIDIA Dashboard - update
rem  Stops the dashboard, pulls the latest code from GitHub
rem  (master), installs dependencies, then starts it again.
rem  Usage:  update.bat            -> update and restart dashboard
rem          update.bat norestart  -> update only
rem  Your .env (username/password) and data\ are not touched.
rem
rem  NOTE: everything below is one parenthesized block so cmd reads
rem  the whole script before running it. This keeps it safe when
rem  git pull replaces update.bat itself. Avoid raw ( ) in echo text.
rem ============================================================

(
    where git >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Git tidak ditemukan. Install dari https://git-scm.com lalu jalankan ulang.
        pause
        exit /b 1
    )

    if not exist ".git" (
        echo [ERROR] Folder ini bukan hasil git clone, tidak bisa di-update dengan git pull.
        pause
        exit /b 1
    )

    where node >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Node.js tidak ditemukan. Install dari https://nodejs.org lalu jalankan ulang.
        pause
        exit /b 1
    )

    echo [INFO] Menghentikan dashboard jika sedang berjalan...
    call "%~dp0stop.bat"

    echo.
    echo [INFO] Mengambil update terbaru dari GitHub...
    git fetch origin master
    if errorlevel 1 (
        echo [ERROR] Gagal terhubung ke GitHub. Periksa koneksi internet lalu coba lagi.
        pause
        exit /b 1
    )

    git checkout master
    if errorlevel 1 (
        echo [ERROR] Gagal pindah ke branch master. Kemungkinan ada file yang Anda ubah sendiri.
        echo         Simpan atau batalkan perubahan itu dulu, lalu jalankan update.bat lagi.
        pause
        exit /b 1
    )

    git pull --ff-only origin master
    if errorlevel 1 (
        echo [ERROR] git pull gagal. Kemungkinan ada file yang Anda ubah sendiri dan bentrok dengan update.
        echo         Simpan atau batalkan perubahan itu dulu, lalu jalankan update.bat lagi.
        pause
        exit /b 1
    )

    echo.
    echo [INFO] Menginstall dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install gagal.
        pause
        exit /b 1
    )

    echo.
    echo [OK] Update selesai.
    git log -1 --format="     Versi: %%h - %%s [%%cd]" --date=short

    if /i "%~1"=="norestart" exit /b 0

    echo.
    call "%~dp0start.bat"
    exit /b 0
)
