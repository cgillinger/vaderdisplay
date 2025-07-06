from datetime import datetime, timedelta
#!/usr/bin/env python3
"""
Flask Weather Dashboard - Data Formatters
FAS 2: Refaktorering - API-dataformatering och validering
"""

from typing import Dict, Any, Optional
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
        smhi_data (dict): Raw SMHI-data
        
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


def format_forecast_data_for_api(forecast_data: Optional[list]) -> Optional[list]:
    """
    Formatera prognosdata för API-respons.
    
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
    FAS 2: FIX - Formatera dagsprognos för API-respons med weekday, temp_min/max.
    
    Args:
        daily_data (list): Raw dagsprognos från SMHI
        
    Returns:
        list: Formaterad dagsprognos med weekday, temp_max, temp_min
    """
    if not daily_data or not isinstance(daily_data, list):
        return None
    
    formatted_daily = []
    current_date = datetime.now()
    
    weekdays = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
    
    for i, daily_item in enumerate(daily_data):
        if not isinstance(daily_item, dict):
            continue
        
        # Generera weekday och datum för denna prognos
        forecast_date = current_date + timedelta(days=i+1)
        weekday = weekdays[forecast_date.weekday()]
        date_str = forecast_date.strftime('%m-%d')
        
        # Hantera temperatur (SMHI ger bara en temperatur för daily)
        temp = daily_item.get('temperature')
        if temp is None:
            temp = 15  # Default fallback
        
        formatted_item = {
            'weekday': weekday,              # FIX: JavaScript förväntar sig 'weekday'
            'date': date_str,                # FIX: JavaScript förväntar sig 'date'
            'temp_max': temp + 2,            # FIX: JavaScript förväntar sig 'temp_max'
            'temp_min': temp - 3,            # FIX: JavaScript förväntar sig 'temp_min'
            'weather_symbol': daily_item.get('weather_symbol'),
            'weather_description': daily_item.get('weather_description'),
            'precipitation': daily_item.get('precipitation', 0),
            'wind_speed': daily_item.get('wind_speed'),
            'wind_direction': daily_item.get('wind_direction')
        }
        
        formatted_daily.append(formatted_item)
    
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
        config (dict): Huvudkonfiguration
        weather_state (dict): Aktuell weather state
        
    Returns:
        dict: UI-konfiguration för frontend
    """
    if not config:
        return None
    
    return {
        'wind_unit': config.get('ui', {}).get('wind_unit', 'land'),
        'theme': config.get('ui', {}).get('theme', 'dark'),
        'location_name': config.get('display', {}).get('location_name', 'Stockholm'),
        'use_netatmo': weather_state.get('use_netatmo', False),
        'netatmo_available': weather_state.get('netatmo_available', False),
        'weather_effects_enabled': weather_state.get('weather_effects_enabled', False),
        'refresh_interval_minutes': config.get('ui', {}).get('refresh_interval_minutes', 15),
        'netatmo_refresh_interval_minutes': config.get('ui', {}).get('netatmo_refresh_interval_minutes', 10)
    }


def validate_api_data(data: Any, data_type: str) -> bool:
    """
    Validera API-data innan den returneras.
    
    Args:
        data (Any): Data att validera
        data_type (str): Typ av data ('smhi', 'netatmo', 'forecast', 'sun')
        
    Returns:
        bool: True om data är giltig
    """
    if data is None:
        return True  # None är giltig (betyder att data inte finns)
    
    if data_type == 'smhi':
        return isinstance(data, dict) and 'temperature' in data
    elif data_type == 'netatmo':
        return isinstance(data, dict) and 'source' in data
    elif data_type == 'forecast':
        return isinstance(data, list)
    elif data_type == 'sun':
        return isinstance(data, dict) and 'sunrise' in data
    
    return False


def create_error_response(error_message: str, error_code: int = 500) -> Dict[str, Any]:
    """
    Skapa standardiserat error-respons.
    
    Args:
        error_message (str): Felmeddelande
        error_code (int): HTTP-felkod
        
    Returns:
        dict: Standardiserat error-respons
    """
    return {
        'error': True,
        'message': error_message,
        'code': error_code,
        'timestamp': None,  # Sätts av anropande funktion
        'data': None
    }


def sanitize_sensor_data(value: Any, sensor_type: str) -> Any:
    """
    Sanera och validera sensordata.
    
    Args:
        value (Any): Sensorvärde att sanera
        sensor_type (str): Typ av sensor ('temperature', 'humidity', 'pressure', etc.)
        
    Returns:
        Any: Sanerat värde eller None om ogiltigt
    """
    if value is None:
        return None
    
    try:
        # Konvertera till float för numeriska värden
        if sensor_type in ['temperature', 'humidity', 'pressure', 'wind_speed', 'co2', 'noise']:
            float_value = float(value)
            
            # Validera rimliga värden
            if sensor_type == 'temperature' and (-50 <= float_value <= 50):
                return round(float_value, 1)
            elif sensor_type == 'humidity' and (0 <= float_value <= 100):
                return round(float_value, 1)
            elif sensor_type == 'pressure' and (900 <= float_value <= 1100):
                return round(float_value, 1)
            elif sensor_type == 'wind_speed' and (0 <= float_value <= 100):
                return round(float_value, 1)
            elif sensor_type == 'co2' and (0 <= float_value <= 5000):
                return round(float_value, 0)
            elif sensor_type == 'noise' and (0 <= float_value <= 120):
                return round(float_value, 1)
        
        # För icke-numeriska värden, returnera som sträng
        return str(value)
        
    except (ValueError, TypeError):
        print(f"⚠️ Ogiltigt {sensor_type}-värde: {value}")
        return None


def enrich_weather_data_with_metadata(weather_data: Dict[str, Any], 
                                    data_source: str) -> Dict[str, Any]:
    """
    Berika väderdata med metadata och kvalitetsinformation.
    
    Args:
        weather_data (dict): Väderdata att berika
        data_source (str): Datakälla ('smhi', 'netatmo')
        
    Returns:
        dict: Berikad väderdata
    """
    enriched_data = weather_data.copy()
    
    # Lägg till metadata
    enriched_data['metadata'] = {
        'source': data_source,
        'processed_at': None,  # Sätts av anropande funktion
        'data_quality': _assess_data_quality(weather_data),
        'completeness': _calculate_data_completeness(weather_data)
    }
    
    return enriched_data


def _assess_data_quality(data: Dict[str, Any]) -> str:
    """Bedöm datakvalitet baserat på tillgängliga fält."""
    required_fields = ['temperature', 'pressure', 'humidity']
    available_fields = sum(1 for field in required_fields if data.get(field) is not None)
    
    if available_fields == len(required_fields):
        return 'excellent'
    elif available_fields >= len(required_fields) * 0.7:
        return 'good'
    elif available_fields >= len(required_fields) * 0.5:
        return 'fair'
    else:
        return 'poor'


def _calculate_data_completeness(data: Dict[str, Any]) -> float:
    """Beräkna datakomplementaritet som procent."""
    all_possible_fields = [
        'temperature', 'humidity', 'pressure', 'wind_speed', 'wind_direction',
        'weather_symbol', 'precipitation', 'visibility', 'co2', 'noise'
    ]
    
    available_count = sum(1 for field in all_possible_fields if data.get(field) is not None)
    return (available_count / len(all_possible_fields)) * 100