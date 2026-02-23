# Complete Fix - Role Selection Without Cookies

## Root Problem
The role selection was using cached cookies/session data from previous runs instead of actually clicking the correct elements.

## Complete Solution

### 1. **Removed All Session Persistence** ✅
```javascript
// BEFORE: Saved sessions after every step
await login(page);
await saveSession(page);  // ❌ This saved role selection

await selectRole(page);
await saveSession(page);  // ❌ This cached the role

// AFTER: No session saving at all
await login(page);
await selectRole(page);  // ✅ Fresh interaction every time
```

### 2. **Complete Cache Clearing** ✅
Before role selection, the system now:
```javascript
// Clear ALL browser data
await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();

    // Delete ALL cookies
    document.cookie.split(";").forEach(cookie => {
        document.cookie = cookie.replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
});
```

### 3. **Direct Element Targeting** ✅
Instead of using saved session data, the system now:

**Step 1: Find the exact role input field**
```javascript
// Find input with autocomplete="off"
const inputElements = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map(input => ({
        id: input.id,
        type: input.type,
        autocomplete: input.autocomplete,
        visible: input.offsetParent !== null
    }));
});

// Click the specific input by ID
await page.click(`#${roleInputId}`, { clickCount: 1, delay: 100 });
```

**Step 2: Click first role option from dropdown**
```javascript
// Get all visible role options
const roleOptions = await page.evaluate(() => {
    const selectors = ['.v-list-item', '.v-list-item__title', '[role="option"]'];
    // ... find all visible options
});

// Click first option directly by text
await page.evaluate((text) => {
    const elements = Array.from(document.querySelectorAll('*'));
    const target = elements.find(el =>
        el.textContent.includes(text) &&
        el.offsetParent !== null
    );
    if (target) target.click();
}, firstOption.text);
```

**Step 3: Click PILIH button when enabled**
```javascript
// Find and click PILIH button directly
clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, .v-btn'));
    for (const btn of buttons) {
        const text = (btn.textContent || '').trim();
        const isEnabled = !btn.disabled && !btn.classList.contains('v-btn--disabled');
        if ((text.includes('PILIH') || text.includes('Pilih')) && isEnabled) {
            btn.click();
            return true;
        }
    }
    return false;
});
```

## What Changed

### Before (Using Cookies)
```javascript
// Used cached session data
await loadSession(page);  // ❌ Loaded previous role selection
await selectRole(page);   // ❌ Skipped, used cached role
await saveSession(page);  // ❌ Saved to use next time
```

### After (Fresh Every Time)
```javascript
// No session loading/saving
await login(page);        // ✅ Fresh login
// Clear all cookies/data
await selectRole(page);   // ✅ Actual clicks, no cache
// No session saving
```

## Testing

### 1. Verify No Session Files
```bash
# Should be empty or not exist
ls -la .session/
```

### 2. Check Logs for Fresh Interaction
You should see:
```
👤 STEP 2: Selecting Role...
  → Clearing all browser data...
  → Role selection dialog found
  → Looking for role input field...
    → Found 3 input elements
    → Found candidate input: id="input-122", placeholder="Pilih Role"
  ✓ Clicked input field: #input-122
  → Waiting for dropdown options...
    → Found 3 role options
    → Option 1: PSTFF - Pelaksana/Staff ( 52A )
    → Option 2: ADMIN - Administrator
    → Attempting to click: PSTFF - Pelaksana/Staff
  ✓ Clicked first role option
  → Waiting for PILIH button to be enabled...
    → Attempt 1/10
    → PILIH button clicked
  ✓ PILIH button clicked successfully
```

### 3. Run Multiple Times
Each run should:
- Show the same logs (not "skipping role selection")
- Actually click the input field
- Wait for dropdown
- Click the role option
- Click PILIH button

## Key Differences

| Aspect | Before (With Cookies) | After (No Cookies) |
|--------|---------------------|-------------------|
| Session | Saved and loaded | Never saved |
| Role Selection | Used cached value | Always clicks elements |
| Input Click | Often skipped | Always clicks input field |
| Dropdown | Skipped (cached) | Always waits and clicks |
| PILIH Button | Skipped (cached) | Always clicks |
| Consistency | Unpredictable | 100% consistent |

## Files Modified

1. **index.js**
   - Removed all `saveSession()` calls
   - Removed session-related error handling
   - Simplified workflow

2. **login.js**
   - Completely rewrote `selectRole()` function
   - Added comprehensive cache clearing
   - Direct element targeting by ID
   - Multiple click strategies
   - Better logging and debugging

3. **Session Directory**
   - Deleted `.session/` directory
   - Will not be recreated

## Benefits

✅ **100% Fresh State** - No cached data ever used
✅ **Predictable Behavior** - Same clicks every time
✅ **Better Debugging** - See exactly what's being clicked
✅ **No Session Issues** - Can't have stale session problems
✅ **Clean Implementation** - Simpler code without session management

## How to Verify It's Working

1. **Run the automation**
   ```bash
   npm start
   ```

2. **Look for these specific logs:**
   - "Clearing all browser data..."
   - "Found X input elements"
   - "Clicked input field: #input-XXX"
   - "Found X role options"
   - "Clicked first role option"
   - "PILIH button clicked"

3. **Run again immediately**
   - Should see the exact same logs
   - No "skipping" messages
   - No "using cached session" messages

This ensures role selection works correctly every single time without relying on any cookies or cached data!