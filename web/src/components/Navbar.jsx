import React from 'react';
import { Monitor, Radio, Shield, Laptop, Smartphone } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isConnected, latency, activeSession }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Monitor className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">RemoteLink</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                v1.1
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Universal Cross-Platform Remote Desktop</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('controller')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === 'controller'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Laptop className="h-4 w-4 hidden sm:inline" />
            <span>Controller</span>
            {activeSession && !activeSession.isHost && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping ml-1" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('host')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === 'host'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Radio className="h-4 w-4 hidden sm:inline" />
            <span>Host Mode</span>
            {activeSession && activeSession.isHost && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping ml-1" />
            )}
          </button>
        </nav>

        {/* Status indicator */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {isConnected ? 'Signaling Online' : 'Connecting...'}
            </span>
            {isConnected && latency > 0 && (
              <span className="text-slate-500 border-l border-slate-800 pl-2 font-mono">
                {latency}ms
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

