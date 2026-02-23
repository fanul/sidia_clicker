# SIDIA Automation - Development Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [How It Works](#how-it-works)
6. [Configuration](#configuration)
7. [Customization](#customization)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Maintenance](#maintenance)

---

## 🎯 Overview

This project automates the processing of incoming documents in the SIDIA (BPJS Ketenagakerjaan) system. It automatically:
- Logs into the system
- Navigates to document queues
- Processes each document by adding feedback
- Handles multiple document types (Memo, Surat, etc.)

**Main Script:** `23_sidia_ultimate_processor.tag`

---

## 📦 Prerequisites

### Required Software
- **TagUI** - Automation framework (https://github.com/kelaberetiv/TagUI)
- **PhantomJS** - Headless browser (included with TagUI)

### Image Files Required
Create these images in the `image/` folder:
```
image/
├── naskah_masuk.png       # Screenshot of "Naskah Masuk" menu
├── login_button.png       # (Optional) Screenshot of login button
└── [other elements].png   # Additional UI elements as needed
```

### Credentials
Update these in the script (lines 25-36):
```javascript
type //*[@id="input-15"] as YOUR_USERNAME
type //*[@id="password"] as YOUR_PASSWORD
```

---

## 📁 Project Structure

```
c:\tagui\flows\samples\
├── 23_sidia_ultimate_processor.tag    # Main automation script
├── image/                              # Image recognition assets
│   └── naskah_masuk.png
├── DEVELOPMENT_GUIDE.md               # This file
├── working_selectors.txt              # (Generated) Log of working selectors
└── [other versions].tag               # Backup/alternative versions
```

---

## 🚀 Getting Started

### Step 1: Prepare Images
1. Take a screenshot of the SIDIA interface
2. Crop the "Naskah Masuk" menu item
3. Save as `image/naskah_masuk.png`
4. Ensure the image is clear and shows only the target element

### Step 2: Update Credentials
Open `23_sidia_ultimate_processor.tag` and update:
- Line 25: Username
- Line 36: Password (use `@` prefix for security)

### Step 3: Run the Script
```bash
# From TagUI flows directory
tagui 23_sidia_ultimate_processor.tag

# Or with headless mode
tagui 23_sidia_ultimate_processor.tag headless
```

---

## ⚙️ How It Works

### Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: LOGIN                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Navigate to SIDIA website                          │  │
│  │ 2. Enter username & password                          │  │
│  │ 3. Click login button (tries multiple patterns)       │  │
│  │ 4. Wait for page load                                 │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: NAVIGATE TO NASKAH MASUK                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Look for 'image/naskah_masuk.png'                  │  │
│  │ 2. Click it (retries up to 10 times with 3s delay)    │  │
│  │ 3. Wait for submenu to appear                         │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: GET DOCUMENT COUNTS                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Reads badge counts from each category:               │  │
│  │ • Memo Eksternal (NKH0002)                           │  │
│  │ • Memo Internal (NKH0001)                            │  │
│  │ • Surat Biasa (NKH0016)                              │  │
│  │ • Surat Rahasia (NKH0017)                            │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: PROCESS EACH DOCUMENT TYPE                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ For EACH category with documents:                    │  │
│  │                                                        │  │
│  │ 1. Click the category menu                           │  │
│  │ 2. Click "Disposisi" tab                             │  │
│  │ 3. For EACH document in category:                    │  │
│  │    • Click first action button                       │  │
│  │    • Click Feedback button                           │  │
│  │    • Type: "dipedomani dan dilaksanakan"             │  │
│  │    • Click Save (Simpan)                             │  │
│  │    • Click OK to confirm                             │  │
│  │    • Click Back (Kembali)                            │  │
│  │    • Increment counter                               │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  STEP 5: FINAL SUMMARY                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ • Display total documents processed                  │  │
│  │ • Show completion timestamp                          │  │
│  │ • Exit cleanly                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Retry Logic Pattern
Every critical action uses this pattern:
```javascript
action_completed = false
attempts = 0

while !action_completed && attempts < 10
{
    attempts = attempts + 1

    if present('//selector')
    {
        click //selector
        action_completed = true
    }

    if action_completed
        break

    wait 3
}
```

#### 2. Multi-Pattern Selectors
The script tries multiple selector patterns:
```javascript
// Try exact match first
if present('//div[@class="v-list-item__title" and text()="Naskah Masuk")
{
    click //div[@class="v-list-item__title" and text()="Naskah Masuk"]
}
// Fallback to partial match
else if present('//div[contains(@class, "v-list-item__title")]')
{
    click //div[contains(@class, "v-list-item__title")]
}
// Last resort: generic pattern
else if present('//span[contains(text(), "Naskah")]')
{
    click //span[contains(text(), "Naskah")]
}
```

#### 3. Document Type Processing
Each document type is processed systematically:
```javascript
while current_type < document_types
{
    // Set up document type (name, selector, count)
    // Click menu
    // Click Disposisi tab
    // Process all documents in this type
    // Move to next type
}
```

---

## 🔧 Configuration

### Adjusting Timeout Values

Default timeout (line 6):
```javascript
timeout 15
```

Increase if your connection is slow:
```javascript
timeout 30
```

### Changing Feedback Text

Default feedback (line 386):
```javascript
type //textarea as dipedomani dan dilaksanakan
```

Customize the message:
```javascript
type //textarea as Your custom feedback text here
```

### Modifying Retry Attempts

Default retry for Naskah Masuk (line 90):
```javascript
while !naskah_clicked && naskah_attempts < 10
```

Change to more attempts:
```javascript
while !naskah_clicked && naskah_attempts < 20
```

### Adjusting Wait Times

Default wait between retries (line 104):
```javascript
wait 3
```

Increase for slower systems:
```javascript
wait 5
```

---

## 🎨 Customization

### Adding New Document Types

1. **Add the document type to the configuration:**

```javascript
// In SECTION 4, add new else if block:
else if current_type == 5
{
    type_name = "Your New Type"
    type_selector = "//a[@href='/inbox?f=NEW_CODE']"
    type_count = your_new_type_count
}
```

2. **Add count reading in SECTION 3:**

```javascript
// Check Your New Type
your_new_type_count = 0
if present('//a[@href="/inbox?f=NEW_CODE"]//span[@class="v-badge__badge success"]')
{
    read //a[@href="/inbox?f=NEW_CODE"]//span[@class="v-badge__badge success"] to your_new_type_count
    echo "  • Your New Type: " + your_new_type_count
}
```

3. **Update document_types counter:**

```javascript
document_types = 5  // Was 4, now 5
```

### Modifying Button Selectors

If the UI changes, update selectors in these sections:

**Login button (line 44-64):**
```javascript
if present('//span[@class="v-btn__content" and contains(text(), "LOGIN")]')
{
    click //span[@class="v-btn__content" and contains(text(), "LOGIN")]
}
```

**Disposisi tab (line 202-216):**
```javascript
if present('//div[@role="tab" and contains(text(), "Disposisi")]')
{
    click //div[@role="tab" and contains(text(), "Disposisi")]
}
```

---

## 🔍 Troubleshooting

### Common Issues & Solutions

#### Issue 1: "Naskah Masuk not found"
**Symptoms:** Script can't find the menu item

**Solutions:**
1. Verify `image/naskah_masuk.png` exists
2. Ensure image is clear and properly cropped
3. Increase wait time between attempts
4. Increase max attempts from 10 to 20

#### Issue 2: "Action button not found"
**Symptoms:** Script can't find buttons in the document list

**Solutions:**
1. Check if documents actually exist in the queue
2. Verify Disposisi tab was clicked
3. Add more wait time after clicking Disposisi
4. Update selectors to match new UI

#### Issue 3: "Save button not found"
**Symptoms:** Can't save feedback

**Solutions:**
1. Increase wait time after typing feedback
2. Add alternative save button selectors
3. Check if form validation is blocking save

#### Issue 4: Script stops randomly
**Symptoms:** Automation stops without error

**Solutions:**
1. Check for popup windows/modals
2. Verify all required images exist
3. Add more error handling with echo statements
4. Run in visible mode to see what's happening

#### Issue 5: Login fails
**Symptoms:** Can't log into the system

**Solutions:**
1. Verify credentials are correct
2. Check if login page has changed
3. Update login button selector
4. Ensure username/password fields are found

### Debug Mode

Run in visible mode to see what's happening:
```bash
tagui 23_sidia_ultimate_processor.tag
```

Add debug echoes:
```javascript
echo "[DEBUG] Current value: " + variable_name
```

---

## 📚 Best Practices

### 1. Always Use Retry Logic
Never assume an element will be available immediately:
```javascript
// GOOD
attempts = 0
while !found && attempts < 10
{
    // Try to find element
    attempts = attempts + 1
    wait 3
}

// BAD
if present('//element')
{
    click //element
}
```

### 2. Provide Clear Feedback
Always tell the user what's happening:
```javascript
echo "  → Looking for button..."
echo "  ✓ Button clicked"
echo "  ✗ Button not found"
```

### 3. Use Multiple Selector Patterns
Always have fallbacks:
```javascript
// Try specific first
if present('//specific[@selector]')
{
    click //specific[@selector]
}
// Then generic
else if present('//generic')
{
    click //generic
}
```

### 4. Handle Empty Queues
Check if documents exist before processing:
```javascript
if type_count == 0
{
    echo "  ⚠ No documents, skipping..."
    continue
}
```

### 5. Test Incrementally
- Test login first
- Then navigation
- Then single document processing
- Finally, full automation

### 6. Keep Images Updated
When UI changes:
1. Take new screenshots
2. Test each image separately
3. Update image files in `image/` folder

---

## 🔄 Maintenance

### Regular Tasks

**Weekly:**
- Check for UI changes
- Verify all images still match
- Review error logs
- Update selectors if needed

**Monthly:**
- Test complete workflow
- Update documentation
- Clean up log files
- Review performance

**After UI Updates:**
1. Identify changed elements
2. Take new screenshots
3. Update selectors
4. Test thoroughly
5. Document changes

### Version Control

Keep track of changes:
```
23_sidia_ultimate_processor_v1.tag    # Original
23_sidia_ultimate_processor_v2.tag    # With new selectors
23_sidia_ultimate_processor.tag        # Current working version
```

### Log Files

Monitor these files:
- `working_selectors.txt` - Log of successful selectors
- `*.log` files - Execution logs
- `*.png` files - Screenshots (if enabled)

---

## 📞 Getting Help

### Resources
- **TagUI Documentation:** https://github.com/kelaberetiv/TagUI
- **XPath Guide:** https://www.w3schools.com/xml/xpath_intro.asp
- **CSS Selectors:** https://www.w3schools.com/cssref/css_selectors.asp

### When Stuck
1. Check the troubleshooting section
2. Run in visible mode to observe
3. Add debug echo statements
4. Test selectors in browser console
5. Take fresh screenshots if using images

---

## 📝 Changelog

### Version 1.0 (Current)
- Initial implementation
- Support for 4 document types
- Image-based navigation
- Comprehensive retry logic
- Clear progress feedback

### Future Enhancements
- [ ] Email notifications on completion
- [ ] Database logging
- [ ] Parallel processing
- [ ] Web dashboard
- [ ] Error recovery system

---

## ✅ Checklist Before Running

- [ ] TagUI installed and accessible
- [ ] All image files prepared and tested
- [ ] Credentials updated in script
- [ ] Test with small batch first
- [ ] Log directory exists
- [ ] Backup important data
- [ ] Monitor first full run

---

## 🎓 Learning Resources

### TagUI Basics
```javascript
// Navigate to URL
https://example.com

// Click element
click //button[@id='submit']

// Type text
type //input[@id='username'] as myuser

// Wait
wait 5

// Read text
read //span[@id='count'] to count_value

// Check if present
if present('//button')
{
    echo "Button found"
}
```

### Loop Patterns
```javascript
// For loop
for i from 1 to 10
{
    echo "Iteration: " + i
}

// While loop
while condition
{
    // Do something
}
```

### Variables
```javascript
// Declare
my_var = 0
my_text = "Hello"

// Use
echo my_var
echo my_text + " World"
```

---

**Last Updated:** 2025-01-XX
**Version:** 1.0
**Maintainer:** [Your Name]
