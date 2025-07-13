/**
 * FontAwesome Renderer - STEG 5 REFAKTORERING
 * Font Awesome ikonhantering extraherat från weather-icon-renderer.js
 * Hanterar luftkvalitets-ikoner och färgkodning
 */

// === FONT AWESOME SYSTEM - SEPARERAD FÄRGKODNING ===

/**
 * FontAwesome Renderer för luftkvalitet och andra ikoner
 */
class FontAwesomeRenderer {
    /**
     * Skapa luftkvalitets-ikon med färgkodning
     * @param {string} airQualityLevel - 'good', 'moderate', 'poor'
     * @returns {HTMLElement} Font Awesome leaf-ikon
     */
    static createLeafIcon(airQualityLevel = 'good') {
        const icon = document.createElement('i');
        icon.className = `fas fa-leaf air-quality-fa-icon`;
        icon.setAttribute('data-air-quality', airQualityLevel);
        
        // SEPARERAD FÄRGKODNING: Bara ikonen får färg
        const colors = {
            'good': '#34a853',
            'moderate': '#fbbc04', 
            'poor': '#ea4335'
        };
        
        icon.style.color = colors[airQualityLevel] || colors['good'];
        icon.style.fontSize = 'clamp(21px, 2.1rem, 28px)';
        icon.style.display = 'inline-block';
        icon.style.marginRight = '7px';
        
        return icon;
    }
    
    /**
     * Skapa generisk Font Awesome ikon
     * @param {string} iconClass - Font Awesome klass (t.ex. 'fas fa-volume-up')
     * @param {object} styles - CSS-stilar att applicera
     * @returns {HTMLElement} Font Awesome ikon
     */
    static createIcon(iconClass, styles = {}) {
        const icon = document.createElement('i');
        icon.className = iconClass;
        
        // Applicera stilar
        Object.keys(styles).forEach(property => {
            icon.style[property] = styles[property];
        });
        
        return icon;
    }
    
    /**
     * Skapa ljudnivå-ikon
     * @param {string} level - Ljudnivå ('low', 'medium', 'high')
     * @returns {HTMLElement} Font Awesome volym-ikon
     */
    static createVolumeIcon(level = 'medium') {
        const iconClasses = {
            'low': 'fas fa-volume-down',
            'medium': 'fas fa-volume-up', 
            'high': 'fas fa-volume-up'
        };
        
        const colors = {
            'low': '#4CAF50',
            'medium': '#9575cd',
            'high': '#FF5722'
        };
        
        const icon = this.createIcon(iconClasses[level] || iconClasses['medium'], {
            color: colors[level] || colors['medium'],
            fontSize: 'clamp(21px, 2.1rem, 28px)',
            display: 'inline-block',
            marginRight: '7px'
        });
        
        icon.setAttribute('data-volume-level', level);
        return icon;
    }
}

// Exportera för backward compatibility (behåll gamla namn)
const FontAwesomeManager = FontAwesomeRenderer;

console.log('✅ STEG 5: FontAwesome Renderer laddat - Luftkvalitets-ikoner och färgkodning extraherade!');