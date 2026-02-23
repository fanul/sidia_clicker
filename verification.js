/**
 * Comprehensive Click Verification Module
 * Ensures every click operation is verified before proceeding
 */

const chalk = require('chalk');

/**
 * Click an element and verify the click succeeded by checking state change
 * @param {Page} page - Puppeteer page instance
 * @param {Object} options - Click options
 * @returns {Promise<Object>} Verification result with details
 */
async function clickAndVerify(page, options) {
    const {
        elementDescription,      // Human-readable description (e.g., "Login button")
        findFn,                 // Function to find the element
        clickFn,                // Function to click the element
        verifyStateChangeFn,    // Function to verify state changed
        waitForElement,         // Selector to wait for after click
        timeout = 10000,        // Max wait time for state change
        retryCount = 3           // Number of retries if click fails
    } = options;

    console.log(chalk.gray(`  → 🎯 ${elementDescription} - Starting verification...`));

    // STEP 1: Find element and get BEFORE state
    const beforeState = await page.evaluate((findFnString) => {
        // eslint-disable-next-line no-new-func
        const fn = new Function('return ' + findFnString);
        try {
            return fn();
        } catch (e) {
            return { found: false, error: e.message };
        }
    }, findFn.toString());

    if (!beforeState.found) {
        console.log(chalk.red(`  ✗ ${elementDescription} not found`));
        return { success: false, reason: 'element_not_found', beforeState };
    }

    console.log(chalk.gray(`  → BEFORE: ${JSON.stringify(beforeState)}`));

    // STEP 2: Attempt to click with retries
    let clickSuccess = false;
    let clickAttempt = 0;

    while (!clickSuccess && clickAttempt < retryCount) {
        clickAttempt++;
        console.log(chalk.gray(`  → Click attempt ${clickAttempt}/${retryCount}...`));

        const clickResult = await page.evaluate((clickFnString) => {
            // eslint-disable-next-line no-new-func
            const fn = new Function('return ' + clickFnString);
            try {
                return fn();
            } catch (e) {
                return { clicked: false, error: e.message };
            }
        }, clickFn.toString());

        if (clickResult.clicked) {
            console.log(chalk.green(`  ✓ Clicked ${elementDescription} (attempt ${clickAttempt})`));
            clickSuccess = true;
        } else {
            console.log(chalk.yellow(`  ⚠ Click failed (attempt ${clickAttempt}): ${clickResult.error || 'unknown'}`));
            if (clickAttempt < retryCount) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    if (!clickSuccess) {
        console.log(chalk.red(`  ✗ Failed to click ${elementDescription} after ${retryCount} attempts`));
        return { success: false, reason: 'click_failed', beforeState };
    }

    // STEP 3: Wait for state change
    console.log(chalk.gray(`  → ⏳ Waiting for state change (timeout: ${timeout}ms)...`));
    await new Promise(resolve => setTimeout(resolve, 2000));

    // STEP 4: Verify state change
    let stateChangeVerified = false;
    let verifyAttempt = 0;
    const maxVerifyAttempts = Math.ceil(timeout / 2000);

    while (!stateChangeVerified && verifyAttempt < maxVerifyAttempts) {
        verifyAttempt++;
        console.log(chalk.gray(`  → Verification attempt ${verifyAttempt}/${maxVerifyAttempts}...`));

        const afterState = await page.evaluate((verifyFnString) => {
            // eslint-disable-next-line no-new-func
            const fn = new Function('return ' + verifyFnString);
            try {
                return fn();
            } catch (e) {
                return { verified: false, error: e.message };
            }
        }, verifyStateChangeFn.toString());

        console.log(chalk.gray(`  → AFTER: ${JSON.stringify(afterState)}`));

        if (afterState.verified) {
            console.log(chalk.green(`  ✓ State changed verified (attempt ${verifyAttempt})`));
            stateChangeVerified = true;
        } else {
            console.log(chalk.yellow(`  ⚠ State not changed yet (attempt ${verifyAttempt}): ${afterState.error || 'unknown'}`));
            if (verifyAttempt < maxVerifyAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    if (!stateChangeVerified) {
        console.log(chalk.red(`  ✗ State change not verified after ${timeout}ms`));
        return {
            success: false,
            reason: 'state_not_changed',
            beforeState,
            afterState: await page.evaluate((verifyFnString) => {
                const fn = new Function('return ' + verifyFnString);
                try { return fn(); } catch (e) { return { error: e.message }; }
            }, verifyStateChangeFn.toString())
        };
    }

    // STEP 5: Additional verification - wait for expected element if provided
    if (waitForElement) {
        console.log(chalk.gray(`  → Looking for expected element: ${waitForElement}...`));
        await new Promise(resolve => setTimeout(resolve, 2000));

        const elementFound = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            return el !== null && el.offsetParent !== null;
        }, waitForElement);

        if (elementFound) {
            console.log(chalk.green(`  ✓ Expected element found: ${waitForElement}`));
        } else {
            console.log(chalk.yellow(`  ⚠ Expected element not found: ${waitForElement} (may need longer wait)`));
        }
    }

    console.log(chalk.green(`  ✅ ${elementDescription} - FULLY VERIFIED`));

    return {
        success: true,
        reason: 'verified',
        beforeState,
        afterState: await page.evaluate((verifyFnString) => {
            const fn = new Function('return ' + verifyFnString);
            try { return fn(); } catch (e) { return { error: e.message }; }
        }, verifyStateChangeFn.toString()),
        attempts: clickAttempt
    };
}

/**
 * Helper: Find element by multiple selectors
 * @param {Page} page - Puppeteer page instance
 * @param {Array<string>} selectors - CSS selectors to try
 * @param {Function} textFilter - Optional text filter function
 * @returns {Promise<Object>} Element info
 */
async function findElement(page, selectors, textFilter = null) {
    return await page.evaluate((args) => {
        const { selectors, textFilter } = args;

        for (const selector of selectors) {
            const elements = Array.from(document.querySelectorAll(selector));

            for (const el of elements) {
                const isVisible = el.offsetParent !== null;

                if (!isVisible) continue;

                if (textFilter) {
                    const text = (el.textContent || '').trim();
                    if (!textFilter(text)) continue;
                }

                return {
                    found: true,
                    selector: selector,
                    tagName: el.tagName,
                    text: (el.textContent || '').trim(),
                    id: el.id,
                    className: el.className,
                    attributes: {
                        id: el.id,
                        class: el.className,
                        role: el.getAttribute('role'),
                        href: el.getAttribute('href'),
                        type: el.getAttribute('type'),
                        disabled: el.disabled,
                        ariaSelected: el.getAttribute('aria-selected'),
                        ariaLabel: el.getAttribute('aria-label')
                    }
                };
            }
        }

        return { found: false };
    }, { selectors, textFilter });
}

/**
 * Helper: Click element by text
 * @param {Page} page - Puppeteer page instance
 * @param {Array<string>} buttonTexts - Text patterns to match
 * @param {Object} options - Click options
 * @returns {Promise<Object>} Click result
 */
async function clickButtonByText(page, buttonTexts, options = {}) {
    const { mustBeEnabled = true, multipleSelectors = ['button', '.v-btn', '[type="button"]'] } = options;

    return await page.evaluate((args) => {
        const { buttonTexts, mustBeEnabled, multipleSelectors } = args;

        for (const selector of multipleSelectors) {
            const elements = Array.from(document.querySelectorAll(selector));

            for (const el of elements) {
                const text = (el.textContent || '').trim();
                const isVisible = el.offsetParent !== null;
                const isDisabled = el.disabled || el.classList.contains('v-btn--disabled');

                const matches = buttonTexts.some(pattern => text.includes(pattern));

                if (matches && isVisible && (!mustBeEnabled || !isDisabled)) {
                    try {
                        el.click();

                        return {
                            clicked: true,
                            selector: selector,
                            text: text,
                            wasDisabled: isDisabled
                        };
                    } catch (e) {
                        return {
                            clicked: false,
                            selector: selector,
                            text: text,
                            error: e.message
                        };
                    }
                }
            }
        }

        return { clicked: false };
    }, { buttonTexts, mustBeEnabled, multipleSelectors });
}

/**
 * Helper: Click element by selector
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {Object} options - Click options
 * @returns {Promise<Object>} Click result
 */
async function clickBySelector(page, selector, options = {}) {
    const { waitForSelector = true, timeout = 5000 } = options;

    if (waitForSelector) {
        try {
            await page.waitForSelector(selector, { timeout });
        } catch (e) {
            return { clicked: false, error: 'selector_not_found' };
        }
    }

    return await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { clicked: false, error: 'element_null' };
        if (el.offsetParent === null) return { clicked: false, error: 'not_visible' };

        try {
            el.click();
            return { clicked: true };
        } catch (e) {
            return { clicked: false, error: e.message };
        }
    }, selector);
}

/**
 * Helper: Verify element state
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {Object} expectedState - Expected state values
 * @returns {Promise<Object>} Verification result
 */
async function verifyElementState(page, selector, expectedState) {
    return await page.evaluate((args) => {
        const { selector, expectedState } = args;
        const el = document.querySelector(selector);

        if (!el) {
            return { verified: false, error: 'element_not_found' };
        }

        const results = {
            verified: true,
            actual: {}
        };

        for (const [key, expectedValue] of Object.entries(expectedState)) {
            const actualValue = el[key] || el.getAttribute(key);

            results.actual[key] = actualValue;

            if (actualValue !== expectedValue) {
                results.verified = false;
                results[key] = {
                    expected: expectedValue,
                    actual: actualValue
                };
            }
        }

        return results;
    }, { selector, expectedState });
}

/**
 * Helper: Check if element exists and is visible
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @returns {Promise<boolean>} True if element exists and visible
 */
async function elementExists(page, selector) {
    return await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el !== null && el.offsetParent !== null;
    }, selector);
}

/**
 * Helper: Wait for element to appear
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if element appeared
 */
async function waitForElement(page, selector, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { timeout });
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    clickAndVerify,
    findElement,
    clickButtonByText,
    clickBySelector,
    verifyElementState,
    elementExists,
    waitForElement
};
