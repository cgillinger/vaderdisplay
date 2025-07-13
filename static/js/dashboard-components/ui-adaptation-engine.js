/**
 * UI Adaptation Engine - STEG 9 REFAKTORERING
 * FAS 3: Graciös UI-degradering extraherat från dashboard.js
 * Hanterar Netatmo-oberoende visning och layout-anpassningar
 */

// === FAS 3: UI DEGRADERING SYSTEM ===

/**
 * Hantera visning/döljning av UI-element baserat på Netatmo-tillgänglighet
 */
function applyUIAdaptations() {
    const netatmoAvailable = isNetatmoAvailable();
    
    console.log(`🎨 FAS 3: Tillämpar UI-anpassningar (Netatmo: ${netatmoAvailable ? 'TILLGÄNGLIG' : 'DOLD'})`);
    
    // Hantera FAKTISK temperatur-sektion
    adaptTemperatureSection(netatmoAvailable);
    
    // Hantera CO2/luftkvalitet
    adaptAirQualitySection(netatmoAvailable);
    
    // HUMIDITY FIX: Hantera luftfuktighet-visning
    adaptHumiditySection(netatmoAvailable);
    
    // Hantera labels/etiketter
    adaptLabels(netatmoAvailable);
    
    // Applicera CSS-klasser för layout-anpassningar
    applyCSSAdaptations(netatmoAvailable);
    
    console.log(`✅ FAS 3: UI-anpassningar tillämpade`);
}

/**
 * HUMIDITY FIX: Anpassa luftfuktighet-sektionen beroende på data-tillgänglighet
 */
function adaptHumiditySection(netatmoAvailable) {
    const humidityElement = document.getElementById('smhi-humidity');
    
    // Kontrollera om vi har luftfuktighetsdata från någon källa
    const hasHumidityData = (netatmoAvailable && dashboardState.dataAvailability.netatmoHumidity) || 
                           dashboardState.dataAvailability.smhiHumidity;
    
    if (!hasHumidityData) {
        // HUMIDITY FIX: Dölj luftfuktighet helt när ingen data finns
        if (humidityElement) {
            humidityElement.classList.add('netatmo-hidden');
            console.log('🙈 HUMIDITY FIX: Luftfuktighet-element dolt - ingen data tillgänglig');
        }
    } else {
        // Visa luftfuktighet när data finns
        if (humidityElement) {
            humidityElement.classList.remove('netatmo-hidden');
            console.log('👁️ HUMIDITY FIX: Luftfuktighet-element visat - data tillgänglig');
        }
    }
}

/**
 * Anpassa temperatur-sektionen beroende på Netatmo-tillgänglighet
 */
function adaptTemperatureSection(netatmoAvailable) {
    const netatmoTempSection = document.querySelector('.netatmo-temperature-section');
    const temperatureContainer = document.querySelector('.temperature-container');
    const mainTempSection = document.querySelector('.main-temp-section');
    
    if (!netatmoAvailable) {
        // FAS 3: Dölj FAKTISK temperatur-sektion
        if (netatmoTempSection) {
            netatmoTempSection.classList.add('netatmo-hidden');
            console.log('🙈 FAS 3: FAKTISK temperatur-sektion dold');
        }
        
        // Justera container för centrerad layout
        if (temperatureContainer) {
            temperatureContainer.classList.add('single-temperature-mode');
        }
        
        if (mainTempSection) {
            mainTempSection.classList.add('single-temperature-mode');
        }
    } else {
        // FAS 3: Visa FAKTISK temperatur-sektion
        if (netatmoTempSection) {
            netatmoTempSection.classList.remove('netatmo-hidden');
        }
        
        if (temperatureContainer) {
            temperatureContainer.classList.remove('single-temperature-mode');
        }
        
        if (mainTempSection) {
            mainTempSection.classList.remove('single-temperature-mode');
        }
    }
}

/**
 * Anpassa luftkvalitet-sektionen
 */
function adaptAirQualitySection(netatmoAvailable) {
    const airQualityContainer = document.querySelector('.air-quality-container');
    
    if (!netatmoAvailable) {
        // FAS 3: Dölj CO2/luftkvalitet
        if (airQualityContainer) {
            airQualityContainer.classList.add('netatmo-hidden');
            console.log('🙈 FAS 3: Luftkvalitet-sektion dold');
        }
    } else {
        // FAS 3: Visa CO2/luftkvalitet
        if (airQualityContainer) {
            airQualityContainer.classList.remove('netatmo-hidden');
        }
    }
}

/**
 * Anpassa etiketter beroende på datakällor
 */
function adaptLabels(netatmoAvailable) {
    const smhiLabel = document.querySelector('.smhi-label');
    
    if (!netatmoAvailable) {
        // FAS 3: Ändra "PROGNOS" till "TEMPERATUR" när bara SMHI används
        if (smhiLabel) {
            smhiLabel.textContent = 'TEMPERATUR';
            console.log('🏷️ FAS 3: Etikett ändrad till "TEMPERATUR"');
        }
    } else {
        // FAS 3: Återställ till "PROGNOS" när båda källor finns
        if (smhiLabel) {
            smhiLabel.textContent = 'PROGNOS';
        }
    }
}

/**
 * Applicera CSS-klasser för layout-anpassningar
 */
function applyCSSAdaptations(netatmoAvailable) {
    const weatherDetailsGrid = document.querySelector('.weather-details-grid');
    const smhiMainCard = document.querySelector('.smhi-main-card');
    
    if (!netatmoAvailable) {
        // FAS 3: Lägg till SMHI-only klasser
        if (weatherDetailsGrid) {
            weatherDetailsGrid.classList.add('smhi-only-mode');
        }
        
        if (smhiMainCard) {
            smhiMainCard.classList.add('smhi-only-mode');
        }
        
        console.log('🎨 FAS 3: SMHI-only CSS-klasser tillämpade');
    } else {
        // FAS 3: Ta bort SMHI-only klasser
        if (weatherDetailsGrid) {
            weatherDetailsGrid.classList.remove('smhi-only-mode');
        }
        
        if (smhiMainCard) {
            smhiMainCard.classList.remove('smhi-only-mode');
        }
    }
}

/**
 * Dynamiskt dölja/visa element baserat på data-tillgänglighet
 */
function adaptElementVisibility() {
    // HUMIDITY FIX: Kontrollera luftfuktighet separat
    adaptHumiditySection(isNetatmoAvailable());
    
    // Dölj andra element som inte har data
    const elementsToCheck = [
        { 
            selector: '.air-quality-container', 
            dataCheck: () => getDataSource('co2').available 
        }
    ];
    
    elementsToCheck.forEach(({ selector, dataCheck }) => {
        const element = document.querySelector(selector);
        if (element) {
            if (dataCheck()) {
                element.classList.remove('data-unavailable');
            } else {
                element.classList.add('data-unavailable');
            }
        }
    });
}

console.log('✅ STEG 9: UI Adaptation Engine laddat - 7 funktioner extraherade!');