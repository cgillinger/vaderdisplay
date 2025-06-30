# 🌤️ Flask Weather Dashboard - Komplett Installationsguide

**GitHub Repository:** [https://github.com/cgillinger/vaderdisplay](https://github.com/cgillinger/vaderdisplay)

En modern, responsiv väder-dashboard som fungerar på alla skärmstorlekar och enheter. Visar väderprognos från SMHI med valfri integration av Netatmo väderstation för faktiska mätningar.

![Dashboard Preview](screenshots/dashboard_preview.png)

## ⚡ Snabbstart (5 minuter)

**För Linux/Ubuntu/Raspberry Pi:**
```bash
sudo apt update && sudo apt install python3 python3-pip git -y
cd ~ && git clone https://github.com/cgillinger/vaderdisplay.git && cd vaderdisplay
pip3 install flask requests
cp reference/config_example.py reference/config.py
python3 app.py
```
*Ladda ner, installera och starta på 4 rader. Öppna sedan http://localhost:8036*

**För Synology NAS:**
```bash
python3 -m pip install --user flask requests
cd /var/services/homes/admin/ && git clone https://github.com/cgillinger/vaderdisplay.git && cd vaderdisplay
cp reference/config_example.py reference/config.py && python3 app.py
```
*Installera och starta på Synology. Öppna sedan http://SYNOLOGY-IP:8036*

## 📋 Innehållsförteckning

- [Översikt](#-översikt)
- [Funktioner](#-funktioner)
- [Systemkrav](#-systemkrav)
- [Installation på Linux](#-installation-på-linux)
- [Installation på Synology NAS](#-installation-på-synology-nas)
- [Konfiguration](#-konfiguration)
- [Användning](#-användning)
- [iPad Webbapp-genväg](#-ipad-webbapp-genväg)
- [Anpassningar](#-anpassningar)
- [Felsökning](#-felsökning)
- [Support](#-support)

## 🎯 Översikt

Flask Weather Dashboard är en elegant väder-dashboard som kombinerar SMHI:s väderprognos med valfri integration av Netatmo väderstation. Systemet är optimerat för Raspberry Pi 3B och LP156WH4(TL)(P1) 15.6" LED LCD-paneler, men **fungerar utmärkt på alla skärmstorlekar** - från smartphones och surfplattor till stora skärmar. **Särskilt väl anpassad för iPad** med responsiv design som automatiskt justerar layout och storlekar.

### 🌟 Två driftlägen:

**📊 SMHI-only (REKOMMENDERAT för nybörjare)**
- ✅ Fungerar direkt utan extra konfiguration
- ✅ Visar väderprognos från SMHI
- ✅ Luftfuktighet från SMHI:s observationer
- ✅ Enkel trycktrend baserad på SMHI-data

**🏠 SMHI + Netatmo (För avancerade användare)**
- ✅ Allt från SMHI-only-läget PLUS:
- ✅ Faktisk temperatur från din Netatmo-väderstation
- ✅ CO2-mätning och luftkvalitet
- ✅ Avancerad trycktrend baserad på historiska data
- 🔧 Ljudnivå-mätning (backend-stöd finns, frontend ej aktiverat)

## ✨ Funktioner

### 🌡️ Väderdata
- **SMHI Väderprognos**: 12-timmars och 5-dagars prognoser
- **Aktuell Temperatur**: Från SMHI eller Netatmo
- **Luftfuktighet**: SMHI observationer eller Netatmo
- **Lufttryck**: Med intelligent trycktrend-analys
- **Vinddata**: Med flera enhetsalternativ (svensk land/sjöterminologi, Beaufort, m/s, km/h)
- **Nederbörd**: Prognoser med regnintensitet

### 🎨 Visuella funktioner
- **Cirkulär klocka**: 60 LED-prickar som visar sekunder
- **Responsiv design**: Optimerad för 1366×768 LP156WH4-skärmar
- **Teman**: Mörkt (produktionsklart) och ljust tema
- **Weather Icons**: Professionella väderikoner med dag/natt-varianter
- **Glassmorphism**: Modern glaseffektsdesign

### 🌅 Extra funktioner
- **Sol-tider**: Soluppgång/solnedgång med API eller fallback-beräkning
- **Luftkvalitet**: CO2-mätning (endast med Netatmo)
- **Ljudnivå**: Decibel-mätning (backend-stöd finns, frontend ej aktiverat)
- **Auto-uppdatering**: Konfigurerbara uppdateringsintervall

## 💻 Systemkrav

### Minsta krav:
- **Linux-distribution** (Ubuntu, Debian, Raspberry Pi OS, Synology DSM)
- **Python 3.8+**
- **Flask** (installeras automatiskt)
- **Internetuppkoppling** för SMHI API

### Rekommenderat:
- **Raspberry Pi 3B eller bättre**
- **15.6" skärm med 1366×768 upplösning** (LP156WH4 eller liknande)
- **Chromium/Chrome** för kioskläge
- **4GB+ lagringsutrymme**

### Valfritt:
- **Netatmo väderstation** (för faktiska mätningar)
- **ipgeolocation.io API-nyckel** (för exakta sol-tider)

## 📦 Beroenden och installation

### Systempaket (installeras automatiskt)

**Kommandopaket: Alla systempaket på en gång**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip git curl nano wget unzip chromium-browser -y
```
*Installerar Python 3, pakethanterare (pip), Git (versionskontroll), curl/wget (nedladdningsverktyg), nano (textredigerare) och Chromium (för kiosk-läge).*

### Python-moduler (obligatoriska)

**Flask** - Webbramverk för dashboard-servern
```bash
pip3 install flask
```

**Requests** - HTTP-bibliotek för API-anrop till SMHI och Netatmo
```bash
pip3 install requests
```

**Kommandopaket: Alla Python-beroenden**
```bash
pip3 install flask requests
python3 -c "import flask, requests, json, os, sys, threading, time; print('✅ Alla Python-moduler installerade')"
```
*Installerar och verifierar alla nödvändiga Python-moduler (Flask, requests) plus kontrollerar inbyggda moduler.*

### Systemkontroll av beroenden

**Komplett beroendevalidering:**
```bash
echo "=== Beroendevalidering ==="
python3 --version | grep -E "3\.[8-9]|3\.1[0-9]" && echo "✅ Python OK" || echo "❌ Python för gammal (kräver 3.8+)"
python3 -c "import flask; print('✅ Flask:', flask.__version__)" 2>/dev/null || echo "❌ Flask saknas"
python3 -c "import requests; print('✅ Requests:', requests.__version__)" 2>/dev/null || echo "❌ Requests saknas"
which git > /dev/null && echo "✅ Git installerat" || echo "❌ Git saknas"
which curl > /dev/null && echo "✅ Curl installerat" || echo "❌ Curl saknas"
which nano > /dev/null && echo "✅ Nano installerat" || echo "❌ Nano saknas"
which chromium-browser > /dev/null && echo "✅ Chromium installerat" || echo "⚠️ Chromium saknas (endast för kiosk-läge)"
```
*Kontrollerar alla kritiska beroenden och visar tydliga OK/PROBLEM-meddelanden.*

## 🖥️ Installation på Linux

### Steg 1: Förbered systemet

**Kommandopaket 1: Systemuppdatering och grundläggande verktyg**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip git curl nano -y
```
*Detta uppdaterar paketlistor, uppgraderar systemet och installerar Python 3, pip (pakethanterare), Git (versionskontroll), curl (för API-test) och nano (textredigerare).*

**Verifiera installation:**
```bash
python3 --version
pip3 --version
git --version
```
*Kontrollerar att Python 3.8+ och alla verktyg är korrekt installerade.*

### Steg 2: Ladda ner projektet

**Navigera och ladda ner:**
```bash
cd ~
git clone https://github.com/cgillinger/vaderdisplay.git
cd vaderdisplay
```
*Går till hemkatalogen, laddar ner väder-dashboarden från GitHub och navigerar in i projektkatalogen.*

### Steg 3: Installera Python-beroenden

**Kommandopaket 2: Flask och Python-moduler**
```bash
pip3 install flask requests
python3 -c "import flask, requests; print('✅ Alla Python-beroenden installerade')"
```
*Installerar Flask (webbramverk) och requests (för API-anrop), sedan verifierar att allt fungerar.*

### Steg 4: Konfigurera dashboarden

**Kopiera och redigera konfiguration:**
```bash
cp reference/config_example.py reference/config.py
nano reference/config.py
```
*Kopierar exempel-konfigurationen till aktiv fil och öppnar den för redigering (se Konfiguration-sektionen för detaljer).*

### Steg 5: Testa installationen

**Starta Flask-servern:**
```bash
python3 app.py
```
*Startar väder-dashboarden på port 8036. Om allt fungerar ser du välkomstmeddelandet.*

### Steg 6: Öppna i webbläsare

Öppna webbläsaren och gå till: `http://localhost:8036`

### Steg 7: Konfigurera autostart (valfritt)

**För automatisk start vid systemstart:**
```bash
echo "cd ~/vaderdisplay && python3 app.py &" >> ~/.bashrc
echo "sleep 5 && chromium-browser --kiosk --disable-infobars http://localhost:8036" >> ~/.bashrc
```
**Lägger till automatisk start av dashboarden och kioskläge i Chromium när systemet startar.*

## 🏢 Installation på Synology NAS

### Steg 1: Aktivera SSH och Python

1. **Öppna DSM** (Synology webbgränssnitt)
2. **Paketcenter** → Installera **Python 3**
3. **Kontrollpanel** → **Terminal & SNMP** → Aktivera **SSH-tjänst**

### Steg 2: Anslut via SSH

**Från din dator:**
```bash
ssh admin@192.168.1.100
```
*Ersätt `192.168.1.100` med din NAS:s IP-adress. Använd ditt admin-användarnamn och lösenord.*

### Steg 3: Installera Python-beroenden

**Kommandopaket 1: Python-moduler för Synology**
```bash
python3 -m pip install --user flask requests
python3 -c "import flask, requests; print('✅ Python-beroenden installerade på Synology')"
```
*Installerar Flask och requests med --user för Synology-kompatibilitet och verifierar installationen.*

### Steg 4: Ladda upp projektet

**Alternativ A: Via SSH/Git**
```bash
cd /var/services/homes/admin/
git clone https://github.com/cgillinger/vaderdisplay.git
cd vaderdisplay
```
*Navigerar till hemkatalogen och laddar ner väder-dashboarden via Git.*

**Alternativ B: Via File Station (GUI)**
1. Öppna **File Station** i DSM
2. Navigera till `/homes/admin/`
3. Ladda upp `vaderdisplay.zip` och packa upp

### Steg 5: Konfigurera

**Kopiera och redigera konfiguration:**
```bash
cp reference/config_example.py reference/config.py
nano reference/config.py
```
*Skapar konfigurationsfil och öppnar för redigering.*

### Steg 6: Testa manuell start

**Gör script körbart och testa:**
```bash
chmod +x start_flask_weather.sh
./start_flask_weather.sh
```
*Gör start-scriptet körbart och testar att dashboarden startar korrekt.*

### Steg 7: Konfigurera automatisk start

1. **DSM** → **Kontrollpanel** → **Uppgiftsschema**
2. **Skapa** → **Användardefinierad script**
3. **Användardefinierat script:**
   ```bash
   cd /var/services/homes/admin/vaderdisplay
   ./start_flask_weather.sh
   ```
4. **Schema**: **När systemet startas**
5. **Aktivera uppgift**

### Steg 8: Öppna dashboard

**Från webbläsare:**
```
http://192.168.1.100:8036
```
*Ersätt IP-adressen med din NAS:s faktiska IP-adress.*

## ⚙️ Konfiguration

Huvudkonfigurationen görs i `reference/config.py`. Kopiera från `config_example.py`:

### 🎯 Grundläggande inställningar

```python
CONFIG = {
    # Huvudinställning: SMHI-only eller SMHI+Netatmo
    'use_netatmo': False,  # Sätt till True om du har Netatmo
    
    'smhi': {
        # Koordinater för väderdata
        'latitude': 59.3293,   # Stockholm (ändra till din plats)
        'longitude': 18.0686,  # Stockholm
    },
    
    'display': {
        'location_name': 'Stockholm',  # Namn som visas på skärmen
    },
}
```

### 📍 Koordinater för svenska städer

| Stad | Latitud | Longitud |
|------|---------|----------|
| Stockholm | 59.3293 | 18.0686 |
| Göteborg | 57.7089 | 11.9746 |
| Malmö | 55.6050 | 13.0038 |
| Uppsala | 59.8586 | 17.6389 |
| Linköping | 58.4108 | 15.6214 |

### 🎨 Visuella inställningar

```python
'ui': {
    'theme': 'dark',  # 'light', 'dark', eller 'auto'
    'wind_unit': 'land',  # Se vindenheter nedan
    'refresh_interval_minutes': 15,  # SMHI uppdatering
    'netatmo_refresh_interval_minutes': 10,  # Netatmo uppdatering
}
```

### 💨 Vindenheter

| Enhet | Beskrivning | Exempel |
|-------|-------------|---------|
| `'land'` | Svensk landterminologi | Lugnt, Svag vind, Måttlig vind |
| `'sjo'` | Sjöterminologi | Stiltje, Bris, Kuling, Storm |
| `'beaufort'` | Beaufort-skala | Beaufort 0-12 |
| `'ms'` | Meter per sekund | 5.2 m/s |
| `'kmh'` | Kilometer per timme | 18 km/h |

### 🏠 Netatmo-konfiguration (valfritt)

**OBS:** Krävs ENDAST om `use_netatmo: True`

```python
'netatmo': {
    'client_id': 'DIN_NETATMO_CLIENT_ID',
    'client_secret': 'DIN_NETATMO_CLIENT_SECRET', 
    'refresh_token': 'DIN_NETATMO_REFRESH_TOKEN',
    'preferred_station': 'Utomhus',
},
```

**För att få Netatmo API-uppgifter:**
1. Gå till [https://dev.netatmo.com/apps](https://dev.netatmo.com/apps)
2. Skapa en ny app eller använd befintlig
3. Anteckna Client ID och Client Secret
4. Genomför OAuth-flow för refresh_token

### 🌅 Sol-tider (valfritt)

```python
'ipgeolocation': {
    'api_key': 'DIN_API_NYCKEL',  # Gratis från ipgeolocation.io
},
```

**För exakta sol-tider:**
1. Registrera dig på [https://ipgeolocation.io/](https://ipgeolocation.io/)
2. Få din gratis API-nyckel (1000 anrop/månad)
3. Lägg till i config

**Utan API-nyckel** används förenklad solberäkning (fungerar bra för Sverige).

## 🚀 Användning

### Starta dashboarden

**Linux:**
```bash
cd ~/flask_weather
python3 app.py
```

**Synology:**
```bash
cd /var/services/homes/[användarnamn]/flask_weather
./start_flask_weather.sh
```

### Öppna i webbläsare

- **Lokalt**: `http://localhost:8036`
- **Från annan enhet**: `http://DIN-IP-ADRESS:8036`

### Kioskläge (Raspberry Pi)

```bash
# Fullskärm utan kontroller
chromium-browser --kiosk --disable-infobars http://localhost:8036
```

### Stoppa dashboarden

**Ctrl+C** i terminalen eller hitta process:

```bash
# Hitta Flask-processen
ps aux | grep app.py

# Stoppa med process-ID
kill [PROCESS_ID]
```

## 📱 iPad Webbapp-genväg

Lägg till dashboarden som en app-ikon på iPad:

![iPad Setup](screenshots/screenshot2.png)

### Steg för iPad:

1. **Öppna Safari** på iPad
2. **Navigera** till `http://DIN-SERVER-IP:8036`
3. **Tryck på delningsknappen** (kvadrat med uppåtpil)
4. **Välj "Lägg till på hemskärmen"**
5. **Ändra namnet** till "Väder Dashboard"
6. **Tryck "Lägg till"**

Nu visas dashboarden som en app-ikon på hemskärmen och öppnas i fullskärmsläge utan Safari-kontroller.

### Tips för iPad:

- **Landscape-orientering** rekommenderas för bästa upplevelse
- **Inaktivera Auto-Lock** i Inställningar → Skärm och ljusstyrka
- **Guided Access** kan användas för kioskfunktionalitet

## 🎛️ Anpassningar

### Ändra tema

Redigera `reference/config.py`:

```python
'ui': {
    'theme': 'dark',  # eller 'light', 'auto'
}
```

### Ändra uppdateringsintervall

```python
'ui': {
    'refresh_interval_minutes': 15,  # 5-60 minuter
    'netatmo_refresh_interval_minutes': 10,  # 5-30 minuter
}
```

### Ändra vindenheter

```python
'ui': {
    'wind_unit': 'land',  # 'land', 'sjo', 'beaufort', 'ms', 'kmh'
}
```

### Anpassad CSS

Redigera `static/css/styles.css` för visuella ändringar. CSS:en är optimerad för LP156WH4 (1366×768) men kan anpassas för andra skärmar.

### Ändra port

Redigera `app.py` längst ner:

```python
app.run(
    host='0.0.0.0',
    port=8036,  # Ändra till önskad port
    debug=False,
    threaded=True
)
```

## 🛠️ Felsökning

### Vanliga problem och lösningar

#### Dashboard startar inte

**Kommandopaket 1: Grundläggande systemkontroll**
```bash
python3 --version
python3 -c "import flask, requests; print('✅ Alla moduler OK')"
python3 -c "from reference.config import CONFIG; print('✅ Config OK')"
```
*Kontrollerar Python-version (kräver 3.8+), Flask/requests-installation och config-filens validitet.*

#### Ingen väderdata visas

**Kommandopaket 2: Internetanslutning och API-test**
```bash
ping -c 3 google.com
curl -s "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/18.0686/lat/59.3293/data.json" | head -10
```
*Testar internetanslutning och SMHI API-åtkomst med Stockholm-koordinater.*

#### Netatmo fungerar inte

**Snabb lösning - växla till SMHI-only:**
```bash
sed -i "s/'use_netatmo': True/'use_netatmo': False/" reference/config.py
python3 app.py
```
*Inaktiverar Netatmo tillfälligt och startar om för att testa SMHI-only-läge.*

#### Port eller åtkomstproblem

**Kommandopaket 3: Nätverksdiagnostik**
```bash
netstat -tulpn | grep :8036
ss -tulpn | grep :8036
sudo ufw status
```
*Kontrollerar om port 8036 är upptagen, visar aktiva anslutningar och brandväggsstatus.*

#### Synology-specifika problem

**Kommandopaket 4: Synology-diagnostik**
```bash
which python3
ls -la /var/services/homes/admin/vaderdisplay/
tail -20 /var/services/homes/admin/vaderdisplay/flask.log
ps aux | grep python3
```
*Kontrollerar Python-sökväg, filrättigheter, loggar och aktiva Python-processer.*

**Debug-läge

**Aktivera detaljerad felsökning:**
```bash
cd ~/vaderdisplay
cp app.py app.py.backup
sed -i 's/debug=False/debug=True/' app.py
python3 app.py
```
*Skapar backup och aktiverar Flask debug-läge för detaljerad felrapportering.*

### Systemstatus-kontroll

**Kommandopaket 5: Komplett systemkontroll**
```bash
echo "=== Flask Weather Dashboard - Systemkontroll ==="
echo "Python: $(python3 --version)"
echo "Flask: $(python3 -c 'import flask; print(flask.__version__)' 2>/dev/null || echo 'EJ INSTALLERAT')"
echo "Requests: $(python3 -c 'import requests; print(requests.__version__)' 2>/dev/null || echo 'EJ INSTALLERAT')"
echo "Nätverk: $(curl -s --max-time 5 https://api.smhi.se > /dev/null && echo 'OK' || echo 'PROBLEM')"
echo "Disk: $(df -h . | tail -1 | awk '{print $4}')"
echo "RAM: $(free -h | grep Mem | awk '{print $7}')"
echo "Config: $(python3 -c 'from reference.config import CONFIG; print("OK")' 2>/dev/null || echo 'PROBLEM')"
```
*Komplett systemverifiering som kontrollerar alla kritiska komponenter.*

### API-endpoints för diagnos

**Testa API-funktionalitet:**
```bash
curl http://localhost:8036/api/status
curl http://localhost:8036/api/current
curl http://localhost:8036/api/pressure_trend
```
*Kontrollerar att alla API-endpoints svarar korrekt.*

### Prestandaoptimering för Raspberry Pi 3B

**Kommandopaket 6: Pi-optimering**
```bash
echo "gpu_mem=128" | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
sudo systemctl disable wifi-powersave@wlan0.service
```
*Inaktiverar Bluetooth och WiFi-energisparläge för stabil prestanda.*

**Optimerat kioskläge:**
```bash
chromium-browser --memory-pressure-off --disable-dev-shm-usage --disable-web-security --kiosk http://localhost:8036
```
*Startar Chromium med optimerade inställningar för låg RAM-användning på Pi 3B.*

## 🔧 Support

### Komplett systemverifiering

**Kommandopaket 1: Allt-i-ett systemkontroll**
```bash
echo "=== Flask Weather Dashboard - Komplett Systemkontroll ==="
echo "Datum: $(date)"
echo "System: $(uname -a)"
echo "Python: $(python3 --version)"
echo "Flask: $(python3 -c 'import flask; print(flask.__version__)' 2>/dev/null || echo 'EJ INSTALLERAT')"
echo "Requests: $(python3 -c 'import requests; print(requests.__version__)' 2>/dev/null || echo 'EJ INSTALLERAT')"
echo "Git: $(git --version 2>/dev/null || echo 'EJ INSTALLERAT')"
echo "Curl: $(curl --version 2>/dev/null | head -1 || echo 'EJ INSTALLERAT')"
echo "Nätverk: $(ping -c 1 8.8.8.8 > /dev/null 2>&1 && echo 'OK' || echo 'PROBLEM')"
echo "SMHI API: $(curl -s --max-time 5 https://api.smhi.se > /dev/null && echo 'OK' || echo 'PROBLEM')"
echo "Disk: $(df -h . | tail -1 | awk '{print $4}')"
echo "RAM: $(free -h | grep Mem | awk '{print $7}')"
echo "Config: $(python3 -c 'from reference.config import CONFIG; print("OK")' 2>/dev/null || echo 'PROBLEM')"
echo "Port 8036: $(netstat -tuln | grep :8036 > /dev/null && echo 'UPPTAGEN' || echo 'LEDIG')"
```
*Kör en komplett diagnos av alla systemkomponenter och visar resultat i strukturerat format.*

### Processhantering

**Kommandopaket 2: Flask-processhantering**
```bash
ps aux | grep "python3 app.py"
pkill -f "python3 app.py"
nohup python3 app.py > flask.log 2>&1 &
tail -f flask.log
```
*Visar aktiva Flask-processer, stoppar dem, startar i bakgrunden och visar loggar i realtid.*

**Kommandopaket 3: Porthantering och nätverksstatus**
```bash
netstat -tulpn | grep python3
ss -tulpn | grep python3
lsof -i :8036
sudo ufw status numbered
```
*Kontrollerar nätverksanslutningar för Python-processer, visar port 8036-status och brandväggsinställningar.*

### Backup och återställning

**Kommandopaket 4: Säkerhetskopiering av konfiguration**
```bash
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
cp reference/config.py backup/$(date +%Y%m%d_%H%M%S)/
cp app.py backup/$(date +%Y%m%d_%H%M%S)/
echo "✅ Backup skapad i backup/$(date +%Y%m%d_%H%M%S)/"
```
*Skapar tidsstämplad backup av kritiska konfigurationsfiler.*

### Automatisk installation (helt ny miljö)

**Kommandopaket 5: Fullständig automatisk installation**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip git curl nano chromium-browser -y
cd ~
git clone https://github.com/cgillinger/vaderdisplay.git
cd vaderdisplay
pip3 install flask requests
cp reference/config_example.py reference/config.py
echo "✅ Installation klar! Redigera reference/config.py och kör: python3 app.py"
```
*Komplett installation från början för nya system - laddar ner direkt från GitHub utan konfiguration.*

### Loggar och monitoring

**Kommandopaket 6: Logghantering**
```bash
tail -50 flask.log
grep ERROR flask.log
grep WARNING flask.log
du -sh flask.log
find . -name "*.log" -mtime +7 -delete
```
*Visar senaste loggar, filtrerar fel/varningar, kontrollerar loggstorlek och rensar gamla loggar.*

### Prestanda och resurser

**Kommandopaket 7: Resursmonitoring**
```bash
top -p $(pgrep -f "python3 app.py")
free -h
df -h
iostat 1 3
vcgencmd measure_temp
```
*Övervakar CPU/RAM-användning för Flask, visar disk/minne och temperatur (Pi-specifikt).*

### Community och hjälp

- **GitHub Issues**: [https://github.com/cgillinger/vaderdisplay/issues](https://github.com/cgillinger/vaderdisplay/issues) - För bugrapporter och feature-förfrågningar
- **Dokumentation**: Denna README och kommentarer i koden
- **Config-exempel**: `reference/config_example.py` har detaljerade kommentarer

### Uppdateringar

**Backup och uppdatering:**
```bash
cd ~/vaderdisplay
cp reference/config.py reference/config.backup
git pull
cp reference/config.backup reference/config.py
python3 app.py
```
*Säkerhetskopierar konfiguration, hämtar uppdateringar från GitHub och återställer personliga inställningar.*

---

## 📄 Licens

Detta projekt är open source. Se LICENSE-filen för detaljer.

## 🙏 Tack

- **SMHI**: För öppen väder-API
- **Netatmo**: För väderstation-API
- **Weather Icons**: För professionella väderikoner
- **Flask**: För robust web-ramverk

---

**🌤️ Lycka till med din väder-dashboard!**

För frågor och support, skapa en issue på GitHub eller kontakta projektmaintainers.