/**
 * Document Processing Module (Refactored)
 * Handles navigation and document processing workflow
 */

const chalk = require('chalk');
const { retry, sleep } = require('./utils');
const { SELECTORS, TIMING } = require('./constants');
const { clickButtonByText, waitForAnySelector } = require('./pageHelper');
const { clickAndVerifyWithFallback } = require('./visualHelper');

// Import new modular components
const { clickSubmenu } = require('./submenuNavigation');
const { clickDisposisiTab } = require('./disposisiTab');
const { processSingleDocument } = require('./documentProcessor');

/**
 * Navigate to Naskah Masuk menu - Enhanced to properly click and wait
 * @param {Page} page - Puppeteer page instance
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
async function navigateToNaskahMasuk(page, config) {
    console.log(chalk.yellow('\n📂 STEP 3: Navigating to Naskah Masuk...'));

    // CRITICAL: Check if we're on the right page first
    const currentUrl = page.url();
    console.log(chalk.gray(`  → Current URL: ${currentUrl}`));

    // If still on role page, wait and check again
    if (currentUrl.includes('/role')) {
        console.log(chalk.yellow('  ⚠ Still on role page, waiting for navigation...'));
        await sleep(5000);

        const recheckUrl = page.url();
        console.log(chalk.gray(`  → Recheck URL: ${recheckUrl}`));

        if (recheckUrl.includes('/role')) {
            console.log(chalk.red('  ✗ Still on role page - role selection may have failed'));
            console.log(chalk.gray('  → Cannot proceed to Naskah Masuk'));
            throw new Error('Still on role page - role selection failed. Cannot find Naskah Masuk menu.');
        }
    }

    // If on login page, something went wrong
    if (currentUrl.includes('/login')) {
        console.log(chalk.red('  ✗ Still on login page - authentication may have failed'));
        throw new Error('Still on login page - authentication failed. Cannot proceed.');
    }

    // Check if page has loaded properly
    console.log(chalk.gray('  → Looking for Naskah Masuk menu...'));

    // First, get current page state
    const pageState = await page.evaluate(() => {
        return {
            url: window.location.href,
            hasListItems: document.querySelectorAll('.v-list-item').length > 0,
            hasMenu: document.querySelector('.v-list, [role="navigation"]') !== null,
            bodyText: document.body.textContent.substring(0, 200)
        };
    });

    console.log(chalk.gray(`  → URL: ${pageState.url}`));
    console.log(chalk.gray(`  → Has list items: ${pageState.hasListItems}`));
    console.log(chalk.gray(`  → Has menu: ${pageState.hasMenu}`));

    // If page doesn't have menu items, wait a bit longer
    if (!pageState.hasListItems && !pageState.hasMenu) {
        console.log(chalk.yellow('  ⚠ No menu items found, waiting longer for page to load...'));
        await sleep(5000);

        const recheckState = await page.evaluate(() => {
            return {
                hasListItems: document.querySelectorAll('.v-list-item').length > 0,
                hasMenu: document.querySelector('.v-list, [role="navigation"]') !== null
            };
        });

        console.log(chalk.gray(`  → Recheck: list items=${recheckState.hasListItems}, menu=${recheckState.hasMenu}`));

        if (!recheckState.hasListItems && !recheckState.hasMenu) {
            console.log(chalk.red('  ✗ Page still not loaded properly'));
            console.log(chalk.gray(`  → Body text: ${pageState.bodyText}`));
            throw new Error('Page not loaded properly - cannot find menu elements');
        }
    }

    // Try to find and click Naskah Masuk with comprehensive verification AND visual fallback
    const naskahResult = await clickAndVerifyWithFallback(page, {
        elementDescription: 'Naskah Masuk menu',
        findFn: () => {
            const selectors = [
                '.v-list-item',
                '.v-list-item__title',
                'div',
                'span',
                'a'
            ];

            for (const selector of selectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                const naskahElement = elements.find(el => {
                    const text = (el.textContent || '').trim();
                    return text.includes('Naskah Masuk') &&
                           el.offsetParent !== null &&
                           !el.classList.contains('v-btn');
                });

                if (naskahElement) {
                    return {
                        found: true,
                        text: 'Naskah Masuk',
                        selector: selector
                    };
                }
            }
            return { found: false };
        },
        clickFn: () => {
            const selectors = [
                '.v-list-item',
                '.v-list-item__title',
                'div',
                'span'
            ];

            for (const selector of selectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                const naskahElement = elements.find(el => {
                    const text = (el.textContent || '').trim();
                    return text.includes('Naskah Masuk') &&
                           el.offsetParent !== null &&
                           !el.classList.contains('v-btn');
                });

                if (naskahElement) {
                    naskahElement.click();
                    if (naskahElement.classList.contains('v-list-item__title')) {
                        const parent = naskahElement.closest('.v-list-item');
                        if (parent) parent.click();
                    }
                    return { clicked: true };
                }
            }
            return { clicked: false };
        },
        verifyStateChangeFn: () => {
            // Check if badges appeared or if submenu expanded
            const badges = document.querySelectorAll('.v-badge__badge, .font-weight-black');
            const listItems = document.querySelectorAll('.v-list-item');

            return {
                verified: badges.length > 0 || listItems.length > 10,
                badgeCount: badges.length,
                listItemCount: listItems.length
            };
        },
        timeout: 10000,
        retryCount: 5
    });

    if (!naskahResult.success) {
        throw new Error(`Could not find or click Naskah Masuk menu: ${naskahResult.reason}`);
    }

    if (naskahResult.method === 'fallback' || naskahResult.method === 'enhanced_fallback') {
        console.log(chalk.green(`  ✓ Naskah Masuk menu clicked via FALLBACK: ${naskahResult.recommendation}`));
    } else {
        console.log(chalk.green('  ✓ Naskah Masuk menu clicked and verified'));
    }

    if (naskahResult.analysis && naskahResult.analysis.afterState) {
        console.log(chalk.gray(`  → Found ${naskahResult.analysis.afterState.badgeCount || naskahResult.afterState.badgeCount} badges after expansion`));
    } else if (naskahResult.afterState) {
        console.log(chalk.gray(`  → Found ${naskahResult.afterState.badgeCount} badges after expansion`));
    }
}

/**
 * Get all menus with badges - Enhanced to find all badge types
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Array>} Array of menu objects with badge info
 */
async function getMenusWithBadges(page) {
    console.log(chalk.gray('  → Scanning for menus with badges...'));

    const menuData = await page.evaluate(() => {
        const menuItems = [];

        // Try multiple selectors for menu items
        const selectors = [
            '.v-list-item',
            'a[href*="/inbox"]',
            '.v-list-item__title',
            '[role="menuitem"]'
        ];

        for (const selector of selectors) {
            const elements = Array.from(document.querySelectorAll(selector));

            elements.forEach(item => {
                // Check for badge using multiple methods
                const badge = item.querySelector('.v-badge__badge') ||
                             item.querySelector('.font-weight-black') ||
                             item.querySelector('.v-badge') ||
                             item.querySelector('[class*="badge"]');

                // Get the link
                const link = item.querySelector('a[href*="/inbox"]') ||
                           item.closest('a[href*="/inbox"]') ||
                           (item.tagName === 'A' && item.getAttribute('href')?.includes('/inbox') ? item : null);

                if (link) {
                    const badgeText = badge ? badge.textContent.trim() : '';
                    const badgeNumber = badgeText ? parseInt(badgeText) || 0 : 0;
                    const href = link.getAttribute('href') || '';
                    const text = item.textContent.trim();

                    // Only include if we have meaningful data
                    if (text && text.length > 3) {
                        // Check if already added
                        const alreadyAdded = menuItems.some(mi => mi.text === text || mi.href === href);
                        if (!alreadyAdded) {
                            menuItems.push({
                                text,
                                badge: badgeNumber,
                                href,
                                hasBadge: badge !== null,
                                badgeText: badgeText || 'none',
                                selector: selector
                            });
                        }
                    }
                }
            });
        }

        return menuItems;
    });

    console.log(chalk.gray(`  → Found ${menuData.length} menu items total`));

    // Filter to only items with badges
    const menusWithBadges = menuData.filter(item => item.hasBadge && item.badge > 0);

    console.log(chalk.cyan(`  → Found ${menusWithBadges.length} menus with badges`));

    if (menusWithBadges.length === 0) {
        console.log(chalk.yellow('  ⚠ No badges found! Showing all menu items for debugging:'));
        menuData.slice(0, 10).forEach((item, i) => {
            const badgeInfo = item.hasBadge ? ` [badge: ${item.badgeText}]` : ' [no badge]';
            console.log(chalk.gray(`    ${i + 1}. ${item.text.substring(0, 50)}${badgeInfo}`));
            console.log(chalk.gray(`       href: ${item.href}`));
        });
    } else {
        console.log(chalk.green('  → Menus with badges:'));
        menusWithBadges.forEach((item, i) => {
            console.log(chalk.cyan(`    ${i + 1}. ${item.text} (${item.badge} documents)`));
        });
    }

    return menusWithBadges;
}

/**
 * Check if there are documents to process
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if documents exist
 */
async function checkForDocuments(page) {
    return await page.evaluate(() => {
        const lihatBtn = document.querySelector('button') || document.querySelector('.v-btn');
        return lihatBtn !== null;
    });
}

/**
 * Process all menus with badges
 * @param {Page} page - Puppeteer page instance
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Processing statistics
 */
async function processMenusWithBadges(page, config) {
    console.log(chalk.yellow('\n📋 STEP 4: Processing Menus with Badges...'));

    const menus = await getMenusWithBadges(page);
    console.log(chalk.cyan(`  Found ${menus.length} menus with badges`));

    if (menus.length === 0) {
        console.log(chalk.yellow('  ⚠ No menus with badges found to process'));
        return {
            totalProcessed: 0,
            byType: {},
            skipped: []
        };
    }

    // Filter out skipped submenus
    const menusToProcess = menus.filter(menu => {
        if (config.skipSubmenus && config.skipSubmenus.length > 0) {
            const shouldSkip = config.skipSubmenus.some(skipTerm => {
                return menu.text.toLowerCase().includes(skipTerm.toLowerCase()) ||
                       menu.href.includes(skipTerm);
            });

            if (shouldSkip) {
                console.log(chalk.yellow(`  ⊗ Skipping submenu: "${menu.text}" (matched skip pattern)`));
                return false;
            }
        }
        return true;
    });

    console.log(chalk.green(`  → Menus to process after filtering: ${menusToProcess.length}/${menus.length}`));

    if (menusToProcess.length === 0) {
        console.log(chalk.yellow('  ⚠ All menus were skipped by configuration'));
        return {
            totalProcessed: 0,
            byType: {},
            skipped: menus.map(m => m.text),
            skippedCount: menus.length
        };
    }

    console.log(chalk.green('  → Menus with badges to process:'));
    menusToProcess.forEach((item, i) => {
        console.log(chalk.cyan(`    ${i + 1}. ${item.text} (${item.badge} documents)`));
    });

    // Process each menu that wasn't skipped
    const stats = {
        totalProcessed: 0,
        byType: {},
        skipped: [],
        skippedCount: 0
    };

    for (let menuIndex = 0; menuIndex < menusToProcess.length; menuIndex++) {
        const currentMenu = menusToProcess[menuIndex];
        console.log(chalk.yellow(`\n  📂 Processing menu ${menuIndex + 1}/${menusToProcess.length}: ${currentMenu.text}`));

        // CRITICAL: Click submenu FIRST to make Disposisi tab appear
        console.log(chalk.yellow('  🔹 STEP 4.1: Clicking submenu to access documents...'));

        const submenuClicked = await clickSubmenu(page, currentMenu);
        if (!submenuClicked) {
            console.log(chalk.red('  ✗ Could not click submenu'));
            stats.skipped.push(currentMenu.text);
            stats.skippedCount++;
            continue; // Try next menu instead of throwing error
        }

        console.log(chalk.green(`    ✓ Submenu clicked: ${currentMenu.text}`));

        // NOW the Disposisi tab should appear
        console.log(chalk.yellow('  🔹 STEP 4.2: Clicking Disposisi tab...'));

        const disposisiResult = await clickDisposisiTab(page);
        if (!disposisiResult.success) {
            if (disposisiResult.reason === 'false_positive_badge' || disposisiResult.shouldSkip) {
                console.log(chalk.yellow(`  ⚠ False positive badge detected in "${currentMenu.text}" - skipping submenu`));
                console.log(chalk.yellow(`  → Badge shows ${currentMenu.badge} documents but no font-weight-black elements found`));
                stats.skipped.push(currentMenu.text + ' (false positive)');
                stats.skippedCount++;
                continue; // Skip to next menu
            } else {
                console.log(chalk.red('  ✗ Could not click Disposisi tab'));
                stats.skipped.push(currentMenu.text);
                stats.skippedCount++;
                continue; // Try next menu instead of throwing error
            }
        }

        console.log(chalk.green('  ✓ Disposisi tab clicked successfully'));

        // CRITICAL: Wait for document table to load AND have actual data
        console.log(chalk.yellow('  🔹 STEP 4.3: Waiting for document table to load with data...'));

        let documentTableLoaded = false;
        let hasActualDocuments = false;
        let waitAttempts = 0;
        const maxWaitAttempts = 10; // Up to 30 seconds (10 * 3s)

        while (!documentTableLoaded && waitAttempts < maxWaitAttempts) {
            waitAttempts++;
            console.log(chalk.gray(`    → Waiting for document table... attempt ${waitAttempts}/${maxWaitAttempts}`));

            const tableCheck = await page.evaluate(() => {
                // Look for document table indicators
                const dataTable = document.querySelector('.v-data-table');
                const tableRows = document.querySelectorAll('tr');
                const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                    (btn.textContent || '').includes('Lihat')
                );

                // Check if table has actual data (not "No data available")
                let hasActualData = false;
                if (dataTable) {
                    const tbody = dataTable.querySelector('tbody');
                    if (tbody) {
                        const emptyWrapper = tbody.querySelector('.v-data-table__empty-wrapper');
                        const rows = tbody.querySelectorAll('tr');
                        hasActualData = !emptyWrapper && rows.length > 0;
                    }
                }

                return {
                    hasDataTable: dataTable !== null,
                    tableRowCount: tableRows.length,
                    hasLihatButton: lihatBtn !== null,
                    hasActualData: hasActualData
                };
            });

            console.log(chalk.gray(`      → Data table: ${tableCheck.hasDataTable}, Rows: ${tableCheck.tableRowCount}, Lihat button: ${tableCheck.hasLihatButton}, Has actual data: ${tableCheck.hasActualData}`));

            // Only consider it loaded if we have a Lihat button OR actual data in the table
            if (tableCheck.hasLihatButton || tableCheck.hasActualData) {
                console.log(chalk.green('    ✓ Document table loaded successfully with data'));
                documentTableLoaded = true;
                hasActualDocuments = true;
            } else if (tableCheck.hasDataTable && !tableCheck.hasActualData) {
                console.log(chalk.yellow('      → Table exists but no data yet, waiting for AJAX...'));
                await sleep(3000);
            } else {
                console.log(chalk.yellow('      → Document table not loaded yet, waiting...'));
                await sleep(3000);
            }
        }

        // Check if this submenu has badge but no actual documents (common bug)
        if (!hasActualDocuments && currentMenu.badge > 0) {
            console.log(chalk.yellow(`  ⚠ Badge bug detected: "${currentMenu.text}" shows ${currentMenu.badge} documents but actually has 0`));
            console.log(chalk.yellow(`  → Skipping this submenu and moving to next one`));
            stats.skipped.push(currentMenu.text + ' (empty)');
            stats.skippedCount++;
            continue; // Move to next menu
        }

        if (!documentTableLoaded) {
            console.log(chalk.red('  ✗ Document table failed to load'));
            stats.skipped.push(currentMenu.text + ' (timeout)');
            stats.skippedCount++;
            continue; // Try next menu instead of throwing error
        }

        console.log(chalk.yellow(`\n  🔹 STEP 4.4: Processing documents from ${currentMenu.text}...`));

        // Process documents from the current menu
        const menuStats = await processDocumentsFromTable(page, currentMenu, config);
        stats.totalProcessed += menuStats.totalProcessed;
        Object.assign(stats.byType, menuStats.byType);

        console.log(chalk.green(`  ✓ Completed ${currentMenu.text}: ${menuStats.totalProcessed} documents processed`));
    }

    console.log(chalk.green('\n✓ All menus processed'));
    console.log(chalk.cyan(`  Total processed: ${stats.totalProcessed} documents`));
    if (stats.skippedCount > 0) {
        console.log(chalk.yellow(`  Skipped: ${stats.skippedCount} menus`));
        console.log(chalk.gray(`    ${stats.skipped.join(', ')}`));
    }

    return stats;
}

/**
 * Process documents from the current document table
 * @param {Page} page - Puppeteer page instance
 * @param {Object} menu - Menu object with text and badge info
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Processing statistics for this menu
 */
async function processDocumentsFromTable(page, menu, config) {
    const stats = {
        totalProcessed: 0,
        byType: {}
    };

    let hasDocuments = true;
    let processedCount = 0;
    let consecutiveEmptyChecks = 0;
    let consecutiveDetailPageErrors = 0;
    const maxEmptyChecks = 2; // Give up after 2 consecutive empty checks
    const maxDetailPageErrors = 3; // Give up after 3 consecutive detail page errors
    const maxDocumentsToProcess = 100; // Safety limit to prevent infinite loops

    while (hasDocuments && consecutiveEmptyChecks < maxEmptyChecks && consecutiveDetailPageErrors < maxDetailPageErrors && processedCount < maxDocumentsToProcess) {
        // After Kembali, we need to click Disposisi tab again to see documents
        console.log(chalk.gray(`    → Preparing to process document ${processedCount + 1}...`));

        // Check current URL and page state
        const currentState = await page.evaluate(() => {
            return {
                url: window.location.href,
                hasLihatButtons: Array.from(document.querySelectorAll('button, .v-btn')).some(btn =>
                    (btn.textContent || '').includes('Lihat')
                )
            };
        });

        console.log(chalk.gray(`    → Current URL: ${currentState.url}`));
        console.log(chalk.gray(`    → Has Lihat buttons: ${currentState.hasLihatButtons}`));

        // Check if we're on a document detail page (where Disposisi tab doesn't exist)
        const isOnDetailPage = currentState.url.includes('/inbox/') && currentState.url.includes('?obj=');

        if (isOnDetailPage) {
            consecutiveDetailPageErrors++;
            console.log(chalk.yellow(`    → Still on document detail page (error ${consecutiveDetailPageErrors}/${maxDetailPageErrors})`));
            console.log(chalk.yellow('    → Attempting navigation away from detail page...'));

            // Try to navigate away from the detail page
            try {
                // Strategy 1: Try to click Kembali button
                const kembaliClicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, .v-btn'));
                    for (const btn of buttons) {
                        const text = (btn.textContent || '').trim().toUpperCase();
                        if (text.includes('KEMBALI') && btn.offsetParent !== null && !btn.disabled) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (kembaliClicked) {
                    console.log(chalk.gray('    → Clicked Kembali to leave detail page'));
                    await sleep(3000);
                } else {
                    // Strategy 2: Try browser back
                    console.log(chalk.gray('    → Kembali not found, trying browser back...'));
                    await page.goBack({ waitUntil: 'networkidle2' });
                    await sleep(3000);
                }

                // Check if navigation worked
                const newUrl = page.url();
                const stillOnDetailPage = newUrl.includes('/inbox/') && newUrl.includes('?obj=');

                if (!stillOnDetailPage) {
                    console.log(chalk.green('    → Successfully navigated away from detail page'));
                    consecutiveDetailPageErrors = 0; // Reset counter on success
                    continue; // Try again with clean state
                } else {
                    console.log(chalk.yellow('    → Still on detail page after navigation attempt'));
                    if (consecutiveDetailPageErrors >= maxDetailPageErrors) {
                        console.log(chalk.red('    → Max detail page errors reached, breaking loop'));
                        break;
                    }
                    await sleep(2000); // Wait before next attempt
                    continue; // Try again
                }

            } catch (navError) {
                console.log(chalk.red(`    → Navigation failed: ${navError.message}`));
                if (consecutiveDetailPageErrors >= maxDetailPageErrors) {
                    console.log(chalk.red('    → Max detail page errors reached, breaking loop'));
                    break;
                }
                continue;
            }
        } else {
            // Reset counter when we're not on detail page
            consecutiveDetailPageErrors = 0;
        }

        // If we don't have Lihat buttons visible, we need to click Disposisi tab
        if (!currentState.hasLihatButtons) {
            console.log(chalk.yellow('    → No Lihat buttons visible, clicking Disposisi tab...'));

            const disposisiResult = await clickDisposisiTab(page);
            if (!disposisiResult.success) {
                console.log(chalk.red('  ✗ Could not click Disposisi tab for next document'));
                break;
            }

            console.log(chalk.green('    ✓ Disposisi tab clicked for next document'));

            // Wait for document table to load
            await sleep(3000);
        }

        // Check if there are still documents to process
        const documentsAvailable = await page.evaluate(() => {
            const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                (btn.textContent || '').includes('Lihat')
            );
            return {
                hasDocuments: lihatBtn !== null
            };
        });

        if (!documentsAvailable.hasDocuments) {
            console.log(chalk.green('    → All documents processed'));
            break;
        }

        console.log(chalk.gray(`    → Processing document ${processedCount + 1}...`));

        // Process single document using the new module
        const processed = await processSingleDocument(page, config);

        if (processed) {
            processedCount++;
            console.log(chalk.green(`    ✓ Document ${processedCount} processed successfully`));

            // After successful processing, check if there are more documents
            console.log(chalk.gray('    → Checking for more documents...'));
            await sleep(2000);

        } else {
            console.log(chalk.red('    ✗ Failed to process document'));

            // Check if we should retry or stop
            const recheck = await page.evaluate(() => {
                const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                    (btn.textContent || '').includes('Lihat')
                );
                return lihatBtn !== null;
            });

            if (!recheck) {
                console.log(chalk.yellow('    → No more documents available'));
                break;
            }

            console.log(chalk.yellow('    → Retrying same document...'));
            await sleep(5000);
        }

        await sleep(TIMING.NAVIGATION);
    }

    stats.totalProcessed = processedCount;

    // Log if we hit any safety limits
    if (processedCount >= maxDocumentsToProcess) {
        console.log(chalk.yellow(`    → Reached maximum document processing limit (${maxDocumentsToProcess})`));
        console.log(chalk.yellow('    → Stopping to prevent infinite loop'));
    } else if (consecutiveDetailPageErrors >= maxDetailPageErrors) {
        console.log(chalk.yellow(`    → Reached maximum detail page error limit (${maxDetailPageErrors})`));
        console.log(chalk.yellow('    → Stopping to prevent infinite loop'));
    } else if (consecutiveEmptyChecks >= maxEmptyChecks) {
        console.log(chalk.yellow(`    → Reached maximum empty check limit (${maxEmptyChecks})`));
        console.log(chalk.yellow('    → All documents likely processed'));
    }

    return stats;
}

module.exports = {
    navigateToNaskahMasuk,
    processMenusWithBadges,
    processSingleDocument,
    checkForDocuments
};
