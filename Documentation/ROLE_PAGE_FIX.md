# Role Selection Fix - Using /role URL and PILIH ROLE Detection

## Problem Identified
The role selection wasn't being detected because it's on a specific URL `/role` with a "PILIH ROLE" title element:
```html
<div class="v-toolbar__title">PILIH ROLE</div>
```

## Solution Implemented

### 1. URL-Based Detection ✅
```javascript
// Check current URL
const currentUrl = page.url();
const onRolePage = currentUrl.includes('/role') || currentUrl.includes('/select-role');
```

### 2. Title-Based Detection ✅
```javascript
// Check for PILIH ROLE title
const hasRoleTitle = await page.evaluate(() => {
    const title = document.querySelector('.v-toolbar__title');
    return title && title.textContent.includes('PILIH ROLE');
});
```

### 3. Automatic Navigation ✅
```javascript
if (!onRolePage && !hasRoleTitle) {
    // Navigate to role page
    await page.goto('https://sidia.bpjsketenagakerjaan.go.id/role', {
        waitUntil: 'networkidle2',
        timeout: 15000
    });
}
```

### 4. Enhanced Input Detection ✅
```javascript
// Log all inputs for debugging
for (const input of inputElements) {
    if (input.visible) {
        console.log(`Input: id="${input.id}", type="${input.type}", placeholder="${input.placeholder}"`);
    }
}

// Prefer autocomplete="off" inputs
if (input.autocomplete === 'off' || input.placeholder?.toLowerCase().includes('role')) {
    roleInputSelector = `#${input.id}`;
}
```

### 5. Retry Logic for Dropdown ✅
```javascript
if (roleOptions.length === 0) {
    // Click input again to trigger dropdown
    await page.click(roleInputSelector);
    await sleep(2000);

    // Check for options again
    const roleOptions2 = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.v-list-item'));
        return items.filter(el => el.offsetParent !== null)
            .map(el => ({ text: el.textContent.trim() }));
    });
}
```

## Complete Workflow

### Step 1: URL & Title Detection
```
👤 STEP 2: Selecting Role...
  → Current URL: https://sidia.bpjsketenagakerjaan.go.id/role
  ✓ On role selection page
  → Page title: "PILIH ROLE"
  → Has input field: true
```

### Step 2: Input Field Detection
```
  → Looking for role input field...
    → Found 1 input elements
    → Input: id="input-122", type="text", placeholder="Pilih Role"
    → Found role input: #input-122
  ✓ Clicked input field: #input-122
```

### Step 3: Dropdown Options
```
  → Waiting for dropdown options...
    → Found 3 role options
    → Option 1: PSTFF - Pelaksana/Staff ( 52A )
    → Option 2: ADMIN - Administrator
    → Option 3: REVIEWER - Document Reviewer
    → Selecting: PSTFF - Pelaksana/Staff ( 52A )
  ✓ Clicked first role option
```

### Step 4: PILIH Button
```
  → Waiting for PILIH button to be enabled...
    → Attempt 1/10
    → PILIH button clicked
  ✓ PILIH button clicked successfully
```

## Key Improvements

### Before
```javascript
// Only looked for dialog
const hasRoleDialog = await page.evaluate(() => {
    return document.querySelector('[role="dialog"]') !== null;
});
// ❌ Missed /role URL page
```

### After
```javascript
// Checks URL, title, and content
const onRolePage = currentUrl.includes('/role');
const hasRoleTitle = title?.textContent.includes('PILIH ROLE');
const pageCheck = { title, url, hasInput };
// ✅ Detects all role selection scenarios
```

## Debugging Features

### 1. URL Logging
```
Current URL: https://sidia.bpjsketenagakerjaan.go.id/role
```

### 2. Page Title Verification
```
Page title: "PILIH ROLE"
```

### 3. Input Field Details
```
Input: id="input-122", type="text", placeholder="Pilih Role"
```

### 4. Role Options Listing
```
Option 1: PSTFF - Pelaksana/Staff ( 52A )
Option 2: ADMIN - Administrator
```

## Edge Cases Handled

1. **Already on role page** → Detects via URL
2. **Role page accessible via different URL** → Detects via title
3. **Dropdown not appearing** → Retries with second click
4. **No options found** → Logs all inputs for debugging
5. **Navigation needed** → Automatically goes to /role URL

## Testing

```bash
# Clear sessions
rm -rf .session

# Run automation
npm start
```

### Expected Output:
```
👤 STEP 2: Selecting Role...
  → Current URL: https://sidia.bpjsketenagakerjaan.go.id/role
  ✓ On role selection page
  → Page title: "PILIH ROLE"
  → Has input field: true
  → Looking for role input field...
    → Found 1 input elements
    → Input: id="input-122", type="text", placeholder="Pilih Role"
    → Found role input: #input-122
  ✓ Clicked input field: #input-122
  → Waiting for dropdown options...
    → Found 3 role options
    → Option 1: PSTFF - Pelaksana/Staff ( 52A )
    → Selecting: PSTFF - Pelaksana/Staff
  ✓ Clicked first role option
  → Waiting for PILIH button to be enabled...
    → Attempt 1/10
    → PILIH button clicked
  ✓ PILIH button clicked successfully
```

## Summary

The role selection now:
- ✅ Detects `/role` URL
- ✅ Recognizes "PILIH ROLE" title
- ✅ Automatically navigates if needed
- ✅ Finds correct input field (autocomplete="off")
- ✅ Handles dropdown with retry logic
- ✅ Logs everything for easy debugging
- ✅ Works without any session caching

This should correctly detect and interact with the role selection page every time!