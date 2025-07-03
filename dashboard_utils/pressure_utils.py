#!/usr/bin/env python3
"""
Flask Weather Dashboard - Trycktrend-utilities
FAS 2: Refaktorering - Alla trycktrend-funktioner centraliserade
"""

from typing import Dict, Any, Optional


def create_smhi_pressure_trend_fallback(smhi_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
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


def validate_pressure_trend_data(pressure_trend: Optional[Dict[str, Any]]) -> bool:
    """
    Validera att trycktrend-data är användbar.
    
    Args:
        pressure_trend (dict): Trycktrend-data att validera
        
    Returns:
        bool: True om data är giltig och användbar
    """
    if not pressure_trend or not isinstance(pressure_trend, dict):
        return False
    
    # Kontrollera att trend inte är 'n/a'
    trend = pressure_trend.get('trend', 'n/a')
    if trend == 'n/a' or not trend:
        return False
    
    # Kontrollera att trend är ett giltigt värde
    valid_trends = ['rising', 'falling', 'stable']
    if trend not in valid_trends:
        return False
    
    return True


def get_pressure_trend_description(trend: str, pressure_change: float = 0) -> str:
    """
    Generera beskrivande text för trycktrend.
    
    Args:
        trend (str): Trend-riktning ('rising', 'falling', 'stable')
        pressure_change (float): Tryckförändring i hPa
        
    Returns:
        str: Beskrivande text för trenden
    """
    descriptions = {
        'rising': f"Stigande tryck{f' (+{pressure_change:.1f} hPa)' if pressure_change > 0 else ''} - förbättrat väder väntas",
        'falling': f"Fallande tryck{f' ({pressure_change:.1f} hPa)' if pressure_change < 0 else ''} - försämrat väder väntas", 
        'stable': f"Stabilt tryck{f' ({pressure_change:+.1f} hPa)' if abs(pressure_change) > 0.1 else ''} - oförändrat väder"
    }
    
    return descriptions.get(trend, "Okänd trycktrend")


def get_pressure_trend_icon(trend: str) -> str:
    """
    Hämta Weather Icons-klass för trycktrend.
    
    Args:
        trend (str): Trend-riktning ('rising', 'falling', 'stable')
        
    Returns:
        str: Weather Icons CSS-klass
    """
    icons = {
        'rising': 'wi-direction-up',
        'falling': 'wi-direction-down',
        'stable': 'wi-minus'
    }
    
    return icons.get(trend, 'wi-na')


def analyze_pressure_trend_quality(data_hours: float, pressure_change: float) -> str:
    """
    Analysera kvaliteten på trycktrend-data.
    
    Args:
        data_hours (float): Antal timmar med historisk data
        pressure_change (float): Absolut tryckförändring i hPa
        
    Returns:
        str: Kvalitets-beskrivning ('excellent', 'good', 'fair', 'poor')
    """
    # Kvalitet baserat på datamängd och förändringsstorlek
    abs_change = abs(pressure_change)
    
    if data_hours >= 3.0 and abs_change >= 2.0:
        return 'excellent'  # Mycket data och tydlig trend
    elif data_hours >= 2.0 and abs_change >= 1.0:
        return 'good'       # Tillräckligt data och märkbar trend
    elif data_hours >= 1.0 and abs_change >= 0.5:
        return 'fair'       # Begränsad data men synlig trend
    else:
        return 'poor'       # Otillräcklig data eller minimal förändring


def format_pressure_value(pressure: Optional[float]) -> str:
    """
    Formatera tryckvärde för visning.
    
    Args:
        pressure (float): Tryckvärde i hPa
        
    Returns:
        str: Formaterat tryckvärde med enhet
    """
    if pressure is None:
        return "N/A hPa"
    
    return f"{pressure:.1f} hPa"


def classify_pressure_level(pressure: float) -> Dict[str, str]:
    """
    Klassificera trycknivå enligt meteorologiska standarder.
    
    Args:
        pressure (float): Lufttryck i hPa
        
    Returns:
        dict: Klassificering med beskrivning och färgkod
    """
    if pressure >= 1025:
        return {
            'level': 'very_high',
            'description': 'Mycket högt tryck',
            'weather_tendency': 'Stabilt, klart väder',
            'color_class': 'pressure-very-high'
        }
    elif pressure >= 1015:
        return {
            'level': 'high',
            'description': 'Högt tryck',
            'weather_tendency': 'Mestadels klart väder',
            'color_class': 'pressure-high'
        }
    elif pressure >= 1005:
        return {
            'level': 'normal',
            'description': 'Normalt tryck',
            'weather_tendency': 'Växlande väder',
            'color_class': 'pressure-normal'
        }
    elif pressure >= 995:
        return {
            'level': 'low',
            'description': 'Lågt tryck',
            'weather_tendency': 'Molnigt, risk för regn',
            'color_class': 'pressure-low'
        }
    else:
        return {
            'level': 'very_low',
            'description': 'Mycket lågt tryck',
            'weather_tendency': 'Stormigt väder, kraftig nederbörd',
            'color_class': 'pressure-very-low'
        }


def merge_pressure_trends(netatmo_trend: Optional[Dict[str, Any]], 
                         smhi_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Intelligent sammanslagning av Netatmo- och SMHI-tryckdata.
    
    Args:
        netatmo_trend (dict): Netatmo trycktrend-data
        smhi_data (dict): SMHI väderdata
        
    Returns:
        dict: Bästa tillgängliga trycktrend-data
    """
    # Försök Netatmo först (mest detaljerad)
    if validate_pressure_trend_data(netatmo_trend):
        return {
            **netatmo_trend,
            'source': 'netatmo',
            'reliability': 'high'
        }
    
    # Fallback till SMHI-baserad trend
    smhi_fallback = create_smhi_pressure_trend_fallback(smhi_data)
    smhi_fallback['reliability'] = 'medium'
    
    print("📊 Trycktrend: Använder SMHI-fallback (Netatmo otillgänglig)")
    
    return smhi_fallback
