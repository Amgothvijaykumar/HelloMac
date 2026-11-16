#!/usr/bin/env bash

PORT=3000

echo "🛑 Stopping RemoteLink daemon..."
lsof -ti :${PORT} | xargs kill -9 2>/dev/null || true
pkill -f "remotelink-host" 2>/dev/null || true

echo "✅ RemoteLink has been completely stopped."
