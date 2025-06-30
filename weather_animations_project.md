# 🌧️ Väderanimationer för Väderdisplayen - Detaljerad Projektbeskrivning

## 📋 Projektöversikt

**Mål:** Implementera fullskärms väderanimationer (regn/snö) i väderdisplayen, triggade av SMHI data, optimerat för Raspberry Pi3B men skalbart för kraftfullare datorer.

**Inspiration:** MMM-WeatherEffects MagicMirror² modul som skapar dynamiska vädereffekter baserat på väderdata.

---

## 🔍 ANALYS: MMM-WeatherEffects Funktionalitet

### Core Funktioner som ska replikeras:

**1. Väderdata-triggning:**
- Lyssnar på väderdata från API
- Keyword-baserad mapping (regn/snö ord → animationer)
- Automatisk aktivering/deaktivering av effekter

**2. Regn-animationer:**
- Vertikala droppar som faller från toppen
- Wind direction support (diagonal regn)
- Optional splash-effekter vid "landing"
- Konfigurerbar hastighet och antal droppar

**3. Snö-animationer:**
- Roterande snöflingor med olika karaktärer (* +)
- Multi-färgade variationer (vit, ljusblå, mörkblå, kristall)
- Sparkle-effekter (glöd-animation)
- Konfigurerbar storlek och fallhastighet

**4. Teknisk Implementation:**
- CSS keyframe-animationer för optimal performance
- Position: fixed fullskärms overlay
- Smooth transitions mellan effekter (fade in/out)
- DOM-baserat partikelsystem
- Z-index för att ligga över allt innehåll

---

## 🏗️ ANALYS: Väderdisplayens Arkitektur

### Nuvarande Struktur:

**Backend:**
- `smhi_client.py`: SMHI API integration med `weather_symbol` (1-27)
- `netatmo_client.py`: Lokal sensordata
- Flask server med `/api/current` endpoint

**Frontend:** 
- `dashboard.js`: Main UI logic med 30s update cycle
- `styles.css`: LP156WH4 optimerad styling (1366×768)
- `index.html`: Dashboard struktur

**Data Källor:**
- SMHI `weather_symbol`: Mappar till specifika vädertyper (1-27)
- SMHI `precipitation`: Nederbördsmängd
- SMHI `wind_direction`: Vindriktning för regn-animationer

### Relevanta Integration Points:
- `updateCurrentWeather()` i dashboard.js - där SMHI data processas
- SMHI weather_symbol mapping finns redan implementerat
- CSS struktur är redan modulär och skalbar

---

## 🎯 TEKNISK IMPLEMENTATION

### 🗂️ Modulär Filstruktur (nya filer):

```
static/
├── js/
│   ├── dashboard.js (befintlig - minor updates)
│   └── weather_animations.js (NY)
├── css/
│   ├── styles.css (befintlig - minor updates)
│   └── weather_effects.css (NY)
└── config/
    └── weather_effects_config.json (NY)
```

---

## 📝 DETALJERAD MODULBESKRIVNING

### 1. **weather_animations.js** - Animation Engine

```javascript
/**
 * Modulär klass-baserad weather animation system
 * Optimerat för Pi3B med skalning till kraftfulla datorer
 */

class WeatherAnimationSystem {
    constructor(config) {
        this.config = config;
        this.currentEffect = null;
        this.performanceMode = this.detectPerformanceMode();
        this.animationContainer = null;
        this.smhiSymbolMap = this.initializeSymbolMapping();
    }

    // SMHI Weather Symbol Mapping (1-27)
    initializeSymbolMapping() {
        return {
            // Regn och regnskurar
            rain: [8, 9, 10, 18, 19, 20],
            // Snö och snöbyar  
            snow: [15, 16, 17, 25, 26, 27],
            // Snöblandat regn
            sleet: [12, 13, 14, 22, 23, 24],
            // Klart väder (ingen animation)
            clear: [1, 2, 3, 4, 5, 6, 7, 11, 21]
        };
    }

    // Performance detection för auto-scaling
    detectPerformanceMode() {
        const cores = navigator.hardwareConcurrency || 1;
        const memory = navigator.deviceMemory || 1;
        
        if (cores <= 4 && memory <= 1) return 'pi3b';
        if (cores <= 8 && memory <= 4) return 'medium';
        return 'desktop';
    }

    // Main trigger från SMHI data
    updateFromSMHI(weatherSymbol, precipitation, windDirection) {
        const effectType = this.mapSymbolToEffect(weatherSymbol);
        const intensity = this.calculateIntensity(precipitation);
        
        if (effectType !== this.currentEffect?.type) {
            this.transitionToEffect(effectType, {
                intensity,
                windDirection,
                symbol: weatherSymbol
            });
        }
    }

    mapSymbolToEffect(symbol) {
        for (const [effect, symbols] of Object.entries(this.smhiSymbolMap)) {
            if (symbols.includes(parseInt(symbol))) {
                return effect === 'clear' ? null : effect;
            }
        }
        return null;
    }

    calculateIntensity(precipitation) {
        if (!precipitation || precipitation < 0.1) return 'light';
        if (precipitation < 2.0) return 'medium';
        return 'heavy';
    }

    transitionToEffect(effectType, params) {
        // Fade out current effect
        if (this.currentEffect) {
            this.fadeOutEffect();
        }

        // Start new effect after fade
        setTimeout(() => {
            if (effectType) {
                this.startEffect(effectType, params);
            }
        }, this.config.transitions.fade_duration);
    }

    startEffect(effectType, params) {
        this.createAnimationContainer();
        
        switch (effectType) {
            case 'rain':
            case 'sleet':
                this.currentEffect = new RainEffect(this.config, this.performanceMode);
                break;
            case 'snow':
                this.currentEffect = new SnowEffect(this.config, this.performanceMode);
                break;
        }

        if (this.currentEffect) {
            this.currentEffect.start(this.animationContainer, params);
            this.fadeInEffect();
        }
    }

    createAnimationContainer() {
        if (this.animationContainer) {
            this.animationContainer.remove();
        }

        this.animationContainer = document.createElement('div');
        this.animationContainer.className = 'weather-animation-container';
        this.animationContainer.style.opacity = '0';
        document.body.appendChild(this.animationContainer);
    }

    fadeInEffect() {
        if (this.animationContainer) {
            this.animationContainer.style.opacity = '1';
        }
    }

    fadeOutEffect() {
        if (this.animationContainer) {
            this.animationContainer.style.opacity = '0';
            setTimeout(() => {
                if (this.animationContainer) {
                    this.animationContainer.remove();
                    this.animationContainer = null;
                }
            }, this.config.transitions.fade_duration);
        }
        this.currentEffect = null;
    }
}

class RainEffect {
    constructor(config, performanceMode) {
        this.config = config.rain;
        this.performanceMode = performanceMode;
        this.particles = [];
    }

    start(container, params) {
        const particleCount = this.config.particle_count[this.performanceMode];
        const enableSplashes = this.config.enable_splashes[this.performanceMode];
        
        for (let i = 0; i < particleCount; i++) {
            this.createRainDrop(container, params, enableSplashes);
        }
    }

    createRainDrop(container, params, enableSplashes) {
        const drop = document.createElement('div');
        drop.className = `rain-particle ${this.performanceMode}`;
        
        // Position och timing
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.animationDuration = `${1 + Math.random() * 2}s`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        
        // Wind direction från SMHI
        if (params.windDirection && this.config.wind_effects) {
            if (params.windDirection > 45 && params.windDirection < 135) {
                drop.classList.add('wind-east');
            } else if (params.windDirection > 225 && params.windDirection < 315) {
                drop.classList.add('wind-west');
            }
        }

        container.appendChild(drop);
        this.particles.push(drop);

        // Splash effect
        if (enableSplashes) {
            setTimeout(() => {
                this.createSplash(container, drop);
            }, parseFloat(drop.style.animationDuration) * 1000);
        }
    }

    createSplash(container, drop) {
        const splash = document.createElement('div');
        splash.className = 'rain-splash';
        splash.style.left = drop.style.left;
        splash.style.bottom = '0';
        container.appendChild(splash);
        
        setTimeout(() => splash.remove(), 300);
    }
}

class SnowEffect {
    constructor(config, performanceMode) {
        this.config = config.snow;
        this.performanceMode = performanceMode;
        this.particles = [];
        this.snowChars = ['❄', '❅', '❆', '*', '+'];
        this.colorClasses = ['snow-white', 'snow-light-blue', 'snow-medium-blue', 'snow-crystal'];
    }

    start(container, params) {
        const particleCount = this.config.particle_count[this.performanceMode];
        const enableSparkle = this.config.sparkle_effects[this.performanceMode];
        
        for (let i = 0; i < particleCount; i++) {
            this.createSnowFlake(container, params, enableSparkle);
        }
    }

    createSnowFlake(container, params, enableSparkle) {
        const flake = document.createElement('div');
        flake.className = `snow-particle ${this.performanceMode}`;
        
        // Character och färg
        flake.textContent = this.snowChars[Math.floor(Math.random() * this.snowChars.length)];
        flake.classList.add(this.colorClasses[Math.floor(Math.random() * this.colorClasses.length)]);
        
        // Position och storlek
        flake.style.left = `${Math.random() * 100}%`;
        flake.style.fontSize = `${0.8 + Math.random() * 1.2}em`;
        flake.style.animationDuration = `${3 + Math.random() * 4}s`;
        flake.style.animationDelay = `${Math.random() * 3}s`;
        
        // Sparkle effect
        if (enableSparkle && Math.random() < 0.3) {
            flake.classList.add('sparkle');
        }

        container.appendChild(flake);
        this.particles.push(flake);
    }
}

// Global instance
let weatherAnimations = null;

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    fetch('/static/config/weather_effects_config.json')
        .then(response => response.json())
        .then(config => {
            weatherAnimations = new WeatherAnimationSystem(config);
            console.log('✅ Weather animations initialized');
        })
        .catch(error => {
            console.error('❌ Failed to load weather effects config:', error);
        });
});
```

### 2. **weather_effects.css** - Animation Styling

```css
/**
 * Weather Effects CSS - LP156WH4 optimerad (1366×768)
 * Performance skalad för Pi3B → Desktop
 */

/* === BASE CONTAINER === */
.weather-animation-container {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    overflow: hidden !important;
    z-index: 99999 !important;
    transition: opacity 1s ease-in-out;
}

/* === RAIN EFFECTS === */
.rain-particle {
    position: absolute;
    width: 2px;
    height: 12px;
    background: linear-gradient(to bottom, #4A9EFF, transparent);
    opacity: 0.7;
    border-radius: 50%;
    pointer-events: none;
    top: -20px;
}

/* Performance-baserade animationer */
.rain-particle.pi3b {
    animation: rain-fall-simple 2s linear infinite;
}

.rain-particle.medium {
    animation: rain-fall-medium 1.5s linear infinite;
}

.rain-particle.desktop {
    animation: rain-fall-complex 1s linear infinite;
}

/* Wind direction effects */
.rain-particle.wind-east {
    animation-name: rain-fall-diagonal-right;
}

.rain-particle.wind-west {
    animation-name: rain-fall-diagonal-left;
}

.rain-splash {
    position: absolute;
    width: 8px;
    height: 2px;
    background: #4A9EFF;
    opacity: 0.5;
    border-radius: 50%;
    animation: splash-effect 0.3s ease-out;
}

/* === SNOW EFFECTS === */
.snow-particle {
    position: absolute;
    color: #ffffff;
    opacity: 0.8;
    pointer-events: none;
    font-family: 'Segoe UI', sans-serif;
    user-select: none;
}

/* Performance-baserade snö-animationer */
.snow-particle.pi3b {
    animation: snow-fall-simple 4s linear infinite;
}

.snow-particle.medium {
    animation: snow-fall-medium 3s linear infinite;
}

.snow-particle.desktop {
    animation: snow-fall-complex 2.5s linear infinite;
}

/* Snö färgvariationer */
.snow-white {
    color: #ffffff !important;
}

.snow-light-blue {
    color: #BDE3FF !important;
}

.snow-medium-blue {
    color: #99CCFF !important;
}

.snow-crystal {
    color: #F0F8FF !important;
    text-shadow: 0 0 4px rgba(240, 248, 255, 0.8);
}

/* Sparkle effect */
.snow-particle.sparkle {
    animation: snow-fall-simple 4s linear infinite, snow-sparkle 2s ease-in-out infinite;
}

/* === KEYFRAME ANIMATIONS === */

/* Rain animations - Performance skalad */
@keyframes rain-fall-simple {
    0% { transform: translateY(-20px); opacity: 0.7; }
    100% { transform: translateY(100vh); opacity: 0.3; }
}

@keyframes rain-fall-medium {
    0% { transform: translateY(-20px) scaleY(0.8); opacity: 0.8; }
    100% { transform: translateY(100vh) scaleY(1.2); opacity: 0.2; }
}

@keyframes rain-fall-complex {
    0% { transform: translateY(-20px) scaleY(0.8) rotate(1deg); opacity: 1; }
    50% { transform: translateY(50vh) scaleY(1) rotate(0deg); opacity: 0.6; }
    100% { transform: translateY(100vh) scaleY(1.2) rotate(-1deg); opacity: 0; }
}

/* Diagonal rain för wind effects */
@keyframes rain-fall-diagonal-right {
    0% { transform: translate(0, -20px); }
    100% { transform: translate(20vw, 100vh); }
}

@keyframes rain-fall-diagonal-left {
    0% { transform: translate(0, -20px); }
    100% { transform: translate(-20vw, 100vh); }
}

/* Splash animation */
@keyframes splash-effect {
    0% { transform: scale(0.5); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
}

/* Snow animations - Performance skalad */
@keyframes snow-fall-simple {
    0% { transform: translateY(-10px) rotate(0deg); }
    100% { transform: translateY(100vh) rotate(180deg); }
}

@keyframes snow-fall-medium {
    0% { transform: translateY(-10px) rotate(0deg) translateX(0); }
    25% { transform: translateY(25vh) rotate(90deg) translateX(-10px); }
    75% { transform: translateY(75vh) rotate(270deg) translateX(10px); }
    100% { transform: translateY(100vh) rotate(360deg) translateX(0); }
}

@keyframes snow-fall-complex {
    0% { transform: translateY(-10px) rotate(0deg) translateX(0) scale(0.8); }
    25% { transform: translateY(25vh) rotate(90deg) translateX(-15px) scale(1); }
    50% { transform: translateY(50vh) rotate(180deg) translateX(5px) scale(1.1); }
    75% { transform: translateY(75vh) rotate(270deg) translateX(15px) scale(0.9); }
    100% { transform: translateY(100vh) rotate(360deg) translateX(0) scale(1); }
}

/* Sparkle animation */
@keyframes snow-sparkle {
    0%, 100% { 
        opacity: 0.8; 
        text-shadow: none; 
    }
    50% { 
        opacity: 1; 
        text-shadow: 0 0 8px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.6); 
    }
}

/* === RESPONSIVE OPTIMERING === */

/* Pi3B optimering - Färre partiklar, enklare animationer */
@media (max-width: 1366px) and (max-height: 768px) {
    .rain-particle.pi3b,
    .snow-particle.pi3b {
        animation-duration: 3s; /* Långsammare för mindre CPU load */
    }
}

/* Kraftfulla datorer - Mer komplexa effekter */
@media (min-width: 1920px) and (min-height: 1080px) {
    .weather-animation-container {
        /* Kan hantera fler partiklar */
    }
    
    .rain-particle.desktop,
    .snow-particle.desktop {
        animation-duration: 1s; /* Snabbare för flytande animation */
    }
}

/* === PERFORMANCE OPTIMERINGAR === */

/* Hardware acceleration för smooth animations */
.rain-particle,
.snow-particle {
    will-change: transform, opacity;
    transform: translateZ(0); /* Force GPU acceleration */
    backface-visibility: hidden;
}

/* Reduce motion för accessibility */
@media (prefers-reduced-motion: reduce) {
    .weather-animation-container {
        display: none !important;
    }
}
```

### 3. **weather_effects_config.json** - Configuration

```json
{
    "enabled": true,
    "performance_mode": "auto",
    
    "rain": {
        "enabled": true,
        "particle_count": {
            "pi3b": 15,
            "medium": 35,
            "desktop": 60
        },
        "enable_splashes": {
            "pi3b": false,
            "medium": true,
            "desktop": true
        },
        "wind_effects": true,
        "wind_threshold": 5.0
    },
    
    "snow": {
        "enabled": true,
        "particle_count": {
            "pi3b": 20,
            "medium": 40,
            "desktop": 80
        },
        "color_variations": 4,
        "sparkle_effects": {
            "pi3b": false,
            "medium": true,
            "desktop": true
        },
        "characters": ["❄", "❅", "❆", "*", "+"]
    },
    
    "transitions": {
        "fade_duration": 1000,
        "effect_check_interval": 30000
    },
    
    "debug": {
        "log_weather_changes": true,
        "show_performance_info": false
    }
}
```

---

## 🔧 INTEGRATION MED BEFINTLIG KOD

### Backend Integration (smhi_client.py):

**Utökning av `get_current_weather()` metoden:**
```python
def get_current_weather(self):
    # ... befintlig kod ...
    
    # Lägg till animation trigger data
    if weather_data and weather_data.get('weather_symbol'):
        weather_data['animation_trigger'] = self._get_animation_trigger(
            weather_data['weather_symbol'],
            weather_data.get('precipitation', 0),
            weather_data.get('wind_direction')
        )
    
    return weather_data

def _get_animation_trigger(self, symbol, precipitation, wind_direction):
    """Mappa SMHI weather symbol till animation data"""
    symbol = int(symbol)
    
    # Mapping baserat på SMHI symbols
    if symbol in [8, 9, 10, 18, 19, 20]:  # Regn
        return {
            'type': 'rain',
            'intensity': 'light' if precipitation < 1.0 else 'medium' if precipitation < 5.0 else 'heavy',
            'wind_direction': wind_direction
        }
    elif symbol in [15, 16, 17, 25, 26, 27]:  # Snö
        return {
            'type': 'snow', 
            'intensity': 'light' if precipitation < 0.5 else 'medium' if precipitation < 2.0 else 'heavy',
            'wind_direction': wind_direction
        }
    elif symbol in [12, 13, 14, 22, 23, 24]:  # Snöblandat
        return {
            'type': 'sleet',
            'intensity': 'medium',
            'wind_direction': wind_direction
        }
    else:
        return {'type': 'clear'}
```

### Frontend Integration (dashboard.js):

**Utökning av `updateCurrentWeather()` funktionen:**
```javascript
function updateCurrentWeather(data) {
    // ... befintlig kod för temperatur, ikoner etc ...
    
    // NYTT: Weather animations trigger
    if (data.smhi && data.smhi.animation_trigger && weatherAnimations) {
        const trigger = data.smhi.animation_trigger;
        weatherAnimations.updateFromSMHI(
            data.smhi.weather_symbol,
            data.smhi.precipitation || 0,
            data.smhi.wind_direction || 0
        );
        
        console.log(`🌦️ Weather animation triggered: ${trigger.type} (${trigger.intensity})`);
    }
    
    // ... resten av befintlig kod ...
}
```

**Lägg till i slutet av dashboard.js:**
```javascript
// Weather animations integration
document.addEventListener('DOMContentLoaded', function() {
    // ... befintlig DOMContentLoaded kod ...
    
    // Initialize weather animations after a short delay
    setTimeout(() => {
        if (typeof weatherAnimations !== 'undefined') {
            console.log('🌦️ Weather animations ready');
        }
    }, 1000);
});
```

### HTML Integration (index.html):

**Lägg till före `</body>`:**
```html
<!-- Weather Effects System -->
<script src="/static/js/weather_animations.js"></script>
<link rel="stylesheet" href="/static/css/weather_effects.css">
```

---

## 📊 IMPLEMENTATION PLAN (6 steg)

### **Steg 1: Core Animation System** 
- Skapa `weather_animations.js` med basklass
- Implementera performance detection
- SMHI symbol mapping
- Basic DOM manipulation

### **Steg 2: Rain Effects Implementation**
- RainEffect klass med Pi3B optimering  
- CSS keyframes för regn-animationer
- Wind direction integration
- Splash effects (desktop only)

### **Steg 3: Snow Effects Implementation**
- SnowEffect klass med color variations
- CSS keyframes för snö-animationer  
- Sparkle effects (desktop only)
- Character variations

### **Steg 4: Backend Integration**
- Utöka `smhi_client.py` med animation triggers
- Mapping logic för SMHI weather symbols
- API response utökning

### **Steg 5: Frontend Integration** 
- Integrera i `dashboard.js`
- Configuration loading system
- Update cycle integration
- Error handling

### **Steg 6: Testing & Optimization**
- Pi3B performance testing
- Configuration fine-tuning
- Fallback systems
- Documentation

---

## 🎯 TEKNISKA KRAV & SPECIFIKATIONER

### Performance Targets:
- **Pi3B:** Max 20 partiklar samtidigt, 60% CPU usage target
- **Desktop:** 50-100+ partiklar, smooth 60fps animations
- **Memory:** < 50MB additional usage

### Browser Compatibility:
- Chromium på Pi3B (primary target)
- Modern browsers som fallback
- CSS transforms för hardware acceleration

### LP156WH4 Optimering (1366×768):
- Fullskärms overlay (100% width/height)
- Z-index för att ligga över dashboard content
- Responsive för mindre skärmar som fallback

### Configuration System:
- JSON-baserad konfiguration
- Auto performance detection
- Runtime-omkonfigurering (framtida utökning)

### Error Handling:
- Graceful fallback om animations misslyckas
- Console logging för debug
- No impact på core dashboard funktionalitet

---

## 🔄 EXPECTED RESULTS

### Funktionalitet:
✅ Fullskärms regn när SMHI rapporterar regn (symbol 8-10, 18-20)  
✅ Fullskärms snö när SMHI rapporterar snö (symbol 15-17, 25-27)  
✅ Smooth transitions mellan vädertyper  
✅ Wind direction påverkar regn-riktning  
✅ Performance skalning Pi3B → Desktop  
✅ Helt konfigurerbart via JSON  

### Performance:
✅ <60% CPU på Pi3B under normal användning  
✅ Smooth animationer utan lag på dashboard  
✅ Minimal memory footprint  
✅ Graceful degradation på äldre hardware  

### User Experience:
✅ Immersive väderupplevelse  
✅ Visuell feedback för väderförändringar  
✅ Icke-intrusive (påverkar ej dashboard läsbarhet)  
✅ Accessibility-medveten (reduced motion support)  

---

**📝 Implementation Note:** Denna projektbeskrivning är självständig och innehåller all nödvändig information för implementation utan tillgång till original MMM-WeatherEffects filer. Alla kodexempel är kompletta och kan användas direkt.