#!/usr/bin/env bash

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
PORT=3000

if lsof -i :${PORT} > /dev/null 2>&1; then
  echo "🟢 RemoteLink is ACTIVE and running in background!"
  echo "👉 Connect at: http://${LAN_IP}:${PORT} (or http://localhost:${PORT})"
else
  echo "🔴 RemoteLink is NOT running."
  echo "👉 Start it with: ./start.sh"
fi
