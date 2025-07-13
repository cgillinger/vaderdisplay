#!/usr/bin/env python3
"""
SMHI Warnings API-klient för vädervarningar
Hämtar aktuella vädervarningar från SMHI:s Impact Based Weather Warnings API
Fokus på skyfallsvarningar (HEAVY_RAIN) med utbyggbar struktur för alla varningstyper.

API-dokumentation: https://opendata.smhi.se/apidocs/warnings/index.html
"""

import requests
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import time


class SMHIWarningsClient:
    """Klient för att hämta vädervarningar från SMHI:s Impact Based Weather Warnings API."""
    
    # SMHI Warnings API konstanter
    BASE_URL = "https://opendata-download-warnings.smhi.se/ibww/api"
    VERSION = "1"
    WARNINGS_ENDPOINT = "warning.json"
    
    # Varningstyper baserat på SMHI:s faktiska API-struktur
    WARNING_TYPES = {
        'RAIN': 'Regn',
        'FIRE': 'Brandrisk', 
        'WIND': 'Hård vind',
        'THUNDERSTORM': 'Åska',
        'FOG': 'Dimma',
        'HIGH_TEMPERATURES': 'Höga temperaturer',
        'LOW_TEMPERATURES': 'Låga temperaturer',
        'WATER_SHORTAGE': 'Risk för vattenbrist'
    }
    
    # Skyfallsidentifiering: event.code + eventDescription.code
    HEAVY_RAIN_CRITERIA = {
        'event_code': 'RAIN',
        'event_description_codes': ['CLOUDBURST']  # "Skyfallsliknande regn"
    }
    
    # Allvarlighetsgrader enligt SMHI
    SEVERITY_LEVELS = {
        'Minor': {'level': 1, 'color': 'yellow', 'description': 'Gul varning'},
        'Moderate': {'level': 2, 'color': 'orange', 'description': 'Orange varning'},
        'Severe': {'level': 3, 'color': 'red', 'description': 'Röd varning'},
        'Extreme': {'level': 4, 'color': 'purple', 'description': 'Lila varning'}
    }
    
    # Säkerhetsnivåer för varningar
    CERTAINTY_LEVELS = {
        'Possible': 'Möjlig',
        'Likely': 'Sannolik', 
        'Observed': 'Observerad'
    }
    
    # Timeout för API-anrop
    REQUEST_TIMEOUT = 10
    
    def __init__(self, cache_duration: int = 600):
        """
        Initialisera SMHI Warnings-klient.
        
        Args:
            cache_duration (int): Cache-tid i sekunder (default 600 = 10 min)
        """
        self.cache_duration = cache_duration
        
        # Cache för rådata
        self.cached_warnings = None
        self.last_fetch_time = None
        
        print("⚠️ SMHI Warnings-klient initierad")
    
    def get_warnings_url(self) -> str:
        """Bygg URL för SMHI Warnings API-anrop."""
        return f"{self.BASE_URL}/version/{self.VERSION}/{self.WARNINGS_ENDPOINT}"
    
    def fetch_raw_warnings(self) -> Optional[List]:
        """
        Hämta rådata från SMHI Warnings API.
        
        Returns:
            List med rådata från SMHI Warnings eller None vid fel
        """
        url = self.get_warnings_url()
        
        try:
            print(f"📡 Hämtar varningar från SMHI: {url}")
            
            response = requests.get(url, timeout=self.REQUEST_TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            
            # SMHI returnerar en direkt lista, inte ett objekt med 'warnings'
            if not isinstance(data, list):
                print("❌ Ogiltig data-struktur från SMHI Warnings API - förväntar lista")
                return None
            
            warnings_count = len(data)
            print(f"✅ SMHI varningar hämtade - {warnings_count} varningar totalt")
            
            # Cache data
            self.cached_warnings = data
            self.last_fetch_time = time.time()
            
            return data
            
        except requests.exceptions.Timeout:
            print(f"⏰ Timeout vid anrop till SMHI Warnings API ({self.REQUEST_TIMEOUT}s)")
            return None
        except requests.exceptions.ConnectionError:
            print("🌐 Nätverksfel - kan inte nå SMHI Warnings API")
            return None
        except requests.exceptions.HTTPError as e:
            print(f"🚫 HTTP-fel från SMHI Warnings API: {e}")
            return None
        except json.JSONDecodeError:
            print("📋 Fel vid parsning av JSON från SMHI Warnings API")
            return None
        except Exception as e:
            print(f"❌ Oväntat fel vid SMHI Warnings API-anrop: {e}")
            return None
    
    def get_warnings_data(self, force_refresh: bool = False) -> Optional[List]:
        """
        Hämta SMHI Warnings-data med cache-stöd.
        
        Args:
            force_refresh: Tvinga uppdatering även om cache är giltig
            
        Returns:
            List med SMHI Warnings-data eller None
        """
        # Kontrollera cache
        if (not force_refresh and 
            self.cached_warnings and 
            self.last_fetch_time and 
            time.time() - self.last_fetch_time < self.cache_duration):
            
            print("💾 Använder cachade SMHI-varningar")
            return self.cached_warnings
        
        # Hämta ny data
        return self.fetch_raw_warnings()
    
    def parse_warning(self, warning: Dict) -> List[Dict]:
        """
        Tolka en individuell varning från SMHI-data.
        SMHI-strukturen: En warning kan ha flera warningAreas
        
        Args:
            warning (Dict): Rå varningsdata från SMHI
            
        Returns:
            List[Dict]: Lista med tolkade varningsområden
        """
        parsed_warnings = []
        
        try:
            # Grundläggande event-information
            event = warning.get('event', {})
            warning_type = event.get('code', 'UNKNOWN')
            warning_type_sv = event.get('sv', 'Okänd varning')
            
            # Hämta beskrivningar på warning-nivå (om de finns)
            warning_descriptions = warning.get('descriptions', [])
            
            # Gå igenom alla warningAreas
            warning_areas = warning.get('warningAreas', [])
            
            for area in warning_areas:
                # Area-specifik information
                area_name = area.get('areaName', {}).get('sv', 'Okänt område')
                warning_level = area.get('warningLevel', {})
                severity = warning_level.get('code', 'MESSAGE')
                severity_sv = warning_level.get('sv', 'Meddelande')
                
                event_description = area.get('eventDescription', {})
                event_desc_code = event_description.get('code', '')
                event_desc_sv = event_description.get('sv', '')
                
                # Tidsinformation (approximateStart/End på area-nivå)
                valid_from = area.get('approximateStart')
                valid_to = area.get('approximateEnd')
                
                # Affected areas (läns-lista)
                affected_areas = area.get('affectedAreas', [])
                affected_names = [area_item.get('sv', 'Okänt') for area_item in affected_areas]
                
                # Beskrivningar från area
                area_descriptions = area.get('descriptions', [])
                
                # Kombinera beskrivningar
                all_descriptions = warning_descriptions + area_descriptions
                description_text = self._extract_description_text(all_descriptions)
                
                # Formatera tider
                formatted_from = self._format_warning_time(valid_from) if valid_from else None
                formatted_to = self._format_warning_time(valid_to) if valid_to else None
                
                # Beräkna hur länge varningen gäller
                duration_hours = self._calculate_warning_duration(valid_from, valid_to)
                
                # Bestäm om varningen är aktiv just nu
                is_active = self._is_warning_active(valid_from, valid_to)
                
                parsed_warning = {
                    'id': warning.get('id'),
                    'type': warning_type,
                    'type_description': self.WARNING_TYPES.get(warning_type, warning_type_sv),
                    'event_description_code': event_desc_code,
                    'event_description': event_desc_sv,
                    'severity': severity,
                    'severity_info': self.SEVERITY_LEVELS.get(severity, {'level': 1, 'color': 'yellow', 'description': severity_sv}),
                    'area_name': area_name,
                    'affected_areas': affected_names,
                    'areas_count': len(affected_names),
                    'description': description_text,
                    'valid_from': valid_from,
                    'valid_to': valid_to,
                    'valid_from_formatted': formatted_from,
                    'valid_to_formatted': formatted_to,
                    'duration_hours': duration_hours,
                    'is_active': is_active,
                    'published': area.get('published'),
                    'push_notice': area.get('pushNotice', False),
                    'normal_probability': warning.get('normalProbability', True),
                    'raw_warning': warning  # För debugging
                }
                
                parsed_warnings.append(parsed_warning)
            
            return parsed_warnings
            
        except Exception as e:
            print(f"❌ Fel vid tolkning av varning: {e}")
            return []
    
    def _extract_description_text(self, descriptions: List[Dict]) -> str:
        """
        Extrahera beskrivningstext från SMHI:s descriptions-struktur.
        
        Args:
            descriptions: Lista med description-objekt
            
        Returns:
            str: Sammanslagen beskrivningstext
        """
        incident_text = ""
        affect_text = ""
        
        for desc in descriptions:
            title_code = desc.get('title', {}).get('code', '')
            text = desc.get('text', {}).get('sv', '')
            
            if title_code == 'INCIDENT':
                incident_text = text
            elif title_code == 'AFFECT':
                affect_text = text
        
        # Kombinera beskrivningar
        combined_text = []
        if incident_text:
            combined_text.append(incident_text)
        if affect_text:
            combined_text.append(f"Råd: {affect_text}")
        
        return " | ".join(combined_text) if combined_text else "Ingen beskrivning tillgänglig"
    
    def _format_warning_time(self, iso_time: str) -> str:
        """
        Formatera ISO-tid till läsbar svensk format.
        
        Args:
            iso_time (str): ISO 8601 tidsstämpel
            
        Returns:
            str: Formaterad tid
        """
        try:
            dt = datetime.fromisoformat(iso_time.replace('Z', '+00:00'))
            # Konvertera till lokal tid (svensk tid)
            local_dt = dt.astimezone()
            return local_dt.strftime('%Y-%m-%d %H:%M')
        except Exception:
            return iso_time
    
    def _calculate_warning_duration(self, valid_from: str, valid_to: str) -> Optional[float]:
        """
        Beräkna varningens varaktighet i timmar.
        
        Args:
            valid_from (str): Start-tid
            valid_to (str): Slut-tid
            
        Returns:
            float: Varaktighet i timmar eller None
        """
        try:
            from_dt = datetime.fromisoformat(valid_from.replace('Z', '+00:00'))
            to_dt = datetime.fromisoformat(valid_to.replace('Z', '+00:00'))
            duration = to_dt - from_dt
            return round(duration.total_seconds() / 3600, 1)
        except Exception:
            return None
    
    def _is_warning_active(self, valid_from: str, valid_to: str) -> bool:
        """
        Kontrollera om varningen är aktiv just nu.
        
        Args:
            valid_from (str): Start-tid
            valid_to (str): Slut-tid
            
        Returns:
            bool: True om varningen är aktiv
        """
        try:
            now = datetime.now(timezone.utc)
            from_dt = datetime.fromisoformat(valid_from.replace('Z', '+00:00'))
            to_dt = datetime.fromisoformat(valid_to.replace('Z', '+00:00'))
            return from_dt <= now <= to_dt
        except Exception:
            return False
    
    def get_heavy_rain_warnings(self) -> List[Dict]:
        """
        Hämta endast skyfallsvarningar (RAIN + CLOUDBURST).
        
        Returns:
            List med skyfallsvarningar
        """
        warnings_data = self.get_warnings_data()
        if not warnings_data:
            return []
        
        heavy_rain_warnings = []
        
        for warning in warnings_data:  # Nu itererar vi direkt över listan
            event = warning.get('event', {})
            event_code = event.get('code', '')
            
            # Kontrollera om det är en regnvarning
            if event_code == self.HEAVY_RAIN_CRITERIA['event_code']:
                parsed_warnings = self.parse_warning(warning)
                
                # Filtrera på eventDescription för skyfall
                for parsed in parsed_warnings:
                    event_desc_code = parsed.get('event_description_code', '')
                    if event_desc_code in self.HEAVY_RAIN_CRITERIA['event_description_codes']:
                        heavy_rain_warnings.append(parsed)
        
        print(f"🌧️ Hittade {len(heavy_rain_warnings)} skyfallsvarningar")
        return heavy_rain_warnings
    
    def get_active_heavy_rain_warnings(self) -> List[Dict]:
        """
        Hämta endast aktiva skyfallsvarningar som gäller just nu.
        
        Returns:
            List med aktiva skyfallsvarningar
        """
        all_rain_warnings = self.get_heavy_rain_warnings()
        active_warnings = [w for w in all_rain_warnings if w.get('is_active', False)]
        
        print(f"⚠️ {len(active_warnings)} aktiva skyfallsvarningar just nu")
        return active_warnings
    
    def get_all_warnings(self, warning_types: List[str] = None) -> List[Dict]:
        """
        Hämta alla varningar, eventuellt filtrerat på typ.
        
        Args:
            warning_types (List[str]): Lista med varningstyper att inkludera (None = alla)
            
        Returns:
            List med varningar
        """
        warnings_data = self.get_warnings_data()
        if not warnings_data:
            return []
        
        all_warnings = []
        
        for warning in warnings_data:  # Iterera direkt över listan
            event = warning.get('event', {})
            warning_type = event.get('code', 'UNKNOWN')
            
            # Filtrera på typ om specificerat
            if warning_types and warning_type not in warning_types:
                continue
            
            parsed_warnings = self.parse_warning(warning)
            all_warnings.extend(parsed_warnings)  # Lägg till alla områden
        
        filter_info = f" (filtrerat: {warning_types})" if warning_types else ""
        print(f"📋 Hämtade {len(all_warnings)} varningsområden{filter_info}")
        return all_warnings
    
    def get_warnings_summary(self) -> Dict:
        """
        Hämta en sammanfattning av alla aktiva varningar.
        
        Returns:
            Dict med varningssammanfattning
        """
        warnings_data = self.get_warnings_data()
        if not warnings_data:
            return {
                'total_warnings': 0,
                'active_warnings': 0,
                'heavy_rain_warnings': 0,
                'highest_severity': None,
                'last_update': None
            }
        
        all_warnings = self.get_all_warnings()
        active_warnings = [w for w in all_warnings if w.get('is_active', False)]
        heavy_rain_warnings = self.get_heavy_rain_warnings()
        active_heavy_rain = [w for w in heavy_rain_warnings if w.get('is_active', False)]
        
        # Hitta högsta allvarlighetsgrad
        severity_levels = [w.get('severity_info', {}).get('level', 0) for w in active_warnings]
        highest_severity = max(severity_levels) if severity_levels else 0
        
        summary = {
            'total_warnings': len(all_warnings),
            'active_warnings': len(active_warnings),
            'heavy_rain_warnings': len(heavy_rain_warnings),
            'active_heavy_rain': len(active_heavy_rain),
            'highest_severity': highest_severity,
            'last_update': datetime.now().isoformat(),
            'warnings_by_type': {},
            'cache_age_seconds': time.time() - self.last_fetch_time if self.last_fetch_time else 0
        }
        
        # Räkna varningar per typ
        for warning in all_warnings:
            warning_type = warning.get('type', 'UNKNOWN')
            if warning_type not in summary['warnings_by_type']:
                summary['warnings_by_type'][warning_type] = 0
            summary['warnings_by_type'][warning_type] += 1
        
        return summary


def test_smhi_warnings_client():
    """Test-funktion för SMHI Warnings-klienten."""
    print("\n🧪 === TESTER SMHI WARNINGS CLIENT ===")
    
    client = SMHIWarningsClient()
    
    print("\n📋 Test 1: Hämta alla varningar")
    all_warnings = client.get_all_warnings()
    print(f"Resultat: {len(all_warnings)} varningsområden")
    
    print("\n🌧️ Test 2: Hämta skyfallsvarningar")
    rain_warnings = client.get_heavy_rain_warnings()
    print(f"Resultat: {len(rain_warnings)} skyfallsvarningar")
    
    if rain_warnings:
        print("\nExempel på skyfallsvarning:")
        warning = rain_warnings[0]
        print(f"  Typ: {warning.get('type_description')}")
        print(f"  Beskrivning: {warning.get('event_description')}")
        print(f"  Allvar: {warning.get('severity_info', {}).get('description')}")
        print(f"  Område: {warning.get('area_name')}")
        print(f"  Berörda län: {', '.join(warning.get('affected_areas', []))}")
        print(f"  Från: {warning.get('valid_from_formatted', 'Ej specificerat')}")
        print(f"  Till: {warning.get('valid_to_formatted', 'Ej specificerat')}")
        print(f"  Aktiv: {'Ja' if warning.get('is_active') else 'Nej'}")
    
    print("\n⚠️ Test 3: Aktiva skyfallsvarningar")
    active_rain = client.get_active_heavy_rain_warnings()
    print(f"Resultat: {len(active_rain)} aktiva skyfallsvarningar")
    
    print("\n📊 Test 4: Varningssammanfattning")
    summary = client.get_warnings_summary()
    print(f"Totalt: {summary['total_warnings']} varningsområden")
    print(f"Aktiva: {summary['active_warnings']} aktiva varningar")
    print(f"Skyfall: {summary['heavy_rain_warnings']} skyfallsvarningar")
    print(f"Aktiva skyfall: {summary['active_heavy_rain']} aktiva skyfallsvarningar")
    print(f"Cache-ålder: {summary['cache_age_seconds']:.1f}s")
    print(f"Typer: {summary['warnings_by_type']}")
    
    print("\n🔥 Test 5: Andra varningstyper")
    fire_warnings = client.get_all_warnings(['FIRE'])
    water_warnings = client.get_all_warnings(['WATER_SHORTAGE']) 
    print(f"Brandrisk: {len(fire_warnings)} varningar")
    print(f"Vattenbrist: {len(water_warnings)} varningar")


if __name__ == "__main__":
    test_smhi_warnings_client()