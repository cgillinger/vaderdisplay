#!/usr/bin/env python3
"""
Flask Weather Dashboard - Konfigurationshantering
FAS 2: Refaktorering - All config-hantering centraliserad
"""

import json
import os
import sys
from typing import Dict, Any, Optional

from .weather_state import update_weather_state


def load_config() -> Optional[Dict[str, Any]]:
    """
    Ladda konfiguration från config.py med riktiga Python-kommentarer.
    
    Returns:
        dict: Laddad konfiguration eller None vid fel
    """
    try:
        # Lägg till reference-katalogen i Python path
        reference_path = os.path.join(os.path.dirname(__file__), '..', 'reference')
        if reference_path not in sys.path:
            sys.path.insert(0, reference_path)
        
        # Importera CONFIG från config.py
        from config import CONFIG
        
        print(f"✅ Konfiguration laddad från config.py")
        print(f"📍 Plats: {CONFIG['display']['location_name']}")
        print(f"🌬️ Vindenheter: {CONFIG['ui']['wind_unit']}")
        print(f"🎨 Tema: {CONFIG['ui']['theme']}")
        
        # FAS 2: Läs use_netatmo från config
        use_netatmo = CONFIG.get('use_netatmo', True)
        update_weather_state('use_netatmo', use_netatmo)
        print(f"🧠 FAS 2: Netatmo-läge: {'AKTIVT' if use_netatmo else 'INAKTIVT (SMHI-only)'}")
        
        # FAS 2: WeatherEffects config-läsning
        weather_effects_config = CONFIG.get('weather_effects', {})
        weather_effects_enabled = weather_effects_config.get('enabled', False)
        update_weather_state('weather_effects_enabled', weather_effects_enabled)
        update_weather_state('weather_effects_config', weather_effects_config)
        
        print(f"🌦️ FAS 2: WeatherEffects: {'AKTIVERAT' if weather_effects_enabled else 'INAKTIVERAT'}")
        if weather_effects_enabled:
            rain_count = weather_effects_config.get('rain_config', {}).get('droplet_count', 50)
            snow_count = weather_effects_config.get('snow_config', {}).get('flake_count', 25)
            intensity = weather_effects_config.get('intensity', 'auto')
            print(f"   🌧️ Regn: {rain_count} droppar, ❄️ Snö: {snow_count} flingor, 🎚️ Intensitet: {intensity}")
        
        return CONFIG
        
    except ImportError as e:
        print(f"❌ Kunde inte importera config.py: {e}")
        print("🔧 Kontrollera att reference/config.py finns och har giltigt CONFIG dict")
        
        # Fallback till JSON om config.py inte finns
        print("🔄 Försöker fallback till config.json...")
        return load_config_json_fallback()
        
    except Exception as e:
        print(f"❌ Oväntat fel vid config.py-läsning: {e}")
        return None


def load_config_json_fallback() -> Optional[Dict[str, Any]]:
    """
    Fallback för att läsa config.json om config.py inte fungerar.
    
    Returns:
        dict: Laddad konfiguration eller None vid fel
    """
    config_path = os.path.join(os.path.dirname(__file__), '..', 'reference', 'config.json')
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print(f"⚠️ Fallback: Konfiguration laddad från {config_path}")
        print("💡 TIP: Skapa reference/config.py för bättre kommentarer!")
        
        # FAS 2: Fallback till False för weather_effects om det saknas i JSON
        use_netatmo = config.get('use_netatmo', True)
        weather_effects_config = config.get('weather_effects', {})
        weather_effects_enabled = weather_effects_config.get('enabled', False)
        
        update_weather_state('use_netatmo', use_netatmo)
        update_weather_state('weather_effects_enabled', weather_effects_enabled)
        update_weather_state('weather_effects_config', weather_effects_config)
        
        print(f"🧠 FAS 2: Netatmo-läge (fallback): {'AKTIVT' if use_netatmo else 'INAKTIVT'}")
        print(f"🌦️ FAS 2: WeatherEffects (fallback): {'AKTIVERAT' if weather_effects_enabled else 'INAKTIVERAT'}")
        
        return config
        
    except FileNotFoundError:
        print(f"❌ Varken config.py eller config.json hittades!")
        print(f"🔧 Skapa antingen reference/config.py eller {config_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON-fel i fallback config.json: {e}")
        return None


def validate_weather_effects_config(config_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    FAS 2: Validera WeatherEffects-konfiguration med robust error handling.
    
    Args:
        config_data (dict): WeatherEffects-konfiguration från config.py
        
    Returns:
        dict: Validerad konfiguration med fallback-värden
    """
    # Default-konfiguration (MagicMirror-kompatibel)
    default_config = {
        'enabled': False,
        'intensity': 'auto',
        'rain_config': {
            'droplet_count': 50,
            'droplet_speed': 2.0,
            'wind_direction': 'none',
            'enable_splashes': False
        },
        'snow_config': {
            'flake_count': 25,
            'characters': ['*', '+'],
            'sparkle_enabled': False,
            'min_size': 0.8,
            'max_size': 1.5,
            'speed': 1.0
        },
        'transition_duration': 1000,
        'debug_logging': False,
        'fallback_enabled': True,
        'lp156wh4_optimizations': {
            'enabled': True,
            'contrast_boost': 1.1,
            'brightness_boost': 1.1,
            'gpu_acceleration': True,
            'target_fps': 60
        }
    }
    
    if not config_data or not isinstance(config_data, dict):
        print("⚠️ Ogiltig WeatherEffects-config, använder default")
        return default_config
    
    # Deep merge med default config
    validated_config = default_config.copy()
    
    # Validera top-level properties
    for key, default_value in default_config.items():
        if key in config_data:
            if isinstance(default_value, dict):
                # Deep merge för nested objects
                validated_config[key] = {**default_value, **config_data.get(key, {})}
            else:
                validated_config[key] = config_data[key]
    
    # Validera specifika värden
    try:
        # Intensitet
        valid_intensities = ['auto', 'light', 'medium', 'heavy']
        if validated_config['intensity'] not in valid_intensities:
            print(f"⚠️ Ogiltig intensitet '{validated_config['intensity']}', använder 'auto'")
            validated_config['intensity'] = 'auto'
        
        # Rain config validering
        rain_config = validated_config['rain_config']
        rain_config['droplet_count'] = max(10, min(100, int(rain_config.get('droplet_count', 50))))
        rain_config['droplet_speed'] = max(0.5, min(5.0, float(rain_config.get('droplet_speed', 2.0))))
        
        valid_wind_directions = ['none', 'left-to-right', 'right-to-left']
        if rain_config.get('wind_direction') not in valid_wind_directions:
            rain_config['wind_direction'] = 'none'
        
        # Snow config validering
        snow_config = validated_config['snow_config']
        snow_config['flake_count'] = max(10, min(50, int(snow_config.get('flake_count', 25))))
        snow_config['min_size'] = max(0.5, min(2.0, float(snow_config.get('min_size', 0.8))))
        snow_config['max_size'] = max(1.0, min(3.0, float(snow_config.get('max_size', 1.5))))
        snow_config['speed'] = max(0.5, min(2.0, float(snow_config.get('speed', 1.0))))
        
        # Säkerställ att max_size >= min_size
        if snow_config['max_size'] < snow_config['min_size']:
            snow_config['max_size'] = snow_config['min_size'] + 0.5
        
        # Characters validering
        if not isinstance(snow_config.get('characters'), list) or len(snow_config['characters']) == 0:
            snow_config['characters'] = ['*', '+']
        
        # Transition duration
        validated_config['transition_duration'] = max(500, min(3000, int(validated_config.get('transition_duration', 1000))))
        
        print("✅ WeatherEffects-konfiguration validerad")
        
    except (ValueError, TypeError) as e:
        print(f"⚠️ Fel vid WeatherEffects config-validering: {e}")
        print("🔄 Använder säkra default-värden")
    
    return validated_config


def get_smhi_weather_effect_type(weather_symbol: int) -> str:
    """
    FAS 2: Konvertera SMHI weather symbol till WeatherEffects-typ.
    
    Args:
        weather_symbol (int): SMHI vädersymbol (1-27)
        
    Returns:
        str: WeatherEffects-typ ('rain', 'snow', 'sleet', 'thunder', 'clear')
    """
    if not isinstance(weather_symbol, (int, float)) or weather_symbol < 1 or weather_symbol > 27:
        return 'clear'
    
    symbol = int(weather_symbol)
    
    # SMHI symbol mapping
    if symbol in [8, 9, 10, 18, 19, 20]:          # Regnskurar och regn
        return 'rain'
    elif symbol in [15, 16, 17, 25, 26, 27]:      # Snöbyar och snöfall
        return 'snow'
    elif symbol in [12, 13, 14, 22, 23, 24]:      # Snöblandat regn
        return 'sleet'
    elif symbol in [11, 21]:                      # Åska
        return 'thunder'
    else:                                         # Klart väder (1-7)
        return 'clear'


def get_current_theme(config: Optional[Dict[str, Any]] = None) -> str:
    """
    Bestäm vilket tema som ska användas baserat på tid och konfiguration.
    
    Args:
        config (dict): Konfiguration, används weather_state config om None
        
    Returns:
        str: Tema-namn ('dark', 'light', etc.)
    """
    from .weather_state import get_weather_state
    from datetime import datetime
    
    if not config:
        config = get_weather_state()['config']
    
    if not config:
        return 'dark'  # Default till dark som är produktionsklart
    
    ui_config = config.get('ui', {})
    theme_setting = ui_config.get('theme', 'dark')
    
    if theme_setting != 'auto':
        return theme_setting
    
    auto_theme = ui_config.get('auto_theme', {})
    day_theme = auto_theme.get('day_theme', 'light')
    night_theme = auto_theme.get('night_theme', 'dark')
    night_start = auto_theme.get('night_start', '21:00')
    night_end = auto_theme.get('night_end', '06:00')
    
    try:
        current_hour = datetime.now().hour
        night_start_hour = int(night_start.split(':')[0])
        night_end_hour = int(night_end.split(':')[0])
        
        if night_start_hour <= night_end_hour:
            is_night = night_start_hour <= current_hour <= night_end_hour
        else:
            is_night = current_hour >= night_start_hour or current_hour <= night_end_hour
        
        return night_theme if is_night else day_theme
        
    except:
        return day_theme
