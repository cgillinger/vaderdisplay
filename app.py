#!/usr/bin/env python3
"""
Flask Weather Dashboard - SSOT-FIX V2 KORRIGERAD
SSOT-FIX V2.1: Behåller API-kompatibilitet för att undvika JavaScript-loops
+ PERFEKT SSOT: Endast core-moduler
+ ORIGINAL API-STRUKTUR: Inga nya nycklar som triggar frontend-loops
+ SAFE IMPORTS: Eliminerar path-manipulationer
+ INBYGGDA TESTER: Verifiering av funktionalitet
"""

from flask import Flask, render_template, jsonify, request
from datetime import datetime, timezone
import os
import sys
from typing import Dict, List, Optional, Any
import traceback

# === SSOT-FIX V2.1: ENDAST CORE-MODULER ===
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

# === SSOT-FIX V2.1: SAFE UTILITY IMPORTS ===
def safe_import_utils():
    """Säker import av utilities utan path-konflikter."""
    try:
        reference_data_path = os.path.join(os.path.dirname(__file__), 'reference', 'data')
        
        if reference_data_path not in sys.path:
            sys.path.insert(0, reference_data_path)
        
        from utils import get_weather_icon_unicode_char, get_weather_description_short
        
        # Rensa path efter import
        if reference_data_path in sys.path:
            sys.path.remove(reference_data_path)
        
        return get_weather_icon_unicode_char, get_weather_description_short
        
    except ImportError as e:
        print(f"❌ SSOT-FIX V2.1: Utils import misslyckades: {e}")
        
        def fallback_icon(symbol):
            return "🌤️"
        
        def fallback_description(symbol):
            return "Väderprognos"
        
        return fallback_icon, fallback_description

# Importera utils säkert
get_weather_icon_unicode_char, get_weather_description_short = safe_import_utils()

# === FLASK APP SETUP ===
app = Flask(__name__)
app.config['SECRET_KEY'] = 'weather_dashboard_secret_key'

# === SSOT-FIX V2.1: INBYGGDA TESTMETODER ===

def test_core_modules():
    """Testa att alla core-moduler fungerar korrekt."""
    print("🧪 SSOT-FIX V2.1: Testar core-moduler...")
    
    test_results = {
        'weather_state': False,
        'config_manager': False,
        'weather_updater': False,
        'utils': False
    }
    
    # Test 1: Weather State
    try:
        state = get_weather_state()
        update_weather_state('test_key', 'test_value')
        if get_weather_state().get('test_key') == 'test_value':
            test_results['weather_state'] = True
            print("✅ Weather State: OK")
        else:
            print("❌ Weather State: State update misslyckades")
    except Exception as e:
        print(f"❌ Weather State: {e}")
    
    # Test 2: Config Manager
    try:
        config = load_config()
        theme = get_current_theme()
        if config and theme:
            test_results['config_manager'] = True
            print("✅ Config Manager: OK")
        else:
            print("❌ Config Manager: Config eller theme saknas")
    except Exception as e:
        print(f"❌ Config Manager: {e}")
    
    # Test 3: Weather Updater
    try:
        state = get_weather_state()
        if state.get('config'):
            test_results['weather_updater'] = True
            print("✅ Weather Updater: OK")
        else:
            print("❌ Weather Updater: Ingen config tillgänglig")
    except Exception as e:
        print(f"❌ Weather Updater: {e}")
    
    # Test 4: Utils
    try:
        icon = get_weather_icon_unicode_char(1)
        desc = get_weather_description_short(1)
        if icon and desc:
            test_results['utils'] = True
            print("✅ Utils: OK")
        else:
            print("❌ Utils: Icon eller description saknas")
    except Exception as e:
        print(f"❌ Utils: {e}")
    
    return test_results

def test_ssot_compliance():
    """Verifiera att SSOT-principen följs."""
    print("🧪 SSOT-FIX V2.1: Testar SSOT-compliance...")
    
    # Test: State-referens identitet
    state1 = get_weather_state()
    state2 = get_weather_state()
    
    if state1 is state2:
        print("✅ SSOT: State-referens är identisk")
    else:
        print("❌ SSOT: State-referens är inte identisk")
    
    # Test: Config-access via core
    try:
        config = load_config()
        theme = get_current_theme()
        if config and theme:
            print("✅ SSOT: Config-access via core fungerar")
        else:
            print("❌ SSOT: Config-access misslyckades")
    except Exception as e:
        print(f"❌ SSOT: Config-access fel: {e}")
    
    # Test: API-clients via core
    try:
        smhi_client = get_api_client('smhi_client')
        print(f"✅ SSOT: API-client access fungerar (SMHI: {'OK' if smhi_client else 'None'})")
    except Exception as e:
        print(f"❌ SSOT: API-client access fel: {e}")

def test_api_endpoints():
    """Testa API-endpoints för funktionalitet."""
    print("🧪 SSOT-FIX V2.1: Testar API-endpoints...")
    
    with app.test_client() as client:
        # Test huvudroute
        try:
            response = client.get('/')
            if response.status_code == 200:
                print("✅ API: Huvudroute (/) fungerar")
            else:
                print(f"❌ API: Huvudroute gav status {response.status_code}")
        except Exception as e:
            print(f"❌ API: Huvudroute fel: {e}")
        
        # Test kritiska API-endpoints
        api_endpoints = [
            '/api/status',
            '/api/current', 
            '/api/theme',
            '/api/pressure_trend'
        ]
        
        for endpoint in api_endpoints:
            try:
                response = client.get(endpoint)
                if response.status_code == 200:
                    print(f"✅ API: {endpoint} fungerar")
                else:
                    print(f"❌ API: {endpoint} gav status {response.status_code}")
            except Exception as e:
                print(f"❌ API: {endpoint} fel: {e}")

def run_all_tests():
    """Kör alla tester för SSOT-verifiering."""
    print("=" * 60)
    print("🧪 SSOT-FIX V2.1: Funktionsverifiering startar...")
    print("=" * 60)
    
    core_results = test_core_modules()
    test_ssot_compliance()
    test_api_endpoints()
    
    print("=" * 60)
    
    core_passed = sum(core_results.values())
    core_total = len(core_results)
    
    print(f"📊 TESTRESULTAT: {core_passed}/{core_total} core-moduler fungerar")
    
    if core_passed == core_total:
        print("✅ SSOT-FIX V2.1: Alla tester GODKÄNDA")
        return True
    else:
        print("❌ SSOT-FIX V2.1: Vissa tester MISSLYCKADES")
        return False

# === FLASK ROUTES ===

@app.route('/')
def index():
    """
    Huvud-route för väder-dashboard.
    SSOT-FIX V2.1: Endast core-moduler, original template-struktur.
    """
    try:
        # SSOT-FIX V2.1: All state via core
        weather_state = get_weather_state()
        
        location_name = "Stockholm"
        if weather_state['config']:
            location_name = weather_state['config'].get('display', {}).get('location_name', 'Stockholm')
        
        # SSOT-FIX V2.1: All config via core
        current_theme = get_current_theme()
        
        template_vars = {
            'location_name': location_name,
            'theme': current_theme,
            'weather_effects_enabled': weather_state['weather_effects_enabled']
        }
        
        return render_template('index.html', **template_vars)
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Index route fel: {e}")
        return f"Applikationsfel: {e}", 500

@app.route('/api/current')
def api_current_weather():
    """
    FAS 2: API endpoint för aktuell väderdata med intelligent Netatmo-hantering.
    SSOT-FIX V2.1: ORIGINAL API-STRUKTUR för att undvika JavaScript-loops.
    """
    try:
        # SSOT-FIX V2.1: All state via core MEN behåll original access-pattern
        weather_state = get_weather_state()
        
        # FAS 2: Villkorsstyrd Netatmo-formatering (ORIGINAL LOGIK)
        formatted_netatmo = None
        if weather_state['netatmo_data'] and weather_state['netatmo_available']:
            formatted_netatmo = format_api_response_with_pressure_trend(
                weather_state['netatmo_data'], 
                weather_state['smhi_data']
            )
        
        # FAS 2: Utökad config för frontend-intelligens (ORIGINAL STRUKTUR)
        ui_config = None
        if weather_state['config']:
            ui_config = {
                'wind_unit': weather_state['config'].get('ui', {}).get('wind_unit', 'land'),
                'use_netatmo': weather_state['use_netatmo'],
                'netatmo_available': weather_state['netatmo_available'],
                'weather_effects_enabled': weather_state['weather_effects_enabled'],
                'warnings_enabled': weather_state['warnings_enabled']
            }
        
        # SSOT-FIX V2.1: EXAKT ORIGINAL API-STRUKTUR (inga nya nycklar!)
        response_data = {
            'smhi': weather_state['smhi_data'],
            'netatmo': formatted_netatmo,
            'sun': weather_state['sun_data'],
            'last_update': weather_state['last_update'],
            'theme': get_current_theme(),
            'status': weather_state['status'],
            'config': ui_config
        }
        
        # FAS 2: Debug-logging för API-respons (ORIGINAL)
        mode = "SMHI + Netatmo" if formatted_netatmo else "SMHI-only"
        effects = " + WeatherEffects" if weather_state['weather_effects_enabled'] else ""
        warnings = " + Warnings" if weather_state['warnings_enabled'] else ""
        smhi_humidity = weather_state['smhi_data'].get('humidity') if weather_state['smhi_data'] else None
        humidity_info = f" (humidity: {smhi_humidity}%)" if smhi_humidity is not None else " (no humidity)"
        print(f"🌐 FAS 2: API Response - {mode}{effects}{warnings}{humidity_info}")
        
        return jsonify(response_data)
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Current weather API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

@app.route('/api/forecast')
def api_forecast():
    """API endpoint för väderprognos."""
    try:
        # SSOT-FIX V2.1: Via core men original struktur
        weather_state = get_weather_state()
        
        return jsonify({
            'forecast': weather_state['forecast_data'],
            'last_update': weather_state['last_update']
        })
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Forecast API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

@app.route('/api/daily')
def api_daily_forecast():
    """API endpoint för daglig väderprognos."""
    try:
        # SSOT-FIX V2.1: Via core men original struktur
        weather_state = get_weather_state()
        
        return jsonify({
            'daily_forecast': weather_state['daily_forecast_data'],
            'last_update': weather_state['last_update']
        })
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Daily forecast API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

@app.route('/api/warnings')
def api_warnings():
    """API endpoint för SMHI vädervarningar."""
    try:
        return jsonify({
            'warnings': get_warnings_data(),
            'last_update': get_warnings_last_update(),
            'enabled': is_warnings_enabled()
        })
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Warnings API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

@app.route('/api/warnings/heavy-rain')
def api_heavy_rain_warnings():
    """API endpoint för skyfall-varningar."""
    try:
        warnings_data = get_warnings_data()
        
        if not warnings_data:
            return jsonify({'heavy_rain_warnings': []})
        
        # Filtrera skyfall-varningar
        heavy_rain_warnings = []
        for warning in warnings_data.get('warnings', []):
            if 'regn' in warning.get('event', '').lower() or 'skyfall' in warning.get('event', '').lower():
                heavy_rain_warnings.append(warning)
        
        return jsonify({
            'heavy_rain_warnings': heavy_rain_warnings,
            'last_update': get_warnings_last_update()
        })
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Heavy rain warnings API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

@app.route('/api/status')
def api_status():
    """API endpoint för systemstatus."""
    try:
        # SSOT-FIX V2.1: Via core men original logik
        weather_state = get_weather_state()
        
        # FAS 2: Lägg till humidity-status (ORIGINAL LOGIK)
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
            'system_mode': get_system_mode(),
            'weather_effects_enabled': weather_state['weather_effects_enabled'],
            'weather_effects_config_loaded': weather_state['weather_effects_config'] is not None,
            'warnings_enabled': weather_state['warnings_enabled'],
            'warnings_active': get_api_client('smhi_warnings_client') is not None,
            'warnings_last_update': get_warnings_last_update()
        })
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Status API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

@app.route('/api/theme')
def api_theme():
    """API endpoint för tema-info."""
    try:
        return jsonify({
            'theme': get_current_theme(),
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Theme API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

@app.route('/api/pressure_trend')
def api_pressure_trend():
    """Dedikerad API endpoint för trycktrend-data (för debugging)."""
    try:
        # SSOT-FIX V2.1: Via core men original logik
        weather_state = get_weather_state()
        
        if not weather_state['netatmo_data'] and not weather_state['smhi_data']:
            return jsonify({
                'error': 'Ingen väderdata tillgänglig',
                'pressure_trend': None,
                'system_mode': 'No data'
            })
        
        # FAS 2: Intelligent trycktrend-respons (ORIGINAL)
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
            'system_mode': get_system_mode()
        })
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Pressure trend API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

# === FAS 2: WEATHEREFFECTS API ENDPOINT ===

@app.route('/api/weather-effects-config')
def api_weather_effects_config():
    """
    FAS 2: API endpoint för WeatherEffects-konfiguration.
    SSOT-FIX V2.1: Via core men original struktur.
    """
    try:
        print("🌦️ FAS 2: WeatherEffects config API anropat")
        
        # SSOT-FIX V2.1: Via core
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
        
        # SSOT-FIX V2.1: Via core
        validated_config = validate_weather_effects_config(raw_weather_effects_config)
        
        # Lägg till SMHI-integration data om SMHI-data finns (ORIGINAL LOGIK)
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
        
        # Bygg komplett API-respons (ORIGINAL STRUKTUR)
        api_response = {
            **validated_config,
            'smhi_integration': smhi_integration,
            'api_version': '1.0',
            'server_timestamp': datetime.now().isoformat(),
            'config_source': 'config.py' if weather_state['config'] else 'fallback'
        }
        
        return jsonify(api_response)
        
    except Exception as e:
        print(f"❌ FAS 2: Fel vid WeatherEffects config API: {e}")
        
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

@app.route('/api/weather-effects-debug')
def api_weather_effects_debug():
    """Debug-endpoint för WeatherEffects utveckling."""
    try:
        # SSOT-FIX V2.1: Via core
        weather_state = get_weather_state()
        
        if not weather_state.get('weather_effects_config', {}).get('debug_logging', False):
            return jsonify({'error': 'Debug-läge ej aktiverat'}), 403
        
        debug_info = {
            'timestamp': datetime.now().isoformat(),
            'weather_effects_enabled': weather_state['weather_effects_enabled'],
            'config_loaded': weather_state['weather_effects_config'] is not None,
            'smhi_data_available': weather_state['smhi_data'] is not None,
        }
        
        # SMHI symbol mappning (ORIGINAL LOGIK)
        if weather_state['smhi_data']:
            weather_symbol = weather_state['smhi_data'].get('weather_symbol')
            if weather_symbol:
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
        
        # Aktiv konfiguration
        if weather_state['weather_effects_config']:
            debug_info['active_config'] = validate_weather_effects_config(
                weather_state['weather_effects_config']
            )
        
        return jsonify(debug_info)
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Weather effects debug API fel: {e}")
        return jsonify({'error': f'API-fel: {e}'}), 500

# === SSOT-FIX V2.1: TEST ENDPOINTS ===

@app.route('/api/test/ssot')
def api_test_ssot():
    """API endpoint för SSOT-testning."""
    try:
        core_results = test_core_modules()
        
        return jsonify({
            'ssot_test_results': core_results,
            'timestamp': datetime.now().isoformat(),
            'all_passed': all(core_results.values())
        })
    
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: SSOT test API fel: {e}")
        return jsonify({'error': f'Test-fel: {e}'}), 500

# === APP INITIALIZATION ===

def initialize_app():
    """
    SSOT-FIX V2.1: Ren initialisering via core-moduler.
    """
    print("🚀 SSOT-FIX V2.1: Startar Flask Weather Dashboard...")
    print("=" * 80)
    
    try:
        # SSOT-FIX V2.1: All config via core
        config = load_config()
        if not config:
            print("❌ SSOT-FIX V2.1: Kan inte starta utan giltig konfiguration")
            return False
        
        # SSOT-FIX V2.1: Sätt config via core
        update_weather_state('config', config)
        
        # SSOT-FIX V2.1: Initiera API-klienter via core
        api_clients_ok = init_api_clients(config)
        if not api_clients_ok:
            print("⚠️ SSOT-FIX V2.1: Vissa API-klienter misslyckades - fortsätter ändå")
        
        # SSOT-FIX V2.1: Starta bakgrundsuppgifter via core
        start_background_tasks(config)
        
        print("=" * 80)
        print("🌤️ SSOT-FIX V2.1: Flask Weather Dashboard redo med perfekt SSOT!")
        print("📱 Öppna: http://localhost:8036")
        print("🖥️ Chrome Kiosk: chromium-browser --kiosk --disable-infobars http://localhost:8036")
        
        # SSOT-FIX V2.1: Visa system-info via core
        weather_state = get_weather_state()
        mode = get_system_mode()
        print(f"🎯 Systemläge: {mode}")
        
        # WeatherEffects info
        if weather_state['weather_effects_enabled']:
            print(f"🌦️ WeatherEffects API: http://localhost:8036/api/weather-effects-config")
            effect_config = weather_state.get('weather_effects_config', {})
            rain_count = effect_config.get('rain_config', {}).get('droplet_count', 50)
            snow_count = effect_config.get('snow_config', {}).get('flake_count', 25)
            intensity = effect_config.get('intensity', 'auto')
            print(f"   🌧️ Regn: {rain_count} droppar | ❄️ Snö: {snow_count} flingor | 🎚️ Intensitet: {intensity}")
            
            if effect_config.get('debug_logging'):
                print(f"🔧 WeatherEffects Debug: http://localhost:8036/api/weather-effects-debug")
        else:
            print(f"📊 WeatherEffects: INAKTIVERAT")
        
        # Warnings info
        if weather_state['warnings_enabled']:
            print(f"⚠️ SMHI Warnings API: http://localhost:8036/api/warnings")
            print(f"🌧️ Skyfall-varningar: http://localhost:8036/api/warnings/heavy-rain")
        else:
            print(f"📊 SMHI Warnings: INAKTIVERAT")
        
        # API endpoints
        print(f"📊 Trycktrend API: http://localhost:8036/api/pressure_trend")
        print(f"🧪 SSOT Test API: http://localhost:8036/api/test/ssot")
        
        # Config info
        if config:
            print(f"🌬️ Vindenheter: {config.get('ui', {}).get('wind_unit', 'land')}")
            print(f"🎨 Tema: {config.get('ui', {}).get('theme', 'dark')}")
        
        print("✅ SSOT-FIX V2.1: Perfekt Single Source of Truth MED original API-struktur!")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"❌ SSOT-FIX V2.1: Initialiseringsfel: {e}")
        print(f"📊 Traceback: {traceback.format_exc()}")
        return False

if __name__ == '__main__':
    # SSOT-FIX V2.1: Kör tester före start
    print("🧪 SSOT-FIX V2.1: Kör funktionsverifiering...")
    
    if initialize_app():
        # Kör alla tester
        if run_all_tests():
            print("🚀 SSOT-FIX V2.1: Alla tester godkända - startar Flask...")
            
            app.run(
                host='0.0.0.0',
                port=8036,
                debug=False,
                threaded=True
            )
        else:
            print("❌ SSOT-FIX V2.1: Tester misslyckades - kontrollera konfiguration")
            sys.exit(1)
    else:
        print("❌ SSOT-FIX V2.1: Kunde inte starta Flask-appen")
        sys.exit(1)