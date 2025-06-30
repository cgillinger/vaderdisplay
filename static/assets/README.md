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
