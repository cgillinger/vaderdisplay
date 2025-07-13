/**
 * DOM Helpers - STEG 3 REFAKTORERING
 * DOM-manipulation och hjälpfunktioner
 * Extraherat från dashboard.js för modulär struktur
 */

// === GRUNDLÄGGANDE DOM-UPPDATERING ===

/**
 * Uppdatera textinnehåll för element med ID
 * @param {string} id - Element ID
 * @param {string} content - Textinnehåll att sätta
 */
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

/**
 * Uppdatera HTML-innehåll för element med ID
 * @param {string} id - Element ID
 * @param {string} htmlContent - HTML-innehåll att sätta
 */
function updateElementHTML(id, htmlContent) {
    const element = document.getElementById(id);
    if (element) {
        element.innerHTML = htmlContent;
    }
}

// === OPTIMERAD SOL-TIDSUPPDATERING ===

/**
 * Optimerad uppdatering av sol-tider med smart span-hantering
 * @param {string} elementId - Element ID för sol-tid
 * @param {string} timeOnly - Tid att visa (t.ex. "06:30")
 */
function updateSunTimeOptimized(elementId, timeOnly) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let textSpan = element.querySelector('span');
    
    if (textSpan) {
        textSpan.textContent = timeOnly;
    } else {
        const icon = element.querySelector('i');
        if (icon) {
            const children = Array.from(element.childNodes);
            children.forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    child.remove();
                }
            });
            
            textSpan = document.createElement('span');
            textSpan.textContent = timeOnly;
            element.appendChild(textSpan);
        }
    }
}

// === TID/DAG-LOGIK ===

/**
 * Kontrollera om det är dagtid (06:00 - 20:00)
 * @returns {boolean} True om det är dagtid
 */
function isDaytime() {
    const hour = new Date().getHours();
    return hour >= 6 && hour <= 20;
}

console.log('✅ STEG 3: DOM Helpers laddat - 4 funktioner extraherade!');