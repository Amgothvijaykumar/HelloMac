import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;

// Ultra-Low Latency Binary Direct Remote Desktop
const CLIENT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>RemoteLink</title>
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
      cursor: crosshair;
    }
    #screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <canvas id="screen"></canvas>
  <script>
    const canvas = document.getElementById('screen');
    const ctx = canvas.getContext('2d', { alpha: false });
    let ws = null;
    let isDecoding = false;

    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + location.host);
      ws.binaryType = 'arraybuffer';

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          if (isDecoding) return;
          isDecoding = true;

          const blob = new Blob([event.data], { type: 'image/jpeg' });

          if (window.createImageBitmap) {
            createImageBitmap(blob)
              .then(bitmap => {
                if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
                  canvas.width = bitmap.width;
                  canvas.height = bitmap.height;
                }
                ctx.drawImage(bitmap, 0, 0);
                bitmap.close();
                isDecoding = false;
              })
              .catch(() => { isDecoding = false; });
          } else {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
              }
              ctx.drawImage(img, 0, 0);
              URL.revokeObjectURL(url);
              isDecoding = false;
            };
            img.onerror = () => { isDecoding = false; };
            img.src = url;
          }
        }
      };

      ws.onclose = () => {
        setTimeout(connect, 1000);
      };
    }

    connect();

    function getNormalizedCoords(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const videoAspect = (canvas.width || 1280) / (canvas.height || 832);
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

    // Mouse handlers
    canvas.addEventListener('mousemove', (e) => {
      send('mouse_move', getNormalizedCoords(e.clientX, e.clientY));
    });

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      send('mouse_down', { button: e.button, ...getNormalizedCoords(e.clientX, e.clientY) });
    });

    canvas.addEventListener('mouseup', (e) => {
      e.preventDefault();
      send('mouse_up', { button: e.button, ...getNormalizedCoords(e.clientX, e.clientY) });
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      send('mouse_click', { button: 2, ...getNormalizedCoords(e.clientX, e.clientY) });
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      send('wheel', { deltaX: e.deltaX, deltaY: e.deltaY, ...getNormalizedCoords(e.clientX, e.clientY) });
    }, { passive: false });

    // Touch handlers (Mobile / Tablet)
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
        send('mouse_move', getNormalizedCoords(t.clientX, t.clientY));
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

    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
      send('key_down', {
        key: e.key,
        keyCode: e.keyCode,
        code: e.code,
        modifiers: { meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }
      });
    });

    window.addEventListener('keyup', (e) => {
      send('key_up', {
        key: e.key,
        keyCode: e.keyCode,
        code: e.code,
        modifiers: { meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }
      });
    });
  </script>
</body>
</html>`;

let hostSocket = null;
const controllerSockets = new Set();
let framesForwarded = 0;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(CLIENT_HTML);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let isHost = false;

  ws.on('message', (msgBuffer, isBinary) => {
    // 1. Binary Screen Frame from Mac Host
    if (isBinary || (msgBuffer instanceof Buffer && msgBuffer.length > 500)) {
      framesForwarded++;
      if (framesForwarded % 120 === 0) {
        console.log(`📡 [Server] Broadcasted ${framesForwarded} frames to ${controllerSockets.size} active viewers`);
      }
      for (const ctrl of controllerSockets) {
        if (ctrl !== hostSocket && ctrl.readyState === ws.OPEN && ctrl.bufferedAmount < 65536) {
          ctrl.send(msgBuffer, { binary: true });
        }
      }
      return;
    }

    // 2. Control Messages
    try {
      const data = JSON.parse(msgBuffer.toString());

      if (data.type === 'register_host') {
        isHost = true;
        hostSocket = ws;
        controllerSockets.delete(ws);
        console.log('🟢 [RemoteLink] Mac Host registered and streaming live!');
        return;
      }

      if (data.type === 'remote_input') {
        if (hostSocket && hostSocket.readyState === ws.OPEN) {
          hostSocket.send(JSON.stringify({
            type: 'remote_input',
            input: data.input
          }));
        }
      }
    } catch (_) {}
  });

  // Track as controller unless identified as host
  controllerSockets.add(ws);
  console.log(`📱 [RemoteLink] Client connected (${controllerSockets.size} active viewers)`);

  ws.on('close', () => {
    if (isHost && hostSocket === ws) {
      hostSocket = null;
      console.log('🔴 [RemoteLink] Mac Host disconnected');
    } else {
      controllerSockets.delete(ws);
      console.log(`📱 [RemoteLink] Client disconnected (${controllerSockets.size} active viewers)`);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Ultra-Low Latency RemoteLink Server Running`);
  console.log(`👉 http://0.0.0.0:${PORT}`);
  console.log(`======================================================\n`);
});
