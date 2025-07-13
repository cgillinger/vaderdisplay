/**
 * Barometer Display - STEG 7 REFAKTORERING
 * Barometersystem extraherat från dashboard.js
 * Hanterar tryckvisning, trender och fallback-logik
 */

// === BAROMETER SYSTEM ===

class BarometerDisplay {
    /**
     * Uppdatera barometer-detaljer med tryck och trend
     * @param {object} pressureTrend - Trycktrend-objekt från Netatmo eller fallback
     * @param {number} currentPressure - Aktuellt lufttryck i hPa
     */
    static updateBarometerDetail(pressureTrend, currentPressure) {
        const barometerIcon = document.getElementById('barometer-icon');
        const barometerPressureLine = document.getElementById('barometer-pressure-line');
        const barometerTrendLine = document.getElementById('barometer-trend-line');
        
        if (!barometerIcon || !barometerPressureLine || !barometerTrendLine) {
            console.warn('⚠️ Barometer detail-element saknas i DOM');
            return;
        }
        
        // FAS 2: Använd intelligent datahantering för tryck
        const pressureData = formatDataWithSource(currentPressure, 'pressure');
        
        if (pressureData.shouldShow) {
            barometerPressureLine.textContent = `${Math.round(pressureData.value)} hPa`;
            console.log(pressureData.debug);
        } else {
            barometerPressureLine.textContent = '-- hPa';
        }
        
        // Hantera trycktrend med fallback
        let finalPressureTrend = pressureTrend;
        
        if (!pressureTrend || pressureTrend.trend === 'n/a') {
            // FAS 2: Använd SMHI-baserad fallback om Netatmo saknas
            const smhiData = { pressure: currentPressure };
            finalPressureTrend = createSmhiPressureTrendFallback(smhiData);
            console.log('📊 FAS 2: Använder SMHI trycktrend-fallback');
        }
        
        // Uppdatera barometer-ikon
        this.updateBarometerIcon(barometerIcon, finalPressureTrend.trend);
        
        // Uppdatera trend-linje
        const statusMap = {
            'rising': 'Stigande',
            'falling': 'Fallande',
            'stable': 'Stabilt'
        };
        const trendText = statusMap[finalPressureTrend.trend] || 'Okänt';
        barometerTrendLine.textContent = `Trend: ${trendText}`;
        
        console.log(`📊 FAS 2: Barometer uppdaterad: ${finalPressureTrend.trend} (källa: ${finalPressureTrend.source || 'netatmo'})`);
    }
    
    /**
     * Sätt fallback-visning för barometer
     * @param {HTMLElement} iconElement - Ikon-element
     * @param {HTMLElement} trendElement - Trend-element
     */
    static setBarometerDetailFallback(iconElement, trendElement) {
        this.updateBarometerIcon(iconElement, 'n/a');
        trendElement.textContent = 'Trend: Samlar data...';
    }
    
    /**
     * Uppdatera barometer-ikon baserat på trend
     * @param {HTMLElement} iconElement - Ikon-container element
     * @param {string} trend - Trycktrend: 'rising', 'falling', 'stable', 'n/a'
     */
    static updateBarometerIcon(iconElement, trend) {
        // Kontrollera om ikonen redan är skapad
        let barometerIcon = iconElement.querySelector('.wi-barometer');
        
        if (!barometerIcon) {
            // Rensa befintligt innehåll
            iconElement.innerHTML = '';
            
            // STEG 4: Använd WeatherIconRenderer istället för WeatherIconManager
            barometerIcon = WeatherIconRenderer.createIcon('wi-barometer', []);
            barometerIcon.style.cssText = `
                font-size: clamp(20px, 2rem, 26px);
                display: inline-block;
                line-height: 1;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 0 1px currentColor;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1)) drop-shadow(0 0 1px currentColor);
                transition: color 0.3s ease;
                margin-top: 2px;
            `;
            
            iconElement.appendChild(barometerIcon);
        }
        
        // Ta bort alla trend-klasser
        barometerIcon.classList.remove('rising', 'falling', 'stable', 'na');
        
        // Lägg till färgklass baserat på trend
        const classMap = {
            'rising': 'rising',
            'falling': 'falling', 
            'stable': 'stable',
            'n/a': 'na'
        };
        
        const cssClass = classMap[trend] || 'na';
        barometerIcon.classList.add(cssClass);
        
        console.log(`🎨 Barometer-ikon: ${trend} → ${cssClass}`);
    }
}

// Exportera för backward compatibility (behåll gamla namn)
const BarometerManager = BarometerDisplay;

console.log('✅ STEG 7: Barometer Display laddat - 3 metoder extraherade!');