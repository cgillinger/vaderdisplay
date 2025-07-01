/**
 * WeatherEffects for Flask Weather Dashboard
 * FAS 1: Standalone JavaScript Module - MagicMirror WeatherEffects Integration
 * 
 * OPTIMERAD FÖR: LP156WH4 (1366×768) + Pi5 + Chromium kiosk-läge
 * BASERAD PÅ: MagicMirror MMM-WeatherEffects modul
 * ARKITEKTUR: Modulär klass-baserad struktur med robust error handling
 * 
 * 🛠️ KRITISK FIX: clearEffects() metoden helt omskriven för att stoppa effekt-staplingar
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
    // Klart väder (ingen animation)
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
        
        // 🛠️ FIX: Global timeout tracking för fullständig rensning
        this.globalTimeouts = new Set();
        this.globalIntervals = new Set();
        
        // Bind methods för event handling
        this.updateFromSMHI = this.updateFromSMHI.bind(this);
        this.handleWeatherChange = this.handleWeatherChange.bind(this);
        
        this.log('WeatherEffectsManager initialiserad med förbättrad clearEffects()');
    }
    
    /**
     * 🛠️ FIX: Global timeout/interval tracking
     */
    addTimeout(timeoutId) {
        this.globalTimeouts.add(timeoutId);
        return timeoutId;
    }
    
    addInterval(intervalId) {
        this.globalIntervals.add(intervalId);
        return intervalId;
    }
    
    removeTimeout(timeoutId) {
        this.globalTimeouts.delete(timeoutId);
        clearTimeout(timeoutId);
    }
    
    removeInterval(intervalId) {
        this.globalIntervals.delete(intervalId);
        clearInterval(intervalId);
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
        
        // 🛠️ FIX: Använd förbättrad clearEffects
        this.clearEffects();
        
        // Skapa ny effekt baserat på vädertyp
        switch (weatherType) {
            case 'rain':
            case 'thunder':
                this.currentEffect = new RainEffect(this.effectContainer, this.config.rain_config, intensity, windDirection, this);
                break;
                
            case 'snow':
            case 'sleet':
                this.currentEffect = new SnowEffect(this.effectContainer, this.config.snow_config, intensity, this);
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
     * 🛠️ KRITISK FIX: Fullständigt omskriven clearEffects() metod
     * Denna metod löser problemet med effekt-staplingar
     */
    clearEffects() {
        this.log('🧹 Startar FÖRBÄTTRAD clearEffects() - stoppar allt...');
        
        // Steg 1: Stoppa pågående effekt om den finns
        if (this.currentEffect) {
            this.log('🛑 Stoppar currentEffect...');
            try {
                this.currentEffect.stop();
            } catch (error) {
                this.logError('Fel vid stopp av currentEffect:', error);
            }
            this.currentEffect = null;
        }
        
        // Steg 2: Rensa alla globala timeouts och intervals
        this.log(`🕐 Rensar ${this.globalTimeouts.size} timeouts och ${this.globalIntervals.size} intervals...`);
        
        this.globalTimeouts.forEach(timeoutId => {
            try {
                clearTimeout(timeoutId);
            } catch (error) {
                this.logError('Fel vid clearTimeout:', error);
            }
        });
        this.globalTimeouts.clear();
        
        this.globalIntervals.forEach(intervalId => {
            try {
                clearInterval(intervalId);
            } catch (error) {
                this.logError('Fel vid clearInterval:', error);
            }
        });
        this.globalIntervals.clear();
        
        // Steg 3: Aggressiv DOM-rensning med multiple selectors
        if (this.effectContainer) {
            const beforeCount = this.effectContainer.children.length;
            
            // Rensa alla weather-particle element
            const particleSelectors = [
                '.rain-particle',
                '.snow-particle', 
                '.weather-particle',
                '[class*="particle"]',
                '[class*="rain"]',
                '[class*="snow"]'
            ];
            
            particleSelectors.forEach(selector => {
                const elements = this.effectContainer.querySelectorAll(selector);
                elements.forEach(element => {
                    try {
                        // Stoppa alla animationer på elementet
                        element.style.animation = 'none';
                        element.style.transition = 'none';
                        
                        // Ta bort från DOM
                        if (element.parentNode) {
                            element.parentNode.removeChild(element);
                        }
                    } catch (error) {
                        this.logError('Fel vid DOM-rensning:', error);
                    }
                });
            });
            
            // Fallback: Rensa hela container-innehållet
            try {
                this.effectContainer.innerHTML = '';
            } catch (error) {
                this.logError('Fel vid innerHTML clear:', error);
            }
            
            const afterCount = this.effectContainer.children.length;
            this.log(`🧹 DOM rensad: ${beforeCount} → ${afterCount} element`);
        }
        
        // Steg 4: Dölj effect container
        this.hideEffectContainer();
        
        // Steg 5: Verification med timeout
        this.addTimeout(setTimeout(() => {
            const remainingParticles = document.querySelectorAll('.rain-particle, .snow-particle, .weather-particle');
            if (remainingParticles.length > 0) {
                this.logError(`⚠️ ${remainingParticles.length} partiklar kvarstår efter clearEffects!`);
                // Aggressiv sista rensning
                remainingParticles.forEach(particle => {
                    try {
                        particle.remove();
                    } catch (error) {
                        // Ignorera fel här - element kan redan vara borttaget
                    }
                });
            } else {
                this.log('✅ clearEffects() verifierat - alla partiklar borttagna');
            }
        }, 500));
        
        this.log('🧹 clearEffects() KOMPLETT');
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

// === REGNEFFEKT-KLASS (FÖRBÄTTRAD) ===
class RainEffect {
    constructor(container, config, intensity, windDirection, manager) {
        this.container = container;
        this.config = config;
        this.intensity = intensity;
        this.windDirection = windDirection;
        this.manager = manager; // 🛠️ FIX: Referens till manager för timeout tracking
        this.particles = [];
        this.animationId = null;
        this.isActive = false; // 🛠️ FIX: Flag för att stoppa nya partiklar
        
        // LP156WH4 optimerade värden
        this.intensityMultipliers = {
            light: 0.5,
            medium: 1.0,
            heavy: 2.0
        };
    }
    
    start() {
        this.isActive = true;
        this.createRainParticles();
    }
    
    stop() {
        this.manager.log('🛑 RainEffect.stop() kallas...');
        this.isActive = false; // 🛠️ FIX: Stoppa nya partiklar
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // 🛠️ FIX: Rensa alla partiklar med robust error handling
        this.particles.forEach((particle, index) => {
            try {
                if (particle.element && particle.element.parentNode) {
                    particle.element.style.animation = 'none'; // Stoppa animationer
                    particle.element.parentNode.removeChild(particle.element);
                }
                if (particle.timeoutId) {
                    clearTimeout(particle.timeoutId);
                }
            } catch (error) {
                this.manager.logError(`Fel vid rensning av rain particle ${index}:`, error);
            }
        });
        
        this.particles = [];
        this.manager.log('🛑 RainEffect stoppat, alla partiklar rensade');
    }
    
    updateIntensity(newIntensity) {
        if (newIntensity !== this.intensity) {
            this.intensity = newIntensity;
            this.stop();
            this.start();
        }
    }
    
    createRainParticles() {
        if (!this.isActive) return; // 🛠️ FIX: Kontrollera om fortfarande aktiv
        
        const multiplier = this.intensityMultipliers[this.intensity] || 1.0;
        const dropletCount = Math.floor(this.config.droplet_count * multiplier);
        
        for (let i = 0; i < dropletCount; i++) {
            if (!this.isActive) break; // 🛠️ FIX: Avbryt om stoppat under loop
            this.createRainDroplet();
        }
    }
    
    createRainDroplet() {
        if (!this.isActive || !this.container) return; // 🛠️ FIX: Safety check
        
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
        
        // 🛠️ FIX: Robust timeout-hantering med manager tracking
        const timeoutId = this.manager.addTimeout(setTimeout(() => {
            if (!this.isActive) return; // 🛠️ FIX: Kontrollera status
            
            // Ta bort droplet
            if (droplet.parentNode) {
                droplet.parentNode.removeChild(droplet);
            }
            
            // Ta bort från particles array
            const index = this.particles.findIndex(p => p.element === droplet);
            if (index > -1) {
                this.particles.splice(index, 1);
            }
            
            // Rensa timeout från manager
            this.manager.removeTimeout(timeoutId);
            
            // Skapa ny droplet för kontinuerlig effekt ENDAST om fortfarande aktiv
            if (this.isActive && this.container) {
                this.createRainDroplet();
            }
        }, duration + 2000));
        
        // Spara referens MED timeout ID
        this.particles.push({
            element: droplet,
            duration: duration,
            timeoutId: timeoutId // 🛠️ FIX: Spara timeout ID för rensning
        });
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

// === SNÖEFFEKT-KLASS (FÖRBÄTTRAD) ===
class SnowEffect {
    constructor(container, config, intensity, manager) {
        this.container = container;
        this.config = config;
        this.intensity = intensity;
        this.manager = manager; // 🛠️ FIX: Referens till manager
        this.particles = [];
        this.isActive = false; // 🛠️ FIX: Aktivitetsflag
        
        // LP156WH4 optimerade värden
        this.intensityMultipliers = {
            light: 0.6,
            medium: 1.0,
            heavy: 1.8
        };
    }
    
    start() {
        this.isActive = true;
        this.createSnowParticles();
    }
    
    stop() {
        this.manager.log('🛑 SnowEffect.stop() kallas...');
        this.isActive = false; // 🛠️ FIX: Stoppa nya partiklar
        
        // 🛠️ FIX: Robust particle-rensning
        this.particles.forEach((particle, index) => {
            try {
                if (particle.element && particle.element.parentNode) {
                    particle.element.style.animation = 'none'; // Stoppa animationer
                    particle.element.parentNode.removeChild(particle.element);
                }
                if (particle.timeoutId) {
                    clearTimeout(particle.timeoutId);
                }
            } catch (error) {
                this.manager.logError(`Fel vid rensning av snow particle ${index}:`, error);
            }
        });
        
        this.particles = [];
        this.manager.log('🛑 SnowEffect stoppat, alla partiklar rensade');
    }
    
    updateIntensity(newIntensity) {
        if (newIntensity !== this.intensity) {
            this.intensity = newIntensity;
            this.stop();
            this.start();
        }
    }
    
    createSnowParticles() {
        if (!this.isActive) return; // 🛠️ FIX: Safety check
        
        const multiplier = this.intensityMultipliers[this.intensity] || 1.0;
        const flakeCount = Math.floor(this.config.flake_count * multiplier);
        
        for (let i = 0; i < flakeCount; i++) {
            if (!this.isActive) break; // 🛠️ FIX: Avbryt om stoppat
            this.createSnowFlake();
        }
    }
    
    createSnowFlake() {
        if (!this.isActive || !this.container) return; // 🛠️ FIX: Safety check
        
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
        
        // 🛠️ FIX: Robust timeout med manager tracking
        const timeoutId = this.manager.addTimeout(setTimeout(() => {
            if (!this.isActive) return; // 🛠️ FIX: Kontrollera status
            
            // Ta bort flake
            if (flake.parentNode) {
                flake.parentNode.removeChild(flake);
            }
            
            // Ta bort från particles array
            const index = this.particles.findIndex(p => p.element === flake);
            if (index > -1) {
                this.particles.splice(index, 1);
            }
            
            // Rensa timeout från manager
            this.manager.removeTimeout(timeoutId);
            
            // Skapa ny flake ENDAST om fortfarande aktiv
            if (this.isActive && this.container) {
                this.createSnowFlake();
            }
        }, duration + 3000));
        
        // Spara referens MED timeout ID
        this.particles.push({
            element: flake,
            duration: duration,
            timeoutId: timeoutId // 🛠️ FIX: Spara timeout ID
        });
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
        console.log('[WeatherEffects] Initialiserar med FÖRBÄTTRAD clearEffects()...');
        
        if (weatherEffectsManager) {
            weatherEffectsManager.destroy();
        }
        
        weatherEffectsManager = new WeatherEffectsManager();
        const success = await weatherEffectsManager.initialize();
        
        if (success) {
            // Exponera till global scope för dashboard.js
            window.weatherEffectsManager = weatherEffectsManager;
            console.log('[WeatherEffects] ✅ Initialisering lyckades med fixad clearEffects()');
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

console.log('[WeatherEffects] 🛠️ FIXAD JavaScript-modul laddad - clearEffects() problemet LÖST!');