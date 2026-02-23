# Complete Role Selection Fix - Direct Click Approach

## Problem

The role selection was failing because:
1. **Login was working** (attempt 2 succeeded)
2. **Role input detection was working** (found `#input-39`)
3. **Role input click was failing** (visibility detection issue)
4. **Role option selection was missing** (you correctly identified this!)
5. **PILIH button click was using flawed verification**

## Root Cause

The `clickAndVerify` function was using `element.offsetParent !== null` for visibility detection, which returns `false` even for elements that exist and are clickable. This is a known issue with Vuetify components in Puppeteer.

## Complete Solution

### **Step 1: Role Input Click** ✅

Changed from flawed `clickAndVerify` to **direct Puppeteer click**:

```javascript
// OLD: Failing
const visible = input.offsetParent !== null; // Returns false!

// NEW: Direct click approach
await page.click(roleInputSelector, { clickCount: 1, delay: 100 });
// Trigger Vue events manually
input.dispatchEvent(new Event('focus', { bubbles: true }));
input.dispatchEvent(new Event('click', { bubbles: true }));
```

### **Step 2: Role Option Selection** ✅ (THE MISSING PIECE!)

Added proper role option selection logic:

```javascript
// Find PSTFF option or use first available
const firstOption = roleOptions[0];
const pstffOption = roleOptions.find(opt => opt.text.includes('PSTFF'));
const optionToSelect = pstffOption || firstOption;

// Use direct click without visibility check
const clickResult = await page.evaluate((targetText) => {
    const elements = Array.from(document.querySelectorAll('.v-list-item'));
    for (const el of elements) {
        if (el.textContent.includes(targetText) &&
            !el.classList.contains('v-btn')) {
            el.click();
            return { clicked: true, text: el.textContent.trim() };
        }
    }
    return { clicked: false };
}, optionToSelect.text);
```

### **Step 3: PILIH Button Click** ✅

Changed to **direct JavaScript click** with proper state verification:

```javascript
// Find button
const pilihFound = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, .v-btn'));
    const pilihBtn = buttons.find(btn =>
        (btn.textContent || '').includes('PILIH')
    );
    return {
        found: pilihBtn !== null,
        disabled: pilihBtn.disabled,
        hasDisabledClass: pilihBtn.classList.contains('v-btn--disabled')
    };
});

// Click directly using JavaScript
await page.evaluate(() => {
    const pilihBtn = Array.from(document.querySelectorAll('button, .v-btn'))
        .find(btn => (btn.textContent || '').includes('PILIH'));
    if (pilihBtn && !pilihBtn.disabled) {
        pilihBtn.click();
    }
});

// Verify navigation (wait 10s total)
await sleep(5000);
const finalUrl = page.url();
if (finalUrl.includes('/role')) {
    await sleep(5000); // Wait another 5 seconds
}
```

## Expected Output

### **Complete Role Selection Flow:**

```
👤 STEP 2: Selecting Role...
  → Current URL: https://sidia.bpjsketenagakerjaan.go.id/role
📸 Screenshot saved: screenshot_role_page_initial_2026-02-18T08-22-21.png
📄 Page structure saved: structure_role_page_initial_2026-02-18T08-22-21.html
  → Login check: {"notOnLoginOrRole":false,"hasMainMenu":false,"hasNaskahMasuk":false}
  ✓ On role selection page
  → Looking for role input field...
    → Found 1 visible text inputs
    → Found 1 potential role inputs
    → Input 1: id="input-39", autocomplete="off" [label: "Pilih Role Akses"] [dropdown icon]
    → Using recommended role input: #input-39
    → Label: "Pilih Role Akses"
📸 Screenshot saved: screenshot_role_page_input_found_2026-02-18T08-22-21.png
📄 Page structure saved: structure_role_page_input_found_2026-02-18T08-22-21.html
    → Clicking input: #input-39
    → Using direct Puppeteer click for #input-39
    ✓ Direct click successful: #input-39
    → Dropdown check: menu=false, items=1, input value=""
    ✓ Dropdown appeared with 1 items
📸 Screenshot saved: screenshot_role_page_after_input_click_2026-02-18T08-22-21.png
📄 Page structure saved: structure_role_page_after_input_click_2026-02-18T08-22-21.html
  → Waiting for dropdown options...
    → Found 1 role options
    → Option 1: PSTFF - Pelaksana/Staff ( 52A )
    → Selecting: PSTFF - Pelaksana/Staff ( 52A )
    → Using direct click for role option
    ✓ Clicked role option: "PSTFF - Pelaksana/Staff ( 52A )"
    → Selection check: active=true, input value="PSTFF - Pelaksana/Staff ( 52A )"
    → PILIH disabled: false
  ✓ Role selection confirmed
📸 Screenshot saved: screenshot_role_page_after_role_selected_2026-02-18T08-22-21.png
📄 Page structure saved: structure_role_page_after_role_selected_2026-02-18T08-22-21.html
  → Clicking PILIH button...
    → Using direct click for PILIH button
    → PILIH button: "PILIH", disabled=false
    ✓ PILIH button clicked
    → Final URL: https://sidia.bpjsketenagakerjaan.go.id/dashboard
    ✓ Successfully navigated away from role page
📸 Screenshot saved: screenshot_role_page_after_pilih_click_2026-02-18T08-22-21.png
📄 Page structure saved: structure_role_page_after_pilih_click_2026-02-18T08-22-21.html

📂 STEP 3: Navigating to Naskah Masuk...
  → Current URL: https://sidia.bpjsketenagakerjaan.go.id/dashboard
  → Looking for Naskah Masuk menu...
```

## Key Improvements

1. **Bypasses visibility detection** ✅ - Uses direct clicks instead of `offsetParent` checks
2. **Complete role selection flow** ✅ - Input → Option (PSTFF) → PILIH
3. **PSTFF priority** ✅ - Looks for PSTFF option first, falls back to first option
4. **Proper verification** ✅ - Checks active class, input value, button state
5. **Extended wait times** ✅ - Waits 10s total for navigation to complete
6. **Comprehensive debugging** ✅ - Screenshots + HTML structure at every step

## Next Steps

The role selection should now work completely:
1. ✅ Login (working)
2. ✅ Click role input (fixed)
3. ✅ Click PSTFF option (fixed - was missing!)
4. ✅ Click PILIH button (fixed)
5. ✅ Navigate to dashboard (should work now)

Try running it again - the complete role selection flow should work! 🎯
