/**
 * Click Helper Module
 * Traditional click-based interaction utilities with explicit simulation
 */

const { sleep } = require('./utils');

/**
 * Click an element using traditional approach with explicit simulation
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {Object} options - Click options
 * @returns {Promise<boolean>} True if clicked successfully
 */
async function traditionalClick(page, selector, options = {}) {
    const { timeout = 5000, waitForClickable = true } = options;

    try {
        // Wait for element to be present
        await page.waitForSelector(selector, { timeout, visible: true });

        // Add small delay to ensure element is ready
        await sleep(500);

        // Get the element
        const element = await page.$(selector);
        if (!element) {
            return false;
        }

        // Check if element is visible and enabled
        const isClickable = await page.evaluate(el => {
            return el.offsetParent !== null &&
                   !el.disabled &&
                   !el.classList.contains('v-btn--disabled');
        }, element);

        if (!isClickable) {
            return false;
        }

        // Perform the click
        await element.click();

        // Wait a bit after click
        await sleep(300);

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Type text with explicit click and typing simulation
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {string} text - Text to type
 * @returns {Promise<boolean>} True if typed successfully
 */
async function traditionalType(page, selector, text) {
    try {
        // First, click the input to focus it
        const clicked = await traditionalClick(page, selector);
        if (!clicked) {
            return false;
        }

        // Clear existing content
        await page.evaluate(el => {
            el.value = '';
        }, await page.$(selector));

        // Type the text character by character for more realistic simulation
        await page.type(selector, text, { delay: 50 });

        // Trigger change events
        await page.evaluate(el => {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
        }, await page.$(selector));

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Find and click button by text with explicit simulation
 * @param {Page} page - Puppeteer page instance
 * @param {Array<string>} buttonTexts - Text patterns to search for
 * @param {Object} options - Options
 * @returns {Promise<boolean>} True if clicked successfully
 */
async function clickButtonByTextTraditional(page, buttonTexts, options = {}) {
    const { mustBeEnabled = true, timeout = 5000 } = options;

    try {
        // Wait a bit for page to stabilize
        await sleep(500);

        // Get all buttons
        const buttons = await page.$$('button, .v-btn, [type="submit"], [type="button"]');

        for (const button of buttons) {
            try {
                // Get button text
                const buttonText = await page.evaluate(el => el.textContent || '', button);

                // Check if button matches
                const matches = buttonTexts.some(pattern => buttonText.includes(pattern));
                if (!matches) continue;

                // Check if button should be enabled
                if (mustBeEnabled) {
                    const isDisabled = await page.evaluate(el => {
                        return el.disabled || el.classList.contains('v-btn--disabled');
                    }, button);

                    if (isDisabled) continue;
                }

                // Check visibility
                const isVisible = await page.evaluate(el => {
                    return el.offsetParent !== null;
                }, button);

                if (!isVisible) continue;

                // Click the button
                await button.click();
                await sleep(300);

                return true;
            } catch (e) {
                continue;
            }
        }

        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Select first option from dropdown with explicit clicks
 * @param {Page} page - Puppeteer page instance
 * @param {string} containerSelector - Container selector
 * @param {string} optionSelector - Option selector
 * @returns {Promise<boolean>} True if option selected
 */
async function selectFirstDropdownOption(page, containerSelector, optionSelector) {
    try {
        // Wait for dropdown to appear
        await sleep(1000);

        // Get all options
        const options = await page.$$(optionSelector);

        for (const option of options) {
            try {
                // Check if option is visible and selectable
                const isSelectable = await page.evaluate(el => {
                    return el.offsetParent !== null &&
                           el.textContent.trim().length > 5 &&
                           !el.classList.contains('v-btn') &&
                           !el.closest('button');
                }, option);

                if (isSelectable) {
                    // Click the option
                    await option.click();
                    await sleep(500);
                    return true;
                }
            } catch (e) {
                continue;
            }
        }

        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Wait for and click element when it appears
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {Object} options - Options
 * @returns {Promise<boolean>} True if clicked successfully
 */
async function waitForAndClick(page, selector, options = {}) {
    const { timeout = 10000, checkInterval = 500 } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const clicked = await traditionalClick(page, selector, { timeout: checkInterval });
        if (clicked) {
            return true;
        }
        await sleep(checkInterval);
    }

    return false;
}

module.exports = {
    traditionalClick,
    traditionalType,
    clickButtonByTextTraditional,
    selectFirstDropdownOption,
    waitForAndClick
};