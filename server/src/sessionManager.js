import crypto from 'node:crypto';

/**
 * Manages connected hosts, active pairing codes, and ongoing remote desktop sessions.
 */
export class SessionManager {
  constructor() {
    // hostId -> Host object
    this.hosts = new Map();
    // connectionCode (e.g. "482-193") -> hostId
    this.codes = new Map();
    // sessionId -> Session object
    this.sessions = new Map();
    // pendingRequests: requestId -> request object
    this.pendingRequests = new Map();
  }

  generateCode() {
    let code;
    do {
      const num = crypto.randomInt(100000, 999999);
      code = `${num.toString().slice(0, 3)}-${num.toString().slice(3)}`;
    } while (this.codes.has(code));
    return code;
  }

  registerHost({ socket, deviceId, deviceName, os = 'macos', resolution = { width: 1920, height: 1080 } }) {
    // If device was previously registered, clean up old entry
    for (const [id, host] of this.hosts.entries()) {
      if (host.deviceId === deviceId) {
        this.unregisterHost(id);
      }
    }

    const hostId = `host_${crypto.randomBytes(6).toString('hex')}`;
    const connectionCode = this.generateCode();

    const host = {
      id: hostId,
      socket,
      deviceId: deviceId || `dev_${crypto.randomBytes(4).toString('hex')}`,
      deviceName: deviceName || 'RemoteLink Host',
      os,
      resolution,
      connectionCode,
      status: 'online',
      activeSessionId: null,
      registeredAt: Date.now(),
      lastSeen: Date.now()
    };

    this.hosts.set(hostId, host);
    this.codes.set(connectionCode, hostId);

    return host;
  }

  unregisterHost(hostId) {
    const host = this.hosts.get(hostId);
    if (!host) return null;

    if (host.connectionCode) {
      this.codes.delete(host.connectionCode);
    }

    if (host.activeSessionId) {
      this.endSession(host.activeSessionId, 'Host disconnected');
    }

    // Cancel any pending requests for this host
    for (const [reqId, req] of this.pendingRequests.entries()) {
      if (req.hostId === hostId) {
        this.pendingRequests.delete(reqId);
      }
    }

    this.hosts.delete(hostId);
    return host;
  }

  getHostByCode(code) {
    const cleanCode = code.replace(/\s+/g, '').replace(/(\d{3})(\d{3})/, '$1-$2');
    const hostId = this.codes.get(cleanCode) || this.codes.get(code);
    if (!hostId) return null;
    return this.hosts.get(hostId) || null;
  }

  getHost(hostId) {
    return this.hosts.get(hostId) || null;
  }

  listOnlineHosts() {
    return Array.from(this.hosts.values()).map(h => ({
      id: h.id,
      deviceId: h.deviceId,
      deviceName: h.deviceName,
      os: h.os,
      resolution: h.resolution,
      connectionCode: h.connectionCode,
      status: h.status,
      isBusy: Boolean(h.activeSessionId),
      registeredAt: h.registeredAt
    }));
  }

  createConnectionRequest({ hostId, controllerId, controllerName, controllerType, controllerSocket }) {
    const host = this.hosts.get(hostId);
    if (!host) {
      throw new Error('Host not found or offline');
    }

    const requestId = `req_${crypto.randomBytes(6).toString('hex')}`;
    const request = {
      id: requestId,
      hostId,
      controllerId,
      controllerName: controllerName || 'Web Controller',
      controllerType: controllerType || 'web',
      controllerSocket,
      createdAt: Date.now(),
      timeout: setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          try {
            controllerSocket.send(JSON.stringify({
              type: 'connection_response',
              payload: { approved: false, reason: 'Request timed out waiting for host approval.' }
            }));
          } catch (_) {}
        }
      }, 45000) // 45 seconds timeout
    };

    this.pendingRequests.set(requestId, request);
    return request;
  }

  resolveConnectionRequest(requestId, approved, reason = '') {
    const request = this.pendingRequests.get(requestId);
    if (!request) return null;

    clearTimeout(request.timeout);
    this.pendingRequests.delete(requestId);

    const host = this.hosts.get(request.hostId);
    if (!approved || !host) {
      return {
        request,
        session: null,
        approved: false,
        reason: reason || 'Host rejected connection request.'
      };
    }

    const sessionId = `sess_${crypto.randomBytes(8).toString('hex')}`;
    const session = {
      id: sessionId,
      hostId: host.id,
      controllerId: request.controllerId,
      controllerName: request.controllerName,
      controllerType: request.controllerType,
      hostSocket: host.socket,
      controllerSocket: request.controllerSocket,
      startedAt: Date.now(),
      metrics: {
        fps: 30,
        latencyMs: 0,
        packetsLost: 0
      }
    };

    this.sessions.set(sessionId, session);
    host.activeSessionId = sessionId;

    return { request, session, approved: true };
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  endSession(sessionId, reason = 'Session ended') {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const host = this.hosts.get(session.hostId);
    if (host && host.activeSessionId === sessionId) {
      host.activeSessionId = null;
    }

    this.sessions.delete(sessionId);
    return { session, reason };
  }
}

