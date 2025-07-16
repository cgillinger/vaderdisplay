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
+ SSOT-FIX: Ren Single Source of Truth - Använder endast core/ moduler
"""

from flask import Flask, render_template, jsonify, request
from datetime import datetime, timezone
import os
import sys
from typing import Dict, List, Optional

# Lägg till rätt data-katalog i Python path för import av API-klienter
sys.path.append(os.path.join(os.path.dirname(__file__), 'reference', 'data'))

# SSOT-FIX: Importera ALLT från core moduler
from core.weather_state import (
    get_weather_state, update_weather_state, 
    get_api_client, set_api_client, update_status,
    get_system_mode, is_netatmo_active, is_warnings_enabled,
    get_warnings_data, get_warnings_last_update
)
from core.config_manager import (
    load_config, validate_weather_effects_config, 
    get_smhi_weather_effect_type, get_current_theme
)
from core.weather_updater import (
    init_api_clients, update_weather_data, 
    start_background_tasks, format_api_response_with_pressure_trend,
    create_smhi_pressure_trend_fallback
)

try:
    from utils import get_weather_icon_unicode_char, get_weather_description_short
except ImportError as e:
    print(f"❌ Import fel: {e}")
    print("🔧 Kontrollera att reference/data/ finns och innehåller utils.py")
    sys.exit(1)

# Flask app setup
app = Flask(__name__)
app.config['SECRET_KEY'] = 'weather_dashboard_secret_key'

# SSOT-FIX: Inga globala variabler - allt i core/weather_state.py

# === FLASK ROUTES ===

@app.route('/')
def index():
    """Huvud-route för väder-dashboard."""
    # SSOT-FIX: Använd core/weather_state.py
    weather_state = get_weather_state()
    
    location_name = "Stockholm"
    if weather_state['config']:
        location_name = weather_state['config'].get('display', {}).get('location_name', 'Stockholm')
    
    # SSOT-FIX: Använd core/config_manager.py
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
    # SSOT-FIX: Använd core/weather_state.py
    weather_state = get_weather_state()
    
    # FAS 2: Villkorsstyrd Netatmo-formatering
    formatted_netatmo = None
    if weather_state['netatmo_data'] and weather_state['netatmo_available']:
        # SSOT-FIX: Använd core/weather_updater.py
        formatted_netatmo = format_api_response_with_pressure_trend(
            weather_state['netatmo_data'], 
            weather_state['smhi_data']
        )
    
    # FAS 2: Utökad config för frontend-intelligens
    ui_config = None
    if weather_state['config']:
        ui_config = {
            'wind_unit': weather_state['config'].get('ui', {}).get('wind_unit', 'land'),
            'use_netatmo': weather_state['use_netatmo'],
            'netatmo_available': weather_state['netatmo_available'],
            'weather_effects_enabled': weather_state['weather_effects_enabled'],
            'warnings_enabled': weather_state['warnings_enabled']  # SSOT-FIX: Använd state
        }
    
    response_data = {
        'smhi': weather_state['smhi_data'],
        'netatmo': formatted_netatmo,
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
    """API endpoint för väderprognos."""
    # SSOT-FIX: Använd core/weather_state.py
    weather_state = get_weather_state()
    
    return jsonify({
        'forecast': weather_state['forecast_data'],
        'last_update': weather_state['last_update']
    })

@app.route('/api/daily')
def api_daily_forecast():
    """API endpoint för daglig väderprognos."""
    # SSOT-FIX: Använd core/weather_state.py
    weather_state = get_weather_state()
    
    return jsonify({
        'daily_forecast': weather_state['daily_forecast_data'],
        'last_update': weather_state['last_update']
    })

@app.route('/api/warnings')
def api_warnings():
    """API endpoint för SMHI vädervarningar."""
    # SSOT-FIX: Använd core/weather_state.py
    if not is_warnings_enabled():
        return jsonify({
            'error': 'SMHI Warnings ej aktiverat',
            'enabled': False,
            'heavy_rain_warnings': [],
            'active_heavy_rain_warnings': [],
            'summary': {'total_warnings': 0}
        })
    
    warnings_data = get_warnings_data()
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
            'cache_duration_minutes': 10,
            'last_api_update': get_warnings_last_update()
        }
    }
    
    return jsonify(response)

@app.route('/api/warnings/heavy-rain')
def api_warnings_heavy_rain():
    """Dedikerad API endpoint för skyfallsvarningar."""
    # SSOT-FIX: Använd core/weather_state.py
    if not is_warnings_enabled():
        return jsonify({
            'enabled': False,
            'heavy_rain_warnings': [],
            'active_count': 0,
            'total_count': 0
        })
    
    warnings_data = get_warnings_data()
    if not warnings_data:
        return jsonify({
            'enabled': True,
            'heavy_rain_warnings': [],
            'active_count': 0,
            'total_count': 0
        })
    
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
    # SSOT-FIX: Använd core/weather_state.py
    weather_state = get_weather_state()
    
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
        'smhi_active': get_api_client('smhi_client') is not None,
        'smhi_humidity_available': smhi_humidity_available,
        'netatmo_configured': weather_state['use_netatmo'],
        'netatmo_active': weather_state['netatmo_available'],
        'sun_calc_active': get_api_client('sun_calculator') is not None,
        'pressure_trend_available': (
            weather_state['netatmo_data'] is not None and 
            'pressure_trend' in weather_state['netatmo_data'] and
            weather_state['netatmo_data']['pressure_trend']['trend'] != 'n/a'
        ),
        'system_mode': get_system_mode(),  # SSOT-FIX: Använd core/weather_state.py
        'weather_effects_enabled': weather_state['weather_effects_enabled'],
        'weather_effects_config_loaded': weather_state['weather_effects_config'] is not None,
        'warnings_enabled': weather_state['warnings_enabled'],  # SSOT-FIX: Använd state
        'warnings_active': get_api_client('smhi_warnings_client') is not None,  # SSOT-FIX: Använd core
        'warnings_last_update': get_warnings_last_update()  # SSOT-FIX: Använd core
    })

@app.route('/api/theme')
def api_theme():
    """API endpoint för tema-info."""
    return jsonify({
        'theme': get_current_theme(),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/pressure_trend')
def api_pressure_trend():
    """Dedikerad API endpoint för trycktrend-data (för debugging)."""
    # SSOT-FIX: Använd core/weather_state.py
    weather_state = get_weather_state()
    
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
        # FAS 2: SMHI-fallback - SSOT-FIX: Använd core/weather_updater.py
        pressure_trend = create_smhi_pressure_trend_fallback(weather_state['smhi_data'])
        current_pressure = weather_state['smhi_data'].get('pressure') if weather_state['smhi_data'] else None
        source = 'smhi_fallback'
    
    return jsonify({
        'pressure_trend': pressure_trend,
        'current_pressure': current_pressure,
        'timestamp': weather_state['last_update'],
        'source': source,
        'system_mode': get_system_mode()  # SSOT-FIX: Använd core/weather_state.py
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
        
        # SSOT-FIX: Använd core/weather_state.py
        weather_state = get_weather_state()
        
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
        
        # SSOT-FIX: Använd core/config_manager.py
        validated_config = validate_weather_effects_config(raw_weather_effects_config)
        
        # Lägg till SMHI-integration data om SMHI-data finns
        smhi_integration = {}
        if weather_state['smhi_data']:
            weather_symbol = weather_state['smhi_data'].get('weather_symbol')
            precipitation = weather_state['smhi_data'].get('precipitation', 0)
            wind_direction = weather_state['smhi_data'].get('wind_direction', 0)
            
            if weather_symbol:
                # SSOT-FIX: Använd core/config_manager.py
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
    # SSOT-FIX: Använd core/weather_state.py
    weather_state = get_weather_state()
    
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
            # SSOT-FIX: Använd core/config_manager.py
            effect_type = get_smhi_weather_effect_type(weather_symbol)
            debug_info['smhi_symbol_mapping'] = {
                'current_symbol': weather_symbol,
                'effect_type': effect_type,
                'symbol_range_1_7': 'clear (klart väder)',
                'symbol_range_8_10_18_20': 'rain (regnskurar/regn)',
                'symbol_range_11_21': 'thunder (åska → intensivt regn)',
                'symbol_range_12_14_22_24': 'sleet (snöblandat → snö-effekt)',
                'symbol_range_15_17_25_27': 'snow (snöbyar/snöfall)'
            }
    
    # Konfiguration som används
    if weather_state['weather_effects_config']:
        # SSOT-FIX: Använd core/config_manager.py
        debug_info['active_config'] = validate_weather_effects_config(weather_state['weather_effects_config'])
    
    return jsonify(debug_info)

# === APP INITIALIZATION ===

def initialize_app():
    """
    SSOT-FIX: Ren initialisering som använder endast core/ moduler.
    """
    print("🚀 FAS 2: Startar Flask Weather Dashboard med ren SSOT...")
    print("=" * 80)
    
    # SSOT-FIX: Använd core/config_manager.py
    config = load_config()
    if not config:
        print("❌ Kan inte starta utan giltig konfiguration")
        return False
    
    # SSOT-FIX: Sätt config i core/weather_state.py
    update_weather_state('config', config)
    
    # SSOT-FIX: Använd core/weather_updater.py
    api_clients_ok = init_api_clients(config)
    if not api_clients_ok:
        print("⚠️ FAS 2: Vissa API-klienter misslyckades - fortsätter ändå")
    
    # SSOT-FIX: Använd core/weather_updater.py
    start_background_tasks(config)
    
    print("=" * 80)
    print("🌤️ FAS 2: Flask Weather Dashboard redo med ren SSOT!")
    print("📱 Öppna: http://localhost:8036")
    print("🖥️ Chrome Kiosk: chromium-browser --kiosk --disable-infobars http://localhost:8036")
    
    # SSOT-FIX: Använd core/weather_state.py
    weather_state = get_weather_state()
    mode = get_system_mode()
    print(f"🎯 Systemläge: {mode}")
    
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
    
    print("✅ REN SSOT implementerad - inga dubletter kvar!")
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
