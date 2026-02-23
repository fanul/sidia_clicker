/**
 * Constants and Selectors for SIDIA Automation
 */

// Selectors organized by function
const SELECTORS = {
    // Login selectors
    login: {
        username: [
            'input[id="input-15"]',
            'input[name="username"]',
            'input[type="text"]'
        ],
        password: [
            'input[id="password"]',
            'input[name="password"]',
            'input[type="password"]'
        ],
        submitButton: [
            'button[type="submit"]',
            '.v-btn'
        ],
        loginButtonText: ['LOGIN', 'MASUK', 'Login', 'Masuk']
    },

    // Role selection selectors
    role: {
        dialog: [
            '[role="dialog"]',
            '.v-dialog',
            '.v-dialog__content'
        ],
        items: [
            '.v-list-item',
            '.v-list-item__title'
        ],
        buttonText: ['PILIH', 'Pilih']
    },

    // Navigation selectors
    navigation: {
        naskahMasuk: 'Naskah Masuk',
        inboxLinks: 'a[href*="/inbox"]'
    },

    // Document processing selectors
    documents: {
        badge: [
            '.v-badge__badge',
            '.font-weight-black'
        ],
        disposisiTab: ['Disposisi'],
        lihatButton: ['Lihat', 'LIHAT', 'View'],
        feedbackTextarea: 'textarea',
        saveButton: ['Simpan', 'SIMPAN'],
        successBox: [
            '.v-alert',
            '[role="alert"]',
            '.success--text'
        ],
        okButton: ['OK', 'Oke'],
        backButton: ['Kembali', 'KEMBALI', 'Back']
    }
};

// Text patterns to detect
const TEXT_PATTERNS = {
    logoutMessages: [
        'aktif di perangkat lain',
        'active on another device'
    ],
    logoutButtons: ['LOGOUT', 'Logout', 'KELUAR']
};

// Timing constants (in milliseconds)
const TIMING = {
    PAGE_LOAD: 3000,
    FIELD_INPUT: 1500,
    LOGIN_WAIT: 5000,
    LOGOUT_WAIT: 3000,
    ROLE_SELECTION: 2000,
    PILIH_RETRY: 1000,
    DISPOSISION_TAB: 2000,
    FEEDBACK_APPEARANCE: 90000,
    TEXTAREA_READY: 3000,
    SUCCESS_BOX: 30000,
    BUTTON_CLICK: 2000,
    NAVIGATION: 2000
};

// Retry limits
const RETRY_LIMITS = {
    LOGIN_ATTEMPTS: 5,
    PILIH_ATTEMPTS: 10,
    DEFAULT_RETRY: 10
};

// Viewport configuration
const VIEWPORT = {
    width: 1280,
    height: 800
};

// User agent string
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Browser launch arguments
const BROWSER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1280,800',
    '--disable-notifications',
    '--disable-infobars',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--disable-save-password-bubble',
    '--disable-translate'
];

module.exports = {
    SELECTORS,
    TEXT_PATTERNS,
    TIMING,
    RETRY_LIMITS,
    VIEWPORT,
    USER_AGENT,
    BROWSER_ARGS
};