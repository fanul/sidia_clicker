/**
 * Utility functions for SIDIA automation
 */

/**
 * Retry logic wrapper
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result of successful function call
 */
async function retry(fn, options = {}) {
    const {
        attempts = 10,
        delay = 3000,
        context = 'operation'
    } = options;

    let lastError;

    for (let i = 1; i <= attempts; i++) {
        try {
            const result = await fn();
            if (result) {
                return result;
            }
        } catch (error) {
            lastError = error;
            console.log(`  ⚠ Attempt ${i}/${attempts} failed for ${context}: ${error.message}`);
        }

        if (i < attempts) {
            await sleep(delay);
        }
    }

    throw new Error(`Failed after ${attempts} attempts for ${context}: ${lastError?.message}`);
}

/**
 * Dismiss any alerts, modals, or notifications that might interfere
 * @param {Page} page - Puppeteer page object
 */
async function dismissAlerts(page) {
    try {
        const dismissed = await page.evaluate(() => {
            let count = 0;

            // Close any modal dialogs
            const dialogs = document.querySelectorAll('[role="dialog"], .v-dialog, .modal, .v-overlay');
            dialogs.forEach(dialog => {
                // Look for close buttons
                const closeBtn = dialog.querySelector('button[aria-label="Close"], .close');
                if (closeBtn) {
                    closeBtn.click();
                    count++;
                }

                // Try clicking outside to close
                const overlay = dialog.querySelector('.v-overlay__scrim');
                if (overlay) {
                    overlay.click();
                    count++;
                }
            });

            // Close any alert notifications
            const alerts = document.querySelectorAll('.v-alert, .notification, .toast, [role="alert"]');
            alerts.forEach(alert => {
                const closeBtn = alert.querySelector('.close, [aria-label="Close"], button');
                if (closeBtn) {
                    closeBtn.click();
                    count++;
                }
            });

            return count;
        });

        if (dismissed > 0) {
            console.log(chalk.gray(`  → Dismissed ${dismissed} alert(s)/notification(s)`));
        }

        return dismissed > 0;
    } catch (error) {
        // Ignore errors when trying to dismiss alerts
        return false;
    }
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe type with multiple selector patterns
 * @param {Page} page - Puppeteer page object
 * @param {Array<string>} selectors - Array of selector patterns to try
 * @param {string} text - Text to type
 * @param {string} description - Description for logging
 * @returns {Promise<boolean>} - True if typing succeeded
 */
async function safeType(page, selectors, text, description = 'field') {
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.click(selector); // Focus the field
            await page.keyboard.type(text);
            console.log(`  ✓ Typed in ${description}`);
            return true;
        } catch (error) {
            // Try next selector
        }
    }
    return false;
}

/**
 * Safe click with multiple selector patterns
 * @param {Page} page - Puppeteer page object
 * @param {Array<string>} selectors - Array of selector patterns to try
 * @param {string} description - Description for logging
 * @returns {Promise<boolean>} - True if click succeeded
 */
async function safeClick(page, selectors, description = 'element') {
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.click(selector);
            console.log(`  ✓ Clicked ${description}`);
            return true;
        } catch (error) {
            // Try next selector
        }
    }
    return false;
}

/**
 * Safe type with multiple selector patterns
 * @param {Page} page - Puppeteer page object
 * @param {Array<string>} selectors - Array of selector patterns to try
 * @param {string} text - Text to type
 * @param {string} description - Description for logging
 * @returns {Promise<boolean>} - True if typing succeeded
 */
async function safeType(page, selectors, text, description = 'field') {
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            await page.click(selector); // Focus the field
            await page.keyboard.type(text);
            console.log(`  ✓ Typed in ${description}`);
            return true;
        } catch (error) {
            // Try next selector
        }
    }
    return false;
}

module.exports = {
    retry,
    sleep,
    safeClick,
    safeType,
    dismissAlerts
};
