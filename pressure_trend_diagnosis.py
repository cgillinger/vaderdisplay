#!/usr/bin/env python3
"""
Trycktrend Diagnos-skript
Analyserar faktisk tryckdata och trend-beräkningar för felsökning
"""

import json
import os
import time
from datetime import datetime

# Optional matplotlib import
try:
    import matplotlib.pyplot as plt
    import numpy as np
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

class PressureTrendDiagnosis:
    """Diagnostisera trycktrend-beräkningar"""
    
    def __init__(self, pressure_history_file="pressure_history.json"):
        self.pressure_history_file = pressure_history_file
        self.history = self._load_pressure_history()
    
    def _load_pressure_history(self):
        """Ladda tryckhistorik från fil"""
        if os.path.exists(self.pressure_history_file):
            try:
                with open(self.pressure_history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"❌ Fel vid läsning av {self.pressure_history_file}: {e}")
                return {"timestamps": [], "pressures": []}
        else:
            print(f"📁 {self.pressure_history_file} finns inte")
            return {"timestamps": [], "pressures": []}
    
    def print_raw_data(self):
        """Visa rådata för manuell kontroll"""
        if not self.history['timestamps']:
            print("❌ Ingen tryckdata tillgänglig")
            return
        
        print("📊 TRYCKDATA (RAW)")
        print("=" * 60)
        print(f"Antal mätpunkter: {len(self.history['timestamps'])}")
        print(f"Tidsspan: {len(self.history['timestamps'])} mätningar")
        print()
        
        # Visa första 10 och sista 10 mätningar
        for i in range(min(10, len(self.history['timestamps']))):
            ts = self.history['timestamps'][i]
            pressure = self.history['pressures'][i]
            dt = datetime.fromtimestamp(ts)
            print(f"{i:2d}: {dt.strftime('%Y-%m-%d %H:%M:%S')} - {pressure:7.1f} hPa")
        
        if len(self.history['timestamps']) > 20:
            print("    ... (visar bara första 10 och sista 10)")
            for i in range(max(10, len(self.history['timestamps']) - 10), len(self.history['timestamps'])):
                ts = self.history['timestamps'][i]
                pressure = self.history['pressures'][i]
                dt = datetime.fromtimestamp(ts)
                print(f"{i:2d}: {dt.strftime('%Y-%m-%d %H:%M:%S')} - {pressure:7.1f} hPa")
    
    def check_data_integrity(self):
        """Kontrollera data-integritet"""
        print("\n🔍 DATA-INTEGRITET")
        print("=" * 60)
        
        timestamps = self.history['timestamps']
        pressures = self.history['pressures']
        
        if len(timestamps) != len(pressures):
            print(f"❌ LÄNGD MISMATCH: {len(timestamps)} timestamps vs {len(pressures)} tryck")
            return False
        
        if len(timestamps) < 2:
            print("⚠️ För lite data för analys")
            return False
        
        # Kontrollera tidsordning
        is_sorted = all(timestamps[i] <= timestamps[i+1] for i in range(len(timestamps)-1))
        print(f"📅 Tidsordning: {'✅ KORREKT' if is_sorted else '❌ FELAKTIG'}")
        
        if not is_sorted:
            print("⚠️ Timestamps är inte sorterade kronologiskt!")
            # Visa de första osorterade paren
            for i in range(len(timestamps)-1):
                if timestamps[i] > timestamps[i+1]:
                    dt1 = datetime.fromtimestamp(timestamps[i])
                    dt2 = datetime.fromtimestamp(timestamps[i+1])
                    print(f"   {i}: {dt1} > {dt2}")
                    if i > 5:  # Begränsa utskrift
                        break
        
        # Kontrollera rimliga tryckvärdendoor
        min_pressure = min(pressures)
        max_pressure = max(pressures)
        print(f"📊 Tryckintervall: {min_pressure:.1f} - {max_pressure:.1f} hPa")
        
        if min_pressure < 950 or max_pressure > 1050:
            print("⚠️ Ovanliga tryckvärden detekterade!")
        
        # Kontrollera extrema förändringar
        extreme_changes = []
        for i in range(len(pressures)-1):
            change = abs(pressures[i+1] - pressures[i])
            if change > 10:  # Mer än 10 hPa förändring mellan mätningar
                dt = datetime.fromtimestamp(timestamps[i])
                extreme_changes.append((dt, change, pressures[i], pressures[i+1]))
        
        if extreme_changes:
            print(f"⚠️ {len(extreme_changes)} extrema förändringar (>10 hPa):")
            for dt, change, p1, p2 in extreme_changes[:5]:
                print(f"   {dt}: {p1:.1f} → {p2:.1f} hPa (Δ{change:.1f})")
        
        return is_sorted
    
    def analyze_current_trend(self):
        """Utför samma trendanalys som huvudsystemet"""
        print("\n📈 TRENDANALYS")
        print("=" * 60)
        
        timestamps = self.history['timestamps']
        pressures = self.history['pressures']
        
        if len(pressures) < 6:
            print("❌ För lite data för trendanalys (<6 mätningar)")
            return
        
        current_time = time.time()
        oldest_time = timestamps[0]
        data_hours = (current_time - oldest_time) / 3600
        
        print(f"📊 Datahistorik: {data_hours:.1f} timmar")
        print(f"📊 Antal mätningar: {len(pressures)}")
        
        # Grundläggande analys (samma som systemet)
        first_pressure = pressures[0]
        last_pressure = pressures[-1]
        pressure_change = last_pressure - first_pressure
        
        print(f"📊 Första mätning: {first_pressure:.1f} hPa ({datetime.fromtimestamp(timestamps[0]).strftime('%Y-%m-%d %H:%M')})")
        print(f"📊 Senaste mätning: {last_pressure:.1f} hPa ({datetime.fromtimestamp(timestamps[-1]).strftime('%Y-%m-%d %H:%M')})")
        print(f"📊 Total förändring: {pressure_change:+.1f} hPa")
        
        # Tröskelvärden
        rising_threshold = 1.0
        falling_threshold = -1.0
        
        if pressure_change >= rising_threshold:
            trend = "rising"
            description = "Högtryck på ingång - bättre väder"
        elif pressure_change <= falling_threshold:
            trend = "falling"
            description = "Lågtryck närmar sig - ostadigare väder"
        else:
            trend = "stable"
            description = "Oförändrat väderläge"
        
        print(f"📊 Beräknad trend: {trend.upper()}")
        print(f"📊 Beskrivning: {description}")
        
        # Analysera senaste 6 timmarna separat
        recent_window = 6 * 3600
        recent_start_time = current_time - recent_window
        recent_indices = [i for i, ts in enumerate(timestamps) if ts >= recent_start_time]
        
        if len(recent_indices) >= 3:
            recent_pressures = [pressures[i] for i in recent_indices]
            recent_change = recent_pressures[-1] - recent_pressures[0]
            recent_hours = (timestamps[recent_indices[-1]] - timestamps[recent_indices[0]]) / 3600
            change_rate = recent_change / max(recent_hours, 1)
            
            print(f"📊 Senaste {recent_hours:.1f}h förändring: {recent_change:+.1f} hPa")
            print(f"📊 Förändringshastighet: {change_rate:+.1f} hPa/h")
        
        return trend, pressure_change
    
    def plot_pressure_history(self, save_plot=False):
        """Plotta tryckhistorik visuellt"""
        if not HAS_MATPLOTLIB:
            print("📊 Matplotlib inte installerat - hoppar över visuell plot")
            print("   För att installera: pip install matplotlib")
            return
            
        if len(self.history['timestamps']) < 2:
            print("❌ För lite data för att plotta")
            return
        
        timestamps = np.array(self.history['timestamps'])
        pressures = np.array(self.history['pressures'])
        
        # Konvertera timestamps till datetime
        datetimes = [datetime.fromtimestamp(ts) for ts in timestamps]
        
        plt.figure(figsize=(12, 6))
        plt.plot(datetimes, pressures, 'b-', linewidth=2, label='Lufttryck')
        plt.plot(datetimes, pressures, 'ro', markersize=3, alpha=0.7)
        
        # Markera första och sista punkt
        plt.plot(datetimes[0], pressures[0], 'go', markersize=8, label=f'Start: {pressures[0]:.1f} hPa')
        plt.plot(datetimes[-1], pressures[-1], 'ro', markersize=8, label=f'Nu: {pressures[-1]:.1f} hPa')
        
        # Lägg till trendlinje
        if len(pressures) > 1:
            z = np.polyfit(timestamps, pressures, 1)
            p = np.poly1d(z)
            plt.plot(datetimes, p(timestamps), "r--", alpha=0.8, 
                    label=f'Trend: {z[0]*3600:+.2f} hPa/h')
        
        plt.xlabel('Tid')
        plt.ylabel('Lufttryck (hPa)')
        plt.title('Lufttryck-historik')
        plt.grid(True, alpha=0.3)
        plt.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        if save_plot:
            plt.savefig('pressure_trend_diagnosis.png', dpi=150, bbox_inches='tight')
            print("📊 Plot sparad som: pressure_trend_diagnosis.png")
        
        plt.show()
    
    def run_full_diagnosis(self):
        """Kör fullständig diagnos"""
        print("🔧 TRYCKTREND DIAGNOS")
        print("=" * 60)
        
        self.print_raw_data()
        data_ok = self.check_data_integrity()
        
        if data_ok:
            self.analyze_current_trend()
        
        # Försök plotta (kräver matplotlib)
        if HAS_MATPLOTLIB:
            self.plot_pressure_history()
        else:
            print("\n📊 För visuell plot, installera matplotlib:")
            print("   pip install matplotlib")


def main():
    """Huvudfunktion"""
    print("🔧 Startar trycktrend-diagnos...")
    
    # Kör diagnos
    diagnosis = PressureTrendDiagnosis()
    diagnosis.run_full_diagnosis()
    
    print("\n" + "=" * 60)
    print("✅ DIAGNOS KLAR")
    print("\nNästa steg:")
    print("1. Kontrollera om tidsordningen är korrekt")
    print("2. Verifiera att tryckvärdena är rimliga")  
    print("3. Kontrollera om trenden stämmer med din känsla")
    print("4. Om problem finns - kör pressure_trend_fix.py")


if __name__ == "__main__":
    main()
