# Enhanced Role Selection Debugging - Comprehensive Screenshot Capture

## Problem

The PILIH button click was reporting success, but the system was still stuck on the `/role` page. We couldn't see what was actually happening during the role selection process.

## Solution - Complete Visual Debugging

Added comprehensive screenshot capture at every critical step of role selection:

### **Screenshot Capture Points** 📸

1. **Initial Role Page** - `role_page_initial`
   - Captured immediately when entering role selection
   - Shows the initial state of the role page

2. **After Input Found** - `role_page_input_found`
   - Captured after finding the role input field
   - Shows what input fields were detected

3. **After Input Click** - `role_page_after_input_click`
   - Captured after clicking the role input field
   - Shows if dropdown appeared

4. **After Role Selected** - `role_page_after_role_selected`
   - Captured after selecting a role option
   - Shows if the role was selected properly

5. **After PILIH Click** - `role_page_after_pilih_click`
   - Captured after clicking PILIH button
   - Shows the final state before navigation

6. **No Input Found** - `role_page_no_input_found` (error case)
   - Captured if no suitable input field found
   - Shows what's actually on the page

## Enhanced Input Detection

### **Exact Structure Matching** 🎯

Now looks for the exact structure you provided:

```html
<div class="v-select__slot">
  <label for="input-421" class="v-label v-label--active theme--light error--text">
    Pilih Role Akses
  </label>
  <input id="input-421" type="text" autocomplete="off">
  <div class="v-input__append-inner">
    <div class="v-input__icon v-input__icon--append">
      <i class="v-icon notranslate mdi mdi-menu-down theme--light error--text"></i>
    </div>
  </div>
</div>
```

### **Detection Priority** 📊

1. **Recommended Match** - Exact structure match
   - Has label with "Role"
   - `autocomplete="off"`
   - Has dropdown icon (`mdi-menu-down`)
   - Inside `.v-select__slot`

2. **Role Input Match** - Has autocomplete + dropdown
   - `autocomplete="off"`
   - Has dropdown icon

3. **Fallback** - First visible text input
   - Any visible text input

### **Enhanced Logging** 📝

Shows detailed information about all inputs found:

```
→ Found 3 visible text inputs
→ Found 2 potential role inputs
→ Input 1: id="input-421", autocomplete="off" [label: "Pilih Role Akses"] [dropdown icon]
→ Input 2: id="input-422", autocomplete="off" [dropdown icon]
→ Input 3: id="input-423", autocomplete=""
→ Using recommended role input: #input-421
→ Label: "Pilih Role Akses"
```

## Debugging Workflow

### **Run the Automation**

When you run it now, you'll get screenshots in `screenshots/` folder:

```
screenshots/
├── screenshot_role_page_initial_2025-02-18T15-30-00.png
├── screenshot_role_page_input_found_2025-02-18T15-30-05.png
├── screenshot_role_page_after_input_click_2025-02-18T15-30-10.png
├── screenshot_role_page_after_role_selected_2025-02-18T15-30-15.png
└── screenshot_role_page_after_pilih_click_2025-02-18T15-30-20.png
```

### **What to Check**

1. **Initial Page** - Is this the right role page?
2. **Input Found** - Are we detecting the right input field?
3. **After Click** - Did the dropdown appear?
4. **Role Selected** - Is the role highlighted/selected?
5. **After PILIH** - Did the PILIH button click work? Are we still on the role page?

## Benefits

### **Visual Debugging** ✅
- See exactly what's happening at each step
- No more guessing about element states
- Can identify UI issues immediately

### **Enhanced Detection** ✅
- Finds the exact input structure you provided
- Uses multiple fallback strategies
- Shows all detected inputs for debugging

### **Clear Logging** ✅
- Shows every input found with details
- Labels, autocomplete, dropdown icons
- Recommendations for which input to use

## Expected Output

### **Success Case:**
```
👤 STEP 2: Selecting Role...
  → Current URL: https://sidia.bpjsketenagakerjaan.go.id/role
📸 Screenshot saved: screenshot_role_page_initial_2025-02-18T15-30-00.png
  → Looking for role input field...
    → Found 3 visible text inputs
    → Found 2 potential role inputs
    → Input 1: id="input-421", autocomplete="off" [label: "Pilih Role Akses"] [dropdown icon]
    → Using recommended role input: #input-421
📸 Screenshot saved: screenshot_role_page_input_found_2025-02-18T15-30-05.png
  ✓ Clicked input field and verified dropdown appeared
📸 Screenshot saved: screenshot_role_page_after_input_click_2025-02-18T15-30-10.png
  ✓ Clicked role option and verified selection
📸 Screenshot saved: screenshot_role_page_after_role_selected_2025-02-18T15-30-15.png
  ✓ PILIH button clicked and verified
📸 Screenshot saved: screenshot_role_page_after_pilih_click_2025-02-18T15-30-20.png
  ✓ Successfully navigated away from role page
  → Final URL: https://sidia.bpjsketenagakerjaan.go.id/dashboard
```

### **Failure Case:**
```
✗ Still on role page - role selection may have failed
  → Current URL: https://sidia.bpjsketenagakerjaan.go.id/role
```

**Then check the screenshots to see what went wrong!**

## Next Steps

Run the automation and check the screenshots folder to see exactly what's happening at each step. This will tell us:
- Whether we're finding the right input
- Whether the dropdown appears
- Whether the role gets selected
- Whether PILIH button actually works
- Why we're still on the role page
