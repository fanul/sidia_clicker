/**
 * Session Management Module
 * Handles session persistence and recovery
 */

const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '.session');

/**
 * Ensure session directory exists
 */
function ensureSessionDir() {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
}

/**
 * Get storage data from page (localStorage or sessionStorage)
 * @param {Page} page - Puppeteer page instance
 * @param {string} storageType - 'localStorage' or 'sessionStorage'
 * @returns {Promise<Object|null>} Storage data
 */
async function getStorageData(page, storageType) {
    return await page.evaluate((type) => {
        try {
            const storage = window[type];
            const data = {};
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                data[key] = storage.getItem(key);
            }
            return data;
        } catch (e) {
            return null; // Storage not available
        }
    }, storageType);
}

/**
 * Set storage data on page
 * @param {Page} page - Puppeteer page instance
 * @param {string} storageType - 'localStorage' or 'sessionStorage'
 * @param {Object} data - Storage data to restore
 * @returns {Promise<void>}
 */
async function setStorageData(page, storageType, data) {
    await page.evaluate(({ type, data }) => {
        const storage = window[type];
        for (const [key, value] of Object.entries(data)) {
            storage.setItem(key, value);
        }
    }, { storageType, data });
}

/**
 * Save session data (cookies, localStorage, sessionStorage)
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} Success status
 */
async function saveSession(page) {
    try {
        ensureSessionDir();

        let savedItems = 0;

        // Save cookies
        try {
            const cookies = await page.cookies();
            fs.writeFileSync(
                path.join(SESSION_DIR, 'cookies.json'),
                JSON.stringify(cookies, null, 2)
            );
            console.log('  💾 Cookies saved');
            savedItems++;
        } catch (error) {
            console.log(`  ⚠ Could not save cookies: ${error.message}`);
        }

        // Save localStorage
        try {
            const localStorageData = await getStorageData(page, 'localStorage');
            if (localStorageData) {
                fs.writeFileSync(
                    path.join(SESSION_DIR, 'localStorage.json'),
                    JSON.stringify(localStorageData, null, 2)
                );
                console.log('  💾 localStorage saved');
                savedItems++;
            }
        } catch (error) {
            console.log(`  ⚠ Could not save localStorage: ${error.message}`);
        }

        // Save sessionStorage
        try {
            const sessionStorageData = await getStorageData(page, 'sessionStorage');
            if (sessionStorageData) {
                fs.writeFileSync(
                    path.join(SESSION_DIR, 'sessionStorage.json'),
                    JSON.stringify(sessionStorageData, null, 2)
                );
                console.log('  💾 sessionStorage saved');
                savedItems++;
            }
        } catch (error) {
            console.log(`  ⚠ Could not save sessionStorage: ${error.message}`);
        }

        if (savedItems > 0) {
            console.log('  ✓ Session data saved');
        }
        return true;
    } catch (error) {
        console.log(`  ⚠ Could not save session: ${error.message}`);
        return false;
    }
}

/**
 * Load session data (cookies, localStorage, sessionStorage)
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} Success status
 */
async function loadSession(page) {
    try {
        ensureSessionDir();

        let loadedItems = 0;

        // Load cookies
        const cookiesFile = path.join(SESSION_DIR, 'cookies.json');
        if (fs.existsSync(cookiesFile)) {
            const cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
            await page.setCookie(...cookies);
            console.log('  📂 Cookies loaded');
            loadedItems++;
        }

        // Load localStorage
        const localStorageFile = path.join(SESSION_DIR, 'localStorage.json');
        if (fs.existsSync(localStorageFile)) {
            const localStorage = JSON.parse(fs.readFileSync(localStorageFile, 'utf8'));
            await setStorageData(page, 'localStorage', localStorage);
            console.log('  📂 localStorage loaded');
            loadedItems++;
        }

        // Load sessionStorage
        const sessionStorageFile = path.join(SESSION_DIR, 'sessionStorage.json');
        if (fs.existsSync(sessionStorageFile)) {
            const sessionStorage = JSON.parse(fs.readFileSync(sessionStorageFile, 'utf8'));
            await setStorageData(page, 'sessionStorage', sessionStorage);
            console.log('  📂 sessionStorage loaded');
            loadedItems++;
        }

        if (loadedItems > 0) {
            console.log('  ✓ Session loaded successfully');
        }
        return loadedItems > 0;
    } catch (error) {
        console.log(`  ⚠ Could not load session: ${error.message}`);
        return false;
    }
}

module.exports = {
    saveSession,
    loadSession
};