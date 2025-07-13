/**
 * Dashboard Formatters - STEG 1 REFAKTORERING
 * Grundläggande formatering och beskrivningsfunktioner
 * Extraherat från dashboard.js för modulär struktur
 */

// === TEMPERATURSYMBOL FORMATTING (ENDAST GRADSYMBOL) ===

function formatTemperature(temperature) {
    if (temperature === null || temperature === undefined || isNaN(temperature)) {
        return '--.-°';
    }
    return `${temperature.toFixed(1)}°`;
}

function formatTemperatureDaily(temperature) {
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

function formatTemperatureInteger(temperature) {
    if (temperature === null || temperature === undefined || isNaN(temperature)) {
        return '--°';
    }
    return `${Math.round(temperature)}°`;
}

function getTemperatureColorClass(temperature) {
    if (temperature === null || temperature === undefined || isNaN(temperature)) {
        return '';
    }
    const roundedTemp = Math.round(temperature);
    if (roundedTemp > 25) {
        return 'temp-hot';
    }
    return '';
}

// === VÄDER- OCH VINDBESKRIVNINGAR ===

function getWeatherDescription(symbol) {
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

function getWindDirection(degrees) {
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

console.log('✅ STEG 1: Dashboard Formatters laddat - 6 funktioner extraherade!');