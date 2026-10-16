/**
 * Login Module (Refactored)
 * Handles authentication and role selection
 * Now split into focused modules for better maintainability
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { sleep } = require('./utils');
const { SELECTORS, TEXT_PATTERNS, TIMING, RETRY_LIMITS } = require('./constants');
const { pageContainsText, getPageState } = require('./pageHelper');
const { traditionalType } = require('./clickHelper');
const { clickAndVerifyWithFallback, captureScreenshot, capturePageStructure } = require('./visualHelper');

// Import specialized modules
const { findRoleInputSelector, clickRoleInput } = require('./roleInput');
const { completeRoleSelection } = require('./roleSelection');
const { clickPilihButton } = require('./pilihButton');

/**
 * Inject saved session data (localStorage, sessionStorage, cookies)
 * Directly bypasses login page & reCAPTCHA v3
 * @param {Page} page
 * @param {Object} config
 * @returns {Promise<boolean>} true if successfully logged in via injected session
 */
async function injectSavedSession(page, config) {
    const sessionFile = path.join(__dirname, 'data', 'session.json');
    if (!fs.existsSync(sessionFile)) return false;

    try {
        const raw = fs.readFileSync(sessionFile, 'utf8');
        const session = JSON.parse(raw);
        if (!session || (!session.authToken && !session.authSikd && !session.cookies)) {
            return false;
        }

        console.log(chalk.cyan('  💉 Terdeteksi data/session.json! Menyuntikkan sesi aktif...'));

        // 1. Inject cookies if present
        if (session.cookies) {
            let cookieArr = [];
            const sanitizeCookie = (c) => {
                const item = {
                    name: String(c.name || ''),
                    value: String(c.value || ''),
                    url: 'https://sidia.bpjsketenagakerjaan.go.id'
                };
                if (c.path) item.path = c.path;
                if (typeof c.httpOnly === 'boolean') item.httpOnly = c.httpOnly;
                if (typeof c.secure === 'boolean') item.secure = c.secure;
                if (['Strict', 'Lax', 'None'].includes(c.sameSite)) {
                    item.sameSite = c.sameSite;
                }
                return item;
            };

            if (typeof session.cookies === 'string') {
                cookieArr = session.cookies.split(';').map(c => {
                    const parts = c.trim().split('=');
                    const name = parts[0];
                    const value = parts.slice(1).join('=');
                    return sanitizeCookie({ name, value });
                }).filter(c => c.name && c.value);
            } else if (Array.isArray(session.cookies)) {
                cookieArr = session.cookies.map(sanitizeCookie).filter(c => c.name && c.value);
            }

            if (cookieArr.length > 0) {
                try {
                    await page.setCookie(...cookieArr);
                    console.log(chalk.gray(`  ✓ ${cookieArr.length} cookie penting disuntikkan ke browser`));
                } catch (e) {
                    console.log(chalk.yellow(`  ⚠ setCookie info: ${e.message}`));
                }
            }
        }

        // 2. Open login page first to establish origin for localStorage
        await page.goto('https://sidia.bpjsketenagakerjaan.go.id/login', {
            waitUntil: 'domcontentloaded',
            timeout: 20000
        }).catch(() => {});

        // 3. Inject localStorage and sessionStorage
        await page.evaluate((data) => {
            for (const [key, val] of Object.entries(data)) {
                if (key === 'cookies') continue;
                const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                try {
                    localStorage.setItem(key, strVal);
                    sessionStorage.setItem(key, strVal);
                } catch (e) {}
            }
        }, session);

        console.log(chalk.green('  ✓ LocalStorage (authToken, authSikd) berhasil disuntikkan!'));

        // 4. Navigate to main page
        await page.goto(config.baseUrl || 'https://sidia.bpjsketenagakerjaan.go.id/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        await sleep(1500);

        const currentUrl = page.url();
        const hasLoginForm = (await page.$('input[type="password"]')) !== null;

        if (!currentUrl.includes('/login') && !hasLoginForm) {
            console.log(chalk.green(`  🎉 Berhasil masuk langsung via Sesi Terinjeksi! (${currentUrl})`));
            return true;
        } else {
            console.log(chalk.yellow('  ⚠ Sesi terinjeksi telah kedaluwarsa di server. Melanjutkan proses login normal...'));
            return false;
        }
    } catch (err) {
        console.log(chalk.yellow(`  ⚠ Gagal menyuntikkan sesi: ${err.message}`));
        return false;
    }
}

/**
 * Login to SIDIA system
 * @param {Page} page - Puppeteer page instance
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
async function login(page, config) {
    console.log(chalk.yellow('\n🔐 STEP 1: Checking authentication...'));

    // First, try injecting saved session from data/session.json
    if (await injectSavedSession(page, config)) {
        console.log(chalk.green('  ✓ Sesi aktif siap digunakan, melewati proses form login!'));
        return;
    }

    // Check if session is already active by visiting root URL
    try {
        console.log(chalk.gray('  → Checking if already logged in...'));
        await page.goto(config.baseUrl || 'https://sidia.bpjsketenagakerjaan.go.id/', {
            waitUntil: 'networkidle2',
            timeout: config.timeout || 30000
        });
        await sleep(1500);

        const currentUrl = page.url();
        const hasLoginForm = (await page.$('input[type="password"]')) !== null;

        // If not on /login and no password input, we are already logged in!
        if (!currentUrl.includes('/login') && !hasLoginForm) {
            console.log(chalk.green(`  ✓ Sesi login aktif! Berada di: ${currentUrl}`));
            return;
        }
    } catch (e) {
        console.log(chalk.yellow(`  ⚠ Error checking existing session: ${e.message}`));
    }

    // Navigate to login page if not logged in
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
        console.log(chalk.gray('  → Navigating to login page...'));
        await page.goto('https://sidia.bpjsketenagakerjaan.go.id/login', {
            waitUntil: 'networkidle2',
            timeout: config.timeout || 30000
        });
    }

    await sleep(2000);

    // Check if we're on the right page
    const pageInfo = await getPageState(page);
    console.log(chalk.gray(`  → Page URL: ${pageInfo.url}`));
    console.log(chalk.gray(`  → Has login form: ${pageInfo.hasLoginForm}`));

    // Enter username
    console.log(chalk.gray('  → Entering username...'));
    const usedUsernameSelector = await typeIntoField(page, SELECTORS.login.username, config.username, 'username');
    console.log(chalk.green(`  ✓ Username entered using: ${usedUsernameSelector}`));

    // Enter password
    console.log(chalk.gray('  → Entering password...'));
    const usedPasswordSelector = await typeIntoField(page, SELECTORS.login.password, config.password, 'password');
    console.log(chalk.green(`  ✓ Password entered using: ${usedPasswordSelector}`));

    // The LOGIN button stays disabled until both fields are accepted by the form
    await waitForLoginButtonEnabled(page);

    // Click login button
    const loginSuccess = await attemptLogin(page, config);

    if (!loginSuccess) {
        throw new Error('Login failed after multiple attempts');
    }

    console.log(chalk.green('  ✓ Login successful'));
}

/**
 * Type into the first selector that works and verify the field really holds the text
 * @param {Page} page - Puppeteer page instance
 * @param {string[]} selectors - Candidate selectors, tried in order
 * @param {string} text - Text to type
 * @param {string} label - Field name for messages (never logs the value)
 * @returns {Promise<string>} The selector that worked
 * @throws {Error} If no selector could be filled
 */
async function typeIntoField(page, selectors, text, label) {
    for (const selector of selectors) {
        const typed = await traditionalType(page, selector, text);
        if (!typed) {
            console.log(chalk.gray(`  → ${label}: selector not usable: ${selector}`));
            continue;
        }

        const length = await page.$eval(selector, el => el.value.length).catch(() => -1);
        if (length === text.length) {
            return selector;
        }
        console.log(chalk.yellow(`  ⚠ ${label}: field has ${length} characters after typing, expected ${text.length} (${selector})`));
    }
    throw new Error(`Could not fill the ${label} field on the login page (login form may have changed)`);
}

/**
 * Read visible error/notification text on the login page (wrong password, locked account, etc.)
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<string[]>} Distinct message texts
 */
async function getLoginMessages(page) {
    try {
        return await page.evaluate(() => {
            const nodes = document.querySelectorAll(
                '.v-alert, [role="alert"], .v-snack__content, .v-messages__message, .error--text, .red--text'
            );
            const texts = Array.from(nodes)
                .filter(n => n.offsetParent !== null)
                .map(n => (n.textContent || '').replace(/\s+/g, ' ').trim())
                .filter(t => t.length > 0 && t.length < 200);
            return Array.from(new Set(texts));
        });
    } catch (e) {
        return [];
    }
}

/**
 * Wait until the LOGIN button is enabled (best effort, max ~8s)
 */
async function waitForLoginButtonEnabled(page) {
    try {
        await page.waitForFunction((texts) => {
            const btn = Array.from(document.querySelectorAll('button, .v-btn, [type="submit"]'))
                .find(b => texts.some(t => (b.textContent || '').includes(t)));
            return !!btn && !btn.disabled && !btn.classList.contains('v-btn--disabled');
        }, { timeout: 8000 }, SELECTORS.login.loginButtonText);
    } catch (e) {
        console.log(chalk.yellow('  ⚠ Tombol LOGIN masih nonaktif setelah form diisi - lanjut mencoba klik'));
    }
}

/**
 * Is a reCAPTCHA image challenge (bframe) currently visible on screen?
 */
async function hasCaptchaChallenge(page) {
    return page.evaluate(() => Array.from(document.querySelectorAll('iframe[src*="recaptcha"]')).some(f => {
        if (!/bframe/.test(f.src)) return false;
        const r = f.getBoundingClientRect();
        return r.width >= 200 && r.height >= 200 && r.top > -100 && getComputedStyle(f).visibility !== 'hidden';
    }));
}

/**
 * Wait for a person to solve the reCAPTCHA challenge in the visible browser window.
 * The challenge is never solved or bypassed by this script.
 * @returns {Promise<boolean>} true once the page has left /login
 */
async function waitForManualCaptcha(page, config) {
    if (config.headless) {
        throw new Error('reCAPTCHA menampilkan tantangan gambar yang harus diselesaikan manual. Jalankan dengan browser terlihat (HEADLESS=False) lalu selesaikan tantangannya.');
    }

    const maxWaitMs = (parseInt(process.env.CAPTCHA_WAIT_MINUTES, 10) || 5) * 60 * 1000;
    console.log(chalk.yellow('\n  🧩 reCAPTCHA meminta verifikasi gambar.'));
    console.log(chalk.yellow(`  👉 Selesaikan di jendela browser yang terbuka (maks ${Math.round(maxWaitMs / 60000)} menit). Skrip lanjut otomatis setelah login berhasil.\n`));

    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        await sleep(2000);
        if (!page.url().includes('/login')) return true;
        const err = await readLoginError(page);
        if (err) {
            throw new Error(`SIDIA menolak login: "${err}".`);
        }
    }
    return false;
}

/**
 * Read visible error or alert text from the login page
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<string|null>}
 */
async function readLoginError(page) {
    return page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('.v-snack__content, .v-snack__wrapper, .v-alert, [role="alert"], .error--text, .red--text'));
        for (const el of nodes) {
            const raw = (el.textContent || el.innerText || '').replace(/\bTutup\b/g, '').trim();
            if (raw.length > 0 && raw.length < 200) {
                return raw;
            }
        }
        return null;
    });
}

/**
 * Check if the error indicates a true credential or account lock failure
 * (reCAPTCHA and 'Token tidak valid' are retriable by clicking repeatedly)
 * @param {string|null} errorText
 * @returns {boolean}
 */
function isFatalLoginError(errorText) {
    if (!errorText) return false;
    const lower = errorText.toLowerCase();

    // ReCaptcha and Token tidak valid are NOT fatal - can be retried by clicking repeatedly
    if (lower.includes('token tidak valid') || lower.includes('recaptcha') || lower.includes('token')) {
        return false;
    }

    const fatalKeywords = [
        'password salah',
        'kata sandi salah',
        'tidak sesuai',
        'tidak terdaftar',
        'diblokir',
        'dinonaktifkan',
        'terkunci',
        'tidak aktif'
    ];
    return fatalKeywords.some(kw => lower.includes(kw));
}

/**
 * Click the login button using trusted CDP mouse events or Enter key
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<{clicked: boolean, method?: string}>}
 */
async function performLoginClick(page) {
    // 1. Trigger Enter key on password input (Paling konsisten di formulir Vuetify SIDIA)
    for (const selector of SELECTORS.login.password) {
        try {
            await page.focus(selector);
            await page.keyboard.press('Enter');
            break;
        } catch (e) {}
    }

    // 2. Native CDP click on LOGIN / submit button
    try {
        const btnHandle = await page.evaluateHandle((buttonTexts) => {
            const buttons = Array.from(document.querySelectorAll('button, .v-btn, input[type="submit"]'));
            return buttons.find(b => {
                const txt = (b.textContent || b.innerText || b.value || '').trim().toUpperCase();
                const matches = buttonTexts.some(t => txt.includes(t.toUpperCase()));
                const isSubmit = b.type === 'submit' || b.classList.contains('btn-login');
                const isEnabled = !b.disabled && !b.classList.contains('v-btn--disabled') && b.offsetParent !== null;
                return (matches || isSubmit) && isEnabled;
            });
        }, SELECTORS.login.loginButtonText);

        const btnElement = btnHandle.asElement();
        if (btnElement) {
            const box = await btnElement.boundingBox();
            if (box) {
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 50 });
                return { clicked: true, method: 'cdp_click' };
            }
            await btnElement.click();
            return { clicked: true, method: 'element_click' };
        }
    } catch (e) {}

    // 3. Fallback: DOM click
    try {
        const domClicked = await page.evaluate((buttonTexts) => {
            const buttons = Array.from(document.querySelectorAll('button, .v-btn, input[type="submit"]'));
            const target = buttons.find(b => {
                const txt = (b.textContent || b.innerText || b.value || '').trim().toUpperCase();
                return buttonTexts.some(t => txt.includes(t.toUpperCase())) && !b.disabled && !b.classList.contains('v-btn--disabled');
            });
            if (target) {
                target.click();
                return true;
            }
            return false;
        }, SELECTORS.login.loginButtonText);

        if (domClicked) {
            return { clicked: true, method: 'dom_click' };
        }
    } catch (e) {}

    return { clicked: true, method: 'enter' };
}

/**
 * Attempt login with repeated click retry for reCAPTCHA bypass
 * @param {Page} page - Puppeteer page instance
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} True if login successful
 */
/**
 * Attempt login with persistent repeated clicks to bypass reCAPTCHA
 * @param {Page} page - Puppeteer page instance
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} True if login successful
 */
async function attemptLogin(page, config = {}) {
    console.log(chalk.cyan('\n  ============================================================'));
    console.log(chalk.cyan('  👉 Jendela browser terhubung ke SIDIA.'));
    console.log(chalk.cyan('  👉 Skrip mencoba submit formulir & bypass token/reCAPTCHA secara otomatis.'));
    console.log(chalk.cyan('  👉 Jika browser terlihat di layar, Anda juga dapat mengklik LOGIN jika diperlukan.'));
    console.log(chalk.cyan('  👉 Begitu berhasil masuk, otomasi langsung lanjut secara otomatis!'));
    console.log(chalk.cyan('  ============================================================\n'));

    let loginAttempts = 0;
    const maxAttempts = 120; // Hingga 120 percobaan (~4-5 menit)

    while (loginAttempts < maxAttempts) {
        loginAttempts++;

        // 1. Cek apakah halaman sudah berpindah dari login
        const currentUrl = page.url();
        const hasPasswordField = (await page.$('input[type="password"]')) !== null;
        if (!currentUrl.includes('/login') || !hasPasswordField) {
            console.log(chalk.green(`\n  ✓ Login berhasil pada percobaan ke-${loginAttempts}! URL: ${currentUrl}`));
            return true;
        }

        // 2. Eksekusi Login Click / Submit menggunakan multiple robust strategies
        const clickResult = await performLoginClick(page);
        console.log(chalk.yellow(`  → Mencoba LOGIN (percobaan ke-${loginAttempts})${clickResult.method ? ` [${clickResult.method}]` : ''}...`));

        // 3. Monitor URL setiap 250ms selama 2.5 detik
        for (let wait = 0; wait < 10; wait++) {
            await sleep(250);
            const checkUrl = page.url();
            const checkPass = (await page.$('input[type="password"]')) !== null;
            if (!checkUrl.includes('/login') || !checkPass) {
                console.log(chalk.green(`\n  ✓ Login berhasil! Melanjutkan otomatis... URL: ${checkUrl}`));
                return true;
            }
        }

        // 4. Periksa dan laporkan notifikasi error dari SIDIA jika ada
        const loginError = await readLoginError(page);
        if (loginError) {
            console.log(chalk.yellow(`  ⚠ Notifikasi SIDIA: "${loginError}"`));
            if (isFatalLoginError(loginError)) {
                throw new Error(`SIDIA menolak login: "${loginError}". Periksa kredensial di file .env.`);
            }

            // Jika Token tidak valid, refresh halaman agar reCAPTCHA men-generate token baru
            if (loginError.toLowerCase().includes('token tidak valid')) {
                console.log(chalk.yellow('  🔄 Token reCAPTCHA kadaluwarsa. Memuat ulang halaman login untuk mendapatkan token baru...'));
                await sleep(1000);
                try {
                    await page.reload({ waitUntil: 'networkidle2' });
                    await sleep(2000);
                    await fillField(page, SELECTORS.login.username, config.username);
                    await fillField(page, SELECTORS.login.password, config.password);
                    await waitForLoginButtonEnabled(page);
                    await sleep(1200);
                } catch (e) {
                    console.log(chalk.gray(`  → Reload status: ${e.message}`));
                }
            }
        }

        // 5. Cek tantangan visual reCAPTCHA (bframe)
        const hasChallenge = await hasCaptchaChallenge(page);
        if (hasChallenge) {
            if (config.headless) {
                throw new Error('reCAPTCHA menampilkan tantangan gambar (bframe). Hilangkan centang Headless Mode di dashboard lalu selesaikan tantangannya di layar.');
            } else {
                console.log(chalk.cyan('  🧩 reCAPTCHA meminta tantangan gambar. Silakan selesaikan di jendela browser yang terbuka...'));
                await sleep(3000);
            }
        }

        // 6. Tangkapan layar diagnostik berkala
        if (loginAttempts === 3 || loginAttempts === 8) {
            try {
                if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots', { recursive: true });
                await page.screenshot({ path: `screenshots/login_attempt_${loginAttempts}.png` });
            } catch (e) {}
        }
    }

    throw new Error('Batas waktu login habis setelah 120 percobaan. Silakan coba kembali.');
}

/**
 * Check login page state
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Page state information
 */
async function checkLoginPageState(page) {
    try {
        const currentUrl = page.url();
        const pageInfo = await getPageState(page);
        const needsLogout = await pageContainsText(page, TEXT_PATTERNS.logoutMessages);

        return {
            isOnLoginPage: currentUrl.includes('/login'),
            url: currentUrl,
            pageInfo: pageInfo,
            needsLogout: needsLogout
        };
    } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not check login page state: ${error.message}`));
        return {
            isOnLoginPage: true,
            url: page.url(),
            pageInfo: {},
            needsLogout: false
        };
    }
}

/**
 * Handle logout if needed
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<void>}
 */
async function handleLogout(page) {
    console.log(chalk.yellow('  → Need to logout first...'));
    await page.evaluate(() => {
        const logoutBtn = Array.from(document.querySelectorAll('button, .v-btn, a')).find(btn =>
            (btn.textContent || '').includes('Logout') ||
            (btn.textContent || '').includes('Keluar')
        );
        if (logoutBtn) {
            logoutBtn.click();
        }
    });
    await sleep(3000);
    await page.goto('https://sidia.bpjsketenagakerjaan.go.id/login', {
        waitUntil: 'networkidle2',
        timeout: 15000
    });
}

/**
 * Select role after login
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<void>}
 */
async function selectRole(page) {
    console.log(chalk.yellow('\n👤 STEP 2: Selecting Role...'));

    // Wait a bit for navigation after login
    await sleep(3000);

    // Check current URL
    const currentUrl = page.url();
    console.log(chalk.gray(`  → Current URL: ${currentUrl}`));

    // CAPTURE: Take screenshot AND HTML structure of role page
    await captureScreenshot(page, 'role_page_initial');
    await capturePageStructure(page, 'role_page_initial');

    // Check if we're on the role selection page
    const onRolePage = currentUrl.includes('/role') || currentUrl.includes('/select-role');

    // Also check for PILIH ROLE title in the page
    const hasRoleTitle = await page.evaluate(() => {
        const title = document.querySelector('.v-toolbar__title');
        return title && title.textContent.includes('PILIH ROLE');
    });

    // CRITICAL: Check if we're already logged in with a role selected
    const alreadyLoggedIn = await page.evaluate(() => {
        // Check if we're on dashboard or main page (not role, not login)
        const currentUrl = window.location.href;
        const hasMainMenu = document.querySelector('.v-list-item, [role="navigation"]') !== null;
        const hasNaskahMasuk = Array.from(document.querySelectorAll('*')).some(el =>
            el.textContent && el.textContent.includes('Naskah Masuk')
        );

        return {
            notOnLoginOrRole: !currentUrl.includes('/login') && !currentUrl.includes('/role'),
            hasMainMenu: hasMainMenu,
            hasNaskahMasuk: hasNaskahMasuk
        };
    });

    console.log(chalk.gray(`  → Login check: ${JSON.stringify(alreadyLoggedIn)}`));

    // If already logged in with role selected, skip role selection
    if (alreadyLoggedIn.notOnLoginOrRole && alreadyLoggedIn.hasMainMenu) {
        console.log(chalk.green('  ✓ Already logged in with role selected'));
        console.log(chalk.gray('  → Skipping role selection'));
        return;
    }

    if (!onRolePage && !hasRoleTitle) {
        // Try to navigate to role page
        console.log(chalk.yellow('  ⚠ Not on role selection page, trying to navigate...'));
        try {
            await page.goto('https://sidia.bpjsketenagakerjaan.go.id/role', {
                waitUntil: 'networkidle2',
                timeout: 15000
            });
            await sleep(3000);
            console.log(chalk.green('  ✓ Navigated to role selection page'));
        } catch (error) {
            console.log(chalk.yellow(`  ⚠ Could not navigate to role page: ${error.message}`));
            console.log(chalk.gray('  ℹ May already have a role selected'));
            return;
        }
    } else {
        console.log(chalk.green('  ✓ On role selection page'));
    }

    // Verify we're on the right page
    const pageCheck = await page.evaluate(() => {
        const title = document.querySelector('.v-toolbar__title');
        const hasInput = document.querySelector('input[type="text"]');
        return {
            title: title ? title.textContent : '',
            hasInputField: hasInput !== null
        };
    });

    console.log(chalk.gray(`  → Page title: "${pageCheck.title}"`));
    console.log(chalk.gray(`  → Has input field: ${pageCheck.hasInputField}`));

    // STEP 1: Find and click the role input field
    const roleInputSelector = await findRoleInputSelector(page);
    if (!roleInputSelector) {
        return;
    }

    // Click the input field
    const inputClicked = await clickRoleInput(page, roleInputSelector);
    if (!inputClicked) {
        return;
    }

    // STEP 2: Select role option (PSTFF or first available)
    const selectionResult = await completeRoleSelection(page, roleInputSelector);
    if (!selectionResult.success) {
        console.log(chalk.red(`  ✗ Role selection failed: ${selectionResult.error}`));
        return;
    }

    // STEP 3: Click PILIH button
    const pilihResult = await clickPilihButton(page);
    if (!pilihResult.success) {
        console.log(chalk.red(`  ✗ PILIH button click failed: ${pilihResult.error}`));
        console.log(chalk.gray('  ℹ Continuing anyway - role might already be selected'));
    }
}

module.exports = {
    login,
    selectRole
};