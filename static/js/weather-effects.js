/**
 * WeatherEffects for Flask Weather Dashboard
 * FAS 1: Standalone JavaScript Module - MagicMirror WeatherEffects Integration
 * 
 * OPTIMERAD FÖR: LP156WH4 (1366×768) + Pi5 + Chromium kiosk-läge
 * BASERAD PÅ: MagicMirror MMM-WeatherEffects modul
 * ARKITEKTUR: Modulär klass-baserad struktur med robust error handling
 */

// === SMHI WEATHER SYMBOL MAPPING ===
const SMHI_WEATHER_MAPPING = {
    // Regn och regnskurar
    rain: [8, 9, 10, 18, 19, 20],
    // Snö och snöbyar  
    snow: [15, 16, 17, 25, 26, 27],
    // Snöblandat regn (behandlas som snö med regn-hastighet)
    sleet: [12, 13, 14, 22, 23, 24],
    // Åska (behandlas som intensivt regn)
    thunder: [11, 21],
    // Klart väder (ingen effekt)
    clear: [1, 2, 3, 4, 5, 6, 7]
};

// === DEFAULT KONFIGURATION (MM-standard) ===
const DEFAULT_CONFIG = {
    enabled: true,
    intensity: 'auto',  // auto, light, medium, heavy
    
    // Rain configuration (MM-standard inställningar)
    rain_config: {
        droplet_count: 50,        // Standard MM-värde
        droplet_speed: 2.0,       // Standard MM-hastighet  
        wind_direction: 'none',   // none, left-to-right, right-to-left
        enable_splashes: false    // Standard MM-setting
    },
    
    // Snow configuration (MM-standard inställningar)
    snow_config: {
        flake_count: 25,          // Standard MM-värde
        characters: ['*', '+'],   // Standard MM-tecken
        sparkle_enabled: false,   // Standard MM-setting
        min_size: 0.8,           // Standard MM-storlek
        max_size: 1.5,           // Standard MM-storlek
        speed: 1.0               // Standard MM-hastighet
    },
    
    // Transition settings
    transition_duration: 1000,   // Standard MM-timing
    
    // Error handling & logging
    debug_logging: false,        // För felsökning
    fallback_enabled: true       // Graceful fallbacks
};

// === HUVUDKLASS: WEATHEREFFECTSMANAGER ===
class WeatherEffectsManager {
    constructor() {
        this.config = { ...DEFAULT_CONFIG };
        this.currentEffect = null;
        this.effectContainer = null;
        this.initialized = false;
        
        // Bind methods för event handling
        this.updateFromSMHI = this.updateFromSMHI.bind(this);
        this.handleWeatherChange = this.handleWeatherChange.bind(this);
        
        this.log('WeatherEffectsManager initialiserad');
    }
    
    /**
     * Initialisera WeatherEffects-systemet
     */
    async initialize() {
        try {
            this.log('Initialiserar WeatherEffects...');
            
            // Ladda konfiguration från Flask API
            await this.loadConfig();
            
            // Kontrollera om effects är aktiverade
            if (!this.config.enabled) {
                this.log('WeatherEffects är inaktiverade i config');
                return false;
            }
            
            // Skapa bas-container för effekter
            this.createEffectContainer();
            
            this.initialized = true;
            this.log('WeatherEffects initialisering klar');
            return true;
            
        } catch (error) {
            this.logError('Fel vid initialisering:', error);
            
            if (this.config.fallback_enabled) {
                this.log('Använder fallback-konfiguration');
                this.createEffectContainer();
                this.initialized = true;
                return true;
            }
            
            return false;
        }
    }
    
    /**
     * Ladda konfiguration från Flask API
     */
    async loadConfig() {
        try {
            const response = await fetch('/api/weather-effects-config', {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const configData = await response.json();
            
            // Validera och merga config
            this.config = this.validateConfig(configData);
            this.log('Konfiguration laddad från Flask API');
            
        } catch (error) {
            this.logError('Fel vid config-laddning:', error);
            
            if (this.config.fallback_enabled) {
                this.log('Använder default-konfiguration som fallback');
            } else {
                throw error;
            }
        }
    }
    
    /**
     * Validera och merga konfigurationsdata
     */
    validateConfig(configData) {
        if (!configData || typeof configData !== 'object') {
            this.log('Ogiltig config-data, använder default');
            return { ...DEFAULT_CONFIG };
        }
        
        // Deep merge med default config
        const mergedConfig = { ...DEFAULT_CONFIG };
        
        // Kopiera top-level properties
        Object.keys(DEFAULT_CONFIG).forEach(key => {
            if (configData.hasOwnProperty(key)) {
                if (typeof DEFAULT_CONFIG[key] === 'object' && !Array.isArray(DEFAULT_CONFIG[key])) {
                    // Deep merge för nested objects
                    mergedConfig[key] = { ...DEFAULT_CONFIG[key], ...configData[key] };
                } else {
                    mergedConfig[key] = configData[key];
                }
            }
        });
        
        this.log('Config validerad och mergad');
        return mergedConfig;
    }
    
    /**
     * Skapa bas-container för alla vädereffekter
     */
    createEffectContainer() {
        // Ta bort befintlig container om den finns
        if (this.effectContainer) {
            this.effectContainer.remove();
        }
        
        // Skapa ny container med MM-kompatibel styling
        this.effectContainer = document.createElement('div');
        this.effectContainer.className = 'weather-effect-wrapper';
        this.effectContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            pointer-events: none !important;
            z-index: 99999999 !important;
            opacity: 0;
            transition: opacity ${this.config.transition_duration}ms ease-in-out;
        `;
        
        document.body.appendChild(this.effectContainer);
        this.log('Effect container skapad');
    }
    
    /**
     * Huvudmetod: Uppdatera effekter baserat på SMHI-data
     */
    updateFromSMHI(weatherSymbol, precipitation = 0, windDirection = 0) {
        if (!this.initialized) {
            this.log('WeatherEffects ej initialiserat, hoppar över uppdatering');
            return;
        }
        
        try {
            // Bestäm vädertyp från SMHI symbol
            const weatherType = this.getWeatherTypeFromSMHI(weatherSymbol);
            this.log(`SMHI Symbol ${weatherSymbol} → ${weatherType}`);
            
            // Beräkna intensitet baserat på precipitation
            const intensity = this.calculateIntensity(weatherType, precipitation);
            
            // Hantera väderändring
            this.handleWeatherChange(weatherType, intensity, windDirection);
            
        } catch (error) {
            this.logError('Fel vid SMHI-uppdatering:', error);
            
            if (this.config.fallback_enabled) {
                this.clearEffects();
            }
        }
    }
    
    /**
     * Konvertera SMHI weather symbol till vädertyp
     */
    getWeatherTypeFromSMHI(weatherSymbol) {
        if (typeof weatherSymbol !== 'number' || weatherSymbol < 1 || weatherSymbol > 27) {
            this.log(`Ogiltig SMHI symbol: ${weatherSymbol}, använder 'clear'`);
            return 'clear';
        }
        
        // Sök genom mapping
        for (const [type, symbols] of Object.entries(SMHI_WEATHER_MAPPING)) {
            if (symbols.includes(weatherSymbol)) {
                return type;
            }
        }
        
        this.log(`Okänd SMHI symbol: ${weatherSymbol}, använder 'clear'`);
        return 'clear';
    }
    
    /**
     * Beräkna intensitet baserat på vädertyp och precipitation
     */
    calculateIntensity(weatherType, precipitation) {
        if (this.config.intensity !== 'auto') {
            return this.config.intensity;
        }
        
        // Auto-intensitet baserat på precipitation
        if (weatherType === 'clear') {
            return 'none';
        }
        
        if (precipitation <= 0.1) {
            return 'light';
        } else if (precipitation <= 2.0) {
            return 'medium';
        } else {
            return 'heavy';
        }
    }
    
    /**
     * Hantera väderändring och visa rätt effekt
     */
    handleWeatherChange(weatherType, intensity, windDirection) {
        // Om samma effekt redan körs, uppdatera bara intensitet
        if (this.currentEffect && this.currentEffect.type === weatherType) {
            this.currentEffect.updateIntensity(intensity);
            return;
        }
        
        // Rensa befintliga effekter
        this.clearEffects();
        
        // Skapa ny effekt baserat på vädertyp
        switch (weatherType) {
            case 'rain':
            case 'thunder':
                this.currentEffect = new RainEffect(this.effectContainer, this.config.rain_config, intensity, windDirection);
                break;
                
            case 'snow':
            case 'sleet':
                this.currentEffect = new SnowEffect(this.effectContainer, this.config.snow_config, intensity);
                break;
                
            case 'clear':
            default:
                this.currentEffect = null;
                this.hideEffectContainer();
                return;
        }
        
        // Starta effekten och visa container
        if (this.currentEffect) {
            this.currentEffect.type = weatherType;
            this.currentEffect.start();
            this.showEffectContainer();
            this.log(`${weatherType}-effekt startad med intensitet: ${intensity}`);
        }
    }
    
    /**
     * Visa effect container med smooth transition
     */
    showEffectContainer() {
        if (this.effectContainer) {
            this.effectContainer.style.opacity = '1';
        }
    }
    
    /**
     * Dölj effect container med smooth transition
     */
    hideEffectContainer() {
        if (this.effectContainer) {
            this.effectContainer.style.opacity = '0';
        }
    }
    
    /**
     * Rensa alla aktiva effekter
     */
    clearEffects() {
        if (this.currentEffect) {
            this.currentEffect.stop();
            this.currentEffect = null;
        }
        
        if (this.effectContainer) {
            this.effectContainer.innerHTML = '';
        }
        
        this.hideEffectContainer();
    }
    
    /**
     * Stäng av WeatherEffects och rensa resurser
     */
    destroy() {
        this.clearEffects();
        
        if (this.effectContainer) {
            this.effectContainer.remove();
            this.effectContainer = null;
        }
        
        this.initialized = false;
        this.log('WeatherEffects destroyed');
    }
    
    /**
     * Logging-helper
     */
    log(message) {
        if (this.config.debug_logging) {
            console.log(`[WeatherEffects] ${message}`);
        }
    }
    
    /**
     * Error logging-helper
     */
    logError(message, error) {
        console.error(`[WeatherEffects] ${message}`, error);
    }
}

// === REGNEFFEKT-KLASS ===
class RainEffect {
    constructor(container, config, intensity, windDirection) {
        this.container = container;
        this.config = config;
        this.intensity = intensity;
        this.windDirection = windDirection;
        this.particles = [];
        this.animationId = null;
        
        // LP156WH4 optimerade värden
        this.intensityMultipliers = {
            light: 0.5,
            medium: 1.0,
            heavy: 2.0
        };
    }
    
    start() {
        this.createRainParticles();
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.particles.forEach(particle => {
            if (particle.element && particle.element.parentNode) {
                particle.element.parentNode.removeChild(particle.element);
            }
        });
        
        this.particles = [];
    }
    
    updateIntensity(newIntensity) {
        if (newIntensity !== this.intensity) {
            this.intensity = newIntensity;
            this.stop();
            this.start();
        }
    }
    
    createRainParticles() {
        const multiplier = this.intensityMultipliers[this.intensity] || 1.0;
        const dropletCount = Math.floor(this.config.droplet_count * multiplier);
        
        for (let i = 0; i < dropletCount; i++) {
            this.createRainDroplet();
        }
    }
    
    createRainDroplet() {
        const droplet = document.createElement('div');
        droplet.className = 'rain-particle';
        
        // LP156WH4 optimerad styling
        droplet.style.cssText = `
            position: absolute !important;
            width: 2px;
            height: ${8 + Math.random() * 8}px;
            background: linear-gradient(to bottom, rgba(0, 170, 255, 0.8), transparent);
            opacity: ${0.6 + Math.random() * 0.4};
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: -20px;
            pointer-events: none;
        `;
        
        // Vind-påverkan
        const windOffset = this.getWindOffset();
        if (windOffset !== 0) {
            droplet.style.transform = `skewX(${windOffset}deg)`;
        }
        
        // Animation
        const duration = (this.config.droplet_speed + Math.random()) * 1000;
        droplet.style.animation = `rain-fall ${duration}ms linear infinite`;
        
        // Lägg till slumpmässig delay
        droplet.style.animationDelay = `${Math.random() * 2000}ms`;
        
        this.container.appendChild(droplet);
        
        // Spara referens
        this.particles.push({
            element: droplet,
            duration: duration
        });
        
        // Auto-remove efter animation
        setTimeout(() => {
            if (droplet.parentNode) {
                droplet.parentNode.removeChild(droplet);
            }
            
            // Ta bort från particles array
            const index = this.particles.findIndex(p => p.element === droplet);
            if (index > -1) {
                this.particles.splice(index, 1);
            }
            
            // Skapa ny droplet för kontinuerlig effekt
            if (this.container) {
                this.createRainDroplet();
            }
        }, duration + 2000);
    }
    
    getWindOffset() {
        switch (this.config.wind_direction) {
            case 'left-to-right':
                return 15;
            case 'right-to-left':
                return -15;
            default:
                return 0;
        }
    }
}

// === SNÖEFFEKT-KLASS ===
class SnowEffect {
    constructor(container, config, intensity) {
        this.container = container;
        this.config = config;
        this.intensity = intensity;
        this.particles = [];
        
        // LP156WH4 optimerade värden
        this.intensityMultipliers = {
            light: 0.6,
            medium: 1.0,
            heavy: 1.8
        };
    }
    
    start() {
        this.createSnowParticles();
    }
    
    stop() {
        this.particles.forEach(particle => {
            if (particle.element && particle.element.parentNode) {
                particle.element.parentNode.removeChild(particle.element);
            }
        });
        
        this.particles = [];
    }
    
    updateIntensity(newIntensity) {
        if (newIntensity !== this.intensity) {
            this.intensity = newIntensity;
            this.stop();
            this.start();
        }
    }
    
    createSnowParticles() {
        const multiplier = this.intensityMultipliers[this.intensity] || 1.0;
        const flakeCount = Math.floor(this.config.flake_count * multiplier);
        
        for (let i = 0; i < flakeCount; i++) {
            this.createSnowFlake();
        }
    }
    
    createSnowFlake() {
        const flake = document.createElement('div');
        flake.className = 'snow-particle';
        
        // Välj random tecken
        const character = this.config.characters[Math.floor(Math.random() * this.config.characters.length)];
        flake.textContent = character;
        
        // LP156WH4 optimerad styling
        const size = this.config.min_size + Math.random() * (this.config.max_size - this.config.min_size);
        flake.style.cssText = `
            position: absolute !important;
            color: white;
            font-size: ${size}em;
            opacity: ${0.7 + Math.random() * 0.3};
            left: ${Math.random() * 100}%;
            top: -20px;
            pointer-events: none;
            user-select: none;
        `;
        
        // Sparkle-effekt
        if (this.config.sparkle_enabled) {
            flake.classList.add('sparkle');
        }
        
        // Animation
        const duration = ((Math.random() * 2 + 3) / this.config.speed) * 1000;
        flake.style.animation = `snow-fall ${duration}ms linear infinite`;
        
        // Lägg till slumpmässig delay
        flake.style.animationDelay = `${Math.random() * 3000}ms`;
        
        this.container.appendChild(flake);
        
        // Spara referens
        this.particles.push({
            element: flake,
            duration: duration
        });
        
        // Auto-remove efter animation
        setTimeout(() => {
            if (flake.parentNode) {
                flake.parentNode.removeChild(flake);
            }
            
            // Ta bort från particles array
            const index = this.particles.findIndex(p => p.element === flake);
            if (index > -1) {
                this.particles.splice(index, 1);
            }
            
            // Skapa ny flake för kontinuerlig effekt
            if (this.container) {
                this.createSnowFlake();
            }
        }, duration + 3000);
    }
}

// === GLOBAL INITIALIZATION ===

/**
 * Global WeatherEffectsManager instance
 */
let weatherEffectsManager = null;

/**
 * Initialisera WeatherEffects när DOM är redo
 */
async function initializeWeatherEffects() {
    try {
        console.log('[WeatherEffects] Initialiserar...');
        
        if (weatherEffectsManager) {
            weatherEffectsManager.destroy();
        }
        
        weatherEffectsManager = new WeatherEffectsManager();
        const success = await weatherEffectsManager.initialize();
        
        if (success) {
            // Exponera till global scope för dashboard.js
            window.weatherEffectsManager = weatherEffectsManager;
            console.log('[WeatherEffects] Initialisering lyckades');
            return true;
        } else {
            console.warn('[WeatherEffects] Initialisering misslyckades');
            return false;
        }
        
    } catch (error) {
        console.error('[WeatherEffects] Fel vid initialisering:', error);
        return false;
    }
}

// === EXPORTS FÖR MODULARITY ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WeatherEffectsManager,
        RainEffect,
        SnowEffect,
        initializeWeatherEffects,
        SMHI_WEATHER_MAPPING
    };
}

console.log('[WeatherEffects] JavaScript-modul laddad');
