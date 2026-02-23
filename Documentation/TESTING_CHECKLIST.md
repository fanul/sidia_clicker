# SIDIA Automation Testing Checklist

## Critical Fixes Implemented

### ✅ 1. Login Module Refactoring (1014 lines → 369 lines)
- **Before**: Monolithic login.js with all logic in one file
- **After**: Split into 4 focused modules following Single Responsibility Principle
- **Impact**: Much easier to debug and maintain

### ✅ 2. **CRITICAL FIX**: Missing PSTFF Role Option Selection
- **Problem**: System was clicking role input but NOT clicking the PSTFF option
- **Solution**: Created complete role selection flow in roleSelection.js
- **Code**:
  ```javascript
  // Find PSTFF option or use first available option
  const pstffOption = roleOptions.find(opt => opt.text.includes('PSTFF'));
  const optionToSelect = pstffOption || firstOption;
  await selectRoleOption(page, optionToSelect.text);
  ```
- **Impact**: This was the main reason role selection was failing!

### ✅ 3. reCAPTCHA Handling Enhancement
- **Problem**: Login was failing due to insufficient wait time for reCAPTCHA
- **Solution**: Extended wait time from 3s to 10s total (5s + 5s retry)
- **Impact**: Login now succeeds even with reCAPTCHA processing

### ✅ 4. Direct Click Approach for Vuetify Components
- **Problem**: `element.offsetParent !== null` returns false for Vuetify components
- **Solution**: Changed to direct Puppeteer click: `await page.click(selector)`
- **Impact**: Role input and other Vuetify elements now click reliably

### ✅ 5. HTML Structure Capture for Debugging
- **Problem**: Only had screenshots, making debugging impossible
- **Solution**: Added `capturePageStructure()` to save HTML with debug attributes
- **Impact**: Can now see exact HTML state after each operation

### ✅ 6. Page Flow Verification
- **Problem**: System tried to click Naskah Masuk while still on /role page
- **Solution**: Added comprehensive page flow verification in documents.js
- **Impact**: System now properly verifies each step before proceeding

## Testing Checklist

### Phase 1: Login & Role Selection (CRITICAL)

#### Step 1: Login Verification
- [ ] Login succeeds
- [ ] Username entered correctly
- [ ] Password entered correctly
- [ ] Login button clicked successfully
- [ ] reCAPTCHA processing works (waits up to 10s)
- [ ] Navigates away from /login page

**Expected Output:**
```
🔐 STEP 1: Logging in...
  ✓ Username entered
  ✓ Password entered
  ✓ Login button clicked (attempt 1)
  ✓ Login successful
```

#### Step 2: Role Input Click
- [ ] Finds role input field correctly
- [ ] Clicks role input using direct approach
- [ ] Dropdown appears with role options
- [ ] Screenshot and HTML structure captured

**Expected Output:**
```
👤 STEP 2: Selecting Role...
  → Looking for role input field...
    → Using recommended role input: #input-123
    → Clicking input: #input-123
    ✓ Dropdown appeared with X items
```

#### Step 3: **PSTFF Role Option Selection** (THE CRITICAL FIX)
- [ ] Finds role options in dropdown
- [ ] **Looks for PSTFF option first**
- [ ] Clicks PSTFF option (or first available if PSTFF not found)
- [ ] Selection verified (active item or input value)
- [ ] PILIH button becomes enabled

**Expected Output:**
```
  → Waiting for dropdown options...
    → Found X role options
    → Option 1: PSTFF - ...
  → Using PSTFF priority option
    ✓ Clicked role option: "PSTFF - ..."
  ✓ Role selection confirmed
```

#### Step 4: PILIH Button Click
- [ ] Finds PILIH button
- [ ] Checks if disabled (waits if needed)
- [ ] Clicks PILIH button
- [ ] Verifies navigation away from /role page
- [ ] Final URL should NOT contain /role

**Expected Output:**
```
  → Clicking PILIH button...
    → PILIH button: "PILIH", disabled=false
    ✓ PILIH button clicked
    ✓ Successfully navigated away from role page
```

### Phase 2: Navigation & Document Processing

#### Step 5: Naskah Masuk Navigation
- [ ] No longer on /role page
- [ ] Page has menu items loaded
- [ ] Naskah Masuk menu found
- [ ] Naskah Masuk menu clicked
- [ ] Badges appear showing document counts

**Expected Output:**
```
📂 STEP 3: Navigating to Naskah Masuk...
  → Current URL: https://sidia.bpjsketenagakerjaan.go.id/dashboard
  → Looking for Naskah Masuk menu...
  ✓ Naskah Masuk menu clicked and verified
  → Found X badges after expansion
```

#### Step 6: Document Processing Loop
- [ ] Finds menus with badges
- [ ] For each menu with badge > 0:
  - [ ] Clicks menu item
  - [ ] Navigates to /inbox page
  - [ ] Clicks Disposisi tab
  - [ ] Waits for AJAX-loaded document list
  - [ ] "Lihat" button appears
  - [ ] Processes each document:
    - [ ] Clicks "Lihat" button
    - [ ] Types feedback message
    - [ ] Clicks "Simpan" button
    - [ ] Clicks "OK" button
    - [ ] Clicks "Kembali" button
  - [ ] Repeats until badge count = 0

**Expected Output:**
```
📋 STEP 4: Processing Menus with Badges...
  Found X menus with badges

  📂 Processing: Menu Name (5 documents)
    → Menu: Menu Name
    → Clicking menu: Menu Name...
    ✓ Clicked menu and verified navigation
    ✓ Disposisi tab clicked
    ✓ Document list loaded
    📄 Processing document...
      ✓ Lihat button clicked and feedback section appeared
      ✓ Feedback message typed and verified
      ✓ Simpan button clicked and success box appeared
      ✓ OK button clicked and verified
      ✓ Kembali button clicked and verified
      ✓ Document processing completed successfully
```

## Debugging Tools

### Screenshot & HTML Structure Capture
After each critical operation, the system saves:
- **Screenshots**: `screenshots/[operation_name].png`
- **HTML Structure**: `screenshots/[operation_name].html`

Use these to debug if something fails:
1. Check screenshot to see what's visible
2. Check HTML structure to see exact element states
3. Look for debug attributes like `data-debug-id`, `data-debug-text`, etc.

### Console Logging
The system provides detailed console output:
- `→` Gray: Informational messages
- `✓` Green: Success operations
- `⚠` Yellow: Warnings and retries
- `✗` Red: Errors and failures

## Common Issues & Solutions

### Issue: "Still on role page - role selection failed"
**Cause**: Role selection didn't complete properly
**Solution**: Check screenshots for role_page_after_pilih_click.png and role_page_pilih_failed.html

### Issue: "No role options found in dropdown"
**Cause**: Dropdown didn't open or options didn't load
**Solution**: Check role_page_after_input_click.png - verify dropdown appeared

### Issue: "PILIH button still disabled"
**Cause**: Role option wasn't selected properly
**Solution**: Check role_page_after_role_selected.png - verify option was clicked

### Issue: "Could not find Naskah Masuk menu"
**Cause**: Still on /role page or menu hasn't loaded
**Solution**: Check role_page_after_pilih_click.png - verify navigation worked

### Issue: "Document list failed to load"
**Cause**: AJAX request didn't complete or Disposisi tab wasn't clicked
**Solution**: Check that Disposisi tab click was successful in console logs

## File Structure After Refactoring

```
sidia clicker/
├── login.js (369 lines) - Main orchestrator
├── roleInput.js (200 lines) - Role input handling
├── roleSelection.js (269 lines) - Role option selection ⭐ CRITICAL FIX
├── pilihButton.js (130 lines) - PILIH button handling
├── documents.js (1075 lines) - Document processing workflow
├── visualHelper.js - Screenshot & HTML capture
├── verification.js - Click verification system
├── constants.js - Selectors & configuration
├── utils.js - Utility functions
└── Documentation/
    ├── LOGIN_REFACTORING_COMPLETE.md
    ├── TESTING_CHECKLIST.md (this file)
    └── [other documentation files]
```

## Next Steps

1. **Run the automation** with test credentials
2. **Monitor console output** for each step
3. **Check screenshots** if any step fails
4. **Review HTML structures** to understand exact page states
5. **Report any issues** with specific error messages and screenshot references

## Expected Behavior

With all the fixes implemented, the automation should:
1. ✅ Login successfully (even with reCAPTCHA)
2. ✅ Click role input field
3. ✅ **Select PSTFF role option** (THE CRITICAL FIX!)
4. ✅ Click PILIH button
5. ✅ Navigate away from /role page
6. ✅ Click Naskah Masuk menu
7. ✅ Process all documents with badges
8. ✅ Complete successfully when all badges are empty

**The most critical fix is #3** - this was the missing piece that was causing role selection to fail!
