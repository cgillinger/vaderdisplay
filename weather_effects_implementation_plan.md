# WeatherEffects Implementation Plan
## Flask Weather Dashboard Integration

**PROJEKTMÅL:** Integrera MagicMirror WeatherEffects-funktionalitet i Flask Weather Dashboard med konfigurerbart läge via config.py

**ARKITEKTUR:** Modulär implementation med minimal påverkan på befintlig kodbase

**MÅLPLATTFORM:** Synology DSM (16GB RAM) + Raspberry Pi 5 (8GB) med Chromium kiosk-läge

---

## 🌦️ MAGICMIRROR WEATHEREFFECTS - DETALJERAD FUNKTIONALITET

### **Kärnfunktioner från MagicMirror-modulen:**

#### **1. Automatisk väderdetektering:**
```javascript
// MM-modul lyssnar på notifikationer från vädermoduler
notificationReceived: function(notification, payload) {
    if (notification === "CURRENTWEATHER_TYPE" && payload && payload.type) {
        const weatherType = payload.type.toLowerCase();
        this.handleWeatherChange(weatherType);
    }
}

// Matchning mot nyckelord
weatherKeywords: {
    rain: ["rain", "showers", "drizzle", "precipitation"],
    snow: ["snow", "sleet", "blizzard", "flurries"]
}
```

#### **2. Dynamisk DOM-manipulation:**
```javascript
// Skapar wrapper för alla effekter
const container = document.createElement("div");
container.className = "weather-effect-wrapper";
container.style.opacity = '0';
document.body.appendChild(container);

// Smooth transitions mellan effekter
transitionTo: function(effectType) {
    if (this.currentEffect && this.effectContainers[this.currentEffect]) {
        const oldContainer = this.effectContainers[this.currentEffect];
        oldContainer.style.opacity = '0';
        setTimeout(() => oldContainer.remove(), this.config.transitionDuration);
    }
}
```

#### **3. Regneffekt-implementation:**
```javascript
createRainEffect: function(container) {
    const { dropletCount, dropletSpeed, windDirection } = this.config.rainConfig;
    
    for (let i = 0; i < dropletCount; i++) {
        const droplet = document.createElement("div");
        droplet.className = `rain-particle ${windDirection}`;
        droplet.style.animationDuration = `${dropletSpeed + Math.random()}s`;
        droplet.style.left = `${Math.random() * 100}%`;
        container.appendChild(droplet);
    }
}
```

#### **4. Snöeffekt-implementation:**
```javascript
createSnowEffect: function(container) {
    const { flakeCount, characters, sparkleEnabled, minSize, maxSize, speed } = this.config.snowConfig;
    
    for (let i = 0; i < flakeCount; i++) {
        const flake = document.createElement("div");
        const colorClass = this.getRandomSnowColor();
        flake.className = `snow-particle ${sparkleEnabled ? 'sparkle' : ''} ${colorClass}`;
        flake.innerHTML = characters[Math.floor(Math.random() * characters.length)];
        flake.style.animationDuration = `${(Math.random() * 2 + 3) / speed}s`;
        flake.style.fontSize = `${Math.random() * (maxSize - minSize) + minSize}em`;
        flake.style.left = `${Math.random() * 100}%`;
        container.appendChild(flake);
    }
}
```

### **CSS-animationer från MagicMirror:**

#### **Regn-animationer:**
```css
.weather-effect-wrapper {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    z-index: 99999999 !important;
}

.rain-particle {
    position: absolute !important;
    width: 4px;
    height: 16px;
    background: linear-gradient(to bottom, #00aaff, transparent);
    opacity: 0.8;
    border-radius: 50%;
    animation: rain-fall linear infinite;
}

@keyframes rain-fall {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(100vh); opacity: 0.5; }
}
```

#### **Snö-animationer:**
```css
.snow-particle {
    position: absolute !important;
    color: white;
    opacity: 0.8;
    animation: snow-fall linear infinite;
}

@keyframes snow-fall {
    0% { transform: translateY(-10px) rotate(0deg); }
    100% { transform: translateY(100vh) rotate(360deg); }
}

.snow-particle.sparkle {
    animation: snow-fall linear infinite, snow-sparkle 2s ease-in-out infinite;
}

@keyframes snow-sparkle {
    0%, 100% { opacity: 0.8; text-shadow: none; }
    50% { opacity: 1; text-shadow: 0 0 8px rgba(255,255,255,0.8); }
}
```

### **MagicMirror konfigurationsstruktur:**
```javascript
defaults: {
    enabled: true,
    intensity: "auto",
    rainConfig: {
        dropletCount: 50,
        dropletSpeed: 2.0,
        windDirection: "none",  // none, left-to-right, right-to-left
        enableSplashes: false
    },
    snowConfig: {
        flakeCount: 25,
        characters: ['*', '+'],
        sparkleEnabled: false,
        minSize: 0.8,
        maxSize: 1.5,
        speed: 1.0
    },
    transitionDuration: 1000
}
```

---

## 📊 TOTALT PÅVERKADE FILER

### Nya filer (skapas):
- `static/js/weather-effects.js` (standalone JavaScript-modul)
- `static/css/weather-effects.css` (CSS-animationer och styling)

### Ändrade filer:
- `reference/config.py` (utökad med weather_effects-konfiguration)
- `app.py` (minimal config-hantering för weather effects)
- `static/js/dashboard.js` (minimal integration - en rad för initiering)
- `templates/index.html` (script-tag för weather-effects.js)

**TOTALT:** 2 nya filer + 4 ändrade filer

---

## 🎯 FAS 1: Standalone WeatherEffects JavaScript-modul
**CHATT-MÅL:** Skapa komplett weather-effects.js som översätter SMHI-data till visuella effekter

### 📋 Uppgifter FAS 1:
1. **Skapa `static/js/weather-effects.js` med förbättrad klass-struktur:**
   - **WeatherEffectsManager:** Huvudklass för effekt-hantering
   - **RainEffect:** Dedikerad klass för regn-animationer 
   - **SnowEffect:** Dedikerad klass för snö-animationer med konfigurerbart mode
   - **Robust error handling:** Graceful fallbacks vid fel

2. **Detaljerad SMHI Symbol Mapping:**
   ```javascript
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
   ```

3. **Konfigurerbart weather_mode system:**
   ```javascript
   class SnowEffect {
       constructor(config) {
           // Auto-sätt characters baserat på mode
           if (config.weather_mode === 'light') {
               this.characters = ['*', '+'];  // MM Light Mode
           } else if (config.weather_mode === 'rich') {
               this.characters = ['❄', '❅', '❆', '*', '+'];  // Rich Mode
           } else if (config.weather_mode === 'custom') {
               this.characters = config.snow_config.characters;  // Full MM-kontroll
           }
       }
   }
   ```

4. **Konfiguration från Flask med error handling:**
   - Läsa config från `/api/weather-effects-config` endpoint
   - Fallback till default-värden vid API-fel
   - Validering av konfigurationsdata
   - Console-logging för felsökning

### 🔧 Tekniska krav FAS 1:
- **JavaScript ES6+ kompatibilitet** (för Pi5 Chromium kiosk-läge)
- **LP156WH4 1366×768 optimering**
- **Samma API** som MM-modulen (createRainEffect, createSnowEffect, etc.)
- **Error handling** för saknad väderdata

### 📝 Leverabler FAS 1:
- ✅ Komplett `static/js/weather-effects.js`
- ✅ SMHI weather_symbol → effekt-logik
- ✅ Konfiguration-läsning från Flask API
- ✅ DOM-manipulation utan MagicMirror-beroenden

### 🔗 Input för FAS 1:
- MagicMirror `MMM-WeatherEffects.js` (referens)
- SMHI weather_symbol dokumentation (1-27)
- Flask API-struktur för konfiguration

---

## 🎨 FAS 2: CSS-styling och animationer
**CHATT-MÅL:** Skapa komplett weather-effects.css med LP156WH4-optimerade animationer

### 📋 Uppgifter FAS 2:
1. **Skapa `static/css/weather-effects.css`**
   - Konvertera MM-modulens CSS till webapp-kompatibel styling
   - Anpassa för LP156WH4 (1366×768) skärmoptimering
   - Säkerställa z-index-kompatibilitet med befintlig dashboard

2. **LP156WH4-optimeringar:**
   - Font-size och animation-speed för 1366×768
   - Ljusstyrka och kontrast för LED LCD-panel
   - Smooth 60fps animationer för Pi5 GPU

3. **CSS-struktur:**
   ```css
   /* Base wrapper */
   .weather-effect-wrapper { ... }
   
   /* Rain effects */
   .rain-particle { ... }
   @keyframes rain-fall { ... }
   
   /* Snow effects */
   .snow-particle { ... }
   @keyframes snow-fall { ... }
   ```

### 🔧 Tekniska krav FAS 2:
- **CSS3 animations** (Chromium Pi5-kompatibla)
- **GPU-acceleration** för smooth animationer
- **Responsive design** för olika viewport-storlekar
- **Tema-kompatibilitet** med befintliga light/dark-teman

### 📝 Leverabler FAS 2:
- ✅ Komplett `static/css/weather-effects.css`
- ✅ LP156WH4-optimerade animationer
- ✅ Smooth 60fps prestanda för Pi5
- ✅ Z-index och layout-kompatibilitet

### 🔗 Input för FAS 2:
- MagicMirror `MMM-WeatherEffects.css` (referens)
- Befintlig `static/css/styles.css` (z-index struktur)
- LP156WH4 displayspecifikationer

---

## ⚙️ FAS 3: Config-systemintegration
**CHATT-MÅL:** Utöka config.py och app.py för WeatherEffects-konfiguration

### 📋 Uppgifter FAS 3:
1. **Utöka `reference/config.py` med förbättrad struktur:**
   ```python
   'weather_effects': {
       'enabled': True,
       'intensity': 'auto',  # auto, light, medium, heavy
       
       # Rain configuration (MM-standard inställningar)
       'rain_config': {
           'droplet_count': 50,        # Standard MM-värde
           'droplet_speed': 2.0,       # Standard MM-hastighet  
           'wind_direction': 'none',   # none, left-to-right, right-to-left
           'enable_splashes': False    # Standard MM-setting
       },
       
       # Snow configuration (MM-standard inställningar)
       'snow_config': {
           'flake_count': 25,          # Standard MM-värde
           'characters': ['*', '+'],   # Standard MM-tecken
           'sparkle_enabled': False,   # Standard MM-setting
           'min_size': 0.8,           # Standard MM-storlek
           'max_size': 1.5,           # Standard MM-storlek
           'speed': 1.0               # Standard MM-hastighet
       },
       
       # Transition settings
       'transition_duration': 1000,   # Standard MM-timing
       
       # Error handling & logging
       'debug_logging': False,        # För felsökning
       'fallback_enabled': True       # Graceful fallbacks
   }
   ```

2. **Utöka `app.py` med robust error handling:**
   - Ny API-endpoint: `/api/weather-effects-config`
   - Validering av weather_effects-konfiguration
   - Fallback till default-värden vid fel
   - Felhantering för saknad konfiguration

3. **SMHI Symbol → Effect mapping validation:**
   - Validera att alla SMHI symbols (1-27) är mappade
   - Error logging för okända weather_symbols
   - Fallback till 'clear' för okända värden

### 🔧 Tekniska krav FAS 3:
- **Bakåtkompatibilitet** med befintlig config-struktur
- **Validering** av weather_effects-konfiguration
- **Error handling** för felaktig konfiguration
- **API-konsistens** med befintliga endpoints

### 📝 Leverabler FAS 3:
- ✅ Utökad `reference/config.py` med weather_effects
- ✅ Utökad `app.py` med `/api/weather-effects-config`
- ✅ Config-validering och error handling
- ✅ Standard-konfiguration för Pi5-miljö

### 🔗 Input för FAS 3:
- Befintlig `reference/config.py` (struktur och standard)
- Befintlig `app.py` (API-pattern och routing)
- MagicMirror config-struktur (för kompatibilitet)

---

## 🔌 FAS 4: Frontend-integration
**CHATT-MÅL:** Minimal integration i dashboard.js och HTML template

### 📋 Uppgifter FAS 4:
1. **Minimal men robust ändring i `static/js/dashboard.js`:**
   ```javascript
   // I initializeDashboard() - bara 2-3 rader tillägg
   if (weatherState.config.weather_effects?.enabled) {
       initializeWeatherEffects().catch(error => {
           console.warn('WeatherEffects initialization failed:', error);
           // Dashboard fortsätter fungera normalt
       });
   }
   
   // I updateCurrentWeather() - bara 3-4 rader tillägg  
   if (data.smhi?.weather_symbol && window.weatherEffectsManager) {
       try {
           weatherEffectsManager.updateFromSMHI(
               data.smhi.weather_symbol,
               data.smhi.precipitation || 0,
               data.smhi.wind_direction || 0
           );
       } catch (error) {
           console.warn('WeatherEffects update failed:', error);
           // Ingen påverkan på dashboard-funktionalitet
       }
   }
   ```

2. **Utöka `templates/index.html` med conditional loading:**
   ```html
   <!-- Lägg till i <head> - conditional CSS -->
   {% if config.weather_effects.enabled %}
   <link rel="stylesheet" href="/static/css/weather-effects.css">
   {% endif %}
   
   <!-- Lägg till före closing </body> - conditional JS -->
   {% if config.weather_effects.enabled %}
   <script src="/static/js/weather-effects.js"></script>
   {% endif %}
   ```

3. **Robust integration med SMHI data:**
   - Validering av weather_symbol från SMHI API
   - Error handling för saknad väderdata  
   - Graceful fallback om WeatherEffects misslyckas
   - Ingen påverkan på core dashboard vid fel

### 🔧 Tekniska krav FAS 4:
- **Minimal påverkan** på befintlig kod (max 5 rader ändringar)
- **Lazy loading** av WeatherEffects (bara när aktiverat)
- **Graceful degradation** om JavaScript misslyckas
- **Integration med befintlig cache-struktur**

### 📝 Leverabler FAS 4:
- ✅ Minimal uppdatering av `static/js/dashboard.js`
- ✅ Script-integration i `templates/index.html`
- ✅ WeatherEffects-aktivering baserat på SMHI-data
- ✅ Enable/disable-funktionalitet

### 🔗 Input för FAS 4:
- Befintlig `static/js/dashboard.js` (updateCurrentWeather-funktion)
- Befintlig `templates/index.html` (script-struktur)
- SMHI weather_symbol från API-respons

---

## 🧪 FAS 5: Testning och finjustering
**CHATT-MÅL:** Komplett testning och performance-optimering för produktion

### 📋 Uppgifter FAS 5:
1. **Funktionell testning:**
   - Testa alla SMHI weather_symbols (1-27)
   - Verifiera regn/snö-effekter visuellt
   - Testa enable/disable via config.py
   - Validera smooth transitions

2. **Performance-testning på Pi5:**
   - Validera smooth 60fps animationer
   - Frame-rate mätning på LP156WH4
   - Memory-usage över tid (Pi5 8GB kapacitet)
   - Synology DSM server-load under kontinuerlig drift

3. **Edge case-hantering:**
   - Saknad väderdata
   - Felaktig weather_symbol
   - Config-fel och fallbacks
   - Browser-kompatibilitet (Chromium kiosk-läge)

4. **Dokumentation:**
   - README-uppdatering med WeatherEffects
   - Config-exempel för olika prestanda-nivåer
   - Troubleshooting-guide

### 🔧 Tekniska krav FAS 5:
- **Stabil prestanda** på Pi5 under kontinuerlig drift
- **Visuell kvalitet** anpassad för LP156WH4
- **Error-resilience** för produktions-environment
- **User-friendly configuration**

### 📝 Leverabler FAS 5:
- ✅ Komplett funktionstestning av alla effekter
- ✅ Performance-rapport för Synology DSM + Pi5-setup
- ✅ Edge case-hantering och error recovery
- ✅ Uppdaterad dokumentation och config-guide

### 🔗 Input för FAS 5:
- Komplett implementering från FAS 1-4
- Synology DSM + Pi5 testmiljö för performance-mätning
- LP156WH4 för visuell kvalitetskontroll

---

## 📋 BACKUP-INSTRUKTIONER PER FAS

### Innan varje fas, kör:
```bash
# === BACKUP KOMMANDO (kopiera och kör) ===
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup/weather_effects_fas[X]_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
cp [ÄNDRADE_FILER] "$BACKUP_DIR/"
echo "✅ Backup: $BACKUP_DIR/"
# === SLUTFÖR BACKUP FÖRE FORTSÄTTNING ===
```

### FAS-specifika backup-filer:
- **FAS 1:** Inga befintliga filer ändras (endast nya skapas)
- **FAS 2:** Inga befintliga filer ändras (endast nya skapas)
- **FAS 3:** `reference/config.py`, `app.py`
- **FAS 4:** `static/js/dashboard.js`, `templates/index.html`
- **FAS 5:** Alla ändrade filer från FAS 1-4 (säkerhetsbackup)

---

## 🎯 FRAMGÅNGSKRITERIER

### Efter varje fas ska följande fungera:
1. **FAS 1:** WeatherEffects-JavaScript kan läsa SMHI-data och skapa effekter
2. **FAS 2:** CSS-animationer visar smooth regn/snö på LP156WH4
3. **FAS 3:** Config.py weather_effects-inställningar läses av Flask API
4. **FAS 4:** WeatherEffects aktiveras automatiskt baserat på SMHI weather_symbol
5. **FAS 5:** Hela systemet fungerar stabilt på Synology DSM + Pi5 i produktionsmiljö

### Slutligt mål:
✅ **Identisk funktionalitet** som MagicMirror WeatherEffects
✅ **Konfigurerbart** via config.py (enabled: True/False)
✅ **Modulär implementation** utan påverkan på kärnfunktionalitet
✅ **LP156WH4-optimerat** för bästa visuella kvalitet
✅ **Pi5-prestanda** med smooth 60fps animationer

---

## 💡 ANTECKNINGAR FÖR AI-IMPLEMENTERING

### Viktiga designprinciper:
- **Modulär separation:** WeatherEffects ska vara helt fristående
- **Minimal integration:** Max 5 rader ändringar i befintlig kod
- **Standard MM-kvalitet:** Använd samma inställningar som MagicMirror (inga performance-reduktioner)
- **Robust error handling:** Systemet ska fungera även om WeatherEffects misslyckas
- **Klass-baserad arkitektur:** Förbättrad struktur från dokumentet men enkel implementation

### SMHI weather_symbol mapping är KRITISK (förbättrad från dokumentet):
- **Regn:** 8-10, 18-20 (regnskurar, regn)
- **Snö:** 15-17, 25-27 (snöbyar, snöfall) 
- **Snöblandat:** 12-14, 22-24 (snöblandat regn - behandlas som snö)
- **Åska:** 11, 21 (behandlas som intensivt regn)
- **Klart:** 1-7 (ingen effekt)

### LP156WH4 (1366×768) optimeringar:
- Font-sizes ska vara anpassade för denna upplösning
- Animation-speeds optimerade för Pi5 GPU
- Z-index kompatibilitet med befintlig glassmorphism-styling
- Synology DSM backend med 16GB RAM (inga server-side begränsningar)

### Error handling principer (lånat från dokumentet):
- **Graceful degradation:** Dashboard fungerar utan WeatherEffects
- **Console logging:** För debug men ingen störning av användare  
- **Fallback values:** Default-konfiguration om API misslyckas
- **Try-catch blocks:** Runt alla WeatherEffects-anrop