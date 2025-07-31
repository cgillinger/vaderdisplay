#!/usr/bin/env python3
"""
SMHI API-klient för väderdata
Hämtar prognoser och aktuell väderdata från SMHI:s öppna API.
+ WEATHER ANIMATIONS INTEGRATION: Animation triggers för frontend
+ FAS 1: SMHI LUFTFUKTIGHET: Meteorologiska observations-API integration

API-dokumentation: https://opendata.smhi.se/apidocs/metfcst/index.html
Observations API: https://opendata.smhi.se/apidocs/metobs/index.html
"""

import requests
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import time
import math


class SMHIClient:
    """Klient för att hämta väderdata från SMHI:s API med weather animations support och luftfuktighet."""
    
    # SMHI API konstanter - VÄDERPROGNOS
    BASE_URL = "https://opendata-download-metfcst.smhi.se/api"
    CATEGORY = "pmp3g"  # Meteorological forecasts
    VERSION = "2"
    
    # SMHI API konstanter - METEOROLOGISKA OBSERVATIONER (FAS 1)
    METOBS_BASE_URL = "https://opendata-download-metobs.smhi.se/api"
    METOBS_VERSION = "1.0"
    HUMIDITY_PARAMETER = "6"  # Relativ luftfuktighet (%)
    
    # Väderparametrar vi är intresserade av
    PARAMETERS = {
        't': 'temperature',      # Temperatur (°C)
        'Wsymb2': 'weather_symbol',  # Vädersymbol (1-27)
        'ws': 'wind_speed',      # Vindstyrka (m/s)
        'wd': 'wind_direction',  # Vindriktning (grader)
        'pmin': 'precipitation', # Nederbörd min (mm/h)
        'pmax': 'precipitation_max',  # Nederbörd max (mm/h)
        'msl': 'pressure'        # Lufttryck (hPa)
    }
    
    # Timeout för API-anrop
    REQUEST_TIMEOUT = 10
    
    # FAS 1: Fallback-stationer för luftfuktighet (välkända aktiva stationer)
    HUMIDITY_FALLBACK_STATIONS = [98210, 71420, 52350]  # Stockholm, Göteborg, Malmö
    
    # WEATHER ANIMATIONS: SMHI Symbol Mapping (1-27)
    ANIMATION_MAPPING = {
        # Regn och regnskurar
        'rain': [8, 9, 10, 18, 19, 20],
        # Snö och snöbyar  
        'snow': [15, 16, 17, 25, 26, 27],
        # Snöblandat regn
        'sleet': [12, 13, 14, 22, 23, 24],
        # Åska (kan kombineras med regn)
        'thunder': [11, 21],
        # Klart väder (ingen animation)
        'clear': [1, 2, 3, 4, 5, 6, 7]
    }
    
    def __init__(self, latitude: float, longitude: float):
        """
        Initialisera SMHI-klient.
        
        Args:
            latitude: Latitud för väderprognos
            longitude: Longitud för väderprognos
        """
        self.latitude = latitude
        self.longitude = longitude
        
        # Cache för API-data
        self.cached_data = None
        self.last_fetch_time = None
        cache_duration_minutes = 15  # Cache i 15 minuter
        self.cache_duration = cache_duration_minutes * 60
        
        # FAS 1: Cache för luftfuktighetsdata
        self.humidity_cache = None
        self.humidity_last_fetch = None
        self.humidity_cache_duration = 30 * 60  # 30 minuter för observations-data
        
        print(f"🌍 SMHI-klient initierad för position: {latitude}, {longitude}")
    
    def get_forecast_url(self) -> str:
        """Bygg URL för SMHI API-anrop."""
        return (
            f"{self.BASE_URL}/category/{self.CATEGORY}/version/{self.VERSION}/"
            f"geotype/point/lon/{self.longitude}/lat/{self.latitude}/data.json"
        )
    
    def fetch_raw_data(self) -> Optional[Dict]:
        """
        Hämta rådata från SMHI API.
        
        Returns:
            Dict med rådata från SMHI eller None vid fel
        """
        url = self.get_forecast_url()
        
        try:
            print(f"📡 Hämtar data från SMHI: {url}")
            
            response = requests.get(url, timeout=self.REQUEST_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            
            # Kontrollera att vi har korrekt data-struktur
            if 'timeSeries' not in data:
                print("❌ Ogiltig data-struktur från SMHI API")
                return None
            
            print(f"✅ SMHI data hämtad - {len(data['timeSeries'])} tidpunkter")
            
            # Cache data
            self.cached_data = data
            self.last_fetch_time = time.time()
            
            return data
            
        except requests.exceptions.Timeout:
            print(f"⏰ Timeout vid anrop till SMHI API ({self.REQUEST_TIMEOUT}s)")
            return None
        except requests.exceptions.ConnectionError:
            print("🌐 Nätverksfel - kan inte nå SMHI API")
            return None
        except requests.exceptions.HTTPError as e:
            print(f"🚫 HTTP-fel från SMHI API: {e}")
            return None
        except json.JSONDecodeError:
            print("📋 Fel vid parsning av JSON från SMHI API")
            return None
        except Exception as e:
            print(f"❌ Oväntat fel vid SMHI API-anrop: {e}")
            return None
    
    def get_data(self, force_refresh: bool = False) -> Optional[Dict]:
        """
        Hämta SMHI-data med cache-stöd.
        
        Args:
            force_refresh: Tvinga uppdatering även om cache är giltig
            
        Returns:
            Dict med SMHI-data eller None
        """
        # Kontrollera cache
        if (not force_refresh and 
            self.cached_data and 
            self.last_fetch_time and 
            time.time() - self.last_fetch_time < self.cache_duration):
            
            print("💾 Använder cachad SMHI-data")
            return self.cached_data
        
        # Hämta ny data
        return self.fetch_raw_data()
    
    def parse_parameters(self, time_entry: Dict) -> Dict:
        """
        Tolka parametrar från en tidpunkt i SMHI-data.
        
        Args:
            time_entry: En entry från timeSeries-arrayen
            
        Returns:
            Dict med tolkade väderparametrar
        """
        weather = {}
        parameters = time_entry.get('parameters', [])
        
        for param in parameters:
            param_name = param.get('name')
            param_values = param.get('values', [])
            
            if param_name in self.PARAMETERS and param_values:
                # Ta första värdet (SMHI kan ha flera values per parameter)
                value = param_values[0]
                key = self.PARAMETERS[param_name]
                weather[key] = value
        
        return weather
    
    def _get_animation_trigger(self, weather_symbol: int, precipitation: float = 0, wind_direction: float = None) -> Dict:
        """
        WEATHER ANIMATIONS: Bestäm animation trigger baserat på vädersymbol.
        
        Args:
            weather_symbol: SMHI vädersymbol (1-27)
            precipitation: Nederbörd i mm/h (används för intensitet)
            wind_direction: Vindriktning i grader (används för vindanimationer)
            
        Returns:
            Dict med animation-information
        """
        # Hitta animation-typ baserat på symbol
        animation_type = 'clear'  # Default
        intensity = 'light'
        
        for anim_type, symbols in self.ANIMATION_MAPPING.items():
            if weather_symbol in symbols:
                animation_type = anim_type
                break
        
        # Bestäm intensitet baserat på nederbörd och symbol
        if precipitation > 5:
            intensity = 'heavy'
        elif precipitation > 1:
            intensity = 'medium'
        elif precipitation > 0.1:
            intensity = 'light'
        
        # Special-hantering för kraftiga vädersymboler
        if weather_symbol in [10, 20, 27]:  # Kraftigt regn/snö
            intensity = 'heavy'
        elif weather_symbol in [9, 19, 26]:  # Måttligt regn/snö
            intensity = 'medium'
        
        return {
            'type': animation_type,
            'intensity': intensity,
            'symbol': weather_symbol,
            'precipitation': precipitation,
            'wind_direction': wind_direction
        }
    
    def get_current_weather(self) -> Optional[Dict]:
        """
        Hämta aktuellt väder med animation trigger.
        
        Returns:
            Dict med aktuell väderdata inkl. animation_trigger eller None
        """
        data = self.get_data()
        
        if not data or 'timeSeries' not in data:
            return None
        
        now = datetime.now(timezone.utc)
        best_entry = None
        min_time_diff = float('inf')
        
        # Hitta närmaste tidpunkt
        for entry in data['timeSeries']:
            valid_time_str = entry.get('validTime')
            if not valid_time_str:
                continue
            
            try:
                valid_time = datetime.fromisoformat(valid_time_str.replace('Z', '+00:00'))
                time_diff = abs((now - valid_time).total_seconds())
                
                if time_diff < min_time_diff:
                    min_time_diff = time_diff
                    best_entry = entry
                    
            except (ValueError, TypeError):
                continue
        
        if not best_entry:
            print("⚠️ Ingen giltig tidpunkt hittades i SMHI-data")
            return None
        
        # Tolka parametrar
        weather = self.parse_parameters(best_entry)
        
        # Lägg till metadata
        weather['valid_time'] = best_entry.get('validTime')
        weather['time_diff_minutes'] = int(min_time_diff / 60)
        weather['data_source'] = 'SMHI'
        weather['coordinates'] = {'lat': self.latitude, 'lon': self.longitude}
        
        # Lägg till grid-koordinater från response
        if 'geometry' in data and 'coordinates' in data['geometry']:
            coords = data['geometry']['coordinates'][0]  # GeoJSON format
            weather['grid_coordinates'] = {'lon': coords[0], 'lat': coords[1]}
        
        # WEATHER ANIMATIONS: Lägg till animation trigger
        if weather.get('weather_symbol'):
            weather['animation_trigger'] = self._get_animation_trigger(
                weather['weather_symbol'],
                weather.get('precipitation', 0),
                weather.get('wind_direction')
            )
            
            print(f"🎬 Animation trigger genererad: {weather['animation_trigger']['type']}")
        else:
            weather['animation_trigger'] = {'type': 'clear'}
            print("🎬 No weather symbol - clear animation trigger")
        
        return weather
    
    def get_12h_forecast(self) -> List[Dict]:
        """
        Hämta 12-timmarsprognos optimerad för GUI-visning.
        Returnerar prognoser var 3:e timme för de kommande 12 timmarna.
        
        Returns:
            Lista med 4 prognospunkter (0h, 3h, 6h, 9h, 12h från nu)
        """
        data = self.get_data()
        
        if not data or 'timeSeries' not in data:
            print("❌ Ingen SMHI-data tillgänglig för 12h-prognos")
            return []
        
        now = datetime.now(timezone.utc)
        forecast_points = []
        target_intervals = [3, 6, 9, 12]  # Timmar från nu
        
        print(f"📊 Skapar 12h-prognos från {len(data['timeSeries'])} datapunkter")
        
        for target_hour in target_intervals:
            target_time = now.timestamp() + (target_hour * 3600)  # Unix timestamp
            best_entry = None
            min_time_diff = float('inf')
            
            # Hitta närmaste datapunkt för target_time
            for entry in data['timeSeries']:
                valid_time_str = entry.get('validTime')
                if not valid_time_str:
                    continue
                
                try:
                    valid_time = datetime.fromisoformat(valid_time_str.replace('Z', '+00:00'))
                    entry_timestamp = valid_time.timestamp()
                    
                    # Endast framtida tidpunkter
                    if entry_timestamp <= now.timestamp():
                        continue
                    
                    time_diff = abs(entry_timestamp - target_time)
                    
                    if time_diff < min_time_diff:
                        min_time_diff = time_diff
                        best_entry = entry
                        
                except (ValueError, TypeError) as e:
                    print(f"⚠️ Fel vid parsning av tid {valid_time_str}: {e}")
                    continue
            
            if best_entry:
                # Tolka väderdata för denna tidpunkt
                weather = self.parse_parameters(best_entry)
                
                # Lägg till tidsinfo
                valid_time = datetime.fromisoformat(best_entry['validTime'].replace('Z', '+00:00'))
                weather['valid_time'] = best_entry['validTime']
                weather['local_time'] = valid_time.strftime('%H:%M')
                weather['hours_from_now'] = target_hour
                weather['date_time'] = valid_time.isoformat()
                
                # Lägg till formaterad temperatur
                if 'temperature' in weather:
                    weather['temp_formatted'] = f"{weather['temperature']:.1f}°C"
                
                # WEATHER ANIMATIONS: Lägg till animation trigger för prognoser
                if weather.get('weather_symbol'):
                    weather['animation_trigger'] = self._get_animation_trigger(
                        weather['weather_symbol'],
                        weather.get('precipitation', 0),
                        weather.get('wind_direction')
                    )
                
                forecast_points.append(weather)
                print(f"  ✅ {target_hour}h: {weather.get('local_time')} - {weather.get('temp_formatted', 'N/A')}")
            else:
                print(f"  ❌ Ingen data hittad för +{target_hour}h")
        
        print(f"📈 12h-prognos klar: {len(forecast_points)} prognoser med animation triggers")
        return forecast_points
    
    def get_hourly_forecast(self, hours: int = 12) -> List[Dict]:
        """
        Hämta timprognos för kommande timmar (legacy-metod för bakåtkompatibilitet).
        
        Args:
            hours: Antal timmar framåt
            
        Returns:
            Lista med väderdata per timme
        """
        data = self.get_data()
        
        if not data or 'timeSeries' not in data:
            return []
        
        now = datetime.now(timezone.utc)
        forecast = []
        
        for entry in data['timeSeries']:
            valid_time_str = entry.get('validTime')
            if not valid_time_str:
                continue
            
            try:
                valid_time = datetime.fromisoformat(valid_time_str.replace('Z', '+00:00'))
                
                # Endast framtida tidpunkter
                if valid_time <= now:
                    continue
                
                # Begränsa till antal timmar
                hours_diff = (valid_time - now).total_seconds() / 3600
                if hours_diff > hours:
                    break
                
                weather = self.parse_parameters(entry)
                weather['valid_time'] = valid_time_str
                weather['hours_from_now'] = int(hours_diff)
                
                # Lägg till animation trigger
                if weather.get('weather_symbol'):
                    weather['animation_trigger'] = self._get_animation_trigger(
                        weather['weather_symbol'],
                        weather.get('precipitation', 0),
                        weather.get('wind_direction')
                    )
                
                forecast.append(weather)
                
            except (ValueError, TypeError):
                continue
        
        return forecast
    
    def get_daily_forecast(self, days: int = 4) -> List[Dict]:
        """
        Hämta dagsprognos för kommande dagar.
        
        Args:
            days: Antal dagar framåt
            
        Returns:
            Lista med väderdata per dag (min/max temp)
        """
        data = self.get_data()
        
        if not data or 'timeSeries' not in data:
            return []
        
        # Gruppera data per dag
        daily_data = {}
        now = datetime.now(timezone.utc)
        
        for entry in data['timeSeries']:
            valid_time_str = entry.get('validTime')
            if not valid_time_str:
                continue
            
            try:
                valid_time = datetime.fromisoformat(valid_time_str.replace('Z', '+00:00'))
                
                # Endast framtida tidpunkter
                if valid_time <= now:
                    continue
                
                # DAGSPROGNOS-FIX: Hoppa över idag (days_diff = 0) för att få exakt rätt antal dagar
                days_diff = (valid_time - now).days
                if days_diff >= days or days_diff < 1:
                    continue
                
                date_key = valid_time.date()
                
                if date_key not in daily_data:
                    daily_data[date_key] = {
                        'date': date_key,
                        'temperatures': [],
                        'weather_symbols': [],
                        'wind_speeds': [],
                        'precipitations': [],
                        'animation_triggers': []
                    }
                
                weather = self.parse_parameters(entry)
                
                # Samla data för dagen
                if 'temperature' in weather:
                    daily_data[date_key]['temperatures'].append(weather['temperature'])
                if 'weather_symbol' in weather:
                    daily_data[date_key]['weather_symbols'].append(weather['weather_symbol'])
                    # Lägg till animation trigger
                    trigger = self._get_animation_trigger(
                        weather['weather_symbol'],
                        weather.get('precipitation', 0),
                        weather.get('wind_direction')
                    )
                    daily_data[date_key]['animation_triggers'].append(trigger)
                if 'wind_speed' in weather:
                    daily_data[date_key]['wind_speeds'].append(weather['wind_speed'])
                if 'precipitation' in weather:
                    daily_data[date_key]['precipitations'].append(weather['precipitation'])
                
            except (ValueError, TypeError):
                continue
        
        # Beräkna dagliga sammandrag
        daily_forecast = []
        
        for date_key in sorted(daily_data.keys()):
            day_data = daily_data[date_key]
            
            summary = {
                'date': date_key.isoformat(),
                'weekday': date_key.strftime('%A'),
                'day_of_month': date_key.day
            }
            
            # Temperatur min/max
            temps = day_data['temperatures']
            if temps:
                summary['temp_min'] = min(temps)
                summary['temp_max'] = max(temps)
                summary['temp_avg'] = sum(temps) / len(temps)
            
            # Vanligaste vädersymbol
            symbols = day_data['weather_symbols']
            if symbols:
                # Räkna förekomster av varje symbol
                symbol_counts = {}
                for symbol in symbols:
                    symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1
                
                # Ta den vanligaste
                most_common_symbol = max(symbol_counts, key=symbol_counts.get)
                summary['weather_symbol'] = most_common_symbol
                
                # Lägg till animation trigger för vanligaste symbolen
                summary['animation_trigger'] = self._get_animation_trigger(
                    most_common_symbol,
                    max(day_data['precipitations']) if day_data['precipitations'] else 0,
                    None
                )
            
            # Vind-genomsnitt
            winds = day_data['wind_speeds']
            if winds:
                summary['wind_speed_avg'] = sum(winds) / len(winds)
                summary['wind_speed_max'] = max(winds)
            
            # Total nederbörd
            precips = day_data['precipitations']
            if precips:
                summary['precipitation_total'] = sum(precips)
                summary['precipitation_max'] = max(precips)
            
            daily_forecast.append(summary)
        
        print(f"📅 Dagsprognos klar: {len(daily_forecast)} dagar med animation triggers")
        return daily_forecast
    
    # === FAS 1: SMHI LUFTFUKTIGHET FUNKTIONER ===
    
    def find_nearest_humidity_station(self) -> Optional[str]:
        """
        FAS 1: Hitta närmaste aktiva luftfuktighetsstation.
        
        Returns:
            Station-ID som sträng eller None om ingen hittades
        """
        try:
            url = f"{self.METOBS_BASE_URL}/version/{self.METOBS_VERSION}/parameter/{self.HUMIDITY_PARAMETER}.json"
            print(f"🔍 Söker närmaste luftfuktighetsstation: {url}")
            
            response = requests.get(url, timeout=self.REQUEST_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            stations = data.get('station', [])
            
            if not stations:
                print("❌ Inga luftfuktighetsstationer hittades")
                return None
            
            # Filtrera aktiva stationer
            active_stations = [s for s in stations if s.get('active', False)]
            print(f"📍 Hittade {len(active_stations)} luftfuktighetsstationer")
            
            if not active_stations:
                print("⚠️ Inga aktiva luftfuktighetsstationer - använder fallback")
                # Använd fallback-stationer
                for fallback_id in self.HUMIDITY_FALLBACK_STATIONS:
                    fallback_str = str(fallback_id)
                    if any(s['key'] == fallback_str for s in stations):
                        print(f"✅ Använder fallback-station: {fallback_id}")
                        return fallback_str
                return None
            
            # Hitta närmaste station
            min_distance = float('inf')
            nearest_station = None
            
            for station in active_stations:
                try:
                    lat = float(station['latitude'])
                    lon = float(station['longitude'])
                    
                    # Beräkna ungefärligt avstånd (Haversine-approximation)
                    distance = self._calculate_distance(self.latitude, self.longitude, lat, lon)
                    
                    if distance < min_distance:
                        min_distance = distance
                        nearest_station = station
                        
                except (ValueError, KeyError):
                    continue
            
            if nearest_station:
                station_id = nearest_station['key']
                print(f"✅ Närmaste luftfuktighetsstation: {station_id} (avstånd: {min_distance:.1f} km)")
                return station_id
            else:
                print("❌ Kunde inte beräkna avstånd till några stationer")
                return None
                
        except Exception as e:
            print(f"❌ Fel vid sökning av luftfuktighetsstation: {e}")
            return None
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        FAS 1: Beräkna avstånd mellan två koordinater (Haversine-formel).
        
        Returns:
            Avstånd i kilometer
        """
        R = 6371  # Jordens radie i km
        
        # Konvertera grader till radianer
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine-formel
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def get_station_humidity(self, station_id: Optional[str] = None) -> Optional[Dict]:
        """
        FAS 1: Hämta luftfuktighetsdata från SMHI observations-API.
        
        Args:
            station_id: Specifik station-ID eller None för auto-hitta
            
        Returns:
            Dict med luftfuktighetsdata eller None
        """
        # Kontrollera cache
        if (self.humidity_cache and 
            self.humidity_last_fetch and 
            time.time() - self.humidity_last_fetch < self.humidity_cache_duration):
            print("💾 Använder cachad luftfuktighetsdata")
            return self.humidity_cache
        
        # Hitta station om inte specificerad
        if not station_id:
            station_id = self.find_nearest_humidity_station()
            if not station_id:
                return None
        
        try:
            url = (f"{self.METOBS_BASE_URL}/version/{self.METOBS_VERSION}/"
                   f"parameter/{self.HUMIDITY_PARAMETER}/station/{station_id}/"
                   f"period/latest-hour/data.json")
            
            print(f"💧 Hämtar luftfuktighet från station {station_id}: {url}")
            
            response = requests.get(url, timeout=self.REQUEST_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            values = data.get('value', [])
            
            if not values:
                print(f"❌ Ingen luftfuktighetsdata från station {station_id}")
                return None
            
            # Ta senaste mätning
            latest = values[-1]
            value = latest.get('value')
            timestamp_ms = latest.get('date')
            
            if value is None or timestamp_ms is None:
                print("❌ Ogiltig luftfuktighetsdata")
                return None
            
            # Konvertera timestamp (SMHI använder millisekunder sedan 1970)
            try:
                timestamp = timestamp_ms / 1000  # Konvertera till sekunder
                measurement_time = datetime.fromtimestamp(timestamp, tz=timezone.utc)
            except (ValueError, OSError) as e:
                print(f"⚠️ Fel vid parsning av timestamp {timestamp_ms}: {e}")
                # Fallback: använd nuvarande tid
                measurement_time = datetime.now(timezone.utc)
            
            # Beräkna ålder på data
            now = datetime.now(timezone.utc)
            data_age_seconds = (now - measurement_time).total_seconds()
            data_age_minutes = int(data_age_seconds / 60)
            
            # Hämta stationsnamn
            station_info = data.get('station', {})
            station_name = station_info.get('name', f'SMHI Station {station_id}')
            
            humidity_data = {
                'value': float(value),
                'timestamp': measurement_time.isoformat(),
                'data_age_minutes': data_age_minutes,
                'station_id': station_id,
                'station_name': station_name,
                'unit': '%'
            }
            
            print(f"✅ Luftfuktighet: {value}% (ålder: {data_age_minutes} min)")
            
            # Cache resultatet
            self.humidity_cache = humidity_data
            self.humidity_last_fetch = time.time()
            
            return humidity_data
            
        except Exception as e:
            print(f"❌ Fel vid hämtning av luftfuktighet: {e}")
            return None
    
    def get_current_weather_with_humidity(self) -> Optional[Dict]:
        """
        FAS 1: Hämta aktuellt väder utökat med luftfuktighetsdata från SMHI observations-API.
        
        Returns:
            Befintlig väderdata + 'humidity', 'humidity_timestamp', 'humidity_station'
            eller None vid fel
        """
        # Hämta standard väderdata
        weather_data = self.get_current_weather()
        if not weather_data:
            print("❌ Ingen grundläggande väderdata tillgänglig")
            return None
        
        # Försök hämta luftfuktighet
        humidity_data = self.get_station_humidity()
        if humidity_data:
            weather_data['humidity'] = humidity_data['value']
            weather_data['humidity_timestamp'] = humidity_data['timestamp']
            weather_data['humidity_station'] = humidity_data['station_name']
            weather_data['humidity_age_minutes'] = humidity_data['data_age_minutes']
            print(f"✅ Väderdata utökad med luftfuktighet: {humidity_data['value']}%")
        else:
            print("⚠️ Luftfuktighet ej tillgänglig - returnerar väderdata utan humidity")
            weather_data['humidity'] = None
            weather_data['humidity_timestamp'] = None
            weather_data['humidity_station'] = None
            weather_data['humidity_age_minutes'] = None
        
        return weather_data
    
    # === BEFINTLIGA METODER (INGA ÄNDRINGAR) ===
    
    def get_forecast_url(self) -> str:
        """Bygg URL för SMHI API-anrop."""
        return (
            f"{self.BASE_URL}/category/{self.CATEGORY}/version/{self.VERSION}/"
            f"geotype/point/lon/{self.longitude}/lat/{self.latitude}/data.json"
        )
    
    def fetch_raw_data(self) -> Optional[Dict]:
        """
        Hämta rådata från SMHI API.
        
        Returns:
            Dict med rådata från SMHI eller None vid fel
        """
        url = self.get_forecast_url()
        
        try:
            print(f"📡 Hämtar data från SMHI: {url}")
            
            response = requests.get(url, timeout=self.REQUEST_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            
            # Kontrollera att vi har korrekt data-struktur
            if 'timeSeries' not in data:
                print("❌ Ogiltig data-struktur från SMHI API")
                return None
            
            print(f"✅ SMHI data hämtad - {len(data['timeSeries'])} tidpunkter")
            
            # Cache data
            self.cached_data = data
            self.last_fetch_time = time.time()
            
            return data
            
        except requests.exceptions.Timeout:
            print(f"⏰ Timeout vid anrop till SMHI API ({self.REQUEST_TIMEOUT}s)")
            return None
        except requests.exceptions.ConnectionError:
            print("🌐 Nätverksfel - kan inte nå SMHI API")
            return None
        except requests.exceptions.HTTPError as e:
            print(f"🚫 HTTP-fel från SMHI API: {e}")
            return None
        except json.JSONDecodeError:
            print("📋 Fel vid parsning av JSON från SMHI API")
            return None
        except Exception as e:
            print(f"❌ Oväntat fel vid SMHI API-anrop: {e}")
            return None


# === TEST FUNKTIONER ===

def test_smhi_client():
    """Testfunktion för SMHI-klient med WEATHER ANIMATIONS."""
    print("🧪 Testar SMHI-klient med WEATHER ANIMATIONS integration...")
    
    # Stockholm koordinater
    client = SMHIClient(59.3293, 18.0686)
    
    # Test aktuellt väder
    current = client.get_current_weather()
    if current:
        print("\n📊 Aktuellt väder:")
        for key, value in current.items():
            if key == 'animation_trigger':
                print(f"  🎬 {key}: {value}")
            else:
                print(f"  {key}: {value}")
    
    # Test 12h-prognos (med animation triggers)
    forecast_12h = client.get_12h_forecast()
    if forecast_12h:
        print(f"\n📈 12h-prognos ({len(forecast_12h)} prognoser med animations):")
        for forecast in forecast_12h:
            temp = forecast.get('temp_formatted', 'N/A')
            time_str = forecast.get('local_time', 'N/A')
            hours = forecast.get('hours_from_now', 'N/A')
            symbol = forecast.get('weather_symbol', 'N/A')
            animation = forecast.get('animation_trigger', {}).get('type', 'none')
            print(f"  +{hours}h ({time_str}): {temp}, symbol: {symbol}, animation: {animation}")
    
    # Test dagsprognos
    daily = client.get_daily_forecast(3)
    if daily:
        print(f"\n📅 Dagsprognos ({len(daily)} dagar med animations):")
        for day in daily:
            date = day.get('date', 'N/A')
            temp_min = day.get('temp_min', 'N/A')
            temp_max = day.get('temp_max', 'N/A')
            animation = day.get('animation_trigger', {}).get('type', 'none')
            print(f"  {date}: {temp_min}°C - {temp_max}°C, animation: {animation}")


def test_humidity_functionality():
    """FAS 1: Test av nya luftfuktighets-funktioner."""
    print("\n🧪 === FAS 1: TESTER LUFTFUKTIGHET ===")
    
    # Stockholm koordinater
    client = SMHIClient(59.3293, 18.0686)
    
    print("\n🔍 Test 1: Hitta närmaste luftfuktighetsstation")
    station_id = client.find_nearest_humidity_station()
    if station_id:
        print(f"✅ Närmaste station: {station_id}")
    else:
        print("❌ Ingen station hittad")
    
    print("\n💧 Test 2: Hämta luftfuktighetsdata")
    humidity_data = client.get_station_humidity()
    if humidity_data:
        print(f"✅ Luftfuktighet: {humidity_data}")
    else:
        print("❌ Ingen luftfuktighetsdata")
    
    print("\n🌦️ Test 3: Väder med luftfuktighet")
    weather_with_humidity = client.get_current_weather_with_humidity()
    if weather_with_humidity:
        print("✅ Väder med luftfuktighet:")
        for key, value in weather_with_humidity.items():
            if 'humidity' in key.lower():
                print(f"  💧 {key}: {value}")
            elif key == 'temperature':
                print(f"  🌡️ {key}: {value}")
            elif key == 'data_source':
                print(f"  📡 {key}: {value}")
    else:
        print("❌ Ingen väderdata med luftfuktighet")


if __name__ == "__main__":
    test_smhi_client()
    test_humidity_functionality()