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

// Configuration
const CONFIG = {
    username: process.env.SIDIA_USERNAME,
    password: process.env.SIDIA_PASSWORD,
    baseUrl: process.env.SIDIA_BASE_URL || 'https://sidia.bpjsketenagakerjaan.go.id',
    timeout: parseInt(process.env.TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 10,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 3000,
    headless: process.env.HEADLESS === 'true' || process.env.HEADLESS === 'True' || process.env.HEADLESS === 'TRUE',
    feedbackMessage: process.env.FEEDBACK_MESSAGE || 'dipedomani dan dilaksanakan',
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

    try {
        // Validate configuration
        validateConfig();

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
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
            completeProcessing(stats);
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