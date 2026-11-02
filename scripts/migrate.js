/**
 * SIDIA SQLite + SQLite-Vec Migration & Schema Integrity Runner
 * Memeriksa, membuat tabel dan menjalankan migrasi skema database secara otomatis.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const sqliteVec = require('sqlite-vec');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'sidia.db');

function runMigrations() {
    console.log('[MIGRATE] Memeriksa integritas direktori data dan database SQLite...');
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('[MIGRATE] Direktori data dibuat.');
    }

    const db = new DatabaseSync(DB_PATH, { allowExtension: true });
    
    // Aktifkan mode WAL & timeout agar aman saat multi-proses
    try {
        db.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA busy_timeout = 5000;
            PRAGMA synchronous = NORMAL;
        `);
    } catch (e) {
        console.warn(`[MIGRATE] Peringatan pragma WAL: ${e.message}`);
    }

    // Load sqlite-vec extension
    try {
        sqliteVec.load(db);
        const v = db.prepare('SELECT vec_version() as v').get();
        console.log(`[MIGRATE] Ekstensi sqlite-vec aktif: ${v.v}`);
    } catch (e) {
        console.warn(`[MIGRATE] Peringatan sqlite-vec: ${e.message}`);
    }

    // 1. Table schema migrations tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT DEFAULT (datetime('now'))
        );
    `);

    const isApplied = (ver) => {
        const row = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(ver);
        return !!row;
    };
    const markApplied = (ver) => {
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(ver);
    };

    // Migration 001: Base documents table
    if (!isApplied('001_create_documents')) {
        console.log('[MIGRATE] Menjalankan migrasi 001_create_documents...');
        db.exec(`
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
            CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
            CREATE INDEX IF NOT EXISTS idx_documents_menu ON documents(menu);
        `);
        markApplied('001_create_documents');
    }

    // Migration 002: Table doc_elements for hidden element inspection
    if (!isApplied('002_create_doc_elements')) {
        console.log('[MIGRATE] Menjalankan migrasi 002_create_doc_elements...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS doc_elements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT,
                tag TEXT,
                text TEXT,
                classes TEXT,
                selector TEXT,
                is_visible INTEGER,
                attributes_json TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY(doc_id) REFERENCES documents(id)
            );
            CREATE INDEX IF NOT EXISTS idx_elements_doc ON doc_elements(doc_id);
        `);
        markApplied('002_create_doc_elements');
    }

    // Column integrity verification on documents table
    const tableInfo = db.prepare(`PRAGMA table_info(documents)`).all();
    const existingCols = new Set(tableInfo.map(c => c.name));

    const requiredCols = [
        { name: 'menu', type: 'TEXT' },
        { name: 'nomor_naskah', type: 'TEXT' },
        { name: 'perihal', type: 'TEXT' },
        { name: 'pengirim', type: 'TEXT' },
        { name: 'tanggal', type: 'TEXT' },
        { name: 'has_font_weight_black', type: 'INTEGER DEFAULT 1' },
        { name: 'status', type: "TEXT DEFAULT 'PENDING'" },
        { name: 'row_index', type: 'INTEGER' },
        { name: 'url', type: 'TEXT' },
        { name: 'buttons_json', type: 'TEXT' },
        { name: 'error_reason', type: 'TEXT' },
        { name: 'created_at', type: "TEXT DEFAULT (datetime('now'))" },
        { name: 'updated_at', type: "TEXT DEFAULT (datetime('now'))" }
    ];

    for (const col of requiredCols) {
        if (!existingCols.has(col.name)) {
            console.log(`[MIGRATE] Menambahkan kolom baru ke tabel documents: ${col.name}...`);
            db.exec(`ALTER TABLE documents ADD COLUMN ${col.name} ${col.type};`);
        }
    }

    db.close();
    console.log('[MIGRATE] Database & skema SQLite siap digunakan (100% up to date).');
}

if (require.main === module) {
    try {
        runMigrations();
        process.exit(0);
    } catch (err) {
        console.error('[MIGRATE] Gagal menjalankan migrasi:', err);
        process.exit(1);
    }
}

module.exports = { runMigrations };
