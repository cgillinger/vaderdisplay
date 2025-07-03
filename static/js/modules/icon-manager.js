/**
 * Icon Manager Module - Weather Icons & Font Awesome Management
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/icon-manager.js
 */

// === WEATHER ICONS SYSTEM ===

/**
 * Weather Icons Manager - Font Awesome optimerad hantering
 */
export class WeatherIconManager {
    /**
     * Skapa Weather Icons element
     * @param {string} iconName - Ikon-namn (med eller utan wi- prefix)
     * @param {Array} extraClasses - Extra CSS-klasser
     * @returns {HTMLElement} Ikon-element
     */
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
    
    /**
     * Hämta ikon-namn baserat på SMHI symbol och tid
     * @param {number|string} symbol - SMHI väder-symbol
     * @param {boolean} isDay - Om det är dagtid
     * @returns {string} Weather Icons klass-namn
     */
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
    
    /**
     * Hämta färgklass för 5-dagars ikoner
     * @param {number|string} symbol - SMHI väder-symbol
     * @returns {string} CSS-klass för färgkodning
     */
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
    
    /**
     * Skapa huvudväder-ikon för dashboard
     * @param {number|string} symbol - SMHI väder-symbol
     * @param {boolean} isDay - Om det är dagtid
     * @returns {HTMLElement} Väder-ikon element
     */
    static createMainWeatherIcon(symbol, isDay = true) {
        const iconName = this.getIconName(symbol, isDay);
        const icon = this.createIcon(iconName, ['weather-main-icon']);
        
        // Huvudikon styling
        icon.style.cssText = `
            font-size: clamp(42px, 4.2rem, 56px);
            color: var(--weather-icon-color, #4285f4);
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
            display: inline-block;
            line-height: 1;
        `;
        
        return icon;
    }
    
    /**
     * Skapa prognos-ikon för timprognos
     * @param {number|string} symbol - SMHI väder-symbol
     * @param {boolean} isDay - Om det är dagtid
     * @returns {HTMLElement} Prognos-ikon element
     */
    static createForecastIcon(symbol, isDay = true) {
        const iconName = this.getIconName(symbol, isDay);
        const icon = this.createIcon(iconName, ['forecast-weather-icon']);
        
        // Prognos-ikon styling
        icon.style.cssText = `
            font-size: clamp(24px, 2.4rem, 32px);
            color: var(--forecast-icon-color, #4285f4);
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            display: inline-block;
            line-height: 1;
        `;
        
        return icon;
    }
    
    /**
     * Skapa dagsprognos-ikon
     * @param {number|string} symbol - SMHI väder-symbol
     * @returns {HTMLElement} Dagsprognos-ikon element
     */
    static createDailyIcon(symbol) {
        const iconName = this.getIconName(symbol, true); // Använd alltid dagtid för dagsprognos
        const icon = this.createIcon(iconName, ['daily-weather-icon']);
        
        // Lägg till färgklass
        const colorClass = this.getColorClass(symbol);
        icon.classList.add(colorClass);
        
        // Dagsprognos-ikon styling
        icon.style.cssText = `
            font-size: clamp(20px, 2rem, 28px);
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            display: inline-block;
            line-height: 1;
        `;
        
        return icon;
    }
    
    /**
     * Skapa luftfuktighets-ikon
     * @returns {HTMLElement} Luftfuktighets-ikon element
     */
    static createHumidityIcon() {
        const icon = this.createIcon('wi-humidity', ['humidity-icon']);
        
        icon.style.cssText = `
            color: #4A9EFF;
            font-size: clamp(16px, 1.6rem, 21px);
            margin-right: 7px;
            display: inline-block;
            line-height: 1;
        `;
        
        return icon;
    }
    
    /**
     * Skapa barometer-ikon
     * @param {string} trend - Trycktrend ('rising', 'falling', 'stable', 'n/a')
     * @returns {HTMLElement} Barometer-ikon element
     */
    static createBarometerIcon(trend = 'stable') {
        const icon = this.createIcon('wi-barometer', ['barometer-icon']);
        
        // Stil för barometer-ikon
        icon.style.cssText = `
            font-size: clamp(20px, 2rem, 26px);
            display: inline-block;
            line-height: 1;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 0 1px currentColor;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1)) drop-shadow(0 0 1px currentColor);
            transition: color 0.3s ease;
            margin-top: 2px;
        `;
        
        // Lägg till trend-klass
        icon.classList.add(trend);
        
        return icon;
    }
}

// === FONT AWESOME SYSTEM ===

/**
 * Font Awesome Manager - Separerad färgkodning
 */
export class FontAwesomeManager {
    /**
     * Skapa luftkvalitet-ikon (löv)
     * @param {string} airQualityLevel - Luftkvalitet-nivå ('good', 'moderate', 'poor')
     * @returns {HTMLElement} Luftkvalitet-ikon element
     */
    static createLeafIcon(airQualityLevel = 'good') {
        const icon = document.createElement('i');
        icon.className = `fas fa-leaf air-quality-fa-icon`;
        icon.setAttribute('data-air-quality', airQualityLevel);
        
        // SEPARERAD FÄRGKODNING: Bara ikonen får färg
        const colors = {
            'good': '#34a853',
            'moderate': '#fbbc04', 
            'poor': '#ea4335'
        };
        
        icon.style.color = colors[airQualityLevel] || colors['good'];
        icon.style.fontSize = 'clamp(21px, 2.1rem, 28px)';
        icon.style.display = 'inline-block';
        icon.style.marginRight = '7px';
        
        return icon;
    }
    
    /**
     * Skapa sol-ikon för soluppgång
     * @returns {HTMLElement} Sol-ikon element
     */
    static createSunriseIcon() {
        const icon = document.createElement('i');
        icon.className = 'fas fa-sun sunrise-icon';
        
        icon.style.cssText = `
            color: #ff9800;
            font-size: clamp(16px, 1.6rem, 20px);
            margin-right: 6px;
            display: inline-block;
        `;
        
        return icon;
    }
    
    /**
     * Skapa sol-ikon för solnedgång
     * @returns {HTMLElement} Sol-ikon element
     */
    static createSunsetIcon() {
        const icon = document.createElement('i');
        icon.className = 'fas fa-sun sunset-icon';
        
        icon.style.cssText = `
            color: #ff5722;
            font-size: clamp(16px, 1.6rem, 20px);
            margin-right: 6px;
            display: inline-block;
        `;
        
        return icon;
    }
    
    /**
     * Skapa allmän Font Awesome-ikon
     * @param {string} iconClass - Font Awesome klass (t.ex. 'fas fa-home')
     * @param {string} color - Färg för ikonen
     * @param {string} size - Storlek på ikonen
     * @returns {HTMLElement} Font Awesome-ikon element
     */
    static createIcon(iconClass, color = '#4285f4', size = '16px') {
        const icon = document.createElement('i');
        icon.className = iconClass;
        
        icon.style.cssText = `
            color: ${color};
            font-size: ${size};
            display: inline-block;
            line-height: 1;
        `;
        
        return icon;
    }
}

// === WIND DIRECTION ARROWS ===

/**
 * Wind Direction Manager - Hantera vindriktningspilar
 */
export class WindDirectionManager {
    /**
     * Skapa vindriktningspil
     * @param {number} degrees - Vindriktning i grader
     * @param {string} size - Storlek på pilen
     * @param {string} color - Färg på pilen
     * @returns {HTMLElement} Vindriktningspil element
     */
    static createWindArrow(degrees, size = '24px', color = '#4A9EFF') {
        const arrow = WeatherIconManager.createIcon('wi-direction-up', ['wind-arrow']);
        
        // Rotera pilen baserat på vindriktning
        const rotation = degrees + 180; // +180 för att visa varifrån vinden kommer
        
        arrow.style.cssText = `
            transform: rotate(${rotation}deg);
            color: ${color};
            font-size: ${size};
            margin-left: 3px;
            display: inline-block;
            line-height: 1;
            text-shadow: 0 0 1px currentColor;
            filter: drop-shadow(0 0 1px currentColor);
        `;
        
        return arrow;
    }
    
    /**
     * Skapa förstärkt vindriktningspil för LP156WH4-skärm
     * @param {number} degrees - Vindriktning i grader
     * @returns {HTMLElement} Förstärkt vindriktningspil element
     */
    static createEnhancedWindArrow(degrees) {
        return this.createWindArrow(degrees, '28px', '#4A9EFF');
    }
    
    /**
     * Skapa vindikon med riktningspil
     * @param {number} degrees - Vindriktning i grader
     * @param {string} windIconClass - Vind-ikon klass
     * @returns {HTMLElement} Vindikon med riktningspil
     */
    static createWindWithDirection(degrees, windIconClass = 'wi-strong-wind') {
        const container = document.createElement('div');
        container.className = 'wind-with-direction';
        container.style.display = 'inline-block';
        
        // Vindikon
        const windIcon = WeatherIconManager.createIcon(windIconClass, ['wind-icon']);
        windIcon.style.cssText = `
            color: #4A9EFF;
            font-size: 16px;
            margin-right: 4px;
            display: inline-block;
        `;
        
        // Riktningspil
        const directionArrow = this.createWindArrow(degrees, '24px', '#4A9EFF');
        
        container.appendChild(windIcon);
        container.appendChild(directionArrow);
        
        return container;
    }
}

// === ICON INITIALIZATION ===

/**
 * Initialisera alla ikon-system
 */
export function initializeIconSystems() {
    console.log('🎨 Initialiserar ikon-system...');
    
    // Kontrollera att Weather Icons CSS är laddat
    if (!document.querySelector('link[href*="weather-icons"]')) {
        console.warn('⚠️ Weather Icons CSS verkar inte vara laddat');
    }
    
    // Kontrollera att Font Awesome CSS är laddat
    if (!document.querySelector('link[href*="font-awesome"]') && !document.querySelector('link[href*="fontawesome"]')) {
        console.warn('⚠️ Font Awesome CSS verkar inte vara laddat');
    }
    
    console.log('✅ Ikon-system initialiserade');
}

// === ICON UTILITIES ===

/**
 * Uppdatera befintlig ikon
 * @param {HTMLElement} container - Container för ikonen
 * @param {HTMLElement} newIcon - Ny ikon att sätta in
 */
export function replaceIcon(container, newIcon) {
    if (!container || !newIcon) return;
    
    // Rensa befintligt innehåll
    container.innerHTML = '';
    
    // Sätt in ny ikon
    container.appendChild(newIcon);
}

/**
 * Sätt ikon-färg baserat på data
 * @param {HTMLElement} icon - Ikon-element
 * @param {any} value - Datavärde
 * @param {object} colorMap - Färgmappning
 */
export function setIconColor(icon, value, colorMap) {
    if (!icon || !colorMap) return;
    
    for (const [condition, color] of Object.entries(colorMap)) {
        if (eval(`${value} ${condition}`)) {
            icon.style.color = color;
            break;
        }
    }
}

/**
 * Animera ikon-förändring
 * @param {HTMLElement} icon - Ikon att animera
 * @param {string} animationType - Typ av animation
 */
export function animateIcon(icon, animationType = 'pulse') {
    if (!icon) return;
    
    const animations = {
        'pulse': 'animate-pulse',
        'bounce': 'animate-bounce',
        'spin': 'animate-spin',
        'fade': 'animate-fade'
    };
    
    const animationClass = animations[animationType] || animations['pulse'];
    
    icon.classList.add(animationClass);
    
    // Ta bort animation efter 1 sekund
    setTimeout(() => {
        icon.classList.remove(animationClass);
    }, 1000);
}

console.log('📦 Icon Manager Module laddat');