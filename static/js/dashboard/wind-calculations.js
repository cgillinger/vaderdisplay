/**
 * Wind Calculations - STEG 2 REFAKTORERING
 * Vindsystem och skalkonvertering extraherat från dashboard.js
 * Hanterar Beaufort, sjö- och landvindskalor samt layout-formatering
 */

// === WIND SCALE CONVERSION SYSTEM ===

const WIND_SCALES = {
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

/**
 * Konvertera vindhastighet mellan olika enheter och skalor
 * @param {number} speedKmh - Vindhastighet i km/h
 * @param {string} targetUnit - Målsenhet: 'beaufort', 'ms', 'kmh', 'sjo', 'land'
 * @returns {object} { value, unit, icon, name? }
 */
function convertWindSpeed(speedKmh, targetUnit) {
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
 * SMART VINDTEXT-FORMATERING FÖR KONSISTENT LAYOUT
 * Dela upp vindtext i två rader för konsistent layout i prognoser
 * @param {string} windText - Vindtext att dela upp
 * @returns {object} { line1: string, line2: string }
 */
function formatWindTextForTwoLines(windText) {
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

console.log('✅ STEG 2: Wind Calculations laddat - 3 funktioner extraherade!');