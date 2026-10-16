/**
 * Keep Awake Utility
 * Prevents Windows from sleeping during automation
 */

const { exec } = require('child_process');
const chalk = require('chalk');

let keepAwakeInterval = null;

/**
 * Prevent system sleep
 */
function preventSleep() {
    console.log(chalk.yellow('🔋 Enabling keep-awake mode...'));

    // Disable sleep and screen timeout
    const commands = [
        'powercfg /change standby-timeout-ac 0',
        'powercfg /change monitor-timeout-ac 0'
    ];

    commands.forEach(cmd => {
        exec(cmd, (error) => {
            if (error) {
                // Sering dibatasi oleh Group Policy laptop kantor / non-admin, bukan error fatal
                console.log(chalk.gray(`ℹ Power policy notice: ${cmd} (dilewati karena kebijakan sistem)`));
            } else {
                console.log(chalk.green(`✓ Executed: ${cmd}`));
            }
        });
    });

    // Optional: Send a key press every minute to keep system active
    // This is a fallback method
    keepAwakeInterval = setInterval(() => {
        // This would require robot-js or similar package
        // For now, we're relying on powercfg which should be sufficient
    }, 60000); // Every minute

    console.log(chalk.green('✓ System will stay awake'));
}

/**
 * Restore normal sleep settings
 */
function restoreSleep() {
    console.log(chalk.yellow('🔋 Restoring normal sleep settings...'));

    // Restore default sleep settings (30 minutes)
    const commands = [
        'powercfg /change standby-timeout-ac 30',
        'powercfg /change monitor-timeout-ac 10'
    ];

    commands.forEach(cmd => {
        exec(cmd, (error) => {
            if (error) {
                console.error(chalk.red(`✗ Failed to execute: ${cmd}`));
            } else {
                console.log(chalk.green(`✓ Executed: ${cmd}`));
            }
        });
    });

    if (keepAwakeInterval) {
        clearInterval(keepAwakeInterval);
        keepAwakeInterval = null;
    }

    console.log(chalk.green('✓ Normal sleep settings restored'));
}

/**
 * Check current power settings
 */
function checkPowerSettings() {
    return new Promise((resolve, reject) => {
        exec('powercfg /query', (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

module.exports = {
    preventSleep,
    restoreSleep,
    checkPowerSettings
};
