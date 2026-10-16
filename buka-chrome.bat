@echo off
title Google Chrome Khusus SIDIA (Port 9222)
cd /d "%~dp0"

echo ===================================================================
echo   MEMBUKA GOOGLE CHROME RESMI UNTUK SIDIA (PORT DEBUG 9222)
echo ===================================================================
echo.
echo Langkah mudah:
echo   1. Jendela Google Chrome resmi akan terbuka.
echo   2. Login ke SIDIA seperti biasa di jendela tersebut.
echo   3. Setelah berhasil login, biarkan Chrome tetap terbuka.
echo   4. Klik dua kali "run.bat" untuk memproses dokumen otomatis!
echo.
echo ===================================================================

if not exist "%LOCALAPPDATA%\Google\Chrome\AutomationProfile" (
    mkdir "%LOCALAPPDATA%\Google\Chrome\AutomationProfile"
)

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\Google\Chrome\AutomationProfile" "https://sidia.bpjsketenagakerjaan.go.id/login"
