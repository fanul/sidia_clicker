/**
 * Role Input Module
 * Handles role input field detection and clicking
 */

const chalk = require('chalk');
const { sleep } = require('./utils');
const { captureScreenshot, capturePageStructure } = require('./visualHelper');

/**
 * Analyze page to find role input field
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeRoleInput(page) {
    return await page.evaluate(() => {
        const results = {
            foundInputs: [],
            roleInputs: [],
            recommended: null
        };

        // Find all text inputs with autocomplete="off"
        const allInputs = Array.from(document.querySelectorAll('input'));
        allInputs.forEach(input => {
            const rect = input.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && input.offsetParent !== null;

            if (input.type === 'text' && isVisible) {
                const inputInfo = {
                    id: input.id,
                    type: input.type,
                    placeholder: input.placeholder,
                    className: input.className,
                    autocomplete: input.autocomplete || '',
                    visible: isVisible,
                    hasLabel: false,
                    labelText: '',
                    hasDropdownIcon: false,
                    parentStructure: ''
                };

                // Check for label
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) {
                    inputInfo.hasLabel = true;
                    inputInfo.labelText = label.textContent;
                }

                // Check for dropdown icon in parent structure
                const parent = input.closest('.v-select__slot');
                if (parent) {
                    inputInfo.parentStructure = 'v-select__slot';
                    const dropdownIcon = parent.querySelector('.mdi-menu-down');
                    if (dropdownIcon) {
                        inputInfo.hasDropdownIcon = true;
                    }
                }

                results.foundInputs.push(inputInfo);

                // Check if this looks like the role input
                if (input.autocomplete === 'off' && inputInfo.hasDropdownIcon) {
                    results.roleInputs.push(inputInfo);
                }

                // Check if this matches exact structure
                if (inputInfo.hasLabel &&
                    inputInfo.labelText.includes('Role') &&
                    input.autocomplete === 'off' &&
                    inputInfo.hasDropdownIcon) {
                    results.recommended = inputInfo;
                }
            }
        });

        return results;
    });
}

/**
 * Find role input selector
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<string|null>} Input selector or null
 */
async function findRoleInputSelector(page) {
    console.log(chalk.gray('  → Looking for role input field...'));

    const roleInputAnalysis = await analyzeRoleInput(page);

    console.log(chalk.gray(`    → Found ${roleInputAnalysis.foundInputs.length} visible text inputs`));
    console.log(chalk.gray(`    → Found ${roleInputAnalysis.roleInputs.length} potential role inputs`));

    // Log all found inputs for debugging
    roleInputAnalysis.foundInputs.forEach((input, i) => {
        const labelInfo = input.hasLabel ? ` [label: "${input.labelText}"]` : '';
        const dropdownInfo = input.hasDropdownIcon ? ' [dropdown icon]' : '';
        console.log(chalk.gray(`    → Input ${i + 1}: id="${input.id}", autocomplete="${input.autocomplete}"${labelInfo}${dropdownInfo}`));
    });

    // Use recommended input if found, otherwise fall back to first role input
    let roleInputId = null;
    let roleInputSelector = null;

    if (roleInputAnalysis.recommended) {
        roleInputId = roleInputAnalysis.recommended.id;
        roleInputSelector = `#${roleInputId}`;
        console.log(chalk.green(`    → Using recommended role input: ${roleInputSelector}`));
        console.log(chalk.gray(`    → Label: "${roleInputAnalysis.recommended.labelText}"`));
    } else if (roleInputAnalysis.roleInputs.length > 0) {
        roleInputId = roleInputAnalysis.roleInputs[0].id;
        roleInputSelector = `#${roleInputId}`;
        console.log(chalk.yellow(`    → Using fallback role input: ${roleInputSelector}`));
    } else if (roleInputAnalysis.foundInputs.length > 0) {
        // Last resort - use first visible text input
        roleInputId = roleInputAnalysis.foundInputs[0].id;
        roleInputSelector = `#${roleInputId}`;
        console.log(chalk.yellow(`    → Using last resort input: ${roleInputSelector}`));
    }

    if (!roleInputSelector) {
        console.log(chalk.red('  ✗ No suitable input field found'));
        await captureScreenshot(page, 'role_page_no_input_found');
        await capturePageStructure(page, 'role_page_no_input_found');
        return null;
    }

    return roleInputSelector;
}

/**
 * Click role input field using direct approach
 * @param {Page} page - Puppeteer page instance
 * @param {string} roleInputSelector - Input selector
 * @returns {Promise<boolean>} True if successful
 */
async function clickRoleInput(page, roleInputSelector) {
    console.log(chalk.gray(`    → Clicking input: ${roleInputSelector}`));

    try {
        console.log(chalk.gray(`    → Using direct Puppeteer click for ${roleInputSelector}`));

        // Use direct Puppeteer click instead of page.evaluate
        await page.click(roleInputSelector, { clickCount: 1, delay: 100 });
        console.log(chalk.green(`    ✓ Direct click successful: ${roleInputSelector}`));

        // Also focus the input using JavaScript
        await page.evaluate((selector) => {
            const input = document.querySelector(selector);
            if (input) {
                input.click();
                input.focus();
                // Trigger any Vue events
                input.dispatchEvent(new Event('focus', { bubbles: true }));
                input.dispatchEvent(new Event('click', { bubbles: true }));
            }
        }, roleInputSelector);

        await sleep(2000);

        // Check if dropdown appeared
        const dropdownCheck = await page.evaluate(() => {
            const menu = document.querySelector('.v-menu__content, .v-select-list');
            const listItems = document.querySelectorAll('.v-list-item');
            const input = document.querySelector('input[type="text"][autocomplete="off"]');

            return {
                hasMenu: menu !== null,
                listItemCount: listItems.length,
                inputExists: input !== null,
                inputValue: input ? input.value : ''
            };
        });

        console.log(chalk.gray(`    → Dropdown check: menu=${dropdownCheck.hasMenu}, items=${dropdownCheck.listItemCount}, input value="${dropdownCheck.inputValue}"`));

        if (dropdownCheck.listItemCount > 0) {
            console.log(chalk.green(`    ✓ Dropdown appeared with ${dropdownCheck.listItemCount} items`));
        } else {
            console.log(chalk.yellow(`    ⚠ No dropdown items yet, but continuing...`));
        }

        await captureScreenshot(page, 'role_page_after_input_click');
        await capturePageStructure(page, 'role_page_after_input_click');

        return true;

    } catch (error) {
        console.log(chalk.red(`  ✗ Failed to click input field: ${error.message}`));
        await captureScreenshot(page, 'role_page_input_click_failed');
        await capturePageStructure(page, 'role_page_input_click_failed');
        return false;
    }
}

module.exports = {
    analyzeRoleInput,
    findRoleInputSelector,
    clickRoleInput
};
