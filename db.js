/**
 * SIDIA Database & Metadata Decoupling Module
 * Powered by native node:sqlite with sqlite-vec extension.
 * Decouples DOM scanning from page navigation, caching processed/skipped documents
 * and storing document metadata to avoid redundant 30s timeouts.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const sqliteVec = require('sqlite-vec');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'sidia.db');

let dbInstance = null;

function getDb() {
    if (dbInstance) return dbInstance;

    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        dbInstance = new DatabaseSync(DB_PATH, { allowExtension: true });
        
        // Optimasi konkurensi multi-proses & pencegahan lock SQLITE_BUSY
        try {
            dbInstance.exec(`
                PRAGMA journal_mode = WAL;
                PRAGMA busy_timeout = 5000;
                PRAGMA synchronous = NORMAL;
            `);
        } catch (pragmaErr) {
            console.warn('[DB] Warning setting WAL pragma:', pragmaErr.message);
        }

        try {
            sqliteVec.load(dbInstance);
        } catch (vecErr) {
            console.warn('[DB] Warning: sqlite-vec load error:', vecErr.message);
        }

        // Initialize schema
        dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                menu TEXT,
                nomor_naskah TEXT,
                perihal TEXT,
                pengirim TEXT,
                tanggal TEXT,
                has_font_weight_black INTEGER DEFAULT 1,
                status TEXT DEFAULT 'PENDING',
                row_index INTEGER,
                url TEXT,
                buttons_json TEXT,
                error_reason TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS doc_elements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT,
                tag TEXT,
                text TEXT,
                classes TEXT,
                selector TEXT,
                is_visible INTEGER,
                attributes_json TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
            CREATE INDEX IF NOT EXISTS idx_documents_menu ON documents(menu);
            CREATE INDEX IF NOT EXISTS idx_elements_doc ON doc_elements(doc_id);
        `);

        return dbInstance;
    } catch (err) {
        console.error('[DB] Failed to initialize SQLite database:', err.message);
        return null;
    }
}

/**
 * Extract a stable document ID from URL or fallback
 */
function extractDocId(url, fallbackText = '') {
    if (!url) return fallbackText ? 'doc_' + Buffer.from(fallbackText).toString('hex').slice(0, 16) : null;
    
    // Look for ?obj=...
    const objMatch = url.match(/[?&]obj=([a-f0-9]+)/i);
    if (objMatch) return 'obj_' + objMatch[1].slice(0, 32);

    // Look for /inbox/:id
    const inboxMatch = url.match(/\/inbox\/([A-Za-z0-9_-]+)/);
    if (inboxMatch) return 'inbox_' + inboxMatch[1];

    if (fallbackText) {
        return 'doc_' + Buffer.from(fallbackText).toString('hex').slice(0, 16);
    }
    return null;
}

/**
 * Check if a document is already marked as PROCESSED or SKIPPED
 */
function isDocumentResolved(docId) {
    if (!docId) return false;
    const db = getDb();
    if (!db) return false;

    try {
        const stmt = db.prepare(`SELECT status, error_reason FROM documents WHERE id = ?`);
        const row = stmt.get(docId);
        if (row && (row.status === 'PROCESSED' || row.status === 'SKIPPED_NO_FEEDBACK' || row.status === 'SKIPPED_READONLY')) {
            return {
                resolved: true,
                status: row.status,
                reason: row.error_reason || ''
            };
        }
        return { resolved: false };
    } catch (e) {
        return { resolved: false };
    }
}

/**
 * Upsert document metadata discovered from table or detail
 */
function upsertDocument(docData) {
    if (!docData || !docData.id) return;
    const db = getDb();
    if (!db) return;

    try {
        const stmt = db.prepare(`
            INSERT INTO documents (id, menu, nomor_naskah, perihal, pengirim, tanggal, has_font_weight_black, status, row_index, url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                menu = COALESCE(excluded.menu, documents.menu),
                nomor_naskah = COALESCE(excluded.nomor_naskah, documents.nomor_naskah),
                perihal = COALESCE(excluded.perihal, documents.perihal),
                pengirim = COALESCE(excluded.pengirim, documents.pengirim),
                has_font_weight_black = COALESCE(excluded.has_font_weight_black, documents.has_font_weight_black),
                row_index = COALESCE(excluded.row_index, documents.row_index),
                url = COALESCE(excluded.url, documents.url),
                updated_at = datetime('now')
        `);

        stmt.run(
            docData.id,
            docData.menu || null,
            docData.nomor_naskah || null,
            docData.perihal || null,
            docData.pengirim || null,
            docData.tanggal || null,
            docData.has_font_weight_black !== undefined ? (docData.has_font_weight_black ? 1 : 0) : 1,
            docData.status || 'PENDING',
            docData.row_index !== undefined ? docData.row_index : null,
            docData.url || null
        );
    } catch (e) {
        // Safe fail
    }
}

/**
 * Mark document as successfully processed
 */
function markDocumentProcessed(docId, details = {}) {
    if (!docId) return;
    const db = getDb();
    if (!db) return;

    try {
        const stmt = db.prepare(`
            UPDATE documents 
            SET status = 'PROCESSED', 
                error_reason = NULL,
                buttons_json = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `);
        stmt.run(JSON.stringify(details.buttons || []), docId);
    } catch (e) {}
}

/**
 * Mark document as skipped (e.g. no feedback button, staff-only)
 */
function markDocumentSkipped(docId, reason, buttons = []) {
    if (!docId) return;
    const db = getDb();
    if (!db) return;

    try {
        const stmt = db.prepare(`
            INSERT INTO documents (id, status, error_reason, buttons_json, updated_at)
            VALUES (?, 'SKIPPED_NO_FEEDBACK', ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                status = 'SKIPPED_NO_FEEDBACK',
                error_reason = excluded.error_reason,
                buttons_json = excluded.buttons_json,
                updated_at = datetime('now')
        `);
        stmt.run(docId, reason || 'No feedback form', JSON.stringify(buttons || []));
    } catch (e) {}
}

/**
 * Record raw page elements for inspection & hidden element identification
 */
function recordPageElements(docId, elements = []) {
    if (!docId || !elements || elements.length === 0) return;
    const db = getDb();
    if (!db) return;

    try {
        const stmt = db.prepare(`
            INSERT INTO doc_elements (doc_id, tag, text, classes, selector, is_visible, attributes_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const el of elements.slice(0, 30)) {
            stmt.run(
                docId,
                el.tag || null,
                el.text ? el.text.slice(0, 100) : null,
                el.classes || null,
                el.selector || null,
                el.is_visible ? 1 : 0,
                el.attributes ? JSON.stringify(el.attributes) : null
            );
        }
    } catch (e) {}
}

module.exports = {
    getDb,
    extractDocId,
    isDocumentResolved,
    upsertDocument,
    markDocumentProcessed,
    markDocumentSkipped,
    recordPageElements
};
