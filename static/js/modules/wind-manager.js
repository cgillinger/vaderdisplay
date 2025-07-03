/**
 * Wind Manager Module - Wind Scale Conversion & Display
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/wind-manager.js
 */

import { WeatherIconManager, WindDirectionManager } from './icon-manager.js';
import { formatWindTextForTwoLines, getWindDirection } from './formatters.js';
import { dashboardState } from './state-manager.js';

// === WIND SCALE DEFINITIONS ===

export const WIND_SCALES = {
    beaufort: [
        { max: 1, value: 0, name: 'Lugn', icon: 'wi-wind-beaufort-0' },
        { max: 5, value: 1, name: 'Svag vind', icon: 'wi-wind-beaufort-1' },
        { max: 11, value: 2, name: 'Svag vind', icon: 'wi-wind-beaufort-2' },
        { max: 19, value: 3, name: 'Måttlig vind', icon: 'wi-wind-beaufort-3' },
        { max: 28, value: 4, name: 'Måttlig vind', icon: 'wi-wind-beaufort-4' },
        { max: 38, value: 5, name: 'Frisk vind', icon: 'wi-wind-beaufort-5' },
        { max: 49, value: 6, name: 'Frisk vind', icon: 'wi-wind-beaufort-6' },
        { max: 61, value: 7, name: 'Hård vind', icon: 'wi-wind-beaufort-7' },
        { max: 74, value: 8, name: 'Hård vind', icon: 'wi-wind-beaufort-8' },
        { max: 88, value: 9, name: 'Hård vind', icon: 'wi-wind-beaufort-9' },
        { max: 102, value: 10, name: 'Storm', icon: 'wi-wind-beaufort-10' },
        { max: 117, value: 11, name: 'Storm', icon: 'wi-wind-beaufort-11' },
        { max: Infinity, value: 12, name: 'Orkan', icon: 'wi-wind-beaufort-12' }
    ],
    sjo: [
        { max: 1, value: 'Stiltje', icon: 'wi-strong-wind' },
        { max: 5, value: 'Bris', icon: 'wi-strong-wind' },
        { max: 11, value: 'Bris', icon: 'wi-strong-wind' },
        { max: 19, value: 'Bris', icon: 'wi-strong-wind' },
        { max: 28, value: 'Bris', icon: 'wi-strong-wind' },
        { max: 38, value: 'Bris', icon: 'wi-strong-wind' },
        { max: 49, value: 'Bris', icon: 'wi-strong-wind' },
        { max: 61, value: 'Kuling', icon: 'wi-strong-wind' },
        { max: 74, value: 'Kuling', icon: 'wi-strong-wind' },
        { max: 88, value: 'Kuling', icon: 'wi-strong-wind' },
        { max: 102, value: 'Storm', icon: 'wi-strong-wind' },
        { max: 117, value: 'Storm', icon: 'wi-strong-wind' },
        { max: Infinity, value: 'Orkan', icon: 'wi-strong-wind' }
    ],
    land: [
        { max: 1, value: 'Lugnt', icon: 'wi-strong-wind' },
        { max: 5, value: 'Svag vind', icon: 'wi-strong-wind' },
        { max: 11, value: 'Svag vind', icon: 'wi-strong-wind' },
        { max: 19, value: 'Måttlig vind', icon: 'wi-strong-wind' },
        { max: 28, value: 'Måttlig vind', icon: 'wi-strong-wind' },
        { max: 38, value: 'Frisk vind', icon: 'wi-strong-wind' },
        { max: 49, value: 'Frisk vind', icon: 'wi-strong-wind' },
        { max: 61, value: 'Hård vind', icon: 'wi-strong-wind' },
        { max: 74, value: 'Hård vind', icon: 'wi-strong-wind' },
        { max: 88, value: 'Hård vind', icon: 'wi-strong-wind' },
        { max: 102, value: 'Storm', icon: 'wi-strong-wind' },
        { max: 117, value: 'Storm', icon: 'wi-strong-wind' },
        { max: Infinity, value: 'Orkan', icon: 'wi-strong-wind' }
    ]
};

// === WIND CONVERSION FUNCTIONS ===

/**
 * Konvertera vindhastighet till olika enheter och skalor
 * @param {number} speedKmh - Vindhastighet i km/h
 * @param {string} targetUnit - Målenhet ('beaufort', 'ms', 'kmh', 'sjo', 'land')
 * @returns {object} Konverterad vinddata
 */
export function convertWindSpeed(speedKmh, targetUnit) {
    if (!speedKmh || speedKmh === 0) {
        const defaultIcon = targetUnit === 'beaufort' ? 'wi-wind-beaufort-0' : 'wi-strong-wind';
        return { value: '0', unit: targetUnit, icon: defaultIcon };
    }
    
    const scale = WIND_SCALES[targetUnit] || WIND_SCALES.land;
    const data = scale.find(scale => speedKmh <= scale.max);
    
    switch (targetUnit) {
        case 'beaufort':
            return { 
                value: data.value.toString(), 
                unit: 'Beaufort', 
                icon: data.icon,
                name: data.name
            };
        case 'ms':
            const ms = (speedKmh / 3.6).toFixed(1);
            return { value: `${ms} m/s`, unit: 'm/s', icon: 'wi-strong-wind' };
        case 'kmh':
            return { value: `${Math.round(speedKmh)} km/h`, unit: 'km/h', icon: 'wi-strong-wind' };
        default:
            return { value: data.value, unit: targetUnit, icon: 'wi-strong-wind' };
    }
}

/**
 * Konvertera mellan olika hastighetsenheter
 * @param {number} speed - Hastighet att konvertera
 * @param {string} fromUnit - Från-enhet ('kmh', 'ms', 'mph', 'knots')
 * @param {string} toUnit - Till-enhet
 * @returns {number} Konverterad hastighet
 */
export function convertSpeedUnits(speed, fromUnit, toUnit) {
    if (!speed || isNaN(speed)) return 0;
    
    // Konvertera till m/s först
    let ms = speed;
    switch (fromUnit.toLowerCase()) {
        case 'kmh':
            ms = speed / 3.6;
            break;
        case 'mph':
            ms = speed * 0.44704;
            break;
        case 'knots':
            ms = speed * 0.514444;
            break;
        case 'ms':
            ms = speed;
            break;
    }
    
    // Konvertera från m/s till målenhet
    switch (toUnit.toLowerCase()) {
        case 'kmh':
            return ms * 3.6;
        case 'mph':
            return ms / 0.44704;
        case 'knots':
            return ms / 0.514444;
        case 'ms':
            return ms;
        default:
            return ms;
    }
}

// === WIND DISPLAY FUNCTIONS ===

/**
 * Uppdatera vinddata under FAKTISK temperatur-sektion
 * @param {object} smhiData - SMHI väderdata
 */
export function updateWindUnderFaktisk(smhiData) {
    const netatmoSection = document.querySelector('.netatmo-temperature-section');
    if (!netatmoSection) return;
    
    // Ta bort befintliga vinddata
    removeWindUnderFaktisk();
    
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
        
        const windIcon = WeatherIconManager.createIcon(windData.icon, []);
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

/**
 * Ta bort vinddata under FAKTISK temperatur-sektion
 */
export function removeWindUnderFaktisk() {
    const existingWindElements = document.querySelectorAll('.wind-under-faktisk');
    existingWindElements.forEach(element => element.remove());
}

/**
 * Ta bort vind detail-items från weather-details-grid
 */
export function removeWindDetailItems() {
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

// === WIND FORECAST FUNCTIONS ===

/**
 * Skapa vindvisning för timprognos
 * @param {object} forecast - Prognos-data
 * @returns {string} HTML för vindvisning
 */
export function createForecastWindDisplay(forecast) {
    if (!forecast.wind_speed) return '';
    
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
    return `<div class="forecast-wind forecast-wind-consistent">
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

// === WIND ANALYSIS FUNCTIONS ===

/**
 * Analysera vindstyrka och ge beskrivning
 * @param {number} speedKmh - Vindhastighet i km/h
 * @returns {object} Vindanalys
 */
export function analyzeWindStrength(speedKmh) {
    if (!speedKmh || speedKmh === 0) {
        return {
            strength: 'calm',
            description: 'Lugnt',
            category: 'calm',
            color: '#4caf50'
        };
    }
    
    if (speedKmh < 12) {
        return {
            strength: 'light',
            description: 'Svag vind',
            category: 'light',
            color: '#8bc34a'
        };
    } else if (speedKmh < 30) {
        return {
            strength: 'moderate',
            description: 'Måttlig vind',
            category: 'moderate',
            color: '#ffc107'
        };
    } else if (speedKmh < 50) {
        return {
            strength: 'fresh',
            description: 'Frisk vind',
            category: 'fresh',
            color: '#ff9800'
        };
    } else if (speedKmh < 75) {
        return {
            strength: 'strong',
            description: 'Hård vind',
            category: 'strong',
            color: '#f44336'
        };
    } else if (speedKmh < 103) {
        return {
            strength: 'gale',
            description: 'Storm',
            category: 'gale',
            color: '#9c27b0'
        };
    } else {
        return {
            strength: 'hurricane',
            description: 'Orkan',
            category: 'hurricane',
            color: '#e91e63'
        };
    }
}

/**
 * Beräkna vindkyla (Wind Chill)
 * @param {number} temperature - Temperatur i °C
 * @param {number} windSpeedKmh - Vindhastighet i km/h
 * @returns {number} Vindkyla i °C
 */
export function calculateWindChill(temperature, windSpeedKmh) {
    if (!temperature || !windSpeedKmh || windSpeedKmh < 4.8) {
        return temperature; // Ingen vindkyla under 4.8 km/h
    }
    
    // Konvertera till Fahrenheit för beräkning
    const tempF = (temperature * 9/5) + 32;
    const windMph = windSpeedKmh * 0.621371;
    
    // Wind Chill formel (US National Weather Service)
    const windChillF = 35.74 + (0.6215 * tempF) - (35.75 * Math.pow(windMph, 0.16)) + (0.4275 * tempF * Math.pow(windMph, 0.16));
    
    // Konvertera tillbaka till Celsius
    return (windChillF - 32) * 5/9;
}

// === WIND UTILITIES ===

/**
 * Formatera vinddata för display
 * @param {number} speed - Vindhastighet
 * @param {number} direction - Vindriktning i grader
 * @param {string} unit - Enhet för hastighet
 * @returns {object} Formaterad vinddata
 */
export function formatWindData(speed, direction, unit = 'kmh') {
    const result = {
        speed: null,
        direction: null,
        formatted: null,
        arrow: null
    };
    
    if (speed !== null && speed !== undefined) {
        const speedKmh = unit === 'ms' ? speed * 3.6 : speed;
        const windData = convertWindSpeed(speedKmh, dashboardState.windUnit);
        result.speed = windData.value;
        result.formatted = windData.value;
    }
    
    if (direction !== null && direction !== undefined) {
        result.direction = getWindDirection(direction);
        result.arrow = WindDirectionManager.createWindArrow(direction);
    }
    
    if (result.speed && result.direction) {
        result.formatted = `${result.speed} ${result.direction}`;
    }
    
    return result;
}

/**
 * Skapa vindros-data för visualisering
 * @param {Array} windData - Array med vinddata
 * @returns {object} Vindros-data
 */
export function createWindRoseData(windData) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const windRose = {};
    
    // Initialisera alla riktningar
    directions.forEach(dir => {
        windRose[dir] = {
            count: 0,
            avgSpeed: 0,
            maxSpeed: 0,
            totalSpeed: 0
        };
    });
    
    // Bearbeta vinddata
    windData.forEach(data => {
        if (data.direction !== null && data.speed !== null) {
            const dirIndex = Math.round(data.direction / 22.5) % 16;
            const dir = directions[dirIndex];
            
            windRose[dir].count++;
            windRose[dir].totalSpeed += data.speed;
            windRose[dir].maxSpeed = Math.max(windRose[dir].maxSpeed, data.speed);
        }
    });
    
    // Beräkna medelhastigheter
    Object.keys(windRose).forEach(dir => {
        if (windRose[dir].count > 0) {
            windRose[dir].avgSpeed = windRose[dir].totalSpeed / windRose[dir].count;
        }
    });
    
    return windRose;
}

/**
 * Kontrollera om vinddata är tillförlitlig
 * @param {number} speed - Vindhastighet
 * @param {number} direction - Vindriktning
 * @returns {boolean} True om data är tillförlitlig
 */
export function isWindDataReliable(speed, direction) {
    // Kontrollera om hastigheten är rimlig
    if (speed !== null && speed !== undefined) {
        if (speed < 0 || speed > 200) { // Orealistisk hastighet
            return false;
        }
    }
    
    // Kontrollera om riktningen är giltig
    if (direction !== null && direction !== undefined) {
        if (direction < 0 || direction >= 360) { // Ogiltig riktning
            return false;
        }
    }
    
    return true;
}

// === WIND WARNINGS ===

/**
 * Kontrollera vindvarningar
 * @param {number} speedKmh - Vindhastighet i km/h
 * @param {number} gustKmh - Vindbyar i km/h (optional)
 * @returns {object} Vindvarning
 */
export function checkWindWarnings(speedKmh, gustKmh = null) {
    const warnings = {
        level: 'none',
        message: '',
        color: '#4caf50'
    };
    
    const maxWind = Math.max(speedKmh, gustKmh || 0);
    
    if (maxWind >= 103) { // Orkanstyrka
        warnings.level = 'extreme';
        warnings.message = 'EXTREM VINDVARNING: Orkan';
        warnings.color = '#d32f2f';
    } else if (maxWind >= 75) { // Storm
        warnings.level = 'severe';
        warnings.message = 'VINDVARNING: Storm';
        warnings.color = '#f57c00';
    } else if (maxWind >= 50) { // Hård vind
        warnings.level = 'moderate';
        warnings.message = 'Vindvarning: Hård vind';
        warnings.color = '#ff9800';
    } else if (maxWind >= 30) { // Frisk vind
        warnings.level = 'light';
        warnings.message = 'Frisk vind';
        warnings.color = '#ffc107';
    }
    
    return warnings;
}

console.log('📦 Wind Manager Module laddat');