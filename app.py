#!/usr/bin/env python3
"""
Flask Weather Dashboard - Modern Web Implementation
FAS 2: VILLKORSSTYRD NETATMO-FUNKTIONALITET för oberoende drift
+ TRYCKTREND: API-stöd för trycktrend-funktionalitet
+ CONFIG.PY: Migrerad från JSON till Python config med riktiga kommentarer
+ INTELLIGENT DATAHANTERING: Automatisk fallback till SMHI-only läge
+ FAS 2: SMHI LUFTFUKTIGHET: Integration av luftfuktighetsdata från SMHI observations-API
+ WEATHEREFFECTS: FAS 2 - API-stöd för WeatherEffects-konfiguration och SMHI-integration
+ SMHI WARNINGS: Integration av SMHI:s vädervarningar (skyfallsvarningar)
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
    from smhi_warnings_client import SMHIWarningsClient
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
    'netatmo_available': False, # Spårar om Netatmo faktiskt fungerar
    
    # FAS 2: WeatherEffects state tracking
    'weather_effects_enabled': False,  # Läses från config
    'weather_effects_config': None,    # Cachad WeatherEffects-konfiguration
    
    # SMHI Warnings state tracking
    'smhi_warnings_data': None,        # SMHI varningsdata
    'warnings_last_update': None,      # Senaste varningsuppdatering
    'warnings_enabled': True,          # Varningar aktiverade (kan göras konfigurerbart senare)
}

# API clients (initialiseras villkorsstyrt i init_api_clients)
smhi_client = None
netatmo_client = None
sun_calculator = None
smhi_warnings_client = None

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
        
        # FAS 2: WeatherEffects config-läsning
        weather_effects_config = CONFIG.get('weather_effects', {})
        weather_effects_enabled = weather_effects_config.get('enabled', False)
        weather_state['weather_effects_enabled'] = weather_effects_enabled
        weather_state['weather_effects_config'] = weather_effects_config
        
        print(f"🌦️ FAS 2: WeatherEffects: {'AKTIVERAT' if weather_effects_enabled else 'INAKTIVERAT'}")
        if weather_effects_enabled:
            rain_count = weather_effects_config.get('rain_config', {}).get('droplet_count', 50)
            snow_count = weather_effects_config.get('snow_config', {}).get('flake_count', 25)
            intensity = weather_effects_config.get('intensity', 'auto')
            print(f"   🌧️ Regn: {rain_count} droppar, ❄️ Snö: {snow_count} flingor, 🎚️ Intensitet: {intensity}")
        
        # SMHI Warnings config-läsning (kan utökas senare)
        warnings_config = CONFIG.get('smhi_warnings', {})
        warnings_enabled = warnings_config.get('enabled', True)  # Default aktiverat
        weather_state['warnings_enabled'] = warnings_enabled
        print(f"⚠️ SMHI Varningar: {'AKTIVERAT' if warnings_enabled else 'INAKTIVERAT'}")
        
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
        
        # FAS 2: Fallback till False för weather_effects om det saknas i JSON
        weather_state['use_netatmo'] = config.get('use_netatmo', True)
        weather_state['weather_effects_enabled'] = config.get('weather_effects', {}).get('enabled', False)
        weather_state['weather_effects_config'] = config.get('weather_effects', {})
        
        # SMHI Warnings fallback
        weather_state['warnings_enabled'] = config.get('smhi_warnings', {}).get('enabled', True)
        
        print(f"🧠 FAS 2: Netatmo-läge (fallback): {'AKTIVT' if weather_state['use_netatmo'] else 'INAKTIVT'}")
        print(f"🌦️ FAS 2: WeatherEffects (fallback): {'AKTIVERAT' if weather_state['weather_effects_enabled'] else 'INAKTIVERAT'}")
        print(f"⚠️ SMHI Varningar (fallback): {'AKTIVERAT' if weather_state['warnings_enabled'] else 'INAKTIVERAT'}")
        
        return config
        
    except FileNotFoundError:
        print(f"❌ Varken config.py eller config.json hittades!")
        print(f"🔧 Skapa antingen reference/config.py eller {config_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON-fel i fallback config.json: {e}")
        return None

def validate_weather_effects_config(config_data):
    """
    FAS 2: Validera WeatherEffects-konfiguration med robust error handling.
    
    Args:
        config_data (dict): WeatherEffects-konfiguration från config.py
        
    Returns:
        dict: Validerad konfiguration med fallback-värden
    """
    # Default-konfiguration (MagicMirror-kompatibel)
    default_config = {
        'enabled': False,
        'intensity': 'auto',
        'rain_config': {
            'droplet_count': 50,
            'droplet_speed': 2.0,
            'wind_direction': 'none',
            'enable_splashes': False
        },
        'snow_config': {
            'flake_count': 25,
            'characters': ['*', '+'],
            'sparkle_enabled': False,
            'min_size': 0.8,
            'max_size': 1.5,
            'speed': 1.0
        },
        'transition_duration': 1000,
        'debug_logging': False,
        'fallback_enabled': True,
        'lp156wh4_optimizations': {
            'enabled': True,
            'contrast_boost': 1.1,
            'brightness_boost': 1.1,
            'gpu_acceleration': True,
            'target_fps': 60
        }
    }
    
    if not config_data or not isinstance(config_data, dict):
        print("⚠️ Ogiltig WeatherEffects-config, använder default")
        return default_config
    
    # Deep merge med default config
    validated_config = default_config.copy()
    
    # Validera top-level properties
    for key, default_value in default_config.items():
        if key in config_data:
            if isinstance(default_value, dict):
                # Deep merge för nested objects
                validated_config[key] = {**default_value, **config_data.get(key, {})}
            else:
                validated_config[key] = config_data[key]
    
    # Validera specifika värden
    try:
        # Intensitet
        valid_intensities = ['auto', 'light', 'medium', 'heavy']
        if validated_config['intensity'] not in valid_intensities:
            print(f"⚠️ Ogiltig intensitet '{validated_config['intensity']}', använder 'auto'")
            validated_config['intensity'] = 'auto'
        
        # Rain config validering
        rain_config = validated_config['rain_config']
        rain_config['droplet_count'] = max(10, min(100, int(rain_config.get('droplet_count', 50))))
        rain_config['droplet_speed'] = max(0.5, min(5.0, float(rain_config.get('droplet_speed', 2.0))))
        
        valid_wind_directions = ['none', 'left-to-right', 'right-to-left']
        if rain_config.get('wind_direction') not in valid_wind_directions:
            rain_config['wind_direction'] = 'none'
        
        # Snow config validering
        snow_config = validated_config['snow_config']
        snow_config['flake_count'] = max(10, min(50, int(snow_config.get('flake_count', 25))))
        snow_config['min_size'] = max(0.5, min(2.0, float(snow_config.get('min_size', 0.8))))
        snow_config['max_size'] = max(1.0, min(3.0, float(snow_config.get('max_size', 1.5))))
        snow_config['speed'] = max(0.5, min(2.0, float(snow_config.get('speed', 1.0))))
        
        # Säkerställ att max_size >= min_size
        if snow_config['max_size'] < snow_config['min_size']:
            snow_config['max_size'] = snow_config['min_size'] + 0.5
        
        # Characters validering
        if not isinstance(snow_config.get('characters'), list) or len(snow_config['characters']) == 0:
            snow_config['characters'] = ['*', '+']
        
        # Transition duration
        validated_config['transition_duration'] = max(500, min(3000, int(validated_config.get('transition_duration', 1000))))
        
        print("✅ WeatherEffects-konfiguration validerad")
        
    except (ValueError, TypeError) as e:
        print(f"⚠️ Fel vid WeatherEffects config-validering: {e}")
        print("🔄 Använder säkra default-värden")
    
    return validated_config

def get_smhi_weather_effect_type(weather_symbol):
    """
    FAS 2: Konvertera SMHI weather symbol till WeatherEffects-typ.
    
    Args:
        weather_symbol (int): SMHI vädersymbol (1-27)
        
    Returns:
        str: WeatherEffects-typ ('rain', 'snow', 'sleet', 'thunder', 'clear')
    """
    if not isinstance(weather_symbol, (int, float)) or weather_symbol < 1 or weather_symbol > 27:
        return 'clear'
    
    symbol = int(weather_symbol)
    
    # SMHI symbol mapping
    if symbol in [8, 9, 10, 18, 19, 20]:          # Regnskurar och regn
        return 'rain'
    elif symbol in [15, 16, 17, 25, 26, 27]:      # Snöbyar och snöfall
        return 'snow'
    elif symbol in [12, 13, 14, 22, 23, 24]:      # Snöblandat regn
        return 'sleet'
    elif symbol in [11, 21]:                      # Åska
        return 'thunder'
    else:                                         # Klart väder (1-7)
        return 'clear'

def init_api_clients(config):
    """FAS 2: Villkorsstyrd initialisering av API-klienter."""
    global smhi_client, netatmo_client, sun_calculator, smhi_warnings_client
    
    use_netatmo = weather_state['use_netatmo']
    warnings_enabled = weather_state['warnings_enabled']
    
    try:
        # SMHI Client (alltid obligatorisk)
        smhi_lat = config['smhi']['latitude']
        smhi_lon = config['smhi']['longitude']
        smhi_client = SMHIClient(smhi_lat, smhi_lon)
        print(f"✅ SMHI-klient initierad för {smhi_lat}, {smhi_lon}")
        
        # SMHI Warnings Client (villkorsstyrd)
        if warnings_enabled:
            try:
                # Konfigurerbar cache-duration (default 10 min för varningar)
                warnings_cache_duration = config.get('smhi_warnings', {}).get('cache_duration_minutes', 10) * 60
                smhi_warnings_client = SMHIWarningsClient(cache_duration=warnings_cache_duration)
                print(f"✅ SMHI Warnings-klient initierad (cache: {warnings_cache_duration//60} min)")
            except Exception as e:
                print(f"❌ SMHI Warnings-initialisering misslyckades: {e}")
                print("🔄 Fortsätter utan varningsstöd")
                smhi_warnings_client = None
                weather_state['warnings_enabled'] = False
        else:
            smhi_warnings_client = None
            print("📊 SMHI Varningar INAKTIVERAT i config")
        
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
        
        # FAS 2: WeatherEffects sammanfattning
        if weather_state['weather_effects_enabled']:
            effect_config = weather_state['weather_effects_config']
            rain_count = effect_config.get('rain_config', {}).get('droplet_count', 50)
            snow_count = effect_config.get('snow_config', {}).get('flake_count', 25)
            print(f"🌦️ WeatherEffects aktiverat - Regn: {rain_count}, Snö: {snow_count}")
        
        # FAS 2: Sammanfattning av initialiserat läge
        mode_summary = "SMHI + Netatmo" if weather_state['netatmo_available'] else "SMHI-only"
        effects_summary = " + WeatherEffects" if weather_state['weather_effects_enabled'] else ""
        warnings_summary = " + Warnings" if weather_state['warnings_enabled'] else ""
        print(f"🎯 FAS 2: Systemläge - {mode_summary}{effects_summary}{warnings_summary}")
        
        return True
        
    except Exception as e:
        print(f"❌ Fel vid initialisering av API-klienter: {e}")
        return False

def update_warnings_data():
    """Uppdatera SMHI varningsdata."""
    global weather_state
    
    if not smhi_warnings_client or not weather_state['warnings_enabled']:
        return
    
    try:
        print("⚠️ Uppdaterar SMHI varningar...")
        
        # Hämta skyfallsvarningar (huvudfokus)
        heavy_rain_warnings = smhi_warnings_client.get_heavy_rain_warnings()
        active_rain_warnings = smhi_warnings_client.get_active_heavy_rain_warnings()
        
        # Hämta varningssammanfattning
        warnings_summary = smhi_warnings_client.get_warnings_summary()
        
        # Strukturera data för frontend
        warnings_data = {
            'heavy_rain_warnings': heavy_rain_warnings,
            'active_heavy_rain_warnings': active_rain_warnings,
            'summary': warnings_summary,
            'last_update': datetime.now().isoformat(),
            'api_available': True
        }
        
        weather_state['smhi_warnings_data'] = warnings_data
        weather_state['warnings_last_update'] = datetime.now().isoformat()
        
        # Logga resultat
        total_rain = len(heavy_rain_warnings)
        active_rain = len(active_rain_warnings)
        total_warnings = warnings_summary.get('total_warnings', 0)
        
        print(f"✅ SMHI varningar uppdaterade - Skyfall: {total_rain} totalt, {active_rain} aktiva, {total_warnings} alla varningar")
        
        # Extra logging för aktiva varningar
        if active_rain_warnings:
            print("🚨 AKTIVA SKYFALLSVARNINGAR:")
            for warning in active_rain_warnings:
                areas = ', '.join(warning.get('areas', []))[:50]  # Begränsa längd
                severity = warning.get('severity_info', {}).get('description', 'Okänd')
                print(f"   - {severity}: {areas}")
        
    except Exception as e:
        print(f"❌ Fel vid uppdatering av SMHI varningar: {e}")
        # Sätt fallback-data vid fel
        weather_state['smhi_warnings_data'] = {
            'heavy_rain_warnings': [],
            'active_heavy_rain_warnings': [],
            'summary': {'total_warnings': 0, 'active_warnings': 0},
            'last_update': datetime.now().isoformat(),
            'api_available': False,
            'error': str(e)
        }

def update_weather_data():
    """FAS 2: Uppdatera väderdata med villkorsstyrd Netatmo-hantering + SMHI luftfuktighet."""
    global weather_state
    
    try:
        print(f"🔄 FAS 2: Uppdaterar väderdata... ({datetime.now().strftime('%H:%M:%S')})")
        
        # FAS 2: SMHI data med luftfuktighet (alltid obligatorisk)
        if smhi_client:
            # FAS 2: KRITISK ÄNDRING - Använd get_current_weather_with_humidity() istället för get_current_weather()
            weather_state['smhi_data'] = smhi_client.get_current_weather_with_humidity()
            weather_state['forecast_data'] = smhi_client.get_12h_forecast()
            weather_state['daily_forecast_data'] = smhi_client.get_daily_forecast(4)
            
            # FAS 2: Debug-logging för luftfuktighetsdata
            if weather_state['smhi_data']:
                humidity = weather_state['smhi_data'].get('humidity')
                humidity_station = weather_state['smhi_data'].get('humidity_station')
                humidity_age = weather_state['smhi_data'].get('humidity_age_minutes')
                
                if humidity is not None:
                    print(f"✅ FAS 2: SMHI-data med luftfuktighet uppdaterad - {humidity}% från {humidity_station} (ålder: {humidity_age} min)")
                else:
                    print("⚠️ FAS 2: SMHI-data uppdaterad men ingen luftfuktighet tillgänglig")
                
                # FAS 2: WeatherEffects debugging
                if weather_state['weather_effects_enabled'] and weather_state['smhi_data'].get('weather_symbol'):
                    weather_symbol = weather_state['smhi_data']['weather_symbol']
                    effect_type = get_smhi_weather_effect_type(weather_symbol)
                    precipitation = weather_state['smhi_data'].get('precipitation', 0)
                    print(f"🌦️ FAS 2: SMHI Symbol {weather_symbol} → WeatherEffect '{effect_type}' (precipitation: {precipitation}mm)")
            else:
                print("❌ FAS 2: SMHI-data misslyckades")
        
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
        
        # SMHI Warnings data (villkorsstyrd)
        if weather_state['warnings_enabled']:
            update_warnings_data()
        
        # Uppdatera timestamp och status
        weather_state['last_update'] = datetime.now().isoformat()
        
        # FAS 2: Dynamisk statusmeddelande baserat på läge
        refresh_interval = weather_state['config'].get('ui', {}).get('refresh_interval_minutes', 15)
        status_parts = []
        
        if weather_state['netatmo_available']:
            netatmo_interval = weather_state['config'].get('ui', {}).get('netatmo_refresh_interval_minutes', 10)
            status_parts.append(f"SMHI + Netatmo | SMHI: {refresh_interval}min | Netatmo: {netatmo_interval}min")
        else:
            status_parts.append(f"SMHI-only | Uppdatering: {refresh_interval}min")
        
        if weather_state['weather_effects_enabled']:
            status_parts.append("WeatherEffects: ON")
        
        if weather_state['warnings_enabled']:
            status_parts.append("Warnings: ON")
        
        weather_state['status'] = f"Data uppdaterad ({' | '.join(status_parts)})"
        
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
    
    # FAS 2: Tillhandahåll WeatherEffects-status till template
    template_vars = {
        'location_name': location_name,
        'theme': current_theme,
        'weather_effects_enabled': weather_state['weather_effects_enabled']
    }
    
    return render_template('index.html', **template_vars)

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
            'netatmo_available': weather_state['netatmo_available'],  # NYT: Faktisk tillgänglighet
            'weather_effects_enabled': weather_state['weather_effects_enabled'],  # FAS 2: WeatherEffects-status
            'warnings_enabled': weather_state['warnings_enabled']  # SMHI Warnings-status
        }
    
    response_data = {
        'smhi': weather_state['smhi_data'],  # FAS 2: Nu innehåller humidity från get_current_weather_with_humidity()
        'netatmo': formatted_netatmo,  # Kan vara None i SMHI-only läge
        'sun': weather_state['sun_data'],
        'last_update': weather_state['last_update'],
        'theme': get_current_theme(),
        'status': weather_state['status'],
        'config': ui_config
    }
    
    # FAS 2: Debug-logging för API-respons
    mode = "SMHI + Netatmo" if formatted_netatmo else "SMHI-only"
    effects = " + WeatherEffects" if weather_state['weather_effects_enabled'] else ""
    warnings = " + Warnings" if weather_state['warnings_enabled'] else ""
    smhi_humidity = weather_state['smhi_data'].get('humidity') if weather_state['smhi_data'] else None
    humidity_info = f" (humidity: {smhi_humidity}%)" if smhi_humidity is not None else " (no humidity)"
    print(f"🌐 FAS 2: API Response - {mode}{effects}{warnings}{humidity_info}")
    
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

@app.route('/api/warnings')
def api_warnings():
    """API endpoint för SMHI vädervarningar."""
    if not weather_state['warnings_enabled']:
        return jsonify({
            'error': 'SMHI Warnings ej aktiverat',
            'enabled': False,
            'heavy_rain_warnings': [],
            'active_heavy_rain_warnings': [],
            'summary': {'total_warnings': 0}
        })
    
    warnings_data = weather_state.get('smhi_warnings_data')
    if not warnings_data:
        return jsonify({
            'error': 'Inga varningsdata tillgängliga',
            'enabled': True,
            'api_available': False,
            'heavy_rain_warnings': [],
            'active_heavy_rain_warnings': [],
            'summary': {'total_warnings': 0}
        })
    
    # Lägg till metadata
    response = {
        **warnings_data,
        'enabled': True,
        'cache_info': {
            'cache_duration_minutes': 10,  # Default från SMHIWarningsClient
            'last_api_update': weather_state['warnings_last_update']
        }
    }
    
    return jsonify(response)

@app.route('/api/warnings/heavy-rain')
def api_warnings_heavy_rain():
    """Dedikerad API endpoint för skyfallsvarningar."""
    if not weather_state['warnings_enabled'] or not weather_state.get('smhi_warnings_data'):
        return jsonify({
            'enabled': weather_state['warnings_enabled'],
            'heavy_rain_warnings': [],
            'active_count': 0,
            'total_count': 0
        })
    
    warnings_data = weather_state['smhi_warnings_data']
    heavy_rain = warnings_data.get('heavy_rain_warnings', [])
    active_heavy_rain = warnings_data.get('active_heavy_rain_warnings', [])
    
    return jsonify({
        'enabled': True,
        'heavy_rain_warnings': heavy_rain,
        'active_heavy_rain_warnings': active_heavy_rain,
        'active_count': len(active_heavy_rain),
        'total_count': len(heavy_rain),
        'last_update': warnings_data.get('last_update'),
        'api_available': warnings_data.get('api_available', False)
    })

@app.route('/api/status')
def api_status():
    """FAS 2: API endpoint för systemstatus med Netatmo-info och WeatherEffects."""
    # FAS 2: Lägg till humidity-status
    smhi_humidity_available = (
        weather_state['smhi_data'] is not None and 
        weather_state['smhi_data'].get('humidity') is not None
    )
    
    return jsonify({
        'status': weather_state['status'],
        'last_update': weather_state['last_update'],
        'theme': get_current_theme(),
        'config_loaded': weather_state['config'] is not None,
        'smhi_active': smhi_client is not None,
        'smhi_humidity_available': smhi_humidity_available,  # FAS 2: NYT - SMHI luftfuktighet tillgänglig
        'netatmo_configured': weather_state['use_netatmo'],  # FAS 2: Konfigurerat
        'netatmo_active': weather_state['netatmo_available'],  # FAS 2: Faktiskt tillgängligt
        'sun_calc_active': sun_calculator is not None,
        'pressure_trend_available': (
            weather_state['netatmo_data'] is not None and 
            'pressure_trend' in weather_state['netatmo_data'] and
            weather_state['netatmo_data']['pressure_trend']['trend'] != 'n/a'
        ),
        'system_mode': 'SMHI + Netatmo' if weather_state['netatmo_available'] else 'SMHI-only',  # FAS 2: Systemläge
        'weather_effects_enabled': weather_state['weather_effects_enabled'],  # FAS 2: WeatherEffects-status
        'weather_effects_config_loaded': weather_state['weather_effects_config'] is not None,  # FAS 2: Config-status
        'warnings_enabled': weather_state['warnings_enabled'],  # SMHI Warnings-status
        'warnings_active': smhi_warnings_client is not None,  # SMHI Warnings-klient tillgänglig
        'warnings_last_update': weather_state['warnings_last_update']  # Senaste varningsuppdatering
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

# === FAS 2: NYT API ENDPOINT FÖR WEATHEREFFECTS ===

@app.route('/api/weather-effects-config')
def api_weather_effects_config():
    """
    FAS 2: API endpoint för WeatherEffects-konfiguration.
    
    Returns:
        JSON: Validerad WeatherEffects-konfiguration för frontend
    """
    try:
        print("🌦️ FAS 2: WeatherEffects config API anropat")
        
        # Kontrollera att config är laddad
        if not weather_state['config']:
            print("❌ FAS 2: Ingen huvudkonfiguration laddad")
            return jsonify({
                'error': 'Konfiguration ej tillgänglig',
                'enabled': False,
                'fallback_reason': 'main_config_missing'
            }), 500
        
        # Hämta WeatherEffects-konfiguration
        raw_weather_effects_config = weather_state.get('weather_effects_config', {})
        
        # Validera konfigurationen
        validated_config = validate_weather_effects_config(raw_weather_effects_config)
        
        # Lägg till SMHI-integration data om SMHI-data finns
        smhi_integration = {}
        if weather_state['smhi_data']:
            weather_symbol = weather_state['smhi_data'].get('weather_symbol')
            precipitation = weather_state['smhi_data'].get('precipitation', 0)
            wind_direction = weather_state['smhi_data'].get('wind_direction', 0)
            
            if weather_symbol:
                effect_type = get_smhi_weather_effect_type(weather_symbol)
                smhi_integration = {
                    'current_weather_symbol': weather_symbol,
                    'current_effect_type': effect_type,
                    'current_precipitation': precipitation,
                    'current_wind_direction': wind_direction,
                    'last_smhi_update': weather_state.get('last_update')
                }
        
        # Bygg komplett API-respons
        api_response = {
            **validated_config,
            'smhi_integration': smhi_integration,
            'api_version': '1.0',
            'server_timestamp': datetime.now().isoformat(),
            'config_source': 'config.py' if weather_state['config'] else 'fallback'
        }
        
        # Debug-logging om aktiverat
        if validated_config.get('debug_logging'):
            print(f"🌦️ FAS 2: WeatherEffects config returnerad:")
            print(f"   Enabled: {validated_config['enabled']}")
            print(f"   Intensitet: {validated_config['intensity']}")
            print(f"   Regn droppar: {validated_config['rain_config']['droplet_count']}")
            print(f"   Snö flingor: {validated_config['snow_config']['flake_count']}")
            if smhi_integration:
                print(f"   SMHI Symbol: {smhi_integration.get('current_weather_symbol')} → {smhi_integration.get('current_effect_type')}")
        
        return jsonify(api_response)
        
    except Exception as e:
        print(f"❌ FAS 2: Fel vid WeatherEffects config API: {e}")
        
        # Returnera minimal fallback-config vid fel
        fallback_config = {
            'enabled': False,
            'error': 'Konfigurationsfel',
            'fallback_reason': 'api_error',
            'intensity': 'light',
            'rain_config': {'droplet_count': 30, 'droplet_speed': 2.0, 'wind_direction': 'none'},
            'snow_config': {'flake_count': 15, 'characters': ['*'], 'sparkle_enabled': False, 'min_size': 0.8, 'max_size': 1.2},
            'transition_duration': 1000,
            'debug_logging': True,
            'fallback_enabled': True
        }
        
        return jsonify(fallback_config), 500

@app.route('/api/weather')
def api_weather():
    """FAS 2: Alias för /api/current för bakåtkompatibilitet."""
    return api_current_weather()

# === FAS 2: WEATHEREFFECTS DEBUG ENDPOINT (UTVECKLING) ===

@app.route('/api/weather-effects-debug')
def api_weather_effects_debug():
    """
    FAS 2: Debug-endpoint för WeatherEffects utveckling.
    Visar detaljerad information om SMHI symbol mappning.
    """
    if not weather_state.get('weather_effects_config', {}).get('debug_logging', False):
        return jsonify({'error': 'Debug-läge ej aktiverat'}), 403
    
    debug_info = {
        'timestamp': datetime.now().isoformat(),
        'weather_effects_enabled': weather_state['weather_effects_enabled'],
        'config_loaded': weather_state['weather_effects_config'] is not None,
        'smhi_data_available': weather_state['smhi_data'] is not None,
    }
    
    # SMHI symbol mappning info
    if weather_state['smhi_data']:
        weather_symbol = weather_state['smhi_data'].get('weather_symbol')
        if weather_symbol:
            debug_info['smhi_symbol_mapping'] = {
                'current_symbol': weather_symbol,
                'effect_type': get_smhi_weather_effect_type(weather_symbol),
                'symbol_range_1_7': 'clear (klart väder)',
                'symbol_range_8_10_18_20': 'rain (regnskurar/regn)',
                'symbol_range_11_21': 'thunder (åska → intensivt regn)',
                'symbol_range_12_14_22_24': 'sleet (snöblandat → snö-effekt)',
                'symbol_range_15_17_25_27': 'snow (snöbyar/snöfall)'
            }
    
    # Konfiguration som används
    if weather_state['weather_effects_config']:
        debug_info['active_config'] = validate_weather_effects_config(weather_state['weather_effects_config'])
    
    return jsonify(debug_info)

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
    print("🚀 FAS 2: Startar Flask Weather Dashboard med WeatherEffects + SMHI Warnings-stöd...")
    print("=" * 80)
    
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
    
    print("=" * 80)
    print("🌤️ FAS 2: Flask Weather Dashboard redo med WeatherEffects + SMHI Warnings!")
    print("📱 Öppna: http://localhost:8036")
    print("🖥️ Chrome Kiosk: chromium-browser --kiosk --disable-infobars http://localhost:8036")
    
    # FAS 2: Visa systemläge
    mode = "SMHI + Netatmo" if weather_state['netatmo_available'] else "SMHI-only"
    effects = " + WeatherEffects" if weather_state['weather_effects_enabled'] else ""
    warnings = " + Warnings" if weather_state['warnings_enabled'] else ""
    print(f"🎯 Systemläge: {mode}{effects}{warnings}")
    
    # FAS 2: Visa WeatherEffects API endpoints
    if weather_state['weather_effects_enabled']:
        print(f"🌦️ WeatherEffects API: http://localhost:8036/api/weather-effects-config")
        effect_config = weather_state['weather_effects_config']
        rain_count = effect_config.get('rain_config', {}).get('droplet_count', 50)
        snow_count = effect_config.get('snow_config', {}).get('flake_count', 25)
        intensity = effect_config.get('intensity', 'auto')
        print(f"   🌧️ Regn: {rain_count} droppar | ❄️ Snö: {snow_count} flingor | 🎚️ Intensitet: {intensity}")
        
        # Debug endpoint om aktiverat
        if effect_config.get('debug_logging'):
            print(f"🔧 WeatherEffects Debug: http://localhost:8036/api/weather-effects-debug")
    else:
        print(f"📊 WeatherEffects: INAKTIVERAT (weather_effects.enabled=False)")
    
    # SMHI Warnings API endpoints
    if weather_state['warnings_enabled']:
        print(f"⚠️ SMHI Warnings API: http://localhost:8036/api/warnings")
        print(f"🌧️ Skyfall-varningar: http://localhost:8036/api/warnings/heavy-rain")
    else:
        print(f"📊 SMHI Warnings: INAKTIVERAT")
    
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
    
    # FAS 2: Visa SMHI luftfuktighets-status
    print(f"💧 SMHI Luftfuktighet: AKTIVERAT (FAS 2 implementerat)")
    print(f"🌐 API med humidity: http://localhost:8036/api/weather")
    
    print("=" * 80)
    
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