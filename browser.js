/**
 * Browser Operations Module
 * Handles browser launching, configuration, and page setup
 */

const puppeteer = require('puppeteer');
const { VIEWPORT, USER_AGENT, BROWSER_ARGS } = require('./constants');

/**
 * Launch and configure a browser instance with anti-detection settings
 * @param {boolean} headless - Whether to run in headless mode
 * @returns {Promise<Browser>} Configured browser instance
 */
async function launchBrowser(headless = false) {
    const browser = await puppeteer.launch({
        headless,
        args: BROWSER_ARGS,
        defaultViewport: null
    });

    return browser;
}

/**
 * Create and configure a new page with anti-bot detection measures
 * @param {Browser} browser - Puppeteer browser instance
 * @param {number} timeout - Default timeout in milliseconds
 * @returns {Promise<Page>} Configured page instance
 */
async function createPage(browser, timeout = 30000) {
    const page = await browser.newPage();
    await page.setDefaultTimeout(timeout);

    // Set viewport to realistic size
    await page.setViewport(VIEWPORT);

    // Set realistic user agent
    await page.setUserAgent(USER_AGENT);

    // Enable anti-detection measures
    await setupAntiDetection(page);

    // Configure network settings
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: false });

    // Set up automatic dialog handling
    setupDialogHandler(page);

    return page;
}

/**
 * Configure anti-bot detection measures on a page
 * @param {Page} page - Puppeteer page instance
 */
async function setupAntiDetection(page) {
    await page.evaluateOnNewDocument(() => {
        // Overwrite navigator properties
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });

        // Overwrite Chrome detection
        window.chrome = {
            runtime: {}
        };

        // Overwrite permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    });
}

/**
 * Set up automatic dialog/alert handler
 * @param {Page} page - Puppeteer page instance
 */
function setupDialogHandler(page) {
    page.on('dialog', async (dialog) => {
        try {
            console.log(`  ⚠ Dialog detected: ${dialog.type()} - "${dialog.message()}"`);
            await dialog.accept();
            console.log('  ✓ Dialog dismissed');
        } catch (e) {
            console.log('  ✗ Could not dismiss dialog');
        }
    });
}

module.exports = {
    launchBrowser,
    createPage,
    setupAntiDetection,
    setupDialogHandler
};