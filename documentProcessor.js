/**
 * Document Processor Module
 * Handles processing of individual documents with comprehensive verification
 */

const chalk = require('chalk');
const { sleep } = require('./utils');
const { clickAndVerify } = require('./verification');

/**
 * Smart button finder - searches for buttons using multiple strategies
 * @param {Page} page - Puppeteer page instance
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Button finding result
 */
async function findButtonSmart(page, options) {
    const {
        buttonText,           // Text to search for (exact or includes)
        searchType = 'includes', // 'exact' or 'includes'
        mustBeEnabled = true,  // Button must be enabled
        mustBeVisible = true,  // Button must be visible
        timeout = 8000,        // How long to wait for button to appear
        searchScope = null     // CSS selector for search scope (null = entire page)
    } = options;

    console.log(chalk.gray(`🔍 Smart find: "${buttonText}" (${searchType})...`));

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const searchResult = await page.evaluate((searchOptions) => {
                const {
                    buttonText,
                    searchType,
                    mustBeEnabled,
                    mustBeVisible,
                    searchScope
                } = searchOptions;

                // Determine search scope
                const scope = searchScope ? document.querySelector(searchScope) : document;
                if (!scope) return { found: false, reason: 'scope_not_found' };

                // Find all buttons
                const buttons = Array.from(scope.querySelectorAll('button, .v-btn, [type="button"], [role="button"]'));

                for (const btn of buttons) {
                    const text = (btn.textContent || '').trim();
                    const isVisible = btn.offsetParent !== null;
                    const isEnabled = !btn.disabled && !btn.classList.contains('v-btn--disabled');

                    // Check visibility and enabled requirements
                    if (mustBeVisible && !isVisible) continue;
                    if (mustBeEnabled && !isEnabled) continue;

                    // Check text match
                    const textMatches = searchType === 'exact'
                        ? text === buttonText
                        : text.includes(buttonText);

                    if (textMatches) {
                        return {
                            found: true,
                            text: text,
                            isVisible: isVisible,
                            isEnabled: isEnabled
                        };
                    }
                }

                return { found: false, reason: 'no_match' };
            }, { buttonText, searchType, mustBeEnabled, mustBeVisible, searchScope });

            if (searchResult.found) {
                console.log(chalk.green(`✅ Found button: "${searchResult.text}"`));
                return searchResult;
            }

            // Wait a bit before retrying
            await sleep(500);

        } catch (error) {
            console.log(chalk.yellow(`⚠ Search attempt failed: ${error.message}, retrying...`));
            await sleep(1000);
        }
    }

    console.log(chalk.yellow(`⚠ Button "${buttonText}" not found after ${timeout}ms`));
    return { found: false, reason: 'timeout' };
}

/**
 * Process a single document - Using comprehensive verification for every operation
 * @param {Page} page - Puppeteer page instance
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} True if processed successfully
 */
async function processSingleDocument(page, config) {
    try {
        console.log(chalk.gray('      📄 Processing document...'));

        // STEP 1: Click "Lihat" button
        const lihatResult = await clickLihatButton(page);
        if (!lihatResult.success) {
            return false;
        }

        console.log(chalk.green('      ✓ Lihat button clicked successfully'));

        // STEP 2: Wait for page navigation after Lihat click
        console.log(chalk.gray('      → Waiting for page navigation after Lihat click...'));
        await sleep(3000); // Give time for page navigation

        // Check current URL to confirm navigation
        const currentUrl = page.url();
        console.log(chalk.gray(`      → Current URL: ${currentUrl}`));

        // STEP 3: Wait for and click Feedback button
        console.log(chalk.gray('      → Waiting for Feedback button to appear...'));

        const feedbackButton = await findButtonSmart(page, {
            buttonText: 'Feedback',
            searchType: 'includes',
            mustBeEnabled: true,
            mustBeVisible: true,
            timeout: 10000  // Give it more time to appear (10 seconds)
        });

        if (!feedbackButton.found) {
            console.log(chalk.red('      ✗ Feedback button not found'));
            // DEBUGGING: Screenshots disabled by default, enable via ENABLE_SCREENSHOTS=true
            // console.log(chalk.gray('      → Taking screenshot for debugging...'));

            // Capture debug info
            const pageContent = await page.evaluate(() => {
                const allButtons = Array.from(document.querySelectorAll('button, .v-btn, [type="button"]'));
                return {
                    buttonCount: allButtons.length,
                    firstButtons: allButtons.slice(0, 15).map(btn => ({
                        text: (btn.textContent || '').trim(),
                        disabled: btn.disabled,
                        visible: btn.offsetParent !== null
                    })),
                    pageText: document.body.textContent.substring(0, 500)
                };
            });

            console.log(chalk.gray('      → Page content:', JSON.stringify(pageContent, null, 2)));

            return false;
        }

        console.log(chalk.green('      ✓ Feedback button found, clicking...'));

        // Click the feedback button
        const feedbackClickResult = await clickButtonSmart('Feedback', page);
        if (!feedbackClickResult.success) {
            console.log(chalk.red('      ✗ Failed to click Feedback button'));
            return false;
        }

        console.log(chalk.green('      ✓ Feedback button clicked successfully'));
        await sleep(2000);

        // STEP 4: Fill textarea with feedback text
        console.log(chalk.gray('      → Looking for textarea to fill feedback...'));

        // Wait for textarea to appear
        let textareaFound = false;
        let textareaAttempts = 0;
        const maxTextareaAttempts = 10;

        while (!textareaFound && textareaAttempts < maxTextareaAttempts) {
            textareaAttempts++;
            console.log(chalk.gray(`      → Textarea search attempt ${textareaAttempts}/${maxTextareaAttempts}...`));

            const textareaCheck = await page.evaluate(() => {
                const textarea = document.querySelector('textarea');
                if (!textarea) return { found: false };

                return {
                    found: true,
                    visible: textarea.offsetParent !== null,
                    id: textarea.id,
                    name: textarea.name,
                    placeholder: textarea.placeholder,
                    value: textarea.value
                };
            });

            if (textareaCheck.found && textareaCheck.visible) {
                textareaFound = true;
                console.log(chalk.green(`      ✓ Textarea found: ${textareaCheck.id || textareaCheck.name}`));

                // Fill the textarea with the required text
                const feedbackText = "Dipedomani dan dilaksanakan";
                console.log(chalk.gray(`      → Filling textarea with: "${feedbackText}"`));

                // First, focus the textarea using JavaScript
                await page.evaluate(() => {
                    const textarea = document.querySelector('textarea');
                    if (textarea) {
                        textarea.click();
                        textarea.focus();
                    }
                });

                await sleep(500);

                // Use Puppeteer's type method for more reliable Vue.js reactivity
                try {
                    // Clear any existing content first
                    await page.evaluate(() => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                            textarea.value = '';
                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    });

                    await sleep(200);

                    // Type the text character by character using Puppeteer
                    await page.type('textarea', feedbackText, { delay: 50 });

                    console.log(chalk.green('      ✓ Textarea filled using Puppeteer type method'));

                } catch (typeError) {
                    console.log(chalk.yellow(`      ⚠ Puppeteer type failed, trying JavaScript method: ${typeError.message}`));

                    // Fallback to JavaScript method
                    await page.evaluate((text) => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                            textarea.click();
                            textarea.focus();
                            textarea.value = '';
                            textarea.value = text;

                            // Trigger comprehensive Vue.js events
                            const events = ['input', 'change', 'blur', 'keydown', 'keyup', 'keypress'];
                            events.forEach(eventName => {
                                textarea.dispatchEvent(new Event(eventName, { bubbles: true }));
                            });

                            return { filled: true, value: textarea.value };
                        }
                        return { filled: false };
                    }, feedbackText);
                }

                await sleep(1000);

                // Verify the text was filled
                const verifyFill = await page.evaluate(() => {
                    const textarea = document.querySelector('textarea');
                    return textarea ? textarea.value : '';
                });

                if (verifyFill.includes(feedbackText)) {
                    console.log(chalk.green(`      ✓ Textarea verified with: "${verifyFill}"`));
                } else {
                    console.log(chalk.yellow(`      ⚠ Textarea value: "${verifyFill}" (expected: "${feedbackText}")`));

                    // Try one more time with direct value setting
                    console.log(chalk.gray('      → Attempting direct value setting...'));
                    await page.evaluate((text) => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                            textarea.value = text;
                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            textarea.dispatchEvent(new Event('change', { bubbles: true }));
                            textarea.dispatchEvent(new Event('blur', { bubbles: true }));

                            // Also try triggering on parent elements
                            let parent = textarea.parentElement;
                            while (parent) {
                                parent.dispatchEvent(new Event('input', { bubbles: true }));
                                parent = parent.parentElement;
                            }
                        }
                    }, feedbackText);

                    await sleep(500);

                    // Final verification
                    const finalVerify = await page.evaluate(() => {
                        const textarea = document.querySelector('textarea');
                        return textarea ? textarea.value : '';
                    });

                    console.log(chalk.gray(`      → Final textarea value: "${finalVerify}"`));
                }

                break;
            } else {
                console.log(chalk.yellow(`      → Textarea not visible yet, waiting...`));
                await sleep(1000);
            }
        }

        if (!textareaFound) {
            console.log(chalk.red('      ✗ Textarea not found after 10 attempts'));
            return false;
        }

        // STEP 5: Wait a moment for Simpan button to become available
        console.log(chalk.gray('      → Waiting for Simpan button to become available...'));
        await sleep(3000);

        // Add debugging to check current page state
        const pageState = await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const allButtons = Array.from(document.querySelectorAll('button, .v-btn, [type="button"]'));
            const simpanButtons = allButtons.filter(btn => {
                const text = (btn.textContent || '').trim();
                return text.includes('Simpan') || text.includes('SIMPAN');
            });

            return {
                textareaValue: textarea ? textarea.value : null,
                textareaDisabled: textarea ? textarea.disabled : null,
                totalButtons: allButtons.length,
                simpanButtonsFound: simpanButtons.length,
                simpanButtonDetails: simpanButtons.map(btn => ({
                    text: (btn.textContent || '').trim(),
                    disabled: btn.disabled,
                    visible: btn.offsetParent !== null,
                    classes: Array.from(btn.classList)
                }))
            };
        });

        console.log(chalk.gray('      → Page state check:'));
        console.log(chalk.gray(`      → Textarea value: "${pageState.textareaValue}"`));
        console.log(chalk.gray(`      → Simpan buttons found: ${pageState.simpanButtonsFound}`));

        if (pageState.simpanButtonsFound > 0) {
            console.log(chalk.gray('      → Simpan button details:', JSON.stringify(pageState.simpanButtonDetails, null, 2)));
        }

        // STEP 6: Click Simpan button
        console.log(chalk.gray('      → Looking for Simpan button...'));

        const simpanResult = await clickButtonSmart('Simpan', page);
        if (!simpanResult.success) {
            console.log(chalk.red('      ✗ Simpan button not found/clicked'));
            console.log(chalk.gray('      → This might mean the textarea filling did not trigger Vue.js reactivity'));
            // DEBUGGING: Screenshots disabled by default, enable via ENABLE_SCREENSHOTS=true
            // console.log(chalk.gray('      → Taking screenshot for debugging...'));
            //
            // try {
            //     await page.screenshot({
            //         path: 'screenshots/simpan_button_not_found.png',
            //         fullPage: true
            //     });
            //     console.log(chalk.gray('      → Screenshot saved: screenshots/simpan_button_not_found.png'));
            // } catch (e) {
            //     console.log(chalk.gray('      → Could not save screenshot'));
            // }

            return false;
        }

        console.log(chalk.green('      ✓ Simpan button clicked successfully'));

        // STEP 7: Click OK button
        console.log(chalk.gray('      → Looking for OK button...'));

        const okResult = await clickButtonSmart('OK', page);
        if (!okResult.success) {
            return false;
        }

        console.log(chalk.green('      ✓ OK button clicked successfully'));

        // Wait for confirmation dialog to close and Kembali button to appear
        console.log(chalk.gray('      → Waiting for confirmation dialog to close...'));
        await sleep(3000);

        // Check if dialog is still open
        const dialogCheck = await page.evaluate(() => {
            const dialogs = document.querySelectorAll('[role="dialog"], .v-dialog, .v-card');
            return {
                dialogCount: dialogs.length,
                dialogVisible: Array.from(dialogs).some(d => d.offsetParent !== null)
            };
        });

        console.log(chalk.gray(`      → Dialog state: ${dialogCheck.dialogCount} dialogs, visible: ${dialogCheck.dialogVisible}`));

        // If dialog still visible, wait a bit more
        if (dialogCheck.dialogVisible) {
            console.log(chalk.yellow('      → Dialog still visible, waiting longer...'));
            await sleep(2000);
        }

        // STEP 8: Click Kembali button with enhanced search
        console.log(chalk.gray('      → Looking for Kembali button...'));

        // First, let's debug what buttons are available
        const buttonDebug = await page.evaluate(() => {
            const allButtons = Array.from(document.querySelectorAll('button, .v-btn, [type="button"]'));
            const kembaliCandidates = allButtons.filter(btn => {
                const text = (btn.textContent || '').trim().toUpperCase();
                return text.includes('KEMBALI') || text.includes('Kembali');
            });

            return {
                totalButtons: allButtons.length,
                kembaliCandidates: kembaliCandidates.length,
                kembaliDetails: kembaliCandidates.map(btn => ({
                    text: (btn.textContent || '').trim(),
                    textUpper: (btn.textContent || '').trim().toUpperCase(),
                    disabled: btn.disabled,
                    visible: btn.offsetParent !== null,
                    classes: Array.from(btn.classList),
                    href: btn.getAttribute('href'),
                    onclick: btn.getAttribute('onclick'),
                    id: btn.id,
                    html: btn.innerHTML
                })),
                allButtonTexts: allButtons.slice(0, 20).map(btn => (btn.textContent || '').trim()),
                currentUrl: window.location.href
            };
        });

        console.log(chalk.gray(`      → Total buttons: ${buttonDebug.totalButtons}`));
        console.log(chalk.gray(`      → Kembali candidates: ${buttonDebug.kembaliCandidates}`));
        console.log(chalk.gray(`      → Current URL: ${buttonDebug.currentUrl}`));

        if (buttonDebug.kembaliCandidates > 0) {
            console.log(chalk.gray('      → Kembali button details:', JSON.stringify(buttonDebug.kembaliDetails, null, 2)));

            // Check if Kembali button has href attribute (might be a link)
            const hasHref = buttonDebug.kembaliDetails.some(btn => btn.href);
            if (hasHref) {
                console.log(chalk.green('      → Kembali button has href attribute - will try direct navigation'));
            }
        } else {
            console.log(chalk.gray('      → First 20 button texts:', JSON.stringify(buttonDebug.allButtonTexts, null, 2)));
        }

        // Try multiple search strategies for Kembali button
        let kembaliClicked = false;
        const maxAttempts = 5;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(chalk.gray(`      → Kembali search attempt ${attempt}/${maxAttempts}...`));

            // Try to find Kembali button and get its details first
            const buttonSearch = await page.evaluate(() => {
                const allButtons = Array.from(document.querySelectorAll('button, .v-btn, a'));
                const currentUrl = window.location.href;

                for (const btn of allButtons) {
                    const text = (btn.textContent || '').trim();
                    const textUpper = text.toUpperCase();

                    // Check for Kembali in any case
                    if (textUpper.includes('KEMBALI') && btn.offsetParent !== null) {
                        const rect = btn.getBoundingClientRect();
                        return {
                            found: true,
                            text: text,
                            tagName: btn.tagName,
                            href: btn.getAttribute('href'),
                            onclick: btn.getAttribute('onclick'),
                            currentUrl: currentUrl,
                            rect: {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            }
                        };
                    }
                }
                return { found: false, currentUrl: currentUrl };
            });

            if (buttonSearch.found) {
                console.log(chalk.green(`      ✓ Kembali button found: "${buttonSearch.text}"`));
                console.log(chalk.gray(`      → Button type: ${buttonSearch.tagName}`));
                console.log(chalk.gray(`      → Button position: x=${buttonSearch.rect.x}, y=${buttonSearch.rect.y}`));
                if (buttonSearch.href) {
                    console.log(chalk.gray(`      → Href: ${buttonSearch.href}`));
                }
                if (buttonSearch.onclick) {
                    console.log(chalk.gray(`      → Onclick: ${buttonSearch.onclick}`));
                }

                let navigationSuccessful = false;

                // Strategy 1: If it's an anchor tag with href, navigate directly
                if (buttonSearch.tagName === 'A' && buttonSearch.href) {
                    try {
                        console.log(chalk.gray('      → Strategy 1: Direct href navigation...'));
                        await page.goto(buttonSearch.href, { waitUntil: 'networkidle2' });
                        await sleep(2000);
                        navigationSuccessful = true;
                        console.log(chalk.green('      ✓ Direct href navigation successful'));
                    } catch (e) {
                        console.log(chalk.yellow(`      → Direct href navigation failed: ${e.message}`));
                    }
                }

                // Strategy 2: Try Puppeteer's direct click using text selector
                if (!navigationSuccessful) {
                    try {
                        console.log(chalk.gray('      → Strategy 2: Puppeteer click with text...'));
                        await page.click(`:text("${buttonSearch.text}")`, { timeout: 5000 });
                        await sleep(2000);

                        // Check if URL changed
                        const newUrl = page.url();
                        if (newUrl !== buttonSearch.currentUrl) {
                            navigationSuccessful = true;
                            console.log(chalk.green('      ✓ Puppeteer text click successful'));
                        }
                    } catch (e) {
                        console.log(chalk.yellow(`      → Puppeteer text click failed: ${e.message}`));
                    }
                }

                // Strategy 3: Use Puppeteer's click with coordinates (HEADLESS COMPATIBLE)
                if (!navigationSuccessful) {
                    try {
                        console.log(chalk.gray('      → Strategy 3: Puppeteer coordinate click (headless compatible)...'));
                        const x = buttonSearch.rect.x + buttonSearch.rect.width / 2;
                        const y = buttonSearch.rect.y + buttonSearch.rect.height / 2;

                        console.log(chalk.gray(`      → Clicking at coordinates: x=${Math.round(x)}, y=${Math.round(y)}`));

                        // Multiple coordinate click methods for better headless compatibility
                        await page.mouse.move(x, y);
                        await sleep(100);
                        await page.mouse.down();
                        await sleep(50);
                        await page.mouse.up();
                        await sleep(100);

                        // Also try direct click as backup
                        await page.mouse.click(x, y, { clickCount: 1, delay: 100 });
                        await sleep(2000);

                        // Check if URL changed
                        const newUrl = page.url();
                        if (newUrl !== buttonSearch.currentUrl) {
                            navigationSuccessful = true;
                            console.log(chalk.green('      ✓ Puppeteer coordinate click successful'));
                        } else {
                            console.log(chalk.yellow('      → Coordinate click executed but URL did not change'));
                        }
                    } catch (e) {
                        console.log(chalk.yellow(`      → Puppeteer coordinate click failed: ${e.message}`));
                    }
                }

                // Strategy 4: JavaScript click with comprehensive Vue.js event handling
                if (!navigationSuccessful) {
                    console.log(chalk.gray('      → Strategy 4: JavaScript click with Vue events...'));
                    const jsClickResult = await page.evaluate(() => {
                        const allButtons = Array.from(document.querySelectorAll('button, .v-btn, a'));
                        for (const btn of allButtons) {
                            const text = (btn.textContent || '').trim().toUpperCase();
                            if (text.includes('KEMBALI') && btn.offsetParent !== null && !btn.disabled) {
                                // Try multiple click approaches
                                const rect = btn.getBoundingClientRect();

                                // Native click
                                btn.click();

                                // Comprehensive Vue.js event sequence
                                const events = [
                                    'mousedown',
                                    'mouseup',
                                    'click',
                                    'focus',
                                    'touchstart',
                                    'touchend'
                                ];

                                events.forEach(eventType => {
                                    const event = new MouseEvent(eventType, {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window,
                                        clientX: rect.x + rect.width / 2,
                                        clientY: rect.y + rect.height / 2
                                    });
                                    btn.dispatchEvent(event);
                                });

                                // If it's an anchor tag, also try href navigation
                                if (btn.tagName === 'A' && btn.href) {
                                    window.location.href = btn.href;
                                    return { usedHref: true, href: btn.href };
                                }

                                return { clicked: true };
                            }
                        }
                        return { clicked: false };
                    });

                    if (jsClickResult.clicked || jsClickResult.usedHref) {
                        await sleep(2000);
                        navigationSuccessful = true;
                        console.log(chalk.green('      ✓ JavaScript click executed'));

                        if (jsClickResult.usedHref) {
                            console.log(chalk.gray('      → Used href navigation'));
                        }
                    }
                }

                // Strategy 5: Try browser back button as last resort
                if (!navigationSuccessful) {
                    console.log(chalk.yellow('      → Strategy 5: Trying browser back button...'));
                    try {
                        await page.goBack({ waitUntil: 'networkidle2' });
                        await sleep(2000);
                        navigationSuccessful = true;
                        console.log(chalk.green('      ✓ Browser back button successful'));
                    } catch (e) {
                        console.log(chalk.yellow(`      → Browser back failed: ${e.message}`));
                    }
                }

                if (!navigationSuccessful) {
                    console.log(chalk.red('      ✗ All clicking strategies failed'));
                    continue; // Try next attempt
                }

                kembaliClicked = true;

                // Wait for navigation
                console.log(chalk.gray('      → Waiting for navigation to complete...'));
                await sleep(3000);

                // Verify URL changed - successful navigation means document processing complete
                const currentUrl = page.url();
                console.log(chalk.gray(`      → Current URL after Kembali: ${currentUrl}`));

                // Check if we've successfully navigated away from document detail page
                // Success indicators:
                // 1. URL changed from document detail page (not containing /inbox/EGaC...)
                // 2. URL contains /inbox with query params (back on any document list)
                // 3. URL contains /dashboard (acceptable navigation)
                // 4. Has Lihat buttons available (ready for next document)
                const navigationSuccess = await page.evaluate(() => {
                    const currentUrl = window.location.href;

                    // Check if we navigated away from document detail page
                    const leftDocumentDetail = !currentUrl.includes('/inbox/EGaC');

                    // Check if we're back on ANY document list (/inbox with any query params)
                    // This handles various submenus: NKH0016, NKH0002, etc.
                    const onDocumentList = currentUrl.includes('/inbox') &&
                                        (currentUrl.includes('?f=') || currentUrl.includes('?obj='));

                    // Check if we're on dashboard (acceptable)
                    const onDashboard = currentUrl.includes('/dashboard');

                    // Check if we're on home page (less ideal but still success)
                    const onHomePage = currentUrl.endsWith('/') || currentUrl.split('/').length === 4;

                    // Check if we're back on document list (has Lihat buttons)
                    const activeWindow = document.querySelector('.v-window-item--active');
                    let hasLihatButtons = false;
                    if (activeWindow) {
                        const lihatButtons = Array.from(activeWindow.querySelectorAll('button, .v-btn')).filter(btn => {
                            const text = (btn.textContent || '').trim();
                            return text === 'Lihat' || text.includes('Lihat');
                        });
                        hasLihatButtons = lihatButtons.length > 0;
                    }

                    return {
                        leftDocumentDetail,
                        onDocumentList,
                        onDashboard,
                        onHomePage,
                        hasLihatButtons,
                        url: currentUrl,
                        success: leftDocumentDetail && (onDocumentList || onDashboard || onHomePage || hasLihatButtons)
                    };
                });

                if (navigationSuccess.success) {
                    console.log(chalk.green('      ✓ Kembali button navigation successful!'));
                    if (navigationSuccess.onDocumentList) {
                        console.log(chalk.green('      → Back on document list (URL contains /inbox)'));
                    } else if (navigationSuccess.onDashboard) {
                        console.log(chalk.green('      → Back on dashboard (URL: /dashboard)'));
                    } else if (navigationSuccess.hasLihatButtons) {
                        console.log(chalk.green('      → Back on document list (has Lihat buttons)'));
                    } else if (navigationSuccess.onHomePage) {
                        console.log(chalk.yellow('      → Navigated to home page'));
                    } else {
                        console.log(chalk.gray('      → Left document detail page'));
                    }

                    // Only warn if we went to unexpected home page (not dashboard)
                    if (navigationSuccess.onHomePage && !navigationSuccess.onDashboard) {
                        console.log(chalk.yellow('      ⚠ Note: Kembali went to home page'));
                    }

                    break; // Success! Document processing complete
                } else {
                    console.log(chalk.yellow('      → Clicked Kembali but navigation not verified, retrying...'));
                    await sleep(1000);
                }
            } else {
                console.log(chalk.yellow('      → Kembali button not found, waiting before retry...'));
                await sleep(1500);
            }
        }

        if (!kembaliClicked) {
            console.log(chalk.red('      ✗ Kembali button not found after ' + maxAttempts + ' attempts'));

            // DEBUGGING: Screenshots disabled by default, enable via ENABLE_SCREENSHOTS=true
            // // Take screenshot for debugging
            // try {
            //     await page.screenshot({
            //         path: 'screenshots/kembali_button_not_found.png',
            //         fullPage: true
            //     });
            //     console.log(chalk.gray('      → Screenshot saved: screenshots/kembali_button_not_found.png'));
            // } catch (e) {
            //     console.log(chalk.gray('      → Could not save screenshot'));
            // }

            return false;
        }

        console.log(chalk.green('      ✓ Document processing completed successfully'));
        return true;

    } catch (error) {
        console.log(chalk.red(`      ✗ Error processing document: ${error.message}`));
        return false;
    }
}

/**
 * Click a button using smart finding
 * @param {string} buttonText - Text to search for
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Result object
 */
async function clickButtonSmart(buttonText, page) {
    const button = await findButtonSmart(page, {
        buttonText: buttonText,
        searchType: 'includes',
        mustBeEnabled: true,
        mustBeVisible: true,
        timeout: 8000
    });

    if (!button.found) {
        return { success: false, reason: 'button_not_found' };
    }

    try {
        // Try multiple click strategies
        const clickResult = await page.evaluate((text) => {
            const buttons = Array.from(document.querySelectorAll('button, .v-btn'));
            for (const btn of buttons) {
                const btnText = (btn.textContent || '').trim();
                if (btnText.includes(text) && btn.offsetParent !== null && !btn.disabled) {
                    btn.click();
                    return { clicked: true };
                }
            }
            return { clicked: false };
        }, buttonText);

        if (clickResult.clicked) {
            await sleep(2000);
            return { success: true };
        }

        return { success: false, reason: 'click_failed' };
    } catch (error) {
        return { success: false, reason: 'click_error', error: error.message };
    }
}

/**
 * Click Lihat button with verification
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Result object
 */
async function clickLihatButton(page) {
    console.log('🔍 DEBUG: Starting Lihat button search...');

    const debugInfo = await page.evaluate(() => {
        const debug = {
            activeWindowExists: false,
            activeWindowElementCount: 0,
            buttonCount: 0,
            firstTenButtons: [],
            lihatButtonsFound: []
        };

        const activeWindow = document.querySelector('.v-window-item--active');
        debug.activeWindowExists = activeWindow !== null;

        if (!activeWindow) {
            return debug;
        }

        const allElements = activeWindow.querySelectorAll('*');
        debug.activeWindowElementCount = allElements.length;

        const buttons = Array.from(activeWindow.querySelectorAll('button, .v-btn'));
        debug.buttonCount = buttons.length;

        debug.firstTenButtons = buttons.slice(0, 10).map(btn => {
            const text = (btn.textContent || '').trim();
            return {
                text: text,
                disabled: btn.disabled,
                offsetParent: btn.offsetParent !== null,
                classes: Array.from(btn.classList)
            };
        });

        debug.lihatButtonsFound = buttons.filter(btn => {
            const text = (btn.textContent || '').trim();
            const isVisible = btn.offsetParent !== null;
            const isEnabled = !btn.disabled && !btn.classList.contains('v-btn--disabled');
            return text.includes('Lihat') && isVisible && isEnabled;
        }).map(btn => ({
            text: (btn.textContent || '').trim(),
            exactMatch: (btn.textContent || '').trim() === 'Lihat',
            disabled: btn.disabled,
            offsetParent: btn.offsetParent !== null
        }));

        return debug;
    });

    console.log('🔍 DEBUG Results:', JSON.stringify(debugInfo, null, 2));

    // Now click the FIRST Lihat button directly using Puppeteer
    if (debugInfo.activeWindowExists && debugInfo.lihatButtonsFound.length > 0) {
        console.log(`✅ Found ${debugInfo.lihatButtonsFound.length} Lihat buttons, clicking the first one...`);

        try {
            // Use Puppeteer's direct page.click() with CSS selector
            const firstButtonSelector = '.v-window-item--active button.v-btn';
            await page.click(firstButtonSelector, { clickCount: 1, delay: 200 });
            console.log('✅ Clicked first Lihat button using direct Puppeteer click');

            // Wait for the feedback section to appear
            await sleep(2000);

            // Verify the click worked
            const afterClickState = await page.evaluate(() => {
                const textarea = document.querySelector('textarea');
                const dialog = document.querySelector('[role="dialog"]');
                const card = document.querySelector('.v-card');
                return {
                    hasTextarea: textarea !== null,
                    hasDialog: dialog !== null,
                    hasCard: card !== null
                };
            });

            console.log('🔍 After click state:', afterClickState);

            const success = afterClickState.hasTextarea || afterClickState.hasDialog || afterClickState.hasCard;

            if (success) {
                console.log('✅ Lihat button click verified - feedback section appeared');
                return { success: true };
            } else {
                console.log('❌ Lihat button clicked but feedback section not visible');
                return { success: false, reason: 'feedback_section_not_appeared' };
            }

        } catch (clickError) {
            console.log(`❌ Error clicking Lihat button: ${clickError.message}`);
            return { success: false, reason: 'click_error', error: clickError.message };
        }
    }

    console.log('❌ No Lihat buttons found or active window missing');
    return { success: false, reason: 'buttons_not_found' };
}

/**
 * Type feedback message with verification
 * @param {Page} page - Puppeteer page instance
 * @param {string} message - Feedback message to type
 * @returns {Promise<Object>} Result object
 */
async function typeFeedbackMessage(page, message) {
    return await clickAndVerify(page, {
        elementDescription: 'Feedback textarea',
        findFn: () => {
            const textarea = document.querySelector('textarea');
            return {
                found: textarea !== null,
                visible: textarea ? textarea.offsetParent !== null : false
            };
        },
        clickFn: (msg) => {
            const textarea = document.querySelector('textarea');
            if (textarea && textarea.offsetParent !== null) {
                textarea.click();
                textarea.focus();
                textarea.value = '';
                textarea.value = msg;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
                textarea.dispatchEvent(new Event('blur', { bubbles: true }));
                return {
                    clicked: true,
                    value: textarea.value,
                    success: textarea.value === msg
                };
            }
            return { clicked: false };
        },
        verifyStateChangeFn: (msg) => {
            const textarea = document.querySelector('textarea');
            return {
                verified: textarea !== null && textarea.value === msg,
                value: textarea ? textarea.value : null
            };
        },
        timeout: 5000,
        retryCount: 2
    }, message);
}

/**
 * Click Simpan button with verification
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Result object
 */
async function clickSimpanButton(page) {
    return await clickAndVerify(page, {
        elementDescription: 'Simpan button',
        findFn: () => {
            const selectors = ['button', '.v-btn', '[type="submit"]'];
            for (const selector of selectors) {
                const buttons = Array.from(document.querySelectorAll(selector));
                for (const btn of buttons) {
                    const text = (btn.textContent || '').trim();
                    if ((text.includes('Simpan') || text.includes('SIMPAN') || text.includes('Save')) &&
                        btn.offsetParent !== null &&
                        !btn.disabled &&
                        !btn.classList.contains('v-btn--disabled')) {
                        return { found: true, text: text };
                    }
                }
            }
            return { found: false };
        },
        clickFn: () => {
            const selectors = ['button', '.v-btn', '[type="submit"]'];
            for (const selector of selectors) {
                const buttons = Array.from(document.querySelectorAll(selector));
                for (const btn of buttons) {
                    const text = (btn.textContent || '').trim();
                    if ((text.includes('Simpan') || text.includes('SIMPAN')) &&
                        btn.offsetParent !== null &&
                        !btn.disabled &&
                        !btn.classList.contains('v-btn--disabled')) {
                        btn.click();
                        return { clicked: true };
                    }
                }
            }
            return { clicked: false };
        },
        verifyStateChangeFn: () => {
            const alert = document.querySelector('.v-alert, [role="alert"], .success--text');
            const dialog = document.querySelector('[role="dialog"].v-dialog');
            return {
                verified: alert !== null || dialog !== null,
                hasAlert: alert !== null,
                hasDialog: dialog !== null
            };
        },
        timeout: 15000,
        retryCount: 3
    });
}

/**
 * Click OK button with verification
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Result object
 */
async function clickOkButton(page) {
    return await clickAndVerify(page, {
        elementDescription: 'OK button',
        findFn: () => {
            const selectors = ['button', '.v-btn', '[type="button"]'];
            for (const selector of selectors) {
                const buttons = Array.from(document.querySelectorAll(selector));
                for (const btn of buttons) {
                    const text = (btn.textContent || '').trim();
                    if ((text.includes('OK') || text.includes('Oke') || text === 'OK') &&
                        btn.offsetParent !== null &&
                        !btn.disabled &&
                        !btn.classList.contains('v-btn--disabled')) {
                        return { found: true, text: text };
                    }
                }
            }
            return { found: false };
        },
        clickFn: () => {
            const selectors = ['button', '.v-btn', '[type="button"]'];
            for (const selector of selectors) {
                const buttons = Array.from(document.querySelectorAll(selector));
                for (const btn of buttons) {
                    const text = (btn.textContent || '').trim();
                    if ((text.includes('OK') || text.includes('Oke')) &&
                        btn.offsetParent !== null &&
                        !btn.disabled &&
                        !btn.classList.contains('v-btn--disabled')) {
                        btn.click();
                        return { clicked: true };
                    }
                }
            }
            return { clicked: false };
        },
        verifyStateChangeFn: () => {
            const kembaliBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                (btn.textContent || '').includes('Kembali')
            );
            return {
                verified: kembaliBtn !== null,
                hasKembaliButton: kembaliBtn !== null
            };
        },
        timeout: 8000,
        retryCount: 3
    });
}

/**
 * Click Kembali button with verification
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Result object
 */
async function clickKembaliButton(page) {
    return await clickAndVerify(page, {
        elementDescription: 'Kembali button',
        findFn: () => {
            const selectors = ['button', '.v-btn', '[type="button"]'];
            for (const selector of selectors) {
                const buttons = Array.from(document.querySelectorAll(selector));
                for (const btn of buttons) {
                    const text = (btn.textContent || '').trim();
                    if ((text.includes('Kembali') || text.includes('KEMBALI') || text.includes('Back')) &&
                        btn.offsetParent !== null &&
                        !btn.disabled &&
                        !btn.classList.contains('v-btn--disabled')) {
                        return { found: true, text: text };
                    }
                }
            }
            return { found: false };
        },
        clickFn: () => {
            const selectors = ['button', '.v-btn', '[type="button"]'];
            for (const selector of selectors) {
                const buttons = Array.from(document.querySelectorAll(selector));
                for (const btn of buttons) {
                    const text = (btn.textContent || '').trim();
                    if ((text.includes('Kembali') || text.includes('KEMBALI')) &&
                        btn.offsetParent !== null &&
                        !btn.disabled &&
                        !btn.classList.contains('v-btn--disabled')) {
                        btn.click();
                        return { clicked: true };
                    }
                }
            }
            return { clicked: false };
        },
        verifyStateChangeFn: () => {
            const lihatBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                (btn.textContent || '').includes('Lihat')
            );
            const currentUrl = window.location.href;
            return {
                verified: lihatBtn !== null || currentUrl.includes('/inbox'),
                hasLihatButton: lihatBtn !== null,
                url: currentUrl
            };
        },
        timeout: 8000,
        retryCount: 3
    });
}

module.exports = {
    processSingleDocument,
    clickLihatButton,
    typeFeedbackMessage,
    clickSimpanButton,
    clickOkButton,
    clickKembaliButton
};
