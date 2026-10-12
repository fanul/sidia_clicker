/**
 * Settings Module
 * Reads and writes the .env file so settings can be edited from the dashboard
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV_FILE = path.join(__dirname, '.env');
const PLACEHOLDERS = ['your_username_here', 'your_password_here'];

// Keys editable from the dashboard
const FIELDS = {
    SIDIA_USERNAME: { secret: false },
    SIDIA_PASSWORD: { secret: true },
    FEEDBACK_MESSAGE: { secret: false },
    DOCUMENT_TYPES: { secret: false },
    SKIP_SUBMENUS: { secret: false }
};

function readEnvFile() {
    try {
        return fs.readFileSync(ENV_FILE, 'utf8');
    } catch (e) {
        return '';
    }
}

/**
 * Current values from the .env file (parsed fresh, not process.env)
 */
function readValues() {
    return dotenv.parse(readEnvFile());
}

/**
 * Settings for the frontend. The password is never sent back, only whether it is set.
 */
function getPublicSettings() {
    const v = readValues();
    const clean = key => (PLACEHOLDERS.includes(v[key]) ? '' : (v[key] || ''));
    return {
        SIDIA_USERNAME: clean('SIDIA_USERNAME'),
        passwordSet: !!clean('SIDIA_PASSWORD'),
        FEEDBACK_MESSAGE: v.FEEDBACK_MESSAGE || '',
        DOCUMENT_TYPES: v.DOCUMENT_TYPES || '',
        SKIP_SUBMENUS: v.SKIP_SUBMENUS || ''
    };
}

/**
 * Format a value so dotenv parses it back unchanged
 */
function formatValue(value) {
    if (/^[^\s#'"`\\$]*$/.test(value)) return value;
    if (!value.includes("'")) return `'${value}'`;
    if (!value.includes('`')) return '`' + value + '`';
    if (!/["\\$]/.test(value)) return `"${value}"`;
    throw new Error('Nilai mengandung kombinasi karakter yang tidak didukung di .env');
}

/**
 * Save settings into .env, keeping every other line untouched.
 * An empty password means "keep the current one".
 */
function saveSettings(input) {
    const updates = {};
    for (const key of Object.keys(FIELDS)) {
        if (typeof input[key] !== 'string') continue;
        const value = input[key].trim();
        if (/[\r\n]/.test(value)) throw new Error(`${key} tidak boleh berisi baris baru`);
        if (key === 'SIDIA_PASSWORD' && value === '') continue;
        updates[key] = value;
    }

    const lines = readEnvFile().split(/\r?\n/);
    if (lines[lines.length - 1] === '') lines.pop();

    const done = new Set();
    const out = lines.map(line => {
        const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (m && m[1] in updates) {
            done.add(m[1]);
            return `${m[1]}=${formatValue(updates[m[1]])}`;
        }
        return line;
    });

    for (const key of Object.keys(updates)) {
        if (!done.has(key)) out.push(`${key}=${formatValue(updates[key])}`);
    }

    fs.writeFileSync(ENV_FILE, out.join('\n') + '\n', 'utf8');
}

module.exports = {
    getPublicSettings,
    saveSettings,
    readValues
};
