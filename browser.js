/**
 * Browser Operations Module
 * Handles browser launching, configuration, and page setup
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const chalk = require('chalk');
const { VIEWPORT, USER_AGENT, BROWSER_ARGS } = require('./constants');

/**
 * Find Chrome executable on Windows if available
 * @returns {string|null}
 */
function getChromeExecutable() {
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
        return process.env.CHROME_PATH;
    }
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null
    ].filter(Boolean);

    for (const c of candidates) {
        if (fs.existsSync(c)) {
            return c;
        }
    }
    return null;
}

function getProfileDir() {
    const dir = path.join(__dirname, 'browser-profile');
    if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
}

const http = require('http');

/**
 * Check if remote debugging port is open (e.g. from buka-chrome.bat)
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortOpen(port) {
    return new Promise(resolve => {
        const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 800 }, res => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

/**
 * Remove stale Chrome profile locks if no Chrome process is actively holding them
 * @param {string} dir
 */
function cleanProfileLocks(dir) {
    if (!dir || !fs.existsSync(dir)) return;
    const lockFiles = [
        path.join(dir, 'lockfile'),
        path.join(dir, 'Default', 'LOCK'),
        path.join(dir, 'LOCK')
    ];
    for (const file of lockFiles) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                console.log(chalk.gray(`  ✓ Membersihkan file lock profil lama: ${path.basename(file)}`));
            }
        } catch (e) {
            // Process may be holding lock
        }
    }
}

/**
 * Launch and configure a browser instance
 * Uses saved AutomationProfile where user logged in
 * @param {boolean} headless - Whether to run in headless mode
 * @returns {Promise<Browser>} Configured browser instance
 */
async function launchBrowser(headless = false) {
    // 1. Cek jika user membuka Google Chrome resmi via buka-chrome.bat (Port 9222)
    if (await isPortOpen(9222)) {
        try {
            console.log(chalk.green('  ✓ Terdeteksi Chrome Port 9222 aktif! Menghubungkan ke browser...'));
            const browser = await puppeteer.connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: null
            });
            browser._isConnectedBrowser = true;
            return browser;
        } catch (e) {
            console.log(chalk.yellow(`  ⚠ Gagal menghubungkan ke port 9222: ${e.message}, meluncurkan browser baru...`));
        }
    }

    const chromeExecutable = getChromeExecutable();
    const profileDir = getProfileDir();

    // Bersihkan file lock basi jika proses Chrome sebelumnya terhenti
    cleanProfileLocks(profileDir);

    const launchArgs = [...BROWSER_ARGS];
    if (!headless) {
        launchArgs.push('--start-maximized', '--no-first-run');
    }

    const launchOptions = {
        headless: headless ? 'new' : false,
        ignoreDefaultArgs: ['--enable-automation'],
        userDataDir: profileDir,
        args: launchArgs,
        defaultViewport: null,
        windowsHide: false
    };

    if (chromeExecutable) {
        launchOptions.executablePath = chromeExecutable;
    }

    console.log(chalk.gray(`  → Menggunakan profil Chrome: ${profileDir}`));
    const browser = await puppeteer.launch(launchOptions);
    return browser;
}

/**
 * Create and configure a new page
 * @param {Browser} browser - Puppeteer browser instance
 * @param {number} timeout - Default timeout in milliseconds
 * @returns {Promise<Page>} Configured page instance
 */
async function createPage(browser, timeout = 30000) {
    const page = await browser.newPage();
    await page.setDefaultTimeout(timeout);
    await page.setViewport(VIEWPORT);
    await page.setUserAgent(USER_AGENT);
    await setupAntiDetection(page);

    try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        await client.send('Network.setCacheDisabled', { cacheDisabled: false });
    } catch (e) {}

    setupDialogHandler(page);
    return page;
}


/**
 * Configure anti-bot detection measures on a page
 * @param {Page} page - Puppeteer page instance
 */
async function setupAntiDetection(page) {
    await page.evaluateOnNewDocument(() => {
        // Overwrite navigator webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });

        // Overwrite Chrome detection
        window.chrome = {
            app: { isInstalled: false },
            runtime: {}
        };

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['id-ID', 'id', 'en-US', 'en']
        });

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
        });

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