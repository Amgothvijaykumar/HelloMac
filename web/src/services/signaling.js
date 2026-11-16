/**
 * RemoteLink Signaling Service (WebSocket Client)
 */
class SignalingService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.pingInterval = null;
    this.latency = 0;
    this.isConnected = false;
  }

  connect(url) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    const host = window.location.hostname || 'localhost';
    const serverUrl = url || `ws://${host}:8080`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            if (type === 'pong') {
              this.latency = Math.max(1, Date.now() - payload.clientTimestamp);
              this.emit('latency', this.latency);
              return;
            }

            this.emit(type, payload);
          } catch (err) {
            console.error('[Signaling] Parse error:', err);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected');
        };

        this.ws.onerror = (err) => {
          console.error('[Signaling] Socket error:', err);
          this.emit('error', err);
          reject(err);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[Signaling] Socket not open. Cannot send:', type);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send('ping', { timestamp: Date.now() });
    }, 3000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in signaling handler for ${event}:`, e);
        }
      }
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const signaling = new SignalingService();

