/**
 * Modern Weather Dashboard - REFACTORED Main File
 * FAS 3: MODULÄR ARKITEKTUR med ES6 Modules
 * FONT AWESOME OPTIMERAD + CIRKULÄR KLOCKA + BAROMETER + LP156WH4 FÖRSTÄRKNING
 * + NETATMO INTELLIGENCE: Automatisk datasubstitution och källhantering
 * + UI DEGRADERING: Dolda element och layout-anpassningar
 * + HUMIDITY FIX: Dölj luftfuktighet helt när data saknas
 * 
 * Filsökväg: static/js/dashboard.js
 */

// === ES6 MODULE IMPORTS ===

// State Management
import { 
    initializeStateManager, 
    setUpdateInterval, 
    setClockInterval,
    hideLoadingOverlay,
    UPDATE_INTERVAL,
    THEME_CHECK_INTERVAL
} from './modules/state-manager.js';

// Icon Management
import { initializeIconSystems } from './modules/icon-manager.js';

// Clock System
import { initializeCircularClock } from './modules/clock-manager.js';

// API Management
import { 
    updateAllData, 
    checkThemeUpdate, 
    startDataUpdates, 
    startThemeUpdates 
} from './modules/api-manager.js';

// Wind Management
import { removeWindDetailItems } from './modules/wind-manager.js';

// UI Systems
import { 
    initializeUIDegradation, 
    applyUIAdaptations 
} from './modules/ui-degradation.js';

import { initializeRobustIcons } from './modules/ui-updaters.js';

// === MAIN INITIALIZATION FUNCTION ===

/**
 * Initialisera komplett dashboard med modulär arkitektur
 */
async function initializeDashboard() {
    try {
        console.log('🚀 Weather Dashboard FAS 3: Modulär refaktorering aktiverad med HUMIDITY FIX');
        console.log('📦 Initialiserar modulärt dashboard...');
        
        // FAS 1: Initiera grundläggande system
        initializeStateManager();
        initializeIconSystems();
        initializeUIDegradation();
        
        // FAS 2: Initiera visuella komponenter
        initializeRobustIcons();
        initializeCircularClock();
        removeWindDetailItems();
        
        // FAS 3: Hämta initial data och applicera UI-anpassningar
        await updateAllData();
        
        // FAS 4: Starta bakgrundsprocesser
        const dataIntervalId = startDataUpdates(UPDATE_INTERVAL);
        setUpdateInterval(dataIntervalId);
        
        const themeIntervalId = startThemeUpdates(THEME_CHECK_INTERVAL);
        // Theme interval hanteras av api-manager, inte state-manager
        
        // FAS 5: Initiera WeatherEffects om tillgängligt
        await initializeWeatherEffectsIfAvailable();
        
        // FAS 6: Slutför initialisering
        hideLoadingOverlay();
        
        console.log('✅ FAS 3: Modulärt Dashboard med Graciös UI-degradering + HUMIDITY FIX initialiserat! 💧🎨🚀');
        
    } catch (error) {
        console.error('❌ Fel vid initialisering av modulärt dashboard:', error);
        
        // Fallback: Visa fel-meddelande
        const statusElement = document.getElementById('status-text');
        if (statusElement) {
            statusElement.textContent = '⚠️ Kunde inte ladda väderdata - försöker igen...';
        }
        
        // Försök igen efter 5 sekunder
        setTimeout(() => {
            console.log('🔄 Försöker initiera dashboard igen...');
            initializeDashboard();
        }, 5000);
    }
}

/**
 * Initiera WeatherEffects om det finns tillgängligt
 */
async function initializeWeatherEffectsIfAvailable() {
    try {
        if (window.weatherEffectsManager && dashboardState?.config?.weather_effects_enabled) {
            await window.weatherEffectsManager.initialize();
            console.log('✅ WeatherEffects initialiserat');
        }
    } catch (error) {
        console.warn("⚠️ WeatherEffects initialization failed:", error);
    }
}

// === LEGACY SUPPORT FUNCTIONS ===

/**
 * Legacy support för externa anrop
 * Dessa funktioner finns kvar för kompatibilitet
 */

// Exponera viktiga funktioner globalt för backward compatibility
window.dashboard = {
    initialize: initializeDashboard,
    updateAllData: updateAllData,
    applyUIAdaptations: applyUIAdaptations
};

// === ERROR RECOVERY ===

/**
 * Återhämtning vid kritiska fel
 */
function initializeErrorRecovery() {
    let errorCount = 0;
    const maxErrors = 3;
    
    window.addEventListener('error', function(event) {
        errorCount++;
        console.error(`🔴 Kritiskt fel #${errorCount}:`, event.error);
        
        if (errorCount >= maxErrors) {
            console.error('🚨 För många fel - aktiverar nödläge');
            
            // Nödläge: Visa grundläggande information
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                    <h1>🌤️ Väder Dashboard</h1>
                    <p>Ett tekniskt fel har inträffat. Sidan laddas om automatiskt...</p>
                    <p><em>Error recovery mode active</em></p>
                </div>
            `;
            
            // Ladda om sidan efter 5 sekunder
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }
    });
}

// === MODULE HEALTH CHECK ===

/**
 * Kontrollera att alla moduler är laddade korrekt
 * @returns {boolean} True om alla moduler är tillgängliga
 */
function checkModuleHealth() {
    const requiredModules = [
        'initializeStateManager',
        'initializeIconSystems', 
        'initializeCircularClock',
        'updateAllData',
        'applyUIAdaptations'
    ];
    
    const missingModules = [];
    
    // Kontrollera att alla importerade funktioner finns
    try {
        if (typeof initializeStateManager !== 'function') missingModules.push('state-manager');
        if (typeof initializeIconSystems !== 'function') missingModules.push('icon-manager');
        if (typeof initializeCircularClock !== 'function') missingModules.push('clock-manager');
        if (typeof updateAllData !== 'function') missingModules.push('api-manager');
        if (typeof applyUIAdaptations !== 'function') missingModules.push('ui-degradation');
    } catch (error) {
        console.error('❌ Fel vid modulkontroll:', error);
        return false;
    }
    
    if (missingModules.length > 0) {
        console.error('❌ Saknade moduler:', missingModules);
        return false;
    }
    
    console.log('✅ Alla moduler laddade korrekt');
    return true;
}

// === PERFORMANCE MONITORING ===

/**
 * Övervaka prestanda för dashboard-initialisering
 */
function monitorInitializationPerformance() {
    const startTime = performance.now();
    
    return {
        finish: () => {
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            console.log(`📊 Dashboard-initialisering slutförd på ${totalTime.toFixed(2)}ms`);
            
            if (totalTime > 2000) {
                console.warn('⚠️ Långsam initialisering - överväg optimering');
            }
            
            return totalTime;
        }
    };
}

// === STARTUP SEQUENCE ===

/**
 * Huvudstartsekvens för dashboard
 */
async function startDashboard() {
    const performanceMonitor = monitorInitializationPerformance();
    
    try {
        console.log('🏁 Startar modulärt weather dashboard...');
        
        // Kontrollera modulhälsa först
        if (!checkModuleHealth()) {
            throw new Error('Kritiska moduler saknas');
        }
        
        // Initiera felåterhämtning
        initializeErrorRecovery();
        
        // Starta huvudinitialisering
        await initializeDashboard();
        
        performanceMonitor.finish();
        
    } catch (error) {
        console.error('❌ Kritiskt fel vid dashboard-start:', error);
        
        // Fallback-initialisering
        document.body.innerHTML = `
            <div style="padding: 20px; background: #f44336; color: white; text-align: center;">
                <h2>⚠️ Dashboard Initialization Failed</h2>
                <p>Ett kritiskt fel inträffade vid laddning av väder-dashboard.</p>
                <p>Kontrollera att alla moduler är tillgängliga och försök igen.</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; font-size: 16px;">
                    🔄 Ladda om sidan
                </button>
            </div>
        `;
    }
}

// === DOM READY EVENT ===

/**
 * Vänta på DOM och starta dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM laddat - startar modulärt dashboard');
    startDashboard();
});

// === MODULE EXPORT (för testning) ===

// Exportera för testning och development
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeDashboard,
        checkModuleHealth,
        startDashboard
    };
}

// === DEVELOPMENT HELPERS ===

/**
 * Development-hjälpfunktioner (endast i development)
 */
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.dev = {
        reinitialize: initializeDashboard,
        checkModules: checkModuleHealth,
        testUIAdaptations: applyUIAdaptations,
        modules: {
            stateManager: 'state-manager.js',
            iconManager: 'icon-manager.js', 
            clockManager: 'clock-manager.js',
            apiManager: 'api-manager.js',
            windManager: 'wind-manager.js',
            barometerManager: 'barometer-manager.js',
            netatmoIntelligence: 'netatmo-intelligence.js',
            formatters: 'formatters.js',
            uiDegradation: 'ui-degradation.js',
            uiUpdaters: 'ui-updaters.js'
        }
    };
    
    console.log('🛠️ Development helpers loaded - använd window.dev för debugging');
}

console.log('📦 MODULÄRT Weather Dashboard Main File laddat! 🎯');

// === FINAL SYSTEM CHECK ===
console.log('🎯 FAS 3: Modulär Weather Dashboard System Ready');
console.log('📋 Moduler: 11 moduler + 1 huvudfil');
console.log('🚀 Redo för initialisering vid DOMContentLoaded');