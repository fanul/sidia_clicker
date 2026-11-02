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

const AUTO_LOG = path.join(__dirname, 'data', 'automation.log');

function pushLog(chunk) {
    const text = chunk.toString().replace(ANSI, '');
    try {
        fs.appendFileSync(AUTO_LOG, text);
    } catch (e) {}

    text.split(/\r?\n/).forEach(line => {
        if (line.trim()) {
            logLines.push(line);
            updateTelemetryFromLine(line);
        }
    });
    if (logLines.length > MAX_LOG_LINES) {
        logLines = logLines.slice(-MAX_LOG_LINES);
    }
}

function startAutomation(headless) {
    if (child) return false;

    const args = ['index.js'];
    if (headless) {
        args.push('--headless');
    } else {
        args.push('--no-headless');
    }

    logLines = [];
    lastExitCode = null;
    startedAt = new Date();
    resetTelemetry();

    // Re-read .env so settings saved from the dashboard apply without restarting the server
    const env = { ...process.env, ...readValues() };
    env.HEADLESS = headless ? 'true' : 'false';

    child = spawn(process.execPath, args, { cwd: __dirname, env });
    child.stdout.on('data', pushLog);
    child.stderr.on('data', pushLog);
    child.on('error', err => pushLog(`Failed to start: ${err.message}`));
    child.on('close', code => {
        pushLog(`--- Automation exited (code ${code}) ---`);
        lastExitCode = code;
        child = null;
        finalizeTelemetry(code);
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

function getChromeExecutable() {
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
        return process.env.CHROME_PATH;
    }
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null
    ].filter(Boolean);

    for (const c of candidates) {
        if (fs.existsSync(c)) {
            return c;
        }
    }
    return 'chrome.exe';
}

function launchMimicAuth() {
    const chromePath = getChromeExecutable();
    const profileDir = process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'AutomationProfile')
        : path.join(__dirname, 'browser-profile');

    if (!fs.existsSync(profileDir)) {
        try { fs.mkdirSync(profileDir, { recursive: true }); } catch (e) {}
    }

    const args = [
        '--remote-debugging-port=9222',
        `--user-data-dir=${profileDir}`,
        'https://sidia.bpjsketenagakerjaan.go.id/login'
    ];

    pushLog('🌐 Membuka Google Chrome resmi di Port 9222 (Mimic Auth)...');
    try {
        const cp = spawn(chromePath, args, {
            detached: true,
            stdio: 'ignore'
        });
        cp.unref();
        return true;
    } catch (e) {
        pushLog(`❌ Gagal membuka Chrome Mimic Auth: ${e.message}`);
        return false;
    }
}

const SESSION_FILE = path.join(__dirname, 'data', 'session.json');

function getSessionStatus() {
    if (!fs.existsSync(SESSION_FILE)) return { exists: false };
    try {
        const raw = fs.readFileSync(SESSION_FILE, 'utf8');
        const session = JSON.parse(raw);
        const stats = fs.statSync(SESSION_FILE);
        return {
            exists: !!(session.authToken || session.authSikd || session.cookies),
            hasAuthToken: !!session.authToken,
            hasAuthSikd: !!session.authSikd,
            hasCookies: !!session.cookies,
            updatedAt: stats.mtime.toISOString()
        };
    } catch (e) {
        return { exists: false, error: e.message };
    }
}

// Noise cookies (analytics, ads, tracking) that should be stripped out
const IGNORED_COOKIE_PREFIXES = [
    '_ga', '_gid', '_gat', '_gcl', '_fbp', '_hj', 'amp_', '__utm', 'nid', '1p_jar', 'consent', 'socs', '_grecaptcha'
];

function filterEssentialCookies(rawCookies) {
    if (!rawCookies) return '';

    let cookieList = [];
    if (typeof rawCookies === 'string') {
        cookieList = rawCookies.split(';').map(c => c.trim()).filter(Boolean);
    } else if (Array.isArray(rawCookies)) {
        return rawCookies.filter(c => {
            const name = (c.name || '').toLowerCase();
            return !IGNORED_COOKIE_PREFIXES.some(p => name.startsWith(p));
        });
    }

    const filtered = cookieList.filter(c => {
        const eqIdx = c.indexOf('=');
        const name = (eqIdx !== -1 ? c.substring(0, eqIdx) : c).trim().toLowerCase();
        return !IGNORED_COOKIE_PREFIXES.some(p => name.startsWith(p));
    });

    return filtered.join('; ');
}

function cleanSessionPayload(payload) {
    let parsed = payload;
    let cookiePairsFromRawString = [];

    if (typeof payload === 'string') {
        payload = payload.trim();
        if (payload.startsWith('{') || payload.startsWith('[')) {
            try {
                parsed = JSON.parse(payload);
            } catch (e) {
                // fallback to text parsing below
            }
        }

        if (!parsed || typeof parsed !== 'object') {
            // It's a raw string (e.g. cookies or token)
            if (payload.includes('=')) {
                // Key-value pairs separated by semicolon
                const parts = payload.split(';').map(p => p.trim()).filter(Boolean);
                parsed = {};
                for (const p of parts) {
                    const eqIdx = p.indexOf('=');
                    const k = (eqIdx !== -1 ? p.substring(0, eqIdx) : p).trim();
                    const v = eqIdx !== -1 ? p.substring(eqIdx + 1).trim() : '';
                    if (k === 'authToken' || k === 'auth-token' || k === 'token') {
                        parsed.authToken = v;
                    } else if (k === 'authSikd' || k === 'auth-sikd' || k === 'sikd') {
                        parsed.authSikd = v;
                    } else if (k === 'deviceId') {
                        parsed.deviceId = v;
                    } else {
                        cookiePairsFromRawString.push(`${k}=${v}`);
                    }
                }
                if (cookiePairsFromRawString.length > 0) {
                    parsed.cookies = cookiePairsFromRawString.join('; ');
                }
            } else if (payload.length > 40) {
                parsed = { authToken: payload.replace(/^Bearer\s+/i, '').trim() };
            } else {
                parsed = { cookies: payload };
            }
        }
    }

    // If parsed is an array of cookies (e.g. JSON array from DevTools)
    if (Array.isArray(parsed)) {
        parsed = { cookies: parsed };
    }

    const cleaned = {};

    // 1. Extract and sanitize authToken
    const rawToken = parsed.authToken || parsed.token || parsed['auth-token'] || parsed.Authorization;
    if (rawToken) {
        cleaned.authToken = String(rawToken).replace(/^Bearer\s+/i, '').trim();
    }

    // 2. Extract authSikd
    const rawSikd = parsed.authSikd || parsed['auth-sikd'] || parsed.sikd;
    if (rawSikd) {
        cleaned.authSikd = String(rawSikd).trim();
    }

    // 3. Extract deviceId
    if (parsed.deviceId) {
        cleaned.deviceId = String(parsed.deviceId).trim();
    }

    // 4. Filter only essential cookies (removing Google Analytics, Ads, tracking noise)
    const rawCookies = parsed.cookies || parsed.cookie;
    if (rawCookies) {
        cleaned.cookies = filterEssentialCookies(rawCookies);
    }

    // Preserve any specific SIDIA session keys if user passed full storage, excluding analytics
    for (const [k, v] of Object.entries(parsed)) {
        if (!cleaned[k] && ['authToken', 'authSikd', 'deviceId', 'cookies', 'cookie', 'token', 'auth-token', 'auth-sikd'].indexOf(k) === -1) {
            const lk = k.toLowerCase();
            if (!IGNORED_COOKIE_PREFIXES.some(p => lk.startsWith(p)) && !lk.startsWith('google') && !lk.startsWith('webpack')) {
                cleaned[k] = v;
            }
        }
    }

    return cleaned;
}

function saveSessionData(payload) {
    const cleaned = cleanSessionPayload(payload);
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(cleaned, null, 2), 'utf8');
    const cookieCount = cleaned.cookies ? (typeof cleaned.cookies === 'string' ? cleaned.cookies.split(';').length : cleaned.cookies.length) : 0;
    const msg = `Sesi SIDIA tersimpan (Token: ${cleaned.authToken ? '✓' : '-'}, Sikd: ${cleaned.authSikd ? '✓' : '-'}, Cookie penting: ${cookieCount})`;
    pushLog(`💉 ${msg}`);
    return { ok: true, message: msg, cleaned, cookieCount };
}

function clearSessionData() {
    if (fs.existsSync(SESSION_FILE)) {
        try { fs.unlinkSync(SESSION_FILE); } catch (e) {}
    }
    pushLog('🗑 Sesi tersimpan telah dihapus.');
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

let activeTelemetry = {
    currentMenu: 'Naskah Masuk',
    totalTarget: 0,
    currentDocIndex: 0,
    completedDocs: 0,
    skippedCount: 0,
    currentStep: 'Idle',
    currentStepKey: 'idle',
    actionDetail: 'Menunggu instruksi',
    percent: 0,
    elapsedSec: 0,
    avgSecPerDoc: 18,
    etaSec: 0,
    docPerihal: ''
};

function resetTelemetry() {
    activeTelemetry = {
        currentMenu: 'Naskah Masuk',
        totalTarget: 0,
        currentDocIndex: 0,
        completedDocs: 0,
        skippedCount: 0,
        currentStep: 'Inisialisasi',
        currentStepKey: 'navigating',
        actionDetail: 'Mempersiapkan browser & navigasi sesi SIDIA...',
        percent: 0,
        elapsedSec: 0,
        avgSecPerDoc: 18,
        etaSec: 0,
        docPerihal: ''
    };
}

function finalizeTelemetry(exitCode) {
    if (activeTelemetry.totalTarget > 0) {
        activeTelemetry.currentStep = 'Batch Selesai';
        activeTelemetry.currentStepKey = 'batch_complete';
        activeTelemetry.actionDetail = exitCode === 0 
            ? 'Seluruh dokumen batch berhasil diproses.'
            : `Otomasi selesai (Kode keluar: ${exitCode}).`;
        activeTelemetry.percent = 100;
        activeTelemetry.remaining = 0;
    } else {
        activeTelemetry.currentStep = 'Idle';
        activeTelemetry.currentStepKey = 'idle';
        activeTelemetry.actionDetail = 'Sistem Siap';
    }
}

function updateTelemetryFromLine(line) {
    if (!line) return;

    // 1. Detect menu & total target docs (e.g. "Submenu clicked: Surat Masuk 8", "1. Surat Masuk (8 documents)")
    const m1 = line.match(/(?:Submenu clicked|Processing menu(?:\s+\d+\/\d+)?):\s*([A-Za-z\s]+?)(?:\s+(\d+))?$/i);
    if (m1) {
        if (m1[1] && m1[1].trim()) activeTelemetry.currentMenu = m1[1].trim();
        if (m1[2]) {
            const t = parseInt(m1[2], 10);
            if (t > 0) activeTelemetry.totalTarget = t;
        }
    }
    const m2 = line.match(/\d+\.\s*([A-Za-z\s]+?)\s*\(\s*(\d+)\s*documents?\)/i);
    if (m2) {
        if (m2[1] && m2[1].trim()) activeTelemetry.currentMenu = m2[1].trim();
        if (m2[2]) {
            const t = parseInt(m2[2], 10);
            if (t > 0) activeTelemetry.totalTarget = t;
        }
    }

    // 2. Detect current document index (e.g. "Processing document 5 (Baris ke-8...)")
    const docMatch = line.match(/Processing document\s*(\d+)/i) || line.match(/Preparing to process document\s*(\d+)/i);
    if (docMatch) {
        const idx = parseInt(docMatch[1], 10);
        if (idx > activeTelemetry.currentDocIndex) {
            activeTelemetry.currentDocIndex = idx;
        }
    }

    // 3. Detect completed document count (e.g. "✓ Document 3 processed successfully")
    const compMatch = line.match(/Document\s*(\d+)\s*processed successfully/i);
    if (compMatch) {
        const comp = parseInt(compMatch[1], 10);
        if (comp > activeTelemetry.completedDocs) {
            activeTelemetry.completedDocs = comp;
        }
    }

    // 4. Detect skipped count
    if (line.includes('Melewati dokumen baris')) {
        activeTelemetry.skippedCount++;
    }

    // 5. Detect subject / perihal
    const perihalMatch = line.match(/(?:Perihal|Tentang|Subject)\s*:\s*([^\r\n]+)/i);
    if (perihalMatch) {
        activeTelemetry.docPerihal = perihalMatch[1].trim();
    }

    // 6. Detect micro-actions and steps
    if (line.includes('Melewati dokumen') || line.includes('melewati ke dokumen')) {
        activeTelemetry.currentStep = 'Melewati Dokumen';
        activeTelemetry.currentStepKey = 'skipping';
        activeTelemetry.actionDetail = 'Dokumen tanpa tombol feedback dilewati ke baris berikutnya';
    } else if (line.includes('Rating') || line.includes('bintang') || line.includes('star')) {
        activeTelemetry.currentStep = 'Memberi Rating Bintang 5';
        activeTelemetry.currentStepKey = 'rating';
        activeTelemetry.actionDetail = 'Memilih penilaian kualitas naskah & disposisi';
    } else if (line.includes('Simpan button clicked') || line.includes('OK button clicked') || line.includes('Dialog konfirmasi')) {
        activeTelemetry.currentStep = 'Menyimpan Umpan Balik';
        activeTelemetry.currentStepKey = 'saving';
        activeTelemetry.actionDetail = 'Konfirmasi dialog penyimpanan rating & komentar';
    } else if (line.includes('Filling textarea') || line.includes('Textarea found') || line.includes('type method')) {
        activeTelemetry.currentStep = 'Mengetik Feedback';
        activeTelemetry.currentStepKey = 'typing';
        activeTelemetry.actionDetail = 'Mengisi pesan feedback ke lembar disposisi';
    } else if (line.includes('Feedback button found') || line.includes('Clicking Feedback button')) {
        activeTelemetry.currentStep = 'Membuka Form Feedback';
        activeTelemetry.currentStepKey = 'feedback_modal';
        activeTelemetry.actionDetail = 'Mengakses tombol feedback naskah & memicu dialog';
    } else if (line.includes('Lihat button clicked') || line.includes('Waiting for page navigation after Lihat')) {
        activeTelemetry.currentStep = 'Membuka Naskah Masuk';
        activeTelemetry.currentStepKey = 'opening_doc';
        activeTelemetry.actionDetail = 'Memuat lembar naskah dan data disposisi lengkap';
    } else if (line.includes('Starting Lihat button search') || line.includes('Lihat search:')) {
        activeTelemetry.currentStep = 'Memindai Tombol Naskah';
        activeTelemetry.currentStepKey = 'scanning';
        activeTelemetry.actionDetail = 'Mencari baris dokumen yang siap diproses';
    } else if (line.includes('Disposisi tab')) {
        activeTelemetry.currentStep = 'Memilih Tab Disposisi';
        activeTelemetry.currentStepKey = 'tab_selection';
        activeTelemetry.actionDetail = 'Membuka daftar disposisi dokumen naskah masuk';
    } else if (line.includes('Submenu clicked') || line.includes('Naskah Masuk')) {
        activeTelemetry.currentStep = 'Navigasi Menu';
        activeTelemetry.currentStepKey = 'navigating';
        activeTelemetry.actionDetail = 'Memilih jenis dokumen & verifikasi badge';
    } else if (line.includes('Semua dokumen yang dapat diproses telah selesai') || line.includes('All documents processed') || line.includes('All menus processed')) {
        activeTelemetry.currentStep = 'Selesai Memproses';
        activeTelemetry.currentStepKey = 'batch_complete';
        activeTelemetry.actionDetail = 'Seluruh target batch telah selesai diproses';
    }
}

function getTelemetry() {
    const elapsedSec = startedAt ? Math.max(1, Math.floor((Date.now() - new Date(startedAt)) / 1000)) : 0;
    const target = activeTelemetry.totalTarget || 0;
    const current = activeTelemetry.currentDocIndex || 0;
    const completed = activeTelemetry.completedDocs || 0;

    let percent = 0;
    if (activeTelemetry.currentStepKey === 'batch_complete' || (target > 0 && completed >= target)) {
        percent = 100;
    } else if (target > 0) {
        percent = Math.min(99, Math.round((current / target) * 100));
    }

    const remaining = target > 0 ? Math.max(0, target - current) : 0;
    const avgSecPerDoc = current > 0 ? Math.round(elapsedSec / current) : 18;
    const etaSec = remaining * avgSecPerDoc;

    return {
        ...activeTelemetry,
        percent,
        remaining,
        elapsedSec,
        avgSecPerDoc,
        etaSec
    };
}

function status() {
    const recentLogs = logLines.slice(-200);
    return {
        running: !!child,
        startedAt: startedAt && startedAt.toISOString(),
        lastExitCode,
        port: PORT,
        logs: recentLogs,
        telemetry: getTelemetry()
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
        let tooLarge = false;
        req.on('data', c => {
            raw += c;
            if (raw.length > 2e6) tooLarge = true;
        });
        req.on('end', () => {
            if (tooLarge) return resolve({ _error: 'Ukuran data terlalu besar (maksimal 2MB)' });
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
    if (req.method === 'POST' || req.method === 'DELETE') {
        const origin = req.headers.origin;
        if (origin && !allowedHosts.some(h => origin === `http://${h}`)) return false;
        if (req.method === 'POST' && !(req.headers['content-type'] || '').startsWith('application/json')) return false;
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

    // Serve static files from public directory (e.g. /css/*, /js/*)
    if (req.method === 'GET') {
        const safePath = path.normalize(url).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(PUBLIC_DIR, safePath);
        if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.json': 'application/json'
            };
            return sendFile(res, filePath, mimeTypes[ext] || 'application/octet-stream');
        }
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
    if (req.method === 'POST' && url === '/api/mimic-auth') {
        const ok = launchMimicAuth();
        return sendJson(res, ok ? 200 : 500, { ok, message: ok ? 'Jendela Google Chrome asli (Port 9222) telah dibuka. Silakan login ke SIDIA di jendela tersebut!' : 'Gagal membuka Google Chrome.' });
    }

    if (req.method === 'GET' && url === '/api/session') {
        return sendJson(res, 200, getSessionStatus());
    }
    if (req.method === 'POST' && url === '/api/session') {
        const body = await readBody(req);
        if (body && body._error) return sendJson(res, 413, { ok: false, message: body._error });
        try {
            const resData = saveSessionData(body.session || body);
            return sendJson(res, 200, { ok: true, message: resData.message, status: getSessionStatus() });
        } catch (e) {
            return sendJson(res, 400, { ok: false, message: 'Format data sesi tidak valid: ' + e.message });
        }
    }
    if (req.method === 'DELETE' && url === '/api/session') {
        clearSessionData();
        return sendJson(res, 200, { ok: true, message: 'Sesi tersimpan telah dihapus.', status: getSessionStatus() });
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
