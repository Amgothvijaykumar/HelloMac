import React, { useEffect, useState } from 'react';
import { ShieldAlert, Check, X, Laptop, Smartphone, Globe } from 'lucide-react';

export default function ApprovalModal({ request, onApprove, onReject }) {
  const [secondsLeft, setSecondsLeft] = useState(45);

  useEffect(() => {
    if (!request) return;
    setSecondsLeft(45);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReject(request.requestId, 'Request timed out waiting for approval');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request]);

  if (!request) return null;

  const getDeviceIcon = (type) => {
    if (type === 'mobile') return <Smartphone className="h-6 w-6 text-blue-400" />;
    if (type === 'desktop') return <Laptop className="h-6 w-6 text-indigo-400" />;
    return <Globe className="h-6 w-6 text-emerald-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

        <div className="flex items-start space-x-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Incoming Connection Request</h3>
            <p className="text-sm text-slate-400 mt-1">
              A remote device is requesting permission to view and control your desktop.
            </p>
          </div>
        </div>

        {/* Device Information Card */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-800/80">
              {getDeviceIcon(request.controllerType)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Controller Device</p>
              <p className="text-sm font-semibold text-slate-100">{request.controllerName || 'Web Client'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500">Device ID:</span>
              <p className="font-mono text-slate-300 truncate">{request.controllerId}</p>
            </div>
            <div>
              <span className="text-slate-500">Platform:</span>
              <p className="capitalize text-slate-300">{request.controllerType || 'Web Browser'}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Security verification required</span>
          <span className="font-mono font-medium text-amber-400">Auto-reject in {secondsLeft}s</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => onReject(request.requestId, 'Declined by host')}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
          >
            <X className="h-4 w-4" />
            <span>Reject</span>
          </button>
          <button
            onClick={() => onApprove(request.requestId)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-600/25"
          >
            <Check className="h-4 w-4" />
            <span>Approve & Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
