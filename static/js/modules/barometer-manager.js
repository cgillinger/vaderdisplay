/**
 * Barometer Manager Module - Barometer System & Pressure Trends
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/barometer-manager.js
 */

import { WeatherIconManager } from './icon-manager.js';
import { formatDataWithSource, createSmhiPressureTrendFallback } from './netatmo-intelligence.js';

// === BAROMETER MANAGER CLASS ===

/**
 * BarometerManager - Hantera barometer-systemet
 */
export class BarometerManager {
    /**
     * Uppdatera barometer-detaljer
     * @param {object} pressureTrend - Trycktrend-data från Netatmo
     * @param {number} currentPressure - Aktuellt lufttryck
     */
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
    
    /**
     * Sätt barometer-fallback när data saknas
     * @param {HTMLElement} iconElement - Ikon-element
     * @param {HTMLElement} trendElement - Trend-element
     */
    static setBarometerDetailFallback(iconElement, trendElement) {
        this.updateBarometerIcon(iconElement, 'n/a');
        trendElement.textContent = 'Trend: Samlar data...';
    }
    
    /**
     * Uppdatera barometer-ikon baserat på trend
     * @param {HTMLElement} iconElement - Element som ska innehålla ikonen
     * @param {string} trend - Trycktrend ('rising', 'falling', 'stable', 'n/a')
     */
    static updateBarometerIcon(iconElement, trend) {
        // Kontrollera om ikonen redan är skapad
        let barometerIcon = iconElement.querySelector('.wi-barometer');
        
        if (!barometerIcon) {
            // Rensa befintligt innehåll
            iconElement.innerHTML = '';
            
            // Skapa Weather Icons ikon
            barometerIcon = WeatherIconManager.createIcon('wi-barometer', []);
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
    
    /**
     * Skapa komplett barometer-widget
     * @param {HTMLElement} container - Container för widget
     * @param {object} pressureTrend - Trycktrend-data
     * @param {number} currentPressure - Aktuellt tryck
     * @returns {HTMLElement} Komplett barometer-widget
     */
    static createBarometerWidget(container, pressureTrend, currentPressure) {
        if (!container) {
            console.error('❌ Barometer container saknas');
            return null;
        }
        
        // Rensa befintligt innehåll
        container.innerHTML = '';
        container.className = 'barometer-widget detail-item';
        
        // Skapa struktur
        const iconContainer = document.createElement('div');
        iconContainer.className = 'barometer-icon-container';
        iconContainer.id = 'barometer-icon';
        
        const infoContainer = document.createElement('div');
        infoContainer.className = 'barometer-info';
        
        const pressureLine = document.createElement('div');
        pressureLine.className = 'barometer-pressure-line';
        pressureLine.id = 'barometer-pressure-line';
        
        const trendLine = document.createElement('div');
        trendLine.className = 'barometer-trend-line';
        trendLine.id = 'barometer-trend-line';
        
        // Sätt ihop strukturen
        infoContainer.appendChild(pressureLine);
        infoContainer.appendChild(trendLine);
        container.appendChild(iconContainer);
        container.appendChild(infoContainer);
        
        // Uppdatera med data
        this.updateBarometerDetail(pressureTrend, currentPressure);
        
        return container;
    }
}

// === PRESSURE TREND ANALYSIS ===

/**
 * Analysera trycktrend från historisk data
 * @param {Array} pressureHistory - Array med tryckdata över tid
 * @returns {object} Trycktrend-analys
 */
export function analyzePressureTrend(pressureHistory) {
    if (!pressureHistory || pressureHistory.length < 2) {
        return {
            trend: 'n/a',
            description: 'Otillräcklig data för trendanalys',
            icon: 'wi-na',
            data_hours: 0,
            pressure_change: 0,
            analysis_quality: 'poor'
        };
    }
    
    // Sortera data kronologiskt
    const sorted = [...pressureHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Beräkna tidsspann
    const firstReading = new Date(sorted[0].timestamp);
    const lastReading = new Date(sorted[sorted.length - 1].timestamp);
    const dataHours = (lastReading - firstReading) / (1000 * 60 * 60);
    
    // Beräkna tryckförändring
    const firstPressure = sorted[0].pressure;
    const lastPressure = sorted[sorted.length - 1].pressure;
    const pressureChange = lastPressure - firstPressure;
    
    // Bestäm trend baserat på förändring och tidsperiod
    let trend = 'stable';
    let description = 'Stabilt lufttryck';
    let icon = 'wi-minus';
    
    const changeRate = pressureChange / Math.max(dataHours, 1); // hPa per timme
    
    if (Math.abs(changeRate) < 0.5) {
        trend = 'stable';
        description = 'Stabilt lufttryck';
        icon = 'wi-minus';
    } else if (changeRate > 0.5) {
        trend = 'rising';
        description = 'Stigande lufttryck';
        icon = 'wi-direction-up';
    } else {
        trend = 'falling';
        description = 'Fallande lufttryck';
        icon = 'wi-direction-down';
    }
    
    // Bedöm kvalitet på analysen
    let analysisQuality = 'poor';
    if (dataHours >= 12) {
        analysisQuality = 'excellent';
    } else if (dataHours >= 6) {
        analysisQuality = 'good';
    } else if (dataHours >= 3) {
        analysisQuality = 'fair';
    }
    
    return {
        trend,
        description,
        icon,
        data_hours: Math.round(dataHours * 10) / 10,
        pressure_change: Math.round(pressureChange * 10) / 10,
        analysis_quality: analysisQuality,
        change_rate: Math.round(changeRate * 100) / 100
    };
}

// === PRESSURE UTILITIES ===

/**
 * Konvertera tryck mellan olika enheter
 * @param {number} pressure - Tryck att konvertera
 * @param {string} fromUnit - Från-enhet ('hPa', 'mbar', 'inHg', 'mmHg')
 * @param {string} toUnit - Till-enhet
 * @returns {number} Konverterat tryck
 */
export function convertPressure(pressure, fromUnit = 'hPa', toUnit = 'hPa') {
    if (!pressure || isNaN(pressure)) return null;
    
    // Konvertera till hPa först
    let hPa = pressure;
    
    switch (fromUnit.toLowerCase()) {
        case 'mbar':
            hPa = pressure; // mbar = hPa
            break;
        case 'inhg':
            hPa = pressure * 33.8639;
            break;
        case 'mmhg':
            hPa = pressure * 1.33322;
            break;
    }
    
    // Konvertera från hPa till målenheten
    switch (toUnit.toLowerCase()) {
        case 'hpa':
        case 'mbar':
            return hPa;
        case 'inhg':
            return hPa / 33.8639;
        case 'mmhg':
            return hPa / 1.33322;
        default:
            return hPa;
    }
}

/**
 * Formatera tryck med enhet
 * @param {number} pressure - Tryck att formatera
 * @param {string} unit - Enhet ('hPa', 'mbar', 'inHg', 'mmHg')
 * @param {number} decimals - Antal decimaler
 * @returns {string} Formaterat tryck
 */
export function formatPressureWithUnit(pressure, unit = 'hPa', decimals = 0) {
    if (!pressure || isNaN(pressure)) return `-- ${unit}`;
    
    const converted = convertPressure(pressure, 'hPa', unit);
    if (converted === null) return `-- ${unit}`;
    
    const formatted = decimals > 0 ? converted.toFixed(decimals) : Math.round(converted);
    return `${formatted} ${unit}`;
}

/**
 * Hämta tryck-kategori baserat på värde
 * @param {number} pressure - Tryck i hPa
 * @returns {object} Tryck-kategori med beskrivning
 */
export function getPressureCategory(pressure) {
    if (!pressure || isNaN(pressure)) {
        return {
            category: 'unknown',
            description: 'Okänt tryck',
            color: '#666666'
        };
    }
    
    if (pressure < 980) {
        return {
            category: 'very_low',
            description: 'Mycket lågt tryck',
            color: '#d32f2f'
        };
    } else if (pressure < 1000) {
        return {
            category: 'low',
            description: 'Lågt tryck',
            color: '#f57c00'
        };
    } else if (pressure < 1020) {
        return {
            category: 'normal',
            description: 'Normalt tryck',
            color: '#388e3c'
        };
    } else if (pressure < 1040) {
        return {
            category: 'high',
            description: 'Högt tryck',
            color: '#1976d2'
        };
    } else {
        return {
            category: 'very_high',
            description: 'Mycket högt tryck',
            color: '#7b1fa2'
        };
    }
}

// === WEATHER PREDICTION ===

/**
 * Förutsäg väder baserat på tryck och trend
 * @param {number} pressure - Aktuellt tryck i hPa
 * @param {string} trend - Trycktrend ('rising', 'falling', 'stable')
 * @returns {object} Väder-förutsägelse
 */
export function predictWeatherFromPressure(pressure, trend) {
    if (!pressure || isNaN(pressure)) {
        return {
            prediction: 'unknown',
            description: 'Kan inte förutsäga väder',
            confidence: 0
        };
    }
    
    let prediction = 'stable';
    let description = 'Stabilt väder';
    let confidence = 50;
    
    // Basförutsägelse från tryck
    if (pressure > 1020) {
        prediction = 'fair';
        description = 'Fint väder';
        confidence = 70;
    } else if (pressure < 1000) {
        prediction = 'poor';
        description = 'Ostadigt väder';
        confidence = 70;
    }
    
    // Justera baserat på trend
    if (trend === 'rising') {
        if (pressure < 1000) {
            prediction = 'improving';
            description = 'Väder förbättras';
            confidence = 75;
        } else if (pressure > 1020) {
            prediction = 'very_fair';
            description = 'Mycket fint väder';
            confidence = 80;
        }
    } else if (trend === 'falling') {
        if (pressure > 1020) {
            prediction = 'deteriorating';
            description = 'Väder försämras';
            confidence = 75;
        } else if (pressure < 1000) {
            prediction = 'very_poor';
            description = 'Mycket dåligt väder';
            confidence = 80;
        }
    }
    
    return {
        prediction,
        description,
        confidence
    };
}

// === BAROMETER INITIALIZATION ===

/**
 * Initialisera barometer-system
 * @param {string} containerId - ID för barometer-container
 * @returns {boolean} True om initialisering lyckades
 */
export function initializeBarometerSystem(containerId = 'barometer-container') {
    console.log('📊 Initialiserar barometer-system...');
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Barometer container '${containerId}' hittades inte`);
        return false;
    }
    
    // Skapa grundläggande struktur om den inte finns
    if (!container.querySelector('.barometer-icon-container')) {
        const iconContainer = document.createElement('div');
        iconContainer.className = 'barometer-icon-container';
        iconContainer.id = 'barometer-icon';
        
        const infoContainer = document.createElement('div');
        infoContainer.className = 'barometer-info';
        
        const pressureLine = document.createElement('div');
        pressureLine.className = 'barometer-pressure-line';
        pressureLine.id = 'barometer-pressure-line';
        pressureLine.textContent = '-- hPa';
        
        const trendLine = document.createElement('div');
        trendLine.className = 'barometer-trend-line';
        trendLine.id = 'barometer-trend-line';
        trendLine.textContent = 'Trend: Samlar data...';
        
        infoContainer.appendChild(pressureLine);
        infoContainer.appendChild(trendLine);
        container.appendChild(iconContainer);
        container.appendChild(infoContainer);
        
        // Sätt fallback-ikon
        BarometerManager.setBarometerDetailFallback(iconContainer, trendLine);
    }
    
    console.log('✅ Barometer-system initialiserat');
    return true;
}

// === BAROMETER EVENTS ===

/**
 * Lägg till event-lyssnare för barometer-klick
 * @param {Function} callback - Callback-funktion vid klick
 */
export function addBarometerClickHandler(callback) {
    const barometerContainer = document.querySelector('.barometer-widget');
    if (barometerContainer) {
        barometerContainer.addEventListener('click', callback);
        barometerContainer.style.cursor = 'pointer';
        console.log('👆 Barometer klick-hanterare tillagd');
    }
}

/**
 * Visa detaljerad barometer-information
 * @param {object} pressureTrend - Komplett trycktrend-data
 * @param {number} currentPressure - Aktuellt tryck
 */
export function showBarometerDetails(pressureTrend, currentPressure) {
    const category = getPressureCategory(currentPressure);
    const prediction = predictWeatherFromPressure(currentPressure, pressureTrend.trend);
    
    console.log('📊 Barometer-detaljer:');
    console.log(`   Tryck: ${currentPressure} hPa (${category.description})`);
    console.log(`   Trend: ${pressureTrend.description}`);
    console.log(`   Kvalitet: ${pressureTrend.analysis_quality}`);
    console.log(`   Förutsägelse: ${prediction.description} (${prediction.confidence}%)`);
    
    // Här kan man lägga till modal eller tooltip för att visa detaljerna
}

console.log('📦 Barometer Manager Module laddat');