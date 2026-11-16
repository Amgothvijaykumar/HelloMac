import React, { useState, useRef } from 'react';
import { MousePointer, Keyboard, Move, CornerDownLeft, Delete, ZoomIn } from 'lucide-react';

export default function MobileControls({ onSendInput, onSpecialKey }) {
  const [activeMode, setActiveMode] = useState('trackpad'); // 'trackpad' | 'keyboard'
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const trackpadRef = useRef(null);
  const lastTouchPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      lastTouchPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const dx = (e.touches[0].clientX - lastTouchPos.current.x) * 1.5;
      const dy = (e.touches[0].clientY - lastTouchPos.current.y) * 1.5;

      lastTouchPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };

      onSendInput({
        type: 'mouse_delta',
        dx,
        dy
      });
    } else if (e.touches.length === 2) {
      // Two-finger scroll
      const dy = e.touches[0].clientY - lastTouchPos.current.y;
      onSendInput({
        type: 'wheel',
        deltaY: dy * 2,
        deltaX: 0
      });
    }
  };

  const handleLeftClick = () => {
    onSendInput({ type: 'mouse_click', button: 0 });
  };

  const handleRightClick = () => {
    onSendInput({ type: 'mouse_click', button: 2 });
  };

  const handleDoubleClick = () => {
    onSendInput({ type: 'mouse_double_click', button: 0 });
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto sm:hidden select-none">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 flex flex-col space-y-3">
        {/* Mode Selector & Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveMode('trackpad')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 ${
                activeMode === 'trackpad' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              <MousePointer className="h-3.5 w-3.5" />
              <span>Trackpad</span>
            </button>
            <button
              onClick={() => setShowKeyboardInput(!showKeyboardInput)}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 ${
                showKeyboardInput ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>Keys</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLeftClick}
              className="px-3 py-1.5 bg-slate-800 active:bg-blue-600 text-slate-100 rounded-lg text-xs font-semibold shadow"
            >
              Left Click
            </button>
            <button
              onClick={handleRightClick}
              className="px-3 py-1.5 bg-slate-800 active:bg-blue-600 text-slate-100 rounded-lg text-xs font-semibold shadow"
            >
              Right Click
            </button>
          </div>
        </div>

        {/* Virtual Trackpad Surface */}
        {activeMode === 'trackpad' && (
          <div
            ref={trackpadRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="h-28 bg-slate-950/80 border border-dashed border-slate-700 rounded-xl flex items-center justify-center text-xs text-slate-500 font-medium cursor-crosshair touch-none"
          >
            <Move className="h-4 w-4 mr-1 text-slate-600" />
            <span>Slide to move cursor • Tap to click • 2 fingers to scroll</span>
          </div>
        )}

        {/* Virtual Keyboard Input row */}
        {showKeyboardInput && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <input
              type="text"
              placeholder="Type here to send keystrokes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSpecialKey('Enter');
                  e.target.value = '';
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length > 0) {
                  const lastChar = val[val.length - 1];
                  onSendInput({
                    type: 'key_down',
                    key: lastChar,
                    code: `Key${lastChar.toUpperCase()}`
                  });
                  e.target.value = '';
                }
              }}
            />

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-mono">
              <button
                onClick={() => onSpecialKey('Tab')}
                className="px-2 py-1 bg-slate-800 rounded text-slate-300 active:bg-blue-600"
              >
                Tab
              </button>
              <button
                onClick={() => onSpecialKey('Escape')}
                className="px-2 py-1 bg-slate-800 rounded text-slate-300 active:bg-blue-600"
              >
                Esc
              </button>
              <button
                onClick={() => onSpecialKey('Backspace')}
                className="px-2 py-1 bg-slate-800 rounded text-slate-300 active:bg-blue-600"
              >
                Bksp
              </button>
              <button
                onClick={() => onSpecialKey('Enter')}
                className="px-2 py-1 bg-slate-800 rounded text-slate-300 active:bg-blue-600"
              >
                Enter
              </button>
              <button
                onClick={() => onSpecialKey('Space')}
                className="px-3 py-1 bg-slate-800 rounded text-slate-300 active:bg-blue-600"
              >
                Space
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
