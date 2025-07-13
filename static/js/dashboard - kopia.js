/**
 * Modern Weather Dashboard - Frontend JavaScript
 * FAS 3: GRACIÖS UI-DEGRADERING för Netatmo-oberoende drift
 * FONT AWESOME OPTIMERAD + CIRKULÄR KLOCKA + BAROMETER + LP156WH4 FÖRSTÄRKNING
 * + NETATMO INTELLIGENCE: Automatisk datasubstitution och källhantering
 * + UI DEGRADERING: Dolda element och layout-anpassningar
 * + HUMIDITY FIX: Dölj luftfuktighet helt när data saknas
 * 
 * STEG 1-6 REFAKTORERING: Extraherade moduler laddas från separata filer
 * IMPORTERAR: 
 * - STEG 1: formatters-dashboard.js (formatTemperature, getWeatherDescription, etc.)
 * - STEG 2: wind-calculations.js (WIND_SCALES, convertWindSpeed, formatWindTextForTwoLines)
 * - STEG 3: dom-helpers.js (updateElement, updateElementHTML, updateSunTimeOptimized, isDaytime)  
 * - STEG 4: weather-icon-renderer.js (WeatherIconRenderer)
 * - STEG 5: fontawesome-renderer.js (FontAwesomeRenderer)
 * - STEG 6: circular-clock.js (CircularClock)
 */

// === REFAKTORERADE MODULER LADDAS I INDEX.HTML ===
// STEG 1: formatters-dashboard.js
// STEG 2: wind-calculations.js  
// STEG 3: dom-helpers.js
// STEG 4: weather-icon-renderer.js
// STEG 5: fontawesome-renderer.js
// STEG 6: circular-clock.js

// === GLOBAL STATE ===
let dashboardState = {
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
const UPDATE_INTERVAL = 30000; // 30 sekunder
const THEME_CHECK_INTERVAL = 60000; // 1 minut
// STEG 6: CLOCK_UPDATE_INTERVAL flyttad till circular-clock.js

// === FAS 3: UI DEGRADERING SYSTEM ===

/**
 * Hantera visning/döljning av UI-element baserat på Netatmo-tillgänglighet
 */
function applyUIAdaptations() {
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

/**
 * HUMIDITY FIX: Anpassa luftfuktighet-sektionen beroende på data-tillgänglighet
 */
function adaptHumiditySection(netatmoAvailable) {
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
 */
function adaptTemperatureSection(netatmoAvailable) {
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
 */
function adaptAirQualitySection(netatmoAvailable) {
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
 */
function adaptLabels(netatmoAvailable) {
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
 */
function applyCSSAdaptations(netatmoAvailable) {
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

/**
 * Dynamiskt dölja/visa element baserat på data-tillgänglighet
 */
function adaptElementVisibility() {
    // HUMIDITY FIX: Kontrollera luftfuktighet separat
    adaptHumiditySection(isNetatmoAvailable());
    
    // Dölj andra element som inte har data
    const elementsToCheck = [
        { 
            selector: '.air-quality-container', 
            dataCheck: () => getDataSource('co2').available 
        }
    ];
    
    elementsToCheck.forEach(({ selector, dataCheck }) => {
        const element = document.querySelector(selector);
        if (element) {
            if (dataCheck()) {
                element.classList.remove('data-unavailable');
            } else {
                element.classList.add('data-unavailable');
            }
        }
    });
}

// === FAS 2: NETATMO INTELLIGENCE SYSTEM (BIBEHÅLLET) ===

/**
 * Kontrollera om Netatmo är tillgängligt baserat på config och data
 */
function isNetatmoAvailable() {
    return dashboardState.useNetatmo && dashboardState.config && dashboardState.config.use_netatmo;
}

/**
 * Hämta datakälla för specifik datatyp
 * @param {string} dataType - 'temperature', 'humidity', 'pressure', 'pressure_trend', 'co2', 'noise'
 * @returns {object} { source: 'netatmo'|'smhi'|'none', available: boolean, fallback: string|null }
 */
function getDataSource(dataType) {
    const netatmoAvailable = isNetatmoAvailable();
    
    switch (dataType) {
        case 'temperature_actual':
            return {
                source: netatmoAvailable ? 'netatmo' : 'none',
                available: netatmoAvailable && dashboardState.dataAvailability.netatmoTemperature,
                fallback: null,
                description: 'Faktisk temperatur'
            };
            
        case 'humidity':
            if (netatmoAvailable && dashboardState.dataAvailability.netatmoHumidity) {
                return {
                    source: 'netatmo',
                    available: true,
                    fallback: null,
                    description: 'Luftfuktighet (Netatmo)'
                };
            } else if (dashboardState.dataAvailability.smhiHumidity) {
                return {
                    source: 'smhi',
                    available: true,
                    fallback: 'netatmo',
                    description: 'Luftfuktighet (SMHI prognos)'
                };
            }
            return { source: 'none', available: false, fallback: null, description: 'Luftfuktighet ej tillgänglig' };
            
        case 'pressure':
            if (netatmoAvailable && dashboardState.dataAvailability.netatmoPressure) {
                return {
                    source: 'netatmo',
                    available: true,
                    fallback: null,
                    description: 'Lufttryck (Netatmo)'
                };
            } else if (dashboardState.dataAvailability.smhiPressure) {
                return {
                    source: 'smhi',
                    available: true,
                    fallback: 'netatmo',
                    description: 'Lufttryck (SMHI prognos)'
                };
            }
            return { source: 'none', available: false, fallback: null, description: 'Lufttryck ej tillgängligt' };
            
        case 'pressure_trend':
            if (netatmoAvailable && dashboardState.dataAvailability.netatmoPressureTrend) {
                return {
                    source: 'netatmo',
                    available: true,
                    fallback: null,
                    description: 'Trycktrend (Netatmo historik)'
                };
            }
            return {
                source: 'smhi',
                available: true,
                fallback: 'netatmo',
                description: 'Trycktrend (SMHI prognos)'
            };
            
        case 'co2':
            return {
                source: netatmoAvailable ? 'netatmo' : 'none',
                available: netatmoAvailable && dashboardState.dataAvailability.netatmoCO2,
                fallback: null,
                description: 'Luftkvalitet (CO2)'
            };
            
        case 'noise':
            return {
                source: netatmoAvailable ? 'netatmo' : 'none',
                available: netatmoAvailable && dashboardState.dataAvailability.netatmoNoise,
                fallback: null,
                description: 'Ljudnivå'
            };
            
        default:
            return { source: 'none', available: false, fallback: null, description: 'Okänd datatyp' };
    }
}

/**
 * Formatera data med källinformation för debugging
 * @param {any} value - Datavärdet
 * @param {string} dataType - Typ av data
 * @returns {object} { value, source, formatted, debug }
 */
function formatDataWithSource(value, dataType) {
    const sourceInfo = getDataSource(dataType);
    
    if (!sourceInfo.available) {
        return {
            value: null,
            source: sourceInfo.source,
            formatted: null,
            debug: `❌ ${sourceInfo.description} - inte tillgänglig`,
            shouldShow: false
        };
    }
    
    let formatted = value;
    let shouldShow = true;
    
    // Datatyp-specifik formatering
    switch (dataType) {
        case 'humidity':
            formatted = value ? `${Math.round(value)}% Luftfuktighet` : null;
            break;
        case 'pressure':
            formatted = value ? `${Math.round(value)} hPa` : null;
            break;
        case 'co2':
            formatted = value ? `${value} ppm Luftkvalitet` : null;
            break;
        case 'noise':
            formatted = value ? `${value} dB Ljud` : null;
            break;
        case 'temperature_actual':
            formatted = value ? formatTemperature(value) : null;
            break;
    }
    
    if (!value && value !== 0) {
        shouldShow = false;
    }
    
    return {
        value: value,
        source: sourceInfo.source,
        formatted: formatted,
        debug: `✅ ${sourceInfo.description} - ${sourceInfo.source}`,
        shouldShow: shouldShow,
        fallback: sourceInfo.fallback
    };
}

/**
 * Uppdatera data-tillgänglighet baserat på API-respons
 * @param {object} apiData - Komplett API-respons
 */
function updateDataAvailability(apiData) {
    // Reset availability
    Object.keys(dashboardState.dataAvailability).forEach(key => {
        dashboardState.dataAvailability[key] = false;
    });
    
    // Kontrollera Netatmo-data
    if (apiData.netatmo) {
        const netatmo = apiData.netatmo;
        dashboardState.dataAvailability.netatmoTemperature = (netatmo.temperature !== null && netatmo.temperature !== undefined);
        dashboardState.dataAvailability.netatmoHumidity = (netatmo.humidity !== null && netatmo.humidity !== undefined);
        dashboardState.dataAvailability.netatmoPressure = (netatmo.pressure !== null && netatmo.pressure !== undefined);
        dashboardState.dataAvailability.netatmoCO2 = (netatmo.co2 !== null && netatmo.co2 !== undefined);
        dashboardState.dataAvailability.netatmoNoise = (netatmo.noise !== null && netatmo.noise !== undefined);
        dashboardState.dataAvailability.netatmoPressureTrend = (
            netatmo.pressure_trend && 
            netatmo.pressure_trend.trend !== 'n/a' && 
            netatmo.pressure_trend.trend !== null
        );
    }
    
    // HUMIDITY FIX: Kontrollera SMHI-data mer noggrant
    if (apiData.smhi) {
        const smhi = apiData.smhi;
        // SMHI current weather har normalt inte humidity, men vi kontrollerar ändå
        dashboardState.dataAvailability.smhiHumidity = (smhi.humidity !== null && smhi.humidity !== undefined);
        dashboardState.dataAvailability.smhiPressure = (smhi.pressure !== null && smhi.pressure !== undefined);
        
        console.log(`📊 HUMIDITY FIX: SMHI humidity tillgänglig: ${dashboardState.dataAvailability.smhiHumidity}`);
    }
    
    // Debug-loggning
    console.log('📊 FAS 2: Data-tillgänglighet uppdaterad:', dashboardState.dataAvailability);
}

/**
 * Skapa SMHI-baserad trycktrend som fallback
 * @param {object} smhiData - SMHI current weather data
 * @returns {object} Förenklad trycktrend-struktur
 */
function createSmhiPressureTrendFallback(smhiData) {
    // Förenklad trycktrend från SMHI (statisk för nu, kan förbättras med prognosdata)
    if (!smhiData || !smhiData.pressure) {
        return {
            trend: 'n/a',
            description: 'Trycktrend ej tillgänglig',
            icon: 'wi-na',
            data_hours: 0,
            pressure_change: 0,
            analysis_quality: 'poor',
            source: 'smhi_fallback'
        };
    }
    
    // Mycket förenklad "trend" baserat på absolut tryck
    const pressure = smhiData.pressure;
    let trend = 'stable';
    let description = 'Stabilt lufttryck (SMHI)';
    let icon = 'wi-minus';
    
    if (pressure > 1020) {
        trend = 'rising';
        description = 'Högtryck - stabilt väder (SMHI)';
        icon = 'wi-direction-up';
    } else if (pressure < 1000) {
        trend = 'falling';
        description = 'Lågtryck - instabilt väder (SMHI)';
        icon = 'wi-direction-down';
    }
    
    return {
        trend: trend,
        description: description,
        icon: icon,
        data_hours: 0,
        pressure_change: 0,
        analysis_quality: 'basic',
        source: 'smhi_fallback'
    };
}

// === STEG 6: CIRKULÄR KLOCKA SYSTEM flyttat till circular-clock.js ===
// MODULER LADDAS: circular-clock.js via script-tag i index.html
// TILLGÄNGLIGT SOM: window.CircularClock.*

// === BAROMETER SYSTEM ===

class BarometerManager {
    static updateBarometerDetail(pressureTrend, currentPressure) {
        const barometerIcon = document.getElementById('barometer-icon');
        const barometerPressureLine = document.getElementById('barometer-pressure-line');
        const barometerTrendLine = document.getElementById('barometer-trend-line');
        
        if (!barometerIcon || !barometerPressureLine || !barometerTrendLine) {
            console.warn('⚠️ Barometer detail-element saknas i DOM');
            return;
        }
        
        // FAS 2: Använd intelligent datahantering för tryck
        const pressureData = formatDataWithSource(currentPressure, 'pressure');
        
        if (pressureData.shouldShow) {
            barometerPressureLine.textContent = `${Math.round(pressureData.value)} hPa`;
            console.log(pressureData.debug);
        } else {
            barometerPressureLine.textContent = '-- hPa';
        }
        
        // Hantera trycktrend med fallback
        let finalPressureTrend = pressureTrend;
        
        if (!pressureTrend || pressureTrend.trend === 'n/a') {
            // FAS 2: Använd SMHI-baserad fallback om Netatmo saknas
            const smhiData = { pressure: currentPressure };
            finalPressureTrend = createSmhiPressureTrendFallback(smhiData);
            console.log('📊 FAS 2: Använder SMHI trycktrend-fallback');
        }
        
        // Uppdatera barometer-ikon
        this.updateBarometerIcon(barometerIcon, finalPressureTrend.trend);
        
        // Uppdatera trend-linje
        const statusMap = {
            'rising': 'Stigande',
            'falling': 'Fallande',
            'stable': 'Stabilt'
        };
        const trendText = statusMap[finalPressureTrend.trend] || 'Okänt';
        barometerTrendLine.textContent = `Trend: ${trendText}`;
        
        console.log(`📊 FAS 2: Barometer uppdaterad: ${finalPressureTrend.trend} (källa: ${finalPressureTrend.source || 'netatmo'})`);
    }
    
    static setBarometerDetailFallback(iconElement, trendElement) {
        this.updateBarometerIcon(iconElement, 'n/a');
        trendElement.textContent = 'Trend: Samlar data...';
    }
    
    static updateBarometerIcon(iconElement, trend) {
        // Kontrollera om ikonen redan är skapad
        let barometerIcon = iconElement.querySelector('.wi-barometer');
        
        if (!barometerIcon) {
            // Rensa befintligt innehåll
            iconElement.innerHTML = '';
            
            // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
            barometerIcon = WeatherIconRenderer.createIcon('wi-barometer', []);
            barometerIcon.style.cssText = `
                font-size: clamp(20px, 2rem, 26px);
                display: inline-block;
                line-height: 1;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 0 1px currentColor;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1)) drop-shadow(0 0 1px currentColor);
                transition: color 0.3s ease;
                margin-top: 2px;
            `;
            
            iconElement.appendChild(barometerIcon);
        }
        
        // Ta bort alla trend-klasser
        barometerIcon.classList.remove('rising', 'falling', 'stable', 'na');
        
        // Lägg till färgklass baserat på trend
        const classMap = {
            'rising': 'rising',
            'falling': 'falling', 
            'stable': 'stable',
            'n/a': 'na'
        };
        
        const cssClass = classMap[trend] || 'na';
        barometerIcon.classList.add(cssClass);
        
        console.log(`🎨 Barometer-ikon: ${trend} → ${cssClass}`);
    }
}

// === VINDDATA UNDER FAKTISK (FÖRSTÄRKT VÄDERRIKTNINGSPIL) ===

function updateWindUnderFaktisk(smhiData) {
    const netatmoSection = document.querySelector('.netatmo-temperature-section');
    if (!netatmoSection) return;
    
    // Ta bort befintliga vinddata
    const existingWindElements = netatmoSection.querySelectorAll('.wind-under-faktisk');
    existingWindElements.forEach(element => element.remove());
    
    // FAS 3: Bara lägg till vinddata om Netatmo-sektionen visas
    if (netatmoSection.classList.contains('netatmo-hidden')) {
        console.log('🙈 FAS 3: Vinddata skippas - FAKTISK sektion är dold');
        return;
    }
    
    // Lägg till ny vinddata
    if (smhiData.wind_speed !== null && smhiData.wind_speed !== undefined) {
        const windKmh = smhiData.wind_speed * 3.6;
        const windData = convertWindSpeed(windKmh, dashboardState.windUnit);
        
        let windText = windData.value;
        let windArrowHTML = '';
        
        if (smhiData.wind_direction !== null && smhiData.wind_direction !== undefined) {
            const windDir = getWindDirection(smhiData.wind_direction);
            const windDegree = Math.round(smhiData.wind_direction);
            
            // FÖRSTÄRKT VÄDERRIKTNINGSPIL: 12px → 28px för LP156WH4-synlighet
            windArrowHTML = ` <i class="wi wi-wind from-${windDegree}-deg" style="
                color: #4A9EFF; 
                font-size: 28px; 
                margin-left: 4px; 
                font-family: 'weathericons', 'Weather Icons', sans-serif;
                display: inline-block;
                text-shadow: 0 0 1px currentColor;
                filter: drop-shadow(0 0 1px currentColor);
            "></i>`;
            windText += ` ${windDir}`;
        }
        
        // Skapa vinddata-element
        const windElement = document.createElement('div');
        windElement.className = 'wind-under-faktisk';
        
        // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
        const windIcon = WeatherIconRenderer.createIcon(windData.icon, []);
        windIcon.style.cssText = `
            color: #4A9EFF; 
            font-size: 12px;
            margin-right: 4px;
            display: inline-block;
        `;
        
        windElement.appendChild(windIcon);
        windElement.insertAdjacentHTML('beforeend', `${windText}${windArrowHTML}`);
        
        netatmoSection.appendChild(windElement);
        
        console.log(`💨 FÖRSTÄRKT vinddata under FAKTISK: ${windText} (pil: 28px)`);
    }
}

function removeWindDetailItems() {
    const weatherDetailsGrid = document.querySelector('.weather-details-grid');
    if (!weatherDetailsGrid) return;
    
    const allDetailItems = weatherDetailsGrid.querySelectorAll('.detail-item');
    
    allDetailItems.forEach(item => {
        const text = item.textContent || '';
        
        if (text.includes('m/s') || 
            text.includes('Vind') || 
            text.includes('km/h') ||
            text.includes('Beaufort') ||
            item.classList.contains('wind-detail') ||
            item.id && item.id.includes('wind')) {
            
            console.log(`🗑️ Tar bort vind detail-item: ${text}`);
            item.remove();
        }
    });
}

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Weather Dashboard FAS 3: Graciös UI-degradering aktiverad med HUMIDITY FIX');
    initializeDashboard();
    startDataUpdates();
    startThemeCheck();
});

// === MAIN FUNCTIONS ===

async function initializeDashboard() {
    try {
        console.log('📊 FAS 3: Initialiserar graciös dashboard med HUMIDITY FIX...');
        
        initializeRobustIcons();
        // STEG 6: Använd CircularClock modul istället för lokal funktion
        CircularClock.initializeCircularClock(dashboardState);
        removeWindDetailItems();
        
        await updateAllData();
        hideLoadingOverlay();
        
        // WeatherEffects initialization
        if (dashboardState.config?.weather_effects_enabled) {
            initializeWeatherEffects().catch(error => {
                console.warn("WeatherEffects initialization failed:", error);
            });
        }
        console.log('✅ FAS 3: Graciös Dashboard med HUMIDITY FIX initialiserat!');
    } catch (error) {
        console.error('❌ Fel vid initialisering:', error);
        showError('Kunde inte ladda väderdata');
    }
}

function startDataUpdates() {
    dashboardState.updateInterval = setInterval(async () => {
        try {
            await updateAllData();
        } catch (error) {
            console.error('❌ Fel vid data-uppdatering:', error);
        }
    }, UPDATE_INTERVAL);
    
    console.log(`🔄 Data-uppdateringar startade (var ${UPDATE_INTERVAL/1000}s)`);
}

function startThemeCheck() {
    setInterval(async () => {
        try {
            await checkThemeUpdate();
        } catch (error) {
            console.error('❌ Fel vid tema-kontroll:', error);
        }
    }, THEME_CHECK_INTERVAL);
}

// === API FUNCTIONS ===

async function fetchWithTimeout(url, timeout = 10000) {
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
        
        // FAS 2: Uppdatera data-tillgänglighet
        updateDataAvailability(currentData);
        
        // FAS 3: Applicera UI-anpassningar FÖRE data-uppdatering
        applyUIAdaptations();
        
        updateCurrentWeather(currentData);
        updateHourlyForecast(forecastData.forecast);
        updateDailyForecast(dailyData.daily_forecast);
        updateStatus(currentData.status);
        
        if (currentData.theme !== dashboardState.currentTheme) {
            updateTheme(currentData.theme);
        }
        
        // FAS 3: Uppdatera element-synlighet efter data-uppdatering
        adaptElementVisibility();
        
        dashboardState.lastUpdate = new Date().toISOString();
        
    } catch (error) {
        console.error('❌ Fel vid datahämtning:', error);
        showError('Fel vid uppdatering av väderdata');
    }
}

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

// === UI UPDATE FUNCTIONS (UPPDATERAD FÖR FAS 3 + HUMIDITY FIX) ===

function updateCurrentWeather(data) {
    removeWindDetailItems();
    
    // SMHI Data
    if (data.smhi) {
        const smhi = data.smhi;
        
        // SMHI Temperatur
        updateElementHTML('smhi-temperature', smhi.temperature ? formatTemperature(smhi.temperature) : '--.-°');
        
        // SMHI Väder-ikon
        if (smhi.weather_symbol) {
            const iconElement = document.getElementById('smhi-weather-icon');
            const isDay = isDaytime();
            // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
            const iconName = WeatherIconRenderer.getIconName(smhi.weather_symbol, isDay);
            
            if (iconElement) {
                iconElement.innerHTML = '';
                iconElement.className = 'weather-icon';
                
                // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
                const weatherIcon = WeatherIconRenderer.createIcon(iconName, ['weather-main-icon']);
                iconElement.appendChild(weatherIcon);
                
                console.log(`🎨 Main weather icon: ${iconName} for symbol ${smhi.weather_symbol}`);
                
                // WeatherEffects update
                if (window.weatherEffectsManager) {
                    try {
                        weatherEffectsManager.updateFromSMHI(
                            smhi.weather_symbol,
                            smhi.precipitation || 0,
                            smhi.wind_direction || 0
                        );
                    } catch (error) {
                        console.warn("WeatherEffects update failed:", error);
                    }
                }
            }
            
            updateElement('smhi-description', getWeatherDescription(smhi.weather_symbol));
        }
    }
    
    // HUMIDITY FIX: INTELLIGENT DATAHANTERING FÖR LUFTFUKTIGHET
    const humidityData = formatDataWithSource(
        data.netatmo?.humidity || data.smhi?.humidity, 
        'humidity'
    );
    
    if (humidityData.shouldShow) {
        updateHumidityDisplay(humidityData.formatted);
        console.log(`💧 HUMIDITY FIX: ${humidityData.debug}`);
    } else {
        // HUMIDITY FIX: Dölj luftfuktighet helt när ingen data finns
        console.log('🙈 HUMIDITY FIX: Döljer luftfuktighet - ingen data tillgänglig');
        // Element döljs av adaptHumiditySection() som kallas av applyUIAdaptations()
    }
    
    // Netatmo Data (Villkorsstyrd med FAS 3 UI-anpassningar)
    if (data.netatmo && isNetatmoAvailable()) {
        const netatmo = data.netatmo;
        
        // Netatmo Faktisk Temperatur (FAS 3: Bara om sektionen visas)
        const tempData = formatDataWithSource(netatmo.temperature, 'temperature_actual');
        if (tempData.shouldShow) {
            const tempElement = document.getElementById('netatmo-temperature-small');
            if (tempElement && !document.querySelector('.netatmo-temperature-section.netatmo-hidden')) {
                tempElement.innerHTML = formatTemperature(tempData.value);
                
                let tempColor = '#4285f4';
                if (tempData.value < 0) tempColor = '#3b82f6';
                else if (tempData.value < 10) tempColor = '#06b6d4';
                else if (tempData.value < 20) tempColor = '#10b981';
                else if (tempData.value < 25) tempColor = '#f59e0b';
                else tempColor = '#ef4444';
                
                tempElement.style.color = tempColor;
                console.log(tempData.debug);
            }
        }
        
        // CO2/Luftkvalitet - FAS 3: Villkorsstyrd visning
        const co2Data = formatDataWithSource(netatmo.co2, 'co2');
        if (co2Data.shouldShow) {
            const airQualityElement = document.getElementById('air-quality');
            const airQualityContainer = document.querySelector('.air-quality-container');
            
            if (airQualityElement && airQualityContainer && !airQualityContainer.classList.contains('netatmo-hidden')) {
                airQualityElement.textContent = co2Data.formatted;
                
                let iconClass = 'good';
                if (co2Data.value > 1500) {
                    iconClass = 'poor';
                } else if (co2Data.value > 800) {
                    iconClass = 'moderate';
                }
                
                const existingIcon = airQualityContainer.querySelector('.air-quality-fa-icon');
                if (existingIcon) {
                    existingIcon.remove();
                }
                
                // STEG 5: Använd FontAwesomeRenderer istället för FontAwesomeManager
                const leafIcon = FontAwesomeRenderer.createLeafIcon(iconClass);
                airQualityContainer.insertBefore(leafIcon, airQualityElement);
                
                console.log(`🍃 ${co2Data.debug} - SEPARERAD FÄRGKODNING: ${iconClass}`);
            }
        }
        
        // BAROMETER UPDATE med smart källa
        const pressureTrend = netatmo.pressure_trend;
        const pressureData = formatDataWithSource(netatmo.pressure || data.smhi?.pressure, 'pressure');
        
        BarometerManager.updateBarometerDetail(pressureTrend, pressureData.value);
        
        // FÖRSTÄRKT VINDDATA UNDER FAKTISK (FAS 3: Bara om sektionen visas)
        if (data.smhi && data.smhi.wind_speed !== null && data.smhi.wind_speed !== undefined) {
            updateWindUnderFaktisk(data.smhi);
        }
    } else {
        // FAS 3: SMHI-ONLY MODE - Fallback hantering med UI-anpassningar
        console.log('📊 FAS 3: SMHI-only mode med UI-degradering + HUMIDITY FIX');
        
        // Använd SMHI för barometer med fallback
        const fallbackPressureTrend = createSmhiPressureTrendFallback(data.smhi);
        const pressureData = formatDataWithSource(data.smhi?.pressure, 'pressure');
        
        BarometerManager.updateBarometerDetail(fallbackPressureTrend, pressureData.value);
        
        console.log('🔄 FAS 3: FAKTISK temperatur, luftfuktighet och CO2 är dolda via UI-anpassningar');
    }
    
    // SOL-TIDER (Oförändrade)
    if (data.sun) {
        try {
            if (data.sun.sunrise) {
                const sunrise = new Date(data.sun.sunrise);
                const sunriseTime = sunrise.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'});
                updateSunTimeOptimized('sunrise-time', sunriseTime);
            }
            
            if (data.sun.sunset) {
                const sunset = new Date(data.sun.sunset);
                const sunsetTime = sunset.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'});
                updateSunTimeOptimized('sunset-time', sunsetTime);
            }
        } catch (error) {
            console.error('❌ Fel vid parsning av soltider:', error);
        }
    }
    
    setTimeout(() => {
        removeWindDetailItems();
    }, 100);
}

function updateHourlyForecast(forecastData) {
    const container = document.getElementById('hourly-forecast');
    
    if (!forecastData || !Array.isArray(forecastData) || forecastData.length === 0) {
        container.innerHTML = '<div class="forecast-placeholder">⚠️ Ingen prognos tillgänglig</div>';
        return;
    }
    
    container.innerHTML = '';
    
    forecastData.forEach(forecast => {
        const card = createForecastCard(forecast);
        container.appendChild(card);
    });
    
    console.log(`📈 ${forecastData.length} timprognos-kort uppdaterade`);
}

function createForecastCard(forecast) {
    const card = document.createElement('div');
    
    const hour = parseInt(forecast.local_time.split(':')[0]);
    let timeClass = 'time-day';
    
    if (hour >= 6 && hour < 12) timeClass = 'time-dawn';
    else if (hour >= 12 && hour < 18) timeClass = 'time-day';
    else if (hour >= 18 && hour < 21) timeClass = 'time-evening';
    else timeClass = 'time-night';
    
    card.className = `forecast-card ${timeClass}`;
    
    const isDay = hour >= 6 && hour <= 20;
    // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
    const iconName = WeatherIconRenderer.getIconName(forecast.weather_symbol, isDay);
    
    let windDisplay = '';
    if (forecast.wind_speed) {
        const windKmh = Math.round(forecast.wind_speed * 3.6);
        const windData = convertWindSpeed(windKmh, dashboardState.windUnit);
        
        // KONSISTENT VINDLAYOUT: Dela upp i två rader
        const windLines = formatWindTextForTwoLines(windData.value);
        
        let windArrow = '';
        if (forecast.wind_direction !== null && forecast.wind_direction !== undefined) {
            const arrowRotation = forecast.wind_direction + 180;
            windArrow = `<i class="wi wi-direction-up" style="
                transform: rotate(${arrowRotation}deg); 
                color: #4A9EFF; 
                font-size: 24px;  
                margin-left: 3px; 
                font-family: 'weathericons', 'Weather Icons', sans-serif;
            "></i>`;
        }
        
        // Ny struktur med två rader
        windDisplay = `<div class="forecast-wind forecast-wind-consistent">
            <div class="forecast-wind-header">
                <i class="wi ${windData.icon}" style="font-size: 16px; opacity: 0.9; color: #4A9EFF; margin-right: 2px; font-family: 'weathericons', 'Weather Icons', sans-serif;"></i>
                ${windArrow}
            </div>
            <div class="forecast-wind-text">
                <div class="wind-line1">${windLines.line1}</div>
                <div class="wind-line2">${windLines.line2}</div>
            </div>
        </div>`;
    }
    
    let precipDisplay = '';
    if (forecast.precipitation && forecast.precipitation > 0) {
        precipDisplay = `<div class="forecast-precip">
            <i class="wi wi-raindrops" style="font-size: 12px; opacity: 0.8; color: #4169E1; font-family: 'weathericons', 'Weather Icons', sans-serif;"></i>
            <span style="font-size: 11px;">${forecast.precipitation.toFixed(1)} mm</span>
        </div>`;
    }
    
    const iconId = `forecast-icon-${Math.random().toString(36).substr(2, 9)}`;
    const tempDegree = formatTemperatureInteger(forecast.temperature);
    
    card.innerHTML = `
        <div class="forecast-time">${forecast.local_time}</div>
        <div class="forecast-icon" id="${iconId}"></div>
        <div class="forecast-temp" style="font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">${tempDegree}</div>
        ${windDisplay}
        ${precipDisplay}
    `;
    
    const iconContainer = card.querySelector(`#${iconId}`);
    // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
    const weatherIcon = WeatherIconRenderer.createIcon(iconName, ['forecast-weather-icon']);
    iconContainer.appendChild(weatherIcon);
    
    return card;
}

function updateDailyForecast(dailyData) {
    const container = document.getElementById('daily-forecast');
    
    if (!dailyData || !Array.isArray(dailyData) || dailyData.length === 0) {
        container.innerHTML = '<div class="forecast-placeholder">⚠️ Ingen 5-dagarsprognos tillgänglig</div>';
        return;
    }
    
    container.innerHTML = '';
    
    // Lägg till rubriker
    const headersElement = document.createElement('div');
    headersElement.className = 'daily-forecast-headers';
    headersElement.innerHTML = `
        <div class="header-icon"></div>
        <div class="header-temp">
            <span>DAG</span>
            <span>NATT</span>
        </div>
        <div class="header-weekday"></div>
        <div class="header-date"></div>
    `;
    container.appendChild(headersElement);
    
    dailyData.forEach(day => {
        const item = createDailyForecastItem(day);
        container.appendChild(item);
    });
    
    console.log(`📅 ${dailyData.length} dagsprognos-rader uppdaterade`);
}

function createDailyForecastItem(day) {
    const item = document.createElement('div');
    item.className = 'daily-forecast-item';
    
    // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
    const iconName = WeatherIconRenderer.getIconName(day.weather_symbol, true);
    
    const weekdays = {
        'Monday': 'Måndag', 'Tuesday': 'Tisdag', 'Wednesday': 'Onsdag',
        'Thursday': 'Torsdag', 'Friday': 'Fredag', 'Saturday': 'Lördag', 'Sunday': 'Söndag'
    };
    const weekdaySwedish = weekdays[day.weekday] || day.weekday;
    
    let dateDisplay = day.date;
    try {
        const dateObj = new Date(day.date);
        const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 
                       'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
        dateDisplay = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
    } catch (e) {
        // Använd original om parsning misslyckas
    }
    
    const iconId = `daily-icon-${Math.random().toString(36).substr(2, 9)}`;
    
    const tempMaxFormatted = formatTemperatureDaily(day.temp_max);
    const tempMinFormatted = formatTemperatureDaily(day.temp_min);
    
    const maxTempColorClass = getTemperatureColorClass(day.temp_max);
    const minTempColorClass = getTemperatureColorClass(day.temp_min);
    const tempColorClass = maxTempColorClass || minTempColorClass;
    
    item.innerHTML = `
        <div class="daily-icon" id="${iconId}"></div>
        <div class="daily-temp ${tempColorClass}">${tempMaxFormatted}/${tempMinFormatted}</div>
        <div class="daily-weekday">${weekdaySwedish}</div>
        <div class="daily-date">${dateDisplay}</div>
    `;
    
    const iconContainer = item.querySelector(`#${iconId}`);
    // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
    const weatherIcon = WeatherIconRenderer.createIcon(iconName, ['daily-weather-icon']);
    
    // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
    const colorClass = WeatherIconRenderer.getColorClass(day.weather_symbol);
    weatherIcon.classList.add(colorClass);
    
    iconContainer.appendChild(weatherIcon);
    
    return item;
}

function initializeRobustIcons() {
    console.log('🎨 FAS 3: Initialiserar graciös ikon-hantering med HUMIDITY FIX...');
    updateHumidityDisplay('50% Luftfuktighet');
    console.log('✅ FAS 3: Graciös ikon-hantering med HUMIDITY FIX initialiserad');
}

function updateHumidityDisplay(humidityText) {
    const humidityElement = document.getElementById('smhi-humidity');
    if (!humidityElement) return;
    
    humidityElement.innerHTML = '';
    humidityElement.className = 'detail-item';
    
    // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
    const humidityIcon = WeatherIconRenderer.createIcon('wi-humidity', ['pressure-icon']);
    humidityIcon.style.cssText = `
        color: #4A9EFF;
        font-size: clamp(16px, 1.6rem, 21px);
        margin-right: 7px;
        display: inline-block;
    `;
    
    humidityElement.appendChild(humidityIcon);
    humidityElement.insertAdjacentHTML('beforeend', `<span>${humidityText}</span>`);
    
    console.log(`💧 HUMIDITY FIX: Luftfuktighetsikon skapad: wi-humidity`);
}

// === UTILITY FUNCTIONS ===

function updateTheme(newTheme) {
    const body = document.body;
    body.className = body.className.replace(/theme-\w+/, `theme-${newTheme}`);
    dashboardState.currentTheme = newTheme;
    console.log(`🎨 Tema uppdaterat till: ${newTheme}`);
}

function updateStatus(statusText) {
    updateElement('status-text', statusText || 'Väderdata uppdaterad');
}

function showError(message) {
    updateStatus(`⚠️ ${message}`);
    console.error('🔴 Frontend error:', message);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
    dashboardState.isLoading = false;
}

// === ERROR HANDLING ===

window.addEventListener('error', function(event) {
    console.error('🔴 JavaScript error:', event.error);
    showError('Ett oväntat fel inträffade');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('🔴 Unhandled promise rejection:', event.reason);
    showError('Fel vid data-hämtning');
});

// === CLEANUP ===

window.addEventListener('beforeunload', function() {
    if (dashboardState.updateInterval) {
        clearInterval(dashboardState.updateInterval);
    }
    if (dashboardState.clockInterval) {
        clearInterval(dashboardState.clockInterval);
    }
});

console.log('✅ FAS 3: Weather Dashboard med Graciös UI-degradering + HUMIDITY FIX laddat! 💧🎨🚀 | STEG 1-6: Formatters + Wind Calculations + DOM Helpers + Weather Icon Renderer + FontAwesome Renderer + Circular Clock refaktorerade!');