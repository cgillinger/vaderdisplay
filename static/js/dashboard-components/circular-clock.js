/**
 * Circular Clock - STEG 6 REFAKTORERING
 * Klocksystem med LED-prickar och digital visning
 * Extraherat från dashboard.js för modulär struktur
 */

// === CONSTANTS ===
const CLOCK_UPDATE_INTERVAL = 1000; // 1 sekund för klocka

// === CIRKULÄR KLOCKA SYSTEM ===

/**
 * Skapa 60 LED-prickar arrangerade i en perfekt cirkel
 */
function createClockDots() {
    const container = document.querySelector('.clock-dots-container');
    if (!container) {
        console.warn('⚠️ Clock dots container not found');
        return;
    }
    
    // Rensa befintliga prickar
    container.innerHTML = '';
    
    // Skapa 60 prickar (en för varje sekund)
    for (let i = 0; i < 60; i++) {
        const dot = document.createElement('div');
        dot.className = 'clock-dot';
        dot.setAttribute('data-second', i);
        
        // Beräkna position (motsols från toppen, 12-position = 0 grader)
        const angle = (i * 6) - 90; // 6 grader per sekund, -90 för att börja från toppen
        const angleRad = (angle * Math.PI) / 180;
        
        // Position på cirkelns kant (45% av containerbredden från centrum)
        const radius = 45; // procent
        const x = 50 + radius * Math.cos(angleRad);
        const y = 50 + radius * Math.sin(angleRad);
        
        dot.style.left = `${x}%`;
        dot.style.top = `${y}%`;
        dot.style.transform = 'translate(-50%, -50%)';
        
        container.appendChild(dot);
    }
    
    console.log('🕐 60 klock-prickar skapade i cirkel');
}

/**
 * Uppdatera cirkulär klocka med tid, datum och sekundprickar
 */
function updateCircularClock() {
    const now = new Date();
    
    // Uppdatera digital tid (HH:MM)
    const timeString = now.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const clockTimeElement = document.querySelector('.clock-time');
    if (clockTimeElement) {
        clockTimeElement.textContent = timeString;
    }
    
    // Uppdatera datum
    const weekdays = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
    const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni',
                   'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
    
    const weekday = weekdays[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    
    const dateString = `${weekday}, ${day} ${month}`;
    
    const clockDateElement = document.querySelector('.clock-date');
    if (clockDateElement) {
        clockDateElement.textContent = dateString;
    }
    
    // Uppdatera sekundprickar
    updateClockDots(now.getSeconds());
}

/**
 * Uppdatera sekundprickar baserat på aktuell sekund
 */
function updateClockDots(currentSeconds) {
    const dots = document.querySelectorAll('.clock-dot');
    
    dots.forEach((dot, index) => {
        const secondValue = parseInt(dot.getAttribute('data-second'));
        
        if (secondValue <= currentSeconds) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Vid sekund 0, rensa alla prickar första
    if (currentSeconds === 0) {
        setTimeout(() => {
            dots.forEach(dot => dot.classList.remove('active'));
            setTimeout(() => {
                const firstDot = document.querySelector('.clock-dot[data-second="0"]');
                if (firstDot) {
                    firstDot.classList.add('active');
                }
            }, 100);
        }, 50);
    }
}

/**
 * Initiera cirkulär klocka
 * @param {object} dashboardState - Dashboard state objekt för att spara interval
 * @returns {number} Interval ID för klockan
 */
function initializeCircularClock(dashboardState) {
    console.log('🕐 Initialiserar cirkulär klocka...');
    createClockDots();
    updateCircularClock();
    const clockInterval = setInterval(updateCircularClock, CLOCK_UPDATE_INTERVAL);
    
    // Spara interval i dashboard state om tillgängligt
    if (dashboardState) {
        dashboardState.clockInterval = clockInterval;
    }
    
    console.log('✅ Cirkulär klocka initialiserad med sekundprickar');
    return clockInterval;
}

// === EXPORT CIRCULAR CLOCK SYSTEM ===
window.CircularClock = {
    createClockDots,
    updateCircularClock,
    updateClockDots,
    initializeCircularClock,
    CLOCK_UPDATE_INTERVAL
};

console.log('✅ STEG 6: Circular Clock laddat - 4 funktioner extraherade!');