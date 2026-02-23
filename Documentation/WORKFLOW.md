# SIDIA Automation - Node.js Implementation

Complete Node.js automation for SIDIA (BPJS Ketenagakerjaan) document processing system.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Run the automation:**
   ```bash
   npm start          # Visible mode (for testing)
   npm run headless   # Background mode
   ```

## 🔄 Complete Workflow

The automation follows this exact sequence:

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: LOGIN                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Navigate to SIDIA website                          │  │
│  │ 2. Enter username & password                          │  │
│  │ 3. Click LOGIN button                                 │  │
│  │ 4. Wait for page load                                 │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: ROLE SELECTION                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Wait for role selection dialog                     │  │
│  │ 2. Find and click "Pilih" button                     │  │
│  │ 3. Wait for role to be applied                       │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: NAVIGATE TO NASKAH MASUK                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Find "Naskah Masuk" menu item                     │  │
│  │ 2. Click it (retries up to 10 times)                 │  │
│  │ 3. Wait for submenu to appear                         │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: PROCESS MENUS WITH BADGES                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ For EACH menu with badge/indicator:                  │  │
│  │                                                        │  │
│  │ 1. Scan all menus for badges (font-weight-black)     │  │
│  │ 2. For each menu with badge > 0:                     │  │
│  │    • Navigate to menu URL                            │  │
│  │    • Click "Disposisi" tab                           │  │
│  │    • WHILE badge exists:                             │  │
│  │      - Click "Lihat" button                          │  │
│  │      - Wait for feedback section (~1 minute)         │  │
│  │      - Type feedback message                         │  │
│  │      - Click "Simpan" button                         │  │
│  │      - Wait for success box (OK button)              │  │
│  │      - Click "OK" to confirm                         │  │
│  │      - Click "Kembali" to return                     │  │
│  │      - Check if badge still exists                   │  │
│  │      - Repeat until no more badges                   │  │
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

## 📝 Detailed Workflow Steps

### 1. Login Phase
- Navigates to SIDIA base URL
- Locates username field (tries multiple selector patterns)
- Enters username from environment variable
- Locates password field
- Enters password from environment variable
- Finds and clicks LOGIN button
- Waits for page navigation

### 2. Role Selection Phase
- Waits 3 seconds for role dialog to appear
- Checks if role selection dialog exists
- Finds "Pilih" button in the dialog
- Clicks the role selection button
- Waits for role to be applied

### 3. Navigation Phase
- Scans page for "Naskah Masuk" text
- Clicks the menu item
- Retries up to 10 times with 3-second delays if not found
- Waits for submenu to appear

### 4. Badge Detection Phase
- Scans all menu items for badges or font-weight-black class
- Collects all menus with active indicators
- Records menu text, badge count, and URL
- Displays total menus found with badges

### 5. Document Processing Loop
For each menu with badges:

**A. Navigate to Menu:**
   - Go to menu URL
   - Wait for page load

**B. Click Disposisi Tab:**
   - Find tab containing "Disposisi" text
   - Click the tab
   - Wait for content to load

**C. Process Documents Loop (until no badges):**
   - Check if badge/font-weight-black still exists
   - If no badge, move to next menu

   1. **Click "Lihat" Button:**
      - Find button with "Lihat" text
      - Click it

   2. **Wait for Feedback Section:**
      - Wait up to 90 seconds for textarea/dialog to appear
      - This handles slow-loading forms

   3. **Type Feedback:**
      - Find textarea element
      - Click to focus
      - Clear existing content
      - Type feedback message
      - Trigger input/change events

   4. **Save:**
      - Find "Simpan" button
      - Click it

   5. **Wait for Success Box:**
      - Wait for success alert/dialog
      - Timeout: 30 seconds

   6. **Confirm:**
      - Find and click "OK" button
      - Wait 2 seconds

   7. **Return:**
      - Find and click "Kembali" button
      - Wait 2 seconds

   8. **Check Badge:**
      - Scan for font-weight-black or badge elements
      - If found, repeat loop
      - If not found, move to next menu

## ⚙️ Configuration

Edit `.env` file:

```env
# SIDIA System Credentials
SIDIA_USERNAME=your_username_here
SIDIA_PASSWORD=your_password_here

# SIDIA System URL
SIDIA_BASE_URL=https://sidia.bpjsketenagakerjaan.go.id

# Automation Settings
TIMEOUT=30000              # Element timeout in milliseconds
RETRY_ATTEMPTS=10          # Number of retry attempts
RETRY_DELAY=3000           # Delay between retries (ms)
HEADLESS=false             # Run in headless mode

# Feedback Message
FEEDBACK_MESSAGE=dipedomani dan dilaksanakan

# Document Types to Process
DOCUMENT_TYPES=NKH0002,NKH0001,NKH0016,NKH0017
```

## 🎯 Key Features

### Smart Badge Detection
- Detects documents using `.font-weight-black` class
- Falls back to `.v-badge__badge` elements
- Continues processing until no badges remain

### Long Wait Handling
- Waits up to 90 seconds for feedback sections
- Handles slow-loading forms gracefully
- Prevents timeout errors on busy systems

### Robust Element Finding
- Uses text content matching for buttons
- Falls back to multiple selector patterns
- Works with dynamic class names

### Progress Tracking
- Real-time console logging
- Color-coded output (success/error/info)
- Document count tracking
- Completion summary

## 🔧 Troubleshooting

### "Cannot find Lihat button"
- Check if documents actually exist in Disposisi tab
- Verify Disposisi tab was clicked successfully
- Increase wait time after clicking Disposisi

### "Feedback section not appearing"
- The system may be slow; increase the 90-second timeout
- Check if the document type requires feedback
- Verify you're in the correct tab

### "Badge still showing after processing"
- Some documents might be locked or read-only
- Check for error messages during processing
- Verify permissions for the document type

### "Role selection not found"
- Some accounts may not require role selection
- Script continues automatically if not found
- Safe to ignore the "skipping" message

## 📊 Output Example

```
🚀 SIDIA Automation - Starting...

🔐 STEP 1: Logging in...
  ✓ Login successful

👤 STEP 2: Selecting Role...
  ✓ Role selected successfully

📂 STEP 3: Navigating to Naskah Masuk...
  ✓ Naskah Masuk menu opened

📋 STEP 4: Processing Menus with Badges...
  Found 6 menus with badges

  📂 Processing: Memo Eksternal (5 documents)
    → Processing document 1/5...
      → Waiting for feedback section to appear...
      → Feedback section appeared
    ✓ Document 1 processed successfully
    → Processing document 2/5...
    ✓ Document 2 processed successfully
    ...
    → No more badges, moving to next menu
  ✓ Completed Memo Eksternal: 5 documents processed

  📂 Processing: Memo Internal (3 documents)
  ...

📈 STEP 5: Final Summary
════════════════════════════════════════════════════

  Total Documents Processed: 23

  Completed at: 1/15/2025, 2:30:45 PM

════════════════════════════════════════════════════

✅ Automation completed successfully!
```

## 🛡️ Safety Features

- **No Hardcoded Credentials**: All from environment variables
- **Retry Logic**: Automatic retry on failures
- **Graceful Degradation**: Continues if optional steps fail
- **Detailed Logging**: Every step logged for debugging
- **Error Handling**: Catches and reports errors without crashing

## 📁 File Structure

```
sidia-clicker/
├── index.js              # Main automation script
├── utils.js              # Utility functions
├── package.json          # Dependencies
├── .env.example          # Configuration template
├── .env                  # Your credentials (not in git)
└── WORKFLOW.md           # This file
```

## 🔄 Maintenance

### Regular Updates
- Test login after any SIDIA updates
- Verify button text hasn't changed
- Check for new UI patterns

### When Issues Occur
1. Run in visible mode to observe
2. Check console output for specific errors
3. Update selector patterns if UI changed
4. Adjust timeouts for slow connections

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review console output
3. Test in visible mode first
4. Check SIDIA system status

---

**Last Updated:** 2025-01-15
**Version:** 2.0.0
**Status:** Production Ready
