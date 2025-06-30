# config.example.py - Weather Dashboard Configuration Template
# =============================================================================
# 🔒 SÄKERHET: Denna fil innehåller INGA riktiga tokens/nycklar
# 📁 SETUP: Kopiera till config.py och fyll i dina riktiga värden
# 🚫 VARNING: Lägg ALDRIG till config.py till Git - den innehåller hemligheter!
# =============================================================================

CONFIG = {
    # ⚡ HUVUDINSTÄLLNING: Välj mellan SMHI-only eller SMHI+Netatmo
    # 📊 False = SMHI-only (STANDARD) - Enbart väderprognos från SMHI
    # 🏠 True = SMHI+Netatmo - Prognos från SMHI + faktisk data från din väderstation
    'use_netatmo': False,  # ← ÄNDRA TILL True OM du har Netatmo-väderstation
    
    'smhi': {
        # 📍 OFFENTLIGA KOORDINATER - Stockholm som standard
        'latitude': 59.3293,    # Stockholm koordinater (offentlig information)
        'longitude': 18.0686,   # Andra städer: Täby/Ellagård 59.4644,18.0698 | Göteborg 57.7089,11.9746 | Malmö 55.6050,13.0038 | Uppsala 59.8586,17.6389
        # 💡 TIPS: Täby/Ellagård (59.4644, 18.0698) kan ge mer representativ data för Netatmo-jämförelser
    },
    
    'netatmo': {
        # 🔐 KÄNSLIGA NETATMO API-UPPGIFTER - Behövs ENDAST om use_netatmo=True
        # ⚠️  Lämna som de är om du bara vill använda SMHI (use_netatmo=False)
        'client_id': 'YOUR_NETATMO_CLIENT_ID_HERE',              # Från https://dev.netatmo.com/apps
        'client_secret': 'YOUR_NETATMO_CLIENT_SECRET_HERE',      # Från https://dev.netatmo.com/apps  
        'refresh_token': 'YOUR_NETATMO_REFRESH_TOKEN_HERE',      # Från första OAuth-autentiseringen
        'preferred_station': 'Utomhus',  # Vilken station som prioriteras för visning (smart blending använder alla)
        'comment': 'Konfiguration för Netatmo-väderstation. Ignoreras helt om use_netatmo=False.'
    },
    
    'ipgeolocation': {
        # 🔐 KÄNSLIG API-NYCKEL - Fyll i din riktiga nyckel (VALFRITT)
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
# 🎯 VIKTIGT: FÖRSTÅ SKILLNADEN MELLAN LÄGENA
# =============================================================================

# 📊 SMHI-ONLY LÄGE (use_netatmo = False) - STANDARD & REKOMMENDERAT FÖR NYBÖRJARE
# ✅ Fungerar direkt utan extra setup
# ✅ Visar väderprognos från SMHI
# ✅ Visar luftfuktighet från SMHI observationer  
# ✅ Visar lufttryck från SMHI
# ✅ Enkel trycktrend baserad på SMHI-data
# ❌ Ingen faktisk temperatur från din plats
# ❌ Ingen CO2-mätning eller ljudnivå

# 🏠 SMHI+NETATMO LÄGE (use_netatmo = True) - FÖR AVANCERADE ANVÄNDARE MED VÄDERSTATION
# ✅ Allt från SMHI-only läget PLUS:
# ✅ Faktisk temperatur från din Netatmo-väderstation
# ✅ CO2-mätning och luftkvalitet
# ✅ Ljudnivå-mätning
# ✅ Avancerad trycktrend baserad på Netatmo-historik
# ✅ Smart data-blending från flera stationer
# ❌ Kräver Netatmo-väderstation och API-setup

# 💡 REKOMMENDATION: Börja med use_netatmo=False, uppgradera senare om du skaffar väderstation

# =============================================================================
# 🚀 SNABB SETUP-GUIDE FÖR NYBÖRJARE
# =============================================================================

# 🎯 STEG 1: GRUNDSETUP (SMHI-ONLY)
#    1. Kopiera denna fil: cp config.example.py config.py
#    2. Öppna config.py i en texteditor
#    3. Ändra koordinater om du inte bor i Stockholm (se städer nedan)
#    4. Ändra location_name till ditt ortnamn
#    5. Spara filen och kör: python3 app.py
#    ✅ KLART! Du har en fungerande väder-dashboard

# 🏠 STEG 2: LÄGG TILL NETATMO (VALFRITT - AVANCERAT)
#    1. Skaffa Netatmo-väderstation
#    2. Gå till https://dev.netatmo.com/apps
#    3. Skapa en ny app eller använd befintlig
#    4. Anteckna Client ID och Client Secret
#    5. Genomför OAuth-flow för att få refresh_token
#    6. Öppna config.py och sätt use_netatmo = True
#    7. Ersätt alla 'YOUR_NETATMO_*_HERE' med riktiga värden
#    8. Starta om: python3 app.py

# 🌅 STEG 3: FÖRBÄTTRA SOLTIDER (VALFRITT)
#    1. Gå till https://ipgeolocation.io/
#    2. Registrera dig för gratis konto (1000 anrop/månad)
#    3. Kopiera din API-nyckel
#    4. Ersätt 'YOUR_IPGEOLOCATION_API_KEY_HERE' med din nyckel
#    (Om du hoppar över detta används förenklad solberäkning)

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
# Täby/Ellagård: 59.4644, 18.0698  (ALTERNATIV - närmare Netatmo-stationer)
# Göteborg:  57.7089, 11.9746
# Malmö:     55.6050, 13.0038
# Uppsala:   59.8586, 17.6389
# Linköping: 58.4108, 15.6214
# Örebro:    59.2741, 15.2066
# Västerås:  59.6162, 16.5528

# =============================================================================
# FELSÖKNING - VANLIGA PROBLEM OCH LÖSNINGAR
# =============================================================================

# ❌ PROBLEM: "Import error för config"
# ✅ LÖSNING: Kontrollera att config.py finns (ej config.example.py)

# ❌ PROBLEM: "Kan inte starta utan giltig konfiguration"
# ✅ LÖSNING: Kontrollera att config.py är korrekt kopierad och har rätt format

# ❌ PROBLEM: "Fel koordinater/fel väder"
# ✅ LÖSNING: Kontrollera latitude/longitude i config.py

# ❌ PROBLEM: "Netatmo autentiseringsfel" (ENDAST om use_netatmo=True)
# ✅ LÖSNING: Kontrollera client_id, client_secret och refresh_token

# ❌ PROBLEM: "Inga soltider eller konstiga tider"
# ✅ LÖSNING: Kontrollera ipgeolocation api_key eller använd fallback-beräkning

# ❌ PROBLEM: "Vinddata visas fel"
# ✅ LÖSNING: Kontrollera wind_unit-inställning

# ❌ PROBLEM: "Dashboard visar fel läge"
# ✅ LÖSNING: Kontrollera use_netatmo inställningen (True/False)

# =============================================================================
# HUR DU ÄNDRAR MELLAN LÄGENA
# =============================================================================

# 📊 FÖR ATT KÖRA SMHI-ONLY (STANDARD):
#    1. Öppna config.py
#    2. Sätt: use_netatmo = False
#    3. Spara filen
#    4. Starta om: python3 app.py
#    → Du ser bara SMHI-väderprognos

# 🏠 FÖR ATT LÄGGA TILL NETATMO:
#    1. Sätt upp Netatmo API-uppgifter först (se guide ovan)
#    2. Öppna config.py
#    3. Sätt: use_netatmo = True
#    4. Spara filen
#    5. Starta om: python3 app.py
#    → Du ser SMHI + faktisk data från din väderstation

# =============================================================================
# SÄKERHET OCH BACKUP
# =============================================================================

# ⚠️  VIKTIGT: config.py innehåller känsliga API-nycklar (om du använder Netatmo)
# 🔒 LÄGG ALDRIG till config.py i Git (är utesluten via .gitignore)
# 💾 GÖR backup av config.py före uppdateringar
# 🔄 Använd environment variables i produktion för extra säkerhet

# =============================================================================
# SUPPORT OCH HJÄLP
# =============================================================================

# 📚 OM DU BEHÖVER HJÄLP:
#    1. Kontrollera att du följt setup-guiden ovan
#    2. Kolla felsökningssektionen
#    3. Testa med SMHI-only läget först (use_netatmo=False)
#    4. Kontrollera loggar när du kör python3 app.py