/**
 * Netatmo Intelligence Module - FAS 2 Smart Data Management
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/netatmo-intelligence.js
 */

import { dashboardState, updateDashboardState } from './state-manager.js';

// === NETATMO AVAILABILITY FUNCTIONS ===

/**
 * Kontrollera om Netatmo är tillgängligt baserat på config och data
 * @returns {boolean} True om Netatmo är tillgängligt
 */
export function isNetatmoAvailable() {
    return dashboardState.useNetatmo && dashboardState.config && dashboardState.config.use_netatmo;
}

/**
 * Kontrollera om Netatmo har giltig konfiguration
 * @returns {boolean} True om konfiguration är giltig
 */
export function hasValidNetatmoConfig() {
    const config = dashboardState.config;
    if (!config || !config.use_netatmo) return false;
    
    // Kontrollera att nödvändiga Netatmo-inställningar finns
    return !!(config.netatmo_client_id && config.netatmo_client_secret);
}

// === DATA SOURCE MANAGEMENT ===

/**
 * Hämta datakälla för specifik datatyp
 * @param {string} dataType - 'temperature', 'humidity', 'pressure', 'pressure_trend', 'co2', 'noise'
 * @returns {object} { source: 'netatmo'|'smhi'|'none', available: boolean, fallback: string|null }
 */
export function getDataSource(dataType) {
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
export function formatDataWithSource(value, dataType) {
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

// === DATA AVAILABILITY MANAGEMENT ===

/**
 * Uppdatera data-tillgänglighet baserat på API-respons
 * @param {object} apiData - Komplett API-respons
 */
export function updateDataAvailability(apiData) {
    // Reset availability
    const newAvailability = {};
    Object.keys(dashboardState.dataAvailability).forEach(key => {
        newAvailability[key] = false;
    });
    
    // Kontrollera Netatmo-data
    if (apiData.netatmo) {
        const netatmo = apiData.netatmo;
        newAvailability.netatmoTemperature = isValidValue(netatmo.temperature);
        newAvailability.netatmoHumidity = isValidValue(netatmo.humidity);
        newAvailability.netatmoPressure = isValidValue(netatmo.pressure);
        newAvailability.netatmoCO2 = isValidValue(netatmo.co2);
        newAvailability.netatmoNoise = isValidValue(netatmo.noise);
        newAvailability.netatmoPressureTrend = isValidPressureTrend(netatmo.pressure_trend);
    }
    
    // Kontrollera SMHI-data
    if (apiData.smhi) {
        const smhi = apiData.smhi;
        // SMHI current weather har normalt inte humidity, men vi kontrollerar ändå
        newAvailability.smhiHumidity = isValidValue(smhi.humidity);
        newAvailability.smhiPressure = isValidValue(smhi.pressure);
        
        console.log(`📊 SMHI humidity tillgänglig: ${newAvailability.smhiHumidity}`);
    }
    
    // Uppdatera state
    updateDashboardState({ dataAvailability: newAvailability });
    
    // Debug-loggning
    console.log('📊 FAS 2: Data-tillgänglighet uppdaterad:', newAvailability);
}

/**
 * Kontrollera om ett värde är giltigt
 * @param {any} value - Värde att kontrollera
 * @returns {boolean} True om värdet är giltigt
 */
function isValidValue(value) {
    return value !== null && value !== undefined && !isNaN(value);
}

/**
 * Kontrollera om trycktrend är giltig
 * @param {object} pressureTrend - Trycktrend-objekt
 * @returns {boolean} True om trycktrend är giltig
 */
function isValidPressureTrend(pressureTrend) {
    return !!(
        pressureTrend && 
        pressureTrend.trend !== 'n/a' && 
        pressureTrend.trend !== null &&
        pressureTrend.trend !== undefined
    );
}

// === FALLBACK SYSTEMS ===

/**
 * Skapa SMHI-baserad trycktrend som fallback
 * @param {object} smhiData - SMHI current weather data
 * @returns {object} Förenklad trycktrend-struktur
 */
export function createSmhiPressureTrendFallback(smhiData) {
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

/**
 * Skapa luftfuktighets-fallback från väderprognos
 * @param {object} forecastData - Prognos-data
 * @returns {number|null} Uppskattad luftfuktighet
 */
export function createHumidityFallback(forecastData) {
    if (!forecastData || !forecastData.forecast || !Array.isArray(forecastData.forecast)) {
        return null;
    }
    
    // Använd första prognosens data som uppskattning
    const firstForecast = forecastData.forecast[0];
    if (firstForecast && firstForecast.humidity !== null && firstForecast.humidity !== undefined) {
        console.log('📊 Använder prognos-luftfuktighet som fallback');
        return firstForecast.humidity;
    }
    
    return null;
}

// === DATA QUALITY ASSESSMENT ===

/**
 * Bedöm datakvalitet för en specifik källa
 * @param {string} source - Datakälla ('netatmo', 'smhi')
 * @param {object} data - Data att bedöma
 * @returns {object} Kvalitetsbedömning
 */
export function assessDataQuality(source, data) {
    const quality = {
        score: 0,
        level: 'poor',
        issues: [],
        recommendations: []
    };
    
    if (source === 'netatmo') {
        return assessNetatmoQuality(data, quality);
    } else if (source === 'smhi') {
        return assessSmhiQuality(data, quality);
    }
    
    return quality;
}

/**
 * Bedöm Netatmo-datakvalitet
 * @param {object} data - Netatmo-data
 * @param {object} quality - Kvalitetsobjekt
 * @returns {object} Uppdaterat kvalitetsobjekt
 */
function assessNetatmoQuality(data, quality) {
    let score = 0;
    
    // Kontrollera temperatur
    if (isValidValue(data.temperature)) {
        score += 20;
        if (data.temperature > -50 && data.temperature < 60) {
            score += 10; // Rimlig temperatur
        } else {
            quality.issues.push('Orealistisk temperatur');
        }
    } else {
        quality.issues.push('Temperatur saknas');
    }
    
    // Kontrollera luftfuktighet
    if (isValidValue(data.humidity)) {
        score += 15;
        if (data.humidity >= 0 && data.humidity <= 100) {
            score += 10; // Giltig luftfuktighet
        } else {
            quality.issues.push('Ogiltig luftfuktighet');
        }
    }
    
    // Kontrollera lufttryck
    if (isValidValue(data.pressure)) {
        score += 15;
        if (data.pressure > 800 && data.pressure < 1100) {
            score += 10; // Rimligt lufttryck
        } else {
            quality.issues.push('Orealistiskt lufttryck');
        }
    }
    
    // Kontrollera CO2
    if (isValidValue(data.co2)) {
        score += 15;
        if (data.co2 > 200 && data.co2 < 5000) {
            score += 5; // Rimlig CO2-nivå
        } else {
            quality.issues.push('Orealistisk CO2-nivå');
        }
    }
    
    // Kontrollera trycktrend
    if (isValidPressureTrend(data.pressure_trend)) {
        score += 15;
    }
    
    quality.score = Math.min(score, 100);
    
    // Bestäm kvalitetsnivå
    if (quality.score >= 80) {
        quality.level = 'excellent';
    } else if (quality.score >= 60) {
        quality.level = 'good';
    } else if (quality.score >= 40) {
        quality.level = 'fair';
    } else {
        quality.level = 'poor';
    }
    
    return quality;
}

/**
 * Bedöm SMHI-datakvalitet
 * @param {object} data - SMHI-data
 * @param {object} quality - Kvalitetsobjekt
 * @returns {object} Uppdaterat kvalitetsobjekt
 */
function assessSmhiQuality(data, quality) {
    let score = 50; // SMHI får baspoäng för tillförlitlighet
    
    // Kontrollera temperatur
    if (isValidValue(data.temperature)) {
        score += 25;
        if (data.temperature > -50 && data.temperature < 60) {
            score += 10;
        }
    } else {
        quality.issues.push('SMHI temperatur saknas');
    }
    
    // Kontrollera vädersymbol
    if (data.weather_symbol) {
        score += 15;
    } else {
        quality.issues.push('Vädersymbol saknas');
    }
    
    quality.score = Math.min(score, 100);
    
    if (quality.score >= 80) {
        quality.level = 'excellent';
    } else if (quality.score >= 60) {
        quality.level = 'good';
    } else {
        quality.level = 'fair';
    }
    
    return quality;
}

// === DATA MERGING STRATEGIES ===

/**
 * Sammanfoga data från flera källor intelligent
 * @param {object} netatmoData - Netatmo-data
 * @param {object} smhiData - SMHI-data
 * @returns {object} Sammanfogad data med källinformation
 */
export function mergeDataSources(netatmoData, smhiData) {
    const merged = {
        temperature: null,
        temperature_source: null,
        humidity: null,
        humidity_source: null,
        pressure: null,
        pressure_source: null,
        weather_symbol: null,
        wind_speed: null,
        wind_direction: null,
        quality_score: 0
    };
    
    // Temperatur: Prioritera Netatmo för aktuell, SMHI för prognos
    if (netatmoData && isValidValue(netatmoData.temperature)) {
        merged.temperature = netatmoData.temperature;
        merged.temperature_source = 'netatmo';
    } else if (smhiData && isValidValue(smhiData.temperature)) {
        merged.temperature = smhiData.temperature;
        merged.temperature_source = 'smhi';
    }
    
    // Luftfuktighet: Prioritera Netatmo
    if (netatmoData && isValidValue(netatmoData.humidity)) {
        merged.humidity = netatmoData.humidity;
        merged.humidity_source = 'netatmo';
    } else if (smhiData && isValidValue(smhiData.humidity)) {
        merged.humidity = smhiData.humidity;
        merged.humidity_source = 'smhi';
    }
    
    // Lufttryck: Prioritera Netatmo
    if (netatmoData && isValidValue(netatmoData.pressure)) {
        merged.pressure = netatmoData.pressure;
        merged.pressure_source = 'netatmo';
    } else if (smhiData && isValidValue(smhiData.pressure)) {
        merged.pressure = smhiData.pressure;
        merged.pressure_source = 'smhi';
    }
    
    // SMHI-specifik data
    if (smhiData) {
        merged.weather_symbol = smhiData.weather_symbol;
        merged.wind_speed = smhiData.wind_speed;
        merged.wind_direction = smhiData.wind_direction;
    }
    
    // Beräkna övergripande kvalitetspoäng
    const netatmoQuality = netatmoData ? assessDataQuality('netatmo', netatmoData) : { score: 0 };
    const smhiQuality = smhiData ? assessDataQuality('smhi', smhiData) : { score: 0 };
    merged.quality_score = Math.max(netatmoQuality.score, smhiQuality.score);
    
    return merged;
}

// === HELPER FUNCTIONS ===

/**
 * Formatera temperatur (kopierad från formatters för att undvika cirkulärt beroende)
 * @param {number} temperature - Temperatur att formatera
 * @returns {string} Formaterad temperatur
 */
function formatTemperature(temperature) {
    if (temperature === null || temperature === undefined || isNaN(temperature)) {
        return '--.-°';
    }
    return `${temperature.toFixed(1)}°`;
}

/**
 * Skapa sammanfattning av data-tillgänglighet
 * @returns {object} Sammanfattning av vilken data som finns tillgänglig
 */
export function getDataAvailabilitySummary() {
    const availability = dashboardState.dataAvailability;
    
    return {
        netatmo: {
            available: isNetatmoAvailable(),
            temperature: availability.netatmoTemperature,
            humidity: availability.netatmoHumidity,
            pressure: availability.netatmoPressure,
            co2: availability.netatmoCO2,
            noise: availability.netatmoNoise,
            pressure_trend: availability.netatmoPressureTrend
        },
        smhi: {
            humidity: availability.smhiHumidity,
            pressure: availability.smhiPressure
        },
        overall_quality: calculateOverallDataQuality()
    };
}

/**
 * Beräkna övergripande datakvalitet
 * @returns {string} Kvalitetsnivå ('excellent', 'good', 'fair', 'poor')
 */
function calculateOverallDataQuality() {
    const availability = dashboardState.dataAvailability;
    let score = 0;
    let totalPossible = 0;
    
    if (isNetatmoAvailable()) {
        totalPossible += 60; // Netatmo kan bidra med 60 poäng
        if (availability.netatmoTemperature) score += 15;
        if (availability.netatmoHumidity) score += 10;
        if (availability.netatmoPressure) score += 15;
        if (availability.netatmoCO2) score += 10;
        if (availability.netatmoPressureTrend) score += 10;
    }
    
    totalPossible += 40; // SMHI kan alltid bidra med 40 poäng
    if (availability.smhiHumidity) score += 20;
    if (availability.smhiPressure) score += 20;
    
    const percentage = totalPossible > 0 ? (score / totalPossible) * 100 : 0;
    
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'fair';
    return 'poor';
}

console.log('📦 Netatmo Intelligence Module laddat');