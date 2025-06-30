# 🌤️ Projektbeskrivning: Netatmo-oberoende Väderapp

## 📋 Projektöversikt

### Sammanfattning
Väderappen ska förberedas för användare som INTE har tillgång till Netatmo-väderstation. En enkel växel i `config.py` (`use_netatmo: True/False`) styr om Netatmo används eller inte.

### Principer
- **Minimal dataförlust** - Värden som KAN ersättas med SMHI-data ska ersättas
- **Graciös degradering** - Värden som INTE kan ersättas ska döljas helt
- **Transparent upplevelse** - Användaren ska få en komplett app oavsett datakälla

### Påverkan
- **Med Netatmo**: Full funktionalitet med alla sensorer
- **Utan Netatmo**: SMHI-baserad app utan faktisk temp, CO2 och ljudmätning

Implementation av adaptiv väderapp som fungerar både MED och UTAN Netatmo-väderstation. Styrning via `use_netatmo`-växel i `config.py`.

---

## 🎯 FAS 1: Backend-förberedelser och konfiguration

### Mål
Implementera grundläggande backend-stöd för Netatmo-oberoende drift.

### Omfattning
1. **Uppdatera `config.py`**:
   - Lägg till `use_netatmo: True/False` växel
   - Lägg till Täby-koordinater (Ella Gård: 59.4644, 18.0698)
   - Dokumentera växelns funktion

2. **Modifiera `app.py`**:
   - Implementera villkorsstyrd Netatmo-initialisering
   - Skapa fallback-datastruktur för SMHI-only läge
   - Anpassa API-endpoints för båda lägen

### Filer som behövs i chatten
- `config.py` (befintlig)
- `app.py` (befintlig)

### Leverabler
- Uppdaterad `config.py` med växel och Täby
- Modifierad `app.py` med villkorsstyrd logik
- README-tillägg om konfiguration

### Testpunkter
- Verifiera att appen startar i båda lägen
- Kontrollera att API-svar innehåller korrekt data

---

## 🎯 FAS 2: Frontend datahantering och API-integration

### Mål
Implementera intelligent datahantering i frontend baserat på tillgängliga datakällor.

### Omfattning
1. **Uppdatera `dashboard.js`** (del 1):
   - Detektera `use_netatmo` från API-respons
   - Implementera datasubstitution:
     - Luftfuktighet: Netatmo → SMHI
     - Lufttryck: Netatmo → SMHI
     - Trycktrend: Netatmo-baserad → SMHI-baserad
   - Förbereda element-ID:n för villkorsstyrd visning

2. **Skapa hjälpfunktioner**:
   - `isNetatmoAvailable()`
   - `getDataSource(dataType)`
   - `formatDataWithSource(value, source)`

### Filer som behövs i chatten
- `dashboard.js` (befintlig)
- Exempel på API-respons från fas 1

### Leverabler
- Uppdaterad `dashboard.js` med datahanteringslogik
- Dokumentation av nya funktioner

### Testpunkter
- Verifiera korrekt datakälla för varje värde
- Kontrollera console.log för dataflöde

---

## 🎯 FAS 3: UI-anpassningar och layoutoptimering

### Mål
Implementera graciös UI-degradering när Netatmo-data saknas.

### Omfattning
1. **Slutför `dashboard.js`** (del 2):
   - Implementera villkorsstyrd elementvisning:
     - Dölj "FAKTISK" temperatur-sektion
     - Dölj luftkvalitet (CO2)
     - Dölj ljudnivå
   - Justera textetiketter (t.ex. bara "Temperatur" istället för "PROGNOS")

2. **Uppdatera `styles.css`**:
   - Skapa `.netatmo-hidden` klass
   - Justera grid-layout för dolda element
   - Optimera spacing när element saknas
   - Säkerställ responsiv design i båda lägen

3. **Layout-anpassningar**:
   - Centrera ensam temperatur
   - Omfördela weather-details-grid
   - Justera kortproportioner

### Filer som behövs i chatten
- `dashboard.js` (från fas 2)
- `styles.css` (befintlig)
- `index.html` (för elementstruktur-referens)

### Leverabler
- Färdig `dashboard.js` med komplett UI-logik
- Uppdaterad `styles.css` med layoutanpassningar
- Visuell guide för båda lägen

### Testpunkter
- Verifiera layout i båda lägen
- Kontrollera responsivitet
- Validera att inga tomma element visas

---

## 🎯 FAS 4: Integration, testning och dokumentation

### Mål
Säkerställa sömlös funktion och användarvänlighet i båda driftlägen.

### Omfattning
1. **Omfattande testning**:
   - Test-checklista för båda lägen
   - Edge cases (t.ex. API-fel, saknad data)
   - Prestandatest på Raspberry Pi 3B

2. **Finjusteringar**:
   - Optimera animationer/övergångar
   - Justera typografi för läsbarhet
   - Färgkoda datakällor (optional)

3. **Dokumentation**:
   - Uppdatera README med konfigurationsguide
   - Skapa MIGRATION.md för befintliga användare
   - Troubleshooting-guide

4. **Deployment-script**:
   - Skapa `check_config.py` för validering
   - Backup-rutin för config-byte

### Filer som behövs i chatten
- Alla uppdaterade filer från fas 1-3
- `README.md` (befintlig)

### Leverabler
- Test-rapport med screenshots
- Uppdaterad dokumentation
- Deployment-verktyg
- Eventuella bugfixar

### Testpunkter
- Full systemtest i båda lägen
- Användartester
- Prestandavalidering

---

## 📊 Datahanteringsmatris

| Data | Netatmo ON | Netatmo OFF | UI-åtgärd |
|------|------------|-------------|-----------|
| Temperatur prognos | SMHI | SMHI | Alltid synlig |
| Temperatur faktisk | Netatmo | - | Dölj sektion |
| Vinddata | SMHI | SMHI | Alltid synlig |
| Luftfuktighet | Netatmo | SMHI | Byt källa |
| Lufttryck | Netatmo | SMHI | Byt källa |
| Trycktrend | Netatmo-hist | SMHI-prog | Byt algoritm |
| CO2/Luftkvalitet | Netatmo | - | Dölj element |
| Ljudnivå | Netatmo | - | Dölj element |

---

## 🚀 Användning av faserna

För att starta en fas i ny chat:
```
"Du ska nu genomföra fas [X]"
```

Där X = 1, 2, 3 eller 4.

AI-assistenten kommer då:
1. Be om nödvändiga befintliga filer
2. Genomföra fasens uppgifter
3. Leverera uppdaterade filer
4. Ge instruktioner för test/validering

---

## 📝 Särskilda överväganden

- **Bakåtkompatibilitet**: Befintliga installationer med Netatmo ska fungera oförändrat
- **Prestanda**: Optimerat för Raspberry Pi 3B
- **Användarvänlighet**: Transparent byte mellan lägen
- **Framtidssäkerhet**: Förberedd för fler datakällor (t.ex. luftkvalitet-API)

---

## ✅ Definition av "klar"

Projektet är klart när:
1. Appen fungerar felfritt i båda lägen
2. Ingen visuell indikation på "saknad" data
3. Dokumentation är komplett
4. Prestanda är validerad på målhårdvara