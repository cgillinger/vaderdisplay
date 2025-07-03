/**
 * Formatters Module - All Formatting Functions
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/formatters.js
 */

// === TEMPERATURE FORMATTING ===

/**
 * Formatera temperatur med en decimal och gradsymbol
 * @param {number} temperature - Temperatur att formatera
 * @returns {string} Formaterad temperatur
 */
export function formatTemperature(temperature) {
    if (temperature === null || temperature === undefined || isNaN(temperature)) {
        return '--.-°';
    }
    return `${temperature.toFixed(1)}°`;
}

/**
 * Formatera temperatur för dagsprognos (heltal)
 * @param {number} temperature - Temperatur att formatera
 * @returns {string} Formaterad temperatur
 */
export function formatTemperatureDaily(temperature) {
    if (temperature === null || temperature === undefined || isNaN(temperature)) {
        return '--°';
    }
    const roundedTemp = Math.round(temperature);
    if (roundedTemp >= 25 || roundedTemp <= -10) {
        return `${roundedTemp}°`;
    } else {
        return `${Math.abs(roundedTemp)}°`;
    }
}

/**
 * Formatera temperatur som heltal
 * @param {number} temperature - Temperatur att formatera
 * @returns {string} Formaterad temperatur
 */
export function formatTemperatureInteger(temperature) {
    if (temperature === null || temperature === undefined || isNaN(temperature)) {
        return '--°';
    }
    return `${Math.round(temperature)}°`;
}

/**
 * Hämta temperatur-färgklass baserat på temperatur
 * @param {number} temperature - Temperatur
 * @returns {string} CSS-klass för temperatur-färg
 */
export function getTemperatureColorClass(temperature) {
    if (temperature === null || temperature === undefined || isNaN(temperature)) {
        return '';
    }
    const roundedTemp = Math.round(temperature);
    if (roundedTemp > 25) {
        return 'temp-hot';
    }
    return '';
}

// === WIND FORMATTING ===

/**
 * Dela upp vindtext i två rader för konsistent layout
 * @param {string} windText - Vindtext att dela upp
 * @returns {object} { line1: string, line2: string }
 */
export function formatWindTextForTwoLines(windText) {
    if (!windText || windText === '0') {
        return { line1: 'Lugnt', line2: '' };
    }
    
    // Dela upp sammansatta vindtermer
    const windParts = windText.trim().split(' ');
    
    if (windParts.length === 1) {
        // Enkla termer: "Storm", "Orkan", "Lugnt"
        return { line1: windParts[0], line2: '' };
    } else if (windParts.length === 2) {
        // Sammansatta termer: "Måttlig vind", "Svag vind", "Frisk vind"
        return { line1: windParts[0], line2: windParts[1] };
    } else {
        // Fallback för ovanliga fall
        return { line1: windParts[0], line2: windParts.slice(1).join(' ') };
    }
}

/**
 * Hämta vindriktning som text från grader
 * @param {number} degrees - Grader (0-360)
 * @returns {string} Vindriktning som text
 */
export function getWindDirection(degrees) {
    if (degrees === null || degrees === undefined || isNaN(degrees)) {
        return "N/A";
    }
    
    const directions = [
        "N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO",
        "S", "SSV", "SV", "VSV", "V", "VNV", "NV", "NNV"
    ];
    
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// === WEATHER DESCRIPTION ===

/**
 * Hämta väder-beskrivning från SMHI symbol
 * @param {number|string} symbol - SMHI väder-symbol
 * @returns {string} Väder-beskrivning på svenska
 */
export function getWeatherDescription(symbol) {
    const numSymbol = parseInt(symbol);
    if (isNaN(numSymbol)) return "Okänt";
    
    const descriptions = {
        1: "Klart", 2: "Nästan klart", 3: "Växlande", 4: "Halvklart",
        5: "Molnigt", 6: "Mulet", 7: "Dimma", 8: "Regnskurar",
        9: "Regnskurar", 10: "Regnskurar", 11: "Åska", 12: "Snöblandat",
        13: "Snöblandat", 14: "Snöblandat", 15: "Snöbyar", 16: "Snöbyar",
        17: "Snöbyar", 18: "Regn", 19: "Regn", 20: "Regn", 21: "Åska",
        22: "Snöblandat", 23: "Snöblandat", 24: "Snöblandat", 25: "Snöfall",
        26: "Snöfall", 27: "Snöfall"
    };
    
    return descriptions[numSymbol] || "Okänt";
}

// === TIME FORMATTING ===

/**
 * Kontrollera om det är dagtid
 * @returns {boolean} True om det är dagtid (06:00-20:00)
 */
export function isDaytime() {
    const hour = new Date().getHours();
    return hour >= 6 && hour <= 20;
}

/**
 * Formatera tid för sol-tider (endast HH:MM)
 * @param {string|Date} timeString - Tid att formatera
 * @returns {string} Formaterad tid
 */
export function formatSunTime(timeString) {
    try {
        const date = new Date(timeString);
        return date.toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('❌ Fel vid formatering av sol-tid:', error);
        return '--:--';
    }
}

/**
 * Formatera veckodag från engelsk till svenska
 * @param {string} englishWeekday - Engelsk veckodag
 * @returns {string} Svensk veckodag
 */
export function formatWeekday(englishWeekday) {
    const weekdays = {
        'Monday': 'Måndag', 
        'Tuesday': 'Tisdag', 
        'Wednesday': 'Onsdag',
        'Thursday': 'Torsdag', 
        'Friday': 'Fredag', 
        'Saturday': 'Lördag', 
        'Sunday': 'Söndag'
    };
    return weekdays[englishWeekday] || englishWeekday;
}

/**
 * Formatera datum för dagsprognos
 * @param {string} dateString - Datum att formatera
 * @returns {string} Formaterat datum
 */
export function formatDateForDaily(dateString) {
    try {
        const dateObj = new Date(dateString);
        const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 
                       'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
        return `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
    } catch (error) {
        console.error('❌ Fel vid formatering av datum:', error);
        return dateString; // Returnera original om parsning misslyckas
    }
}

// === PRECIPITATION FORMATTING ===

/**
 * Formatera nederbörd
 * @param {number} precipitation - Nederbörd i mm
 * @returns {string} Formaterad nederbörd
 */
export function formatPrecipitation(precipitation) {
    if (!precipitation || precipitation <= 0) {
        return '';
    }
    return `${precipitation.toFixed(1)} mm`;
}

// === PRESSURE FORMATTING ===

/**
 * Formatera lufttryck
 * @param {number} pressure - Lufttryck i hPa
 * @returns {string} Formaterat lufttryck
 */
export function formatPressure(pressure) {
    if (pressure === null || pressure === undefined || isNaN(pressure)) {
        return '-- hPa';
    }
    return `${Math.round(pressure)} hPa`;
}

// === HUMIDITY FORMATTING ===

/**
 * Formatera luftfuktighet
 * @param {number} humidity - Luftfuktighet i %
 * @returns {string} Formaterad luftfuktighet
 */
export function formatHumidity(humidity) {
    if (humidity === null || humidity === undefined || isNaN(humidity)) {
        return '-- %';
    }
    return `${Math.round(humidity)}% Luftfuktighet`;
}

// === CO2 FORMATTING ===

/**
 * Formatera CO2-nivå
 * @param {number} co2 - CO2-nivå i ppm
 * @returns {string} Formaterad CO2-nivå
 */
export function formatCO2(co2) {
    if (co2 === null || co2 === undefined || isNaN(co2)) {
        return '-- ppm';
    }
    return `${co2} ppm Luftkvalitet`;
}

// === NOISE FORMATTING ===

/**
 * Formatera ljudnivå
 * @param {number} noise - Ljudnivå i dB
 * @returns {string} Formaterad ljudnivå
 */
export function formatNoise(noise) {
    if (noise === null || noise === undefined || isNaN(noise)) {
        return '-- dB';
    }
    return `${noise} dB Ljud`;
}

// === GENERAL FORMATTING UTILITIES ===

/**
 * Säker formatering av värde - returnerar fallback om värdet är ogiltigt
 * @param {any} value - Värde att formatera
 * @param {Function} formatter - Formaterings-funktion
 * @param {string} fallback - Fallback-värde
 * @returns {string} Formaterat värde eller fallback
 */
export function safeFormat(value, formatter, fallback = '--') {
    try {
        if (value === null || value === undefined) {
            return fallback;
        }
        return formatter(value);
    } catch (error) {
        console.error('❌ Fel vid formatering:', error);
        return fallback;
    }
}

/**
 * Validera numeriskt värde
 * @param {any} value - Värde att validera
 * @returns {boolean} True om värdet är ett giltigt nummer
 */
export function isValidNumber(value) {
    return value !== null && value !== undefined && !isNaN(value);
}

/**
 * Formatera med enhet
 * @param {number} value - Värde
 * @param {string} unit - Enhet
 * @param {number} decimals - Antal decimaler
 * @returns {string} Formaterat värde med enhet
 */
export function formatWithUnit(value, unit, decimals = 1) {
    if (!isValidNumber(value)) {
        return `-- ${unit}`;
    }
    
    const formatted = decimals === 0 ? Math.round(value) : value.toFixed(decimals);
    return `${formatted} ${unit}`;
}

// === QUALITY LEVEL FORMATTING ===

/**
 * Hämta kvalitetsnivå för CO2
 * @param {number} co2 - CO2-nivå i ppm
 * @returns {string} Kvalitetsnivå: 'good', 'moderate', 'poor'
 */
export function getCO2QualityLevel(co2) {
    if (!isValidNumber(co2)) return 'unknown';
    
    if (co2 > 1500) return 'poor';
    if (co2 > 800) return 'moderate';
    return 'good';
}

/**
 * Hämta kvalitetsnivå för ljudnivå
 * @param {number} noise - Ljudnivå i dB
 * @returns {string} Kvalitetsnivå: 'quiet', 'normal', 'loud'
 */
export function getNoiseQualityLevel(noise) {
    if (!isValidNumber(noise)) return 'unknown';
    
    if (noise > 60) return 'loud';
    if (noise > 40) return 'normal';
    return 'quiet';
}

console.log('📦 Formatters Module laddat');