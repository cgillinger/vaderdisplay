#!/usr/bin/env python3
"""
Dashboard Utils - Data Formatters för API-respons
FAS 2: Refaktorering - Modulär dataformatering för alla API-endpoints
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dashboard_utils.pressure_utils import merge_pressure_trends


def format_api_response_with_pressure_trend(netatmo_data: Optional[Dict[str, Any]], 
                                          smhi_data: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
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
    
    # Hantera trycktrend med intelligent sammanslagning
    netatmo_trend = netatmo_data.get('pressure_trend')
    merged_trend = merge_pressure_trends(netatmo_trend, smhi_data)
    formatted_data['pressure_trend'] = merged_trend
    
    # Debug-logging
    source = merged_trend.get('source', 'unknown')
    trend = merged_trend.get('trend', 'n/a')
    quality = merged_trend.get('analysis_quality', 'unknown')
    print(f"📊 FAS 2: API - Trycktrend från {source}: {trend} ({quality})")
    
    return formatted_data


def format_smhi_data_for_api(smhi_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Formatera SMHI-data för API-respons.
    
    Args:
        smhi_data (dict): Raw SMHI-data från klient
        
    Returns:
        dict: Formaterad SMHI-data eller None
    """
    if not smhi_data:
        return None
    
    # Grundläggande SMHI-data med optional fields
    formatted_data = {
        'temperature': smhi_data.get('temperature'),
        'humidity': smhi_data.get('humidity'),  # FAS 2: Från observations API
        'pressure': smhi_data.get('pressure'),
        'wind_speed': smhi_data.get('wind_speed'),
        'wind_direction': smhi_data.get('wind_direction'),
        'weather_symbol': smhi_data.get('weather_symbol'),
        'weather_description': smhi_data.get('weather_description'),
        'precipitation': smhi_data.get('precipitation'),
        'visibility': smhi_data.get('visibility'),
        'timestamp': smhi_data.get('timestamp'),
        'source': 'smhi'
    }
    
    # FAS 2: Lägg till luftfuktighets-metadata om tillgänglig
    if smhi_data.get('humidity') is not None:
        formatted_data.update({
            'humidity_station': smhi_data.get('humidity_station'),
            'humidity_age_minutes': smhi_data.get('humidity_age_minutes'),
            'humidity_quality': smhi_data.get('humidity_quality', 'good')
        })
    
    return formatted_data


def format_netatmo_data_for_api(netatmo_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Formatera Netatmo-data för API-respons.
    
    Args:
        netatmo_data (dict): Raw Netatmo-data från klient
        
    Returns:
        dict: Formaterad Netatmo-data eller None
    """
    if not netatmo_data:
        return None
    
    return {
        'temperature': netatmo_data.get('temperature'),
        'humidity': netatmo_data.get('humidity'),
        'co2': netatmo_data.get('co2'),
        'noise': netatmo_data.get('noise'),
        'pressure': netatmo_data.get('pressure'),
        'last_updated': netatmo_data.get('last_updated'),
        'station_name': netatmo_data.get('station_name'),
        'module_name': netatmo_data.get('module_name')
    }


def format_forecast_data_for_api(forecast_data: Optional[list]) -> Optional[list]:
    """
    Formatera timprognos för API-respons.
    
    Args:
        forecast_data (list): Raw prognosdata från SMHI
        
    Returns:
        list: Formaterad prognosdata eller None
    """
    if not forecast_data or not isinstance(forecast_data, list):
        return None
    
    formatted_forecast = []
    
    # FAS 2: KRITISK FIX - Generera local_time för JavaScript kompatibilitet
    current_time = datetime.now()
    
    for i, forecast_item in enumerate(forecast_data):
        if not isinstance(forecast_item, dict):
            continue
        
        # Generera lokal tid för denna prognos (nuvarande tid + 3h * index)
        forecast_time = current_time + timedelta(hours=3 * (i + 1))
        local_time_str = forecast_time.strftime("%H:%M")
        
        formatted_item = {
            'local_time': local_time_str,  # FIX: JavaScript förväntar sig 'local_time', inte 'time'
            'temperature': forecast_item.get('temperature'),
            'weather_symbol': forecast_item.get('weather_symbol'),
            'weather_description': forecast_item.get('weather_description'),
            'precipitation': forecast_item.get('precipitation', 0),
            'wind_speed': forecast_item.get('wind_speed'),
            'wind_direction': forecast_item.get('wind_direction'),
            'relative_humidity': forecast_item.get('relative_humidity'),
            'visibility': forecast_item.get('visibility')
        }
        
        formatted_forecast.append(formatted_item)
    
    return formatted_forecast


def format_daily_forecast_data_for_api(daily_data: Optional[list]) -> Optional[list]:
    """
    KOMPLETT FIX - Formatera dagsprognos med korrekt datum-temperatur matchning.
    
    Args:
        daily_data (list): Raw dagsprognos från SMHI med temp_min/temp_max
        
    Returns:
        list: Formaterad dagsprognos med korrekta temperaturer för rätt dagar
    """
    if not daily_data or not isinstance(daily_data, list):
        return None
    
    formatted_daily = []
    weekdays = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
    
    print(f"🔧 DAILY KOMPLETT FIX: Bearbetar {len(daily_data)} dagar från SMHI")
    
    # KOMPLETT FIX: Hoppa över dag 0 (idag) och visa framtida dagar med rätt temperaturdata
    for i, daily_item in enumerate(daily_data[1:6]):  # Skip dag 0, ta dagar 1-5
        if not isinstance(daily_item, dict):
            continue
        
        # Använd datum som redan finns i SMHI-data istället för att generera
        date_from_smhi = daily_item.get('date')
        day_of_month = daily_item.get('day_of_month')
        
        if not date_from_smhi:
            print(f"⚠️ VARNING: Dag {i} saknar datum från SMHI")
            continue
            
        # Parsea datum från SMHI för att få rätt veckodag och månad
        try:
            date_obj = datetime.strptime(date_from_smhi, '%Y-%m-%d')
            weekday = weekdays[date_obj.weekday()]
            month_number = date_obj.month
            day_of_month = date_obj.day
        except ValueError:
            print(f"⚠️ VARNING: Ogiltigt datum från SMHI: {date_from_smhi}")
            continue
        
        # KOMPLETT FIX: Använd faktiska temp_min/temp_max från SMHI för denna specifika dag
        temp_min = daily_item.get('temp_min')
        temp_max = daily_item.get('temp_max')
        
        # Fallback endast om båda är None (vilket inte ska hända med korrekt SMHI-data)
        if temp_min is None and temp_max is None:
            print(f"⚠️ VARNING: Dag {i} ({date_from_smhi}) saknar temperaturdata: {daily_item}")
            temp_min = 10  # Konservativ fallback
            temp_max = 15
        elif temp_min is None:
            temp_min = temp_max - 5  # Rimlig skillnad
        elif temp_max is None:
            temp_max = temp_min + 5  # Rimlig skillnad
        
        # Avrunda till heltal för display
        temp_max_display = int(round(temp_max))
        temp_min_display = int(round(temp_min))
        
        formatted_item = {
            'weekday': weekday,                      # Svensk veckodag
            'date': date_from_smhi,                  # KOMPLETT FIX: Använd SMHI:s datum direkt
            'day_of_month': day_of_month,            # iOS-kompatibel dag
            'month_number': month_number,            # iOS-kompatibel månad
            'temp_max': temp_max_display,            # DAG-temperatur (högsta)
            'temp_min': temp_min_display,            # NATT-temperatur (lägsta)
            'weather_symbol': daily_item.get('weather_symbol'),
            'weather_description': daily_item.get('weather_description'),
            'precipitation': daily_item.get('precipitation_total', 0),
            'wind_speed': daily_item.get('wind_speed_avg'),
            'wind_direction': daily_item.get('wind_direction')
        }
        
        formatted_daily.append(formatted_item)
        
        # Debug-logging för verifiering
        print(f"✅ KOMPLETT FIX: {date_from_smhi} ({weekday}): DAG {temp_max_display}° / NATT {temp_min_display}° (från SMHI {temp_max:.1f}°/{temp_min:.1f}°)")
    
    print(f"📊 KOMPLETT FIX: Returnerar {len(formatted_daily)} formaterade dagar")
    return formatted_daily


def format_sun_data_for_api(sun_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Formatera sol-data för API-respons.
    
    Args:
        sun_data (dict): Raw sol-data från SunCalculator
        
    Returns:
        dict: Formaterad sol-data eller None
    """
    if not sun_data:
        return None
    
    return {
        'sunrise': sun_data.get('sunrise'),
        'sunset': sun_data.get('sunset'),
        'is_day': sun_data.get('is_day', True),
        'day_length': sun_data.get('day_length'),
        'solar_noon': sun_data.get('solar_noon'),
        'source': sun_data.get('source', 'calculated')
    }


def create_ui_config_for_api(config: Optional[Dict[str, Any]], 
                           weather_state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Skapa UI-konfiguration för frontend.
    
    Args:
        config (dict): Appkonfiguration
        weather_state (dict): Aktuell weather state
        
    Returns:
        dict: UI-konfiguration för frontend
    """
    if not config:
        return None
    
    ui_config = config.get('ui', {})
    display_config = config.get('display', {})
    
    return {
        'theme': ui_config.get('theme', 'dark'),
        'wind_unit': ui_config.get('wind_unit', 'land'),
        'location_name': display_config.get('location_name', 'Stockholm'),
        'refresh_interval': ui_config.get('refresh_interval_minutes', 15),
        'show_sun_times': ui_config.get('show_sun_times', True),
        'fullscreen': ui_config.get('fullscreen', True),
        'use_netatmo': weather_state.get('use_netatmo', False),
        'weather_effects_enabled': weather_state.get('weather_effects_enabled', False)
    }


def format_pressure_trend_for_api(pressure_trend: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Formatera trycktrend för API-respons.
    
    Args:
        pressure_trend (dict): Trycktrend-data från Netatmo eller SMHI
        
    Returns:
        dict: Formaterad trycktrend-data
    """
    if not pressure_trend:
        return None
    
    return {
        'trend': pressure_trend.get('trend', 'stable'),
        'change': pressure_trend.get('change', 0),
        'description': pressure_trend.get('description', 'Stabilt'),
        'current_pressure': pressure_trend.get('current_pressure'),
        'previous_pressure': pressure_trend.get('previous_pressure'),
        'source': pressure_trend.get('source', 'calculated')
    }


def validate_api_data(data: Optional[Dict[str, Any]], data_type: str) -> bool:
    """
    Validera API-data för konsistens.
    
    Args:
        data (dict): Data att validera
        data_type (str): Typ av data ('smhi', 'netatmo', 'forecast', etc.)
        
    Returns:
        bool: True om data är giltig
    """
    if not data or not isinstance(data, dict):
        return False
    
    # Grundläggande validering baserat på datatyp
    if data_type == 'smhi':
        required_fields = ['temperature', 'weather_symbol']
        return all(field in data for field in required_fields)
    elif data_type == 'netatmo':
        required_fields = ['temperature', 'pressure']
        return all(field in data for field in required_fields)
    elif data_type == 'forecast':
        return isinstance(data, list) and len(data) > 0
    
    return True