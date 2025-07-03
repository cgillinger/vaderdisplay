/**
 * API Manager Module - All API Calls & Data Fetching
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/api-manager.js
 */

import { dashboardState, updateDashboardState, updateTheme, showError, updateStatus } from './state-manager.js';
import { updateDataAvailability } from './netatmo-intelligence.js';
import { applyUIAdaptations, adaptElementVisibility } from './ui-degradation.js';
import { updateCurrentWeather, updateHourlyForecast, updateDailyForecast } from './ui-updaters.js';

// === API ENDPOINTS ===
const API_ENDPOINTS = {
    current: '/api/current',
    forecast: '/api/forecast',
    daily: '/api/daily',
    theme: '/api/theme'
};

// === FETCH UTILITIES ===

/**
 * Fetch med timeout-hantering
 * @param {string} url - URL att fetcha
 * @param {number} timeout - Timeout i millisekunder
 * @returns {Promise} API-respons som JSON
 */
export async function fetchWithTimeout(url, timeout = 10000) {
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
        
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
        }
        
        throw error;
    }
}

/**
 * Fetch med retry-logik
 * @param {string} url - URL att fetcha
 * @param {number} retries - Antal försök
 * @param {number} delay - Delay mellan försök i ms
 * @returns {Promise} API-respons som JSON
 */
export async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fetchWithTimeout(url);
        } catch (error) {
            console.warn(`🔄 Försök ${i + 1}/${retries} misslyckades för ${url}:`, error.message);
            
            if (i === retries - 1) {
                throw error;
            }
            
            // Vänta innan nästa försök
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// === MAIN API FUNCTIONS ===

/**
 * Hämta aktuell väderdata
 * @returns {Promise} Aktuell väderdata
 */
export async function fetchCurrentWeather() {
    try {
        const data = await fetchWithTimeout(API_ENDPOINTS.current);
        console.log('📊 Aktuell väderdata hämtad');
        return data;
    } catch (error) {
        console.error('❌ Fel vid hämtning av aktuell väderdata:', error);
        throw error;
    }
}

/**
 * Hämta timprognos
 * @returns {Promise} Timprognos-data
 */
export async function fetchHourlyForecast() {
    try {
        const data = await fetchWithTimeout(API_ENDPOINTS.forecast);
        console.log('📈 Timprognos hämtad');
        return data;
    } catch (error) {
        console.error('❌ Fel vid hämtning av timprognos:', error);
        throw error;
    }
}

/**
 * Hämta dagsprognos
 * @returns {Promise} Dagsprognos-data
 */
export async function fetchDailyForecast() {
    try {
        const data = await fetchWithTimeout(API_ENDPOINTS.daily);
        console.log('📅 Dagsprognos hämtad');
        return data;
    } catch (error) {
        console.error('❌ Fel vid hämtning av dagsprognos:', error);
        throw error;
    }
}

/**
 * Hämta tema-information
 * @returns {Promise} Tema-data
 */
export async function fetchTheme() {
    try {
        const data = await fetchWithTimeout(API_ENDPOINTS.theme);
        console.log('🎨 Tema-data hämtad');
        return data;
    } catch (error) {
        console.error('❌ Fel vid hämtning av tema:', error);
        throw error;
    }
}

// === BATCH API FUNCTIONS ===

/**
 * Hämta all väderdata parallellt
 * @returns {Promise} Objekt med all väderdata
 */
export async function fetchAllWeatherData() {
    try {
        const [currentData, forecastData, dailyData] = await Promise.all([
            fetchCurrentWeather(),
            fetchHourlyForecast(),
            fetchDailyForecast()
        ]);
        
        return {
            current: currentData,
            forecast: forecastData,
            daily: dailyData
        };
    } catch (error) {
        console.error('❌ Fel vid hämtning av väderdata:', error);
        throw error;
    }
}

/**
 * Hämta all data med fallback-strategi
 * @returns {Promise} Objekt med tillgänglig data
 */
export async function fetchAllDataWithFallback() {
    const results = {
        current: null,
        forecast: null,
        daily: null,
        errors: []
    };
    
    // Försök hämta varje dataset individuellt
    try {
        results.current = await fetchCurrentWeather();
    } catch (error) {
        results.errors.push({ type: 'current', error: error.message });
    }
    
    try {
        results.forecast = await fetchHourlyForecast();
    } catch (error) {
        results.errors.push({ type: 'forecast', error: error.message });
    }
    
    try {
        results.daily = await fetchDailyForecast();
    } catch (error) {
        results.errors.push({ type: 'daily', error: error.message });
    }
    
    return results;
}

// === UPDATE FUNCTIONS ===

/**
 * Uppdatera all väderdata
 * @returns {Promise} Void
 */
export async function updateAllData() {
    try {
        console.log('🔄 Uppdaterar all väderdata...');
        
        const [currentData, forecastData, dailyData] = await Promise.all([
            fetchWithTimeout(API_ENDPOINTS.current),
            fetchWithTimeout(API_ENDPOINTS.forecast),
            fetchWithTimeout(API_ENDPOINTS.daily)
        ]);
        
        // FAS 2: Uppdatera Netatmo-intelligence state
        if (currentData.config) {
            updateDashboardState({
                useNetatmo: currentData.config.use_netatmo || false,
                config: currentData.config,
                windUnit: currentData.config.wind_unit || dashboardState.windUnit
            });
            
            console.log(`🧠 FAS 2: Netatmo-läge: ${dashboardState.useNetatmo ? 'AKTIVT' : 'INAKTIVT'}`);
        }
        
        // FAS 2: Uppdatera data-tillgänglighet
        updateDataAvailability(currentData);
        
        // FAS 3: Applicera UI-anpassningar FÖRE data-uppdatering
        applyUIAdaptations();
        
        // Uppdatera UI-komponenter
        updateCurrentWeather(currentData);
        updateHourlyForecast(forecastData.forecast);
        updateDailyForecast(dailyData.daily_forecast);
        updateStatus(currentData.status);
        
        // Kontrollera tema-ändring
        if (currentData.theme !== dashboardState.currentTheme) {
            updateTheme(currentData.theme);
        }
        
        // FAS 3: Uppdatera element-synlighet efter data-uppdatering
        adaptElementVisibility();
        
        // Uppdatera timestamp
        updateDashboardState({
            lastUpdate: new Date().toISOString()
        });
        
        console.log('✅ All väderdata uppdaterad');
        
    } catch (error) {
        console.error('❌ Fel vid datahämtning:', error);
        showError('Fel vid uppdatering av väderdata');
        throw error;
    }
}

/**
 * Kontrollera tema-uppdateringar
 * @returns {Promise} Void
 */
export async function checkThemeUpdate() {
    try {
        const themeData = await fetchTheme();
        
        if (themeData.theme !== dashboardState.currentTheme) {
            console.log(`🎨 Tema-ändring: ${dashboardState.currentTheme} → ${themeData.theme}`);
            updateTheme(themeData.theme);
        }
    } catch (error) {
        console.error('❌ Fel vid tema-kontroll:', error);
        // Tema-fel ska inte stoppa huvudfunktionaliteten
    }
}

// === BACKGROUND UPDATE FUNCTIONS ===

/**
 * Starta periodiska data-uppdateringar
 * @param {number} interval - Uppdateringsintervall i ms
 * @returns {number} Interval ID
 */
export function startDataUpdates(interval = 30000) {
    const intervalId = setInterval(async () => {
        try {
            await updateAllData();
        } catch (error) {
            console.error('❌ Fel vid periodisk data-uppdatering:', error);
        }
    }, interval);
    
    console.log(`🔄 Periodiska data-uppdateringar startade (var ${interval/1000}s)`);
    return intervalId;
}

/**
 * Starta periodiska tema-kontroller
 * @param {number} interval - Kontrollintervall i ms
 * @returns {number} Interval ID
 */
export function startThemeUpdates(interval = 60000) {
    const intervalId = setInterval(async () => {
        try {
            await checkThemeUpdate();
        } catch (error) {
            console.error('❌ Fel vid periodisk tema-kontroll:', error);
        }
    }, interval);
    
    console.log(`🎨 Periodiska tema-kontroller startade (var ${interval/1000}s)`);
    return intervalId;
}

/**
 * Stoppa periodiska uppdateringar
 * @param {number} intervalId - Interval ID att stoppa
 */
export function stopUpdates(intervalId) {
    if (intervalId) {
        clearInterval(intervalId);
        console.log('🛑 Periodiska uppdateringar stoppade');
    }
}

// === DATA VALIDATION ===

/**
 * Validera API-respons
 * @param {object} data - Data att validera
 * @param {string} dataType - Typ av data ('current', 'forecast', 'daily')
 * @returns {boolean} True om data är giltig
 */
export function validateApiResponse(data, dataType) {
    if (!data || typeof data !== 'object') {
        console.error(`❌ Ogiltig ${dataType} data: inte ett objekt`);
        return false;
    }
    
    switch (dataType) {
        case 'current':
            return validateCurrentWeatherData(data);
        case 'forecast':
            return validateForecastData(data);
        case 'daily':
            return validateDailyData(data);
        default:
            console.warn(`⚠️ Okänd datatyp för validering: ${dataType}`);
            return true;
    }
}

/**
 * Validera aktuell väderdata
 * @param {object} data - Data att validera
 * @returns {boolean} True om data är giltig
 */
function validateCurrentWeatherData(data) {
    // Kontrollera att minst SMHI-data finns
    if (!data.smhi) {
        console.error('❌ Aktuell väderdata saknar SMHI-data');
        return false;
    }
    
    // Kontrollera kritiska SMHI-fält
    const smhi = data.smhi;
    if (smhi.temperature === null || smhi.temperature === undefined) {
        console.error('❌ SMHI-temperatur saknas');
        return false;
    }
    
    if (!smhi.weather_symbol) {
        console.error('❌ SMHI-vädersymbol saknas');
        return false;
    }
    
    return true;
}

/**
 * Validera prognos-data
 * @param {object} data - Data att validera
 * @returns {boolean} True om data är giltig
 */
function validateForecastData(data) {
    if (!data.forecast || !Array.isArray(data.forecast)) {
        console.error('❌ Prognos-data saknar forecast-array');
        return false;
    }
    
    if (data.forecast.length === 0) {
        console.warn('⚠️ Prognos-array är tom');
        return false;
    }
    
    // Kontrollera första prognos-objektet
    const firstForecast = data.forecast[0];
    if (!firstForecast.local_time || !firstForecast.weather_symbol) {
        console.error('❌ Första prognos-objektet saknar kritiska fält');
        return false;
    }
    
    return true;
}

/**
 * Validera dagsprognos-data
 * @param {object} data - Data att validera
 * @returns {boolean} True om data är giltig
 */
function validateDailyData(data) {
    if (!data.daily_forecast || !Array.isArray(data.daily_forecast)) {
        console.error('❌ Dagsprognos-data saknar daily_forecast-array');
        return false;
    }
    
    if (data.daily_forecast.length === 0) {
        console.warn('⚠️ Dagsprognos-array är tom');
        return false;
    }
    
    // Kontrollera första dagsprognos-objektet
    const firstDaily = data.daily_forecast[0];
    if (!firstDaily.weather_symbol || !firstDaily.weekday) {
        console.error('❌ Första dagsprognos-objektet saknar kritiska fält');
        return false;
    }
    
    return true;
}

// === ERROR HANDLING ===

/**
 * Hantera API-fel
 * @param {Error} error - Fel-objekt
 * @param {string} context - Kontext för felet
 */
export function handleApiError(error, context = 'API') {
    console.error(`❌ ${context} fel:`, error);
    
    // Bestäm fel-meddelande baserat på fel-typ
    let errorMessage = 'Kunde inte hämta väderdata';
    
    if (error.message.includes('timeout')) {
        errorMessage = 'Timeout - kontrollera nätverksanslutning';
    } else if (error.message.includes('HTTP 404')) {
        errorMessage = 'API-endpoint hittades inte';
    } else if (error.message.includes('HTTP 500')) {
        errorMessage = 'Serverfel - försök igen senare';
    } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Nätverksfel - kontrollera anslutning';
    }
    
    showError(errorMessage);
}

// === CACHE MANAGEMENT ===

/**
 * Enkel cache för API-respons
 */
class ApiCache {
    constructor(maxAge = 30000) { // 30 sekunder default
        this.cache = new Map();
        this.maxAge = maxAge;
    }
    
    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    clear() {
        this.cache.clear();
    }
}

// Global cache-instans
const apiCache = new ApiCache();

/**
 * Fetch med cache-stöd
 * @param {string} url - URL att fetcha
 * @param {boolean} useCache - Om cache ska användas
 * @returns {Promise} API-respons
 */
export async function fetchWithCache(url, useCache = true) {
    if (useCache) {
        const cached = apiCache.get(url);
        if (cached) {
            console.log(`📦 Cache hit för ${url}`);
            return cached;
        }
    }
    
    const data = await fetchWithTimeout(url);
    
    if (useCache) {
        apiCache.set(url, data);
    }
    
    return data;
}

/**
 * Rensa API-cache
 */
export function clearApiCache() {
    apiCache.clear();
    console.log('🧹 API-cache rensad');
}

// === HEALTH CHECK ===

/**
 * Kontrollera API-hälsa
 * @returns {Promise} Hälsostatus
 */
export async function checkApiHealth() {
    const health = {
        current: false,
        forecast: false,
        daily: false,
        theme: false,
        timestamp: new Date().toISOString()
    };
    
    // Testa varje endpoint
    for (const [key, endpoint] of Object.entries(API_ENDPOINTS)) {
        try {
            await fetchWithTimeout(endpoint, 5000); // 5s timeout för hälsokontroll
            health[key] = true;
        } catch (error) {
            console.warn(`⚠️ ${key} endpoint otillgänglig:`, error.message);
            health[key] = false;
        }
    }
    
    return health;
}

console.log('📦 API Manager Module laddat');