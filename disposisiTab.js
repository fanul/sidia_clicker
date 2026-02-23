/**
 * Disposisi Tab Module - Refactored for Consistency
 * Handles clicking the Disposisi tab with simplified, reliable logic
 */

const chalk = require('chalk');
const { sleep } = require('./utils');
const { captureScreenshot, capturePageStructure } = require('./visualHelper');

/**
 * Click the Disposisi tab with simplified, consistent logic
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Result object with success status
 */
async function clickDisposisiTab(page) {
    console.log(chalk.yellow('  🔹 Clicking Disposisi tab...'));

    try {
        // STEP 1: Find and click the Disposisi tab
        console.log(chalk.gray('      → Finding Disposisi tab...'));

        const clickResult = await findAndClickDisposisiTab(page);

        if (!clickResult.clicked) {
            console.log(chalk.red('      ✗ Failed to click Disposisi tab'));
            return { success: false, reason: 'click_failed' };
        }

        console.log(chalk.green('      ✓ Disposisi tab clicked'));

        // STEP 2: Wait for content to load
        console.log(chalk.gray('      → Waiting for document table to load...'));
        await sleep(3000);

        // STEP 3: Verify content loaded
        console.log(chalk.gray('      → Verifying document content...'));

        const contentCheck = await verifyDocumentContent(page);

        if (!contentCheck.hasContent) {
            console.log(chalk.yellow('      → No document content found'));
            return { success: false, reason: 'no_content', ...contentCheck };
        }

        // Check for false positive badge
        if (contentCheck.isFalsePositive) {
            console.log(chalk.yellow('      ⚠ False positive badge detected'));
            return { success: false, reason: 'false_positive_badge', shouldSkip: true, ...contentCheck };
        }

        console.log(chalk.green(`      ✓ Document content loaded: ${contentCheck.lihatButtons} Lihat buttons, ${contentCheck.dataRows} rows`));

        return { success: true, ...contentCheck };

    } catch (error) {
        console.log(chalk.red(`      ✗ Error: ${error.message}`));
        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Find and click the Disposisi tab
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Click result
 */
async function findAndClickDisposisiTab(page) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        attempts++;
        console.log(chalk.gray(`      → Click attempt ${attempts}/${maxAttempts}...`));

        // Find the Disposisi tab
        const tabInfo = await page.evaluate(() => {
            // Look for tabs with role="tab"
            const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

            for (const tab of tabs) {
                const text = tab.textContent.trim();
                const hasBadge = tab.querySelector('.v-badge__badge') !== null;

                // Look for tab with "Disposisi" text and badge
                if (hasBadge && text.includes('Disposisi')) {
                    const rect = tab.getBoundingClientRect();
                    return {
                        found: true,
                        text: text,
                        visible: rect.width > 0 && rect.height > 0,
                        x: rect.x + rect.width / 2,
                        y: rect.y + rect.height / 2
                    };
                }
            }

            // Fallback: Look for any tab with "Disposisi" text
            for (const tab of tabs) {
                const text = tab.textContent.trim();
                if (text.includes('Disposisi') && !text.includes('Top Level')) {
                    const rect = tab.getBoundingClientRect();
                    return {
                        found: true,
                        text: text,
                        visible: rect.width > 0 && rect.height > 0,
                        x: rect.x + rect.width / 2,
                        y: rect.y + rect.height / 2
                    };
                }
            }

            return { found: false };
        });

        if (!tabInfo.found) {
            console.log(chalk.yellow('      → Disposisi tab not found'));
            if (attempts < maxAttempts) {
                await sleep(1000);
            }
            continue;
        }

        console.log(chalk.gray(`      → Found: "${tabInfo.text}" at x=${Math.round(tabInfo.x)}, y=${Math.round(tabInfo.y)}`));

        // Click the tab using multiple methods
        try {
            // Method 1: JavaScript click
            await page.evaluate((x, y) => {
                const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
                for (const tab of tabs) {
                    if (tab.textContent.includes('Disposisi')) {
                        tab.click();

                        // Trigger Vue.js events
                        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                            const event = new MouseEvent(eventType, {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                clientX: x,
                                clientY: y
                            });
                            tab.dispatchEvent(event);
                        });

                        return true;
                    }
                }
                return false;
            }, tabInfo.x, tabInfo.y);

            // Method 2: Puppeteer coordinate click
            await page.mouse.click(tabInfo.x, tabInfo.y);

            console.log(chalk.green('      ✓ Click executed'));
            return { clicked: true };

        } catch (clickError) {
            console.log(chalk.yellow(`      → Click failed: ${clickError.message}`));
            if (attempts < maxAttempts) {
                await sleep(1000);
            }
        }
    }

    return { clicked: false, reason: 'max_attempts_reached' };
}

/**
 * Verify document content is loaded
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Content verification result
 */
async function verifyDocumentContent(page) {
    const result = await page.evaluate(() => {
        // Look for active window
        const activeWindow = document.querySelector('.v-window-item--active');
        if (!activeWindow) {
            return { hasContent: false, reason: 'no_active_window' };
        }

        // Look for Lihat buttons
        const buttons = Array.from(activeWindow.querySelectorAll('button, .v-btn'));
        const lihatButtons = buttons.filter(btn => {
            const text = (btn.textContent || '').trim();
            return text === 'Lihat' || text.includes('Lihat');
        });

        // Look for data table
        const dataTable = activeWindow.querySelector('.v-data-table');
        let dataRows = 0;
        let hasFontWeightBlack = false;

        if (dataTable) {
            const tbody = dataTable.querySelector('tbody');
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr =>
                    !tr.classList.contains('v-data-table__empty-wrapper')
                );
                dataRows = rows.length;

                // Check for font-weight-black (false positive detection)
                rows.forEach(row => {
                    const blackElements = row.querySelectorAll('.font-weight-black');
                    if (blackElements.length > 0) {
                        hasFontWeightBlack = true;
                    }
                });
            }
        }

        return {
            hasContent: lihatButtons.length > 0 || dataRows > 0,
            lihatButtons: lihatButtons.length,
            dataRows: dataRows,
            hasFontWeightBlack: hasFontWeightBlack,
            isFalsePositive: dataRows > 0 && !hasFontWeightBlack
        };
    });

    return result;
}

/**
 * Get current tab state (for debugging)
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Tab state
 */
async function getTabState(page) {
    return await page.evaluate(() => {
        const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(t =>
            t.textContent.includes('Disposisi')
        );

        if (!tab) {
            return { found: false };
        }

        return {
            found: true,
            text: tab.textContent.trim(),
            ariaSelected: tab.getAttribute('aria-selected'),
            classList: Array.from(tab.classList)
        };
    });
}

/**
 * Simple retry function for debugging
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Retry result
 */
async function retryTabClick(page) {
    console.log(chalk.yellow('      → Attempting simple retry...'));

    try {
        const result = await page.evaluate(() => {
            const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(t =>
                t.textContent.includes('Disposisi')
            );

            if (tab && tab.offsetParent !== null) {
                tab.click();
                return { clicked: true };
            }

            return { clicked: false };
        });

        if (result.clicked) {
            await sleep(3000);
            return result;
        }

        return { clicked: false };
    } catch (error) {
        return { clicked: false, error: error.message };
    }
}

module.exports = {
    clickDisposisiTab,
    findAndClickDisposisiTab,
    verifyDocumentContent,
    getTabState,
    retryTabClick
};
