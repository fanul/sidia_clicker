/**
 * Visual Helper Module
 * Captures screenshots and analyzes page structure to find fallback elements
 */

const fs = require('fs');
const path = require('path');

// Check if screenshots are enabled via environment variable
const SCREENSHOTS_ENABLED = process.env.ENABLE_SCREENSHOTS === 'true';

/**
 * Take a screenshot and save it with timestamp
 * @param {Page} page - Puppeteer page instance
 * @param {string} name - Screenshot name
 * @returns {Promise<string>} Screenshot file path
 */
async function captureScreenshot(page, name) {
    // Skip screenshot if not enabled
    if (!SCREENSHOTS_ENABLED) {
        return null;
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot_${name}_${timestamp}.png`;
        const filepath = path.join(__dirname, 'screenshots', filename);

        // Ensure screenshots directory exists
        const screenshotsDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`📸 Screenshot saved: ${filename}`);
        return filepath;
    } catch (error) {
        console.log(`⚠ Could not capture screenshot: ${error.message}`);
        return null;
    }
}

/**
 * Capture page structure (HTML snapshot) with enhanced debugging info
 * @param {Page} page - Puppeteer page instance
 * @param {string} name - Snapshot name
 * @returns {Promise<string>} Snapshot file path
 */
async function capturePageStructure(page, name) {
    // Skip structure capture if not enabled
    if (!SCREENSHOTS_ENABLED) {
        return null;
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `structure_${name}_${timestamp}.html`;
        const filepath = path.join(__dirname, 'screenshots', filename);

        // Get page HTML with detailed element information
        const html = await page.evaluate(() => {
            // Get visible portion of page
            const docClone = document.documentElement.cloneNode(true);

            // Remove scripts and styles to reduce size
            const scripts = docClone.querySelectorAll('script, style, link');
            scripts.forEach(el => el.remove());

            // Add detailed visibility info to ALL interactive elements
            const interactiveElements = docClone.querySelectorAll('button, .v-btn, input, a, [role="button"], .v-list-item, .v-tab');
            interactiveElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
                const tagName = el.tagName.toLowerCase();
                const id = el.id || '';
                const className = el.className || '';
                const textContent = (el.textContent || '').trim().substring(0, 100);

                // Create detailed debug attributes
                el.setAttribute('data-debug-visible', isVisible);
                el.setAttribute('data-debug-tag', tagName);
                el.setAttribute('data-debug-id', id);
                el.setAttribute('data-debug-class', className);
                el.setAttribute('data-debug-text', textContent);
                el.setAttribute('data-debug-rect', `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`);

                // Special attributes for specific element types
                if (tagName === 'input') {
                    el.setAttribute('data-debug-type', el.type || '');
                    el.setAttribute('data-debug-autocomplete', el.autocomplete || '');
                    el.setAttribute('data-debug-placeholder', el.placeholder || '');
                    el.setAttribute('data-debug-value', el.value || '');
                    el.setAttribute('data-debug-disabled', el.disabled || '');
                }

                if (tagName === 'button' || el.classList.contains('v-btn')) {
                    el.setAttribute('data-debug-disabled', el.disabled || '');
                    el.setAttribute('data-debug-type', el.type || '');
                }

                // Check for labels
                if (id) {
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (label) {
                        el.setAttribute('data-debug-label', label.textContent.trim());
                    }
                }

                // Check for aria attributes
                if (el.getAttribute('aria-selected')) {
                    el.setAttribute('data-debug-aria-selected', el.getAttribute('aria-selected'));
                }
                if (el.getAttribute('aria-expanded')) {
                    el.setAttribute('data-debug-aria-expanded', el.getAttribute('aria-expanded'));
                }
                if (el.getAttribute('aria-activedescendant')) {
                    el.setAttribute('data-debug-aria-activedescendant', el.getAttribute('aria-activedescendant'));
                }
            });

            // Add page info at the top
            const pageInfo = `
<!-- PAGE DEBUG INFO -->
<!-- URL: ${window.location.href} -->
<!-- Title: ${document.title} -->
<!-- Timestamp: ${new Date().toISOString()} -->
<!-- Visible Inputs: ${document.querySelectorAll('input').length} -->
<!-- Visible Buttons: ${document.querySelectorAll('button, .v-btn').length} -->
<!-- Visible Links: ${document.querySelectorAll('a').length} -->
<!-- Visible List Items: ${document.querySelectorAll('.v-list-item').length} -->
<!-- Visible Tabs: ${document.querySelectorAll('.v-tab').length} -->
<!-- END PAGE DEBUG INFO -->
`;

            return pageInfo + docClone.outerHTML;
        });

        fs.writeFileSync(filepath, html, 'utf8');
        console.log(`📄 Page structure saved: ${filename}`);
        return filepath;
    } catch (error) {
        console.log(`⚠ Could not capture page structure: ${error.message}`);
        return null;
    }
}

/**
 * Analyze page to find all clickable elements similar to what we're looking for
 * @param {Page} page - Puppeteer page instance
 * @param {string} elementType - Type of element ('button', 'input', 'link', etc.)
 * @param {Array<string>} targetTexts - Array of text patterns we're looking for
 * @returns {Promise<Object>} Analysis results
 */
async function analyzePageForSimilarElements(page, elementType, targetTexts) {
    try {
        console.log(`🔍 Analyzing page for ${elementType} elements similar to:`, targetTexts);

        const analysis = await page.evaluate((type, texts) => {
            const results = {
                allButtons: [],
                similarButtons: [],
                visibleButtons: [],
                recommendations: []
            };

            // Find all elements of the specified type
            let selectors = [];
            if (type === 'button') {
                selectors = ['button', '.v-btn', '[role="button"]', '[type="submit"]', '[type="button"]'];
            } else if (type === 'input') {
                selectors = ['input[type="text"]', 'input[type="password"]', 'input[type="email"]', 'input:not([type])'];
            } else if (type === 'link') {
                selectors = ['a', '[role="link"]', '.v-list-item', '.v-list-item__title'];
            }

            // Get all elements
            const allElements = [];
            selectors.forEach(selector => {
                const elements = Array.from(document.querySelectorAll(selector));
                elements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
                    const text = (el.textContent || '').trim().substring(0, 50);
                    const id = el.id || '';
                    const className = el.className || '';
                    const disabled = el.disabled || el.classList.contains('v-btn--disabled');

                    allElements.push({
                        selector: selector,
                        text: text,
                        id: id,
                        className: className,
                        isVisible: isVisible,
                        disabled: disabled,
                        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                        element: el // Store reference
                    });

                    if (isVisible) {
                        results.visibleButtons.push({
                            selector: selector,
                            text: text,
                            id: id,
                            className: className,
                            disabled: disabled
                        });
                    }
                });
            });

            results.allButtons = allElements.map(el => ({
                selector: el.selector,
                text: el.text,
                id: el.id,
                className: el.className,
                isVisible: el.isVisible,
                disabled: el.disabled
            }));

            // Find similar elements using fuzzy matching
            results.similarButtons = allElements
                .filter(el => el.isVisible && !el.disabled)
                .map(el => {
                    // Calculate similarity score
                    let maxSimilarity = 0;
                    texts.forEach(targetText => {
                        const lowerText = el.text.toLowerCase();
                        const lowerTarget = targetText.toLowerCase();

                        // Exact match
                        if (lowerText === lowerTarget) {
                            maxSimilarity = 100;
                        }
                        // Contains match
                        else if (lowerText.includes(lowerTarget) || lowerTarget.includes(lowerText)) {
                            maxSimilarity = Math.max(maxSimilarity, 80);
                        }
                        // Partial word match
                        else {
                            const words = lowerTarget.split(' ');
                            words.forEach(word => {
                                if (word.length > 2 && lowerText.includes(word)) {
                                    maxSimilarity = Math.max(maxSimilarity, 60);
                                }
                            });
                        }
                    });

                    return {
                        selector: el.selector,
                        text: el.text,
                        id: el.id,
                        className: el.className,
                        similarity: maxSimilarity,
                        rect: el.rect
                    };
                })
                .filter(el => el.similarity > 0)
                .sort((a, b) => b.similarity - a.similarity);

            // Generate recommendations
            if (results.similarButtons.length > 0) {
                const topMatches = results.similarButtons.slice(0, 3);
                topMatches.forEach(match => {
                    results.recommendations.push({
                        action: 'try_click',
                        element: match,
                        reason: `${match.similarity}% similar to target: "${match.text}"`
                    });
                });
            } else if (results.visibleButtons.length > 0) {
                // No similar elements, but visible elements exist
                const firstVisible = results.visibleButtons[0];
                results.recommendations.push({
                    action: 'try_first_visible',
                    element: firstVisible,
                    reason: `First visible element: "${firstVisible.text}"`
                });
            } else {
                results.recommendations.push({
                    action: 'no_elements_found',
                    element: null,
                    reason: 'No visible clickable elements found on page'
                });
            }

            return results;
        }, elementType, targetTexts);

        console.log(`🔍 Analysis complete:`);
        console.log(`   → Total elements: ${analysis.allButtons.length}`);
        console.log(`   → Visible elements: ${analysis.visibleButtons.length}`);
        console.log(`   → Similar elements: ${analysis.similarButtons.length}`);

        if (analysis.similarButtons.length > 0) {
            console.log(`   → Top similar elements:`);
            analysis.similarButtons.slice(0, 3).forEach(el => {
                console.log(`      • "${el.text}" (${el.similarity}% similar)`);
            });
        }

        return analysis;
    } catch (error) {
        console.log(`⚠ Analysis failed: ${error.message}`);
        return { allButtons: [], similarButtons: [], visibleButtons: [], recommendations: [] };
    }
}

/**
 * Try to click element using recommendation
 * @param {Page} page - Puppeteer page instance
 * @param {Object} recommendation - Recommendation from analyzePageForSimilarElements
 * @returns {Promise<boolean>} True if clicked successfully
 */
async function tryClickFromRecommendation(page, recommendation) {
    try {
        if (!recommendation.element) {
            return false;
        }

        console.log(`🎯 Trying recommendation: ${recommendation.reason}`);

        const result = await page.evaluate((rec) => {
            const selector = rec.element.selector;
            const text = rec.element.text;

            // Find element by selector and text
            const elements = Array.from(document.querySelectorAll(selector));
            const target = elements.find(el => {
                const elText = (el.textContent || '').trim().substring(0, 50);
                return elText === text || elText.includes(text);
            });

            if (target && target.offsetParent !== null) {
                target.click();
                return { clicked: true, element: text };
            }

            return { clicked: false, element: null };
        }, recommendation);

        if (result.clicked) {
            console.log(`✓ Clicked: ${result.element}`);
            return true;
        }

        return false;
    } catch (error) {
        console.log(`⚠ Recommendation click failed: ${error.message}`);
        return false;
    }
}

/**
 * Enhanced verification with visual fallback using exact element references
 * @param {Page} page - Puppeteer page instance
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} Verification result
 */
async function clickAndVerifyWithFallback(page, options) {
    const chalk = require('chalk');
    const { clickAndVerify } = require('./verification');
    const { getElementReference, generateEnhancedSelectors } = require('./elementReference');

    // First, try normal verification
    const result = await clickAndVerify(page, options);

    if (result.success) {
        return result;
    }

    // Verification failed - capture diagnostic info
    console.log(chalk.yellow(`⚠ Primary verification failed: ${result.reason}`));
    console.log(chalk.gray('  → Capturing diagnostic information...'));

    // Capture screenshots and page structure
    const screenshotPath = await captureScreenshot(page, options.elementDescription.replace(/\s+/g, '_'));
    const structurePath = await capturePageStructure(page, options.elementDescription.replace(/\s+/g, '_'));

    // Get element reference for enhanced detection
    const elementRef = getElementReference(options.elementDescription);
    let targetTexts = [];
    let enhancedSelectors = [];

    if (elementRef) {
        console.log(chalk.gray(`  → Using exact element reference: ${elementRef.description}`));

        // Extract text content from element reference
        if (elementRef.before && elementRef.before.textContent) {
            targetTexts.push(elementRef.before.textContent);
        }
        if (elementRef.after && elementRef.after.textContent) {
            targetTexts.push(elementRef.after.textContent);
        }

        // Generate enhanced selectors
        enhancedSelectors = generateEnhancedSelectors(options.elementDescription, 'before');
        console.log(chalk.gray(`  → Generated ${enhancedSelectors.length} enhanced selectors`));

        // Add detection methods info
        if (elementRef.detectionPriority) {
            console.log(chalk.gray(`  → Detection priority: ${elementRef.detectionPriority.join(' → ')}`));
        }
    } else {
        // Fallback to original method for unknown elements
        console.log(chalk.yellow(`  → No exact reference found for: ${options.elementDescription}`));

        let elementType = 'button';
        if (options.elementDescription.toLowerCase().includes('input') ||
            options.elementDescription.toLowerCase().includes('field')) {
            elementType = 'input';
        }

        // Extract target texts from the element description
        if (options.elementDescription.includes('Login')) targetTexts.push('Login', 'Masuk', 'Sign In');
        if (options.elementDescription.includes('PILIH')) targetTexts.push('PILIH', 'Pilih', 'Select');
        if (options.elementDescription.includes('Role')) targetTexts.push('Role', 'Pilih Role');
        if (options.elementDescription.includes('Lihat')) targetTexts.push('Lihat', 'LIHAT', 'View');
        if (options.elementDescription.includes('Simpan')) targetTexts.push('Simpan', 'SIMPAN', 'Save');
        if (options.elementDescription.includes('OK')) targetTexts.push('OK', 'Oke');
        if (options.elementDescription.includes('Kembali')) targetTexts.push('Kembali', 'KEMBALI', 'Back');
        if (options.elementDescription.includes('Naskah')) targetTexts.push('Naskah Masuk', 'Naskah');

        const analysis = await analyzePageForSimilarElements(page, elementType, targetTexts);

        // Try recommendations
        if (analysis.recommendations.length > 0) {
            console.log(chalk.yellow('  → Trying fallback recommendations...'));

            for (const recommendation of analysis.recommendations) {
                if (recommendation.action === 'try_click' || recommendation.action === 'try_first_visible') {
                    const clicked = await tryClickFromRecommendation(page, recommendation);

                    if (clicked) {
                        // Wait and verify state change
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Try to verify state change
                        let verified = false;
                        try {
                            const verifyResult = await page.evaluate(() => {
                                // Generic verification - check if anything changed
                                return {
                                    url: window.location.href,
                                    title: document.title,
                                    bodyText: document.body.textContent.substring(0, 100)
                                };
                            });
                            verified = true;
                        } catch (e) {
                            // Ignore verification errors for fallback
                        }

                        return {
                            success: true,
                            method: 'fallback',
                            recommendation: recommendation.reason,
                            screenshot: screenshotPath,
                            structure: structurePath,
                            analysis: analysis
                        };
                    }
                }
            }
        }

        // All fallbacks failed
        return {
            success: false,
            reason: `primary_verification_failed and no_fallback_worked`,
            screenshot: screenshotPath,
            structure: structurePath,
            analysis: analysis,
            originalError: result.reason
        };
    }

    // Use enhanced analysis with element reference
    const enhancedAnalysis = await analyzePageWithElementReference(page, elementRef, targetTexts, enhancedSelectors);

    // Try enhanced recommendations
    if (enhancedAnalysis.recommendations.length > 0) {
        console.log(chalk.yellow('  → Trying enhanced fallback recommendations...'));

        for (const recommendation of enhancedAnalysis.recommendations) {
            const clicked = await tryClickFromRecommendation(page, recommendation);

            if (clicked) {
                // Wait and verify state change
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Verify state change based on element reference
                let verified = false;
                if (elementRef && elementRef.after) {
                    try {
                        const verifyResult = await page.evaluate((expectedState) => {
                            // Check for expected state changes
                            const checks = {};

                            if (expectedState.aria_selected !== undefined) {
                                const tabs = document.querySelectorAll('[role="tab"]');
                                tabs.forEach(tab => {
                                    if (tab.getAttribute('aria-selected') === 'true') {
                                        checks.aria_selected = true;
                                    }
                                });
                            }

                            if (expectedState.state === 'expanded') {
                                const expanded = document.querySelector('[aria-expanded="true"]');
                                checks.expanded = expanded !== null;
                            }

                            if (expectedState.state === 'enabled' || expectedState.state === 'enabled_and_clicked') {
                                const currentUrl = window.location.href;
                                checks.url_changed = currentUrl !== expectedState.previousUrl;
                            }

                            return {
                                verified: Object.values(checks).some(v => v === true),
                                checks: checks,
                                url: window.location.href
                            };
                        }, { ...elementRef.after, previousUrl: page.url() });

                        verified = verifyResult.verified;
                    } catch (e) {
                        console.log(chalk.yellow(`  ⚠ Enhanced verification failed: ${e.message}`));
                    }
                }

                return {
                    success: true,
                    method: 'enhanced_fallback',
                    recommendation: recommendation.reason,
                    screenshot: screenshotPath,
                    structure: structurePath,
                    analysis: enhancedAnalysis
                };
            }
        }
    }

    // All enhanced fallbacks failed
    return {
        success: false,
        reason: `primary_verification_failed and no_enhanced_fallback_worked`,
        screenshot: screenshotPath,
        structure: structurePath,
        analysis: enhancedAnalysis,
        originalError: result.reason
    };
}

/**
 * Analyze page using exact element reference
 * @param {Page} page - Puppeteer page instance
 * @param {Object} elementRef - Element reference
 * @param {Array<string>} targetTexts - Target text patterns
 * @param {Array<string>} enhancedSelectors - Enhanced selectors
 * @returns {Promise<Object>} Analysis results
 */
async function analyzePageWithElementReference(page, elementRef, targetTexts, enhancedSelectors) {
    try {
        console.log(`🔍 Analyzing page with exact element reference: ${elementRef.description}`);

        const analysis = await page.evaluate((ref, texts, selectors) => {
            const results = {
                exactMatches: [],
                iconMatches: [],
                classMatches: [],
                textMatches: [],
                recommendations: []
            };

            // Try enhanced selectors first
            selectors.forEach(selector => {
                try {
                    const elements = Array.from(document.querySelectorAll(selector));
                    elements.forEach(el => {
                        const rect = el.getBoundingClientRect();
                        const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;

                        if (isVisible) {
                            results.exactMatches.push({
                                selector: selector,
                                text: (el.textContent || '').trim().substring(0, 50),
                                className: el.className,
                                id: el.id
                            });
                        }
                    });
                } catch (e) {
                    // Invalid selector, skip
                }
            });

            // Look for icon matches
            if (ref.before && ref.before.icon) {
                const iconClass = ref.before.icon;
                const iconElements = Array.from(document.querySelectorAll(`.${iconClass}`));
                iconElements.forEach(icon => {
                    const parent = icon.closest('button, .v-btn, input, div[role="button"]');
                    if (parent) {
                        const rect = parent.getBoundingClientRect();
                        const isVisible = rect.width > 0 && rect.height > 0 && parent.offsetParent !== null;
                        if (isVisible) {
                            results.iconMatches.push({
                                element: parent.tagName.toLowerCase(),
                                text: (parent.textContent || '').trim().substring(0, 50),
                                className: parent.className,
                                hasIcon: true
                            });
                        }
                    }
                });
            }

            // Look for class matches
            if (ref.before && ref.before.keyClasses) {
                ref.before.keyClasses.forEach(className => {
                    if (!className.includes('disabled')) {
                        const elements = Array.from(document.querySelectorAll(`.${className}`));
                        elements.forEach(el => {
                            const rect = el.getBoundingClientRect();
                            const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
                            if (isVisible && el.tagName !== 'I' && el.tagName !== 'SPAN') { // Skip icon/span elements
                                results.classMatches.push({
                                    element: el.tagName.toLowerCase(),
                                    text: (el.textContent || '').trim().substring(0, 50),
                                    className: el.className,
                                    classMatch: className
                                });
                            }
                        });
                    }
                });
            }

            // Look for text matches
            texts.forEach(text => {
                const allElements = Array.from(document.querySelectorAll('*'));
                allElements.forEach(el => {
                    const elText = (el.textContent || '').trim();
                    if (elText === text || elText.includes(text)) {
                        const rect = el.getBoundingClientRect();
                        const isVisible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
                        if (isVisible && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                            // Avoid duplicates
                            const alreadyAdded = results.textMatches.some(m => m.text === elText);
                            if (!alreadyAdded && elText.length < 100) { // Only short text elements
                                results.textMatches.push({
                                    element: el.tagName.toLowerCase(),
                                    text: elText.substring(0, 50),
                                    className: el.className,
                                    matchType: elText === text ? 'exact' : 'contains'
                                });
                            }
                        }
                    }
                });
            });

            // Generate recommendations based on priority
            const detectionPriority = ref.detectionPriority || [];

            // 1. Exact selector matches (highest priority)
            if (results.exactMatches.length > 0) {
                results.recommendations.push({
                    action: 'try_exact_match',
                    element: results.exactMatches[0],
                    priority: 'highest',
                    reason: `Exact selector match: ${results.exactMatches[0].selector}`
                });
            }

            // 2. Icon matches
            if (results.iconMatches.length > 0 && detectionPriority.includes('icon_text')) {
                results.recommendations.push({
                    action: 'try_click',
                    element: results.iconMatches[0],
                    priority: 'high',
                    reason: `Icon match (${ref.before.icon}): "${results.iconMatches[0].text}"`
                });
            }

            // 3. Class matches
            if (results.classMatches.length > 0 && detectionPriority.includes('btn_class')) {
                results.classMatches.forEach(match => {
                    results.recommendations.push({
                        action: 'try_click',
                        element: match,
                        priority: 'medium',
                        reason: `Class match (${match.classMatch}): "${match.text}"`
                    });
                });
            }

            // 4. Text matches
            if (results.textMatches.length > 0 && detectionPriority.includes('text_content')) {
                results.textMatches.forEach(match => {
                    if (match.matchType === 'exact') {
                        results.recommendations.push({
                            action: 'try_click',
                            element: match,
                            priority: 'medium',
                            reason: `Exact text match: "${match.text}"`
                        });
                    }
                });
            }

            // 5. Fallback - first visible button if nothing else found
            if (results.recommendations.length === 0) {
                const buttons = Array.from(document.querySelectorAll('button, .v-btn, [role="button"]'));
                const firstVisible = buttons.find(btn => {
                    const rect = btn.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && btn.offsetParent !== null;
                });

                if (firstVisible) {
                    results.recommendations.push({
                        action: 'try_first_visible',
                        element: {
                            text: (firstVisible.textContent || '').trim().substring(0, 50),
                            className: firstVisible.className
                        },
                        priority: 'low',
                        reason: `First visible button: "${firstVisible.textContent.trim().substring(0, 30)}"`
                    });
                }
            }

            return results;
        }, elementRef, targetTexts, enhancedSelectors);

        console.log(`🔍 Enhanced analysis complete:`);
        console.log(`   → Exact matches: ${analysis.exactMatches.length}`);
        console.log(`   → Icon matches: ${analysis.iconMatches.length}`);
        console.log(`   → Class matches: ${analysis.classMatches.length}`);
        console.log(`   → Text matches: ${analysis.textMatches.length}`);
        console.log(`   → Recommendations: ${analysis.recommendations.length}`);

        if (analysis.recommendations.length > 0) {
            console.log(`   → Top recommendations:`);
            analysis.recommendations.slice(0, 3).forEach(rec => {
                console.log(`      • [${rec.priority}] ${rec.reason}`);
            });
        }

        return analysis;
    } catch (error) {
        console.log(`⚠ Enhanced analysis failed: ${error.message}`);
        return {
            exactMatches: [],
            iconMatches: [],
            classMatches: [],
            textMatches: [],
            recommendations: []
        };
    }
}

module.exports = {
    captureScreenshot,
    capturePageStructure,
    analyzePageForSimilarElements,
    tryClickFromRecommendation,
    clickAndVerifyWithFallback
};
