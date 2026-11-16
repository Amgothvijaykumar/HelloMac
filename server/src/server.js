import http from 'node:http';
import { WebSocketServer } from 'ws';
import { SessionManager } from './sessionManager.js';

const PORT = process.env.PORT || 8080;
const sessionManager = new SessionManager();

// Public STUN / ICE servers configured for WebRTC traversal
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health' || url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'RemoteLink Signaling Server',
      version: '1.1.0',
      activeHosts: sessionManager.hosts.size,
      activeSessions: sessionManager.sessions.size,
      time: new Date().toISOString()
    }));
    return;
  }

  if (url.pathname === '/api/hosts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ hosts: sessionManager.listOnlineHosts() }));
    return;
  }

  if (url.pathname.startsWith('/api/verify-code/')) {
    const code = decodeURIComponent(url.pathname.replace('/api/verify-code/', ''));
    const host = sessionManager.getHostByCode(code);
    if (host) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        valid: true,
        host: {
          id: host.id,
          deviceId: host.deviceId,
          deviceName: host.deviceName,
          os: host.os,
          resolution: host.resolution,
          isBusy: Boolean(host.activeSessionId)
        }
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false, message: 'Host not found or offline' }));
    }
    return;
  }

  if (url.pathname === '/api/ice-servers') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ iceServers: ICE_SERVERS }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Setup WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  let clientRole = null; // 'host' | 'controller'
  let hostId = null;
  let clientId = null;
  let activeSessionId = null;

  const send = (type, payload) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  };

  ws.on('message', (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());
      const { type, payload = {} } = data;

      switch (type) {
        // --- HOST REGISTRATION ---
        case 'register_host': {
          clientRole = 'host';
          const host = sessionManager.registerHost({
            socket: ws,
            deviceId: payload.deviceId,
            deviceName: payload.deviceName,
            os: payload.os || 'macos',
            resolution: payload.resolution
          });
          hostId = host.id;
          clientId = host.id;

          send('host_registered', {
            hostId: host.id,
            deviceId: host.deviceId,
            deviceName: host.deviceName,
            connectionCode: host.connectionCode,
            iceServers: ICE_SERVERS
          });

          // Broadcast updated hosts to everyone listening
          broadcastHostsList();
          break;
        }

        // --- CODE VERIFICATION & HOST QUERY ---
        case 'verify_code': {
          const host = sessionManager.getHostByCode(payload.code);
          if (host) {
            send('code_status', {
              valid: true,
              host: {
                id: host.id,
                deviceId: host.deviceId,
                deviceName: host.deviceName,
                os: host.os,
                resolution: host.resolution,
                isBusy: Boolean(host.activeSessionId)
              }
            });
          } else {
            send('code_status', { valid: false, reason: 'Invalid or offline connection code' });
          }
          break;
        }

        case 'list_hosts': {
          send('hosts_list', { hosts: sessionManager.listOnlineHosts() });
          break;
        }

        // --- CONNECTION REQUEST & APPROVAL FLOW ---
        case 'request_connection': {
          clientRole = 'controller';
          clientId = payload.controllerId || `ctrl_${Date.now()}`;

          let targetHost = null;
          if (payload.code) {
            targetHost = sessionManager.getHostByCode(payload.code);
          } else if (payload.hostId) {
            targetHost = sessionManager.getHost(payload.hostId);
          }

          if (!targetHost) {
            send('connection_response', {
              approved: false,
              reason: 'Host device is offline or connection code is invalid.'
            });
            return;
          }

          if (targetHost.activeSessionId) {
            send('connection_response', {
              approved: false,
              reason: 'Host is currently engaged in another remote session.'
            });
            return;
          }

          try {
            const request = sessionManager.createConnectionRequest({
              hostId: targetHost.id,
              controllerId: clientId,
              controllerName: payload.controllerName || 'Web Controller',
              controllerType: payload.controllerType || 'web',
              controllerSocket: ws
            });

            // Forward approval dialog prompt to the host
            if (targetHost.socket.readyState === ws.OPEN) {
              targetHost.socket.send(JSON.stringify({
                type: 'incoming_connection_request',
                payload: {
                  requestId: request.id,
                  controllerId: request.controllerId,
                  controllerName: request.controllerName,
                  controllerType: request.controllerType,
                  requestedAt: request.createdAt
                }
              }));
            }
          } catch (err) {
            send('connection_response', { approved: false, reason: err.message });
          }
          break;
        }

        case 'respond_connection': {
          const { requestId, approved, reason } = payload;
          const result = sessionManager.resolveConnectionRequest(requestId, approved, reason);

          if (!result) return;

          const { request, session } = result;

          if (approved && session) {
            activeSessionId = session.id;

            // Notify controller of approval
            if (request.controllerSocket.readyState === ws.OPEN) {
              request.controllerSocket.send(JSON.stringify({
                type: 'connection_response',
                payload: {
                  approved: true,
                  sessionId: session.id,
                  hostId: session.hostId,
                  iceServers: ICE_SERVERS
                }
              }));
            }

            // Notify host of session establishment
            send('session_started', {
              sessionId: session.id,
              controllerId: session.controllerId,
              controllerName: session.controllerName,
              controllerType: session.controllerType,
              startedAt: session.startedAt,
              iceServers: ICE_SERVERS
            });

            broadcastHostsList();
          } else {
            // Reject notification
            if (request.controllerSocket.readyState === ws.OPEN) {
              request.controllerSocket.send(JSON.stringify({
                type: 'connection_response',
                payload: {
                  approved: false,
                  reason: result.reason || 'Connection rejected by host user.'
                }
              }));
            }
          }
          break;
        }

        // --- WEBRTC SIGNALING (OFFER / ANSWER / ICE CANDIDATE) ---
        case 'webrtc_signal': {
          const { targetId, sessionId, signal } = payload;
          const session = sessionId ? sessionManager.getSession(sessionId) : null;

          if (session) {
            // Route to peer
            const isFromHost = (hostId && hostId === session.hostId);
            const peerSocket = isFromHost ? session.controllerSocket : session.hostSocket;

            if (peerSocket && peerSocket.readyState === ws.OPEN) {
              peerSocket.send(JSON.stringify({
                type: 'webrtc_signal',
                payload: {
                  fromId: isFromHost ? session.hostId : session.controllerId,
                  sessionId: session.id,
                  signal
                }
              }));
            }
          } else if (targetId) {
            const host = sessionManager.getHost(targetId);
            if (host && host.socket.readyState === ws.OPEN) {
              host.socket.send(JSON.stringify({
                type: 'webrtc_signal',
                payload: { fromId: clientId, signal }
              }));
            }
          }
          break;
        }

        // --- REMOTE INPUT RELAY (FALLBACK / PARALLEL CHANNEL) ---
        case 'remote_input': {
          const { sessionId, input } = payload;
          const session = sessionManager.getSession(sessionId);
          if (session && session.hostSocket && session.hostSocket.readyState === ws.OPEN) {
            session.hostSocket.send(JSON.stringify({
              type: 'remote_input',
              payload: {
                sessionId,
                controllerId: session.controllerId,
                input
              }
            }));
          }
          break;
        }

        // --- TERMINATE / DISCONNECT SESSION ---
        case 'disconnect_session': {
          const sId = payload.sessionId || activeSessionId;
          if (sId) {
            const result = sessionManager.endSession(sId, payload.reason || 'User ended session');
            if (result) {
              const { session } = result;
              const termMsg = JSON.stringify({
                type: 'session_terminated',
                payload: { sessionId: sId, reason: result.reason }
              });

              if (session.hostSocket.readyState === ws.OPEN) {
                session.hostSocket.send(termMsg);
              }
              if (session.controllerSocket.readyState === ws.OPEN) {
                session.controllerSocket.send(termMsg);
              }
              broadcastHostsList();
            }
          }
          break;
        }

        // --- PING / METRICS ---
        case 'ping': {
          send('pong', {
            clientTimestamp: payload.timestamp,
            serverTimestamp: Date.now()
          });
          break;
        }

        default:
          console.warn(`[Signaling] Unrecognized message type: ${type}`);
      }
    } catch (err) {
      console.error('[Signaling] Message error:', err);
    }
  });

  ws.on('close', () => {
    if (clientRole === 'host' && hostId) {
      sessionManager.unregisterHost(hostId);
      broadcastHostsList();
    } else if (activeSessionId) {
      const result = sessionManager.endSession(activeSessionId, 'Controller disconnected');
      if (result && result.session.hostSocket.readyState === ws.OPEN) {
        result.session.hostSocket.send(JSON.stringify({
          type: 'session_terminated',
          payload: { sessionId: activeSessionId, reason: 'Controller disconnected' }
        }));
      }
      broadcastHostsList();
    }
  });
});

function broadcastHostsList() {
  const hosts = sessionManager.listOnlineHosts();
  const message = JSON.stringify({
    type: 'hosts_list',
    payload: { hosts }
  });

  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

server.listen(PORT, () => {
  console.log(`[RemoteLink] Signaling server running on http://localhost:${PORT}`);
  console.log(`[RemoteLink] WebSocket endpoint ready on ws://localhost:${PORT}`);
});
