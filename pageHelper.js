/**
 * Page Helper Module
 * Utility functions for page interactions
 */

const { SELECTORS, TIMING } = require('./constants');

/**
 * Find and interact with an element using multiple selector strategies
 * @param {Page} page - Puppeteer page instance
 * @param {Array<string>} selectors - Array of CSS selectors to try
 * @param {Function} action - Action to perform on found element
 * @returns {Promise<{success: boolean, selector: string|null}>}
 */
async function trySelectors(page, selectors, action) {
    const result = await page.evaluate((selectorsAndAction) => {
        const { selectors, actionName } = selectorsAndAction;

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
                try {
                    if (actionName === 'click') {
                        element.click();
                    } else if (actionName === 'input') {
                        element.focus();
                    }
                    return { success: true, selector };
                } catch (e) {
                    continue;
                }
            }
        }
        return { success: false, selector: null };
    }, { selectors, action: action.name });

    return result;
}

/**
 * Type text into an input field
 * @param {Page} page - Puppeteer page instance
 * @param {Array<string>} selectors - Array of CSS selectors to try
 * @param {string} text - Text to type
 * @returns {Promise<{success: boolean, selector: string|null}>}
 */
async function typeInInput(page, selectors, text) {
    return await page.evaluate((args) => {
        const { selectors, text } = args;

        for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input && input.offsetParent !== null) {
                input.click();
                input.value = '';
                input.value = text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
                return { success: true, selector };
            }
        }
        return { success: false, selector: null };
    }, { selectors, text });
}

/**
 * Find and click a button by text content
 * @param {Page} page - Puppeteer page instance
 * @param {Array<string>} buttonTexts - Text patterns to search for
 * @param {Object} options - Options for finding the button
 * @returns {Promise<boolean>} True if button was clicked
 */
async function clickButtonByText(page, buttonTexts, options = {}) {
    const { mustBeEnabled = true } = options;

    return await page.evaluate((args) => {
        const { buttonTexts, mustBeEnabled } = args;
        const buttons = Array.from(document.querySelectorAll('button, .v-btn'));

        for (const btn of buttons) {
            const text = btn.textContent || '';
            const matches = buttonTexts.some(pattern => text.includes(pattern));

            if (matches) {
                if (mustBeEnabled && (btn.disabled || btn.classList.contains('v-btn--disabled'))) {
                    continue;
                }
                btn.click();
                return true;
            }
        }
        return false;
    }, { buttonTexts, mustBeEnabled });
}

/**
 * Find elements by text content
 * @param {Page} page - Puppeteer page instance
 * @param {string} searchText - Text to search for
 * @param {string} tagName - Tag name to filter by (optional)
 * @returns {Promise<Array>} Array of matching elements
 */
async function findElementsByText(page, searchText, tagName = null) {
    return await page.evaluate((args) => {
        const { searchText, tagName } = args;
        const elements = Array.from(document.querySelectorAll(tagName || '*'));
        return elements
            .filter(el => el.textContent.includes(searchText))
            .map(el => ({
                tagName: el.tagName,
                text: el.textContent.substring(0, 100),
                classes: Array.from(el.classList)
            }));
    }, { searchText, tagName });
}

/**
 * Check if page contains specific text
 * @param {Page} page - Puppeteer page instance
 * @param {Array<string>} textPatterns - Text patterns to search for
 * @returns {Promise<boolean>} True if any pattern is found
 */
async function pageContainsText(page, textPatterns) {
    const pageText = await page.evaluate(() => {
        return document.body.textContent || '';
    });

    return textPatterns.some(pattern => pageText.includes(pattern));
}

/**
 * Wait for an element to appear
 * @param {Page} page - Puppeteer page instance
 * @param {Array<string>} selectors - Selectors to check
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if element appeared
 */
async function waitForAnySelector(page, selectors, timeout = 30000) {
    try {
        await page.waitForFunction((args) => {
            const { selectors } = args;
            return selectors.some(selector => {
                const element = document.querySelector(selector);
                return element !== null && element.offsetParent !== null;
            });
        }, { timeout }, { selectors });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get page state information
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Page state information
 */
async function getPageState(page) {
    return await page.evaluate(() => {
        return {
            url: window.location.href,
            hasPasswordField: document.querySelector('input[type="password"]') !== null,
            hasTextField: document.querySelector('input[type="text"]') !== null,
            pageText: document.body.textContent.substring(0, 500)
        };
    });
}

module.exports = {
    trySelectors,
    typeInInput,
    clickButtonByText,
    findElementsByText,
    pageContainsText,
    waitForAnySelector,
    getPageState
};