# HTML Structure Debug Guide - Complete Page Analysis

## Problem

Role selection was still failing, and we only had screenshots - couldn't see the actual HTML structure to debug properly.

## Solution - Complete HTML Structure Capture

Now captures **both screenshots AND HTML structure** with detailed debugging information at every critical step.

## What Gets Captured

### **Dual Capture System** 📸📄

Every critical step now captures:

1. **Screenshot (.png)** - Visual representation
2. **HTML Structure (.html)** - Complete DOM with debug attributes

### **Enhanced HTML Debug Information** 🔍

Every interactive element gets detailed debug attributes:

#### **For All Elements:**
- `data-debug-visible` - Is the element visible?
- `data-debug-tag` - Element tag name (button, input, etc.)
- `data-debug-id` - Element ID
- `data-debug-class` - Element class names
- `data-debug-text` - Element text content
- `data-debug-rect` - Element position and size

#### **For Input Elements:**
- `data-debug-type` - Input type (text, password, etc.)
- `data-debug-autocomplete` - Autocomplete attribute
- `data-debug-placeholder` - Placeholder text
- `data-debug-value` - Current value
- `data-debug-disabled` - Disabled state
- `data-debug-label` - Associated label text

#### **For Button Elements:**
- `data-debug-disabled` - Disabled state
- `data-debug-type` - Button type

#### **For ARIA Elements:**
- `data-debug-aria-selected` - aria-selected attribute
- `data-debug-aria-expanded` - aria-expanded attribute
- `data-debug-aria-activedescendant` - aria-activedescendant attribute

### **Page Summary Header** 📊

Each HTML file includes a summary at the top:

```html
<!-- PAGE DEBUG INFO -->
<!-- URL: https://sidia.bpjsketenagakerjaan.go.id/role -->
<!-- Title: PILIH ROLE -->
<!-- Timestamp: 2025-02-18T15:30:00.000Z -->
<!-- Visible Inputs: 3 -->
<!-- Visible Buttons: 5 -->
<!-- Visible Links: 2 -->
<!-- Visible List Items: 8 -->
<!-- Visible Tabs: 0 -->
<!-- END PAGE DEBUG INFO -->
```

## Capture Points

### **Role Selection Process** 👤

1. **Initial Role Page** - `structure_role_page_initial`
   - Before any interaction
   - Shows initial state of role page

2. **After Input Found** - `structure_role_page_input_found`
   - After analyzing and finding role input
   - Shows what inputs were detected

3. **After Input Click** - `structure_role_page_after_input_click`
   - After clicking the role input field
   - Shows if dropdown appeared

4. **After Role Selected** - `structure_role_page_after_role_selected`
   - After selecting a role option
   - Shows role selection state

5. **After PILIH Click** - `structure_role_page_after_pilih_click`
   - After clicking PILIH button
   - Shows final state before navigation

## How to Use

### **1. Run the Automation**

```bash
node index.js
```

### **2. Check the screenshots folder**

You'll find paired files:
```
screenshots/
├── screenshot_role_page_initial_2025-02-18T15-30-00.png
├── structure_role_page_initial_2025-02-18T15-30-00.html
├── screenshot_role_page_input_found_2025-02-18T15-30-05.png
├── structure_role_page_input_found_2025-02-18T15-30-05.html
├── screenshot_role_page_after_input_click_2025-02-18T15-30-10.png
├── structure_role_page_after_input_click_2025-02-18T15-30-10.html
├── screenshot_role_page_after_role_selected_2025-02-18T15-30-15.png
├── structure_role_page_after_role_selected_2025-02-18T15-30-15.html
├── screenshot_role_page_after_pilih_click_2025-02-18T15-30-20.png
└── structure_role_page_after_pilih_click_2025-02-18T15-30-20.html
```

### **3. Open the HTML files in browser**

Open the HTML files in Chrome/Firefox to see:
- Complete page structure
- All elements with debug attributes
- Exact attributes and values
- Visibility information

### **4. Search for specific elements**

Use browser DevTools or Ctrl+F to search:

#### **Find role input:**
```html
<input data-debug-autocomplete="off" data-debug-visible="true">
```

#### **Find PILIH button:**
```html
<button data-debug-text="PILIH" data-debug-visible="true">
```

#### **Find disabled elements:**
```html
[data-debug-disabled="true"]
```

#### **Find invisible elements:**
```html
[data-debug-visible="false"]
```

## Example HTML Structure

### **What You'll See:**

```html
<!-- PAGE DEBUG INFO -->
<!-- URL: https://sidia.bpjsketenagakerjaan.go.id/role -->
<!-- Visible Inputs: 3 -->
<!-- Visible Buttons: 5 -->
<!-- END PAGE DEBUG INFO -->

<div class="v-select__slot">
  <label for="input-421"
         data-debug-visible="true"
         data-debug-tag="label"
         data-debug-text="Pilih Role Akses">
    Pilih Role Akses
  </label>

  <input id="input-421"
         type="text"
         autocomplete="off"
         data-debug-visible="true"
         data-debug-tag="input"
         data-debug-id="input-421"
         data-debug-type="text"
         data-debug-autocomplete="off"
         data-debug-label="Pilih Role Akses"
         data-debug-value="">

  <div class="v-input__append-inner">
    <i class="mdi mdi-menu-down"
       data-debug-visible="true"
       data-debug-tag="i"
       data-debug-class="mdi mdi-menu-down">
    </i>
  </div>
</div>

<button class="btn-half v-btn v-btn--disabled"
        data-debug-visible="true"
        data-debug-tag="button"
        data-debug-text="PILIH"
        data-debug-disabled="true"
        data-debug-class="btn-half v-btn v-btn--disabled">
  <span class="v-btn__content">PILIH</span>
</button>
```

## Debugging Checklist

Use the HTML files to check:

### **✅ Correct Page?**
- Check URL in page info header
- Verify we're on `/role` page
- Look for "PILIH ROLE" title

### **✅ Input Found?**
- Search for `data-debug-autocomplete="off"`
- Check `data-debug-visible="true"`
- Verify `data-debug-label` contains "Role"

### **✅ Dropdown Appeared?**
- Look for role list items
- Check `data-debug-visible="true"` on list items
- Verify `data-debug-aria-expanded="true"`

### **✅ Role Selected?**
- Check `data-debug-aria-activedescendant` is set
- Look for `data-debug-value` on input
- Verify list item has active class

### **✅ PILIH Button Enabled?**
- Search for button with `data-debug-text="PILIH"`
- Check `data-debug-disabled="false"`
- Verify button is clickable

### **✅ Navigation Happened?**
- Compare URLs between steps
- Check if we're still on `/role` page
- Verify page changed after PILIH click

## Benefits

### **Complete Visibility** ✅
- See exact HTML structure at each step
- Debug attributes on every element
- Page summary with counts

### **Easy Debugging** ✅
- Search for specific attributes
- Compare before/after states
- Find invisible/hidden elements

### **Detailed Information** ✅
- Element visibility
- Position and size
- All attributes and values
- ARIA states

## Next Steps

Run the automation and open the HTML files to see exactly what's happening:
1. Check if we're on the right page
2. Verify the input detection is working
3. See if the dropdown appears
4. Confirm the role gets selected
5. Check if PILIH button works

This will tell us exactly why role selection is failing! 🔍
