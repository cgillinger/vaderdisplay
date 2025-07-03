/**
 * UI Updaters Module - All DOM Updates & Rendering
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/ui-updaters.js
 */

import { WeatherIconManager, FontAwesomeManager } from './icon-manager.js';
import { formatTemperature, formatTemperatureDaily, formatTemperatureInteger, getTemperatureColorClass, getWeatherDescription, isDaytime, formatWeekday, formatDateForDaily } from './formatters.js';
import { formatDataWithSource, isNetatmoAvailable, createSmhiPressureTrendFallback } from './netatmo-intelligence.js';
import { BarometerManager } from './barometer-manager.js';
import { updateWindUnderFaktisk, removeWindDetailItems, createForecastWindDisplay } from './wind-manager.js';
import { dashboardState } from './state-manager.js';

// === MAIN UPDATE FUNCTIONS ===

/**
 * Uppdatera aktuell väderdata i UI
 * @param {object} data - Komplett väderdata från API
 */
export function updateCurrentWeather(data) {
    removeWindDetailItems();
    
    // SMHI Data
    if (data.smhi) {
        updateSMHIData(data.smhi);
    }
    
    // HUMIDITY FIX: INTELLIGENT DATAHANTERING FÖR LUFTFUKTIGHET
    updateHumidityData(data);
    
    // Netatmo Data (Villkorsstyrd med FAS 3 UI-anpassningar)
    if (data.netatmo && isNetatmoAvailable()) {
        updateNetatmoData(data.netatmo, data.smhi);
    } else {
        // FAS 3: SMHI-ONLY MODE - Fallback hantering med UI-anpassningar
        updateSMHIOnlyMode(data.smhi);
    }
    
    // SOL-TIDER (Oförändrade)
    if (data.sun) {
        updateSunTimes(data.sun);
    }
    
    // Rensa vinddata efter en kort fördröjning
    setTimeout(() => {
        removeWindDetailItems();
    }, 100);
}

/**
 * Uppdatera SMHI-data
 * @param {object} smhi - SMHI väderdata
 */
function updateSMHIData(smhi) {
    // SMHI Temperatur
    updateElementHTML('smhi-temperature', smhi.temperature ? formatTemperature(smhi.temperature) : '--.-°');
    
    // SMHI Väder-ikon
    if (smhi.weather_symbol) {
        updateMainWeatherIcon(smhi.weather_symbol);
        updateElement('smhi-description', getWeatherDescription(smhi.weather_symbol));
    }
}

/**
 * Uppdatera huvudväder-ikon
 * @param {number|string} weatherSymbol - SMHI väder-symbol
 */
function updateMainWeatherIcon(weatherSymbol) {
    const iconElement = document.getElementById('smhi-weather-icon');
    const isDay = isDaytime();
    const iconName = WeatherIconManager.getIconName(weatherSymbol, isDay);
    
    if (iconElement) {
        iconElement.innerHTML = '';
        iconElement.className = 'weather-icon';
        
        const weatherIcon = WeatherIconManager.createIcon(iconName, ['weather-main-icon']);
        iconElement.appendChild(weatherIcon);
        
        console.log(`🎨 Main weather icon: ${iconName} for symbol ${weatherSymbol}`);
        
        // WeatherEffects update
        updateWeatherEffects(weatherSymbol);
    }
}

/**
 * Uppdatera WeatherEffects om tillgängligt
 * @param {number|string} weatherSymbol - SMHI väder-symbol
 */
function updateWeatherEffects(weatherSymbol) {
    if (window.weatherEffectsManager) {
        try {
            weatherEffectsManager.updateFromSMHI(
                weatherSymbol,
                0, // precipitation - kan läggas till senare
                0  // wind_direction - kan läggas till senare
            );
        } catch (error) {
            console.warn("WeatherEffects update failed:", error);
        }
    }
}

/**
 * Uppdatera luftfuktighetsdata
 * @param {object} data - Komplett väderdata
 */
function updateHumidityData(data) {
    const humidityData = formatDataWithSource(
        data.netatmo?.humidity || data.smhi?.humidity, 
        'humidity'
    );
    
    if (humidityData.shouldShow) {
        updateHumidityDisplay(humidityData.formatted);
        console.log(`💧 HUMIDITY FIX: ${humidityData.debug}`);
    } else {
        // HUMIDITY FIX: Dölj luftfuktighet-elementet helt
        console.log('🙈 HUMIDITY FIX: Döljer luftfuktighet - ingen data tillgänglig');
        // Element döljs av adaptHumiditySection() som kallas av applyUIAdaptations()
    }
}

/**
 * Uppdatera Netatmo-data
 * @param {object} netatmo - Netatmo-data
 * @param {object} smhi - SMHI-data för vinddata
 */
function updateNetatmoData(netatmo, smhi) {
    // Netatmo Faktisk Temperatur
    updateNetatmoTemperature(netatmo.temperature);
    
    // CO2/Luftkvalitet
    updateAirQuality(netatmo.co2);
    
    // BAROMETER UPDATE med smart källa
    updateBarometerData(netatmo.pressure_trend, netatmo.pressure, smhi?.pressure);
    
    // FÖRSTÄRKT VINDDATA UNDER FAKTISK
    if (smhi && smhi.wind_speed !== null && smhi.wind_speed !== undefined) {
        updateWindUnderFaktisk(smhi);
    }
}

/**
 * Uppdatera Netatmo temperatur
 * @param {number} temperature - Temperatur från Netatmo
 */
function updateNetatmoTemperature(temperature) {
    const tempData = formatDataWithSource(temperature, 'temperature_actual');
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
}

/**
 * Uppdatera luftkvalitet (CO2)
 * @param {number} co2 - CO2-nivå i ppm
 */
function updateAirQuality(co2) {
    const co2Data = formatDataWithSource(co2, 'co2');
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
            
            const leafIcon = FontAwesomeManager.createLeafIcon(iconClass);
            airQualityContainer.insertBefore(leafIcon, airQualityElement);
            
            console.log(`🍃 ${co2Data.debug} - SEPARERAD FÄRGKODNING: ${iconClass}`);
        }
    }
}

/**
 * Uppdatera barometer-data
 * @param {object} pressureTrend - Trycktrend från Netatmo
 * @param {number} netatmoPressure - Tryck från Netatmo
 * @param {number} smhiPressure - Tryck från SMHI som fallback
 */
function updateBarometerData(pressureTrend, netatmoPressure, smhiPressure) {
    const currentPressure = netatmoPressure || smhiPressure;
    const pressureData = formatDataWithSource(currentPressure, 'pressure');
    
    BarometerManager.updateBarometerDetail(pressureTrend, pressureData.value);
}

/**
 * Uppdatera SMHI-only mode med fallback-hantering
 * @param {object} smhi - SMHI-data
 */
function updateSMHIOnlyMode(smhi) {
    console.log('📊 FAS 3: SMHI-only mode med UI-degradering + HUMIDITY FIX');
    
    // Använd SMHI för barometer med fallback
    const fallbackPressureTrend = createSmhiPressureTrendFallback(smhi);
    const pressureData = formatDataWithSource(smhi?.pressure, 'pressure');
    
    BarometerManager.updateBarometerDetail(fallbackPressureTrend, pressureData.value);
    
    console.log('🔄 FAS 3: FAKTISK temperatur, luftfuktighet och CO2 är dolda via UI-anpassningar');
}

/**
 * Uppdatera sol-tider
 * @param {object} sun - Sol-data med sunrise/sunset
 */
function updateSunTimes(sun) {
    try {
        if (sun.sunrise) {
            const sunrise = new Date(sun.sunrise);
            const sunriseTime = sunrise.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'});
            updateSunTimeOptimized('sunrise-time', sunriseTime);
        }
        
        if (sun.sunset) {
            const sunset = new Date(sun.sunset);
            const sunsetTime = sunset.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'});
            updateSunTimeOptimized('sunset-time', sunsetTime);
        }
    } catch (error) {
        console.error('❌ Fel vid parsning av soltider:', error);
    }
}

// === FORECAST UPDATE FUNCTIONS ===

/**
 * Uppdatera timprognos
 * @param {Array} forecastData - Array med timprognos-data
 */
export function updateHourlyForecast(forecastData) {
    const container = document.getElementById('hourly-forecast');
    
    if (!forecastData || !Array.isArray(forecastData) || forecastData.length === 0) {
        container.innerHTML = '<div class="forecast-placeholder">⚠️ Ingen prognos tillgänglig</div>';
        return;
    }
    
    container.innerHTML = '';
    
    forecastData.forEach(forecast => {
        const card = createForecastCard(forecast);
        container.appendChild(card);
    });
    
    console.log(`📈 ${forecastData.length} timprognos-kort uppdaterade`);
}

/**
 * Skapa prognos-kort för timprognos
 * @param {object} forecast - Prognos-data för en timme
 * @returns {HTMLElement} Prognos-kort element
 */
export function createForecastCard(forecast) {
    const card = document.createElement('div');
    
    const hour = parseInt(forecast.local_time.split(':')[0]);
    let timeClass = 'time-day';
    
    if (hour >= 6 && hour < 12) timeClass = 'time-dawn';
    else if (hour >= 12 && hour < 18) timeClass = 'time-day';
    else if (hour >= 18 && hour < 21) timeClass = 'time-evening';
    else timeClass = 'time-night';
    
    card.className = `forecast-card ${timeClass}`;
    
    const isDay = hour >= 6 && hour <= 20;
    const iconName = WeatherIconManager.getIconName(forecast.weather_symbol, isDay);
    
    // Skapa vindvisning
    const windDisplay = createForecastWindDisplay(forecast);
    
    let precipDisplay = '';
    if (forecast.precipitation && forecast.precipitation > 0) {
        precipDisplay = `<div class="forecast-precip">
            <i class="wi wi-raindrops" style="font-size: 12px; opacity: 0.8; color: #4169E1; font-family: 'weathericons', 'Weather Icons', sans-serif;"></i>
            <span style="font-size: 11px;">${forecast.precipitation.toFixed(1)} mm</span>
        </div>`;
    }
    
    const iconId = `forecast-icon-${Math.random().toString(36).substr(2, 9)}`;
    const tempDegree = formatTemperatureInteger(forecast.temperature);
    
    card.innerHTML = `
        <div class="forecast-time">${forecast.local_time}</div>
        <div class="forecast-icon" id="${iconId}"></div>
        <div class="forecast-temp" style="font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">${tempDegree}</div>
        ${windDisplay}
        ${precipDisplay}
    `;
    
    const iconContainer = card.querySelector(`#${iconId}`);
    const weatherIcon = WeatherIconManager.createIcon(iconName, ['forecast-weather-icon']);
    iconContainer.appendChild(weatherIcon);
    
    return card;
}

/**
 * Uppdatera dagsprognos
 * @param {Array} dailyData - Array med dagsprognos-data
 */
export function updateDailyForecast(dailyData) {
    const container = document.getElementById('daily-forecast');
    
    if (!dailyData || !Array.isArray(dailyData) || dailyData.length === 0) {
        container.innerHTML = '<div class="forecast-placeholder">⚠️ Ingen 5-dagarsprognos tillgänglig</div>';
        return;
    }
    
    container.innerHTML = '';
    
    // Lägg till rubriker
    const headersElement = createDailyForecastHeaders();
    container.appendChild(headersElement);
    
    dailyData.forEach(day => {
        const item = createDailyForecastItem(day);
        container.appendChild(item);
    });
    
    console.log(`📅 ${dailyData.length} dagsprognos-rader uppdaterade`);
}

/**
 * Skapa rubriker för dagsprognos
 * @returns {HTMLElement} Rubrik-element
 */
function createDailyForecastHeaders() {
    const headersElement = document.createElement('div');
    headersElement.className = 'daily-forecast-headers';
    headersElement.innerHTML = `
        <div class="header-icon"></div>
        <div class="header-temp">
            <span>DAG</span>
            <span>NATT</span>
        </div>
        <div class="header-weekday"></div>
        <div class="header-date"></div>
    `;
    return headersElement;
}

/**
 * Skapa dagsprognos-objekt
 * @param {object} day - Dagsprognos-data
 * @returns {HTMLElement} Dagsprognos-element
 */
export function createDailyForecastItem(day) {
    const item = document.createElement('div');
    item.className = 'daily-forecast-item';
    
    const iconName = WeatherIconManager.getIconName(day.weather_symbol, true);
    
    const weekdaySwedish = formatWeekday(day.weekday);
    const dateDisplay = formatDateForDaily(day.date);
    
    const iconId = `daily-icon-${Math.random().toString(36).substr(2, 9)}`;
    
    const tempMaxFormatted = formatTemperatureDaily(day.temp_max);
    const tempMinFormatted = formatTemperatureDaily(day.temp_min);
    
    const maxTempColorClass = getTemperatureColorClass(day.temp_max);
    const minTempColorClass = getTemperatureColorClass(day.temp_min);
    const tempColorClass = maxTempColorClass || minTempColorClass;
    
    item.innerHTML = `
        <div class="daily-icon" id="${iconId}"></div>
        <div class="daily-temp ${tempColorClass}">${tempMaxFormatted}/${tempMinFormatted}</div>
        <div class="daily-weekday">${weekdaySwedish}</div>
        <div class="daily-date">${dateDisplay}</div>
    `;
    
    const iconContainer = item.querySelector(`#${iconId}`);
    const weatherIcon = WeatherIconManager.createIcon(iconName, ['daily-weather-icon']);
    
    const colorClass = WeatherIconManager.getColorClass(day.weather_symbol);
    weatherIcon.classList.add(colorClass);
    
    iconContainer.appendChild(weatherIcon);
    
    return item;
}

// === HUMIDITY DISPLAY ===

/**
 * Uppdatera luftfuktighets-visning
 * @param {string} humidityText - Formaterad luftfuktighet
 */
export function updateHumidityDisplay(humidityText) {
    const humidityElement = document.getElementById('smhi-humidity');
    if (!humidityElement) return;
    
    humidityElement.innerHTML = '';
    humidityElement.className = 'detail-item';
    
    const humidityIcon = WeatherIconManager.createIcon('wi-humidity', ['pressure-icon']);
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

// === SUN TIME OPTIMIZATION ===

/**
 * Optimerad uppdatering av sol-tider
 * @param {string} elementId - ID för sol-tid element
 * @param {string} timeOnly - Endast tid (HH:MM)
 */
export function updateSunTimeOptimized(elementId, timeOnly) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let textSpan = element.querySelector('span');
    
    if (textSpan) {
        textSpan.textContent = timeOnly;
    } else {
        const icon = element.querySelector('i');
        if (icon) {
            const children = Array.from(element.childNodes);
            children.forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    child.remove();
                }
            });
            
            textSpan = document.createElement('span');
            textSpan.textContent = timeOnly;
            element.appendChild(textSpan);
        }
    }
}

// === UTILITY FUNCTIONS ===

/**
 * Uppdatera element med text-innehåll
 * @param {string} id - Element ID
 * @param {string} content - Text-innehåll
 */
export function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

/**
 * Uppdatera element med HTML-innehåll
 * @param {string} id - Element ID
 * @param {string} htmlContent - HTML-innehåll
 */
export function updateElementHTML(id, htmlContent) {
    const element = document.getElementById(id);
    if (element) {
        element.innerHTML = htmlContent;
    }
}

// === ROBUST ICON INITIALIZATION ===

/**
 * Initialisera robust ikon-hantering
 */
export function initializeRobustIcons() {
    console.log('🎨 FAS 3: Initialiserar graciös ikon-hantering med HUMIDITY FIX...');
    updateHumidityDisplay('50% Luftfuktighet');
    console.log('✅ FAS 3: Graciös ikon-hantering med HUMIDITY FIX initialiserad');
}

// === ADVANCED UI UPDATES ===

/**
 * Uppdatera UI med animationer
 * @param {string} elementId - Element att animera
 * @param {string} newContent - Nytt innehåll
 * @param {string} animationType - Typ av animation
 */
export function updateWithAnimation(elementId, newContent, animationType = 'fade') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    switch (animationType) {
        case 'fade':
            element.style.opacity = '0';
            setTimeout(() => {
                element.textContent = newContent;
                element.style.opacity = '1';
            }, 150);
            break;
        case 'slide':
            element.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                element.textContent = newContent;
                element.style.transform = 'translateX(0)';
            }, 200);
            break;
        case 'scale':
            element.style.transform = 'scale(0.8)';
            setTimeout(() => {
                element.textContent = newContent;
                element.style.transform = 'scale(1)';
            }, 100);
            break;
        default:
            element.textContent = newContent;
    }
}

/**
 * Batch-uppdatera flera element samtidigt
 * @param {Array} updates - Array med {id, content, type} objekt
 */
export function batchUpdateElements(updates) {
    const startTime = performance.now();
    
    updates.forEach(({ id, content, type = 'text' }) => {
        if (type === 'html') {
            updateElementHTML(id, content);
        } else {
            updateElement(id, content);
        }
    });
    
    const endTime = performance.now();
    console.log(`⚡ Batch-uppdatering av ${updates.length} element: ${(endTime - startTime).toFixed(2)}ms`);
}

/**
 * Uppdatera element med felhantering
 * @param {string} id - Element ID
 * @param {string} content - Innehåll
 * @param {string} fallback - Fallback-innehåll vid fel
 */
export function safeUpdateElement(id, content, fallback = '--') {
    try {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content || fallback;
        }
    } catch (error) {
        console.error(`❌ Fel vid uppdatering av element ${id}:`, error);
        // Försök med fallback
        try {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = fallback;
            }
        } catch (fallbackError) {
            console.error(`❌ Fallback misslyckades för element ${id}:`, fallbackError);
        }
    }
}

// === PERFORMANCE OPTIMIZATION ===

/**
 * Optimerad uppdatering med requestAnimationFrame
 * @param {Function} updateFunction - Uppdateringsfunktion
 */
export function optimizedUpdate(updateFunction) {
    requestAnimationFrame(() => {
        try {
            updateFunction();
        } catch (error) {
            console.error('❌ Fel vid optimerad uppdatering:', error);
        }
    });
}

/**
 * Throttled uppdatering för att undvika för frekventa uppdateringar
 * @param {Function} updateFunction - Uppdateringsfunktion
 * @param {number} delay - Delay i millisekunder
 */
export function throttledUpdate(updateFunction, delay = 100) {
    if (throttledUpdate.timeout) {
        clearTimeout(throttledUpdate.timeout);
    }
    
    throttledUpdate.timeout = setTimeout(() => {
        updateFunction();
        throttledUpdate.timeout = null;
    }, delay);
}

console.log('📦 UI Updaters Module laddat');