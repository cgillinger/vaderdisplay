# config.example.py - Weather Dashboard Configuration Template
# =============================================================================
# 🔒 SÄKERHET: Denna fil innehåller INGA riktiga tokens/nycklar
# 📁 SETUP: Kopiera till config.py och fyll i dina riktiga värden
# 🚫 VARNING: Lägg ALDRIG till config.py till Git - den innehåller hemligheter!
# =============================================================================

CONFIG = {
    'smhi': {
        # 📍 OFFENTLIGA KOORDINATER - Stockholm som standard
        'latitude': 59.3293,    # Stockholm koordinater (offentlig information)
        'longitude': 18.0686,   # Andra städer: Göteborg 57.7089,11.9746 | Malmö 55.6050,13.0038 | Uppsala 59.8586,17.6389
    },
    
    'netatmo': {
        # 🔐 KÄNSLIGA NETATMO API-UPPGIFTER - Fyll i dina riktiga värden
        'client_id': 'YOUR_NETATMO_CLIENT_ID_HERE',              # Från https://dev.netatmo.com/apps
        'client_secret': 'YOUR_NETATMO_CLIENT_SECRET_HERE',      # Från https://dev.netatmo.com/apps  
        'refresh_token': 'YOUR_NETATMO_REFRESH_TOKEN_HERE',      # Från första OAuth-autentiseringen
        'preferred_station': 'Utomhus',  # Vilken station som prioriteras för visning (smart blending använder alla)
    },
    
    'ipgeolocation': {
        # 🔐 KÄNSLIG API-NYCKEL - Fyll i din riktiga nyckel
        'api_key': 'YOUR_IPGEOLOCATION_API_KEY_HERE',           # Gratis från https://ipgeolocation.io/
        'comment': 'Hämta gratis API-nyckel från https://ipgeolocation.io/ för exakta soltider. Om tom används förenklad beräkning.'
    },
    
    'display': {
        # 📍 OFFENTLIG ORTNAMN-INSTÄLLNING
        'location_name': 'Stockholm',  # Ortnamn som visas på skärmen
        'comment': 'Namn på ort som visas på skärmen - hjälper användaren förstå var data kommer ifrån'
    },
    
    'ui': {
        # 🎛️ OFFENTLIGA UI-INSTÄLLNINGAR - Anpassa efter behov
        'fullscreen': True,                      # True/False - Fullskärmsläge för kiosk
        'refresh_interval_minutes': 15,         # 5-60 minuter - SMHI data-uppdatering (rekommenderat: 15)
        'netatmo_refresh_interval_minutes': 10, # 5-30 minuter - Netatmo snabb-uppdatering (rekommenderat: 10)
        
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
# 🚀 SNABB SETUP-GUIDE
# =============================================================================

# 1. KOPIERA DENNA FIL:
#    cp config.example.py config.py

# 2. SKAFFA NETATMO API-UPPGIFTER:
#    - Gå till https://dev.netatmo.com/apps
#    - Skapa en ny app eller använd befintlig
#    - Anteckna Client ID och Client Secret
#    - Genomför OAuth-flow för att få refresh_token

# 3. SKAFFA IPGEOLOCATION API-NYCKEL (VALFRITT):
#    - Gå till https://ipgeolocation.io/
#    - Registrera dig för gratis konto
#    - Kopiera din API-nyckel
#    - (Om du hoppar över detta används förenklad solberäkning)

# 4. FYLL I DINA VÄRDEN I config.py:
#    - Ersätt alla 'YOUR_*_HERE' med riktiga värden
#    - Ändra koordinater om du inte bor i Stockholm
#    - Anpassa location_name till ditt ortnamn

# 5. TESTA KONFIGURATIONEN:
#    python3 app.py

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

# Stockholm: 59.3293, 18.0686  (STANDARD)
# Göteborg:  57.7089, 11.9746
# Malmö:     55.6050, 13.0038
# Uppsala:   59.8586, 17.6389
# Linköping: 58.4108, 15.6214
# Örebro:    59.2741, 15.2066
# Västerås:  59.6162, 16.5528

# =============================================================================
# FELSÖKNING
# =============================================================================

# PROBLEM: "Import error för config"
# LÖSNING: Kontrollera att config.py finns (ej config.example.py)

# PROBLEM: "Netatmo autentiseringsfel"
# LÖSNING: Kontrollera client_id, client_secret och refresh_token

# PROBLEM: "Inga soltider"
# LÖSNING: Kontrollera ipgeolocation api_key eller använd fallback-beräkning

# PROBLEM: "Vinddata visas fel"
# LÖSNING: Kontrollera wind_unit-inställning

# =============================================================================
# SÄKERHET OCH BACKUP
# =============================================================================

# ⚠️  VIKTIGT: config.py innehåller känsliga API-nycklar
# 🔒 LÄGG ALDRIG till config.py i Git (är utesluten via .gitignore)
# 💾 GÖR backup av config.py före uppdateringar
# 🔄 Använd environment variables i produktion för extra säkerhet