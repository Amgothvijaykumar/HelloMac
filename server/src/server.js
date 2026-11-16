import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;

// Embedded Full-Screen Zero-UI Remote Desktop Web Controller
const CLIENT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>RemoteLink Desktop</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      object-fit: contain;
      cursor: crosshair;
    }
    #status {
      position: absolute;
      top: 12px;
      left: 12px;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.7);
      color: #10b981;
      font-size: 11px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      pointer-events: none;
      transition: opacity 0.5s;
      z-index: 100;
    }
    #kbd-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      top: -100px;
    }
    #mobile-kbd-btn {
      position: absolute;
      bottom: 16px;
      right: 16px;
      width: 44px;
      height: 44px;
      border-radius: 22px;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div id="status">Connecting to Mac...</div>
  <canvas id="screen"></canvas>
  <input type="text" id="kbd-input" autocomplete="off" autocapitalize="off" spellcheck="false" />
  <button id="mobile-kbd-btn" title="Open Keyboard">⌨️</button>

  <script>
    const canvas = document.getElementById('screen');
    const ctx = canvas.getContext('2d');
    const status = document.getElementById('status');
    const kbdInput = document.getElementById('kbd-input');
    const kbdBtn = document.getElementById('mobile-kbd-btn');

    let ws = null;
    let isConnected = false;
    let lastImg = new Image();

    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + location.host);

      ws.onopen = () => {
        isConnected = true;
        status.textContent = '🟢 Connected Live';
        status.style.color = '#10b981';
        setTimeout(() => { status.style.opacity = '0'; }, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'frame' && data.data) {
            lastImg.onload = () => {
              if (canvas.width !== lastImg.width || canvas.height !== lastImg.height) {
                canvas.width = lastImg.width;
                canvas.height = lastImg.height;
              }
              ctx.drawImage(lastImg, 0, 0);
            };
            lastImg.src = 'data:image/jpeg;base64,' + data.data;
          }
        } catch(e) {}
      };

      ws.onclose = () => {
        isConnected = false;
        status.style.opacity = '1';
        status.textContent = '🔴 Reconnecting...';
        status.style.color = '#ef4444';
        setTimeout(connect, 1500);
      };
    }

    connect();

    // Map canvas coordinates normalized (0.0 to 1.0)
    function getNormalizedCoords(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const videoAspect = (canvas.width || 1920) / (canvas.height || 1080);
      const containerAspect = rect.width / rect.height;

      let renderWidth = rect.width;
      let renderHeight = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (containerAspect > videoAspect) {
        renderWidth = rect.height * videoAspect;
        offsetX = (rect.width - renderWidth) / 2;
      } else {
        renderHeight = rect.width / videoAspect;
        offsetY = (rect.height - renderHeight) / 2;
      }

      const relX = clientX - (rect.left + offsetX);
      const relY = clientY - (rect.top + offsetY);

      return {
        x: Math.max(0, Math.min(1, relX / renderWidth)),
        y: Math.max(0, Math.min(1, relY / renderHeight))
      };
    }

    function send(type, data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'remote_input', input: { type, ...data } }));
      }
    }

    // Mouse events
    canvas.addEventListener('mousemove', (e) => {
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      send('mouse_move', coords);
    });

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      send('mouse_down', { button: e.button, ...coords });
    });

    canvas.addEventListener('mouseup', (e) => {
      e.preventDefault();
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      send('mouse_up', { button: e.button, ...coords });
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      send('mouse_click', { button: 2, ...coords });
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const coords = getNormalizedCoords(e.clientX, e.clientY);
      send('wheel', { deltaX: e.deltaX, deltaY: e.deltaY, ...coords });
    }, { passive: false });

    // Touch events for Mobile/Tablet
    let lastTouch = { x: 0, y: 0 };
    let isTouching = false;

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        lastTouch = { x: t.clientX, y: t.clientY };
        isTouching = true;
        const coords = getNormalizedCoords(t.clientX, t.clientY);
        send('mouse_move', coords);
        send('mouse_down', { button: 0, ...coords });
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isTouching) {
        const t = e.touches[0];
        const coords = getNormalizedCoords(t.clientX, t.clientY);
        send('mouse_move', coords);
      } else if (e.touches.length === 2) {
        const dy = (e.touches[0].clientY - lastTouch.y) * 2;
        send('wheel', { deltaX: 0, deltaY: dy });
        lastTouch.y = e.touches[0].clientY;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (isTouching) {
        isTouching = false;
        send('mouse_up', { button: 0 });
      }
    });

    // Keyboard events
    window.addEventListener('keydown', (e) => {
      if (e.target === kbdInput) return;
      send('key_down', {
        key: e.key,
        keyCode: e.keyCode,
        code: e.code,
        modifiers: { meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }
      });
    });

    window.addEventListener('keyup', (e) => {
      if (e.target === kbdInput) return;
      send('key_up', {
        key: e.key,
        keyCode: e.keyCode,
        code: e.code,
        modifiers: { meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }
      });
    });

    // Mobile virtual keyboard button
    kbdBtn.addEventListener('click', () => {
      kbdInput.focus();
    });

    kbdInput.addEventListener('input', (e) => {
      const val = kbdInput.value;
      if (val.length > 0) {
        const char = val[val.length - 1];
        send('key_down', { key: char, keyCode: char.charCodeAt(0), code: 'Key' + char.toUpperCase() });
        send('key_up', { key: char, keyCode: char.charCodeAt(0), code: 'Key' + char.toUpperCase() });
        kbdInput.value = '';
      }
    });
  </script>
</body>
</html>`;

let hostSocket = null;
const controllerSockets = new Set();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(CLIENT_HTML);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let isHost = false;

  ws.on('message', (msgBuffer) => {
    try {
      const data = JSON.parse(msgBuffer.toString());

      if (data.type === 'register_host') {
        isHost = true;
        hostSocket = ws;
        console.log('🟢 [RemoteLink] Mac Host connected and ready!');
        return;
      }

      if (data.type === 'screen_frame') {
        // Broadcast frame to all connected controllers
        const framePayload = JSON.stringify({ type: 'frame', data: data.payload?.frame });
        for (const ctrl of controllerSockets) {
          if (ctrl.readyState === ws.OPEN) {
            ctrl.send(framePayload);
          }
        }
        return;
      }

      if (data.type === 'remote_input') {
        // Forward input directly to Mac host for injection
        if (hostSocket && hostSocket.readyState === ws.OPEN) {
          hostSocket.send(JSON.stringify({
            type: 'remote_input',
            input: data.input
          }));
        }
      }
    } catch (e) {
      console.error('Message error:', e);
    }
  });

  // Default new incoming socket is treated as a controller
  controllerSockets.add(ws);
  console.log(`📱 [RemoteLink] Client connected (${controllerSockets.size} active)`);

  ws.on('close', () => {
    if (isHost && hostSocket === ws) {
      hostSocket = null;
      console.log('🔴 [RemoteLink] Mac Host disconnected');
    } else {
      controllerSockets.delete(ws);
      console.log(`📱 [RemoteLink] Client disconnected (${controllerSockets.size} active)`);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 RemoteLink Server Running!`);
  console.log(`👉 Open in ANY browser: http://0.0.0.0:${PORT}`);
  console.log(`======================================================\n`);
});
