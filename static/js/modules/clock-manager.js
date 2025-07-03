/**
 * Clock Manager Module - Circular Clock System
 * FAS 3: Weather Dashboard Module System
 * Filsökväg: static/js/modules/clock-manager.js
 */

import { setClockInterval, CLOCK_UPDATE_INTERVAL } from './state-manager.js';

// === CLOCK CONSTANTS ===
const CLOCK_CONFIG = {
    TOTAL_DOTS: 60,
    RADIUS_PERCENT: 45,
    START_ANGLE: -90, // Börja från toppen
    DEGREES_PER_SECOND: 6 // 360 / 60
};

// === CLOCK DOT CREATION ===

/**
 * Skapa 60 LED-prickar arrangerade i en perfekt cirkel
 * @param {string} containerId - ID för clock dots container
 * @returns {boolean} True om skapandet lyckades
 */
export function createClockDots(containerId = 'clock-dots-container') {
    const container = document.querySelector(`.${containerId}`) || document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Clock dots container '${containerId}' not found`);
        return false;
    }
    
    // Rensa befintliga prickar
    container.innerHTML = '';
    
    // Skapa 60 prickar (en för varje sekund)
    for (let i = 0; i < CLOCK_CONFIG.TOTAL_DOTS; i++) {
        const dot = document.createElement('div');
        dot.className = 'clock-dot';
        dot.setAttribute('data-second', i);
        
        // Beräkna position (motsols från toppen, 12-position = 0 grader)
        const angle = (i * CLOCK_CONFIG.DEGREES_PER_SECOND) + CLOCK_CONFIG.START_ANGLE;
        const angleRad = (angle * Math.PI) / 180;
        
        // Position på cirkelns kant (45% av containerbredden från centrum)
        const x = 50 + CLOCK_CONFIG.RADIUS_PERCENT * Math.cos(angleRad);
        const y = 50 + CLOCK_CONFIG.RADIUS_PERCENT * Math.sin(angleRad);
        
        dot.style.left = `${x}%`;
        dot.style.top = `${y}%`;
        dot.style.transform = 'translate(-50%, -50%)';
        
        container.appendChild(dot);
    }
    
    console.log(`🕐 ${CLOCK_CONFIG.TOTAL_DOTS} klock-prickar skapade i cirkel`);
    return true;
}

// === CLOCK UPDATE FUNCTIONS ===

/**
 * Uppdatera cirkulär klocka med tid, datum och sekundprickar
 */
export function updateCircularClock() {
    const now = new Date();
    
    // Uppdatera digital tid (HH:MM)
    updateDigitalTime(now);
    
    // Uppdatera datum
    updateClockDate(now);
    
    // Uppdatera sekundprickar
    updateClockDots(now.getSeconds());
}

/**
 * Uppdatera digital tid-visning
 * @param {Date} date - Datum-objekt
 */
function updateDigitalTime(date) {
    const timeString = date.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const clockTimeElement = document.querySelector('.clock-time');
    if (clockTimeElement) {
        clockTimeElement.textContent = timeString;
    }
}

/**
 * Uppdatera datum-visning
 * @param {Date} date - Datum-objekt
 */
function updateClockDate(date) {
    const weekdays = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
    const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni',
                   'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
    
    const weekday = weekdays[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    
    const dateString = `${weekday}, ${day} ${month}`;
    
    const clockDateElement = document.querySelector('.clock-date');
    if (clockDateElement) {
        clockDateElement.textContent = dateString;
    }
}

/**
 * Uppdatera sekundprickar baserat på aktuell sekund
 * @param {number} currentSeconds - Aktuell sekund (0-59)
 */
export function updateClockDots(currentSeconds) {
    const dots = document.querySelectorAll('.clock-dot');
    
    dots.forEach((dot, index) => {
        const secondValue = parseInt(dot.getAttribute('data-second'));
        
        if (secondValue <= currentSeconds) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Vid sekund 0, rensa alla prickar först för smooth reset
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

// === CLOCK INITIALIZATION ===

/**
 * Initiera cirkulär klocka
 * @param {string} containerId - ID för clock container
 * @returns {boolean} True om initialisering lyckades
 */
export function initializeCircularClock(containerId = 'clock-dots-container') {
    console.log('🕐 Initialiserar cirkulär klocka...');
    
    // Skapa klock-prickar
    const dotsCreated = createClockDots(containerId);
    if (!dotsCreated) {
        console.error('❌ Kunde inte skapa klock-prickar');
        return false;
    }
    
    // Uppdatera klocka första gången
    updateCircularClock();
    
    // Starta intervall för kontinuerlig uppdatering
    const intervalId = setInterval(updateCircularClock, CLOCK_UPDATE_INTERVAL);
    setClockInterval(intervalId);
    
    console.log('✅ Cirkulär klocka initialiserad med sekundprickar');
    return true;
}

// === CLOCK CUSTOMIZATION ===

/**
 * Anpassa klock-utseende
 * @param {object} options - Anpassningsalternativ
 */
export function customizeClockAppearance(options = {}) {
    const {
        dotColor = '#4285f4',
        activeDotColor = '#1976d2',
        dotSize = '4px',
        glowEffect = true,
        animationDuration = '0.3s'
    } = options;
    
    // Skapa eller uppdatera CSS-variabler
    const root = document.documentElement;
    root.style.setProperty('--clock-dot-color', dotColor);
    root.style.setProperty('--clock-dot-active-color', activeDotColor);
    root.style.setProperty('--clock-dot-size', dotSize);
    root.style.setProperty('--clock-animation-duration', animationDuration);
    
    // Lägg till glow-effekt om aktiverad
    if (glowEffect) {
        root.style.setProperty('--clock-dot-glow', `0 0 8px ${activeDotColor}`);
    } else {
        root.style.setProperty('--clock-dot-glow', 'none');
    }
    
    console.log('🎨 Klock-utseende anpassat');
}

// === CLOCK ANIMATIONS ===

/**
 * Animera klock-prickar med olika effekter
 * @param {string} animationType - Typ av animation
 */
export function animateClockDots(animationType = 'wave') {
    const dots = document.querySelectorAll('.clock-dot');
    
    switch (animationType) {
        case 'wave':
            animateWaveEffect(dots);
            break;
        case 'pulse':
            animatePulseEffect(dots);
            break;
        case 'rotate':
            animateRotateEffect(dots);
            break;
        case 'rainbow':
            animateRainbowEffect(dots);
            break;
        default:
            console.warn(`⚠️ Okänd animations-typ: ${animationType}`);
    }
}

/**
 * Våg-effekt animation
 * @param {NodeList} dots - Alla klock-prickar
 */
function animateWaveEffect(dots) {
    dots.forEach((dot, index) => {
        setTimeout(() => {
            dot.classList.add('wave-animation');
            setTimeout(() => {
                dot.classList.remove('wave-animation');
            }, 300);
        }, index * 20);
    });
}

/**
 * Puls-effekt animation
 * @param {NodeList} dots - Alla klock-prickar
 */
function animatePulseEffect(dots) {
    dots.forEach((dot, index) => {
        setTimeout(() => {
            dot.classList.add('pulse-animation');
            setTimeout(() => {
                dot.classList.remove('pulse-animation');
            }, 500);
        }, index * 10);
    });
}

/**
 * Rotation-effekt animation
 * @param {NodeList} dots - Alla klock-prickar
 */
function animateRotateEffect(dots) {
    const container = document.querySelector('.clock-dots-container');
    if (container) {
        container.classList.add('rotate-animation');
        setTimeout(() => {
            container.classList.remove('rotate-animation');
        }, 2000);
    }
}

/**
 * Regnbåge-effekt animation
 * @param {NodeList} dots - Alla klock-prickar
 */
function animateRainbowEffect(dots) {
    const colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#4b0082', '#9400d3'];
    
    dots.forEach((dot, index) => {
        const color = colors[index % colors.length];
        dot.style.background = color;
        dot.style.boxShadow = `0 0 8px ${color}`;
        
        setTimeout(() => {
            dot.style.background = '';
            dot.style.boxShadow = '';
        }, 3000);
    });
}

// === CLOCK UTILITIES ===

/**
 * Hämta aktuell tid som objekt
 * @returns {object} Tid-objekt med timmar, minuter, sekunder
 */
export function getCurrentTime() {
    const now = new Date();
    return {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        timestamp: now.getTime(),
        iso: now.toISOString()
    };
}

/**
 * Beräkna vinklar för analog klocka
 * @param {number} hours - Timmar
 * @param {number} minutes - Minuter
 * @param {number} seconds - Sekunder
 * @returns {object} Vinklar för timvisare, minutvisare, sekundvisare
 */
export function calculateClockAngles(hours, minutes, seconds) {
    const secondAngle = (seconds * 6) - 90; // 6 grader per sekund
    const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90; // 6 grader per minut + sekund-justering
    const hourAngle = ((hours % 12) * 30) + (minutes * 0.5) - 90; // 30 grader per timme + minut-justering
    
    return {
        hour: hourAngle,
        minute: minuteAngle,
        second: secondAngle
    };
}

/**
 * Skapa analog klocka med visare
 * @param {string} containerId - ID för analog klocka container
 * @returns {boolean} True om skapandet lyckades
 */
export function createAnalogClock(containerId = 'analog-clock-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Analog clock container '${containerId}' not found`);
        return false;
    }
    
    container.innerHTML = '';
    container.className = 'analog-clock';
    
    // Skapa klock-yta
    const clockFace = document.createElement('div');
    clockFace.className = 'clock-face';
    
    // Skapa visare
    const hourHand = document.createElement('div');
    hourHand.className = 'clock-hand hour-hand';
    
    const minuteHand = document.createElement('div');
    minuteHand.className = 'clock-hand minute-hand';
    
    const secondHand = document.createElement('div');
    secondHand.className = 'clock-hand second-hand';
    
    // Skapa centrum-punkt
    const center = document.createElement('div');
    center.className = 'clock-center';
    
    // Sätt ihop klockan
    clockFace.appendChild(hourHand);
    clockFace.appendChild(minuteHand);
    clockFace.appendChild(secondHand);
    clockFace.appendChild(center);
    container.appendChild(clockFace);
    
    // Uppdatera visare
    updateAnalogClock(container);
    
    console.log('🕐 Analog klocka skapad');
    return true;
}

/**
 * Uppdatera analog klocka
 * @param {HTMLElement} container - Analog klocka container
 */
export function updateAnalogClock(container) {
    const time = getCurrentTime();
    const angles = calculateClockAngles(time.hours, time.minutes, time.seconds);
    
    const hourHand = container.querySelector('.hour-hand');
    const minuteHand = container.querySelector('.minute-hand');
    const secondHand = container.querySelector('.second-hand');
    
    if (hourHand) {
        hourHand.style.transform = `rotate(${angles.hour}deg)`;
    }
    
    if (minuteHand) {
        minuteHand.style.transform = `rotate(${angles.minute}deg)`;
    }
    
    if (secondHand) {
        secondHand.style.transform = `rotate(${angles.second}deg)`;
    }
}

// === CLOCK THEMES ===

/**
 * Applicera klock-tema
 * @param {string} theme - Tema-namn
 */
export function applyClockTheme(theme = 'default') {
    const container = document.querySelector('.clock-dots-container') || document.querySelector('.analog-clock');
    if (!container) return;
    
    // Ta bort befintliga tema-klasser
    container.classList.remove('theme-default', 'theme-neon', 'theme-retro', 'theme-minimal');
    
    // Lägg till nytt tema
    container.classList.add(`theme-${theme}`);
    
    console.log(`🎨 Klock-tema '${theme}' applicerat`);
}

// === CLOCK EVENTS ===

/**
 * Lägg till event-lyssnare för klock-interaktioner
 * @param {Function} onHourClick - Callback för timklick
 * @param {Function} onMinuteClick - Callback för minutklick
 */
export function addClockEventListeners(onHourClick, onMinuteClick) {
    const clockTime = document.querySelector('.clock-time');
    const clockDate = document.querySelector('.clock-date');
    
    if (clockTime && onHourClick) {
        clockTime.addEventListener('click', onHourClick);
        clockTime.style.cursor = 'pointer';
    }
    
    if (clockDate && onMinuteClick) {
        clockDate.addEventListener('click', onMinuteClick);
        clockDate.style.cursor = 'pointer';
    }
    
    console.log('👆 Klock event-lyssnare tillagda');
}

// === CLOCK CLEANUP ===

/**
 * Rensa klock-resurser
 */
export function cleanupClock() {
    // Event-lyssnare rensas automatiskt när DOM-element tas bort
    console.log('🧹 Klock-resurser rensade');
}

console.log('📦 Clock Manager Module laddat');