/**
 * Element Reference Module
 * Contains exact HTML structures and state transitions for all critical elements
 * This provides precise element detection with before/after state matching
 */

const ELEMENT_REFERENCES = {
    loginButton: {
        description: 'Login button',
        before: {
            // Login button before username filled
            html: '<button type="button" disabled="disabled" class="btn-login v-btn v-btn--disabled v-btn--has-bg theme--light v-size--default"><span class="v-btn__content"><i aria-hidden="true" class="v-icon notranslate v-icon--left mdi mdi-login theme--light"></i>LOGIN</span></button>',
            selectors: [
                'button.btn-login',
                'button.v-btn .v-btn__content:contains("LOGIN")',
                'button:has(.mdi-login)',
                'button[type="button"] .v-btn__content:contains("LOGIN")'
            ],
            keyAttributes: {
                'type': 'button',
                'disabled': 'disabled',
                'class': ['btn-login', 'v-btn', 'v-btn--disabled']
            },
            keyClasses: ['btn-login', 'v-btn--disabled', 'mdi-login'],
            textContent: 'LOGIN',
            icon: 'mdi-login',
            state: 'disabled'
        },
        after: {
            // Login button after username filled
            html: '<span class="v-btn__content"><i aria-hidden="true" class="v-icon notranslate v-icon--left mdi mdi-login theme--light"></i>LOGIN</span>',
            selectors: [
                'button.btn-login:not([disabled])',
                'button.v-btn:not(.v-btn--disabled) .v-btn__content:contains("LOGIN")',
                'button:has(.mdi-login):not([disabled])'
            ],
            keyAttributes: {
                'type': 'button',
                'disabled': null, // No longer disabled
                'class': ['btn-login', 'v-btn']
            },
            keyClasses: ['btn-login', 'mdi-login'],
            textContent: 'LOGIN',
            icon: 'mdi-login',
            state: 'enabled'
        },
        stateTransitions: {
            'disabled': 'enabled',
            'classChange': ['v-btn--disabled', null]
        },
        detectionPriority: [
            'icon_class', // 1. Look for mdi-login icon
            'text_content', // 2. Look for LOGIN text
            'btn_class', // 3. Look for btn-login class
            'parent_selector' // 4. Look in button container
        ]
    },

    roleInput: {
        description: 'Role selection input field',
        before: {
            // Role select before clicked
            html: '<i aria-hidden="true" class="v-icon notranslate mdi mdi-menu-down theme--light primary--text"></i>',
            selectors: [
                'input[type="text"][autocomplete="off"]',
                '.v-input input[type="text"]',
                'input:not([type="password"])'
            ],
            keyAttributes: {
                'type': 'text',
                'autocomplete': 'off'
            },
            icon: 'mdi-menu-down',
            state: 'collapsed'
        },
        after: {
            // Role select after clicked (dropdown open)
            html: '<input id="input-301" type="text" autocomplete="off">',
            selectors: [
                'input[type="text"][autocomplete="off"]:focus',
                '.v-input input[type="text"]:focus'
            ],
            keyAttributes: {
                'type': 'text',
                'autocomplete': 'off',
                'aria-activedescendant': null // Not yet selected
            },
            state: 'focused'
        },
        selected: {
            // Role select after selected
            html: '<input id="input-301" type="text" autocomplete="off" aria-activedescendant="list-item-313-0">',
            selectors: [
                'input[aria-activedescendant]',
                'input[aria-activedescendant*="list-item"]'
            ],
            keyAttributes: {
                'aria-activedescendant': 'list-item-313-0' // Has value
            },
            state: 'selected'
        },
        detectionPriority: [
            'autocomplete_off', // 1. Look for autocomplete="off"
            'dropdown_icon', // 2. Look for mdi-menu-down icon
            'aria_activedescendant' // 3. Look for aria-activedescendant attribute
        ]
    },

    pilihButton: {
        description: 'PILIH button for role selection',
        before: {
            // Pilih button before clicked
            html: '<button type="button" disabled="disabled" class="btn-half v-btn v-btn--disabled v-btn--has-bg theme--light v-size--default"><span class="v-btn__content">PILIH</span></button>',
            selectors: [
                'button.btn-half',
                'button:has(.v-btn__content:contains("PILIH"))',
                'button.v-btn:has(span:contains("PILIH"))'
            ],
            keyAttributes: {
                'type': 'button',
                'disabled': 'disabled',
                'class': ['btn-half', 'v-btn--disabled']
            },
            keyClasses: ['btn-half', 'v-btn--disabled'],
            textContent: 'PILIH',
            state: 'disabled'
        },
        after: {
            // Pilih button after clicked
            html: '<button type="button" class="btn-half v-btn v-btn--is-elevated v-btn--has-bg theme--light v-size--default success"><span class="v-btn__content">PILIH</span></button>',
            selectors: [
                'button.btn-half.success',
                'button.btn-half:not([disabled])'
            ],
            keyAttributes: {
                'type': 'button',
                'disabled': null,
                'class': ['btn-half', 'success', 'v-btn--is-elevated']
            },
            keyClasses: ['btn-half', 'success'],
            textContent: 'PILIH',
            state: 'enabled_and_clicked'
        },
        detectionPriority: [
            'btn_class_text', // 1. Look for btn-half class + PILIH text
            'text_content', // 2. Look for PILIH text
            'button_with_span' // 3. Look for button with span containing PILIH
        ]
    },

    naskahMasukMenu: {
        description: 'Naskah Masuk menu item',
        before: {
            // Naskah masuk before clicked
            html: '<div tabindex="0" aria-expanded="false" role="button" class="v-list-group__header v-list-item v-list-item--link theme--dark"><div class="v-list-item__action"><i aria-hidden="true" class="v-icon notranslate mdi mdi-inbox theme--dark"></i></div> <div class="v-list-item__content"><div class="v-list-item__title">Naskah Masuk</div></div> <span class="v-badge v-badge--overlap theme--dark"><span class="v-badge__wrapper"><span aria-atomic="true" aria-label="Badge" aria-live="polite" role="status" class="v-badge__badge success" style="inset: auto auto calc(100% - 12px) calc(100% - 12px);">457</span></span></span><div class="v-list-item__icon v-list-group__header__append-icon"><i aria-hidden="true" class="v-icon notranslate mdi mdi-chevron-down theme--dark"></i></div></div>',
            selectors: [
                '.v-list-item:has(.v-list-item__title:contains("Naskah Masuk"))',
                'div[role="button"]:has(.v-list-item__title:contains("Naskah Masuk"))',
                '.v-list-group__header:has(.mdi-inbox)'
            ],
            keyAttributes: {
                'role': 'button',
                'aria-expanded': 'false',
                'class': ['v-list-group__header', 'v-list-item', 'v-list-item--link']
            },
            keyClasses: ['v-list-group__header', 'mdi-inbox'],
            textContent: 'Naskah Masuk',
            icon: 'mdi-inbox',
            badge: {
                class: 'v-badge__badge success',
                text: '457'
            },
            state: 'collapsed'
        },
        after: {
            // Naskah masuk after clicked
            html: '<div tabindex="0" aria-expanded="true" role="button" class="v-list-group__header v-list-item v-list-item--active v-list-item--link theme--dark"><div class="v-list-item__action"><i aria-hidden="true" class="v-icon notranslate mdi mdi-inbox theme--dark"></i></div> <div class="v-list-item__content"><div class="v-list-item__title">Naskah Masuk</div></div> <span class="v-badge v-badge--overlap theme--dark"><span class="v-badge__wrapper"><span aria-atomic="true" aria-label="Badge" aria-live="polite" role="status" class="v-badge__badge success" style="inset: auto auto calc(100% - 12px) calc(100% - 12px);">457</span></span></span><div class="v-list-item__icon v-list-group__header__append-icon"><i aria-hidden="true" class="v-icon notranslate mdi mdi-chevron-down theme--dark"></i></div></div>',
            selectors: [
                '.v-list-item--active:has(.v-list-item__title:contains("Naskah Masuk"))',
                'div[aria-expanded="true"]:has(.v-list-item__title:contains("Naskah Masuk"))'
            ],
            keyAttributes: {
                'aria-expanded': 'true',
                'class': ['v-list-group__header', 'v-list-item--active']
            },
            keyClasses: ['v-list-item--active', 'mdi-inbox'],
            textContent: 'Naskah Masuk',
            icon: 'mdi-inbox',
            state: 'expanded'
        },
        detectionPriority: [
            'icon_text', // 1. Look for mdi-inbox + "Naskah Masuk"
            'badge_presence', // 2. Look for badge with number
            'role_button' // 3. Look for role="button" with text
        ]
    },

    disposisiTab: {
        description: 'Disposisi tab',
        before: {
            // Disposisi before clicked
            html: '<div data-v-6b3bab02="" tabindex="0" aria-selected="false" role="tab" class="v-tab">Disposisi<span data-v-6b3bab02="" class="v-badge v-badge--bordered theme--light"><span class="v-badge__wrapper"><span aria-atomic="true" aria-label="Badge" aria-live="polite" role="status" class="v-badge__badge success" style="inset: auto auto calc(100% - 4px) calc(100% - 4px);">60</span></span></span></div>',
            selectors: [
                'div[role="tab"]:contains("Disposisi")',
                '.v-tab:contains("Disposisi")',
                'div[aria-selected="false"]:contains("Disposisi")'
            ],
            keyAttributes: {
                'role': 'tab',
                'aria-selected': 'false',
                'class': ['v-tab']
            },
            keyClasses: ['v-tab'],
            textContent: 'Disposisi',
            badge: {
                class: 'v-badge__badge success',
                text: '60'
            },
            state: 'unselected'
        },
        after: {
            // Disposisi after clicked
            html: '<div data-v-6b3bab02="" tabindex="0" aria-selected="true" role="tab" class="v-tab v-tab--active">Disposisi<span data-v-6b3bab02="" class="v-badge v-badge--bordered theme--light"><span class="v-badge__wrapper"><span aria-atomic="true" aria-label="Badge" aria-live="polite" role="status" class="v-badge__badge success" style="inset: auto auto calc(100% - 4px) calc(100% - 4px);">60</span></span></span></div>',
            selectors: [
                'div[role="tab"][aria-selected="true"]:contains("Disposisi")',
                '.v-tab.v-tab--active:contains("Disposisi")'
            ],
            keyAttributes: {
                'aria-selected': 'true',
                'class': ['v-tab', 'v-tab--active']
            },
            keyClasses: ['v-tab', 'v-tab--active'],
            textContent: 'Disposisi',
            state: 'active'
        },
        detectionPriority: [
            'role_tab_text', // 1. Look for role="tab" + "Disposisi"
            'aria_selected', // 2. Look for aria-selected attribute
            'badge_presence' // 3. Look for badge with number
        ]
    },

    lihatButton: {
        description: 'Lihat button in document list',
        html: '<button data-v-a2399e9e="" type="button" class="mr-2 v-btn v-btn--is-elevated v-btn--has-bg theme--light v-size--small info"><span class="v-btn__content">Lihat</span></button>',
        selectors: [
            'button.v-btn:has(.v-btn__content:contains("Lihat"))',
            'button:has(span:contains("Lihat"))',
            'button.info:has(.v-btn__content:contains("Lihat"))'
        ],
        keyAttributes: {
            'type': 'button',
            'class': ['v-btn', 'v-btn--is-elevated', 'info']
        },
        keyClasses: ['v-btn', 'info'],
        textContent: 'Lihat',
        state: 'visible',
        detectionPriority: [
            'text_content', // 1. Look for LIHAT text
            'info_class', // 2. Look for info class
            'button_with_span' // 3. Look for button with span
        ]
    },

    feedbackButton: {
        description: 'Feedback button that appears after Lihat',
        html: '<button type="button" class="v-btn v-btn--is-elevated v-btn--has-bg theme--light v-size--default blue white--text darken-2"><span class="v-btn__content">Feedback</span></button>',
        selectors: [
            'button:has(.v-btn__content:contains("Feedback"))',
            'button.blue:has(.v-btn__content:contains("Feedback"))',
            'button.white--text:has(.v-btn__content:contains("Feedback"))'
        ],
        keyAttributes: {
            'type': 'button',
            'class': ['v-btn', 'blue', 'white--text']
        },
        keyClasses: ['v-btn', 'blue', 'white--text'],
        textContent: 'Feedback',
        state: 'visible',
        detectionPriority: [
            'text_content', // 1. Look for Feedback text
            'color_classes' // 2. Look for blue white--text classes
        ]
    },

    feedbackTextarea: {
        description: 'Textarea for feedback input',
        html: '<textarea id="input-286" placeholder="Masukkan Feedback Disposisi" rows="5"></textarea>',
        selectors: [
            'textarea[placeholder*="Feedback"]',
            'textarea[rows="5"]',
            'textarea'
        ],
        keyAttributes: {
            'placeholder': 'Masukkan Feedback Disposisi',
            'rows': '5'
        },
        placeholder: 'Masukkan Feedback Disposisi',
        feedbackText: 'Dipedomani dan dilaksanakan',
        state: 'empty'
    },

    simpanButton: {
        description: 'Simpan button for feedback',
        before: {
            // Simpan button before write
            html: '<button type="button" disabled="disabled" class="v-btn v-btn--disabled v-btn--has-bg theme--light v-size--default" style="min-width: 100px;"><span class="v-btn__content">Simpan</span></button>',
            selectors: [
                'button:has(.v-btn__content:contains("Simpan"))[disabled]',
                'button.v-btn--disabled:has(span:contains("Simpan"))'
            ],
            keyAttributes: {
                'type': 'button',
                'disabled': 'disabled',
                'style': 'min-width: 100px;'
            },
            keyClasses: ['v-btn--disabled'],
            textContent: 'Simpan',
            state: 'disabled'
        },
        after: {
            // Simpan button after write
            html: '<button type="button" class="v-btn v-btn--is-elevated v-btn--has-bg theme--light v-size--default primary" style="min-width: 100px;"><span class="v-btn__content">Simpan</span></button>',
            selectors: [
                'button.primary:has(.v-btn__content:contains("Simpan"))',
                'button.v-btn--is-elevated:has(span:contains("Simpan"))'
            ],
            keyAttributes: {
                'type': 'button',
                'disabled': null,
                'class': ['v-btn', 'v-btn--is-elevated', 'primary']
            },
            keyClasses: ['v-btn', 'primary'],
            textContent: 'Simpan',
            state: 'enabled'
        },
        detectionPriority: [
            'text_content_style', // 1. Look for Simpan text + min-width style
            'primary_class', // 2. Look for primary class
            'button_with_span' // 3. Look for button with span
        ]
    },

    okButton: {
        description: 'OK button in success popup',
        html: '<button type="button" class="swal2-confirm swal2-styled" aria-label="" style="display: inline-block; border-left-color: rgb(48, 133, 214); border-right-color: rgb(48, 133, 214);">OK</button>',
        selectors: [
            'button.swal2-confirm',
            'button:has(.v-btn__content:contains("OK"))',
            'button:contains("OK")'
        ],
        keyAttributes: {
            'type': 'button',
            'class': ['swal2-confirm', 'swal2-styled']
        },
        keyClasses: ['swal2-confirm', 'swal2-styled'],
        textContent: 'OK',
        state: 'visible',
        detectionPriority: [
            'swal_class', // 1. Look for swal2-confirm class
            'text_content', // 2. Look for OK text
            'styled_button' // 3. Look for swal2-styled class
        ]
    },

    kembaliButton: {
        description: 'KEMBALI button to return to list',
        html: '<span class="v-btn__content"><i aria-hidden="true" class="v-icon notranslate mr-2 mdi mdi-arrow-left theme--light"></i>KEMBALI</span>',
        selectors: [
            'button:has(.v-btn__content:contains("KEMBALI"))',
            'button:has(.mdi-arrow-left)',
            '.v-btn:has(.mdi-arrow-left):contains("KEMBALI")'
        ],
        keyAttributes: {
            'class': ['v-btn__content']
        },
        keyClasses: ['mdi-arrow-left'],
        textContent: 'KEMBALI',
        icon: 'mdi-arrow-left',
        state: 'visible',
        detectionPriority: [
            'icon_text', // 1. Look for mdi-arrow-left + KEMBALI
            'text_content', // 2. Look for KEMBALI text
            'arrow_icon' // 3. Look for mdi-arrow-left icon
        ]
    }
};

/**
 * Get element reference by description
 * @param {string} description - Element description
 * @returns {Object} Element reference or null
 */
function getElementReference(description) {
    const key = Object.keys(ELEMENT_REFERENCES).find(key => {
        const ref = ELEMENT_REFERENCES[key];
        return ref.description.toLowerCase() === description.toLowerCase() ||
               description.toLowerCase().includes(ref.description.toLowerCase().split(' ')[0]);
    });

    return key ? ELEMENT_REFERENCES[key] : null;
}

/**
 * Get all detection methods for an element
 * @param {string} description - Element description
 * @returns {Array} Array of detection methods
 */
function getDetectionMethods(description) {
    const ref = getElementReference(description);
    if (!ref) return [];

    return ref.detectionPriority || [];
}

/**
 * Get expected state transitions for an element
 * @param {string} description - Element description
 * @param {string} currentState - Current state ('before', 'after', etc.)
 * @returns {Object} State transition info
 */
function getStateTransition(description, currentState) {
    const ref = getElementReference(description);
    if (!ref || !ref[currentState]) return null;

    return {
        currentState: currentState,
        element: ref[currentState],
        transitions: ref.stateTransitions,
        detectionMethods: ref.detectionPriority
    };
}

/**
 * Generate enhanced selectors based on element reference
 * @param {string} description - Element description
 * @param {string} state - Element state ('before', 'after', etc.)
 * @returns {Array} Array of enhanced selectors
 */
function generateEnhancedSelectors(description, state = 'before') {
    const ref = getElementReference(description);
    if (!ref || !ref[state]) return [];

    const element = ref[state];
    const selectors = [];

    // Add original selectors
    if (element.selectors) {
        selectors.push(...element.selectors);
    }

    // Generate additional selectors based on element properties
    if (element.textContent) {
        selectors.push(`*:contains("${element.textContent}")`);
    }

    if (element.keyClasses && element.keyClasses.length > 0) {
        element.keyClasses.forEach(className => {
            if (!className.includes('disabled')) { // Skip disabled class
                selectors.push(`.${className}`);
            }
        });
    }

    if (element.icon) {
        selectors.push(`:has(.${element.icon})`);
    }

    if (element.keyAttributes) {
        Object.entries(element.keyAttributes).forEach(([key, value]) => {
            if (value && key !== 'disabled' && key !== 'class') {
                selectors.push(`[${key}="${value}"]`);
            } else if (key === 'class' && Array.isArray(value)) {
                const classSelector = value.join('.');
                if (classSelector) {
                    selectors.push(`.${classSelector.replace(/\s+/g, '.')}`);
                }
            }
        });
    }

    return [...new Set(selectors)]; // Remove duplicates
}

module.exports = {
    ELEMENT_REFERENCES,
    getElementReference,
    getDetectionMethods,
    getStateTransition,
    generateEnhancedSelectors
};
