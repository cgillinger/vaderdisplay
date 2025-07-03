/**
 * State Manager Module - Global State & Configuration
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/state-manager.js
 */

// === GLOBAL STATE ===
export let dashboardState = {
    lastUpdate: null,
    currentTheme: 'light',
    updateInterval: null,
    clockInterval: null,
    isLoading: true,
    windUnit: 'land',
    config: null,
    
    // NYT FAS 2: Netatmo-intelligens state
    useNetatmo: true,           // Detekteras från API
    dataAvailability: {         // Spårar tillgänglig data
        netatmoTemperature: false,
        netatmoHumidity: false,
        netatmoPressure: false,
        netatmoCO2: false,
        netatmoNoise: false,
        netatmoPressureTrend: false,
        smhiHumidity: false,
        smhiPressure: false
    }
};

// === CONSTANTS ===
export const UPDATE_INTERVAL = 30000; // 30 sekunder
export const THEME_CHECK_INTERVAL = 60000; // 1 minut
export const CLOCK_UPDATE_INTERVAL = 1000; // 1 sekund för klocka

// === STATE MANAGEMENT FUNCTIONS ===

/**
 * Uppdatera dashboard state
 * @param {object} newState - Partiell state att uppdatera
 */
export function updateDashboardState(newState) {
    dashboardState = { ...dashboardState, ...newState };
    console.log('🔄 Dashboard state uppdaterat:', Object.keys(newState));
}

/**
 * Reset dashboard state till default
 */
export function resetDashboardState() {
    dashboardState = {
        lastUpdate: null,
        currentTheme: 'light',
        updateInterval: null,
        clockInterval: null,
        isLoading: true,
        windUnit: 'land',
        config: null,
        useNetatmo: true,
        dataAvailability: {
            netatmoTemperature: false,
            netatmoHumidity: false,
            netatmoPressure: false,
            netatmoCO2: false,
            netatmoNoise: false,
            netatmoPressureTrend: false,
            smhiHumidity: false,
            smhiPressure: false
        }
    };
    console.log('🔄 Dashboard state återställt till default');
}

/**
 * Hämta aktuell state
 * @returns {object} Current dashboard state
 */
export function getDashboardState() {
    return { ...dashboardState };
}

/**
 * Kontrollera om dashboard laddar
 * @returns {boolean} True om dashboard laddar
 */
export function isDashboardLoading() {
    return dashboardState.isLoading;
}

/**
 * Sätt loading state
 * @param {boolean} loading - Loading state
 */
export function setLoadingState(loading) {
    dashboardState.isLoading = loading;
    console.log(`🔄 Loading state: ${loading ? 'LADDAR' : 'KLAR'}`);
}

// === THEME MANAGEMENT ===

/**
 * Uppdatera tema
 * @param {string} newTheme - Nytt tema
 */
export function updateTheme(newTheme) {
    const body = document.body;
    body.className = body.className.replace(/theme-\w+/, `theme-${newTheme}`);
    dashboardState.currentTheme = newTheme;
    console.log(`🎨 Tema uppdaterat till: ${newTheme}`);
}

/**
 * Hämta aktuellt tema
 * @returns {string} Aktuellt tema
 */
export function getCurrentTheme() {
    return dashboardState.currentTheme;
}

// === INTERVAL MANAGEMENT ===

/**
 * Sätt data-uppdateringsintervall
 * @param {number} intervalId - Interval ID
 */
export function setUpdateInterval(intervalId) {
    if (dashboardState.updateInterval) {
        clearInterval(dashboardState.updateInterval);
    }
    dashboardState.updateInterval = intervalId;
    console.log(`🔄 Data-uppdateringsintervall satt: ${UPDATE_INTERVAL/1000}s`);
}

/**
 * Sätt klock-uppdateringsintervall
 * @param {number} intervalId - Interval ID
 */
export function setClockInterval(intervalId) {
    if (dashboardState.clockInterval) {
        clearInterval(dashboardState.clockInterval);
    }
    dashboardState.clockInterval = intervalId;
    console.log(`🕐 Klock-uppdateringsintervall satt: ${CLOCK_UPDATE_INTERVAL/1000}s`);
}

/**
 * Rensa alla intervall
 */
export function clearAllIntervals() {
    if (dashboardState.updateInterval) {
        clearInterval(dashboardState.updateInterval);
        dashboardState.updateInterval = null;
    }
    if (dashboardState.clockInterval) {
        clearInterval(dashboardState.clockInterval);
        dashboardState.clockInterval = null;
    }
    console.log('🧹 Alla intervall rensade');
}

// === ERROR HANDLING ===

/**
 * Hantera JavaScript-fel
 * @param {Error} error - Fel-objekt
 * @param {string} context - Kontext där felet uppstod
 */
export function handleError(error, context = 'Unknown') {
    console.error(`🔴 ${context} error:`, error);
    
    // Uppdatera status i UI om möjligt
    const statusElement = document.getElementById('status-text');
    if (statusElement) {
        statusElement.textContent = `⚠️ Fel: ${error.message || 'Ett oväntat fel inträffade'}`;
    }
}

/**
 * Hantera Promise-rejection
 * @param {any} reason - Rejection reason
 */
export function handlePromiseRejection(reason) {
    console.error('🔴 Unhandled promise rejection:', reason);
    
    const statusElement = document.getElementById('status-text');
    if (statusElement) {
        statusElement.textContent = '⚠️ Fel vid data-hämtning';
    }
}

// === LIFECYCLE MANAGEMENT ===

/**
 * Initiera error handlers
 */
export function initializeErrorHandlers() {
    window.addEventListener('error', function(event) {
        handleError(event.error, 'JavaScript');
    });

    window.addEventListener('unhandledrejection', function(event) {
        handlePromiseRejection(event.reason);
    });
    
    console.log('🛡️ Error handlers initialiserade');
}

/**
 * Initiera cleanup vid page unload
 */
export function initializeCleanup() {
    window.addEventListener('beforeunload', function() {
        clearAllIntervals();
        console.log('🧹 Dashboard cleanup genomfört');
    });
    
    console.log('🧹 Cleanup handlers initialiserade');
}

/**
 * Fullständig initialisering av state manager
 */
export function initializeStateManager() {
    console.log('🚀 Initialiserar State Manager...');
    
    initializeErrorHandlers();
    initializeCleanup();
    
    console.log('✅ State Manager initialiserat');
}

// === UTILITY FUNCTIONS ===

/**
 * Dölj loading overlay
 */
export function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
    dashboardState.isLoading = false;
    console.log('🙈 Loading overlay dolt');
}

/**
 * Visa loading overlay
 */
export function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');
    }
    dashboardState.isLoading = true;
    console.log('👁️ Loading overlay visat');
}

/**
 * Uppdatera status text
 * @param {string} statusText - Status text att visa
 */
export function updateStatus(statusText) {
    const statusElement = document.getElementById('status-text');
    if (statusElement) {
        statusElement.textContent = statusText || 'Väderdata uppdaterad';
    }
}

/**
 * Visa fel-meddelande
 * @param {string} message - Fel-meddelande
 */
export function showError(message) {
    updateStatus(`⚠️ ${message}`);
    console.error('🔴 Frontend error:', message);
}

console.log('📦 State Manager Module laddat');