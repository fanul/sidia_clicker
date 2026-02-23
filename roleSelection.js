/**
 * Role Selection Module
 * Handles role option selection from dropdown
 */

const chalk = require('chalk');
const { sleep } = require('./utils');
const { captureScreenshot, capturePageStructure } = require('./visualHelper');

/**
 * Get role options from dropdown
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Array>} Array of role options
 */
async function getRoleOptions(page) {
    return await page.evaluate(() => {
        const selectors = [
            '.v-list-item',
            '.v-list-item__title',
            '[role="option"]',
            '.v-menu__content .v-list-item',
            '.v-list-item--link',
            '.v-select-list .v-list-item'
        ];

        const options = [];
        const seenTexts = new Set();

        for (const selector of selectors) {
            const elements = Array.from(document.querySelectorAll(selector));
            for (const el of elements) {
                const text = (el.textContent || '').trim();
                // Skip buttons and short text
                const isClickable = !el.classList.contains('v-btn') &&
                                  !el.closest('button') &&
                                  text.length > 5;

                if (isClickable && !seenTexts.has(text)) {
                    seenTexts.add(text);
                    options.push({
                        selector: selector,
                        text: text,
                        className: el.className,
                        id: el.id
                    });
                }
            }
        }
        return options;
    });
}

/**
 * Select role option using direct click
 * @param {Page} page - Puppeteer page instance
 * @param {string} optionText - Option text to select
 * @returns {Promise<boolean>} True if successful
 */
async function selectRoleOption(page, optionText) {
    console.log(chalk.gray(`    → Selecting: ${optionText.substring(0, 50)}`));

    try {
        console.log(chalk.gray(`    → Using direct click for role option`));

        // Find and click by text content using page.evaluate
        const clickResult = await page.evaluate((targetText) => {
            const selectors = [
                '.v-list-item',
                '.v-list-item__title',
                '[role="option"]',
                '.v-select-list .v-list-item'
            ];

            for (const selector of selectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                for (const el of elements) {
                    const text = (el.textContent || '').trim();

                    // Check if this is our target option
                    if (text.includes(targetText) &&
                        !el.classList.contains('v-btn') &&
                        !el.closest('button')) {

                        // Try clicking directly
                        el.click();

                        // Also try clicking parent if it's a title
                        if (el.classList.contains('v-list-item__title')) {
                            const parent = el.closest('.v-list-item');
                            if (parent) parent.click();
                        }

                        return {
                            clicked: true,
                            text: text,
                            selector: selector
                        };
                    }
                }
            }
            return { clicked: false, text: null, selector: null };
        }, optionText);

        if (clickResult.clicked) {
            console.log(chalk.green(`    ✓ Clicked role option: "${clickResult.text}"`));
        } else {
            throw new Error('JavaScript click failed');
        }

        await sleep(2000);

        // Verify the selection worked
        const selectionCheck = await page.evaluate(() => {
            // Check for active class on selected item
            const activeItem = document.querySelector('.v-list-item--active, .v-item--active, .v-list-item.v-item--active');

            // Check input field value
            const textInput = document.querySelector('input[type="text"]');

            // Check PILIH button state
            const pilihBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                btn.textContent.includes('PILIH') || btn.textContent.includes('Pilih')
            );

            return {
                hasActiveItem: activeItem !== null,
                inputHasValue: textInput ? textInput.value.trim() : '',
                pilihButtonDisabled: pilihBtn ? (pilihBtn.disabled || pilihBtn.classList.contains('v-btn--disabled')) : null,
                selectedText: activeItem ? activeItem.textContent.trim() : (textInput ? textInput.value : '')
            };
        });

        console.log(chalk.gray(`    → Selection check: active=${selectionCheck.hasActiveItem}, input value="${selectionCheck.inputHasValue}"`));
        console.log(chalk.gray(`    → PILIH disabled: ${selectionCheck.pilihButtonDisabled}`));

        if (selectionCheck.hasActiveItem || selectionCheck.inputHasValue) {
            console.log(chalk.green('  ✓ Role selection confirmed'));
        } else {
            console.log(chalk.yellow('  ⚠ Role selection not confirmed, but continuing...'));
        }

        await captureScreenshot(page, 'role_page_after_role_selected');
        await capturePageStructure(page, 'role_page_after_role_selected');

        return {
            success: true,
            selectionCheck: selectionCheck,
            selectedText: optionText
        };

    } catch (error) {
        console.log(chalk.red(`  ✗ Failed to click role option: ${error.message}`));
        await captureScreenshot(page, 'role_page_option_click_failed');
        await capturePageStructure(page, 'role_page_option_click_failed');
        return { success: false, error: error.message };
    }
}

/**
 * Complete role selection flow
 * @param {Page} page - Puppeteer page instance
 * @param {string} roleInputSelector - Input selector
 * @returns {Promise<Object>} Selection result
 */
async function completeRoleSelection(page, roleInputSelector) {
    console.log(chalk.gray('  → Waiting for dropdown options...'));
    await sleep(3000);

    // Get all role options from the dropdown/menu
    let roleOptions = await getRoleOptions(page);
    console.log(chalk.gray(`    → Found ${roleOptions.length} role options`));

    if (roleOptions.length === 0) {
        console.log(chalk.yellow('  ⚠ No role options found in dropdown'));

        // Try clicking the input again to trigger dropdown
        console.log(chalk.gray('    → Trying to click input again...'));
        try {
            await page.click(roleInputSelector);
            await sleep(2000);
        } catch (e) {
            console.log(chalk.yellow(`    → Input reclick failed: ${e.message}`));
        }

        // Check again
        const roleOptions2 = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.v-list-item, .v-list-item__title'));
            return items
                .filter(el => {
                    const text = (el.textContent || '').trim();
                    return !el.classList.contains('v-btn') &&
                           !el.closest('button') &&
                           text.length > 5;
                })
                .map(el => ({
                    text: el.textContent.trim(),
                    selector: el.tagName.toLowerCase()
                }));
        });

        console.log(chalk.gray(`    → Found ${roleOptions2.length} role options on retry`));

        if (roleOptions2.length === 0) {
            console.log(chalk.red('  ✗ Still no role options found'));
            await captureScreenshot(page, 'role_page_no_options');
            await capturePageStructure(page, 'role_page_no_options');
            return { success: false, error: 'No role options found' };
        }

        roleOptions = roleOptions2;
    }

    // Display first few options
    roleOptions.slice(0, 3).forEach((option, i) => {
        console.log(chalk.gray(`    → Option ${i + 1}: ${option.text.substring(0, 70)}`));
    });

    // Find PSTFF option or use first available option
    const firstOption = roleOptions[0];
    const pstffOption = roleOptions.find(opt => opt.text.includes('PSTFF'));
    const optionToSelect = pstffOption || firstOption;

    // Select the role option
    const result = await selectRoleOption(page, optionToSelect.text);

    if (!result.success) {
        return result;
    }

    // If PILIH button is still disabled, try clicking the role option again
    if (result.selectionCheck && result.selectionCheck.pilihButtonDisabled === true) {
        console.log(chalk.yellow('  ⚠ PILIH button still disabled, trying to click role option again...'));
        await sleep(1000);

        // Try clicking the input field again to trigger selection
        try {
            await page.click(roleInputSelector);
            await sleep(1000);

            // Then click the first option again (without visibility check)
            const reclickResult = await page.evaluate((targetText) => {
                const listItems = Array.from(document.querySelectorAll('.v-list-item'));
                for (const item of listItems) {
                    const text = item.textContent.trim();
                    if (!item.classList.contains('v-btn') && text.includes(targetText)) {
                        item.click();
                        return { clicked: true, text: text };
                    }
                }
                return { clicked: false };
            }, optionToSelect.text);

            if (reclickResult.clicked) {
                console.log(chalk.green(`    → Reclicked role option: "${reclickResult.text}"`));
            }

            await sleep(2000);
        } catch (e) {
            console.log(chalk.yellow(`    → Reclick failed: ${e.message}`));
        }
    }

    return { success: true };
}

module.exports = {
    getRoleOptions,
    selectRoleOption,
    completeRoleSelection
};