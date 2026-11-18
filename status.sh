#!/usr/bin/env bash

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
PORT=3000

if pgrep -f "remotelink-host" > /dev/null 2>&1; then
  echo "🟢 RemoteLink Host is ACTIVE and running in background!"
  if lsof -i :${PORT} > /dev/null 2>&1; then
    echo "🏠 Local Server: http://${LAN_IP}:${PORT} (or http://localhost:${PORT})"
  fi
  if [ -f "/tmp/remotelink-host.log" ]; then
    echo "📋 Latest status log:"
    tail -n 5 /tmp/remotelink-host.log
  fi
else
  echo "🔴 RemoteLink is NOT running."
  echo "👉 Start local:       ./start.sh"
  echo "👉 Start cloud relay: ./start.sh https://hellomac.onrender.com"
fi

