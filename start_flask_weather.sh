#!/bin/sh
echo "🟢 Startar Flask Weather Dashboard (port 8036)..."
exec >> /var/services/homes/Christian/flask_weather/task.log 2>&1
echo "🔍 Körs via DSM Scheduled Task $(date)"

export PYTHONPATH=/var/services/homes/Christian/.local/lib/python3.8/site-packages
cd /var/services/homes/Christian/flask_weather

# Logga python-sökväg och version för felsökning
which /bin/python3 >> /var/services/homes/Christian/flask_weather/flask.log 2>&1
/bin/python3 --version >> /var/services/homes/Christian/flask_weather/flask.log 2>&1

# Starta Flask i bakgrunden med nohup
nohup /bin/python3 app.py --port=8036 >> /var/services/homes/Christian/flask_weather/flask.log 2>&1 &

echo "✅ Flask start kommando skickat (nohup)." >> /var/services/homes/Christian/flask_weather/flask.log
