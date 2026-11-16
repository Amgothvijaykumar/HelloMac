import React, { useState } from 'react';
import { ArrowRight, Laptop, Monitor, Smartphone, Globe, Shield, RefreshCw, KeyRound, Radio } from 'lucide-react';

export default function Dashboard({
  onlineHosts,
  onConnectByCode,
  onConnectToHost,
  onSwitchToHostMode,
  isConnecting,
  connectionError
}) {
  const [inputCode, setInputCode] = useState('');

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    onConnectByCode(inputCode.trim());
  };

  const getPlatformIcon = (os) => {
    if (os === 'macos') return <Laptop className="h-5 w-5 text-indigo-400" />;
    if (os === 'windows') return <Monitor className="h-5 w-5 text-blue-400" />;
    if (os === 'mobile') return <Smartphone className="h-5 w-5 text-emerald-400" />;
    return <Globe className="h-5 w-5 text-slate-400" />;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero / Quick Connect Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Radio className="h-3.5 w-3.5" />
            <span>Universal Cross-Platform Access</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Connect to any computer <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
              directly from your browser
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            Control a MacBook, Windows PC, or virtual desktop in real-time with zero client installation required.
          </p>

          {/* Connect by Code Form */}
          <form onSubmit={handleCodeSubmit} className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="Enter 6-digit connection code (e.g. 123-456)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                maxLength={8}
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isConnecting || !inputCode.trim()}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/30 whitespace-nowrap text-sm sm:text-base"
            >
              {isConnecting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Requesting Access...</span>
                </>
              ) : (
                <>
                  <span>Connect</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {connectionError && (
            <p className="mt-2 text-xs text-rose-400 font-medium">{connectionError}</p>
          )}
        </div>
      </div>

      {/* Main Grid: Discovered Hosts & Share Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Discovered / Online Hosts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Online Host Devices</h2>
              <p className="text-xs text-slate-400">Computers ready for remote desktop connection</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {onlineHosts.length} online
            </span>
          </div>

          {onlineHosts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-3">
              <div className="h-10 w-10 rounded-xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                <Laptop className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-300">No host devices online right now</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Open <strong>Host Mode</strong> in another tab or start the <strong>macOS Native Host</strong> app to register a device.
              </p>
              <button
                onClick={onSwitchToHostMode}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl text-xs font-semibold transition-colors"
              >
                <span>Share this computer screen</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {onlineHosts.map((host) => (
                <div
                  key={host.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                        {getPlatformIcon(host.os)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{host.deviceName}</h3>
                        <p className="text-xs text-slate-400 capitalize">{host.os} • {host.resolution ? `${host.resolution.width}x${host.resolution.height}` : '1080p'}</p>
                      </div>
                    </div>
                    <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{host.isBusy ? 'In Session' : 'Ready'}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                    <div className="font-mono text-slate-400">
                      Code: <strong className="text-slate-200">{host.connectionCode}</strong>
                    </div>

                    <button
                      onClick={() => onConnectToHost(host)}
                      disabled={isConnecting || host.isBusy}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-sm"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share Screen / Act as Host Card */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <Radio className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Share Your Screen</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Want to let someone control this computer? Switch to Host Mode to get a connection code and approve incoming requests.
            </p>

            <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Explicit approval required for every session</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Encrypted peer-to-peer WebRTC connection</span>
              </div>
            </div>
          </div>

          <button
            onClick={onSwitchToHostMode}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-2 border border-slate-700"
          >
            <span>Open Host Mode</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

