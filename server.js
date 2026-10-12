/**
 * SIDIA Dashboard Server
 * Serves a graph dashboard and lets you start/stop the automation from the browser.
 * Uses only Node built-ins plus the chart.js package (served locally, works offline).
 *
 * Port is configurable: PORT env var (or DASHBOARD_PORT), default 3333.
 */

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { readEvents } = require('./tracker');
const { getPublicSettings, saveSettings, readValues } = require('./settings');

const PORT = parseInt(process.env.PORT || process.env.DASHBOARD_PORT, 10) || 3333;
const HOST = process.env.HOST || '127.0.0.1';
const MAX_LOG_LINES = 500;

const PUBLIC_DIR = path.join(__dirname, 'public');
const CHART_JS = path.join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.js');

let child = null;
let startedAt = null;
let lastExitCode = null;
let logLines = [];

// Strip ANSI color codes from chalk output
const ANSI = /\x1b\[[0-9;]*m/g;

function pushLog(chunk) {
    chunk.toString().replace(ANSI, '').split(/\r?\n/).forEach(line => {
        if (line.trim()) logLines.push(line);
    });
    if (logLines.length > MAX_LOG_LINES) {
        logLines = logLines.slice(-MAX_LOG_LINES);
    }
}

function startAutomation(headless) {
    if (child) return false;

    const args = ['index.js'];
    if (headless) args.push('--headless');

    logLines = [];
    lastExitCode = null;
    startedAt = new Date();

    // Re-read .env so settings saved from the dashboard apply without restarting the server
    const env = { ...process.env, ...readValues() };
    if (headless) env.HEADLESS = 'true';

    child = spawn(process.execPath, args, { cwd: __dirname, env });
    child.stdout.on('data', pushLog);
    child.stderr.on('data', pushLog);
    child.on('error', err => pushLog(`Failed to start: ${err.message}`));
    child.on('close', code => {
        pushLog(`--- Automation exited (code ${code}) ---`);
        lastExitCode = code;
        child = null;
    });
    return true;
}

function stopAutomation() {
    if (!child) return false;
    const pid = child.pid;
    if (process.platform === 'win32') {
        // /T kills the whole tree (node + the Chrome it launched)
        execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {});
    } else {
        child.kill('SIGTERM');
    }
    return true;
}

/**
 * Aggregate recorded events into the data the graphs need
 */
function buildStats() {
    const events = readEvents();
    const byMenu = {};
    const byDay = {};
    const runs = [];
    let current = null;

    for (const ev of events) {
        const day = ev.time.slice(0, 10);

        if (ev.type === 'run_start') {
            current = { start: ev.time, end: null, docs: 0, status: 'running' };
            runs.push(current);
        } else if (ev.type === 'doc') {
            const menu = ev.menu || 'Unknown';
            byMenu[menu] = (byMenu[menu] || 0) + 1;
            byDay[day] = (byDay[day] || 0) + 1;
            if (current && !current.end) current.docs++;
        } else if (ev.type === 'run_end') {
            if (current) {
                current.end = ev.time;
                current.status = ev.status || 'ok';
                current.error = ev.error;
            }
            current = null;
        }
    }

    // A run with no end that isn't the live child was interrupted (crash / stop)
    runs.forEach((r, i) => {
        if (!r.end && !(child && i === runs.length - 1)) r.status = 'interrupted';
    });

    const total = Object.values(byMenu).reduce((a, b) => a + b, 0);
    const today = new Date().toISOString().slice(0, 10);

    return {
        total,
        today: byDay[today] || 0,
        runCount: runs.length,
        byMenu,
        byDay,
        runs: runs.slice(-20)
    };
}

function status() {
    return {
        running: !!child,
        startedAt: startedAt && startedAt.toISOString(),
        lastExitCode,
        port: PORT,
        logs: logLines.slice(-200)
    };
}

function sendJson(res, code, body) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
}

function sendFile(res, file, type) {
    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': type });
        res.end(data);
    });
}

function readBody(req) {
    return new Promise(resolve => {
        let raw = '';
        req.on('data', c => { raw += c; if (raw.length > 1e5) req.destroy(); });
        req.on('end', () => {
            try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
        });
    });
}

/**
 * Only accept requests meant for this dashboard. Blocks other websites from
 * calling the local API (cross-site requests and DNS rebinding).
 */
function isAllowedRequest(req) {
    const allowedHosts = [`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`];
    if (!allowedHosts.includes(req.headers.host)) return false;
    if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && !allowedHosts.some(h => origin === `http://${h}`)) return false;
        if (!(req.headers['content-type'] || '').startsWith('application/json')) return false;
    }
    return true;
}

const server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];

    if (!isAllowedRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden');
    }

    if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
        return sendFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url === '/vendor/chart.js') {
        return sendFile(res, CHART_JS, 'application/javascript; charset=utf-8');
    }
    if (req.method === 'GET' && url === '/api/stats') return sendJson(res, 200, buildStats());
    if (req.method === 'GET' && url === '/api/status') return sendJson(res, 200, status());

    if (req.method === 'GET' && url === '/api/settings') return sendJson(res, 200, getPublicSettings());
    if (req.method === 'POST' && url === '/api/settings') {
        const body = await readBody(req);
        try {
            saveSettings(body);
            return sendJson(res, 200, { ok: true, running: !!child, settings: getPublicSettings() });
        } catch (e) {
            return sendJson(res, 400, { ok: false, message: e.message });
        }
    }

    if (req.method === 'POST' && url === '/api/run') {
        const body = await readBody(req);
        const ok = startAutomation(!!body.headless);
        return sendJson(res, ok ? 200 : 409, { ok, message: ok ? 'Started' : 'Already running' });
    }
    if (req.method === 'POST' && url === '/api/stop') {
        const ok = stopAutomation();
        return sendJson(res, ok ? 200 : 409, { ok, message: ok ? 'Stopping' : 'Not running' });
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Run stop.bat first or set PORT in .env.`);
    } else {
        console.error(err);
    }
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    console.log(`SIDIA Dashboard running at http://localhost:${PORT}`);
    if (process.argv.includes('--autorun')) {
        console.log('Auto-run enabled, starting automation...');
        startAutomation(process.argv.includes('--headless'));
    }
});

function shutdown() {
    stopAutomation();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
