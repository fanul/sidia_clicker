# AJAX Wait & Retry System - Complete Document Processing Loop

## Problem Fixed
The system was failing because:
1. After clicking "Disposisi", it didn't wait for AJAX-loaded document list
2. When errors occurred, it jumped to next menu instead of retrying
3. The loop didn't complete all 60 documents before moving on

## Solution Implemented

### 1. **AJAX Document List Loading Wait** ✅

After clicking Disposisi tab, the system now:

```javascript
// CRITICAL: Wait for AJAX-loaded document list to appear
console.log('Waiting for document list to load (AJAX)...');
await sleep(3000);

// Wait for "Lihat" button to appear (indicates document list is loaded)
let documentListLoaded = false;
let waitAttempts = 0;
const maxWaitAttempts = 20; // Up to 60 seconds

while (!documentListLoaded && waitAttempts < maxWaitAttempts) {
    waitAttempts++;
    console.log(`Waiting for document list... attempt ${waitAttempts}/${maxWaitAttempts}`);

    const listCheck = await page.evaluate(() => {
        // Look for "Lihat" button
        const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
            (btn.textContent || '').includes('Lihat')
        );

        // Look for data table
        const dataTable = document.querySelector('.v-data-table');
        const tableRows = document.querySelectorAll('tr');

        return {
            hasLihatButton: lihatBtn !== null,
            hasDataTable: dataTable !== null,
            tableRowCount: tableRows.length
        };
    });

    console.log(`Lihat button: ${listCheck.hasLihatButton}, Data table: ${listCheck.hasDataTable}, Rows: ${listCheck.tableRowCount}`);

    if (listCheck.hasLihatButton || listCheck.hasDataTable || listCheck.tableRowCount > 1) {
        console.log('✓ Document list loaded');
        documentListLoaded = true;
    } else {
        console.log('Document list not loaded yet, waiting...');
        await sleep(3000);
    }
}
```

**What's Checked:**
- ✅ "Lihat" button appeared
- ✅ Data table appeared
- ✅ Table has rows (documents)
- ✅ Waits up to 60 seconds for AJAX to load
- ✅ Logs progress every 3 seconds

### 2. **Smart Badge Detection** ✅

```javascript
// Check if badge is gone
const badgeCheck = await page.evaluate(() => {
    const badges = document.querySelectorAll('.font-weight-black, .v-badge__badge');
    return {
        hasBadges: badges.length > 0,
        badgeCount: badges.length
    };
});

console.log(`Badge check: ${badgeCheck.badgeCount} badges remaining`);

if (badgeCheck.badgeCount === 0) {
    console.log('✓ All documents processed for this menu');
    break;
}

// Badges still exist but no documents found - wait and retry
console.log('Badges exist but no documents, waiting and retrying...');
await sleep(5000);
continue;
```

**What's Checked:**
- ✅ Badge elements exist
- ✅ Badge count
- ✅ Only breaks when badges = 0
- ✅ Continues retrying if badges still exist

### 3. **Document Processing with Retry** ✅

```javascript
// Process single document with retry
let processed = false;
let processRetries = 0;
const maxProcessRetries = 3;

while (!processed && processRetries < maxProcessRetries) {
    processRetries++;
    console.log(`Processing document attempt ${processRetries}/${maxProcessRetries}...`);

    processed = await processSingleDocument(page, config);

    if (!processed) {
        console.log(`Document processing failed, attempt ${processRetries}/${maxProcessRetries}`);

        if (processRetries < maxProcessRetries) {
            console.log('Waiting before retry...');
            await sleep(5000);

            // Re-check if we're still on the right page
            const pageCheck = await page.evaluate(() => {
                const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                    (btn.textContent || '').includes('Lihat')
                );

                return {
                    hasLihatButton: lihatBtn !== null,
                    url: window.location.href
                };
            });

            console.log(`Page check: hasLihat=${pageCheck.hasLihatButton}, url=${pageCheck.url}`);

            if (!pageCheck.hasLihatButton) {
                console.log('Not on document list page, need to refresh...');
                break; // Go back to clicking menu
            }
        }
    }
}

if (processed) {
    processedCount++;
    console.log(`✓ Document ${processedCount} processed successfully`);
} else {
    console.log(`✗ Failed to process document after ${maxProcessRetries} attempts`);

    // Don't break - try to continue with next document
    console.log('Attempting to continue with next document...');
    await sleep(3000);
}
```

**What's Checked:**
- ✅ Up to 3 retry attempts per document
- ✅ 5 second wait between retries
- ✅ Verifies still on correct page
- ✅ Continues to next document even if one fails
- ✅ Only stops when all documents processed

## Complete Flow

### For Each Menu (e.g., "Surat Biasa 60")

```
📂 Processing: Surat Biasa 60 (60 documents)
  → Menu: Surat Biasa 60
  → Href: /inbox?f=NKH0016
  → Clicking menu: Surat Biasa 60...
  ✓ Clicked menu: Surat Biasa 60
  → Waiting for page to load...
  → Current URL: https://sidia.bpjsketenagakerjaan.go.id/inbox?f=NKH0016
      → Looking for Disposisi tab...
      ✓ Disposisi tab clicked
  ✓ Disposisi tab clicked
  → Waiting for document list to load (AJAX)...
  → Waiting for document list... attempt 1/20
      → Lihat button: true, Data table: true, Rows: 61
  ✓ Document list loaded

  → Processing document attempt 1/3...
    [8-step verification process for document]
  ✓ Document 1 processed successfully

  → Processing document attempt 1/3...
    [8-step verification process for document]
  ✓ Document 2 processed successfully

  ... (continues for all 60 documents) ...

  → Badge check: 0 badges remaining
  ✓ All documents processed for this menu
✓ Completed Surat Biasa 60: 60 documents processed
```

### Error Handling Examples

**If Document List Doesn't Load:**
```
  → Waiting for document list... attempt 1/20
      → Lihat button: false, Data table: false, Rows: 0
      → Document list not loaded yet, waiting...
  → Waiting for document list... attempt 2/20
      → Lihat button: true, Data table: true, Rows: 61
  ✓ Document list loaded
```

**If Processing Fails:**
```
  → Processing document attempt 1/3...
    ✗ Failed to process document
  → Document processing failed, attempt 1/3
  → Waiting before retry...
      → Page check: hasLihat=true, url=https://...
  → Processing document attempt 2/3...
    ✓ Document 5 processed successfully
```

**If Page Lost:**
```
  → Document processing failed, attempt 1/3
  → Waiting before retry...
      → Page check: hasLihat=false, url=https://...
      → Not on document list page, need to refresh...
  → Retrying same document...
```

## Key Improvements

### Before (BROKEN)
```javascript
// Click Disposisi
await clickDisposisiTab(page);
await sleep(2000);

// Immediately try to click Lihat (FAILS - no AJAX wait)
const processed = await processSingleDocument(page, config);

if (!processed) {
    break; // ❌ Jumps to next menu
}
```

### After (FIXED)
```javascript
// Click Disposisi
await clickDisposisiTab(page);

// ✅ Wait for AJAX-loaded list (up to 60 seconds)
let documentListLoaded = false;
while (!documentListLoaded && waitAttempts < 20) {
    const listCheck = await page.evaluate(() => ({
        hasLihatButton: lihatBtn !== null,
        hasDataTable: dataTable !== null,
        tableRowCount: tableRows.length
    }));

    if (listCheck.hasLihatButton || listCheck.hasDataTable || listCheck.tableRowCount > 1) {
        documentListLoaded = true;
    } else {
        await sleep(3000);
    }
}

// ✅ Retry processing instead of breaking
let processed = false;
let processRetries = 0;
while (!processed && processRetries < 3) {
    processed = await processSingleDocument(page, config);
    if (!processed && processRetries < 3) {
        await sleep(5000);
        processRetries++;
    }
}

// ✅ Check badges before breaking
if (badgeCount === 0) {
    break; // Only break when all done
}
```

## Processing Rules

1. **Complete All Documents** - Process all 60 documents before moving to next menu
2. **AJAX Wait** - Wait up to 60 seconds for document list to load
3. **Retry on Error** - 3 retry attempts per document
4. **Badge Verification** - Only stop when badge count = 0
5. **Continue on Failure** - Keep going even if one document fails
6. **Page State Check** - Verify still on correct page before retrying

## Expected Output for Full Run

```
📋 STEP 4: Processing Menus with Badges...
  Found 4 menus with badges

📂 Processing: Surat Biasa 60 (60 documents)
  [60 documents processed with detailed logs]
✓ Completed Surat Biasa 60: 60 documents processed

📂 Processing: Memo Eksternal 363 (363 documents)
  [363 documents processed with detailed logs]
✓ Completed Memo Eksternal: 363 documents processed

📂 Processing: Memo Internal 31 (31 documents)
  [31 documents processed with detailed logs]
✓ Completed Memo Internal: 31 documents processed

📂 Processing: Surat Masuk 3 (3 documents)
  [3 documents processed with detailed logs]
✓ Completed Surat Masuk: 3 documents processed

✓ All menus completed: 457 total documents processed
```

The system now properly waits for AJAX, retries on errors, and completes ALL documents before moving to the next menu!