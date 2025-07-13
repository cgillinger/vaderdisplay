/**
 * Weather Icon Renderer - STEG 4 REFAKTORERING (Uppdaterad STEG 5)
 * Komplett ikonhanteringssystem extraherat från dashboard.js
 * Hanterar enbart Weather Icons för vädervisning
 * 
 * STEG 5: FontAwesome-funktionalitet flyttad till fontawesome-renderer.js
 */

// === WEATHER ICONS SYSTEM - FONT AWESOME OPTIMERAD ===

/**
 * WEATHER ICONS SYSTEM - Font Awesome optimerad hantering
 */
class WeatherIconRenderer {
    static createIcon(iconName, extraClasses = []) {
        const icon = document.createElement('i');
        const validIconClass = iconName.startsWith('wi-') ? iconName : `wi-${iconName}`;
        
        icon.className = `wi ${validIconClass} ${extraClasses.join(' ')}`;
        icon.style.fontFamily = '"weathericons", "Weather Icons", sans-serif';
        icon.style.fontStyle = 'normal';
        icon.style.fontWeight = 'normal';
        icon.style.display = 'inline-block';
        
        return icon;
    }
    
    static getIconName(symbol, isDay = true) {
        const numSymbol = parseInt(symbol);
        if (isNaN(numSymbol)) return "wi-na";
        
        const iconMap = {
            1: {day: "wi-day-sunny", night: "wi-night-clear"},
            2: {day: "wi-day-sunny-overcast", night: "wi-night-partly-cloudy"},
            3: {day: "wi-day-cloudy", night: "wi-night-alt-cloudy"},
            4: {day: "wi-day-cloudy-high", night: "wi-night-cloudy-high"},
            5: {day: "wi-cloudy", night: "wi-cloudy"},
            6: {day: "wi-cloud", night: "wi-cloud"},
            7: {day: "wi-fog", night: "wi-fog"},
            8: {day: "wi-day-showers", night: "wi-night-showers"},
            9: {day: "wi-day-rain", night: "wi-night-rain"},
            10: {day: "wi-rain", night: "wi-rain"},
            11: {day: "wi-day-thunderstorm", night: "wi-night-thunderstorm"},
            12: {day: "wi-day-rain-mix", night: "wi-night-rain-mix"},
            13: {day: "wi-rain-mix", night: "wi-rain-mix"},
            14: {day: "wi-rain-mix", night: "wi-rain-mix"},
            15: {day: "wi-day-snow", night: "wi-night-snow"},
            16: {day: "wi-snow", night: "wi-snow"},
            17: {day: "wi-snow", night: "wi-snow"},
            18: {day: "wi-day-rain", night: "wi-night-rain"},
            19: {day: "wi-rain", night: "wi-rain"},
            20: {day: "wi-rain", night: "wi-rain"},
            21: {day: "wi-thunderstorm", night: "wi-thunderstorm"},
            22: {day: "wi-day-sleet", night: "wi-night-sleet"},
            23: {day: "wi-sleet", night: "wi-sleet"},
            24: {day: "wi-sleet", night: "wi-sleet"},
            25: {day: "wi-day-snow", night: "wi-night-snow"},
            26: {day: "wi-snow", night: "wi-snow"},
            27: {day: "wi-snow", night: "wi-snow"}
        };
        
        const mapping = iconMap[numSymbol];
        if (!mapping) return "wi-na";
        
        return mapping[isDay ? 'day' : 'night'];
    }
    
    static getColorClass(symbol) {
        const numSymbol = parseInt(symbol);
        if (isNaN(numSymbol)) return '';
        
        // Color mapping för 5-dagars ikoner
        if (numSymbol === 1) return 'daily-sun-color';
        if ([2, 3, 4].includes(numSymbol)) return 'daily-partly-cloudy-color';
        if ([5, 6, 7].includes(numSymbol)) return 'daily-cloud-color';
        if ([8, 9, 10, 12, 13, 14, 18, 19, 20, 22, 23, 24].includes(numSymbol)) return 'daily-rain-color';
        if ([15, 16, 17, 25, 26, 27].includes(numSymbol)) return 'daily-snow-color';
        if ([11, 21].includes(numSymbol)) return 'daily-thunderstorm-color';
        
        return 'daily-default-color';
    }
}

// Exportera för backward compatibility (behåll gamla namn)
const WeatherIconManager = WeatherIconRenderer;

console.log('✅ STEG 5: Weather Icon Renderer uppdaterat - FontAwesome-del extraherad!');