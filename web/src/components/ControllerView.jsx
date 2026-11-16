import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, PhoneOff, Settings, Sliders, Smartphone, Volume2, VolumeX, Shield, Command } from 'lucide-react';
import { getNormalizedCoordinates, mapKeyboardEvent } from '../services/inputCapture';
import SessionMetrics from './SessionMetrics';
import MobileControls from './MobileControls';

export default function ControllerView({
  session,
  remoteStream,
  screenFrame,
  metrics,
  isDataChannelOpen,
  onSendInput,
  onDisconnect
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [qualityPreset, setQualityPreset] = useState('high'); // 'high' | 'balanced' | 'fast'
  const [activeModifiers, setActiveModifiers] = useState({ ctrl: false, alt: false, meta: false, shift: false });
  const [remoteResolution, setRemoteResolution] = useState(null);

  // Attach WebRTC MediaStream to <video>
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(e => console.log('Autoplay handled:', e));
    }
  }, [remoteStream]);

  // Render direct frame stream onto canvas (for native macOS host or fallback)
  useEffect(() => {
    if (screenFrame && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
          setRemoteResolution({ width: img.width, height: img.height });
        }
        ctx.drawImage(img, 0, 0);
      };
      img.src = `data:image/jpeg;base64,${screenFrame}`;
    }
  }, [screenFrame]);

  // Helper to get active rendered surface (video or canvas)
  const getActiveElement = () => videoRef.current || canvasRef.current;

  // Read video resolution when stream loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setRemoteResolution({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Mouse event handlers
  const handleMouseMove = (e) => {
    const coords = getNormalizedCoordinates(e, getActiveElement());
    if (!coords) return;
    onSendInput({
      type: 'mouse_move',
      x: coords.x,
      y: coords.y
    });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const coords = getNormalizedCoordinates(e, getActiveElement());
    if (!coords) return;
    onSendInput({
      type: 'mouse_down',
      button: e.button, // 0: left, 1: middle, 2: right
      x: coords.x,
      y: coords.y
    });
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    const coords = getNormalizedCoordinates(e, getActiveElement());
    if (!coords) return;
    onSendInput({
      type: 'mouse_up',
      button: e.button,
      x: coords.x,
      y: coords.y
    });
  };

  const handleContextMenu = (e) => {
    e.preventDefault(); // Don't trigger browser context menu
    const coords = getNormalizedCoordinates(e, getActiveElement());
    if (!coords) return;
    onSendInput({
      type: 'mouse_click',
      button: 2,
      x: coords.x,
      y: coords.y
    });
  };

  const handleDoubleClick = (e) => {
    const coords = getNormalizedCoordinates(e, getActiveElement());
    if (!coords) return;
    onSendInput({
      type: 'mouse_double_click',
      button: e.button,
      x: coords.x,
      y: coords.y
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const coords = getNormalizedCoordinates(e, getActiveElement());
    onSendInput({
      type: 'wheel',
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      x: coords?.x || 0.5,
      y: coords?.y || 0.5
    });
  };

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in a form input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // Prevent default for common shortcuts like Ctrl+W, Ctrl+R, etc. within remote session
      if (e.ctrlKey || e.metaKey || ['Tab', 'Alt'].includes(e.key)) {
        e.preventDefault();
      }

      const input = mapKeyboardEvent(e, 'key_down');
      onSendInput(input);
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const input = mapKeyboardEvent(e, 'key_up');
      onSendInput(input);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onSendInput]);

  // Special key / shortcut helper
  const sendSpecialKey = (keyName) => {
    onSendInput({
      type: 'special_key',
      key: keyName,
      modifiers: activeModifiers
    });
  };

  const toggleModifier = (mod) => {
    setActiveModifiers(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-4rem)] bg-black flex flex-col justify-between overflow-hidden select-none outline-none"
      tabIndex={0}
    >
      {/* Real-time Session Metrics HUD */}
      <SessionMetrics
        metrics={metrics}
        resolution={remoteResolution}
        isDataChannelOpen={isDataChannelOpen}
      />

      {/* Main Video / Canvas Stream Display Canvas */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative cursor-crosshair">
        {remoteStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            className="w-full h-full object-contain pointer-events-auto"
          />
        ) : screenFrame ? (
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            className="w-full h-full object-contain pointer-events-auto"
          />
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 text-slate-400">
            <div className="h-12 w-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium">Waiting for screen stream from host...</p>
          </div>
        )}
      </div>

      {/* Floating Toolbar & Session Controller Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 px-4 py-2 rounded-2xl shadow-2xl">
        {/* Modifier toggles */}
        <div className="flex items-center space-x-1 border-r border-slate-700 pr-2">
          <button
            onClick={() => toggleModifier('ctrl')}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              activeModifiers.ctrl ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Control key"
          >
            Ctrl
          </button>
          <button
            onClick={() => toggleModifier('alt')}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              activeModifiers.alt ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Alt key"
          >
            Alt
          </button>
          <button
            onClick={() => toggleModifier('meta')}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center space-x-0.5 ${
              activeModifiers.meta ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Cmd / Windows key"
          >
            <Command className="h-3 w-3" />
            <span>Cmd</span>
          </button>
        </div>

        {/* Special keys */}
        <div className="flex items-center space-x-1 border-r border-slate-700 pr-2">
          <button
            onClick={() => sendSpecialKey('Escape')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium"
          >
            Esc
          </button>
          <button
            onClick={() => sendSpecialKey('Tab')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium"
          >
            Tab
          </button>
          <button
            onClick={() => sendSpecialKey('Enter')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium"
          >
            Enter
          </button>
        </div>

        {/* Mobile controls toggle */}
        <button
          onClick={() => setShowMobileControls(!showMobileControls)}
          className={`p-2 rounded-xl text-slate-300 transition-colors ${
            showMobileControls ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
          }`}
          title="Toggle Mobile Touchpad"
        >
          <Smartphone className="h-4 w-4" />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Disconnect button */}
        <button
          onClick={onDisconnect}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          <span>Disconnect</span>
        </button>
      </div>

      {/* Mobile Touchpad / Gestures Overlay */}
      {showMobileControls && (
        <MobileControls
          onSendInput={onSendInput}
          onSpecialKey={sendSpecialKey}
        />
      )}
    </div>
  );
}

