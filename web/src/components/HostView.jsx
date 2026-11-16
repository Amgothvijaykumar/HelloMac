import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, QrCode, Monitor, PhoneOff, ShieldCheck, Play, ScreenShare } from 'lucide-react';
import QRCode from 'qrcode';

export default function HostView({
  hostInfo,
  activeSession,
  localStream,
  remoteInputEvents,
  onStartSharing,
  onStopSharing,
  onDisconnect
}) {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [sessionTimer, setSessionTimer] = useState('00:00');
  const previewVideoRef = useRef(null);
  const [virtualPointer, setVirtualPointer] = useState({ x: 50, y: 50, visible: false, clicking: false });

  // Generate QR Code with pairing URL
  useEffect(() => {
    if (hostInfo && hostInfo.connectionCode) {
      const controllerUrl = `${window.location.origin}?code=${hostInfo.connectionCode}`;
      QRCode.toDataURL(controllerUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#ffffff', light: '#090d16' }
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [hostInfo]);

  // Connect local video stream to preview
  useEffect(() => {
    if (previewVideoRef.current && localStream) {
      previewVideoRef.current.srcObject = localStream;
      previewVideoRef.current.play().catch(console.error);
    }
  }, [localStream]);

  // Session duration timer
  useEffect(() => {
    if (!activeSession) return;
    const start = activeSession.startedAt || Date.now();
    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - start) / 1000);
      const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');
      setSessionTimer(`${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Track latest remote input for visual indicator
  useEffect(() => {
    if (!remoteInputEvents || remoteInputEvents.length === 0) return;
    const latest = remoteInputEvents[remoteInputEvents.length - 1];

    if (latest.type === 'mouse_move') {
      setVirtualPointer({
        x: latest.x * 100,
        y: latest.y * 100,
        visible: true,
        clicking: false
      });
    } else if (latest.type === 'mouse_down' || latest.type === 'mouse_click') {
      setVirtualPointer((prev) => ({ ...prev, clicking: true }));
      setTimeout(() => setVirtualPointer((prev) => ({ ...prev, clicking: false })), 200);
    }
  }, [remoteInputEvents]);

  const copyCode = () => {
    if (!hostInfo?.connectionCode) return;
    navigator.clipboard.writeText(hostInfo.connectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Active Session Alert Banner (PRD Section 3.6: Host must always be informed) */}
      {activeSession ? (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Active Remote Session</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {sessionTimer}
                </span>
              </p>
              <p className="text-xs text-slate-300">
                Controlled by: <strong className="text-white">{activeSession.controllerName || 'Remote Client'}</strong> ({activeSession.controllerType || 'Web'})
              </p>
            </div>
          </div>

          <button
            onClick={onDisconnect}
            className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/30 transition-all"
          >
            <PhoneOff className="h-4 w-4" />
            <span>End Session Now</span>
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Host Credentials & Pairing Info */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Host Registration</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">This Device (Host)</h2>
            <p className="text-xs text-slate-400 mt-1">
              Share the code below with your controller device or scan the QR code.
            </p>

            {/* 6-Digit Connection Code Display */}
            <div className="mt-6 bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">One-Time Passcode</span>
              <div className="flex items-center justify-center space-x-3 mt-1">
                <span className="font-mono text-3xl font-extrabold tracking-wider text-blue-400">
                  {hostInfo?.connectionCode || '--- ---'}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Copy Code"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className="mt-6 flex flex-col items-center">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  <img src={qrCodeDataUrl} alt="RemoteLink Pairing QR" className="w-36 h-36 rounded-lg" />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Scan with camera on mobile/tablet</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Device ID:</span>
              <span className="font-mono text-slate-300">{hostInfo?.deviceId || 'Loading...'}</span>
            </div>
            <div className="flex justify-between">
              <span>Host Platform:</span>
              <span className="text-slate-300 capitalize">{hostInfo?.os || 'macOS'}</span>
            </div>
          </div>
        </div>

        {/* Screen Streaming Control & Preview */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Monitor className="h-5 w-5 text-indigo-400" />
                  <span>Screen Streaming Feed</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ScreenCaptureKit / Web Media Stream broadcast feed
                </p>
              </div>

              {localStream ? (
                <button
                  onClick={onStopSharing}
                  className="px-3 py-1.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold hover:bg-rose-600 hover:text-white transition-all"
                >
                  Stop Sharing
                </button>
              ) : (
                <button
                  onClick={onStartSharing}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
                >
                  <ScreenShare className="h-4 w-4" />
                  <span>Select Screen to Share</span>
                </button>
              )}
            </div>

            {/* Screen Preview Container */}
            <div className="relative aspect-video w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
              {localStream ? (
                <>
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  {/* Virtual cursor indicator showing remote controller position */}
                  {virtualPointer.visible && (
                    <div
                      className={`absolute pointer-events-none transition-all duration-75 ease-out -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
                        virtualPointer.clicking ? 'scale-125' : 'scale-100'
                      }`}
                      style={{
                        left: `${virtualPointer.x}%`,
                        top: `${virtualPointer.y}%`
                      }}
                    >
                      <div className="h-4 w-4 rounded-full bg-blue-500/80 border-2 border-white shadow-lg animate-pulse" />
                      <span className="absolute left-5 top-0 text-[10px] bg-blue-600 text-white px-1 rounded shadow whitespace-nowrap">
                        Remote Control
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                    <Monitor className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">No Screen Active</p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Click <strong>"Select Screen to Share"</strong> above, or run the native macOS Host app to stream your desktop.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Adaptive Resolution: 1080p / 60 FPS target</span>
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Ready for incoming connections</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
