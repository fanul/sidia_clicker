# SIDIA Automation - Quick Start Guide

## Prerequisites

1. **Node.js** (v14 or higher)
2. **npm** or **yarn**
3. **Chrome** or **Chromium** browser
4. **SIDIA credentials** (username and password)

## Installation

### 1. Install Dependencies

```bash
cd "c:\FANUL\PROJECT\sidia clicker"
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# SIDIA Credentials
SIDIA_USERNAME=your_actual_username
SIDIA_PASSWORD=your_actual_password

# Optional Configuration
SIDIA_BASE_URL=https://sidia.bpjsketenagakerjaan.go.id
TIMEOUT=30000
RETRY_ATTEMPTS=10
RETRY_DELAY=3000
HEADLESS=false
FEEDBACK_MESSAGE=dipedomani dan dilaksanakan
DOCUMENT_TYPES=NKH0002,NKH0001,NKH0016,NKH0017
CLEAR_SESSION_BEFORE_ROLE=true
```

**Important:** Replace `your_actual_username` and `your_actual_password` with your real credentials.

## Running the Automation

### Option 1: Run with Browser Visible (Recommended for Testing)

```bash
node index.js
```

This will run the automation with the browser visible, allowing you to see what's happening.

### Option 2: Run in Headless Mode

```bash
HEADLESS=true node index.js
```

This will run the automation without showing the browser window.

## Expected Output

When the automation runs successfully, you should see output like this:

```
🚀 SIDIA Automation - Starting...

📱 Launching browser...
🔐 STEP 1: Logging in...
  ✓ Username entered
  ✓ Password entered
  ✓ Login button clicked (attempt 1)
  ✓ Login successful

👤 STEP 2: Selecting Role...
  → Looking for role input field...
  ✓ Role input clicked
  ✓ PSTFF role selected
  ✓ PILIH button clicked
  ✓ Successfully navigated away from role page

📂 STEP 3: Navigating to Naskah Masuk...
  ✓ Naskah Masuk menu clicked
  → Found X badges after expansion

📋 STEP 4: Processing Menus with Badges...
  Found X menus with badges
  [Document processing loop...]

✅ Automation completed!
```

## Troubleshooting

### Issue: "Please set SIDIA_USERNAME in .env file"

**Solution:** Make sure you've created a `.env` file with your credentials.

### Issue: "PILIH button still disabled"

**Solution:** The role option selection might have failed. Check:
1. Screenshots in `screenshots/` folder
2. Console logs for role selection details
3. Try running again with browser visible (`HEADLESS=false`)

### Issue: "Could not find Naskah Masuk menu"

**Solution:** This usually means role selection failed and you're still on the `/role` page. Check:
1. `role_page_after_pilih_click.png` screenshot
2. Verify PSTFF option was selected
3. Verify PILIH button was clicked

### Issue: "Document list failed to load"

**Solution:** The submenu or Disposisi tab clicking might have failed. Check:
1. Submenu was clicked before Disposisi tab
2. Disposisi tab click verification in logs
3. AJAX requests completed (check browser console)

### Issue: "Feedback button not found"

**Solution:** The Lihat button click might not have navigated properly. Check:
1. Current URL in logs
2. `lihat_button_clicked.png` screenshot
3. Verify page navigation completed

### Issue: "Simpan button not available"

**Solution:** The textarea might not have been filled. Check:
1. Textarea fill verification in logs
2. "Dipedomani dan dilaksanakan" text was entered
3. Vue.js events were triggered

## Debug Mode

To enable comprehensive debugging:

1. **Keep browser visible:** Set `HEADLESS=false` in `.env`
2. **Check screenshots:** All screenshots are saved in `screenshots/` folder
3. **Review HTML structures:** HTML captures are saved as `.html` files
4. **Console logs:** Detailed logs show every step

### Useful Screenshots

| Screenshot Name | When It's Captured | What It Shows |
|----------------|-------------------|---------------|
| `login_before.png` | Before login | Login page state |
| `login_after.png` | After login | Dashboard after login |
| `role_page_initial.png` | Role page load | Role selection page |
| `role_page_after_input_click.png` | After role input click | Dropdown with options |
| `role_page_after_role_selected.png` | After option click | Selection state |
| `role_page_after_pilih_click.png` | After PILIH click | Navigation result |
| `naskah_masuk_menu_expanded.png` | After menu click | Menu with badges |
| `submenu_clicked.png` | After submenu click | Submenu page |
| `disposisi_tab_clicked.png` | After Disposisi tab | Document table |
| `lihat_button_clicked.png` | After Lihat click | Document detail page |
| `feedback_filled.png` | After textarea fill | Feedback section |

## File Structure

```
sidia clicker/
├── index.js                    # Main entry point
├── .env                        # Configuration (YOU NEED TO CREATE THIS)
├── package.json                # Dependencies
├── login.js                    # Login & role selection
├── roleInput.js                # Role input handling
├── roleSelection.js            # Role option selection
├── pilihButton.js              # PILIH button handling
├── documents.js                # Document navigation
├── submenuNavigation.js        # Submenu navigation
├── disposisiTab.js             # Disposisi tab handling
├── documentProcessor.js        # Document processing workflow
├── browser.js                  # Browser management
├── verification.js             # Click verification
├── visualHelper.js             # Screenshots & HTML capture
├── constants.js                # Selectors & configuration
├── utils.js                    # Utility functions
├── stats.js                    # Statistics tracking
├── screenshots/                # Debug screenshots (auto-created)
└── Documentation/              # Additional documentation
    ├── SYSTEM_ARCHITECTURE.md  # Complete system documentation
    ├── LOGIN_REFACTORING_COMPLETE.md
    ├── TESTING_CHECKLIST.md
    └── QUICK_START.md          # This file
```

## Common Workflows

### Testing Login Only

If you want to test just the login and role selection:

```javascript
// In index.js, comment out document processing:
// await navigateToNaskahMasuk(page, CONFIG);
// const processingStats = await processMenusWithBadges(page, CONFIG);
```

### Processing Specific Document Types

Edit the `.env` file:

```bash
DOCUMENT_TYPES=NKH0002  # Only process NKH0002
```

### Adjusting Wait Times

If the automation is too slow or too fast:

```bash
TIMEOUT=60000           # Increase timeout to 60s
RETRY_DELAY=5000        # Wait 5s between retries
```

## Performance Tips

1. **Use headless mode for production:** `HEADLESS=true`
2. **Adjust timeouts based on your internet speed:** Slower connection = higher timeouts
3. **Monitor resource usage:** Close unnecessary applications
4. **Check screenshots:** If something fails, screenshots show exactly what happened

## Support

If you encounter issues:

1. Check the console output for error messages
2. Review the screenshots in the `screenshots/` folder
3. Check the HTML structure captures
4. Review [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for technical details
5. Check [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for detailed testing steps

## Security Notes

1. **Never commit `.env` file** to version control (it's in `.gitignore`)
2. **Use strong passwords** and change them regularly
3. **Don't share credentials** in screenshots or logs
4. **Use separate accounts** for testing and production

## Next Steps

After successful run:

1. **Review results:** Check console output for processing statistics
2. **Verify documents:** Log into SIDIA manually to verify documents were processed
3. **Adjust configuration:** Fine-tune timeouts and retry attempts based on performance
4. **Schedule automation:** Set up cron job or task scheduler for regular runs

## Summary

The SIDIA Automation system is now ready to use. Simply:

1. ✅ Install dependencies: `npm install`
2. ✅ Configure `.env` file with your credentials
3. ✅ Run the automation: `node index.js`
4. ✅ Monitor console output for progress
5. ✅ Check screenshots if anything fails

**The system will automatically:**
- Login to SIDIA
- Select PSTFF role
- Navigate to Naskah Masuk
- Process all documents with badges
- Fill in feedback: "Dipedomani dan dilaksanakan"
- Complete all 8 steps for each document

Good luck with your automation! 🚀
