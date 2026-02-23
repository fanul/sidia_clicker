# Role Selection Fix - Precise Element Targeting

## Problem Identified
The role selection was using cached session data (cookies, localStorage) instead of actually clicking the correct elements. This caused the automation to skip role selection or select the wrong role.

## Solutions Implemented

### 1. Cache Clearing Before Role Selection
**Location:** [index.js](index.js) - `executeWorkflow()` function

Added automatic session cache clearing before role selection:
```javascript
// Clear any cached session data before role selection if enabled
if (CONFIG.clearSessionBeforeRole) {
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        // Remove role-related cookies
    });
}
```

**Configuration:**
- New env var: `CLEAR_SESSION_BEFORE_ROLE=true` (default)
- Set to `false` in `.env` if you want to keep sessions

### 2. Precise Input Field Targeting
**Location:** [login.js](login.js) - `findAndClickRoleInput()` function

Instead of generic selectors, now:
1. **Finds all text inputs** and logs their details
2. **Targets specific patterns:**
   - `autocomplete="off"`
   - ID contains `input-`
   - Class contains `v-input`
3. **Verifies focus** after clicking
4. **Falls back** to first visible input

```javascript
// Find all input elements and get their details
const inputInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    return inputs.map(input => ({
        id: input.id,
        placeholder: input.placeholder,
        className: input.className,
        visible: input.offsetParent !== null,
        autocomplete: input.autocomplete
    }));
});
```

### 3. Enhanced Role Option Selection
**Location:** [login.js](login.js) - `clickFirstRoleOption()` function

Improved dropdown selection:
1. **Detailed logging** of all role options found
2. **Multiple click strategies:**
   - Element reference clicking
   - Direct CSS selector
   - Evaluation handle approach
3. **Verification** of successful selection
4. **Active state checking** (`.v-list-item--active`)

### 4. In-Function Cache Clearing
**Location:** [login.js](login.js) - `clearRoleSelectionCache()` function

Additional cache clearing within role selection:
```javascript
await page.evaluate(() => {
    localStorage.removeItem('selectedRole');
    sessionStorage.removeItem('selectedRole');

    // Remove any active role selection classes
    const activeElements = document.querySelectorAll('.v-list-item--active, .v-item--active');
    activeElements.forEach(el => {
        el.classList.remove('v-list-item--active', 'v-item--active');
    });
});
```

## Key Improvements

### Before (Problematic)
```javascript
// Generic approach - used cached data
const roleClicked = await page.evaluate(() => {
    const roleItems = document.querySelectorAll('.v-list-item');
    roleItems[0].click();
    return true;
});
```

### After (Fixed)
```javascript
// Precise approach - targets exact elements
const inputInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    return inputs.map(input => ({
        id: input.id,
        autocomplete: input.autocomplete,
        visible: input.offsetParent !== null
    }));
});

// Click specific input by ID
await page.click(`#${inputInfo.id}`, { timeout: 2000 });

// Verify it's focused
const isFocused = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el === document.activeElement;
}, inputId);
```

## New Features

### 1. Detailed Debug Logging
```javascript
console.log(chalk.gray(`    → Found ${inputInfo.length} text inputs`));
for (const info of inputInfo) {
    if (info.visible) {
        console.log(chalk.gray(`    → Input: id="${info.id}", placeholder="${info.placeholder}"`));
    }
}
```

### 2. Configuration Option
Add to `.env`:
```env
# Clear session before role selection (default: true)
CLEAR_SESSION_BEFORE_ROLE=true
```

### 3. Session Directory Cleanup
Automatic cleanup of old session data:
```bash
rm -rf .session
```

## Testing the Fixes

### 1. Manual Testing
```bash
# Clear sessions first
rm -rf .session

# Run automation
npm start
```

### 2. Verify Role Selection
Look for these logs:
```
👤 STEP 2: Selecting Role...
  → Cleared role selection cache
  → Role selection dialog found
    → Found 2 text inputs
    → Input: id="input-122", placeholder="Pilih Role", class="v-input"
    → Clicked role input: #input-122
    → Waiting for role dropdown to appear...
    → Found 3 role options
    → Option 1: PSTFF - Pelaksana/Staff ( 52A )
    → Option 2: ADMIN - Administrator
    → Option 3: REVIEWER - Document Reviewer
    → Selected role: PSTFF - Pelaksana/Staff ( 52A )
  ✓ Role option selected
  → Waiting for PILIH button to be enabled...
    → Attempt 1/10
    → Clicked PILIH button
  ✓ PILIH button clicked successfully
```

## Troubleshooting

### Issue: Still skipping role selection
**Solution:** Set environment variable:
```env
CLEAR_SESSION_BEFORE_ROLE=true
```

### Issue: Wrong role selected
**Solution:** Check the logs to see which input was clicked. The system now logs all available inputs and role options.

### Issue: Input not found
**Solution:** The system will show all detected inputs. Verify the input field details match what you expect.

### Issue: PILIH button stays disabled
**Solution:** Check if role option was actually selected (look for "Selected role:" message with active state verification).

## Summary

The role selection now:
- ✅ Clears all cached session data before selection
- ✅ Targets exact input elements by ID and properties
- ✅ Verifies clicks and focus states
- ✅ Logs all available options for debugging
- ✅ Uses multiple fallback strategies
- ✅ Can be configured via environment variables

This ensures that role selection always works with fresh data and clicks the correct elements instead of relying on cached sessions.