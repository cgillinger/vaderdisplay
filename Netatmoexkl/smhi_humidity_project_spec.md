# 🌊 SMHI Luftfuktighet - Fas-baserad Implementation

## 📋 Projektöversikt

**Mål:** Integrera SMHI:s meteorologiska observations-API för luftfuktighet så att väderdisplayen alltid visar luftfuktighet, även utan Netatmo.

**Problem:** Luftfuktighet försvinner när endast SMHI-data används eftersom SMHI:s väder-API inte innehåller luftfuktighet.

**Lösning:** Använd SMHI:s separata meteorologiska observations-API (parameter 6) för luftfuktighetsdata.

---

## 🎯 Implementation Roadmap

### Fas-struktur
- **FAS 1:** SMHI Client Extension (`smhi_client.py`) - 45 min
- **FAS 2:** Backend Integration (`app.py`) - 30 min  
- **FAS 3:** Frontend Adaptation (`dashboard.js`) - 30 min

**Total tid:** ~105 minuter över 3 separata chattar

---

# 🔧 FAS 1: SMHI Client Extension

## 📋 Fas 1 - Översikt
**Fil att uppdatera:** `reference/data/smhi_client.py`  
**Mål:** Lägg till luftfuktighets-funktionalitet utan att påverka befintlig kod  
**Chatttid:** ~45 minuter  
**Testning:** Manuell API-testning

## 🎯 Fas 1 - Implementation

### Nya metoder att lägga till:

#### 1. `get_station_humidity(station_id=None)`
```python
def get_station_humidity(self, station_id=None):
    """Hämta luftfuktighet från SMHI meteorologiska observations-API"""
    # API: https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/6/station/{station_id}/period/latest-hour/data.json
    # Returnera: {'value': float, 'timestamp': str, 'station_name': str, 'data_age_minutes': int}
```

#### 2. `find_nearest_humidity_station()`
```python
def find_nearest_humidity_station(self):
    """Hitta närmaste station med luftfuktighetsdata baserat på config-koordinater"""
    # API: https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/6.json
    # Använder self.latitude, self.longitude (från config.py)
    # Beräknar Haversine-avstånd till alla aktiva stationer
    # Returnerar: station_id (int) för närmaste station
    # Fallback: [98210, 71420, 52350] om API misslyckas
```

#### 3. `get_current_weather_with_humidity()`
```python
def get_current_weather_with_humidity(self):
    """Utökad version av get_current_weather() som inkluderar luftfuktighet"""
    # Anropa befintlig get_current_weather()
    # Lägg till humidity från get_station_humidity()
    # Returnera: befintlig struktur + 'humidity', 'humidity_timestamp', 'humidity_station'
```

### Felhantering och robusthet:
- **Timeout:** 10 sekunder för API-anrop
- **Fallback-stationer:** Stockholm (98210), Göteborg (71420), Malmö (52350)
- **Data-validering:** Max 2 timmar gammal data
- **Logging:** Informativ debug-output

### 🧪 Fas 1 - Testning
**Innan backup:**
```bash
# Testa befintlig funktionalitet
python3 reference/data/smhi_client.py
```

**Efter implementation:**
```python
# Testa nya humidity-funktioner
client = SMHIClient(59.334591, 18.063240)
humidity_data = client.get_station_humidity()
weather_with_humidity = client.get_current_weather_with_humidity()
print(f"Luftfuktighet: {humidity_data}")
```

### ✅ Fas 1 - Klart när:
- [ ] Befintlig `get_current_weather()` fungerar oförändrat
- [ ] `get_station_humidity()` returnerar giltig data
- [ ] `get_current_weather_with_humidity()` kombinerar väder + humidity
- [ ] Felhantering fungerar för timeout/invalid stations
- [ ] Backup skapad enligt projektstandard

### 📤 Fas 1 - Levererar till Fas 2:
- Fungerande `get_current_weather_with_humidity()` metod
- Luftfuktighetsdata i format: `{'humidity': float, 'humidity_timestamp': str, 'humidity_station': str}`

---

# 🔗 FAS 2: Backend Integration

## 📋 Fas 2 - Översikt
**Fil att uppdatera:** `app.py`  
**Mål:** Integrera humidity-data i Flask API utan att påverka befintlig funktionalitet  
**Chatttid:** ~30 minuter  
**Testning:** API endpoint verification

## 🎯 Fas 2 - Implementation

### Modifiering av `update_weather_data()`:
```python
def update_weather_data():
    # ... befintlig SMHI-kod oförändrad ...
    
    if smhi_client:
        # BEFINTLIG: weather_state['smhi_data'] = smhi_client.get_current_weather()
        # NYT: Använd utökad metod med humidity
        weather_state['smhi_data'] = smhi_client.get_current_weather_with_humidity()
        print("✅ FAS 2: SMHI-data med luftfuktighet uppdaterad")
    
    # ... resten av funktionen oförändrad ...
```

### API-respons uppdatering:
- `/api/weather` ska returnera luftfuktighet i `smhi`-objektet
- Behåll all befintlig funktionalitet
- Lägg till debug-logging för humidity-data

### 🧪 Fas 2 - Testning
**Testa API endpoints:**
```bash
# Verifiera att befintliga endpoints fungerar
curl http://localhost:8036/api/weather
curl http://localhost:8036/api/status

# Kontrollera att humidity finns i SMHI-data
curl http://localhost:8036/api/weather | jq '.smhi.humidity'
```

### ✅ Fas 2 - Klart när:
- [ ] `/api/weather` returnerar humidity i smhi-objektet
- [ ] Befintlig Netatmo-funktionalitet opåverkad
- [ ] Fel vid humidity-hämtning stoppar inte övrig funktionalitet
- [ ] Debug-logging visar humidity-status
- [ ] Backup skapad enligt projektstandard

### 📤 Fas 2 - Levererar till Fas 3:
- API endpoint `/api/weather` som inkluderar `smhi.humidity`
- Backend redo för frontend-integration

---

# 🎨 FAS 3: Frontend Adaptation

## 📋 Fas 3 - Översikt
**Fil att uppdatera:** `static/js/dashboard.js`  
**Mål:** Uppdatera frontend för att visa SMHI-humidity med källmärkning  
**Chatttid:** ~30 minuter  
**Testning:** UI verification i webbläsare

## 🎯 Fas 3 - Implementation

### Modifiering av `updateDataAvailability()`:
```javascript
// Kontrollera SMHI-data mer noggrant
if (apiData.smhi) {
    const smhi = apiData.smhi;
    // BEFINTLIG kod för andra SMHI-data...
    
    // NYT: Kontrollera SMHI humidity
    dashboardState.dataAvailability.smhiHumidity = (
        smhi.humidity !== null && 
        smhi.humidity !== undefined && 
        smhi.humidity > 0
    );
    console.log(`💧 SMHI humidity tillgänglig: ${dashboardState.dataAvailability.smhiHumidity}`);
}
```

### Modifiering av `getDataSource()` för humidity:
```javascript
case 'humidity':
    if (netatmoAvailable && dashboardState.dataAvailability.netatmoHumidity) {
        return {
            source: 'netatmo',
            available: true,
            description: 'Luftfuktighet (Netatmo inomhus)'
        };
    } else if (dashboardState.dataAvailability.smhiHumidity) {
        return {
            source: 'smhi',
            available: true,
            description: 'Luftfuktighet (SMHI utomhus)'
        };
    }
    return { source: 'none', available: false, description: 'Luftfuktighet ej tillgänglig' };
```

### UI-anpassningar:
- **Källmärkning:** Visa "SMHI utomhus" vs "Netatmo inomhus"
- **Ikonuppdatering:** Olika ikoner för inomhus/utomhus
- **Felhantering:** Dölj element bara om BÅDA källor misslyckas

### 🧪 Fas 3 - Testning
**Browser-testning:**
1. **Med Netatmo:** Ska visa "Netatmo inomhus" humidity
2. **Utan Netatmo:** Ska visa "SMHI utomhus" humidity  
3. **Båda misslyckas:** Element dolt med felmeddelande i konsol
4. **Källmärkning:** Tydlig indikation om datakälla

**Konsol-verifiering:**
```javascript
// I browser console:
console.log(dashboardState.dataAvailability.smhiHumidity);
console.log(getDataSource('humidity'));
```

### ✅ Fas 3 - Klart när:
- [ ] Luftfuktighet visas även utan Netatmo
- [ ] Källmärkning fungerar (inomhus vs utomhus) 
- [ ] Befintlig Netatmo-prioritering bibehållen
- [ ] Robust felhantering för båda källor
- [ ] UI-adaptationer fungerar korrekt
- [ ] Backup skapad enligt projektstandard

### 🎯 Fas 3 - Slutresultat:
✅ **Luftfuktighet visas alltid** (Netatmo ELLER SMHI)  
✅ **Tydlig källmärkning** (inomhus vs utomhus)  
✅ **Kompatibilitet** (fungerar med/utan Netatmo)  
✅ **Robust fallback** (flera backup-stationer)

---

# 📚 Teknisk Referens

## 📍 Koordinatsynkning & Stationsval

### Automatisk Stationsdetektering
**Samma koordinater som väderprognos används för luftfuktighet:**

```python
# reference/config.py
CONFIG = {
    'smhi': {
        'latitude': 59.334591,    # Stockholm
        'longitude': 18.063240,
        # Nya humidity-inställningar:
        'humidity_station_id': None,  # Auto-detect → använd närmaste station
        'humidity_max_age_hours': 2,
        'humidity_fallback_stations': [98210, 98230, 71420]
    }
}

# Flöde:
# 1. smhi_client = SMHIClient(config['smhi']['latitude'], config['smhi']['longitude'])
# 2. client.find_nearest_humidity_station() → söker baserat på config-koordinater
# 3. Hittar närmaste aktiva station med luftfuktighetsdata
# 4. Använder den stationen för alla humidity-anrop
```

### Stationsval-strategier:
- **`humidity_station_id: None`** → Auto-detect närmaste station (rekommenderat)
- **`humidity_station_id: 98210`** → Tvinga specifik station (för avancerade användare)
- **Fallback-ordning:** Närliggande backup-stationer om primär misslyckas

### Exempel för olika platser:
```python
# Stockholm (59.334591, 18.063240) → Station 98210 (Stockholm A)
# Göteborg (57.708870, 11.974560) → Station 71420 (Göteborg A)  
# Malmö (55.604981, 13.003822) → Station 52350 (Malmö A)
```

## SMHI Observations API
**Base URL:** `https://opendata-download-metobs.smhi.se/api/version/1.0/`

### Luftfuktighet (Parameter 6):
- **Stationer:** `GET /parameter/6.json`
- **Data:** `GET /parameter/6/station/{station_id}/period/latest-hour/data.json`

### Exempel Stockholm (Station 98210):
```
GET https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/6/station/98210/period/latest-hour/data.json
```

### JSON-respons:
```json
{
  "value": [
    {
      "date": "2025-06-30T12:00:00",
      "value": 65.2
    }
  ]
}
```

## Backup-stationer för Sverige:
- **Stockholm:** 98210 (Stockholm A)
- **Göteborg:** 71420 (Göteborg A) 
- **Malmö:** 52350 (Malmö A)
- **Uppsala:** 97530 (Uppsala)

## Felkoder och hantering:
- **404:** Station saknar data för perioden
- **500:** SMHI serverfel
- **Timeout:** Nätverksproblem (fallback till nästa station)

---

# 🎮 Chat-användning

## För Fas 1:
```
Implementera Fas 1 av SMHI luftfuktighet enligt denna projektspecifikation.

Mål: Utöka smhi_client.py med luftfuktighets-funktionalitet.
Fil: reference/data/smhi_client.py

[bifoga denna specifikation]
```

## För Fas 2:
```
Implementera Fas 2 av SMHI luftfuktighet enligt denna projektspecifikation.

Mål: Integrera humidity-data i Flask API.
Fil: app.py
Förutsättning: Fas 1 klar (smhi_client.py har get_current_weather_with_humidity())

[bifoga denna specifikation]
```

## För Fas 3:
```
Implementera Fas 3 av SMHI luftfuktighet enligt denna projektspecifikation.

Mål: Uppdatera frontend för SMHI-humidity med källmärkning.
Fil: static/js/dashboard.js
Förutsättning: Fas 1-2 klara (API returnerar smhi.humidity)

[bifoga denna specifikation]
```

---

*Varje fas är designad för att klara av i en enskild chat och leverera ett komplett, testbart resultat som nästa fas kan bygga vidare på.*