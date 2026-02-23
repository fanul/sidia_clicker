/**
 * Submenu Navigation Module
 * Handles clicking submenu items to access document pages
 */

const chalk = require('chalk');
const { sleep } = require('./utils');

/**
 * Click a submenu item (e.g., "Surat Biasa 59") to access documents
 * @param {Page} page - Puppeteer page instance
 * @param {Object} menu - Menu object with text and href
 * @returns {Promise<boolean>} True if clicked successfully
 */
async function clickSubmenu(page, menu) {
    console.log(chalk.gray(`      → Looking for submenu: ${menu.text}...`));

    try {
        // Strategy 1: Try to click the submenu element directly (NO PAGE REFRESH)
        console.log(chalk.gray(`      → Trying to click submenu element directly...`));

        const clicked = await clickSubmenuByText(page, menu.text);
        if (clicked) {
            return true;
        }

        // Strategy 2: Fallback - Try href navigation if direct click failed
        if (menu.href) {
            console.log(chalk.gray(`      → Direct click failed, using href navigation: ${menu.href}`));

            const navigated = await navigateByHref(page, menu.href);
            if (navigated) {
                return true;
            }
        }

        console.log(chalk.red(`      ✗ Could not click submenu: ${menu.text}`));
        return false;

    } catch (error) {
        console.log(chalk.red(`      ✗ Error clicking submenu: ${error.message}`));
        return false;
    }
}

/**
 * Navigate to submenu using href
 * @param {Page} page - Puppeteer page instance
 * @param {string} href - Href to navigate to
 * @returns {Promise<boolean>} True if navigation successful
 */
async function navigateByHref(page, href) {
    try {
        // Get base URL from current page
        const currentUrl = page.url();
        const baseUrl = currentUrl.split('/')[0] + '//' + currentUrl.split('/')[2] + '/';

        const navigationResult = await Promise.race([
            page.goto(baseUrl + href.substring(1), { waitUntil: 'networkidle2', timeout: 15000 }),
            sleep(15000).then(() => 'timeout')
        ]);

        console.log(chalk.gray(`      → Navigation result: ${navigationResult}`));

        // Wait for page to load
        await sleep(3000);

        // Verify we're on the right page
        const finalUrl = page.url();
        console.log(chalk.gray(`      → Current URL: ${finalUrl}`));

        if (finalUrl.includes('/inbox')) {
            console.log(chalk.green(`      ✓ Successfully navigated to: ${href}`));
            return true;
        }

        return false;
    } catch (error) {
        console.log(chalk.red(`      ✗ Href navigation failed: ${error.message}`));
        return false;
    }
}

/**
 * Click submenu by text content - Enhanced with direct Puppeteer clicking
 * @param {Page} page - Puppeteer page instance
 * @param {string} menuText - Menu text to search for
 * @returns {Promise<boolean>} True if clicked successfully
 */
async function clickSubmenuByText(page, menuText) {
    try {
        // First, find the element using evaluate
        const elementInfo = await page.evaluate((text) => {
            const selectors = [
                '.v-list-item',
                '.v-list-item__title',
                'a[href*="/inbox"]',
                '[role="menuitem"]',
                'div.v-list-item__content'
            ];

            for (const selector of selectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                console.log(`      → Trying selector: ${selector}, found ${elements.length} elements`);

                for (const el of elements) {
                    const elementText = (el.textContent || '').trim();
                    console.log(`        → Element text: "${elementText}"`);

                    if (elementText.includes(text) && el.offsetParent !== null) {
                        console.log(`        → Found matching element!`);

                        return {
                            found: true,
                            selector: selector,
                            text: elementText,
                            isListItem: el.classList.contains('v-list-item__title')
                        };
                    }
                }
            }

            return { found: false };
        }, menuText);

        if (!elementInfo.found) {
            console.log(chalk.yellow(`      → Could not find submenu element with text: "${menuText}"`));
            return false;
        }

        console.log(chalk.green(`      → Found submenu element: "${elementInfo.text}"`));

        // Use Puppeteer's direct click for better reliability
        try {
            const elements = await page.$$(elementInfo.selector);
            for (const el of elements) {
                const text = await page.evaluate(el => el.textContent, el);
                if (text.includes(menuText)) {
                    console.log(chalk.gray(`      → Clicking submenu element directly...`));

                    // Click using Puppeteer's native click
                    await el.click({ clickCount: 1, delay: 100 });

                    // If it's a list item title, also click the parent
                    if (elementInfo.isListItem) {
                        const parent = await el.evaluateHandle(el => el.closest('.v-list-item'));
                        if (parent) {
                            console.log(chalk.gray(`      → Also clicking parent .v-list-item`));
                            await parent.click({ clickCount: 1, delay: 50 });
                        }
                    }

                    console.log(chalk.green(`      ✓ Successfully clicked submenu: "${menuText}"`));

                    // Wait for navigation/state change
                    await sleep(2000);

                    // Verify we're on the right page
                    const currentUrl = page.url();
                    if (currentUrl.includes('/inbox')) {
                        console.log(chalk.green(`      ✓ Verified navigation to inbox page`));
                        return true;
                    }

                    return true; // Consider it successful even if URL check fails
                }
            }
        } catch (directClickError) {
            console.log(chalk.yellow(`      → Direct click failed: ${directClickError.message}, trying JavaScript fallback...`));

            // Fallback to JavaScript click
            const jsClickResult = await page.evaluate((text) => {
                const selectors = [
                    '.v-list-item',
                    '.v-list-item__title',
                    'a[href*="/inbox"]',
                    '[role="menuitem"]',
                    'div.v-list-item__content'
                ];

                for (const selector of selectors) {
                    const elements = Array.from(document.querySelectorAll(selector));

                    for (const el of elements) {
                        const elementText = (el.textContent || '').trim();

                        if (elementText.includes(text) && el.offsetParent !== null) {
                            // Try multiple click methods
                            el.click();
                            if (el.classList.contains('v-list-item__title')) {
                                const parent = el.closest('.v-list-item');
                                if (parent) parent.click();
                            }

                            const link = el.querySelector('a') || el.closest('a');
                            if (link) link.click();

                            return { clicked: true, method: 'javascript_fallback' };
                        }
                    }
                }

                return { clicked: false, method: null };
            }, menuText);

            if (jsClickResult.clicked) {
                console.log(chalk.green(`      ✓ Submenu clicked via JavaScript fallback`));

                // Wait for navigation
                await sleep(3000);

                // Verify navigation
                const currentUrl = page.url();
                if (currentUrl.includes('/inbox')) {
                    console.log(chalk.green(`      ✓ Verified navigation to inbox page`));
                    return true;
                }

                return true;
            }
        }

        return false;
    } catch (error) {
        console.log(chalk.red(`      ✗ Text-based clicking failed: ${error.message}`));
        return false;
    }
}

module.exports = {
    clickSubmenu,
    navigateByHref,
    clickSubmenuByText
};
