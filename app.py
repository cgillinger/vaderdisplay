#!/usr/bin/env python3
"""
Flask Weather Dashboard - Refaktorerad Main Application
FAS 2: ARKITEKTUR-REFAKTORERING - Modulär uppbyggnad med separata ansvarsområden

FÖRE: 764 rader monolitisk app.py med allt i en fil
EFTER: 150 rader fokuserad app.py + modulära komponenter

Moduler:
- core/weather_state.py     - Centraliserad state management
- core/config_manager.py    - Konfigurationshantering
- core/weather_updater.py   - Data-uppdateringar + background tasks
- api/weather_routes.py     - Väder API-endpoints
- api/effects_routes.py     - WeatherEffects API-endpoints  
- api/system_routes.py      - System/debug API-endpoints
- utils/data_formatters.py  - API-dataformatering
- utils/pressure_utils.py   - Trycktrend-funktioner
"""

from flask import Flask, render_template
import sys
import os

# Lägg till lokala moduler i Python path
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

print(f"🔧 Python path: {project_root}")

# Importera refaktorerade moduler med try/catch för bättre felsökning
try:
    from core.config_manager import load_config, get_current_theme
    from core.weather_state import get_weather_state, update_weather_state
    from core.weather_updater import init_api_clients, start_background_tasks
    print("✅ Core moduler importerade")
except ImportError as e:
    print(f"❌ Core import fel: {e}")
    sys.exit(1)

try:
    from api.weather_routes import weather_bp
    from api.effects_routes import effects_bp
    from api.system_routes import system_bp
    print("✅ API moduler importerade")
except ImportError as e:
    print(f"❌ API import fel: {e}")
    sys.exit(1)

# Flask app setup
app = Flask(__name__)
app.config['SECRET_KEY'] = 'weather_dashboard_secret_key'


# === MAIN ROUTE (FRONTEND) ===

@app.route('/')
def index():
    """Huvudsida för väder-dashboard."""
    weather_state = get_weather_state()
    
    # Standard location om config inte laddad
    location_name = "Stockholm"
    if weather_state['config']:
        location_name = weather_state['config'].get('display', {}).get('location_name', 'Stockholm')
    
    # Aktuellt tema
    current_theme = get_current_theme(weather_state['config'])
    
    # FAS 2: Tillhandahåll WeatherEffects-status till template
    template_vars = {
        'location_name': location_name,
        'theme': current_theme,
        'weather_effects_enabled': weather_state['weather_effects_enabled'],
        'system_mode': _get_system_mode_display()
    }
    
    return render_template('index.html', **template_vars)


# === API BLUEPRINTS REGISTRATION ===

def register_api_blueprints():
    """Registrera alla API Blueprint-moduler."""
    app.register_blueprint(weather_bp)
    app.register_blueprint(effects_bp)
    app.register_blueprint(system_bp)
    
    print("✅ API Blueprints registrerade:")
    print("   🌤️ weather_bp - Väder-endpoints")
    print("   🌦️ effects_bp - WeatherEffects-endpoints")
    print("   🔧 system_bp - System/debug-endpoints")


# === APPLICATION INITIALIZATION ===

def initialize_app():
    """Initialisera Flask Weather Dashboard med refaktorerad arkitektur."""
    print("🚀 FAS 2: Startar refaktorerad Flask Weather Dashboard...")
    print("=" * 80)
    print("📂 ARKITEKTUR: Modulär uppbyggnad med separata ansvarsområden")
    print("📄 FÖRE: 764 rader monolitisk app.py")
    print("📄 EFTER: 150 rader fokuserad app.py + 8 modulära komponenter")
    print("=" * 80)
    
    # STEG 1: Ladda konfiguration
    print("🔧 STEG 1: Laddar konfiguration...")
    config = load_config()
    if not config:
        print("❌ Kan inte starta utan giltig konfiguration")
        return False
    
    update_weather_state('config', config)
    print(f"✅ STEG 1: Konfiguration laddad ({_get_config_summary()})")
    
    # STEG 2: Initialisera API-klienter
    print("🔧 STEG 2: Initialiserar API-klienter...")
    api_clients_ok = init_api_clients(config)
    if not api_clients_ok:
        print("⚠️ STEG 2: Vissa API-klienter misslyckades - fortsätter ändå")
    else:
        print(f"✅ STEG 2: API-klienter initierade ({_get_api_summary()})")
    
    # STEG 3: Registrera API routes
    print("🔧 STEG 3: Registrerar API Blueprint-moduler...")
    register_api_blueprints()
    print("✅ STEG 3: API-moduler registrerade")
    
    # STEG 4: Starta background tasks
    print("🔧 STEG 4: Startar background tasks...")
    start_background_tasks(config)
    print("✅ STEG 4: Background tasks startade")
    
    # SLUTRAPPORT
    _print_startup_summary()
    
    return True


# === HELPER FUNCTIONS ===

def _get_system_mode_display():
    """Hämta systemläge för display."""
    from core.weather_state import get_system_mode
    try:
        return get_system_mode()
    except:
        return "Loading..."


def _get_config_summary():
    """Sammanfattning av laddad konfiguration."""
    weather_state = get_weather_state()
    config = weather_state['config']
    
    if not config:
        return "Ingen config"
    
    location = config.get('display', {}).get('location_name', 'Unknown')
    theme = config.get('ui', {}).get('theme', 'dark')
    netatmo = "ON" if weather_state['use_netatmo'] else "OFF"
    effects = "ON" if weather_state['weather_effects_enabled'] else "OFF"
    
    return f"{location}, tema: {theme}, Netatmo: {netatmo}, Effects: {effects}"


def _get_api_summary():
    """Sammanfattning av API-klientstatus."""
    from core.weather_updater import get_api_status
    
    try:
        status = get_api_status()
        smhi = "✅" if status['smhi_active'] else "❌"
        netatmo = "✅" if status['netatmo_active'] else ("🔧" if status['netatmo_configured'] else "❌")
        sun = "✅" if status['sun_calc_active'] else "❌"
        
        return f"SMHI: {smhi}, Netatmo: {netatmo}, Sol: {sun}"
    except:
        return "Status okänd"


def _print_startup_summary():
    """Skriv ut slutsammanfattning av uppstart."""
    weather_state = get_weather_state()
    
    print("=" * 80)
    print("🌤️ Flask Weather Dashboard REDO! (Refaktorerad arkitektur)")
    print("=" * 80)
    
    # Åtkomstinformation
    print("📱 Webbgränssnitt:")
    print("   • Lokal:     http://localhost:8036")
    print("   • Nätverk:   http://SERVER-IP:8036")
    print("   • Kiosk:     chromium-browser --kiosk --disable-infobars http://localhost:8036")
    
    # Systemläge
    system_mode = _get_system_mode_display()
    print(f"🎯 Systemläge: {system_mode}")
    
    # API-endpoints
    print("🌐 API-endpoints:")
    print("   • Väder:     /api/current, /api/forecast, /api/daily")
    print("   • System:    /api/status, /api/health, /api/config")
    
    # WeatherEffects info
    if weather_state['weather_effects_enabled']:
        print("   • Effects:   /api/weather-effects-config, /api/weather-effects-status")
        effect_config = weather_state['weather_effects_config']
        rain_count = effect_config.get('rain_config', {}).get('droplet_count', 50)
        snow_count = effect_config.get('snow_config', {}).get('flake_count', 25)
        intensity = effect_config.get('intensity', 'auto')
        print(f"   🌧️ Regn: {rain_count} droppar | ❄️ Snö: {snow_count} flingor | 🎚️ Intensitet: {intensity}")
        
        # Debug endpoint om aktiverat
        if effect_config.get('debug_logging'):
            print("   • Debug:     /api/weather-effects-debug")
    else:
        print("   📊 WeatherEffects: INAKTIVERAT")
    
    # Specialiserade endpoints
    print("   • Tryck:     /api/pressure_trend")
    print("   • Luftfukt:  /api/humidity")
    print("   • Plats:     /api/location")
    
    # Konfigurationssummering
    config = weather_state['config']
    if config:
        wind_unit = config.get('ui', {}).get('wind_unit', 'land')
        theme = config.get('ui', {}).get('theme', 'dark')
        location = config.get('display', {}).get('location_name', 'Stockholm')
        refresh = config.get('ui', {}).get('refresh_interval_minutes', 15)
        
        print("⚙️ Konfiguration:")
        print(f"   • Plats:     {location}")
        print(f"   • Vindenheter: {wind_unit}")
        print(f"   • Tema:      {theme}")
        print(f"   • Uppdatering: {refresh} min")
    
    # Status för olika datakällor
    print("📊 Datakällor:")
    print("   • SMHI:      Väderprognos + luftfuktighet (alltid aktiv)")
    
    if weather_state['use_netatmo']:
        if weather_state['netatmo_available']:
            print("   • Netatmo:   Inomhusdata + trycktrend (aktivt)")
        else:
            print("   • Netatmo:   Konfigurerat men EJ TILLGÄNGLIGT")
    else:
        print("   • Netatmo:   INAKTIVERAT i konfiguration")
    
    # API-dokumentation
    print("📚 Modulär arkitektur:")
    print("   • core/      State, config, data-uppdateringar")
    print("   • api/       REST API endpoints (weather, effects, system)")
    print("   • utils/     Data-formatering, tryck-utilities")
    
    print("=" * 80)


# === MAIN ENTRY POINT ===

if __name__ == '__main__':
    if initialize_app():
        # Starta Flask-servern
        app.run(
            host='0.0.0.0',
            port=8036,
            debug=False,
            threaded=True
        )
    else:
        print("❌ Kunde inte starta Flask-appen")
        sys.exit(1)
