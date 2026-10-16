/**
 * SIDIA Automation - Refactored Node.js Implementation
 * Automates document processing in SIDIA (BPJS Ketenagakerjaan) system
 *
 * @module index
 * @description Main entry point for the SIDIA automation system
 */

const chalk = require('chalk');
require('dotenv').config();

const { launchBrowser, createPage } = require('./browser');
const { login, selectRole } = require('./login');
const { navigateToNaskahMasuk, processMenusWithBadges } = require('./documents');
const { createStats, completeProcessing, displaySummary } = require('./stats');
const { preventSleep, restoreSleep } = require('./keepAwake');
const { record } = require('./tracker');

// Catch any unhandled errors and print them so they appear in dashboard logs
process.on('uncaughtException', err => {
    console.error(chalk.red(`\n💥 UNCAUGHT EXCEPTION: ${err && err.stack ? err.stack : err}`));
});
process.on('unhandledRejection', reason => {
    console.error(chalk.red(`\n💥 UNHANDLED REJECTION: ${reason && reason.stack ? reason.stack : reason}`));
});

// Configuration
const CONFIG = {
    username: process.env.SIDIA_USERNAME,
    password: process.env.SIDIA_PASSWORD,
    baseUrl: process.env.SIDIA_BASE_URL || 'https://sidia.bpjsketenagakerjaan.go.id',
    timeout: parseInt(process.env.TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 10,
    headless: process.argv.includes('--headless') ? true : 
              (process.argv.includes('--no-headless') ? false : 
              (process.env.HEADLESS === 'true' || process.env.HEADLESS === 'True' || process.env.HEADLESS === 'TRUE')),
    documentTypes: (process.env.DOCUMENT_TYPES || 'NKH0002,NKH0001,NKH0016,NKH0017').split(','),
    clearSessionBeforeRole: process.env.CLEAR_SESSION_BEFORE_ROLE !== 'false', // Default: true
    enableScreenshots: process.env.ENABLE_SCREENSHOTS === 'true', // Default: false (disabled)
    skipSubmenus: (process.env.SKIP_SUBMENUS || '').split(',').filter(s => s.trim()), // Skip specific submenus
    verifyDocumentsBeforeProcessing: true, // Verify actual documents exist before processing (not just badge count)
    maxEmptyDocumentRetries: 2 // Max retries when submenu has badge but no documents
};

/**
 * Main execution function
 * @async
 * @function main
 * @description Orchestrates the entire SIDIA automation workflow
 * @throws {Error} If configuration is invalid or critical failures occur
 */
async function main() {
    console.log(chalk.cyan('\n🚀 SIDIA Automation - Starting...\n'));

    let browser;
    let stats = createStats();
    let failed = false;
    record('run_start');

    try {
        // Validate configuration
        validateConfig();

        // Prevent system from sleeping during automation (can be disabled with env var)
        if (process.env.PREVENT_SLEEP !== 'false') {
            console.log(chalk.yellow('🔋 Preventing system sleep...'));
            preventSleep();
        } else {
            console.log(chalk.gray('→ Sleep prevention disabled via PREVENT_SLEEP=false'));
        }

        // Launch browser
        console.log(chalk.yellow('📱 Launching browser...'));
        browser = await launchBrowser(CONFIG.headless);

        // Create and configure page
        const page = await createPage(browser, CONFIG.timeout);

        // Execute workflow
        try {
            await executeWorkflow(page, stats);
        } catch (error) {
            console.error(chalk.red('\n❌ Error during execution:', error.message));

            // Try to save session even on error
            try {
                await saveSession(page);
            } catch (e) {
                // Ignore save errors during error handling
            }
            throw error;
        }

    } catch (error) {
        console.error(chalk.red('\n❌ Error:', error.message));
        failed = true;
        record('run_end', { total: stats.totalProcessed, status: 'error', error: error.message });
        process.exit(1);
    } finally {
        // Restore normal sleep settings (if they were changed)
        if (process.env.PREVENT_SLEEP !== 'false') {
            console.log(chalk.yellow('🔋 Restoring normal sleep settings...'));
            restoreSleep();
        }

        if (browser) {
            if (browser._isConnectedBrowser) {
                await browser.disconnect();
            } else {
                await browser.close();
            }
            completeProcessing(stats);
            if (!failed) record('run_end', { total: stats.totalProcessed, status: 'ok' });
            displaySummary(stats);
            console.log(chalk.cyan('\n✅ Automation completed!\n'));
        }
    }
}

/**
 * Execute the complete workflow
 * @param {Page} page - Puppeteer page instance
 * @param {Object} stats - Statistics tracking object
 */
async function executeWorkflow(page, stats) {
    // Authentication steps
    await login(page, CONFIG);

    // Force fresh state for role selection - NO session saving
    console.log(chalk.yellow('  → Ensuring fresh state for role selection...'));

    await selectRole(page);

    // Document processing
    await navigateToNaskahMasuk(page, CONFIG);

    const processingStats = await processMenusWithBadges(page, CONFIG);

    // Update stats with processing results
    stats.totalProcessed = processingStats.totalProcessed;
    stats.byType = processingStats.byType;
}

/**
 * Validate configuration
 * @throws {Error} If required configuration is missing
 */
function validateConfig() {
    if (!CONFIG.username || CONFIG.username === 'your_username_here') {
        throw new Error('Please set SIDIA_USERNAME in .env file');
    }
    if (!CONFIG.password || CONFIG.password === 'your_password_here') {
        throw new Error('Please set SIDIA_PASSWORD in .env file');
    }
}

// Run the automation if this is the main module
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('\n❌ Fatal error:', error));
        process.exit(1);
    });
}

// Export for testing and external use
module.exports = {
    main,
    CONFIG
};