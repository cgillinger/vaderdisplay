#!/usr/bin/env python3
"""
Flask Weather Dashboard - Weather Data Updater
FAS 2: Refaktorering - Background tasks och data-uppdateringar
SSOT-FIX: Utökad med warnings-stöd och trycktrend-funktioner
"""

import os
import sys
import threading
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Lägg till reference/data för import av API-klienter
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'reference', 'data'))

from .weather_state import (
    get_weather_state, update_weather_state, 
    get_api_client, set_api_client, update_status,
    set_warnings_data, is_warnings_enabled
)
from .config_manager import get_smhi_weather_effect_type


def init_api_clients(config: Dict[str, Any]) -> bool:
    """
    FAS 2: Villkorsstyrd initialisering av API-klienter.
    SSOT-FIX: Inkluderar warnings-klient.
    
    Args:
        config (dict): Applikationskonfiguration
        
    Returns:
        bool: True om initialisering lyckades (åtminstone delvis)
    """
    try:
        from smhi_client import SMHIClient
        from netatmo_client import NetatmoClient
        from smhi_warnings_client import SMHIWarningsClient  # SSOT-FIX: Tillagt
        from utils import SunCalculator
    except ImportError as e:
        print(f"❌ Import fel: {e}")
        print("🔧 Kontrollera att reference/data/ finns och innehåller smhi_client.py m.fl.")
        return False
    
    weather_state = get_weather_state()
    use_netatmo = weather_state['use_netatmo']
    warnings_enabled = weather_state['warnings_enabled']  # SSOT-FIX: Hämta från state
    
    try:
        # SMHI Client (alltid obligatorisk)
        smhi_lat = config['smhi']['latitude']
        smhi_lon = config['smhi']['longitude']
        smhi_client = SMHIClient(smhi_lat, smhi_lon)
        set_api_client('smhi_client', smhi_client)
        print(f"✅ SMHI-klient initierad för {smhi_lat}, {smhi_lon}")
        
        # SSOT-FIX: SMHI Warnings Client (villkorsstyrd)
        if warnings_enabled:
            try:
                # Konfigurerbar cache-duration (default 10 min för varningar)
                warnings_cache_duration = config.get('smhi_warnings', {}).get('cache_duration_minutes', 10) * 60
                smhi_warnings_client = SMHIWarningsClient(cache_duration=warnings_cache_duration)
                set_api_client('smhi_warnings_client', smhi_warnings_client)
                print(f"✅ SMHI Warnings-klient initierad (cache: {warnings_cache_duration//60} min)")
            except Exception as e:
                print(f"❌ SMHI Warnings-initialisering misslyckades: {e}")
                print("🔄 Fortsätter utan varningsstöd")
                set_api_client('smhi_warnings_client', None)
                update_weather_state('warnings_enabled', False)
        else:
            set_api_client('smhi_warnings_client', None)
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
                set_api_client('netatmo_client', netatmo_client)
                update_weather_state('netatmo_available', True)
                print("✅ FAS 2: Netatmo-klient initierad med trycktrend-stöd")
            except Exception as e:
                print(f"❌ FAS 2: Netatmo-initialisering misslyckades: {e}")
                print("🔄 FAS 2: Fortsätter i SMHI-only läge")
                set_api_client('netatmo_client', None)
                update_weather_state('netatmo_available', False)
                # Behåll use_netatmo=True men markera som otillgänglig
        else:
            set_api_client('netatmo_client', None)
            update_weather_state('netatmo_available', False)
            print("📊 FAS 2: Netatmo INAKTIVERAT i config - kör SMHI-only läge")
        
        # Sun Calculator (alltid obligatorisk)
        api_key = config.get('ipgeolocation', {}).get('api_key', '').strip() or None
        sun_calculator = SunCalculator(api_key)
        set_api_client('sun_calculator', sun_calculator)
        print(f"✅ Sol-kalkylator initierad ({'API' if api_key else 'Fallback'})")
        
        # FAS 2: WeatherEffects sammanfattning
        if weather_state['weather_effects_enabled']:
            effect_config = weather_state['weather_effects_config']
            rain_count = effect_config.get('rain_config', {}).get('droplet_count', 50)
            snow_count = effect_config.get('snow_config', {}).get('flake_count', 25)
            print(f"🌦️ WeatherEffects aktiverat - Regn: {rain_count}, Snö: {snow_count}")
        
        # FAS 2: Sammanfattning av initialiserat läge
        from .weather_state import get_system_mode
        print(f"🎯 FAS 2: Systemläge - {get_system_mode()}")
        
        return True
        
    except Exception as e:
        print(f"❌ Fel vid initialisering av API-klienter: {e}")
        return False


# SSOT-FIX: Warnings-funktioner flyttade från app.py
def update_warnings_data() -> None:
    """
    SSOT-FIX: Uppdatera SMHI varningsdata.
    """
    smhi_warnings_client = get_api_client('smhi_warnings_client')
    
    if not smhi_warnings_client or not is_warnings_enabled():
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
        
        set_warnings_data(warnings_data)
        
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
        fallback_data = {
            'heavy_rain_warnings': [],
            'active_heavy_rain_warnings': [],
            'summary': {'total_warnings': 0, 'active_warnings': 0},
            'last_update': datetime.now().isoformat(),
            'api_available': False,
            'error': str(e)
        }
        set_warnings_data(fallback_data)


# SSOT-FIX: Trycktrend-funktioner flyttade från app.py
def create_smhi_pressure_trend_fallback(smhi_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    SSOT-FIX: Skapa förenklad trycktrend från SMHI-data som fallback.
    
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


def format_api_response_with_pressure_trend(netatmo_data: Optional[Dict[str, Any]], 
                                          smhi_data: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    SSOT-FIX: Formatera Netatmo-data för API-respons med intelligent fallback.
    
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


def update_weather_data() -> None:
    """
    FAS 2: Uppdatera väderdata med villkorsstyrd Netatmo-hantering + SMHI luftfuktighet.
    SSOT-FIX: Inkluderar warnings-uppdatering.
    """
    weather_state = get_weather_state()
    smhi_client = get_api_client('smhi_client')
    netatmo_client = get_api_client('netatmo_client')
    sun_calculator = get_api_client('sun_calculator')
    
    try:
        print(f"🔄 FAS 2: Uppdaterar väderdata... ({datetime.now().strftime('%H:%M:%S')})")
        
        # FAS 2: SMHI data med luftfuktighet (alltid obligatorisk)
        if smhi_client:
            # FAS 2: KRITISK ÄNDRING - Använd get_current_weather_with_humidity() istället för get_current_weather()
            smhi_data = smhi_client.get_current_weather_with_humidity()
            update_weather_state('smhi_data', smhi_data)
            
            forecast_data = smhi_client.get_12h_forecast()
            update_weather_state('forecast_data', forecast_data)
            
            daily_forecast_data = smhi_client.get_daily_forecast(5)
            update_weather_state('daily_forecast_data', daily_forecast_data)
            
            # FAS 2: Debug-logging för luftfuktighetsdata
            if smhi_data:
                humidity = smhi_data.get('humidity')
                humidity_station = smhi_data.get('humidity_station')
                humidity_age = smhi_data.get('humidity_age_minutes')
                
                if humidity is not None:
                    print(f"✅ FAS 2: SMHI-data med luftfuktighet uppdaterad - {humidity}% från {humidity_station} (ålder: {humidity_age} min)")
                else:
                    print("⚠️ FAS 2: SMHI-data uppdaterad men ingen luftfuktighet tillgänglig")
                
                # FAS 2: WeatherEffects debugging
                if weather_state['weather_effects_enabled'] and smhi_data.get('weather_symbol'):
                    weather_symbol = smhi_data['weather_symbol']
                    effect_type = get_smhi_weather_effect_type(weather_symbol)
                    precipitation = smhi_data.get('precipitation', 0)
                    print(f"🌦️ FAS 2: SMHI Symbol {weather_symbol} → WeatherEffect '{effect_type}' (precipitation: {precipitation}mm)")
            else:
                print("❌ FAS 2: SMHI-data misslyckades")
        
        # FAS 2: Villkorsstyrd Netatmo data
        if netatmo_client and weather_state['netatmo_available']:
            try:
                netatmo_data = netatmo_client.get_current_weather()
                update_weather_state('netatmo_data', netatmo_data)
                
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
                update_weather_state('netatmo_data', None)
        else:
            update_weather_state('netatmo_data', None)
            if weather_state['use_netatmo']:
                print("📊 FAS 2: Netatmo konfigurerat men ej tillgängligt")
            else:
                print("📊 FAS 2: Netatmo inaktiverat - använder SMHI-only")
        
        # Sol data (alltid obligatorisk)
        if sun_calculator and weather_state['config']:
            lat = weather_state['config']['smhi']['latitude']
            lon = weather_state['config']['smhi']['longitude']
            sun_data = sun_calculator.get_sun_times(lat, lon)
            update_weather_state('sun_data', sun_data)
            print("✅ FAS 2: Sol-data uppdaterad")
        
        # SSOT-FIX: SMHI Warnings data (villkorsstyrd)
        if is_warnings_enabled():
            update_warnings_data()
        
        # Uppdatera timestamp och status
        update_weather_state('last_update', datetime.now().isoformat())
        
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
        
        if weather_state['warnings_enabled']:  # SSOT-FIX: Inkludera warnings
            status_parts.append("Warnings: ON")
        
        final_status = f"Data uppdaterad ({' | '.join(status_parts)})"
        update_weather_state('status', final_status)
        
        print("✅ FAS 2: Väderdata uppdaterad")
        
    except Exception as e:
        print(f"❌ FAS 2: Fel vid väderuppdatering: {e}")
        update_weather_state('status', f"Fel vid uppdatering: {e}")


def background_updater() -> None:
    """
    Huvudloop för väderuppdateringar.
    """
    weather_state = get_weather_state()
    
    if not weather_state['config']:
        print("⚠️ Ingen konfiguration - background_updater avslutar")
        return
    
    # Initial uppdatering
    update_weather_data()
    
    refresh_interval = weather_state['config'].get('ui', {}).get('refresh_interval_minutes', 15)
    refresh_seconds = refresh_interval * 60
    
    print(f"🔄 Background updater startar loop (interval: {refresh_interval} min)")
    
    while True:
        time.sleep(refresh_seconds)
        update_weather_data()


def netatmo_updater() -> None:
    """
    FAS 2: Villkorsstyrd snabb loop för Netatmo-uppdateringar.
    """
    weather_state = get_weather_state()
    
    if not weather_state['config'] or not weather_state['use_netatmo']:
        print("🔄 FAS 2: Netatmo-uppdaterare inaktiverad (use_netatmo=False)")
        return
    
    netatmo_interval = weather_state['config'].get('ui', {}).get('netatmo_refresh_interval_minutes', 10)
    netatmo_seconds = netatmo_interval * 60
    
    print(f"🔄 FAS 2: Netatmo updater startar loop (interval: {netatmo_interval} min)")
    
    while True:
        time.sleep(netatmo_seconds)
        
        # FAS 2: Kör bara om Netatmo är tillgängligt
        netatmo_client = get_api_client('netatmo_client')
        
        if netatmo_client and weather_state['netatmo_available']:
            try:
                netatmo_data = netatmo_client.get_current_weather()
                update_weather_state('netatmo_data', netatmo_data)
                
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


def start_background_tasks(config: Dict[str, Any]) -> None:
    """
    Starta alla background tasks.
    
    Args:
        config (dict): Applikationskonfiguration
    """
    weather_state = get_weather_state()
    
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


def get_api_status() -> Dict[str, Any]:
    """
    Hämta status för alla API-klienter.
    
    Returns:
        dict: Status för alla klienter
    """
    weather_state = get_weather_state()
    
    return {
        'smhi_active': get_api_client('smhi_client') is not None,
        'netatmo_configured': weather_state.get('use_netatmo', False),
        'netatmo_active': weather_state.get('netatmo_available', False),
        'sun_calc_active': get_api_client('sun_calculator') is not None,
        'warnings_active': get_api_client('smhi_warnings_client') is not None,  # SSOT-FIX: Tillagt
        'system_mode': weather_state.get('status', 'Unknown'),
        'weather_effects_enabled': weather_state.get('weather_effects_enabled', False)
    }


def force_update_all_data() -> bool:
    """
    Tvinga uppdatering av all väderdata.
    
    Returns:
        bool: True om uppdatering lyckades
    """
    try:
        print("🔄 Framtvingar komplett datauppdatering...")
        update_weather_data()
        print("✅ Framtvingad uppdatering klar")
        return True
    except Exception as e:
        print(f"❌ Framtvingad uppdatering misslyckades: {e}")
        return False


def restart_api_clients(config: Dict[str, Any]) -> bool:
    """
    Starta om alla API-klienter.
    
    Args:
        config (dict): Applikationskonfiguration
        
    Returns:
        bool: True om omstart lyckades
    """
    try:
        print("🔄 Startar om API-klienter...")
        
        # Rensa befintliga klienter
        set_api_client('smhi_client', None)
        set_api_client('netatmo_client', None)
        set_api_client('sun_calculator', None)
        set_api_client('smhi_warnings_client', None)  # SSOT-FIX: Tillagt
        
        # Initialisera på nytt
        success = init_api_clients(config)
        
        if success:
            print("✅ API-klienter omstartade")
            # Tvinga uppdatering med nya klienter
            update_weather_data()
        else:
            print("❌ Omstart av API-klienter misslyckades")
        
        return success
        
    except Exception as e:
        print(f"❌ Fel vid omstart av API-klienter: {e}")
        return False
