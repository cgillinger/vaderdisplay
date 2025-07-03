#!/usr/bin/env python3
"""
Flask Weather Dashboard - Weather API Routes
FAS 2: Refaktorering - Väder-relaterade API endpoints
"""

from flask import Blueprint, jsonify
from datetime import datetime

from core.weather_state import get_weather_state
from core.config_manager import get_current_theme
from dashboard_utils.data_formatters import (
    format_api_response_with_pressure_trend,
    format_smhi_data_for_api,
    format_forecast_data_for_api,
    format_daily_forecast_data_for_api,  # NYA: Separat daily formatter
    format_sun_data_for_api,
    create_ui_config_for_api,
    validate_api_data
)

# Skapa Blueprint för weather routes
weather_bp = Blueprint('weather', __name__, url_prefix='/api')


@weather_bp.route('/current')
def api_current_weather():
    """FAS 2: API endpoint för aktuell väderdata med intelligent Netatmo-hantering."""
    weather_state = get_weather_state()
    
    # FAS 2: Villkorsstyrd Netatmo-formatering
    formatted_netatmo = None
    if weather_state['netatmo_data'] and weather_state['netatmo_available']:
        formatted_netatmo = format_api_response_with_pressure_trend(
            weather_state['netatmo_data'], 
            weather_state['smhi_data']
        )
    
    # Formatera SMHI-data
    formatted_smhi = format_smhi_data_for_api(weather_state['smhi_data'])
    
    # Formatera sol-data
    formatted_sun = format_sun_data_for_api(weather_state['sun_data'])
    
    # FAS 2: Utökad config för frontend-intelligens
    ui_config = create_ui_config_for_api(weather_state['config'], weather_state)
    
    response_data = {
        'smhi': formatted_smhi,  # FAS 2: Nu innehåller humidity från get_current_weather_with_humidity()
        'netatmo': formatted_netatmo,  # Kan vara None i SMHI-only läge
        'sun': formatted_sun,
        'last_update': weather_state['last_update'],
        'theme': get_current_theme(weather_state['config']),
        'status': weather_state['status'],
        'config': ui_config
    }
    
    # Validera data innan respons
    if not validate_api_data(formatted_smhi, 'smhi'):
        print("⚠️ SMHI-data validering misslyckades")
    
    # FAS 2: Debug-logging för API-respons
    mode = "SMHI + Netatmo" if formatted_netatmo else "SMHI-only"
    effects = " + WeatherEffects" if weather_state['weather_effects_enabled'] else ""
    smhi_humidity = weather_state['smhi_data'].get('humidity') if weather_state['smhi_data'] else None
    humidity_info = f" (humidity: {smhi_humidity}%)" if smhi_humidity is not None else " (no humidity)"
    print(f"🌐 FAS 2: API Response - {mode}{effects}{humidity_info}")
    
    return jsonify(response_data)


@weather_bp.route('/forecast')
def api_forecast():
    """API endpoint för 12-timmars väderprognos."""
    weather_state = get_weather_state()
    
    formatted_forecast = format_forecast_data_for_api(weather_state['forecast_data'])
    
    if not validate_api_data(formatted_forecast, 'forecast'):
        print("⚠️ Prognosdata validering misslyckades")
    
    return jsonify({
        'forecast': formatted_forecast,
        'last_update': weather_state['last_update'],
        'data_points': len(formatted_forecast) if formatted_forecast else 0
    })


@weather_bp.route('/daily')
def api_daily_forecast():
    """FAS 2: FIX - API endpoint för daglig väderprognos med korrekt formatering."""
    weather_state = get_weather_state()
    
    # FIX: Använd den nya daily-specifika formatern
    formatted_daily = format_daily_forecast_data_for_api(weather_state['daily_forecast_data'])
    
    if not validate_api_data(formatted_daily, 'forecast'):
        print("⚠️ Daglig prognosdata validering misslyckades")
    
    return jsonify({
        'daily_forecast': formatted_daily,
        'last_update': weather_state['last_update'],
        'forecast_days': len(formatted_daily) if formatted_daily else 0
    })


@weather_bp.route('/weather')
def api_weather():
    """FAS 2: Alias för /api/current för bakåtkompatibilitet."""
    return api_current_weather()


@weather_bp.route('/sun')
def api_sun_times():
    """Dedikerad endpoint för sol-tider."""
    weather_state = get_weather_state()
    
    formatted_sun = format_sun_data_for_api(weather_state['sun_data'])
    
    if not validate_api_data(formatted_sun, 'sun'):
        print("⚠️ Sol-data validering misslyckades")
    
    return jsonify({
        'sun_times': formatted_sun,
        'last_update': weather_state['last_update'],
        'location': {
            'latitude': weather_state['config']['smhi']['latitude'] if weather_state['config'] else None,
            'longitude': weather_state['config']['smhi']['longitude'] if weather_state['config'] else None
        }
    })


@weather_bp.route('/theme')
def api_theme():
    """API endpoint för aktuellt tema."""
    weather_state = get_weather_state()
    
    return jsonify({
        'theme': get_current_theme(weather_state['config']),
        'timestamp': datetime.now().isoformat(),
        'auto_theme_enabled': (
            weather_state['config'].get('ui', {}).get('theme') == 'auto' 
            if weather_state['config'] else False
        )
    })


@weather_bp.route('/humidity')
def api_humidity_info():
    """Dedikerad endpoint för luftfuktighetsinfo från alla källor."""
    from core.weather_state import get_humidity_info
    
    weather_state = get_weather_state()
    humidity_info = get_humidity_info()
    
    # Berika med extra information
    response_data = {
        **humidity_info,
        'last_update': weather_state['last_update'],
        'available_sources': []
    }
    
    # Lista tillgängliga källor
    if weather_state['smhi_data'] and weather_state['smhi_data'].get('humidity') is not None:
        response_data['available_sources'].append('smhi')
    
    if (weather_state['netatmo_data'] and 
        weather_state['netatmo_available'] and 
        weather_state['netatmo_data'].get('humidity') is not None):
        response_data['available_sources'].append('netatmo')
    
    return jsonify(response_data)


@weather_bp.route('/location')
def api_location_info():
    """API endpoint för platsinformation."""
    weather_state = get_weather_state()
    
    if not weather_state['config']:
        return jsonify({'error': 'Konfiguration ej tillgänglig'}), 500
    
    return jsonify({
        'location_name': weather_state['config'].get('display', {}).get('location_name', 'Okänd'),
        'coordinates': {
            'latitude': weather_state['config']['smhi']['latitude'],
            'longitude': weather_state['config']['smhi']['longitude']
        },
        'data_sources': {
            'weather': 'SMHI',
            'indoor': 'Netatmo' if weather_state['netatmo_available'] else None,
            'sun_times': 'IPGeolocation API' if weather_state['config'].get('ipgeolocation', {}).get('api_key') else 'Calculated'
        }
    })
