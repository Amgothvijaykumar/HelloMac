#!/usr/bin/env bash

# Resolve project directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Detect LAN IP
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
PORT=3000

TARGET_URL="${1:-$REMOTELINK_SIGNALING_URL}"
IS_CLOUD=false

if [ -n "$TARGET_URL" ]; then
  # Convert http/https to ws/wss if web URL was provided
  WS_URL=$(echo "$TARGET_URL" | sed 's/^https:/wss:/' | sed 's/^http:/ws:/')
  if [[ ! "$WS_URL" =~ ^wss?:// ]]; then
    WS_URL="wss://${WS_URL}"
  fi
  export REMOTELINK_SIGNALING_URL="$WS_URL"
  IS_CLOUD=true
  WEB_URL=$(echo "$TARGET_URL" | sed 's/^wss:/https:/' | sed 's/^ws:/http:/')
  if [[ ! "$WEB_URL" =~ ^https?:// ]]; then
    WEB_URL="https://${WEB_URL}"
  fi
fi

# Stop any previous instances
lsof -ti :${PORT} | xargs kill -9 2>/dev/null || true
pkill -f "remotelink-host" 2>/dev/null || true
sleep 0.5

# 1. Auto-install server dependencies if running local server
if [ "$IS_CLOUD" = false ] && [ ! -d "server/node_modules" ]; then
  echo "📦 First-time setup: Installing server dependencies..."
  (cd server && npm install --silent)
fi

# 2. Auto-compile native macOS host on fresh clone
if [ ! -f "macos-host/.build/debug/remotelink-host" ]; then
  echo "🔨 First-time setup: Compiling native macOS host (one-time)..."
  (cd macos-host && swift build)
fi

if [ "$IS_CLOUD" = false ]; then
  # Launch local server completely detached from terminal session
  nohup node server/src/server.js > /tmp/remotelink-server.log 2>&1 &
  SERVER_PID=$!
  sleep 1
fi

# Launch native macOS host completely detached from terminal session
nohup macos-host/.build/debug/remotelink-host > /tmp/remotelink-host.log 2>&1 &
HOST_PID=$!

# Disown processes so closing terminal window never kills them
disown -a 2>/dev/null || true

echo ""
echo "============================================================="
if [ "$IS_CLOUD" = true ]; then
  echo "  🚀 RemoteLink is now CONNECTED to Cloud Relay!"
  echo "============================================================="
  echo "🌍 Open from ANY device ANYWHERE in the world:"
  echo "   👉 ${WEB_URL}"
else
  echo "  🚀 RemoteLink is now running on your LOCAL network!"
  echo "============================================================="
  echo "📱 Open on your phone, tablet, or another device:"
  echo "   👉 http://${LAN_IP}:${PORT}"
  echo "   (or on this Mac: http://localhost:${PORT})"
fi
echo "-------------------------------------------------------------"
echo "💡 You can safely CLOSE this Terminal window now."
echo "   It runs completely in the background without any Dock icon."
echo "-------------------------------------------------------------"
echo "🛑 To stop it at any time, run: ./stop.sh"
echo "🔍 To check status, run:         ./status.sh"
echo "============================================================="
echo ""
