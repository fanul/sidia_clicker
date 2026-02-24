# Keep Awake Feature

## Overview

This feature prevents Windows from sleeping during long-running automation tasks, ensuring your SIDIA automation can complete without interruption.

## How It Works

The system automatically:
- Disables system sleep timeout when automation starts
- Disables screen timeout when automation starts
- Restores your original settings when automation completes

## Usage

### Automatic (Default)
The keep-awake feature is **enabled by default**. When you run your automation:

```bash
npm start
```

The system will:
1. Display `🔋 Preventing system sleep...`
2. Disable sleep and screen timeouts
3. Run your automation
4. Display `🔋 Restoring normal sleep settings...`
5. Restore your original power settings

### Disable Keep-Awake

If you don't want to modify power settings, add this to your `.env` file:

```env
PREVENT_SLEEP=false
```

## Manual Methods

### PowerShell Script
Run the PowerShell script before starting automation:

```powershell
.\keep-awake.ps1
```

### Windows Settings (Permanent)
1. Go to **Settings → System → Power & sleep**
2. Set "Sleep" to **"Never"** when plugged in
3. Set "Screen" to **"Never"** when plugged in

### Command Line
To temporarily disable sleep (until you change it back):

```cmd
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
```

To restore defaults (30 min sleep, 10 min screen):

```cmd
powercfg /change standby-timeout-ac 30
powercfg /change monitor-timeout-ac 10
```

## Technical Details

The system uses Windows `powercfg` commands:
- `standby-timeout-ac 0`: Disables sleep on AC power
- `monitor-timeout-ac 0`: Disables screen timeout on AC power
- `standby-timeout-dc 0`: Disables sleep on battery power
- `monitor-timeout-dc 0`: Disables screen timeout on battery power

## Troubleshooting

### Check Current Power Settings
```powershell
powercfg /query
```

### Manually Restore Settings
If automation crashes before restoring settings:
```cmd
powercfg /change standby-timeout-ac 30
powercfg /change monitor-timeout-ac 10
```

## Notes

- Requires administrator privileges to change power settings
- Settings are only temporary and restored when automation completes
- Changes apply to both AC and DC (battery) power
- Works on Windows 10 and Windows 11
