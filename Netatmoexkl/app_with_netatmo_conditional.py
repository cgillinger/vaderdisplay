#!/usr/bin/env python3
"""
Flask Weather Dashboard - Modern Web Implementation
FAS 2: VILLKORSSTYRD NETATMO-FUNKTIONALITET för oberoende drift
+ TRYCKTREND: API-stöd för trycktrend-funktionalitet
+ CONFIG.PY: Migrerad från JSON till Python config med riktiga kommentarer
+ INTELLIGENT DATAHANTERING: Automatisk fallback till SMHI-only läge
"""

from flask import Flask, render_template, jsonify, request
from datetime import datetime, timezone
import json
import os
import sys
import threading
import time
from typing import Dict, List, Optional

# Lägg till rätt data-katalog i Python path för import av API-klienter
sys.path.append(os.path.join(os.path.dirname(__file__), 'reference', 'data'))

try:
    from smhi_client import SMHIClient
    from netatmo_client import NetatmoClient
    from utils import SunCalculator, get_weather_icon_unicode_char, get_weather_description_short
except ImportError as e:
    print(f"❌ Import fel: {e}")
    print("🔧 Kontrollera att reference/data/ finns och innehåller smhi_client.py m.fl.")
    sys.exit(1)

# Flask app setup
app = Flask(__name__)
app.config['SECRET_KEY'] = 'weather_dashboard_secret_key'

# Global state för weather data
weather_state = {
    'smhi_data': None,
    'netatmo_data': None,
    'forecast_data': None,
    'daily_forecast_data': None,
    'sun_data': None,
    'last_update': None,
    'config': None,
    'status': 'Startar...',
    
    # FAS 2: Netatmo-state tracking
    'use_netatmo': True,        # Läses från config
    'netatmo_available': False  # Spårar om Netatmo faktiskt fungerar
}

# API clients (initialiseras villkorsstyrt i init_api_clients)
smhi_client = None
netatmo_client = None
sun_calculator = None

def load_config():
    """Ladda konfiguration från config.py med riktiga Python-kommentarer."""
    try:
        # Lägg till reference-katalogen i Python path
        reference_path = os.path.join(os.path.dirname(__file__), 'reference')
        if reference_path not in sys.path:
            sys.path.insert(0, reference_path)
        
        # Importera CONFIG från config.py
        from config import CONFIG
        
        print(f"✅ Konfiguration laddad från config.py")
        print(f"📍 Plats: {CONFIG['display']['location_name']}")
        print(f"🌬️ Vindenheter: {CONFIG['ui']['wind_unit']}")
        print(f"🎨 Tema: {CONFIG['ui']['theme']}")
        
        # FAS 2: Läs use_netatmo från config
        use_netatmo = CONFIG.get('use_netatmo', True)
        weather_state['use_netatmo'] = use_netatmo
        print(f"🧠 FAS 2: Netatmo-läge: {'AKTIVT' if use_netatmo else 'INAKTIVT (SMHI-only)'}")
        
        return CONFIG
        
    except ImportError as e:
        print(f"❌ Kunde inte importera config.py: {e}")
        print("🔧 Kontrollera att reference/config.py finns och har giltigt CONFIG dict")
        
        # Fallback till JSON om config.py inte finns
        print("🔄 Försöker fallback till config.json...")
        return load_config_json_fallback()
        
    except Exception as e:
        print(f"❌ Oväntat fel vid config.py-läsning: {e}")
        return None

def load_config_json_fallback():
    """Fallback för att läsa config.json om config.py inte fungerar."""
    config_path = os.path.join(os.path.dirname(__file__), 'reference', 'config.json')
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print(f"⚠️ Fallback: Konfiguration laddad från {config_path}")
        print("💡 TIP: Skapa reference/config.py för bättre kommentarer!")
        
        # FAS 2: Fallback till True om use_netatmo saknas i JSON
        weather_state['use_netatmo'] = config.get('use_netatmo', True)
        print(f"🧠 FAS 2: Netatmo-läge (fallback): {'AKTIVT' if weather_state['use_netatmo'] else 'INAKTIVT'}")
        
        return config
        
    except FileNotFoundError:
        print(f"❌ Varken config.py eller config.json hittades!")
        print(f"🔧 Skapa antingen reference/config.py eller {config_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON-fel i fallback config.json: {e}")
        return None

def init_api_clients(config):
    """FAS 2: Villkorsstyrd initialisering av API-klienter."""
    global smhi_client, netatmo_client, sun_calculator
    
    use_netatmo = weather_state['use_netatmo']
    
    try:
        # SMHI Client (alltid obligatorisk)
        smhi_lat = config['smhi']['latitude']
        smhi_lon = config['smhi']['longitude']
        smhi_client = SMHIClient(smhi_lat, smhi_lon)
        print(f"✅ SMHI-klient initierad för {smhi_lat}, {smhi_lon}")
        
        # FAS 2: Villkorsstyrd Netatmo Client
        if use_netatmo:
            try:
                netatmo_config = config['netatmo']
                netatmo_client = NetatmoClient(
                    netatmo_config['client_id'],
                    netatmo_config['client_secret'],
                    netatmo_config['refresh_token'],
                    netatmo_config.get('preferred_station')
                )
                weather_state['netatmo_available'] = True
                print("✅ FAS 2: Netatmo-klient initierad med trycktrend-stöd")
            except Exception as e:
                print(f"❌ FAS 2: Netatmo-initialisering misslyckades: {e}")
                print("🔄 FAS 2: Fortsätter i SMHI-only läge")
                netatmo_client = None
                weather_state['netatmo_available'] = False
                # Behåll use_netatmo=True men markera som otillgänglig
        else:
            netatmo_client = None
            weather_state['netatmo_available'] = False
            print("📊 FAS 2: Netatmo INAKTIVERAT i config - kör SMHI-only läge")
        
        # Sun Calculator (alltid obligatorisk)
        api_key = config.get('ipgeolocation', {}).get('api_key', '').strip() or None
        sun_calculator = SunCalculator(api_key)
        print(f"✅ Sol-kalkylator initierad ({'API' if api_key else 'Fallback'})")
        
        # FAS 2: Sammanfattning av initialiserat läge
        mode_summary = "SMHI + Netatmo" if weather_state['netatmo_available'] else "SMHI-only"
        print(f"🎯 FAS 2: Systemläge - {mode_summary}")
        
        return True
        
    except Exception as e:
        print(f"❌ Fel vid initialisering av API-klienter: {e}")
        return False

def update_weather_data():
    """FAS 2: Uppdatera väderdata med villkorsstyrd Netatmo-hantering."""
    global weather_state
    
    try:
        print(f"🔄 FAS 2: Uppdaterar väderdata... ({datetime.now().strftime('%H:%M:%S')})")
        
        # SMHI data (alltid obligatorisk)
        if smhi_client:
            weather_state['smhi_data'] = smhi_client.get_current_weather()
            weather_state['forecast_data'] = smhi_client.get_12h_forecast()
            weather_state['daily_forecast_data'] = smhi_client.get_daily_forecast(4)
            print("✅ FAS 2: SMHI-data uppdaterad")
        
        # FAS 2: Villkorsstyrd Netatmo data
        if netatmo_client and weather_state['netatmo_available']:
            try:
                netatmo_data = netatmo_client.get_current_weather()
                weather_state['netatmo_data'] = netatmo_data
                
                # Logga trycktrend-data för debug
                if netatmo_data and 'pressure_trend' in netatmo_data:
                    trend_data = netatmo_data['pressure_trend']
                    print(f"📊 FAS 2: Netatmo trycktrend: {trend_data.get('trend', 'n/a')} - {trend_data.get('description', 'Ingen beskrivning')}")
                    if trend_data.get('data_hours', 0) > 0:
                        print(f"📈 FAS 2: Datahistorik: {trend_data['data_hours']:.1f} timmar, ändring: {trend_data.get('pressure_change', 0):.1f} hPa")
                else:
                    print("⚠️ FAS 2: Ingen trycktrend-data i Netatmo-respons")
                    
            except Exception as e:
                print(f"❌ FAS 2: Netatmo-uppdatering misslyckades: {e}")
                print("🔄 FAS 2: Fortsätter med SMHI-data endast")
                weather_state['netatmo_data'] = None
        else:
            weather_state['netatmo_data'] = None
            if weather_state['use_netatmo']:
                print("📊 FAS 2: Netatmo konfigurerat men ej tillgängligt")
            else:
                print("📊 FAS 2: Netatmo inaktiverat - använder SMHI-only")
        
        # Sol data (alltid obligatorisk)
        if sun_calculator and weather_state['config']:
            lat = weather_state['config']['smhi']['latitude']
            lon = weather_state['config']['smhi']['longitude']
            weather_state['sun_data'] = sun_calculator.get_sun_times(lat, lon)
            print("✅ FAS 2: Sol-data uppdaterad")
        
        # Uppdatera timestamp och status
        weather_state['last_update'] = datetime.now().isoformat()
        
        # FAS 2: Dynamisk statusmeddelande baserat på läge
        refresh_interval = weather_state['config'].get('ui', {}).get('refresh_interval_minutes', 15)
        if weather_state['netatmo_available']:
            netatmo_interval = weather_state['config'].get('ui', {}).get('netatmo_refresh_interval_minutes', 10)
            weather_state['status'] = f"Data uppdaterad (SMHI + Netatmo) | SMHI: {refresh_interval}min | Netatmo: {netatmo_interval}min"
        else:
            weather_state['status'] = f"Data uppdaterad (SMHI-only) | Uppdatering: {refresh_interval}min"
        
        print("✅ FAS 2: Väderdata uppdaterad")
        
    except Exception as e:
        print(f"❌ FAS 2: Fel vid väderuppdatering: {e}")
        weather_state['status'] = f"Fel vid uppdatering: {e}"

def get_current_theme():
    """Bestäm vilket tema som ska användas baserat på tid."""
    if not weather_state['config']:
        return 'dark'  # Default till dark som är produktionsklart
    
    ui_config = weather_state['config'].get('ui', {})
    theme_setting = ui_config.get('theme', 'dark')
    
    if theme_setting != 'auto':
        return theme_setting
    
    auto_theme = ui_config.get('auto_theme', {})
    day_theme = auto_theme.get('day_theme', 'light')
    night_theme = auto_theme.get('night_theme', 'dark')
    night_start = auto_theme.get('night_start', '21:00')
    night_end = auto_theme.get('night_end', '06:00')
    
    try:
        current_hour = datetime.now().hour
        night_start_hour = int(night_start.split(':')[0])
        night_end_hour = int(night_end.split(':')[0])
        
        if night_start_hour <= night_end_hour:
            is_night = night_start_hour <= current_hour <= night_end_hour
        else:
            is_night = current_hour >= night_start_hour or current_hour <= night_end_hour
        
        return night_theme if is_night else day_theme
        
    except:
        return day_theme

def create_smhi_pressure_trend_fallback(smhi_data):
    """
    FAS 2: Skapa förenklad trycktrend från SMHI-data som fallback.
    
    Args:
        smhi_data (dict): SMHI current weather data
        
    Returns:
        dict: Förenklad trycktrend-struktur kompatibel med Netatmo-format
    """
    if not smhi_data or not smhi_data.get('pressure'):
        return {
            'trend': 'n/a',
            'description': 'Trycktrend ej tillgänglig (SMHI)',
            'icon': 'wi-na',
            'data_hours': 0,
            'pressure_change': 0,
            'analysis_quality': 'poor',
            'source': 'smhi_fallback'
        }
    
    # Förenklad "trend" baserat på absolut tryck (SMHI-logik)
    pressure = smhi_data['pressure']
    
    if pressure > 1020:
        trend = 'rising'
        description = 'Högtryck - stabilt väder (SMHI prognos)'
        icon = 'wi-direction-up'
    elif pressure < 1000:
        trend = 'falling'
        description = 'Lågtryck - instabilt väder (SMHI prognos)'
        icon = 'wi-direction-down'
    else:
        trend = 'stable'
        description = 'Måttligt tryck - växlande väder (SMHI prognos)'
        icon = 'wi-minus'
    
    return {
        'trend': trend,
        'description': description,
        'icon': icon,
        'data_hours': 0,  # SMHI har inte historisk data
        'pressure_change': 0,  # Kan inte beräknas utan historik
        'analysis_quality': 'basic',
        'source': 'smhi_fallback'
    }

def format_api_response_with_pressure_trend(netatmo_data, smhi_data=None):
    """
    FAS 2: Formatera Netatmo-data för API-respons med intelligent fallback.
    
    Args:
        netatmo_data (dict): Raw Netatmo-data från klienten (kan vara None)
        smhi_data (dict): SMHI-data för fallback-trycktrend
        
    Returns:
        dict: Formaterad data för frontend (eller None om ingen Netatmo)
    """
    if not netatmo_data:
        # FAS 2: Returnera None om Netatmo inte tillgängligt
        return None
    
    # Bas Netatmo-data
    formatted_data = {
        'temperature': netatmo_data.get('temperature'),
        'humidity': netatmo_data.get('humidity'),
        'pressure': netatmo_data.get('pressure'),
        'co2': netatmo_data.get('co2'),
        'noise': netatmo_data.get('noise'),
        'data_age_minutes': netatmo_data.get('data_age_minutes'),
        'timestamp': netatmo_data.get('timestamp'),
        'station_name': netatmo_data.get('station_name'),
        'station_type': netatmo_data.get('station_type'),
        'source': netatmo_data.get('source', 'netatmo')
    }
    
    # Hantera trycktrend med SMHI-fallback
    if 'pressure_trend' in netatmo_data:
        pressure_trend = netatmo_data['pressure_trend']
        
        # Validera trycktrend-data
        if pressure_trend and pressure_trend.get('trend') != 'n/a':
            formatted_trend = {
                'trend': pressure_trend.get('trend', 'n/a'),
                'description': pressure_trend.get('description', 'Trycktrend okänd'),
                'icon': pressure_trend.get('icon', 'wi-na'),
                'data_hours': pressure_trend.get('data_hours', 0),
                'pressure_change': pressure_trend.get('pressure_change', 0),
                'analysis_quality': pressure_trend.get('analysis_quality', 'poor'),
                'source': 'netatmo'
            }
            formatted_data['pressure_trend'] = formatted_trend
            print(f"📊 FAS 2: API - Netatmo trycktrend: {formatted_trend['trend']} ({formatted_trend['analysis_quality']})")
        else:
            # FAS 2: Använd SMHI-fallback om Netatmo-trend är n/a
            smhi_fallback = create_smhi_pressure_trend_fallback(smhi_data)
            formatted_data['pressure_trend'] = smhi_fallback
            print(f"📊 FAS 2: API - SMHI trycktrend-fallback: {smhi_fallback['trend']}")
    else:
        # FAS 2: Inget trycktrend alls - skapa SMHI-fallback
        smhi_fallback = create_smhi_pressure_trend_fallback(smhi_data)
        formatted_data['pressure_trend'] = smhi_fallback
        print("📊 FAS 2: API - Ingen Netatmo trycktrend, använder SMHI-fallback")
    
    return formatted_data

# === FLASK ROUTES ===

@app.route('/')
def index():
    location_name = "Stockholm"
    if weather_state['config']:
        location_name = weather_state['config'].get('display', {}).get('location_name', 'Stockholm')
    
    current_theme = get_current_theme()
    
    return render_template('index.html', 
                         location_name=location_name,
                         theme=current_theme)

@app.route('/api/current')
def api_current_weather():
    """FAS 2: API endpoint för aktuell väderdata med intelligent Netatmo-hantering."""
    
    # FAS 2: Villkorsstyrd Netatmo-formatering
    formatted_netatmo = None
    if weather_state['netatmo_data'] and weather_state['netatmo_available']:
        formatted_netatmo = format_api_response_with_pressure_trend(
            weather_state['netatmo_data'], 
            weather_state['smhi_data']
        )
    
    # FAS 2: Utökad config för frontend-intelligens
    ui_config = None
    if weather_state['config']:
        ui_config = {
            'wind_unit': weather_state['config'].get('ui', {}).get('wind_unit', 'land'),
            'use_netatmo': weather_state['use_netatmo'],  # NYT: För frontend-detektering
            'netatmo_available': weather_state['netatmo_available']  # NYT: Faktisk tillgänglighet
        }
    
    response_data = {
        'smhi': weather_state['smhi_data'],
        'netatmo': formatted_netatmo,  # Kan vara None i SMHI-only läge
        'sun': weather_state['sun_data'],
        'last_update': weather_state['last_update'],
        'theme': get_current_theme(),
        'status': weather_state['status'],
        'config': ui_config
    }
    
    # FAS 2: Debug-logging för API-respons
    mode = "SMHI + Netatmo" if formatted_netatmo else "SMHI-only"
    print(f"🌐 FAS 2: API Response - {mode}")
    
    return jsonify(response_data)

@app.route('/api/forecast')
def api_forecast():
    return jsonify({
        'forecast': weather_state['forecast_data'],
        'last_update': weather_state['last_update']
    })

@app.route('/api/daily')
def api_daily_forecast():
    return jsonify({
        'daily_forecast': weather_state['daily_forecast_data'],
        'last_update': weather_state['last_update']
    })

@app.route('/api/status')
def api_status():
    """FAS 2: API endpoint för systemstatus med Netatmo-info."""
    return jsonify({
        'status': weather_state['status'],
        'last_update': weather_state['last_update'],
        'theme': get_current_theme(),
        'config_loaded': weather_state['config'] is not None,
        'smhi_active': smhi_client is not None,
        'netatmo_configured': weather_state['use_netatmo'],  # FAS 2: Konfigurerat
        'netatmo_active': weather_state['netatmo_available'],  # FAS 2: Faktiskt tillgängligt
        'sun_calc_active': sun_calculator is not None,
        'pressure_trend_available': (
            weather_state['netatmo_data'] is not None and 
            'pressure_trend' in weather_state['netatmo_data'] and
            weather_state['netatmo_data']['pressure_trend']['trend'] != 'n/a'
        ),
        'system_mode': 'SMHI + Netatmo' if weather_state['netatmo_available'] else 'SMHI-only'  # FAS 2: Systemläge
    })

@app.route('/api/theme')
def api_theme():
    return jsonify({
        'theme': get_current_theme(),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/pressure_trend')
def api_pressure_trend():
    """Dedikerad API endpoint för trycktrend-data (för debugging)."""
    if not weather_state['netatmo_data'] and not weather_state['smhi_data']:
        return jsonify({
            'error': 'Ingen väderdata tillgänglig',
            'pressure_trend': None,
            'system_mode': 'No data'
        })
    
    # FAS 2: Intelligent trycktrend-respons
    if weather_state['netatmo_data'] and weather_state['netatmo_available']:
        pressure_trend = weather_state['netatmo_data'].get('pressure_trend')
        current_pressure = weather_state['netatmo_data'].get('pressure')
        source = 'netatmo'
    else:
        # FAS 2: SMHI-fallback
        pressure_trend = create_smhi_pressure_trend_fallback(weather_state['smhi_data'])
        current_pressure = weather_state['smhi_data'].get('pressure') if weather_state['smhi_data'] else None
        source = 'smhi_fallback'
    
    return jsonify({
        'pressure_trend': pressure_trend,
        'current_pressure': current_pressure,
        'timestamp': weather_state['last_update'],
        'source': source,
        'system_mode': 'SMHI + Netatmo' if weather_state['netatmo_available'] else 'SMHI-only'
    })

# === BACKGROUND TASKS ===

def background_updater():
    """Huvudloop för väderuppdateringar."""
    if not weather_state['config']:
        return
    
    update_weather_data()
    
    refresh_interval = weather_state['config'].get('ui', {}).get('refresh_interval_minutes', 15)
    refresh_seconds = refresh_interval * 60
    
    while True:
        time.sleep(refresh_seconds)
        update_weather_data()

def netatmo_updater():
    """FAS 2: Villkorsstyrd snabb loop för Netatmo-uppdateringar."""
    if not weather_state['config'] or not weather_state['use_netatmo']:
        print("🔄 FAS 2: Netatmo-uppdaterare inaktiverad (use_netatmo=False)")
        return
    
    netatmo_interval = weather_state['config'].get('ui', {}).get('netatmo_refresh_interval_minutes', 10)
    netatmo_seconds = netatmo_interval * 60
    
    while True:
        time.sleep(netatmo_seconds)
        
        # FAS 2: Kör bara om Netatmo är tillgängligt
        if netatmo_client and weather_state['netatmo_available']:
            try:
                netatmo_data = netatmo_client.get_current_weather()
                weather_state['netatmo_data'] = netatmo_data
                
                # Logga trycktrend-uppdatering
                if netatmo_data and 'pressure_trend' in netatmo_data:
                    trend_data = netatmo_data['pressure_trend']
                    print(f"🔄 FAS 2: Netatmo snabb-uppdatering: {trend_data.get('trend', 'n/a')} - {trend_data.get('analysis_quality', 'poor')}")
                else:
                    print("🔄 FAS 2: Netatmo snabb-uppdatering: Ingen trycktrend-data")
                    
            except Exception as e:
                print(f"❌ FAS 2: Netatmo snabb-uppdatering fel: {e}")
                # Behåll befintlig data men logga felet
        else:
            print("🔄 FAS 2: Netatmo snabb-uppdaterare vilar (klient ej tillgänglig)")

# === APP INITIALIZATION ===

def initialize_app():
    print("🚀 FAS 2: Startar Flask Weather Dashboard med villkorsstyrd Netatmo-funktionalitet...")
    print("=" * 70)
    
    config = load_config()
    if not config:
        print("❌ Kan inte starta utan giltig konfiguration")
        return False
    
    weather_state['config'] = config
    
    # FAS 2: Fortsätt även om API-klienter delvis misslyckas
    api_clients_ok = init_api_clients(config)
    if not api_clients_ok:
        print("⚠️ FAS 2: Vissa API-klienter misslyckades - fortsätter ändå")
    
    # FAS 2: Starta bakgrundstrådar villkorsstyrt
    bg_thread = threading.Thread(target=background_updater, daemon=True)
    bg_thread.start()
    print("✅ Bakgrunds-uppdaterare startad")
    
    # FAS 2: Starta Netatmo-uppdaterare bara om aktiverat
    if weather_state['use_netatmo']:
        netatmo_thread = threading.Thread(target=netatmo_updater, daemon=True)
        netatmo_thread.start()
        print("✅ FAS 2: Netatmo-uppdaterare startad (villkorsstyrd)")
    else:
        print("📊 FAS 2: Netatmo-uppdaterare HOPPAS ÖVER (use_netatmo=False)")
    
    print("=" * 70)
    print("🌤️ FAS 2: Flask Weather Dashboard redo med intelligent Netatmo-hantering!")
    print("📱 Öppna: http://localhost:8036")
    print("🖥️ Chrome Kiosk: chromium-browser --kiosk --disable-infobars http://localhost:8036")
    
    # FAS 2: Visa systemläge
    mode = "SMHI + Netatmo" if weather_state['netatmo_available'] else "SMHI-only"
    print(f"🎯 Systemläge: {mode}")
    print(f"📊 Trycktrend API: http://localhost:8036/api/pressure_trend")
    print(f"🌬️ Vindenheter: {config['ui']['wind_unit']} (redigerbart i reference/config.py)")
    print(f"🎨 Tema: {config['ui']['theme']} (mörkt tema rekommenderat)")
    
    # FAS 2: Visa Netatmo-status
    if weather_state['use_netatmo']:
        if weather_state['netatmo_available']:
            print(f"✅ Netatmo: AKTIVT (med trycktrend)")
        else:
            print(f"⚠️ Netatmo: KONFIGURERAT men EJ TILLGÄNGLIGT (använder SMHI-fallback)")
    else:
        print(f"📊 Netatmo: INAKTIVERAT i config (use_netatmo=False)")
    
    print("=" * 70)
    
    return True

if __name__ == '__main__':
    if initialize_app():
        app.run(
            host='0.0.0.0',
            port=8036,
            debug=False,
            threaded=True
        )
    else:
        print("❌ Kunde inte starta Flask-appen")
        sys.exit(1)