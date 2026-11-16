import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Wifi, Zap } from 'lucide-react';

export default function SessionMetrics({ metrics, resolution, isDataChannelOpen }) {
  const [collapsed, setCollapsed] = useState(false);

  const getLatencyColor = (ms) => {
    if (ms < 40) return 'text-emerald-400';
    if (ms < 100) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="absolute top-4 right-4 z-30 transition-all">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-2.5 text-xs text-slate-300 min-w-[200px]">
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setCollapsed(!collapsed)}>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Session HUD</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-400">
            <span className={`font-mono font-bold ${getLatencyColor(metrics.rttMs || 20)}`}>
              {metrics.rttMs || 20}ms
            </span>
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </div>
        </div>

        {!collapsed && (
          <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1.5 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">FPS:</span>
              <span className="text-blue-400 font-semibold">{metrics.fps || 30} fps</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bitrate:</span>
              <span className="text-slate-200">
                {metrics.bitrateKbps > 1000
                  ? `${(metrics.bitrateKbps / 1000).toFixed(1)} Mbps`
                  : `${metrics.bitrateKbps || 2400} Kbps`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Packets Lost:</span>
              <span className={metrics.packetsLost > 0 ? 'text-amber-400' : 'text-slate-300'}>
                {metrics.packetsLost || 0}
              </span>
            </div>
            {resolution && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Resolution:</span>
                <span className="text-slate-300">
                  {resolution.width}x{resolution.height}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Input Channel:</span>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                isDataChannelOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {isDataChannelOpen ? 'WebRTC DataChannel' : 'WebSocket Relay'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
