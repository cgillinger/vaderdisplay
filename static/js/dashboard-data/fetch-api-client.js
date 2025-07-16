/**
 * Fetch API Client - STEG 10 REFAKTORERING
 * API-hantering extraherat från dashboard.js
 * Hanterar datahämtning, timeout och tema-kontroll
 * 
 * LOOP FIX: Ta bort dubbel anropning av adaptHumiditySection()
 */

// === API CONSTANTS ===
const API_TIMEOUT = 10000; // 10 sekunder

// === CORE API FUNCTIONS ===

/**
 * Fetch med timeout och error handling
 * @param {string} url - API endpoint URL
 * @param {number} timeout - Timeout i millisekunder (default: 10000)
 * @returns {Promise<object>} JSON-respons från API
 */
async function fetchWithTimeout(url, timeout = API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Uppdatera all väderdata från API:er
 * @returns {Promise<void>}
 */
async function updateAllData() {
    try {
        const [currentData, forecastData, dailyData] = await Promise.all([
            fetchWithTimeout('/api/current'),
            fetchWithTimeout('/api/forecast'),
            fetchWithTimeout('/api/daily')
        ]);
        
        // FAS 2: Uppdatera Netatmo-intelligence state
        if (currentData.config) {
            dashboardState.useNetatmo = currentData.config.use_netatmo || false;
            dashboardState.config = currentData.config;
            
            if (currentData.config.wind_unit) {
                dashboardState.windUnit = currentData.config.wind_unit;
            }
            
            console.log(`🧠 FAS 2: Netatmo-läge: ${dashboardState.useNetatmo ? 'AKTIVT' : 'INAKTIVT'}`);
        }
        
        // STEG 8: Använd Intelligent Data Source istället för lokal funktion
        updateDataAvailability(currentData);
        
        // STEG 9: Använd UI Adaptation Engine istället för lokala funktioner
        applyUIAdaptations();
        
        updateCurrentWeather(currentData);
        updateHourlyForecast(forecastData.forecast);
        updateDailyForecast(dailyData.daily_forecast);
        updateStatus(currentData.status);
        
        if (currentData.theme !== dashboardState.currentTheme) {
            updateTheme(currentData.theme);
        }
        
        // LOOP FIX: Ta bort adaptElementVisibility() som orsakar dubbel anropning
        // adaptElementVisibility(); <- BORTTAGEN för att fixa loop
        
        dashboardState.lastUpdate = new Date().toISOString();
        
    } catch (error) {
        console.error('❌ Fel vid datahämtning:', error);
        showError('Fel vid uppdatering av väderdata');
    }
}

/**
 * Kontrollera tema-uppdateringar från API
 * @returns {Promise<void>}
 */
async function checkThemeUpdate() {
    try {
        const themeData = await fetchWithTimeout('/api/theme');
        
        if (themeData.theme !== dashboardState.currentTheme) {
            console.log(`🎨 Tema-ändring: ${dashboardState.currentTheme} → ${themeData.theme}`);
            updateTheme(themeData.theme);
        }
    } catch (error) {
        console.error('❌ Fel vid tema-kontroll:', error);
    }
}

console.log('✅ STEG 10: Fetch API Client laddat - 3 API-funktioner extraherade!');