/**
 * Tracker Module
 * Appends automation events to data/events.jsonl so the dashboard can draw graphs
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');

/**
 * Append one event (never throws - tracking must not break the automation)
 * @param {string} type - run_start | doc | run_end
 * @param {Object} data - Extra fields (menu, total, ...)
 */
function record(type, data = {}) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        const event = { time: new Date().toISOString(), type, ...data };
        fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
    } catch (e) {
        // Ignore tracking errors
    }
}

/**
 * Read all recorded events (bounded to last N events for performance)
 * @param {number} limit - Maximum recent events to load (default 5000)
 * @returns {Object[]} Events, oldest first
 */
function readEvents(limit = 5000) {
    try {
        if (!fs.existsSync(EVENTS_FILE)) return [];
        const lines = fs.readFileSync(EVENTS_FILE, 'utf8')
            .split('\n')
            .filter(Boolean);
        const slice = lines.length > limit ? lines.slice(-limit) : lines;
        return slice
            .map(line => {
                try { return JSON.parse(line); } catch (e) { return null; }
            })
            .filter(Boolean);
    } catch (e) {
        return [];
    }
}

module.exports = {
    record,
    readEvents,
    EVENTS_FILE
};
