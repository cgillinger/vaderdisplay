/**
 * UI Degradation Module - FAS 3 Graceful UI Degradation System
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/ui-degradation.js
 */

import { isNetatmoAvailable, getDataSource } from './netatmo-intelligence.js';
import { dashboardState } from './state-manager.js';

// === MAIN UI DEGRADATION FUNCTION ===

/**
 * Hantera visning/döljning av UI-element baserat på Netatmo-tillgänglighet
 */
export function applyUIAdaptations() {
    const netatmoAvailable = isNetatmoAvailable();
    
    console.log(`🎨 FAS 3: Tillämpar UI-anpassningar (Netatmo: ${netatmoAvailable ? 'TILLGÄNGLIG' : 'DOLD'})`);
    
    // Hantera FAKTISK temperatur-sektion
    adaptTemperatureSection(netatmoAvailable);
    
    // Hantera CO2/luftkvalitet
    adaptAirQualitySection(netatmoAvailable);
    
    // HUMIDITY FIX: Hantera luftfuktighet-visning
    adaptHumiditySection(netatmoAvailable);
    
    // Hantera labels/etiketter
    adaptLabels(netatmoAvailable);
    
    // Applicera CSS-klasser för layout-anpassningar
    applyCSSAdaptations(netatmoAvailable);
    
    console.log(`✅ FAS 3: UI-anpassningar tillämpade`);
}

// === SECTION ADAPTATION FUNCTIONS ===

/**
 * HUMIDITY FIX: Anpassa luftfuktighet-sektionen beroende på data-tillgänglighet
 * @param {boolean} netatmoAvailable - Om Netatmo är tillgängligt
 */
export function adaptHumiditySection(netatmoAvailable) {
    const humidityElement = document.getElementById('smhi-humidity');
    
    // Kontrollera om vi har luftfuktighetsdata från någon källa
    const hasHumidityData = (netatmoAvailable && dashboardState.dataAvailability.netatmoHumidity) || 
                           dashboardState.dataAvailability.smhiHumidity;
    
    if (!hasHumidityData) {
        // HUMIDITY FIX: Dölj luftfuktighet helt när ingen data finns
        if (humidityElement) {
            humidityElement.classList.add('netatmo-hidden');
            console.log('🙈 HUMIDITY FIX: Luftfuktighet-element dolt - ingen data tillgänglig');
        }
    } else {
        // Visa luftfuktighet när data finns
        if (humidityElement) {
            humidityElement.classList.remove('netatmo-hidden');
            console.log('👁️ HUMIDITY FIX: Luftfuktighet-element visat - data tillgänglig');
        }
    }
}

/**
 * Anpassa temperatur-sektionen beroende på Netatmo-tillgänglighet
 * @param {boolean} netatmoAvailable - Om Netatmo är tillgängligt
 */
export function adaptTemperatureSection(netatmoAvailable) {
    const netatmoTempSection = document.querySelector('.netatmo-temperature-section');
    const temperatureContainer = document.querySelector('.temperature-container');
    const mainTempSection = document.querySelector('.main-temp-section');
    
    if (!netatmoAvailable) {
        // FAS 3: Dölj FAKTISK temperatur-sektion
        if (netatmoTempSection) {
            netatmoTempSection.classList.add('netatmo-hidden');
            console.log('🙈 FAS 3: FAKTISK temperatur-sektion dold');
        }
        
        // Justera container för centrerad layout
        if (temperatureContainer) {
            temperatureContainer.classList.add('single-temperature-mode');
        }
        
        if (mainTempSection) {
            mainTempSection.classList.add('single-temperature-mode');
        }
    } else {
        // FAS 3: Visa FAKTISK temperatur-sektion
        if (netatmoTempSection) {
            netatmoTempSection.classList.remove('netatmo-hidden');
        }
        
        if (temperatureContainer) {
            temperatureContainer.classList.remove('single-temperature-mode');
        }
        
        if (mainTempSection) {
            mainTempSection.classList.remove('single-temperature-mode');
        }
    }
}

/**
 * Anpassa luftkvalitet-sektionen
 * @param {boolean} netatmoAvailable - Om Netatmo är tillgängligt
 */
export function adaptAirQualitySection(netatmoAvailable) {
    const airQualityContainer = document.querySelector('.air-quality-container');
    
    if (!netatmoAvailable) {
        // FAS 3: Dölj CO2/luftkvalitet
        if (airQualityContainer) {
            airQualityContainer.classList.add('netatmo-hidden');
            console.log('🙈 FAS 3: Luftkvalitet-sektion dold');
        }
    } else {
        // FAS 3: Visa CO2/luftkvalitet
        if (airQualityContainer) {
            airQualityContainer.classList.remove('netatmo-hidden');
        }
    }
}

/**
 * Anpassa etiketter beroende på datakällor
 * @param {boolean} netatmoAvailable - Om Netatmo är tillgängligt
 */
export function adaptLabels(netatmoAvailable) {
    const smhiLabel = document.querySelector('.smhi-label');
    
    if (!netatmoAvailable) {
        // FAS 3: Ändra "PROGNOS" till "TEMPERATUR" när bara SMHI används
        if (smhiLabel) {
            smhiLabel.textContent = 'TEMPERATUR';
            console.log('🏷️ FAS 3: Etikett ändrad till "TEMPERATUR"');
        }
    } else {
        // FAS 3: Återställ till "PROGNOS" när båda källor finns
        if (smhiLabel) {
            smhiLabel.textContent = 'PROGNOS';
        }
    }
}

/**
 * Applicera CSS-klasser för layout-anpassningar
 * @param {boolean} netatmoAvailable - Om Netatmo är tillgängligt
 */
export function applyCSSAdaptations(netatmoAvailable) {
    const weatherDetailsGrid = document.querySelector('.weather-details-grid');
    const smhiMainCard = document.querySelector('.smhi-main-card');
    
    if (!netatmoAvailable) {
        // FAS 3: Lägg till SMHI-only klasser
        if (weatherDetailsGrid) {
            weatherDetailsGrid.classList.add('smhi-only-mode');
        }
        
        if (smhiMainCard) {
            smhiMainCard.classList.add('smhi-only-mode');
        }
        
        console.log('🎨 FAS 3: SMHI-only CSS-klasser tillämpade');
    } else {
        // FAS 3: Ta bort SMHI-only klasser
        if (weatherDetailsGrid) {
            weatherDetailsGrid.classList.remove('smhi-only-mode');
        }
        
        if (smhiMainCard) {
            smhiMainCard.classList.remove('smhi-only-mode');
        }
    }
}

// === DYNAMIC ELEMENT VISIBILITY ===

/**
 * Dynamiskt dölja/visa element baserat på data-tillgänglighet
 */
export function adaptElementVisibility() {
    // HUMIDITY FIX: Kontrollera luftfuktighet separat
    adaptHumiditySection(isNetatmoAvailable());
    
    // Dölj andra element som inte har data
    const elementsToCheck = [
        { 
            selector: '.air-quality-container', 
            dataCheck: () => getDataSource('co2').available 
        },
        {
            selector: '.noise-container',
            dataCheck: () => getDataSource('noise').available
        },
        {
            selector: '.pressure-trend-container',
            dataCheck: () => getDataSource('pressure_trend').available
        }
    ];
    
    elementsToCheck.forEach(({ selector, dataCheck }) => {
        const element = document.querySelector(selector);
        if (element) {
            if (dataCheck()) {
                element.classList.remove('data-unavailable');
                element.classList.remove('netatmo-hidden');
            } else {
                element.classList.add('data-unavailable');
            }
        }
    });
}

// === RESPONSIVE ADAPTATIONS ===

/**
 * Anpassa UI för olika skärmstorlekar med hänsyn till data-tillgänglighet
 * @param {string} screenSize - Skärmstorlek ('small', 'medium', 'large')
 */
export function adaptForScreenSize(screenSize = 'medium') {
    const netatmoAvailable = isNetatmoAvailable();
    
    console.log(`📱 Anpassar UI för skärmstorlek: ${screenSize} (Netatmo: ${netatmoAvailable})`);
    
    switch (screenSize) {
        case 'small':
            adaptForSmallScreen(netatmoAvailable);
            break;
        case 'medium':
            adaptForMediumScreen(netatmoAvailable);
            break;
        case 'large':
            adaptForLargeScreen(netatmoAvailable);
            break;
    }
}

/**
 * Anpassningar för liten skärm
 * @param {boolean} netatmoAvailable - Om Netatmo är tillgängligt
 */
function adaptForSmallScreen(netatmoAvailable) {
    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.classList.add('small-screen-mode');
        
        // På små skärmar, dölj mindre viktiga element om Netatmo saknas
        if (!netatmoAvailable) {
            const optionalElements = document.querySelectorAll('.optional-small-screen');
            optionalElements.forEach(el => el.classList.add('hidden-small'));
        }
    }
}

/**
 * Anpassningar för medium skärm (LP156WH4)
 * @param {boolean} netatmoAvailable - Om Netatmo är tillgängligt
 */
function adaptForMediumScreen(netatmoAvailable) {
    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.classList.add('medium-screen-mode');
        container.classList.remove('small-screen-mode', 'large-screen-mode');
        
        // Optimera för LP156WH4 1366x768 upplösning
        if (!netatmoAvailable) {
            // Använd extra utrymme för SMHI-data
            const smhiSection = document.querySelector('.smhi-main-card');
            if (smhiSection) {
                smhiSection.classList.add('expanded-medium');
            }
        }
    }
}

/**
 * Anpassningar för stor skärm
 * @param {boolean} netatmoAvailable - Om Netatmo är tillgängligt
 */
function adaptForLargeScreen(netatmoAvailable) {
    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.classList.add('large-screen-mode');
        container.classList.remove('small-screen-mode', 'medium-screen-mode');
        
        // På stora skärmar kan vi visa mer information
        const detailedElements = document.querySelectorAll('.detailed-large-screen');
        detailedElements.forEach(el => el.classList.remove('hidden-large'));
    }
}

// === ANIMATION HANDLING ===

/**
 * Hantera animationer vid UI-förändringar
 * @param {string} changeType - Typ av förändring ('show', 'hide', 'adapt')
 * @param {HTMLElement} element - Element att animera
 */
export function animateUIChange(changeType, element) {
    if (!element) return;
    
    switch (changeType) {
        case 'show':
            element.classList.add('fade-in');
            setTimeout(() => element.classList.remove('fade-in'), 300);
            break;
        case 'hide':
            element.classList.add('fade-out');
            setTimeout(() => {
                element.classList.remove('fade-out');
                element.classList.add('netatmo-hidden');
            }, 300);
            break;
        case 'adapt':
            element.classList.add('scale-transition');
            setTimeout(() => element.classList.remove('scale-transition'), 200);
            break;
    }
}

// === ERROR HANDLING FOR UI DEGRADATION ===

/**
 * Hantera fel vid UI-anpassningar säkert
 * @param {Function} adaptationFunction - Anpassningsfunktion att köra
 * @param {string} context - Kontext för fel-hantering
 */
export function safeUIAdaptation(adaptationFunction, context = 'UI Adaptation') {
    try {
        adaptationFunction();
    } catch (error) {
        console.error(`❌ Fel i ${context}:`, error);
        
        // Fallback: Visa alla element om anpassning misslyckas
        const hiddenElements = document.querySelectorAll('.netatmo-hidden');
        hiddenElements.forEach(el => {
            el.classList.remove('netatmo-hidden');
            el.classList.add('degradation-fallback');
        });
        
        console.log('🔄 Fallback: Alla element visas på grund av fel i UI-anpassning');
    }
}

// === ACCESSIBILITY ENHANCEMENTS ===

/**
 * Förbättra tillgänglighet vid UI-degradering
 */
export function enhanceAccessibilityForDegradation() {
    const netatmoAvailable = isNetatmoAvailable();
    
    // Uppdatera ARIA-labels baserat på tillgänglig data
    const elements = [
        {
            selector: '.temperature-container',
            label: netatmoAvailable ? 'Temperatur: Faktisk och prognos' : 'Temperatur: Prognos'
        },
        {
            selector: '.weather-details-grid',
            label: netatmoAvailable ? 'Väderdetaljer: Komplett data' : 'Väderdetaljer: Grundläggande data'
        }
    ];
    
    elements.forEach(({ selector, label }) => {
        const element = document.querySelector(selector);
        if (element) {
            element.setAttribute('aria-label', label);
        }
    });
    
    // Lägg till meddelande för skärmläsare om data saknas
    if (!netatmoAvailable) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = 'Visar förenklad väder-vy med grundläggande data';
        document.body.appendChild(announcement);
        
        // Ta bort meddelandet efter 3 sekunder
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 3000);
    }
}

// === DEGRADATION TESTING ===

/**
 * Testa UI-degradering genom att simulera olika scenarier
 * @param {string} scenario - Test-scenario ('no-netatmo', 'no-humidity', 'minimal-data')
 */
export function testUIDegradation(scenario) {
    console.log(`🧪 Testar UI-degradering: ${scenario}`);
    
    const originalState = { ...dashboardState };
    
    switch (scenario) {
        case 'no-netatmo':
            dashboardState.useNetatmo = false;
            dashboardState.config = { use_netatmo: false };
            break;
        case 'no-humidity':
            dashboardState.dataAvailability.netatmoHumidity = false;
            dashboardState.dataAvailability.smhiHumidity = false;
            break;
        case 'minimal-data':
            Object.keys(dashboardState.dataAvailability).forEach(key => {
                if (key.startsWith('netatmo')) {
                    dashboardState.dataAvailability[key] = false;
                }
            });
            break;
    }
    
    // Applicera test-anpassningar
    applyUIAdaptations();
    adaptElementVisibility();
    
    // Återställ efter 5 sekunder
    setTimeout(() => {
        Object.assign(dashboardState, originalState);
        applyUIAdaptations();
        adaptElementVisibility();
        console.log('🔄 UI-degradering test återställt');
    }, 5000);
}

// === PERFORMANCE MONITORING ===

/**
 * Övervaka prestanda för UI-anpassningar
 */
export function monitorUIPerformance() {
    const startTime = performance.now();
    
    applyUIAdaptations();
    adaptElementVisibility();
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    if (executionTime > 16) { // 16ms = 60fps threshold
        console.warn(`⚠️ UI-anpassningar tog ${executionTime.toFixed(2)}ms (över 16ms threshold)`);
    } else {
        console.log(`✅ UI-anpassningar slutförda på ${executionTime.toFixed(2)}ms`);
    }
    
    return executionTime;
}

// === INITIALIZATION ===

/**
 * Initialisera UI-degradering systemet
 */
export function initializeUIDegradation() {
    console.log('🎨 Initialiserar UI-degradering system...');
    
    // Sätt upp CSS-klasser för degradering
    if (!document.querySelector('#ui-degradation-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-degradation-styles';
        style.textContent = `
            .netatmo-hidden { display: none !important; }
            .data-unavailable { opacity: 0.5; }
            .degradation-fallback { border: 1px dashed orange; }
            .fade-in { animation: fadeIn 0.3s ease-in; }
            .fade-out { animation: fadeOut 0.3s ease-out; }
            .scale-transition { transition: transform 0.2s ease; }
            .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Förbättra tillgänglighet
    enhanceAccessibilityForDegradation();
    
    console.log('✅ UI-degradering system initialiserat');
}

console.log('📦 UI Degradation Module laddat');