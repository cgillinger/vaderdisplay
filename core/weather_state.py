#!/usr/bin/env python3
"""
Flask Weather Dashboard - Centraliserad State Management
FAS 2: Refaktorering - Global state för väderdata och konfiguration
SSOT-FIX: Utökad med warnings-stöd för komplett Single Source of Truth
"""

from datetime import datetime
from typing import Dict, Optional, Any

# Global state för weather data - importeras av alla moduler
weather_state: Dict[str, Any] = {
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
    
    # SSOT-FIX: SMHI Warnings state tracking
    'smhi_warnings_data': None,        # SMHI varningsdata
    'warnings_last_update': None,      # Senaste varningsuppdatering
    'warnings_enabled': True,          # Varningar aktiverade (kan göras konfigurerbart senare)
}

# API clients - hanteras av weather_updater.py
# SSOT-FIX: Utökad med smhi_warnings_client
api_clients = {
    'smhi_client': None,
    'netatmo_client': None,
    'sun_calculator': None,
    'smhi_warnings_client': None  # SSOT-FIX: Tillagt för warnings-stöd
}

def get_weather_state() -> Dict[str, Any]:
    """
    Hämta aktuell weather state.
    
    Returns:
        dict: Komplett weather state
    """
    return weather_state

def update_weather_state(key: str, value: Any) -> None:
    """
    Uppdatera specifik nyckel i weather state.
    
    Args:
        key (str): Nyckel att uppdatera
        value (Any): Nytt värde
    """
    global weather_state
    weather_state[key] = value

def get_api_client(client_name: str) -> Optional[Any]:
    """
    Hämta specifik API-klient.
    
    Args:
        client_name (str): Namnet på klienten ('smhi_client', 'netatmo_client', 'sun_calculator', 'smhi_warnings_client')
        
    Returns:
        API-klient eller None om inte initialiserad
    """
    return api_clients.get(client_name)

def set_api_client(client_name: str, client_instance: Any) -> None:
    """
    Sätt API-klient.
    
    Args:
        client_name (str): Namnet på klienten
        client_instance (Any): Klient-instansen
    """
    global api_clients
    api_clients[client_name] = client_instance

def update_status(new_status: str) -> None:
    """
    Uppdatera systemstatus med timestamp.
    
    Args:
        new_status (str): Ny statustext
    """
    global weather_state
    weather_state['status'] = new_status
    weather_state['last_update'] = datetime.now().isoformat()
    print(f"📊 Status: {new_status}")

def get_system_mode() -> str:
    """
    Bestäm vilket systemläge som körs.
    
    Returns:
        str: Systemläge-beskrivning
    """
    mode = "SMHI + Netatmo" if weather_state['netatmo_available'] else "SMHI-only"
    effects = " + WeatherEffects" if weather_state['weather_effects_enabled'] else ""
    warnings = " + Warnings" if weather_state['warnings_enabled'] else ""  # SSOT-FIX: Tillagt warnings
    return f"{mode}{effects}{warnings}"

def is_netatmo_active() -> bool:
    """
    Kontrollera om Netatmo är aktivt och tillgängligt.
    
    Returns:
        bool: True om Netatmo är både konfigurerat och tillgängligt
    """
    return (weather_state['use_netatmo'] and 
            weather_state['netatmo_available'] and 
            weather_state['netatmo_data'] is not None)

def is_weather_effects_enabled() -> bool:
    """
    Kontrollera om WeatherEffects är aktiverat.
    
    Returns:
        bool: True om WeatherEffects är aktiverat och konfigurerat
    """
    return (weather_state['weather_effects_enabled'] and 
            weather_state['weather_effects_config'] is not None)

def get_humidity_info() -> Dict[str, Any]:
    """
    Hämta luftfuktighetsinfo från tillgängliga källor.
    
    Returns:
        dict: Luftfuktighetsdata med källa
    """
    humidity_info = {
        'value': None,
        'source': None,
        'station': None,
        'age_minutes': None
    }
    
    # Försök Netatmo först (mest aktuell)
    if is_netatmo_active() and weather_state['netatmo_data'].get('humidity'):
        humidity_info.update({
            'value': weather_state['netatmo_data']['humidity'],
            'source': 'netatmo',
            'station': weather_state['netatmo_data'].get('station_name', 'Netatmo'),
            'age_minutes': weather_state['netatmo_data'].get('data_age_minutes', 0)
        })
    # Fallback till SMHI
    elif weather_state['smhi_data'] and weather_state['smhi_data'].get('humidity') is not None:
        humidity_info.update({
            'value': weather_state['smhi_data']['humidity'],
            'source': 'smhi',
            'station': weather_state['smhi_data'].get('humidity_station', 'SMHI'),
            'age_minutes': weather_state['smhi_data'].get('humidity_age_minutes', 0)
        })
    
    return humidity_info

# SSOT-FIX: Nya warnings-funktioner
def is_warnings_enabled() -> bool:
    """
    Kontrollera om SMHI Warnings är aktiverat.
    
    Returns:
        bool: True om warnings är aktiverat
    """
    return weather_state['warnings_enabled']

def get_warnings_data() -> Optional[Dict[str, Any]]:
    """
    Hämta aktuell warnings-data.
    
    Returns:
        dict: Warnings-data eller None om inte tillgänglig
    """
    return weather_state['smhi_warnings_data']

def set_warnings_data(warnings_data: Dict[str, Any]) -> None:
    """
    Sätt warnings-data.
    
    Args:
        warnings_data (dict): Warnings-data från API
    """
    global weather_state
    weather_state['smhi_warnings_data'] = warnings_data
    weather_state['warnings_last_update'] = datetime.now().isoformat()

def get_warnings_last_update() -> Optional[str]:
    """
    Hämta senaste warnings-uppdateringstid.
    
    Returns:
        str: ISO-formaterad timestamp eller None
    """
    return weather_state['warnings_last_update']

def reset_state() -> None:
    """
    Återställ state till initial värden (för testing/restart).
    """
    global weather_state, api_clients
    
    weather_state.update({
        'smhi_data': None,
        'netatmo_data': None,
        'forecast_data': None,
        'daily_forecast_data': None,
        'sun_data': None,
        'last_update': None,
        'status': 'Återställd...',
        'netatmo_available': False,
        'weather_effects_enabled': False,
        'weather_effects_config': None,
        # SSOT-FIX: Återställ warnings-state
        'smhi_warnings_data': None,
        'warnings_last_update': None,
        'warnings_enabled': True
    })
    
    api_clients = {
        'smhi_client': None,
        'netatmo_client': None,
        'sun_calculator': None,
        'smhi_warnings_client': None  # SSOT-FIX: Inkludera warnings-klient
    }
    
    print("🔄 Weather state återställd")
