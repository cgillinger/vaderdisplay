/**
 * Current Weather View - STEG 11 REFAKTORERING
 * Nuvarande väder-funktioner extraherat från dashboard.js
 * Hanterar huvudkortet, temperatur, vind, luftfuktighet och ikoner
 * LP156WH4 OPTIMERING: Konfigurerbar SVG-huvudikon storlek
 */

// === LP156WH4 KONFIGURATION ===
const SVG_MAIN_ICON_SIZE = 140; // px - Ändra denna för att justera SVG-huvudikon storlek

// === CURRENT WEATHER FUNCTIONS ===

/**
 * Uppdatera nuvarande väder (huvudfunktion)
 * @param {object} data - Komplett väderdata från API
 */
function updateCurrentWeather(data) {
    removeWindDetailItems();
    
    // SMHI Data
    if (data.smhi) {
        const smhi = data.smhi;
        
        // SMHI Temperatur
        updateElementHTML('smhi-temperature', smhi.temperature ? formatTemperature(smhi.temperature) : '--.-°');
        
        // SMHI Väder-ikon
        if (smhi.weather_symbol) {
            const iconElement = document.getElementById('smhi-weather-icon');
            const isDay = isDaytime();
            
            // AMCHARTS: Uppdatera ikon-konfiguration från API
            WeatherIconRenderer.updateConfig(data.config);
            
            // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
            const iconName = WeatherIconRenderer.getIconName(smhi.weather_symbol, isDay);
            
            if (iconElement) {
                iconElement.innerHTML = '';
                iconElement.className = 'weather-icon';
                
                // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
                const weatherIcon = WeatherIconRenderer.createIcon(iconName, ['weather-main-icon']);
                iconElement.appendChild(weatherIcon);
                
                // LP156WH4 OPTIMERING: Förstora bara SVG-ikoner, inte font-ikoner
                setTimeout(() => {
                    const svgElement = iconElement.querySelector('img[src*=".svg"], svg');
                    if (svgElement) {
                        svgElement.style.cssText = `
                            transform: scale(${SVG_MAIN_ICON_SIZE / 70}) !important;
                            transform-origin: center !important;
                        `;
                        console.log(`🎨 SVG-huvudikon skalad med transform: scale(${SVG_MAIN_ICON_SIZE / 70})`);
                    }
                }, 50);
                
                console.log(`🎨 Main weather icon: ${iconName} for symbol ${smhi.weather_symbol}`);
                
                // WeatherEffects update
                if (window.weatherEffectsManager) {
                    try {
                        weatherEffectsManager.updateFromSMHI(
                            smhi.weather_symbol,
                            smhi.precipitation || 0,
                            smhi.wind_direction || 0
                        );
                    } catch (error) {
                        console.warn("WeatherEffects update failed:", error);
                    }
                }
            }
            
            updateElement('smhi-description', getWeatherDescription(smhi.weather_symbol));
        }
    }
    
    // HUMIDITY FIX: INTELLIGENT DATAHANTERING FÖR LUFTFUKTIGHET
    // STEG 8: Använd Intelligent Data Source istället för lokal funktion
    const humidityData = formatDataWithSource(
        data.netatmo?.humidity || data.smhi?.humidity, 
        'humidity'
    );
    
    if (humidityData.shouldShow) {
        updateHumidityDisplay(humidityData.formatted);
        console.log(`💧 HUMIDITY FIX: ${humidityData.debug}`);
    } else {
        // HUMIDITY FIX: Dölj luftfuktighet helt när ingen data finns
        console.log('🙈 HUMIDITY FIX: Döljer luftfuktighet - ingen data tillgänglig');
        // Element döljs av adaptHumiditySection() som kallas av applyUIAdaptations()
    }
    
    // Netatmo Data (Villkorsstyrd med FAS 3 UI-anpassningar)
    if (data.netatmo && isNetatmoAvailable()) {
        const netatmo = data.netatmo;
        
        // Netatmo Faktisk Temperatur (FAS 3: Bara om sektionen visas)
        // STEG 8: Använd Intelligent Data Source istället för lokal funktion
        const tempData = formatDataWithSource(netatmo.temperature, 'temperature_actual');
        if (tempData.shouldShow) {
            const tempElement = document.getElementById('netatmo-temperature-small');
            if (tempElement && !document.querySelector('.netatmo-temperature-section.netatmo-hidden')) {
                tempElement.innerHTML = formatTemperature(tempData.value);
                
                let tempColor = '#4285f4';
                if (tempData.value < 0) tempColor = '#3b82f6';
                else if (tempData.value < 10) tempColor = '#06b6d4';
                else if (tempData.value < 20) tempColor = '#10b981';
                else if (tempData.value < 25) tempColor = '#f59e0b';
                else tempColor = '#ef4444';
                
                tempElement.style.color = tempColor;
                console.log(tempData.debug);
            }
        }
        
        // CO2/Luftkvalitet - FAS 3: Villkorsstyrd visning
        // STEG 8: Använd Intelligent Data Source istället för lokal funktion
        const co2Data = formatDataWithSource(netatmo.co2, 'co2');
        if (co2Data.shouldShow) {
            const airQualityElement = document.getElementById('air-quality');
            const airQualityContainer = document.querySelector('.air-quality-container');
            
            if (airQualityElement && airQualityContainer && !airQualityContainer.classList.contains('netatmo-hidden')) {
                airQualityElement.textContent = co2Data.formatted;
                
                let iconClass = 'good';
                if (co2Data.value > 1500) {
                    iconClass = 'poor';
                } else if (co2Data.value > 800) {
                    iconClass = 'moderate';
                }
                
                const existingIcon = airQualityContainer.querySelector('.air-quality-fa-icon');
                if (existingIcon) {
                    existingIcon.remove();
                }
                
                // STEG 5: Använd FontAwesomeRenderer istället för FontAwesomeManager
                const leafIcon = FontAwesomeRenderer.createLeafIcon(iconClass);
                airQualityContainer.insertBefore(leafIcon, airQualityElement);
                
                console.log(`🍃 ${co2Data.debug} - SEPARERAD FÄRGKODNING: ${iconClass}`);
            }
        }
        
        // BAROMETER UPDATE med smart källa
        const pressureTrend = netatmo.pressure_trend;
        // STEG 8: Använd Intelligent Data Source istället för lokal funktion
        const pressureData = formatDataWithSource(netatmo.pressure || data.smhi?.pressure, 'pressure');
        
        // STEG 7: Använd BarometerDisplay iställetför BarometerManager
        BarometerDisplay.updateBarometerDetail(pressureTrend, pressureData.value);
        
        // FÖRSTÄRKT VINDDATA UNDER FAKTISK (FAS 3: Bara om sektionen visas)
        if (data.smhi && data.smhi.wind_speed !== null && data.smhi.wind_speed !== undefined) {
            updateWindUnderFaktisk(data.smhi);
        }
    } else {
        // FAS 3: SMHI-ONLY MODE - Fallback hantering med UI-anpassningar
        console.log('📊 FAS 3: SMHI-only mode med UI-degradering + HUMIDITY FIX');
        
        // Använd SMHI för barometer med fallback
        // STEG 8: Använd Intelligent Data Source istället för lokal funktion
        const fallbackPressureTrend = createSmhiPressureTrendFallback(data.smhi);
        const pressureData = formatDataWithSource(data.smhi?.pressure, 'pressure');
        
        // STEG 7: Använd BarometerDisplay istället för BarometerManager
        BarometerDisplay.updateBarometerDetail(fallbackPressureTrend, pressureData.value);
        
        console.log('🔄 FAS 3: FAKTISK temperatur, luftfuktighet och CO2 är dolda via UI-anpassningar');
    }
    
    // SOL-TIDER (Oförändrade)
    if (data.sun) {
        try {
            if (data.sun.sunrise) {
                const sunrise = new Date(data.sun.sunrise);
                const sunriseTime = sunrise.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'});
                updateSunTimeOptimized('sunrise-time', sunriseTime);
            }
            
            if (data.sun.sunset) {
                const sunset = new Date(data.sun.sunset);
                const sunsetTime = sunset.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'});
                updateSunTimeOptimized('sunset-time', sunsetTime);
            }
        } catch (error) {
            console.error('❌ Fel vid parsning av soltider:', error);
        }
    }
    
    setTimeout(() => {
        removeWindDetailItems();
    }, 100);
}

/**
 * Uppdatera vinddata under FAKTISK temperatur
 * @param {object} smhiData - SMHI current weather data
 */
function updateWindUnderFaktisk(smhiData) {
    const netatmoSection = document.querySelector('.netatmo-temperature-section');
    if (!netatmoSection) return;
    
    // Ta bort befintliga vinddata
    const existingWindElements = netatmoSection.querySelectorAll('.wind-under-faktisk');
    existingWindElements.forEach(element => element.remove());
    
    // FAS 3: Bara lägg till vinddata om Netatmo-sektionen visas
    if (netatmoSection.classList.contains('netatmo-hidden')) {
        console.log('🙈 FAS 3: Vinddata skippas - FAKTISK sektion är dold');
        return;
    }
    
    // Lägg till ny vinddata
    if (smhiData.wind_speed !== null && smhiData.wind_speed !== undefined) {
        const windKmh = smhiData.wind_speed * 3.6;
        const windData = convertWindSpeed(windKmh, dashboardState.windUnit);
        
        let windText = windData.value;
        let windArrowHTML = '';
        
        if (smhiData.wind_direction !== null && smhiData.wind_direction !== undefined) {
            const windDir = getWindDirection(smhiData.wind_direction);
            const windDegree = Math.round(smhiData.wind_direction);
            
            // FÖRSTÄRKT VÄDERRIKTNINGSPIL: 12px → 28px för LP156WH4-synlighet
            windArrowHTML = ` <i class="wi wi-wind from-${windDegree}-deg" style="
                color: #4A9EFF; 
                font-size: 28px; 
                margin-left: 4px; 
                font-family: 'weathericons', 'Weather Icons', sans-serif;
                display: inline-block;
                text-shadow: 0 0 1px currentColor;
                filter: drop-shadow(0 0 1px currentColor);
            "></i>`;
            windText += ` ${windDir}`;
        }
        
        // Skapa vinddata-element
        const windElement = document.createElement('div');
        windElement.className = 'wind-under-faktisk';
        
        // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
        const windIcon = WeatherIconRenderer.createIcon(windData.icon, []);
        windIcon.style.cssText = `
            color: #4A9EFF; 
            font-size: 12px;
            margin-right: 4px;
            display: inline-block;
        `;
        
        windElement.appendChild(windIcon);
        windElement.insertAdjacentHTML('beforeend', `${windText}${windArrowHTML}`);
        
        netatmoSection.appendChild(windElement);
        
        console.log(`💨 FÖRSTÄRKT vinddata under FAKTISK: ${windText} (pil: 28px)`);
    }
}

/**
 * Ta bort vinddata från weather details grid
 */
function removeWindDetailItems() {
    const weatherDetailsGrid = document.querySelector('.weather-details-grid');
    if (!weatherDetailsGrid) return;
    
    const allDetailItems = weatherDetailsGrid.querySelectorAll('.detail-item');
    
    allDetailItems.forEach(item => {
        const text = item.textContent || '';
        
        if (text.includes('m/s') || 
            text.includes('Vind') || 
            text.includes('km/h') ||
            text.includes('Beaufort') ||
            item.classList.contains('wind-detail') ||
            item.id && item.id.includes('wind')) {
            
            console.log(`🗑️ Tar bort vind detail-item: ${text}`);
            item.remove();
        }
    });
}

/**
 * Initialisera robusta ikoner för väder-visning
 */
function initializeRobustIcons() {
    console.log('🎨 FAS 3: Initialiserar graciös ikon-hantering med HUMIDITY FIX...');
    updateHumidityDisplay('50% Luftfuktighet');
    console.log('✅ FAS 3: Graciös ikon-hantering med HUMIDITY FIX initialiserad');
}

/**
 * Uppdatera luftfuktighets-visning med ikon
 * @param {string} humidityText - Formaterad luftfuktighetstext
 */
function updateHumidityDisplay(humidityText) {
    const humidityElement = document.getElementById('smhi-humidity');
    if (!humidityElement) return;
    
    humidityElement.innerHTML = '';
    humidityElement.className = 'detail-item';
    
    // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
    const humidityIcon = WeatherIconRenderer.createIcon('wi-humidity', ['pressure-icon']);
    humidityIcon.style.cssText = `
        color: #4A9EFF;
        font-size: clamp(16px, 1.6rem, 21px);
        margin-right: 7px;
        display: inline-block;
    `;
    
    humidityElement.appendChild(humidityIcon);
    humidityElement.insertAdjacentHTML('beforeend', `<span>${humidityText}</span>`);
    
    console.log(`💧 HUMIDITY FIX: Luftfuktighetsikon skapad: wi-humidity`);
}

console.log('✅ STEG 11: Current Weather View laddat - LP156WH4 SVG-ikoner konfigurerbara!');