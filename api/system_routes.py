#!/usr/bin/env python3
"""
Flask Weather Dashboard - System API Routes
FAS 2: Refaktorering - System, status och debug-relaterade API endpoints
"""

from flask import Blueprint, jsonify, request
from datetime import datetime
import threading

from core.weather_state import get_weather_state, get_api_client, get_system_mode
from core.config_manager import get_current_theme
from core.weather_updater import get_api_status, force_update_all_data, restart_api_clients
from dashboard_utils.pressure_utils import create_smhi_pressure_trend_fallback

# Skapa Blueprint för system routes
system_bp = Blueprint('system', __name__, url_prefix='/api')


@system_bp.route('/status')
def api_status():
    """FAS 2: API endpoint för systemstatus med Netatmo-info och WeatherEffects."""
    weather_state = get_weather_state()
    
    # FAS 2: Lägg till humidity-status
    smhi_humidity_available = (
        weather_state['smhi_data'] is not None and 
        weather_state['smhi_data'].get('humidity') is not None
    )
    
    # Hämta API-status från weather_updater
    api_status = get_api_status()
    
    return jsonify({
        'status': weather_state['status'],
        'last_update': weather_state['last_update'],
        'theme': get_current_theme(weather_state['config']),
        'config_loaded': weather_state['config'] is not None,
        'smhi_active': api_status['smhi_active'],
        'smhi_humidity_available': smhi_humidity_available,  # FAS 2: NYT - SMHI luftfuktighet tillgänglig
        'netatmo_configured': api_status['netatmo_configured'],  # FAS 2: Konfigurerat
        'netatmo_active': api_status['netatmo_active'],  # FAS 2: Faktiskt tillgängligt
        'sun_calc_active': api_status['sun_calc_active'],
        'pressure_trend_available': (
            weather_state['netatmo_data'] is not None and 
            'pressure_trend' in weather_state['netatmo_data'] and
            weather_state['netatmo_data']['pressure_trend']['trend'] != 'n/a'
        ),
        'system_mode': get_system_mode(),  # FAS 2: Systemläge
        'weather_effects_enabled': weather_state['weather_effects_enabled'],  # FAS 2: WeatherEffects-status
        'weather_effects_config_loaded': weather_state['weather_effects_config'] is not None,  # FAS 2: Config-status
        'server_time': datetime.now().isoformat(),
        'uptime_info': _get_uptime_info()
    })


@system_bp.route('/pressure_trend')
def api_pressure_trend():
    """Dedikerad API endpoint för trycktrend-data (för debugging)."""
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
        # FAS 2: SMHI-fallback
        pressure_trend = create_smhi_pressure_trend_fallback(weather_state['smhi_data'])
        current_pressure = weather_state['smhi_data'].get('pressure') if weather_state['smhi_data'] else None
        source = 'smhi_fallback'
    
    return jsonify({
        'pressure_trend': pressure_trend,
        'current_pressure': current_pressure,
        'timestamp': weather_state['last_update'],
        'source': source,
        'system_mode': get_system_mode(),
        'analysis_quality': pressure_trend.get('analysis_quality', 'unknown') if pressure_trend else 'unavailable'
    })


@system_bp.route('/health')
def api_health_check():
    """Komplett hälsokontroll av systemet."""
    weather_state = get_weather_state()
    api_status = get_api_status()
    
    health_status = {
        'overall_status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'components': {}
    }
    
    # Kontrollera SMHI
    smhi_healthy = (
        api_status['smhi_active'] and 
        weather_state['smhi_data'] is not None
    )
    health_status['components']['smhi'] = {
        'status': 'healthy' if smhi_healthy else 'unhealthy',
        'data_available': weather_state['smhi_data'] is not None,
        'last_update': weather_state.get('last_update'),
        'humidity_available': (
            weather_state['smhi_data'] is not None and 
            weather_state['smhi_data'].get('humidity') is not None
        )
    }
    
    # Kontrollera Netatmo (endast om konfigurerat)
    if weather_state['use_netatmo']:
        netatmo_healthy = (
            api_status['netatmo_active'] and 
            weather_state['netatmo_data'] is not None
        )
        health_status['components']['netatmo'] = {
            'status': 'healthy' if netatmo_healthy else 'unhealthy',
            'configured': api_status['netatmo_configured'],
            'active': api_status['netatmo_active'],
            'data_available': weather_state['netatmo_data'] is not None,
            'pressure_trend_available': (
                weather_state['netatmo_data'] is not None and
                'pressure_trend' in weather_state['netatmo_data']
            )
        }
    else:
        health_status['components']['netatmo'] = {
            'status': 'disabled',
            'reason': 'Not configured in use_netatmo setting'
        }
    
    # Kontrollera Sol-kalkylator
    sun_healthy = (
        api_status['sun_calc_active'] and 
        weather_state['sun_data'] is not None
    )
    health_status['components']['sun_calculator'] = {
        'status': 'healthy' if sun_healthy else 'unhealthy',
        'data_available': weather_state['sun_data'] is not None
    }
    
    # Kontrollera WeatherEffects
    if weather_state['weather_effects_enabled']:
        effects_healthy = weather_state['weather_effects_config'] is not None
        health_status['components']['weather_effects'] = {
            'status': 'healthy' if effects_healthy else 'unhealthy',
            'enabled': weather_state['weather_effects_enabled'],
            'config_loaded': weather_state['weather_effects_config'] is not None
        }
    else:
        health_status['components']['weather_effects'] = {
            'status': 'disabled',
            'reason': 'Not enabled in configuration'
        }
    
    # Bestäm overall status
    component_statuses = [comp.get('status') for comp in health_status['components'].values()]
    unhealthy_count = component_statuses.count('unhealthy')
    
    if unhealthy_count == 0:
        health_status['overall_status'] = 'healthy'
    elif unhealthy_count <= 1:
        health_status['overall_status'] = 'degraded'
    else:
        health_status['overall_status'] = 'unhealthy'
    
    return jsonify(health_status)


@system_bp.route('/config')
def api_config_info():
    """API endpoint för konfigurationsinformation (utan känsliga data)."""
    weather_state = get_weather_state()
    
    if not weather_state['config']:
        return jsonify({'error': 'Konfiguration ej tillgänglig'}), 500
    
    config = weather_state['config']
    
    # Säker konfigurationsinfo (inga API-nycklar)
    safe_config = {
        'display': {
            'location_name': config.get('display', {}).get('location_name', 'Stockholm')
        },
        'ui': {
            'theme': config.get('ui', {}).get('theme', 'dark'),
            'wind_unit': config.get('ui', {}).get('wind_unit', 'land'),
            'refresh_interval_minutes': config.get('ui', {}).get('refresh_interval_minutes', 15),
            'netatmo_refresh_interval_minutes': config.get('ui', {}).get('netatmo_refresh_interval_minutes', 10)
        },
        'features': {
            'use_netatmo': config.get('use_netatmo', False),
            'weather_effects_enabled': weather_state['weather_effects_enabled'],
            'smhi_humidity_enabled': True,  # FAS 2: Alltid aktiverat
            'pressure_trend_enabled': weather_state['netatmo_available']
        },
        'coordinates': {
            'latitude': config.get('smhi', {}).get('latitude'),
            'longitude': config.get('smhi', {}).get('longitude')
        }
    }
    
    return jsonify({
        'config': safe_config,
        'config_source': 'config.py',
        'last_loaded': weather_state.get('last_update'),
        'system_mode': get_system_mode()
    })


@system_bp.route('/force-update', methods=['POST'])
def api_force_update():
    """Tvinga uppdatering av all väderdata."""
    success = force_update_all_data()
    
    if success:
        return jsonify({
            'success': True,
            'message': 'Datauppdatering framtvingad',
            'timestamp': datetime.now().isoformat()
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Datauppdatering misslyckades',
            'timestamp': datetime.now().isoformat()
        }), 500


@system_bp.route('/restart-clients', methods=['POST'])
def api_restart_clients():
    """Starta om alla API-klienter."""
    weather_state = get_weather_state()
    
    if not weather_state['config']:
        return jsonify({
            'success': False,
            'message': 'Ingen konfiguration tillgänglig för omstart'
        }), 500
    
    success = restart_api_clients(weather_state['config'])
    
    if success:
        return jsonify({
            'success': True,
            'message': 'API-klienter omstartade',
            'timestamp': datetime.now().isoformat(),
            'new_system_mode': get_system_mode()
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Omstart av API-klienter misslyckades',
            'timestamp': datetime.now().isoformat()
        }), 500


@system_bp.route('/debug/threads')
def api_debug_threads():
    """Debug-endpoint för att visa aktiva trådar."""
    active_threads = []
    
    for thread in threading.enumerate():
        thread_info = {
            'name': thread.name,
            'daemon': thread.daemon,
            'alive': thread.is_alive(),
            'ident': thread.ident
        }
        active_threads.append(thread_info)
    
    return jsonify({
        'active_threads': active_threads,
        'total_count': len(active_threads),
        'timestamp': datetime.now().isoformat()
    })


@system_bp.route('/debug/memory')
def api_debug_memory():
    """Debug-endpoint för minnesanvändning."""
    import sys
    import gc
    
    memory_info = {
        'python_version': sys.version,
        'object_count': len(gc.get_objects()),
        'garbage_count': len(gc.garbage),
        'timestamp': datetime.now().isoformat()
    }
    
    # Försök hämta mer detaljerad minnesinfo om psutil finns
    try:
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_info.update({
            'memory_percent': process.memory_percent(),
            'memory_rss': process.memory_info().rss,
            'memory_vms': process.memory_info().vms
        })
    except ImportError:
        memory_info['psutil_available'] = False
    
    return jsonify(memory_info)


def _get_uptime_info():
    """Hämta uptime-information för servern."""
    try:
        with open('/proc/uptime', 'r') as f:
            uptime_seconds = float(f.readline().split()[0])
        
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        
        return {
            'uptime_seconds': uptime_seconds,
            'uptime_formatted': f"{days}d {hours}h {minutes}m",
            'available': True
        }
    except:
        return {
            'available': False,
            'reason': 'Could not read /proc/uptime'
        }
