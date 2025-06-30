#!/bin/bash
"""
Kopiera assets från smhi_netatmo_dashboard till flask_weather
FAS 5: Asset-migration script
"""

# Färgkoder för output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📁 Kopierar assets från Tkinter till Flask...${NC}"
echo "=================================================="

# Kontrollera att vi är i rätt katalog
if [ ! -d "static" ]; then
    echo -e "${RED}❌ Fel: Kör skriptet från flask_weather/ katalogen${NC}"
    exit 1
fi

# Kontrollera att source finns
SOURCE_DIR="../smhi_netatmo_dashboard"
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ Fel: Hittar inte $SOURCE_DIR${NC}"
    echo "Kontrollera att flask_weather/ ligger bredvid smhi_netatmo_dashboard/"
    exit 1
fi

echo -e "${YELLOW}🔍 Source: $SOURCE_DIR${NC}"
echo -e "${YELLOW}🎯 Target: $(pwd)${NC}"
echo

# Skapa assets-struktur om den inte finns
echo -e "${BLUE}📁 Skapar assets-struktur...${NC}"
mkdir -p static/assets/icons/weather-icons
mkdir -p static/assets/icons/weather-icons/css
mkdir -p static/assets/icons/weather-icons/fonts
mkdir -p static/assets/icons/amcharts-svg/day
mkdir -p static/assets/icons/amcharts-svg/night
mkdir -p static/assets/css
mkdir -p static/images

# Kopiera Weather Icons (om de finns)
if [ -d "$SOURCE_DIR/assets/icons/weather-icons" ]; then
    echo -e "${GREEN}📦 Kopierar Weather Icons...${NC}"
    cp -r "$SOURCE_DIR/assets/icons/weather-icons/"* static/assets/icons/weather-icons/
    echo "  ✅ Weather Icons kopierade"
else
    echo -e "${YELLOW}⚠️ Weather Icons finns inte i source - skapar placeholder${NC}"
    echo "/* Weather Icons placeholder - ladda från CDN */" > static/assets/icons/weather-icons/css/weather-icons.min.css
fi

# Kopiera amCharts SVG ikoner (om de finns)
if [ -d "$SOURCE_DIR/assets/icons/amcharts-svg" ]; then
    echo -e "${GREEN}📦 Kopierar amCharts SVG ikoner...${NC}"
    cp -r "$SOURCE_DIR/assets/icons/amcharts-svg/"* static/assets/icons/amcharts-svg/
    echo "  ✅ amCharts SVG ikoner kopierade"
else
    echo -e "${YELLOW}⚠️ amCharts SVG finns inte - skapar placeholder-struktur${NC}"
fi

# Kopiera anpassad CSS (om den finns)
if [ -f "$SOURCE_DIR/assets/css/icons.css" ]; then
    echo -e "${GREEN}📦 Kopierar anpassad icons.css...${NC}"
    cp "$SOURCE_DIR/assets/css/icons.css" static/assets/css/
    echo "  ✅ icons.css kopierad"
fi

# Kopiera eventuella bilder/screenshots för referens
if [ -d "$SOURCE_DIR/screenshots" ]; then
    echo -e "${GREEN}📦 Kopierar screenshots för referens...${NC}"
    cp -r "$SOURCE_DIR/screenshots" static/images/
    echo "  ✅ Screenshots kopierade till static/images/"
fi

# Skapa README för assets
echo -e "${BLUE}📝 Skapar assets README...${NC}"
cat > static/assets/README.md << 'EOF'
# Flask Weather Dashboard Assets

## Kopierade från Tkinter-version

### Weather Icons (Erik Flowers)
- **CSS:** `icons/weather-icons/css/weather-icons.min.css`
- **Fonts:** `icons/weather-icons/fonts/`
- **CDN Fallback:** https://cdnjs.cloudflare.com/ajax/libs/weather-icons/2.0.12/css/weather-icons.min.css

### amCharts SVG Icons
- **Day:** `icons/amcharts-svg/day/`
- **Night:** `icons/amcharts-svg/night/`
- **Animerade:** `icons/amcharts-svg/animated/`

### Usage i HTML
```html
<!-- Weather Icons via CDN (nuvarande) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/weather-icons/2.0.12/css/weather-icons.min.css">

<!-- Weather Icons lokal (framtida) -->
<link rel="stylesheet" href="{{ url_for('static', filename='assets/icons/weather-icons/css/weather-icons.min.css') }}">
```

### SMHI Symbol → Weather Icons Mapping
Se `dashboard.js` för komplett mappning av SMHI väder-symboler (1-27) till Weather Icons CSS-klasser.
EOF

# Kopiera data-moduler för referens (inte för körning - de importeras från original)
echo -e "${BLUE}📦 Kopierar data-moduler för referens...${NC}"
mkdir -p reference/data
cp "$SOURCE_DIR/data/"*.py reference/data/ 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✅ Data-moduler kopierade till reference/ för dokumentation"
fi

# Kopiera config för referens
cp "$SOURCE_DIR/config.json" reference/ 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✅ config.json kopierad till reference/ för dokumentation"
fi

# Lista vad som kopierats
echo
echo -e "${GREEN}✅ Asset-kopiering klar!${NC}"
echo "=================================================="
echo -e "${BLUE}📊 Kopierade filer:${NC}"

# Räkna filer i varje kategori
WEATHER_ICONS_COUNT=$(find static/assets/icons/weather-icons -type f 2>/dev/null | wc -l)
AMCHARTS_COUNT=$(find static/assets/icons/amcharts-svg -type f 2>/dev/null | wc -l)
IMAGES_COUNT=$(find static/images -type f 2>/dev/null | wc -l)

echo "  🎨 Weather Icons: $WEATHER_ICONS_COUNT filer"
echo "  📊 amCharts SVG: $AMCHARTS_COUNT filer"
echo "  📸 Bilder/Screenshots: $IMAGES_COUNT filer"

# Visa storlek
TOTAL_SIZE=$(du -sh static/assets 2>/dev/null | cut -f1)
echo "  💾 Total storlek: ${TOTAL_SIZE:-"N/A"}"

echo
echo -e "${YELLOW}🔧 Nästa steg:${NC}"
echo "1. Uppdatera HTML för att använda lokala ikoner (istället för CDN)"
echo "2. Testa att alla ikoner laddas korrekt"
echo "3. Anpassa CSS för landscape-layout"

echo
echo -e "${GREEN}🎯 Asset-migration lyckades!${NC}"