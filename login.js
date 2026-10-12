/**
 * Login Module (Refactored)
 * Handles authentication and role selection
 * Now split into focused modules for better maintainability
 */

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
 * Login to SIDIA system
 * @param {Page} page - Puppeteer page instance
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
async function login(page, config) {
    console.log(chalk.yellow('\n🔐 STEP 1: Logging in...'));

    // Navigate to login page if needed
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
        console.log(chalk.gray('  → Navigating to login page...'));
        await page.goto('https://sidia.bpjsketenagakerjaan.go.id/login', {
            waitUntil: 'networkidle2',
            timeout: config.timeout || 30000
        });
    }

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

    // Click login button
    const loginSuccess = await attemptLogin(page);

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
 * Attempt login with retry logic using comprehensive click verification with visual fallback
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<boolean>} True if login successful
 */
async function attemptLogin(page) {
    console.log(chalk.gray('  → Clicking login button...'));

    let loginSuccess = false;
    let loginAttempts = 0;

    while (!loginSuccess && loginAttempts < RETRY_LIMITS.LOGIN_ATTEMPTS) {
        loginAttempts++;
        console.log(chalk.gray(`  → Login attempt ${loginAttempts}/${RETRY_LIMITS.LOGIN_ATTEMPTS}...`));

        // Check for reCAPTCHA or other blocking elements
        const pageCheck = await page.evaluate(() => {
            const hasRecaptcha = document.querySelector('.grecaptcha-badge') !== null ||
                               document.querySelector('[src*="recaptcha"]') !== null;
            const hasOverlay = document.querySelector('.v-overlay') !== null;
            const hasSnackbar = document.querySelector('.v-snack__wrapper[style*="display: none"]') === null &&
                               document.querySelector('.v-snack__wrapper') !== null;

            return {
                hasRecaptcha: hasRecaptcha,
                hasOverlay: hasOverlay,
                hasVisibleSnackbar: hasSnackbar
            };
        });

        console.log(chalk.gray(`  → Page check: recaptcha=${pageCheck.hasRecaptcha}, overlay=${pageCheck.hasOverlay}, snackbar=${pageCheck.hasVisibleSnackbar}`));

        if (pageCheck.hasVisibleSnackbar) {
            console.log(chalk.yellow('  ⚠ Found visible snackbar/notification - may need to dismiss'));
            // Try to dismiss any notifications
            await page.evaluate(() => {
                const snackbar = document.querySelector('.v-snack__wrapper');
                if (snackbar) {
                    snackbar.style.display = 'none';
                }
            });
            await sleep(1000);
        }

        // Use comprehensive verification with visual fallback for login button click
        const result = await clickAndVerifyWithFallback(page, {
            elementDescription: 'Login button',
            findFn: () => {
                const buttons = Array.from(document.querySelectorAll('button, .v-btn, [type="submit"]'));
                const loginBtn = buttons.find(btn =>
                    SELECTORS.login.loginButtonText.some(text =>
                        (btn.textContent || '').includes(text)
                    )
                );
                return {
                    found: loginBtn !== null,
                    text: loginBtn ? (loginBtn.textContent || '').trim() : null,
                    disabled: loginBtn ? (loginBtn.disabled || loginBtn.classList.contains('v-btn--disabled')) : null
                };
            },
            clickFn: () => {
                const buttons = Array.from(document.querySelectorAll('button, .v-btn, [type="submit"]'));
                const loginBtn = buttons.find(btn =>
                    SELECTORS.login.loginButtonText.some(text =>
                        (btn.textContent || '').includes(text)
                    )
                );
                if (loginBtn && !loginBtn.disabled && !loginBtn.classList.contains('v-btn--disabled')) {
                    loginBtn.click();
                    return { clicked: true };
                }
                return { clicked: false };
            },
            verifyStateChangeFn: () => {
                const currentUrl = window.location.href;
                const hasPasswordField = document.querySelector('input[type="password"]') !== null;
                return {
                    verified: !currentUrl.includes('/login') || !hasPasswordField,
                    url: currentUrl,
                    hasPasswordField: hasPasswordField
                };
            },
            timeout: 15000,
            retryCount: 3
        });

        if (result.success) {
            if (result.method === 'fallback') {
                console.log(chalk.green(`  ✓ Login button clicked via FALLBACK: ${result.recommendation}`));
            } else {
                console.log(chalk.green(`  ✓ Login button clicked (attempt ${loginAttempts})`));
            }

            // CRITICAL: Wait longer for navigation and reCAPTCHA
            console.log(chalk.gray('  → Waiting for navigation and reCAPTCHA...'));
            await sleep(5000);

            // Check if we're still on login page
            const currentUrl = page.url();
            console.log(chalk.gray(`  → Current URL after wait: ${currentUrl}`));

            if (currentUrl.includes('/login')) {
                console.log(chalk.yellow('  ⚠ Still on login page after click, waiting longer...'));
                await sleep(5000);

                const recheckUrl = page.url();
                console.log(chalk.gray(`  → Recheck URL: ${recheckUrl}`));

                if (!recheckUrl.includes('/login')) {
                    console.log(chalk.green(`  ✓ Login successful (attempt ${loginAttempts})`));
                    loginSuccess = true;
                } else {
                    console.log(chalk.yellow('  → Still on login page, retrying...'));
                    const messages = await getLoginMessages(page);
                    if (messages.length > 0) {
                        console.log(chalk.red(`  ✗ Message on login page: ${messages.join(' | ')}`));
                        console.log(chalk.yellow('  → Check username/password in the dashboard Pengaturan panel'));
                    }
                }
            } else {
                console.log(chalk.green(`  ✓ Login successful (attempt ${loginAttempts})`));
                console.log(chalk.gray(`  → Final URL: ${currentUrl}`));
                loginSuccess = true;
            }
        } else {
            console.log(chalk.yellow(`  → Login click verification failed: ${result.reason}`));

            // Show analysis if available
            if (result.analysis) {
                console.log(chalk.gray('  → Page analysis available in screenshots directory'));
            }

            // Check if we need to logout
            const pageState = await checkLoginPageState(page);
            if (pageState.needsLogout) {
                await handleLogout(page);
            } else if (loginAttempts < RETRY_LIMITS.LOGIN_ATTEMPTS) {
                console.log(chalk.gray('  → Retrying...'));
                await sleep(2000);
            }
        }
    }

    return loginSuccess;
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