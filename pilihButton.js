/**
 * PILIH Button Module
 * Handles PILIH button clicking and verification
 */

const chalk = require('chalk');
const { sleep } = require('./utils');
const { captureScreenshot, capturePageStructure } = require('./visualHelper');

/**
 * Click PILIH button and verify navigation
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<Object>} Result object
 */
async function clickPilihButton(page) {
    console.log(chalk.gray('  → Clicking PILIH button...'));

    try {
        console.log(chalk.gray('    → Using direct click for PILIH button'));

        // Find PILIH button using multiple strategies
        const pilihFound = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, .v-btn'));
            const pilihBtn = buttons.find(btn =>
                (btn.textContent || '').includes('PILIH') ||
                (btn.textContent || '').includes('Pilih')
            );

            if (!pilihBtn) return { found: false };

            return {
                found: true,
                disabled: pilihBtn.disabled,
                hasDisabledClass: pilihBtn.classList.contains('v-btn--disabled'),
                text: (pilihBtn.textContent || '').trim()
            };
        });

        if (!pilihFound.found) {
            throw new Error('PILIH button not found');
        }

        console.log(chalk.gray(`    → PILIH button: "${pilihFound.text}", disabled=${pilihFound.disabled || pilihFound.hasDisabledClass}`));

        if (pilihFound.disabled || pilihFound.hasDisabledClass) {
            console.log(chalk.yellow('    ⚠ PILIH button is disabled, waiting...'));
            await sleep(3000);

            // Check again
            const recheck = await page.evaluate(() => {
                const pilihBtn = Array.from(document.querySelectorAll('button, .v-btn')).find(btn =>
                    (btn.textContent || '').includes('PILIH')
                );
                return {
                    disabled: pilihBtn ? (pilihBtn.disabled || pilihBtn.classList.contains('v-btn--disabled')) : true
                };
            });

            if (recheck.disabled) {
                throw new Error('PILIH button still disabled after waiting');
            }
        }

        // Click the PILIH button directly using JavaScript
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, .v-btn'));
            const pilihBtn = buttons.find(btn =>
                (btn.textContent || '').includes('PILIH') ||
                (btn.textContent || '').includes('Pilih')
            );

            if (pilihBtn && !pilihBtn.disabled && !pilihBtn.classList.contains('v-btn--disabled')) {
                pilihBtn.click();
                return { clicked: true };
            }
            return { clicked: false };
        });

        console.log(chalk.green('    ✓ PILIH button clicked'));

        // Wait for navigation
        await sleep(5000);

        // Verify we're no longer on role page
        const finalUrl = page.url();
        console.log(chalk.gray(`    → Final URL: ${finalUrl}`));

        if (finalUrl.includes('/role')) {
            console.log(chalk.yellow('    ⚠ Still on role page, waiting longer...'));
            await sleep(5000);

            const recheckUrl = page.url();
            console.log(chalk.gray(`    → Recheck URL: ${recheckUrl}`));

            if (recheckUrl.includes('/role')) {
                console.log(chalk.red('    ✗ Still on role page - PILIH may have failed'));
                return {
                    success: false,
                    error: 'Still on role page after PILIH click',
                    finalUrl: recheckUrl
                };
            } else {
                console.log(chalk.green('    ✓ Successfully navigated away from role page'));
            }
        } else {
            console.log(chalk.green('    ✓ Successfully navigated away from role page'));
        }

        await captureScreenshot(page, 'role_page_after_pilih_click');
        await capturePageStructure(page, 'role_page_after_pilih_click');

        return {
            success: true,
            finalUrl: page.url()
        };

    } catch (error) {
        console.log(chalk.red(`  ✗ PILIH button click failed: ${error.message}`));
        await captureScreenshot(page, 'role_page_pilih_failed');
        await capturePageStructure(page, 'role_page_pilih_failed');
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    clickPilihButton
};
