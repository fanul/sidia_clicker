# Keep Windows Awake Script
# Run this before starting your automation

Write-Host "Preventing Windows from sleeping..." -ForegroundColor Green

# Set power settings to prevent sleep
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change monitor-timeout-dc 0

Write-Host "✓ Sleep prevention activated" -ForegroundColor Green
Write-Host "Current settings:" -ForegroundColor Yellow
powercfg /query

Write-Host "`nTo restore default settings later, run: powercfg /change standby-timeout-ac 30" -ForegroundColor Cyan
