/**
 * SVG Icon Loader for Flask Weather Dashboard - FIXAD VERSION
 * FAS 3: amCharts Animated Icons Integration
 * 
 * OPTIMERAD FÖR: LP156WH4 (1366×768) + Pi5 + Chromium kiosk-läge
 * FUNKTIONER: Laddar amCharts SVG-ikoner baserat på SMHI weather symbols
 * FALLBACK: Automatisk återgång till Weather Icons om SVG saknas
 * PRESTANDA: Cache och optimerad för Pi5 GPU
 * 
 * 🔧 FIXAR:
 * - ✅ Rätt BASE_PATH: /static/assets/icons/amcharts-svg/
 * - ✅ Komplett SMHI symbol mapping (1-27)
 * - ✅ Korrekt window-exponering (HUVUDFIXET)
 * - ✅ Förenklad config utan API-beroende
 */

// === SMHI WEATHER SYMBOL MAPPING ===
const SMHI_TO_SVG_MAPPING = {
    // Klart väder
    1: { day: 'clear-day.svg', night: 'clear-night.svg' },
    2: { day: 'partly-cloudy-day.svg', night: 'partly-cloudy-night.svg' },
    
    // Molnigt väder
    3: { day: 'partly-cloudy-day-2.svg', night: 'partly-cloudy-night-2.svg' },
    4: { day: 'partly-cloudy-day-3.svg', night: 'partly-cloudy-night-3.svg' },
    5: { day: 'cloudy.svg', night: 'cloudy.svg' },
    6: { day: 'overcast.svg', night: 'overcast.svg' },
    7: { day: 'fog.svg', night: 'fog.svg' },
    
    // Regnskurar
    8: { day: 'partly-cloudy-day-drizzle.svg', night: 'partly-cloudy-night-drizzle.svg' },
    9: { day: 'partly-cloudy-day-rain.svg', night: 'partly-cloudy-night-rain.svg' },
    10: { day: 'rain.svg', night: 'rain.svg' },
    
    // Åska
    11: { day: 'thunderstorms-day.svg', night: 'thunderstorms-night.svg' },
    21: { day: 'thunderstorms.svg', night: 'thunderstorms.svg' },
    
    // Snöblandat regn
    12: { day: 'partly-cloudy-day-sleet.svg', night: 'partly-cloudy-night-sleet.svg' },
    13: { day: 'sleet.svg', night: 'sleet.svg' },
    14: { day: 'sleet.svg', night: 'sleet.svg' },
    22: { day: 'sleet.svg', night: 'sleet.svg' },
    23: { day: 'sleet.svg', night: 'sleet.svg' },
    24: { day: 'sleet.svg', night: 'sleet.svg' },
    
    // Snöbyar
    15: { day: 'partly-cloudy-day-snow.svg', night: 'partly-cloudy-night-snow.svg' },
    16: { day: 'snow.svg', night: 'snow.svg' },
    17: { day: 'snow.svg', night: 'snow.svg' },
    25: { day: 'snow.svg', night: 'snow.svg' },
    26: { day: 'snow.svg', night: 'snow.svg' },
    27: { day: 'snow.svg', night: 'snow.svg' },
    
    // Regn
    18: { day: 'partly-cloudy-day-rain.svg', night: 'partly-cloudy-night-rain.svg' },
    19: { day: 'rain.svg', night: 'rain.svg' },
    20: { day: 'rain.svg', night: 'rain.svg' }
};

// === DEFAULT KONFIGURATION ===
const DEFAULT_CONFIG = {
    enabled: true,
    base_path: '/static/assets/icons/amcharts-svg',  // 🔧 FIX: Rätt sökväg
    day_path: 'day',
    night_path: 'night',
    fallback_to_static: true,
    debug_logging: false,
    icon_sizes: {
        main_weather: '89px',
        forecast_hourly: '48px',
        forecast_daily: '30px',
        details: '21px'
    },
    symbol_mapping: SMHI_TO_SVG_MAPPING  // 🔧 FIX: Komplett mapping
};

// === GLOBAL STATE ===
let svgIconLoader = null;

// === HUVUDKLASS: SVG ICON LOADER ===
class SVGIconLoader {
    constructor() {
        this.config = { ...DEFAULT_CONFIG };  // 🔧 FIX: Använd enkel config
        this.cache = new Map();
        this.preloadedIcons = new Set();
        this.isInitialized = false;
        this.debugLogging = false;
        
        this.log('SVGIconLoader initialiserad med fixad konfiguration');
    }
    
    /**
     * Initialisera SVG Icon Loader
     */
    async initialize() {
        try {
            this.log('Initialiserar SVG Icon Loader...');
            
            // 🔧 FIX: Enkel initialisering utan API-beroende
            this.debugLogging = this.config.debug_logging;
            this.isInitialized = true;
            
            this.log('SVG Icon Loader initialisering klar');
            return true;
            
        } catch (error) {
            this.logError('Fel vid initialisering:', error);
            return false;
        }
    }
    
    /**
     * Kontrollera om animerade ikoner är aktiverade
     */
    isAnimatedIconsEnabled() {
        return this.config && this.config.enabled === true;
    }
    
    /**
     * Ladda och visa SVG-ikon för givet weather symbol
     */
    async loadIcon(weatherSymbol, isDay = true, targetElement = null, size = null) {
        if (!this.isInitialized || !this.isAnimatedIconsEnabled()) {
            this.log('SVG loader ej initialiserad eller inaktiverat - använder fallback');
            return this.createFallbackResult(weatherSymbol, isDay, 'loader_not_ready');
        }
        
        try {
            const cacheKey = this.getCacheKey(weatherSymbol, isDay);
            let svgContent = this.cache.get(cacheKey);
            
            // Hämta från cache eller ladda ny
            if (!svgContent) {
                svgContent = await this.fetchIcon(weatherSymbol, isDay);
                if (svgContent) {
                    this.cache.set(cacheKey, svgContent);
                }
            }
            
            if (svgContent) {
                const element = this.createSVGElement(svgContent, weatherSymbol, size, targetElement);
                const iconPath = this.getIconPath(weatherSymbol, isDay);
                
                // 🔧 FIX: Returnera strukturerat svar för dashboard.js
                return {
                    success: true,
                    element: element,
                    source: 'amcharts_svg',
                    iconPath: iconPath,
                    cached: this.cache.has(cacheKey)
                };
            } else {
                this.log(`SVG-ikon kunde inte laddas för symbol ${weatherSymbol}`);
                return this.createFallbackResult(weatherSymbol, isDay, 'svg_load_failed');
            }
            
        } catch (error) {
            this.logError('Fel vid ikondladdning:', error);
            return this.createFallbackResult(weatherSymbol, isDay, 'load_error');
        }
    }
    
    /**
     * Hämta SVG-innehåll för specifik ikon
     */
    async fetchIcon(weatherSymbol, isDay) {
        const iconPath = this.getIconPath(weatherSymbol, isDay);
        const iconUrl = this.buildIconUrl(iconPath, isDay);
        
        try {
            this.log(`Hämtar SVG från: ${iconUrl}`);
            
            const response = await fetch(iconUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const svgContent = await response.text();
            this.log(`SVG-innehåll hämtat (${svgContent.length} tecken)`);
            
            return svgContent;
            
        } catch (error) {
            this.logError(`Fel vid hämtning av ${iconUrl}:`, error);
            return null;
        }
    }
    
    /**
     * Få ikonsökväg för SMHI weather symbol
     */
    getIconPath(weatherSymbol, isDay) {
        const symbol = parseInt(weatherSymbol);
        const mapping = this.config.symbol_mapping[symbol];
        
        if (!mapping) {
            this.log(`Okänd weather symbol: ${symbol}, använder fallback`);
            return 'unknown.svg';
        }
        
        return isDay ? mapping.day : mapping.night;
    }
    
    /**
     * Bygg fullständig URL för ikon
     */
    buildIconUrl(iconPath, isDay) {
        const basePath = this.config.base_path;
        const subPath = isDay ? this.config.day_path : this.config.night_path;
        
        // 🔧 FIX: Enkel URL-byggning
        const fullUrl = `${basePath}/${subPath}/${iconPath}`;
        return fullUrl;
    }
    
    /**
     * Skapa SVG DOM-element från SVG-innehåll
     */
    createSVGElement(svgContent, weatherSymbol, customSize = null, targetElement = null) {
        // Skapa container-div
        const container = document.createElement('div');
        container.className = 'animated-weather-icon';
        container.innerHTML = svgContent.trim();
        
        const svgElement = container.querySelector('svg');
        if (!svgElement) {
            this.logError('Inget SVG-element hittades i innehållet');
            return null;
        }
        
        // Sätt storlek
        const size = customSize || this.config.icon_sizes?.main_weather || '89px';
        svgElement.style.width = size;
        svgElement.style.height = size;
        
        // LP156WH4 optimeringar
        svgElement.style.display = 'block';
        svgElement.style.margin = '0 auto';
        
        // Sätt CSS-klasser för styling
        svgElement.classList.add('animated-svg-icon');
        svgElement.classList.add('weather-main-icon');  // 🔧 FIX: Samma klass som Weather Icons
        svgElement.classList.add(`weather-symbol-${weatherSymbol}`);
        
        // Om targetElement anges, ersätt innehållet
        if (targetElement) {
            targetElement.innerHTML = '';
            targetElement.appendChild(container);
            this.log(`SVG ikon renderad i target element för symbol ${weatherSymbol}`);
        }
        
        this.log(`SVG element skapat för symbol ${weatherSymbol} (storlek: ${size})`);
        return container;
    }
    
    /**
     * 🔧 FIX: Skapa strukturerat fallback-resultat
     */
    createFallbackResult(weatherSymbol, isDay, reason) {
        return {
            success: false,
            element: null,
            source: 'fallback_needed',
            error: reason,
            weatherSymbol: weatherSymbol,
            isDay: isDay
        };
    }
    
    /**
     * Få cache-nyckel för ikon
     */
    getCacheKey(weatherSymbol, isDay) {
        return `${weatherSymbol}_${isDay ? 'day' : 'night'}`;
    }
    
    /**
     * Rensa cache
     */
    clearCache() {
        this.cache.clear();
        this.preloadedIcons.clear();
        this.log('SVG Icon cache rensad');
    }
    
    /**
     * Få cache-statistik för debugging
     */
    getCacheStats() {
        return {
            cachedIcons: this.cache.size,
            preloadedIcons: this.preloadedIcons.size,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    
    /**
     * Uppskatta minnesanvändning
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        for (const [key, content] of this.cache) {
            totalSize += key.length * 2;
            totalSize += content.length * 2;
        }
        return `${Math.round(totalSize / 1024)} KB`;
    }
    
    /**
     * Förstör loader och rensa resurser
     */
    destroy() {
        this.clearCache();
        this.config = null;
        this.isInitialized = false;
        this.log('SVGIconLoader förstörd');
    }
    
    /**
     * Logging-helper
     */
    log(message) {
        if (this.debugLogging) {
            console.log(`[SVGIconLoader] ${message}`);
        }
    }
    
    /**
     * Error logging-helper
     */
    logError(message, error) {
        console.error(`[SVGIconLoader] ${message}`, error);
    }
}

// === CONVENIENCE FUNCTIONS ===

/**
 * Globalt tillgänglig funktion för att ladda animerad ikon
 */
async function loadAnimatedIcon(weatherSymbol, isDay = true, targetElement = null, size = null) {
    if (!svgIconLoader) {
        console.warn('[SVGIconLoader] Loader ej initialiserad - initialiserar nu...');
        await initializeSVGLoader();
    }
    
    if (svgIconLoader && svgIconLoader.isInitialized) {
        return await svgIconLoader.loadIcon(weatherSymbol, isDay, targetElement, size);
    } else {
        console.warn('[SVGIconLoader] Fallback till statiska ikoner');
        return {
            success: false,
            element: null,
            source: 'initialization_failed',
            error: 'SVG loader could not be initialized'
        };
    }
}

/**
 * Kontrollera om animerade ikoner är aktiverade
 */
function isAnimatedIconsEnabled() {
    return svgIconLoader && svgIconLoader.isInitialized && svgIconLoader.isAnimatedIconsEnabled();
}

/**
 * Få cache-statistik för debugging
 */
function getSVGIconCacheStats() {
    return svgIconLoader ? svgIconLoader.getCacheStats() : null;
}

/**
 * Rensa SVG-cache
 */
function clearSVGIconCache() {
    if (svgIconLoader) {
        svgIconLoader.clearCache();
    }
}

// === GLOBAL INITIALIZATION ===

/**
 * 🔧 FIX: Initialisera SVG Icon Loader (förenklad)
 */
async function initializeSVGLoader() {
    try {
        console.log('[SVGIconLoader] Initialiserar fixad SVG Icon Loader...');
        
        if (svgIconLoader) {
            svgIconLoader.destroy();
        }
        
        svgIconLoader = new SVGIconLoader();
        const success = await svgIconLoader.initialize();
        
        if (success) {
            // 🔧 FIX: Korrekt exponering till global scope (HUVUDFIXET)
            window.SVGIconLoader = SVGIconLoader;           // ✅ Klass
            window.svgIconLoader = svgIconLoader;           // ✅ Instans
            window.loadAnimatedIcon = loadAnimatedIcon;     // ✅ Huvudfunktion
            window.isAnimatedIconsEnabled = isAnimatedIconsEnabled;  // ✅ Status
            window.initializeSVGLoader = initializeSVGLoader;        // ✅ Init
            window.getSVGIconCacheStats = getSVGIconCacheStats;      // ✅ Debug
            window.clearSVGIconCache = clearSVGIconCache;            // ✅ Rensa
            
            console.log('[SVGIconLoader] ✅ Initialisering lyckades - funktioner exponerade på window');
            console.log('[SVGIconLoader] ✅ Tillgängliga funktioner: SVGIconLoader, svgIconLoader, loadAnimatedIcon, isAnimatedIconsEnabled, initializeSVGLoader');
            return true;
        } else {
            console.log('[SVGIconLoader] ❌ Initialisering misslyckades');
            return false;
        }
        
    } catch (error) {
        console.error('[SVGIconLoader] ❌ Fel vid initialisering:', error);
        return false;
    }
}

// === AUTO-INITIALIZATION ===

/**
 * Auto-initialisera när DOM är redo
 */
document.addEventListener('DOMContentLoaded', function() {
    // Vänta lite så dashboard.js hinner ladda först
    setTimeout(async () => {
        if (!svgIconLoader) {
            await initializeSVGLoader();
        }
    }, 100);
});

// === ERROR HANDLING ===

window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('SVGIconLoader')) {
        console.error('[SVGIconLoader] JavaScript fel fångat:', event.error);
    }
});

// === EXPORTS FÖR MODULARITY ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SVGIconLoader,
        loadAnimatedIcon,
        isAnimatedIconsEnabled,
        initializeSVGLoader
    };
}

console.log('[SVGIconLoader] 🎬 FIXAD amCharts SVG Icon Loader modul laddad - window-exponering KORRIGERAD!');