/**
 * Weather Icon Renderer - STEG 4 REFAKTORERING (Uppdaterad STEG 5)
 * Komplett ikonhanteringssystem extraherat från dashboard.js
 * Hanterar enbart Weather Icons för vädervisning
 * 
 * STEG 5: FontAwesome-funktionalitet flyttad till fontawesome-renderer.js
 * AMCHARTS: SVG-stöd tillagt för huvudväderikoner med minimal kodförändring
 */

// === WEATHER ICONS SYSTEM - FONT AWESOME OPTIMERAD ===

/**
 * WEATHER ICONS SYSTEM - Font Awesome optimerad hantering + amCharts SVG
 */
class WeatherIconRenderer {
    // AMCHARTS: Global config för ikon-typ
    static iconConfig = {
        type: 'font',  // 'font' eller 'amcharts'
        baseUrl: '/static/assets/icons/amcharts-svg/'
    };
    
    // AMCHARTS: SVG-mappning baserad på verkliga filer
    static amChartsMap = {
        1: {day: "day/day.svg", night: "night/night.svg"},                          // Klart (DIN HALVMÅNE!)
        2: {day: "day/day.svg", night: "night/night.svg"},                          // Nästan klart
        3: {day: "day/cloudy-day-1.svg", night: "night/cloudy-night-1.svg"},       // Växlande
        4: {day: "day/cloudy-day-2.svg", night: "night/cloudy-night-2.svg"},       // Halvklart
        5: {day: "day/cloudy-day-2.svg", night: "night/cloudy-night-2.svg"},       // Molnigt
        6: {day: "day/cloudy-day-3.svg", night: "night/cloudy-night-3.svg"},       // Mulet
        7: {day: "day/cloudy-day-3.svg", night: "night/cloudy-night-3.svg"},       // Dimma → moln
        8: {day: "day/rainy-1.svg", night: "day/rainy-1.svg"},                     // Lätta regnskurar
        9: {day: "day/rainy-3.svg", night: "day/rainy-3.svg"},                     // Måttl. regnskurar
        10: {day: "day/rainy-5.svg", night: "day/rainy-5.svg"},                    // Kraftiga regnskurar
        11: {day: "animated/thunder.svg", night: "animated/thunder.svg"},          // Åskväder (ANIMERAD!)
        12: {day: "day/snowy-1.svg", night: "day/snowy-1.svg"},                    // Lätt snöblandat
        13: {day: "day/snowy-3.svg", night: "day/snowy-3.svg"},                    // Måttl. snöblandat
        14: {day: "day/snowy-5.svg", night: "day/snowy-5.svg"},                    // Kraftigt snöblandat
        15: {day: "day/snowy-1.svg", night: "day/snowy-1.svg"},                    // Lätta snöbyar
        16: {day: "day/snowy-3.svg", night: "day/snowy-3.svg"},                    // Måttl. snöbyar
        17: {day: "day/snowy-5.svg", night: "day/snowy-5.svg"},                    // Kraftiga snöbyar
        18: {day: "day/rainy-2.svg", night: "day/rainy-2.svg"},                    // Lätt regn
        19: {day: "day/rainy-4.svg", night: "day/rainy-4.svg"},                    // Måttligt regn
        20: {day: "day/rainy-6.svg", night: "day/rainy-6.svg"},                    // Kraftigt regn
        21: {day: "animated/thunder.svg", night: "animated/thunder.svg"},          // Åska (ANIMERAD!)
        22: {day: "day/snowy-2.svg", night: "day/snowy-2.svg"},                    // Lätt snöblandat regn
        23: {day: "day/snowy-4.svg", night: "day/snowy-4.svg"},                    // Måttl. snöblandat regn
        24: {day: "day/snowy-6.svg", night: "day/snowy-6.svg"},                    // Kraftigt snöblandat regn
        25: {day: "day/snowy-2.svg", night: "day/snowy-2.svg"},                    // Lätt snöfall
        26: {day: "day/snowy-4.svg", night: "day/snowy-4.svg"},                    // Måttligt snöfall
        27: {day: "day/snowy-6.svg", night: "day/snowy-6.svg"}                     // Kraftigt snöfall
    };

    /**
     * AMCHARTS: Uppdatera konfiguration från API-data
     * @param {object} config - Config från /api/current
     */
    static updateConfig(config) {
        if (config && config.weather_icon_type) {
            this.iconConfig.type = config.weather_icon_type;
            console.log(`🎨 WeatherIconRenderer: Ikon-typ satt till '${config.weather_icon_type}'`);
        }
    }

    /**
     * AMCHARTS: Skapa SVG-element för amCharts ikoner
     * @param {string} svgPath - Sökväg till SVG-fil
     * @param {array} extraClasses - CSS-klasser
     * @returns {HTMLElement} IMG-element för SVG
     */
    static createSVGIcon(svgPath, extraClasses = []) {
        const img = document.createElement('img');
        img.src = this.iconConfig.baseUrl + svgPath;
        img.className = `amcharts-weather-icon ${extraClasses.join(' ')}`;
        img.alt = 'Väderikon';
        
        // FÖRSTORING: Matcha font-ikonernas faktiska storlek
        img.style.display = 'inline-block';
        img.style.verticalAlign = 'middle';
        
        // Anpassa storlek baserat på ikon-typ
        if (extraClasses.includes('weather-main-icon')) {
            // Huvudikon - stor som motsvarar font-ikonens CSS
            img.style.width = 'clamp(48px, 5.5vw, 72px)';
            img.style.height = 'clamp(48px, 5.5vw, 72px)';
        } else if (extraClasses.includes('forecast-weather-icon')) {
            // Prognos-ikoner - medium storlek
            img.style.width = 'clamp(36px, 4.5vw, 48px)';
            img.style.height = 'clamp(36px, 4.5vw, 48px)';
        } else if (extraClasses.includes('daily-weather-icon')) {
            // Dagliga prognoser - mindre storlek
            img.style.width = 'clamp(18px, 2.3rem, 30px)';
            img.style.height = 'clamp(18px, 2.3rem, 30px)';
        } else {
            // Standardstorlek för övriga ikoner
            img.style.width = '1.2em';
            img.style.height = '1.2em';
        }
        
        // Felhantering för SVG-laddning
        img.onerror = function() {
            console.warn(`🔧 amCharts SVG misslyckades att ladda: ${svgPath}. Fallback till font-ikon.`);
            // Ersätt med font-ikon vid fel
            const fontIcon = WeatherIconRenderer.createFontIcon('wi-na', extraClasses);
            this.parentNode.replaceChild(fontIcon, this);
        };
        
        return img;
    }

    /**
     * AMCHARTS: Skapa font-ikon (befintlig logik)
     * @param {string} iconName - Weather Icons klass-namn
     * @param {array} extraClasses - CSS-klasser
     * @returns {HTMLElement} Font-ikon element
     */
    static createFontIcon(iconName, extraClasses = []) {
        const icon = document.createElement('i');
        const validIconClass = iconName.startsWith('wi-') ? iconName : `wi-${iconName}`;
        
        icon.className = `wi ${validIconClass} ${extraClasses.join(' ')}`;
        icon.style.fontFamily = '"weathericons", "Weather Icons", sans-serif';
        icon.style.fontStyle = 'normal';
        icon.style.fontWeight = 'normal';
        icon.style.display = 'inline-block';
        
        return icon;
    }

    /**
     * KOMPATIBILITET: Huvudfunktion - 100% kompatibel med befintlig kod + SVG-stöd
     * @param {string} iconName - Weather Icons klass-namn (wi-day-sunny, wi-night-clear, etc.)
     * @param {array} extraClasses - CSS-klasser
     * @param {number} smhiSymbol - SMHI-symbol för amCharts (optional - för framtida användning)
     * @param {boolean} isDay - Dag/natt för amCharts (optional - för framtida användning)
     * @returns {HTMLElement} Ikon-element (IMG för SVG eller I för font)
     */
    static createIcon(iconName, extraClasses = [], smhiSymbol = null, isDay = null) {
        // AMCHARTS: Smart SVG-detektering för huvudikoner
        if (this.iconConfig.type === 'amcharts' && extraClasses.includes('weather-main-icon')) {
            // Auto-detektera SMHI-symbol från iconName för befintlig kod
            const autoSymbol = this.extractSMHISymbolFromIconName(iconName);
            const autoIsDay = isDay !== null ? isDay : this.detectDayFromIconName(iconName);
            
            if (autoSymbol && this.amChartsMap[autoSymbol]) {
                const mapping = this.amChartsMap[autoSymbol];
                const svgPath = mapping[autoIsDay ? 'day' : 'night'];
                console.log(`🎨 amCharts Auto-SVG: ${iconName} → SMHI ${autoSymbol} → ${svgPath} (${autoIsDay ? 'dag' : 'natt'})`);
                return this.createSVGIcon(svgPath, extraClasses);
            }
        }
        
        // AMCHARTS: Manual SVG-läge med explicita parametrar
        if (this.iconConfig.type === 'amcharts' && smhiSymbol) {
            const mapping = this.amChartsMap[smhiSymbol];
            if (mapping) {
                const dayNight = isDay !== null ? isDay : true;
                const svgPath = mapping[dayNight ? 'day' : 'night'];
                console.log(`🎨 amCharts Manual SVG: SMHI ${smhiSymbol} → ${svgPath} (${dayNight ? 'dag' : 'natt'})`);
                return this.createSVGIcon(svgPath, extraClasses);
            }
        }
        
        // FONT: Standard font-rendering (default och fallback)
        return this.createFontIcon(iconName, extraClasses);
    }

    /**
     * KOMPATIBILITET: Extrahera SMHI-symbol från Weather Icons klassnamn
     * @param {string} iconName - t.ex. "wi-night-clear", "wi-day-sunny"
     * @returns {number|null} SMHI-symbol eller null
     */
    static extractSMHISymbolFromIconName(iconName) {
        // Reverse-lookup från iconName till SMHI-symbol
        const reverseMap = {
            'wi-day-sunny': 1, 'wi-night-clear': 1,
            'wi-day-sunny-overcast': 2, 'wi-night-partly-cloudy': 2,
            'wi-day-cloudy': 3, 'wi-night-alt-cloudy': 3,
            'wi-day-cloudy-high': 4, 'wi-night-cloudy-high': 4,
            'wi-cloudy': 5,
            'wi-cloud': 6,
            'wi-fog': 7,
            'wi-day-showers': 8, 'wi-night-showers': 8,
            'wi-day-rain': 9, 'wi-night-rain': 9,
            'wi-rain': 10,
            'wi-day-thunderstorm': 11, 'wi-night-thunderstorm': 11,
            'wi-day-rain-mix': 12, 'wi-night-rain-mix': 12,
            'wi-rain-mix': 13,
            'wi-day-snow': 15, 'wi-night-snow': 15,
            'wi-snow': 16,
            'wi-thunderstorm': 21,
            'wi-day-sleet': 22, 'wi-night-sleet': 22,
            'wi-sleet': 23
        };
        
        return reverseMap[iconName] || null;
    }

    /**
     * KOMPATIBILITET: Detektera dag/natt från iconName
     * @param {string} iconName - t.ex. "wi-night-clear", "wi-day-sunny"
     * @returns {boolean} true för dag, false för natt
     */
    static detectDayFromIconName(iconName) {
        return !iconName.includes('night');
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

console.log('✅ STEG 5: Weather Icon Renderer uppdaterat - FontAwesome-del extraherad + amCharts SVG-stöd!');