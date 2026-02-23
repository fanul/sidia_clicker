/**
 * Statistics Module
 * Handles tracking and displaying processing statistics
 */

const chalk = require('chalk');

/**
 * Create a new statistics tracker
 * @returns {Object} Statistics object
 */
function createStats() {
    return {
        totalProcessed: 0,
        byType: {},
        startTime: new Date(),
        endTime: null
    };
}

/**
 * Update statistics after processing a document
 * @param {Object} stats - Statistics object
 * @param {string} type - Document type
 */
function updateStats(stats, type) {
    stats.totalProcessed++;

    if (!stats.byType[type]) {
        stats.byType[type] = 0;
    }
    stats.byType[type]++;
}

/**
 * Mark processing as complete
 * @param {Object} stats - Statistics object
 */
function completeProcessing(stats) {
    stats.endTime = new Date();
}

/**
 * Display final summary
 * @param {Object} stats - Statistics object
 */
function displaySummary(stats) {
    console.log(chalk.cyan('\n📈 STEP 5: Final Summary'));
    console.log(chalk.cyan('═'.repeat(50)));

    console.log(chalk.white(`\n  Total Documents Processed: ${stats.totalProcessed}`));

    if (Object.keys(stats.byType).length > 0) {
        console.log(chalk.white('\n  By Type:'));
        for (const [type, count] of Object.entries(stats.byType)) {
            console.log(chalk.white(`    - ${type}: ${count}`));
        }
    }

    if (stats.endTime) {
        const duration = Math.round((stats.endTime - stats.startTime) / 1000);
        console.log(chalk.white(`\n  Processing Duration: ${duration} seconds`));
    }

    console.log(chalk.white(`\n  Completed at: ${stats.endTime ? stats.endTime.toLocaleString() : new Date().toLocaleString()}`));
    console.log(chalk.cyan('\n' + '═'.repeat(50) + '\n'));
}

module.exports = {
    createStats,
    updateStats,
    completeProcessing,
    displaySummary
};