#!/usr/bin/env python3
"""
Flask Weather Dashboard - WeatherEffects API Routes
FAS 2: Refaktorering - WeatherEffects-relaterade API endpoints
"""

from flask import Blueprint, jsonify
from datetime import datetime

from core.weather_state import get_weather_state
from core.config_manager import validate_weather_effects_config, get_smhi_weather_effect_type

# Skapa Blueprint för effects routes
effects_bp = Blueprint('effects', __name__, url_prefix='/api')


@effects_bp.route('/weather-effects-config')
def api_weather_effects_config():
    """
    FAS 2: API endpoint för WeatherEffects-konfiguration.
    
    Returns:
        JSON: Validerad WeatherEffects-konfiguration för frontend
    """
    try:
        print("🌦️ FAS 2: WeatherEffects config API anropat")
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


@effects_bp.route('/weather-effects-debug')
def api_weather_effects_debug():
    """
    FAS 2: Debug-endpoint för WeatherEffects utveckling.
    Visar detaljerad information om SMHI symbol mappning.
    """
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
    
    # SMHI väderdata för debugging
    if weather_state['smhi_data']:
        debug_info['current_smhi_data'] = {
            'weather_symbol': weather_state['smhi_data'].get('weather_symbol'),
            'precipitation': weather_state['smhi_data'].get('precipitation', 0),
            'wind_speed': weather_state['smhi_data'].get('wind_speed', 0),
            'wind_direction': weather_state['smhi_data'].get('wind_direction', 0),
            'temperature': weather_state['smhi_data'].get('temperature')
        }
    
    return jsonify(debug_info)


@effects_bp.route('/weather-effects-status')
def api_weather_effects_status():
    """
    API endpoint för WeatherEffects systemstatus.
    """
    weather_state = get_weather_state()
    
    status_info = {
        'enabled': weather_state.get('weather_effects_enabled', False),
        'config_loaded': weather_state.get('weather_effects_config') is not None,
        'smhi_integration_active': weather_state.get('smhi_data') is not None,
        'last_update': weather_state.get('last_update'),
        'system_performance': {
            'target_platform': 'LP156WH4 (1366×768)',
            'target_device': 'Raspberry Pi 5',
            'optimizations_enabled': True
        }
    }
    
    # Lägg till aktuell effekt om SMHI-data finns
    if weather_state['smhi_data'] and weather_state['weather_effects_enabled']:
        weather_symbol = weather_state['smhi_data'].get('weather_symbol')
        if weather_symbol:
            current_effect = get_smhi_weather_effect_type(weather_symbol)
            status_info['current_effect'] = {
                'type': current_effect,
                'smhi_symbol': weather_symbol,
                'active': current_effect not in ['clear'],
                'precipitation': weather_state['smhi_data'].get('precipitation', 0)
            }
    
    # Lägg till konfigurationssummering
    if weather_state['weather_effects_config']:
        config = weather_state['weather_effects_config']
        status_info['configuration_summary'] = {
            'intensity': config.get('intensity', 'auto'),
            'rain_droplets': config.get('rain_config', {}).get('droplet_count', 50),
            'snow_flakes': config.get('snow_config', {}).get('flake_count', 25),
            'debug_logging': config.get('debug_logging', False)
        }
    
    return jsonify(status_info)


@effects_bp.route('/weather-effects-symbols')
def api_weather_effects_symbols():
    """
    API endpoint för SMHI väder-symbol till WeatherEffects mappning.
    """
    symbol_mapping = {
        'clear_weather': {
            'symbols': [1, 2, 3, 4, 5, 6, 7],
            'effect_type': 'clear',
            'description': 'Klart väder - inga effekter'
        },
        'rain': {
            'symbols': [8, 9, 10, 18, 19, 20],
            'effect_type': 'rain',
            'description': 'Regnskurar och regn'
        },
        'thunder': {
            'symbols': [11, 21],
            'effect_type': 'thunder',
            'description': 'Åska (behandlas som intensivt regn)'
        },
        'sleet': {
            'symbols': [12, 13, 14, 22, 23, 24],
            'effect_type': 'sleet',
            'description': 'Snöblandat regn (behandlas som snö)'
        },
        'snow': {
            'symbols': [15, 16, 17, 25, 26, 27],
            'effect_type': 'snow',
            'description': 'Snöbyar och snöfall'
        }
    }
    
    # Lägg till aktuell symbol om tillgänglig
    weather_state = get_weather_state()
    current_info = None
    
    if weather_state['smhi_data']:
        current_symbol = weather_state['smhi_data'].get('weather_symbol')
        if current_symbol:
            current_effect = get_smhi_weather_effect_type(current_symbol)
            current_info = {
                'current_symbol': current_symbol,
                'current_effect': current_effect,
                'timestamp': weather_state.get('last_update')
            }
    
    return jsonify({
        'symbol_mapping': symbol_mapping,
        'current_weather': current_info,
        'api_version': '1.0',
        'last_updated': datetime.now().isoformat()
    })
