# Session Management & Anti-Bot Detection

## What's New

### 1. **Anti-Bot Detection Features**
The browser now launches with enhanced settings to avoid detection as a bot:

- **Realistic User Agent**: Uses Chrome 120.0.0.0 user agent
- **Navigator Properties**: Hides automation flags
- **Chrome Detection**: Mimics real Chrome browser
- **Permissions API**: Handles permission queries naturally
- **Cache Enabled**: Maintains browser cache for realistic behavior

### 2. **Role Selection Fix**
The role selection now works correctly:

**STEP 1**: Clicks the role item first
- Searches for "PSTFF", "Pelaksana", "Staff", or "52A"
- Clicks the role item to select it
- This enables the PILIH button

**STEP 2**: Waits for PILIH button to be enabled
- Checks up to 10 times (1 second intervals)
- Only clicks when button is NOT disabled
- Properly handles the button state change

### 3. **Session Persistence**
Sessions are now saved automatically:

**When Session is Saved:**
- After successful login and role selection
- After completing the workflow
- Even when errors occur (for recovery)

**What Gets Saved:**
- **Cookies**: All authentication cookies
- **localStorage**: Application data stored in browser
- **sessionStorage**: Temporary session data

**Storage Location:**
```
.session/
├── cookies.json          # Authentication cookies
├── localStorage.json     # Local storage data
└── sessionStorage.json   # Session storage data
```

### 4. **Enhanced Error Handling**
- Try-catch blocks around main workflow
- Session saved even on errors
- Graceful continuation when possible
- Detailed error messages for debugging

## Benefits

### 1. **Avoid Bot Detection**
- Maintains session across runs
- Realistic browser behavior
- Proper cookie handling
- Natural user agent

### 2. **Recovery Capability**
- Session can be loaded for recovery
- No need to login again if session valid
- Faster restarts after failures
- Maintains authentication state

### 3. **Better Reliability**
- Handles disabled button states
- Waits for UI elements to be ready
- Multiple retry attempts
- Graceful degradation

## Usage

### Normal Run
```bash
npm start
```

Session is automatically saved during and after the run.

### Future Enhancement (Not Yet Implemented)
The `loadSession()` function is ready for future use to:
- Skip login if valid session exists
- Recover from failures faster
- Resume interrupted workflows

## Security Notes

- Session files are in `.gitignore` (never committed)
- Contains sensitive authentication data
- Stored locally in `.session/` directory
- Automatically managed by the application

## Troubleshooting

### Session Issues
If you experience authentication problems:
1. Delete `.session/` directory
2. Run the automation again
3. New session will be created

### Role Selection Issues
If role selection fails:
1. Check the console output for role detection
2. Verify role names in the code match your system
3. The system will continue even if role selection fails

### Bot Detection
If detected as bot:
1. Check your user agent settings
2. Ensure cookies are being saved
3. Try running at different times
4. Consider adjusting wait times

## File Structure

```
sidia-clicker/
├── .session/              # Session storage (auto-created)
│   ├── cookies.json
│   ├── localStorage.json
│   └── sessionStorage.json
├── .gitignore            # Includes .session/
├── index.js              # Main automation with session management
└── SESSION_MANAGEMENT.md # This file
```

## Technical Details

### Anti-Bot Detection Implementation
```javascript
// Realistic user agent
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...');

// Hide automation
Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
});

// Mimic Chrome
window.chrome = { runtime: {} };
```

### Role Selection Flow
```javascript
// 1. Click role item
item.click();

// 2. Wait for button enable
while (!buttonEnabled && attempts < 10) {
    // Check if enabled
    if (!btn.disabled && !btn.classList.contains('v-btn--disabled')) {
        btn.click();
        return true;
    }
    await sleep(1000);
}
```

### Session Persistence
```javascript
// Save cookies
const cookies = await page.cookies();
fs.writeFileSync('cookies.json', JSON.stringify(cookies));

// Save localStorage
const localStorage = await page.evaluate(() => {
    // Extract all localStorage items
});
```

---

**Last Updated:** 2025-01-18
**Version:** 2.1.0
**Status:** Production Ready with Session Management
