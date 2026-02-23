# PILIH Button Fix - Enhanced Verification and Retry Logic

## Problem Identified
The role option was being clicked, but the PILIH button remained disabled because the selection wasn't being properly verified or the click wasn't registering correctly.

## Solution Implemented

### 1. **Enhanced Role Selection Clicking** ✅

```javascript
// Better targeting with multiple selector strategies
roleSelected = await page.evaluate((optionText) => {
    const selectors = [
        '.v-list-item',
        '.v-list-item__title',
        '[role="option"]',
        '.v-select-list .v-list-item'
    ];

    for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        for (const el of elements) {
            if (isVisible && notButton && text.includes(optionText)) {
                el.click();

                // Also click parent if it's a title
                if (el.classList.contains('v-list-item__title')) {
                    const parent = el.closest('.v-list-item');
                    if (parent) parent.click();
                }
                return true;
            }
        }
    }
}, firstOption.text);
```

### 2. **Selection Verification** ✅

```javascript
// Check if role was actually selected
const selectionCheck = await page.evaluate(() => {
    // Check for active class
    const activeItem = document.querySelector('.v-list-item--active, .v-item--active');

    // Check input field value
    const textInput = document.querySelector('input[type="text"]');

    // Check PILIH button state
    const pilihBtn = Array.from(document.querySelectorAll('button, .v-btn'))
        .find(btn => btn.textContent.includes('PILIH'));

    return {
        hasActiveItem: activeItem !== null,
        inputHasValue: textInput ? textInput.value.trim() : '',
        pilihButtonDisabled: pilihBtn ? (pilihBtn.disabled ||
            pilihBtn.classList.contains('v-btn--disabled')) : null,
        selectedText: activeItem ? activeItem.textContent.trim() :
            (textInput ? textInput.value : '')
    };
});
```

**New Logging:**
```
→ Verifying role selection and waiting for PILIH button...
  → Active item: true
  → Input value: "PSTFF - Pelaksana/Staff ( 52A )"
  → PILIH disabled: false
  → Selected: "PSTFF - Pelaksana/Staff ( 52A )"
✓ Role selection confirmed
```

### 3. **Automatic Retry if Button Disabled** ✅

```javascript
// If PILIH button is still disabled, try clicking the role option again
if (selectionCheck.pilihButtonDisabled === true) {
    console.log(chalk.yellow('  ⚠ PILIH button still disabled, trying to click role option again...'));

    // Click input field again to trigger selection
    await page.click(roleInputSelector);
    await sleep(1000);

    // Then click the first option again
    await page.evaluate(() => {
        const listItems = Array.from(document.querySelectorAll('.v-list-item'));
        const firstVisible = listItems.find(item =>
            item.offsetParent !== null &&
            !item.classList.contains('v-btn') &&
            item.textContent.trim().length > 5
        );
        if (firstVisible) {
            firstVisible.click();
        }
    });
}
```

### 4. **Enhanced PILIH Button Detection** ✅

```javascript
// Check button state before clicking
const buttonState = await page.evaluate(() => {
    const pilihBtn = buttons.find(btn =>
        (btn.textContent || '').includes('PILIH') ||
        (btn.textContent || '').includes('Pilih')
    );

    return {
        found: pilihBtn !== null,
        disabled: pilihBtn.disabled,
        hasDisabledClass: pilihBtn.classList.contains('v-btn--disabled'),
        visible: pilihBtn.offsetParent !== null,
        text: (pilihBtn.textContent || '').trim()
    };
});
```

**New Logging:**
```
→ Waiting for PILIH button to be enabled...
  → Attempt 1/10
  → Button state: disabled=false, hasDisabledClass=false, visible=true
  → PILIH button clicked
✓ PILIH button clicked successfully
```

## Complete Debugging Output

You'll now see detailed information at each step:

### Step 1: Role Selection
```
    → Selecting: PSTFF - Pelaksana/Staff ( 52A )
  ✓ Clicked first role option
```

### Step 2: Verification
```
  → Verifying role selection and waiting for PILIH button...
    → Active item: true
    → Input value: "PSTFF - Pelaksana/Staff ( 52A )"
    → PILIH disabled: false
    → Selected: "PSTFF - Pelaksana/Staff ( 52A )"
  ✓ Role selection confirmed
```

### Step 3: PILIH Button
```
  → Waiting for PILIH button to be enabled...
    → Attempt 1/10
    → Button state: disabled=false, hasDisabledClass=false, visible=true
    → PILIH button clicked
  ✓ PILIH button clicked successfully
```

### If Button Disabled (Auto-Retry)
```
  ⚠ PILIH button still disabled, trying to click role option again...
    → Clicking input: #input-122
    → Found role option in dropdown
  ✓ Reclicked role option
  → Attempt 1/10
    → Button state: disabled=false, hasDisabledClass=false, visible=true
    → PILIH button clicked
  ✓ PILIH button clicked successfully
```

## Key Improvements

### Before
```javascript
// Clicked role option
await page.evaluate((text) => {
    const target = elements.find(el => el.textContent.includes(text));
    if (target) target.click();
}, firstOption.text);

// Immediately tried PILIH (didn't wait or verify)
await clickPilihButton(page); // ❌ Button still disabled
```

### After
```javascript
// Click role option with better targeting
roleSelected = await page.evaluate((optionText) => {
    // Multiple selector strategies
    // Click both element and parent
    // Return success status
}, firstOption.text);

// Verify selection worked
const selectionCheck = await page.evaluate(() => {
    // Check active class, input value, button state
});

// Auto-retry if button still disabled
if (selectionCheck.pilihButtonDisabled) {
    // Reclick input and role option
}

// Click PILIH with state checking
const buttonState = await page.evaluate(() => {
    // Check found, disabled, visible states
});
```

## What Changed

1. **Better Click Strategy** - Multiple selectors, parent clicking
2. **Selection Verification** - Confirms role was actually selected
3. **Detailed Logging** - Shows button state at each attempt
4. **Auto-Retry** - Reclicks role option if PILIH stays disabled
5. **State Monitoring** - Tracks button enabled/disabled state

## Testing

Run the automation and look for:
```
✓ Role selection confirmed
Button state: disabled=false
✓ PILIH button clicked successfully
```

If you still see the button disabled, the logs will show exactly why and automatically retry the selection!

This should fix the PILIH button issue by ensuring the role selection is properly registered before attempting to click the button.