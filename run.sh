#!/usr/bin/env bash
set -e

# Detect LAN IP
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
PORT=3000

# Cleanup child processes on exit
cleanup() {
  echo ""
  echo "🛑 Stopping RemoteLink..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo ""
echo "============================================================="
echo "  🚀 RemoteLink Live — Direct Terminal Screen Share & Control"
echo "============================================================="
echo "📱 Open on your phone, tablet, or other PC:"
echo "   👉 http://${LAN_IP}:${PORT}"
echo "   (or on this Mac: http://localhost:${PORT})"
echo "-------------------------------------------------------------"
echo "✨ Zero UI, Zero Buttons: Fullscreen screen control is LIVE!"
echo "Press Ctrl+C to stop."
echo "============================================================="
echo ""

# 1. Start Server on port 3000
PORT=$PORT node server/src/server.js &
SERVER_PID=$!

sleep 1

# 2. Start macOS Host
macos-host/.build/debug/remotelink-host &
HOST_PID=$!

wait

