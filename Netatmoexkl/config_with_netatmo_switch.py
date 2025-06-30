# config.py - Weather Dashboard Configuration
# Riktiga Python-kommentarer för tydlig konfiguration!
# FAS 1: Netatmo-oberoende funktionalitet tillagd

CONFIG = {
    # === NETATMO CONFIGURATION & TOGGLE ===
    'use_netatmo': True,  # HUVUDVÄXEL: True = Med Netatmo, False = Bara SMHI (NYT!)
    
    'netatmo': {
        'client_id': '6848077b1c8bb27c8809e259',
        'client_secret': 'WZ1vJos04mu7SlL1QmsMv3cZ1OURHF',
        'refresh_token': '5c3dd9b22733bf0c008b8f1c|a7be84ead1b2e9ce13a4781fdab434f3',
        'preferred_station': 'Utomhus',  # Vilken station som prioriteras för visning (smart blending använder alla)
        'comment': 'Konfiguration för Netatmo-väderstation. Ignoreras om use_netatmo=False.'
    },
    
    # === LOCATION CONFIGURATION ===
    'smhi': {
        # AKTIV: Stockholm (original)
        'latitude': 59.3293,    
        'longitude': 18.0686,   
        
        # ALTERNATIV: Täby - Ella Gård (närmare Netatmo-stationer)
        # 'latitude': 59.4644,
        # 'longitude': 18.0698,
        
        'comment': 'SMHI-koordinater. Täby (59.4644, 18.0698) kan ge mer representativ data för Netatmo-jämförelser.',
        'other_cities': 'Göteborg 57.7089,11.9746 | Malmö 55.6050,13.0038 | Uppsala 59.8586,17.6389'
    },
    
    'ipgeolocation': {
        'api_key': '8fd423c5ca0c49f198f9598baeb5a059',  # API-nyckel för exakta soltider från ipgeolocation.io
        'comment': 'Hämta gratis API-nyckel från https://ipgeolocation.io/ för exakta soltider. Om tom används förenklad beräkning.'
    },
    
    'display': {
        'location_name': 'Stockholm',  # Ortnamn som visas på skärmen
        'comment': 'Namn på ort som visas på skärmen - hjälper användaren förstå var data kommer ifrån'
    },
    
    'ui': {
        'fullscreen': True,             # True/False - Fullskärmsläge för kiosk
        'refresh_interval_minutes': 15,         # 5-60 minuter - SMHI data-uppdatering (rekommenderat: 15)
        'netatmo_refresh_interval_minutes': 10, # 5-30 minuter - Netatmo snabb-uppdatering (ignoreras om use_netatmo=False)
        
        # VINDENHETER - AKTIV: 'land' (svensk landterminologi)
        'wind_unit': 'land',    # ALTERNATIV: 'sjo', 'land', 'beaufort', 'ms', 'kmh' (se guide nedan)
        
        # TEMA - AKTIV: 'dark' (enda produktionsklara temat)  
        'theme': 'dark',        # ALTERNATIV: 'light' (EJ produktionsklar!), 'dark', 'auto'
        
        # Automatiskt tema-byte (används när theme='auto')
        'auto_theme': {
            'day_theme': 'light',     # Tema för dagtid
            'night_theme': 'dark',    # Tema för natttid  
            'night_start': '21:00',   # När natttema börjar (HH:MM)
            'night_end': '06:00'      # När natttema slutar (HH:MM)
        },
        
        # Fönsterinställningar (används ej i kiosk-läge)
        'window_width': 1000,    # 800-1920 pixlar
        'window_height': 700,    # 600-1080 pixlar
        
        # Sol-funktioner
        'show_sun_times': True,  # True/False - Visa soluppgång/solnedgång
        'sun_cache_hours': 24    # 1-168 timmar - Hur länge soltider cachas
    }
}

# =============================================================================
# NETATMO-VÄXEL GUIDE - NYT I FAS 1
# =============================================================================

# use_netatmo = True  (STANDARD)
# ✅ Full funktionalitet med alla Netatmo-sensorer
# ✅ Faktisk temperatur från Netatmo
# ✅ CO2-mätning och luftkvalitet
# ✅ Ljudnivå-mätning
# ✅ Trycktrend baserad på Netatmo-historik
# ✅ Smart data-blending från flera stationer

# use_netatmo = False  (SMHI-ONLY MODE)
# ⚡ Enbart SMHI-baserad väderapp
# ❌ Ingen faktisk temperatur (bara prognos)
# ❌ Ingen CO2/luftkvalitet-data
# ❌ Ingen ljudnivå-data
# ✅ Luftfuktighet och tryck från SMHI
# ✅ Förenklad trycktrend från SMHI-prognoser
# ✅ Bibehållen design och funktionalitet

# BYTE MELLAN LÄGEN:
# 1. Ändra 'use_netatmo' till True/False
# 2. Starta om Flask-servern (python3 app.py)
# 3. Ladda om webbläsarsidan
# 4. Appen anpassar sig automatiskt

# =============================================================================
# VINDENHETER GUIDE - Fullständig lista över tillgängliga alternativ
# =============================================================================

# AKTIV: 'land' = Svensk landterminologi enligt Beaufort-skalan
# 0: Lugnt (<1 km/h)
# 1-2: Svag vind (1-11 km/h) 
# 3-4: Måttlig vind (12-28 km/h)
# 5-6: Frisk vind (29-49 km/h)
# 7-9: Hård vind (50-88 km/h)
# 10-11: Storm (89-117 km/h)
# 12: Orkan (118+ km/h)

# ALTERNATIV:
# 'sjo'     = Sjöterminologi: Stiltje, Bris, Kuling, Storm, Orkan
# 'beaufort'= Beaufort 0-12 med svenska namn (Lugnt, Svag vind, etc.)
# 'ms'      = X.X m/s (decimaler) - Teknisk mätning
# 'kmh'     = XX km/h (heltal) - Vardagligt format

# =============================================================================
# TEMA GUIDE
# =============================================================================

# AKTIV: 'dark' = Mörkt tema (enda fullt utvecklade temat)
# VARNING: 'light' = Ljust tema (EJ produktionsklart - mycket fult!)
# 'auto' = Växlar automatiskt enligt auto_theme-tider

# =============================================================================
# UPPDATERINGSINTERVALL GUIDE
# =============================================================================

# AKTUELLA: 15/10 minuter (balanserat för Pi3B)
# Snabb:    5/5 minuter (mer CPU-belastning)
# Standard: 15/10 minuter (rekommenderat)
# Sparsamhet: 30/20 minuter (låg CPU-belastning)

# =============================================================================
# KOORDINATER FÖR SVENSKA STÄDER
# =============================================================================

# Stockholm: 59.3293, 18.0686  (AKTIV)
# Täby/Ella Gård: 59.4644, 18.0698  (ALTERNATIV - närmare Netatmo-stationer)
# Göteborg:  57.7089, 11.9746
# Malmö:     55.6050, 13.0038
# Uppsala:   59.8586, 17.6389
# Linköping: 58.4108, 15.6214
# Örebro:    59.2741, 15.2066
# Västerås:  59.6162, 16.5528

# =============================================================================
# SNABBGUIDE FÖR ÄNDRINGAR
# =============================================================================

# För att köra UTAN Netatmo (SMHI-only):
# 1. Ändra 'use_netatmo' till False
# 2. Starta om Flask-servern (python3 app.py)
# 3. Ladda om webbläsarsidan
# 4. Appen visar bara SMHI-data automatiskt

# För att byta vindenheter:
# 1. Ändra 'wind_unit' till önskat alternativ
# 2. Starta om Flask-servern (python3 app.py)
# 3. Ladda om webbläsarsidan

# För att byta ort:
# 1. Ändra 'latitude', 'longitude' och 'location_name'
# 2. Starta om Flask-servern
# 3. Vänta några minuter på första datahämtningen

# För att ändra uppdateringsintervall:
# 1. Ändra 'refresh_interval_minutes' och/eller 'netatmo_refresh_interval_minutes'
# 2. Starta om Flask-servern
# 3. Effekt syns på nästa uppdateringscykel