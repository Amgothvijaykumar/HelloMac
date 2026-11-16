#!/usr/bin/env bash

# Resolve project directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Detect LAN IP
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
PORT=3000

# Stop any previous instances
lsof -ti :${PORT} | xargs kill -9 2>/dev/null || true
pkill -f "remotelink-host" 2>/dev/null || true
sleep 0.5

# Launch server completely detached from terminal session
nohup node server/src/server.js > /tmp/remotelink-server.log 2>&1 &
SERVER_PID=$!

sleep 1

# Launch native macOS host completely detached from terminal session
nohup macos-host/.build/debug/remotelink-host > /tmp/remotelink-host.log 2>&1 &
HOST_PID=$!

# Disown processes so closing terminal window never kills them
disown -a 2>/dev/null || true

echo ""
echo "============================================================="
echo "  🚀 RemoteLink is now running as an independent DAEMON!"
echo "============================================================="
echo "📱 Open on your phone, tablet, or another device:"
echo "   👉 http://${LAN_IP}:${PORT}"
echo "   (or on this Mac: http://localhost:${PORT})"
echo "-------------------------------------------------------------"
echo "💡 You can safely CLOSE this Terminal window now."
echo "   It runs completely in the background without any Dock icon."
echo "-------------------------------------------------------------"
echo "🛑 To stop it at any time, run: ./stop.sh"
echo "🔍 To check status, run:         ./status.sh"
echo "============================================================="
echo ""
