/**
 * Disposisi Tab Module
 * Handles clicking the Disposisi tab and verifying tab state changes
 */

const chalk = require('chalk');
const { sleep } = require('./utils');
const { captureScreenshot, capturePageStructure } = require('./visualHelper');

/**
 * Click Disposisi tab - With comprehensive click verification and state change confirmation
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if clicked successfully AND state changed
 */
async function clickDisposisiTab(page) {
    console.log(chalk.gray('      → Looking for Disposisi tab...'));

    try {
        // Step 1: Check current state before clicking
        const beforeState = await getTabState(page);
        console.log(chalk.gray(`      → Before click: found=${beforeState.found}, aria-selected=${beforeState.ariaSelected}, classes=${beforeState.classList.join(', ')}`));

        if (!beforeState.found) {
            console.log(chalk.red('      ✗ Disposisi tab not found'));
            // Capture debug information
            await captureScreenshot(page, 'disposisi_tab_not_found');
            await capturePageStructure(page, 'disposisi_tab_not_found');
            return false;
        }

        // Capture debug information before clicking
        await captureScreenshot(page, 'disposisi_tab_before_click');
        await capturePageStructure(page, 'disposisi_tab_before_click');

        // Step 2: Attempt to click the Disposisi tab
        console.log(chalk.gray('      → Attempting to click Disposisi tab...'));

        const clickResult = await attemptTabClick(page);

        if (!clickResult.clicked) {
            console.log(chalk.red('      ✗ Could not click Disposisi tab'));
            // Capture debug information when click fails
            await captureScreenshot(page, 'disposisi_tab_click_failed');
            await capturePageStructure(page, 'disposisi_tab_click_failed');
            return false;
        }

        // Capture debug information after clicking
        await captureScreenshot(page, 'disposisi_tab_after_click');
        await capturePageStructure(page, 'disposisi_tab_after_click');

        console.log(chalk.green(`      ✓ Clicked Disposisi tab: "${clickResult.text}"`));

        // Step 3: Wait for state to change and verify multiple times
        await sleep(2000);

        // Step 4: Verify the click actually worked with multiple checks
        console.log(chalk.gray('      → Verifying click succeeded...'));

        let afterState;
        let clickSuccess = false;
        let verificationAttempts = 0;
        const maxVerificationAttempts = 5; // Try up to 5 times with 2s delays

        while (!clickSuccess && verificationAttempts < maxVerificationAttempts) {
            verificationAttempts++;
            console.log(chalk.gray(`      → Verification attempt ${verificationAttempts}/${maxVerificationAttempts}...`));

            afterState = await getTabStateWithVerification(page);
            console.log(chalk.gray(`      → After click: found=${afterState.found}, aria-selected=${afterState.ariaSelected}, classes=${afterState.classList.join(', ')}`));
            console.log(chalk.gray(`      → State check: Lihat button=${afterState.hasLihatButton}, Data table=${afterState.hasDataTable}, Rows=${afterState.tableRowCount}`));

            // Step 5: Verify success through STRICT indicators only
            clickSuccess = await verifyClickSuccess(page);

            if (clickSuccess) {
                console.log(chalk.green('      ✓ Disposisi tab click verified - both state and content loaded'));
                break;
            } else {
                console.log(chalk.yellow(`      → State not changed yet (aria-selected=${afterState.ariaSelected}), waiting...`));
                if (verificationAttempts < maxVerificationAttempts) {
                    await sleep(2000);
                }
            }
        }

        if (clickSuccess) {
            console.log(chalk.green('      ✓ Disposisi tab click verified - state changed'));

            // Additional verification for AJAX content
            await verifyAjaxContent(page, afterState);
            return true;
        }

        // Step 6: Retry if state didn't change
        console.log(chalk.red('      ✗ Disposisi tab click did not change state'));
        console.log(chalk.gray('      → Before: aria-selected=' + (beforeState.ariaSelected || 'null')));
        console.log(chalk.gray('      → After: aria-selected=' + (afterState.ariaSelected || 'null')));

        // Capture debug information when state change fails
        await captureScreenshot(page, 'disposisi_tab_state_not_changed');
        await capturePageStructure(page, 'disposisi_tab_state_not_changed');

        return await retryTabClick(page);

    } catch (error) {
        console.log(chalk.red(`      ✗ Error clicking Disposisi tab: ${error.message}`));
        return false;
    }
}

/**
 * Get current tab state
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Tab state object
 */
async function getTabState(page) {
    return await page.evaluate(() => {
        const disposisiTab = Array.from(document.querySelectorAll('[role="tab"], .v-tab, div')).find(el =>
            (el.textContent || '').includes('Disposisi')
        );

        if (!disposisiTab) {
            return { found: false, ariaSelected: null, classList: [] };
        }

        return {
            found: true,
            ariaSelected: disposisiTab.getAttribute('aria-selected'),
            classList: Array.from(disposisiTab.classList),
            textContent: (disposisiTab.textContent || '').trim()
        };
    });
}

/**
 * Attempt to click the Disposisi tab
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Click result object
 */
async function attemptTabClick(page) {
    try {
        console.log(chalk.gray('      → Finding and clicking Disposisi tab with badge...'));

        // Use the most direct, reliable approach possible
        const result = await page.evaluate(() => {
            // Find ALL role="tab" elements
            const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

            // Log what we found
            console.log('Total tabs found:', tabs.length);
            tabs.forEach((tab, i) => {
                console.log(`Tab ${i}:`, {
                    text: tab.textContent.trim(),
                    ariaSelected: tab.getAttribute('aria-selected'),
                    classes: Array.from(tab.classList),
                    hasBadge: tab.querySelector('.v-badge__badge') !== null
                });
            });

            // Find the target tab (with badge, contains "Disposisi", not "Top Level")
            const targetTab = tabs.find(tab => {
                const text = tab.textContent.trim();
                const hasBadge = tab.querySelector('.v-badge__badge') !== null;
                const containsDisposisi = text.includes('Disposisi');
                const notTopLevel = !text.includes('Top Level');

                return hasBadge && containsDisposisi && notTopLevel;
            });

            if (!targetTab) {
                console.log('Target tab not found!');
                return { clicked: false, reason: 'target_not_found' };
            }

            console.log('Target tab found:', targetTab.textContent.trim());

            // Get exact position and size
            const rect = targetTab.getBoundingClientRect();
            console.log('Tab bounding rect:', {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                visible: rect.width > 0 && rect.height > 0
            });

            if (rect.width === 0 || rect.height === 0) {
                return { clicked: false, reason: 'tab_not_visible' };
            }

            // Calculate center position
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;

            console.log('Will click at:', { x: centerX, y: centerY });

            // Create mouse event sequence (most reliable for Vue.js)
            const mousedownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: centerX,
                clientY: centerY
            });

            const mouseupEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: centerX,
                clientY: centerY
            });

            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: centerX,
                clientY: centerY
            });

            // Dispatch events in sequence
            targetTab.dispatchEvent(mousedownEvent);
            targetTab.dispatchEvent(mouseupEvent);
            targetTab.dispatchEvent(clickEvent);

            // Also try standard click
            targetTab.click();

            console.log('Click events dispatched');

            return {
                clicked: true,
                text: targetTab.textContent.trim(),
                reason: 'javascript_click',
                position: { x: centerX, y: centerY }
            };
        });

        if (!result.clicked) {
            console.log(chalk.yellow(`      → JavaScript click failed: ${result.reason}`));
            return { clicked: false, selector: null, text: null };
        }

        console.log(chalk.green(`      → JavaScript click executed: "${result.text}"`));

        // Now follow up with Puppeteer's coordinate click
        await sleep(500);

        // Find the element again and click using Puppeteer's mouse
        const tabElements = await page.$$('div[role="tab"]');
        for (const tabElement of tabElements) {
            const text = await page.evaluate(el => el.textContent, tabElement);

            if (text.includes('Disposisi') && !text.includes('Top Level')) {
                try {
                    const rect = await tabElement.boundingBox();
                    if (rect) {
                        const x = rect.x + rect.width / 2;
                        const y = rect.y + rect.height / 2;

                        console.log(chalk.gray(`      → Following up with Puppeteer click at: x=${x}, y=${y}`));
                        await page.mouse.click(x, y);
                        console.log(chalk.green(`      → Puppeteer click executed`));

                        await sleep(1000);

                        return {
                            clicked: true,
                            selector: 'hybrid_click',
                            text: text.trim()
                        };
                    }
                } catch (mouseError) {
                    console.log(chalk.yellow(`      → Puppeteer mouse click failed: ${mouseError.message}`));
                }
            }
        }

        // At least the JavaScript click worked
        return {
            clicked: true,
            selector: 'javascript_click',
            text: result.text
        };

    } catch (error) {
        console.log(chalk.red(`      ✗ Error clicking Disposisi tab: ${error.message}`));
        console.log(chalk.yellow(`      → Retrying with simplified approach...`));

        // Retry with simplified approach - just find and click by text
        try {
            const retryResult = await page.evaluate(() => {
                // Find any element that contains "Disposisi" and looks clickable
                const allElements = document.querySelectorAll('*');
                for (const el of allElements) {
                    const text = (el.textContent || '').trim();

                    // Simple check: contains "Disposisi" and is visible
                    if (text.includes('Disposisi') &&
                        el.offsetParent !== null &&
                        text.length < 100) {

                        console.log(`Found potential Disposisi element: "${text}"`);

                        // Try to click it
                        el.click();
                        return {
                            clicked: true,
                            text: text,
                            method: 'simplified_retry'
                        };
                    }
                }

                return { clicked: false, method: 'simplified_failed' };
            });

            if (retryResult.clicked) {
                console.log(chalk.green(`      → Successfully clicked Disposisi tab via simplified retry: "${retryResult.text}"`));
                return {
                    clicked: true,
                    selector: 'simplified_retry',
                    text: retryResult.text
                };
            }
        } catch (retryError) {
            console.log(chalk.red(`      → Simplified retry also failed: ${retryError.message}`));
        }

        return { clicked: false, selector: null, text: null };
    }
}

/**
 * Get tab state with additional verification elements
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Enhanced state object
 */
async function getTabStateWithVerification(page) {
    return await page.evaluate(() => {
        const disposisiTab = Array.from(document.querySelectorAll('[role="tab"], .v-tab, div')).find(el =>
            (el.textContent || '').includes('Disposisi')
        );

        if (!disposisiTab) {
            return { found: false, ariaSelected: null, classList: [] };
        }

        // Check for Lihat button and data table
        const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
            (btn.textContent || '').includes('Lihat')
        );

        const dataTable = document.querySelector('.v-data-table');
        const tableRows = document.querySelectorAll('tr');

        return {
            found: true,
            ariaSelected: disposisiTab.getAttribute('aria-selected'),
            classList: Array.from(disposisiTab.classList),
            hasLihatButton: lihatBtn !== null,
            hasDataTable: dataTable !== null,
            tableRowCount: tableRows.length
        };
    });
}

/**
 * Verify if click was successful
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if click successful
 */
async function verifyClickSuccess(page) {
    // CRITICAL FIX: This Vue.js app doesn't properly set aria-selected
    // We need to check if the actual content loaded instead!

    console.log(chalk.gray(`      → Checking if disposisi content loaded...`));

    // Check if we have actual Lihat buttons (not just table structure)
    const hasDisposisiContent = await page.evaluate(() => {
        // Look for Lihat buttons specifically within the active tab content
        const activeWindow = document.querySelector('.v-window-item--active');
        if (!activeWindow) return { found: false };

        // Look for actual Lihat buttons with the specific text
        const allButtons = Array.from(activeWindow.querySelectorAll('button, .v-btn'));
        const lihatButtons = allButtons.filter(btn => {
            const text = (btn.textContent || '').trim();
            return text === 'Lihat' || text.includes('Lihat');
        });

        // Check if the table has actual data (not "No data available")
        const dataTable = activeWindow.querySelector('.v-data-table');
        let hasActualData = false;
        let dataRowCount = 0;

        if (dataTable) {
            const tbody = dataTable.querySelector('tbody');
            if (tbody) {
                const emptyWrapper = tbody.querySelector('.v-data-table__empty-wrapper');
                const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr =>
                    !tr.classList.contains('v-data-table__empty-wrapper')
                );
                hasActualData = !emptyWrapper && rows.length > 0;
                dataRowCount = rows.length;
            }
        }

        console.log(`Active window analysis:`, {
            lihatButtonsFound: lihatButtons.length,
            hasActualData: hasActualData,
            dataRowCount: dataRowCount
        });

        return {
            found: true,
            lihatButtonCount: lihatButtons.length,
            hasActualData: hasActualData,
            dataRowCount: dataRowCount
        };
    });

    console.log(chalk.gray(`      → Disposisi content analysis:`, hasDisposisiContent));

    // SUCCESS if we have Lihat buttons OR actual data rows
    const success = hasDisposisiContent.lihatButtonCount > 0 || hasDisposisiContent.hasActualData;

    if (success) {
        console.log(chalk.green(`      → ✓ Disposisi content loaded! ${hasDisposisiContent.lihatButtonCount} Lihat buttons, ${hasDisposisiContent.dataRowCount} data rows`));
    } else {
        console.log(chalk.yellow(`      → No disposisi content loaded yet`));
    }

    return success;
}

/**
 * Verify AJAX content loaded
 * @param {Page} page - Puppeteer page instance
 * @param {Object} state - Current state object
 * @returns {Promise<void>}
 */
async function verifyAjaxContent(page, state) {
    if (!state.hasLihatButton && !state.hasDataTable) {
        console.log(chalk.yellow('      → State changed but Lihat button not visible yet, waiting for AJAX...'));
        await sleep(5000);

        const finalCheck = await page.evaluate(() => {
            const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                (btn.textContent || '').includes('Lihat')
            );
            return lihatBtn !== null;
        });

        if (finalCheck) {
            console.log(chalk.green('      ✓ Lihat button appeared after waiting'));
        } else {
            console.log(chalk.yellow('      ⚠ Lihat button still not visible, but tab state changed'));
        }
    }
}

/**
 * Retry tab click if initial attempt failed
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if retry successful
 */
async function retryTabClick(page) {
    console.log(chalk.yellow('      → Attempting to click again...'));

    const retryResult = await page.evaluate(() => {
        const disposisiTab = Array.from(document.querySelectorAll('[role="tab"], .v-tab, div')).find(el =>
            (el.textContent || '').includes('Disposisi')
        );

        if (disposisiTab && disposisiTab.offsetParent !== null) {
            disposisiTab.click();
            return { clicked: true };
        }

        return { clicked: false };
    });

    if (retryResult.clicked) {
        await sleep(3000);

        const retryCheck = await page.evaluate(() => {
            const disposisiTab = Array.from(document.querySelectorAll('[role="tab"], .v-tab, div')).find(el =>
                (el.textContent || '').includes('Disposisi')
            );

            if (!disposisiTab) return { ariaSelected: null };

            const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                (btn.textContent || '').includes('Lihat')
            );

            return {
                ariaSelected: disposisiTab.getAttribute('aria-selected'),
                hasLihatButton: lihatBtn !== null
            };
        });

        if (retryCheck.ariaSelected === 'true' || retryCheck.hasLihatButton) {
            console.log(chalk.green('      ✓ Disposisi tab click successful on retry'));
            return true;
        }
    }

    console.log(chalk.red('      ✗ Disposisi tab click failed even after retry'));
    return false;
}

module.exports = {
    clickDisposisiTab,
    getTabState,
    verifyClickSuccess
};
