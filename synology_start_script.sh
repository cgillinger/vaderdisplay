#!/bin/sh
# =============================================================================
# FLASK WEATHER DASHBOARD - SYNOLOGY STARTSCRIPT EXEMPEL
# =============================================================================
# 📁 Fil: start_weather_example.sh
# 🎯 Syfte: Starta väder-dashboarden automatiskt på Synology NAS
# 📝 Setup: Kopiera till start_weather.sh och anpassa för ditt system
#
# INSTRUKTIONER:
# 1. Kopiera denna fil: cp start_weather_example.sh start_weather.sh  
# 2. Redigera variablerna nedan för ditt system
# 3. Gör körbar: chmod +x start_weather.sh
# 4. Testa: ./start_weather.sh
# 5. Lägg till i DSM Task Scheduler
# =============================================================================

# === ANPASSA DESSA VARIABLER FÖR DITT SYSTEM ===

# Ditt användarnamn på Synology (ändra från "ditt-användarnamn")
USERNAME="ditt-användarnamn"

# Projektets katalog (vanligtvis korrekt som den är)
PROJECT_DIR="/var/services/homes/${USERNAME}/vaderdisplay"

# Python-sökväg (vanligtvis korrekt som den är)
PYTHON_PATH="/bin/python3"

# Port för dashboard (8036 är standard, ändra om du vill)
PORT="8036"

# Loggfil (sparas i projektkatalogen)
LOG_FILE="${PROJECT_DIR}/weather.log"
PID_FILE="${PROJECT_DIR}/weather.pid"

# === ÄNDRA INGET UNDER DENNA LINJE ===

echo "🟢 Startar Flask Weather Dashboard..."
echo "👤 Användare: ${USERNAME}"
echo "📁 Projekt: ${PROJECT_DIR}"
echo "🚪 Port: ${PORT}"
echo "📝 Logg: ${LOG_FILE}"
echo "🕐 Tid: $(date)"

# Kontrollera att projektkatalogen existerar
if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ FEL: Projektkatalog finns inte: ${PROJECT_DIR}"
    echo "💡 Kontrollera att USERNAME är korrekt och att vaderdisplay är nedladdat"
    exit 1
fi

# Gå till projektkatalogen
cd "${PROJECT_DIR}" || {
    echo "❌ FEL: Kan inte navigera till ${PROJECT_DIR}"
    exit 1
}

# Kontrollera att app.py finns
if [ ! -f "app.py" ]; then
    echo "❌ FEL: app.py finns inte i ${PROJECT_DIR}"
    echo "💡 Kontrollera att vaderdisplay är korrekt nedladdat"
    exit 1
fi

# Logga systeminformation
echo "=== FLASK WEATHER DASHBOARD START ===" >> "${LOG_FILE}"
echo "Tid: $(date)" >> "${LOG_FILE}"
echo "Katalog: $(pwd)" >> "${LOG_FILE}"
echo "Python: $(${PYTHON_PATH} --version 2>&1)" >> "${LOG_FILE}"
echo "Användare: $(whoami)" >> "${LOG_FILE}"

# Kontrollera om dashboard redan körs
if [ -f "${PID_FILE}" ]; then
    OLD_PID=$(cat "${PID_FILE}")
    if kill -0 "${OLD_PID}" 2>/dev/null; then
        echo "⚠️ Dashboard körs redan (PID: ${OLD_PID})"
        echo "🛑 Stoppar befintlig process..."
        kill "${OLD_PID}"
        sleep 2
    fi
    rm -f "${PID_FILE}"
fi

# Starta Flask i bakgrunden
echo "🚀 Startar Flask-server..."
nohup "${PYTHON_PATH}" app.py >> "${LOG_FILE}" 2>&1 &
FLASK_PID=$!

# Spara PID för framtida stopp
echo "${FLASK_PID}" > "${PID_FILE}"

# Vänta lite och kontrollera att processen startade
sleep 3
if kill -0 "${FLASK_PID}" 2>/dev/null; then
    echo "✅ Dashboard startad framgångsrikt!"
    echo "📊 URL: http://$(hostname):${PORT}"
    echo "🔢 Process ID: ${FLASK_PID}"
    echo "📝 Loggar: ${LOG_FILE}"
    echo "🛑 Stoppa med: kill ${FLASK_PID}"
else
    echo "❌ FEL: Dashboard kunde inte startas"
    echo "📝 Kontrollera loggar: ${LOG_FILE}"
    rm -f "${PID_FILE}"
    exit 1
fi

# Logga framgångsrik start
echo "✅ Dashboard startad framgångsrikt (PID: ${FLASK_PID})" >> "${LOG_FILE}"
echo "=========================================" >> "${LOG_FILE}"

echo ""
echo "🎉 Flask Weather Dashboard är nu igång!"
echo "📱 Öppna i webbläsare: http://$(hostname):${PORT}"