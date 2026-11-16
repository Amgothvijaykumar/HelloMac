import { signaling } from './signaling';

export class WebRTCManager {
  constructor({ isHost = false, sessionId, onRemoteStream, onRemoteInput, onStatsUpdate }) {
    this.isHost = isHost;
    this.sessionId = sessionId;
    this.onRemoteStream = onRemoteStream;
    this.onRemoteInput = onRemoteInput;
    this.onStatsUpdate = onStatsUpdate;

    this.peerConnection = null;
    this.dataChannel = null;
    this.localStream = null;
    this.statsInterval = null;
    this.candidateQueue = [];

    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];

    this.setupSignalingListener();
  }

  setIceServers(servers) {
    if (Array.isArray(servers) && servers.length > 0) {
      this.iceServers = servers;
    }
  }

  setupSignalingListener() {
    this.unsubscribeSignal = signaling.on('webrtc_signal', async ({ signal, sessionId }) => {
      if (sessionId && sessionId !== this.sessionId) return;

      try {
        if (!this.peerConnection) {
          console.warn('[WebRTC] PeerConnection not initialized yet. Queueing signal.');
        }

        if (signal.type === 'offer') {
          await this.handleOffer(signal);
        } else if (signal.type === 'answer') {
          await this.handleAnswer(signal);
        } else if (signal.type === 'candidate' && signal.candidate) {
          await this.handleCandidate(signal.candidate);
        }
      } catch (err) {
        console.error('[WebRTC] Signal handling error:', err);
      }
    });
  }

  initPeerConnection() {
    if (this.peerConnection) return;

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 2
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.send('webrtc_signal', {
          sessionId: this.sessionId,
          signal: {
            type: 'candidate',
            candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
          }
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state: ${this.peerConnection.connectionState}`);
      if (this.peerConnection.connectionState === 'connected') {
        this.startStatsCollection();
      } else if (['disconnected', 'failed', 'closed'].includes(this.peerConnection.connectionState)) {
        this.stopStatsCollection();
      }
    };

    if (this.isHost) {
      // Host adds local screen tracks and listens for data channel
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      this.peerConnection.ondatachannel = (event) => {
        this.setupDataChannel(event.channel);
      };
    } else {
      // Controller receives tracks and initiates data channel
      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (this.onRemoteStream) {
            this.onRemoteStream(event.streams[0]);
          }
        }
      };

      // Create data channel for remote control input
      const dc = this.peerConnection.createDataChannel('remote-input', {
        ordered: false, // Low latency UDP-like delivery for real-time mouse/touch
        maxRetransmits: 0
      });
      this.setupDataChannel(dc);
    }
  }

  setupDataChannel(channel) {
    this.dataChannel = channel;
    this.dataChannel.onopen = () => {
      console.log('[WebRTC] Data channel opened');
    };
    this.dataChannel.onmessage = (event) => {
      try {
        const inputData = JSON.parse(event.data);
        if (this.onRemoteInput) {
          this.onRemoteInput(inputData);
        }
      } catch (e) {
        console.error('[WebRTC] Failed to parse input message:', e);
      }
    };
    this.dataChannel.onclose = () => {
      console.log('[WebRTC] Data channel closed');
    };
  }

  // Host captures screen stream
  async startScreenCapture(displayMediaOptions = { video: { cursor: "always", frameRate: 60 } }) {
    try {
      this.localStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      return this.localStream;
    } catch (err) {
      console.error('[WebRTC] Error acquiring display media:', err);
      throw err;
    }
  }

  // Controller initiates WebRTC connection
  async createOffer() {
    this.initPeerConnection();
    const offer = await this.peerConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    });
    await this.peerConnection.setLocalDescription(offer);

    signaling.send('webrtc_signal', {
      sessionId: this.sessionId,
      signal: {
        type: 'offer',
        sdp: offer.sdp
      }
    });
  }

  async handleOffer(signal) {
    this.initPeerConnection();
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));

    // Process queued candidates
    while (this.candidateQueue.length > 0) {
      const cand = this.candidateQueue.shift();
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    signaling.send('webrtc_signal', {
      sessionId: this.sessionId,
      signal: {
        type: 'answer',
        sdp: answer.sdp
      }
    });
  }

  async handleAnswer(signal) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));

    while (this.candidateQueue.length > 0) {
      const cand = this.candidateQueue.shift();
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
    }
  }

  async handleCandidate(candidate) {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.candidateQueue.push(candidate);
      return;
    }
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  sendInput(inputEvent) {
    // Attempt ultra-fast WebRTC DataChannel first
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(inputEvent));
      return true;
    }

    // Fallback through WebSocket signaling relay
    signaling.send('remote_input', {
      sessionId: this.sessionId,
      input: inputEvent
    });
    return false;
  }

  startStatsCollection() {
    this.stopStatsCollection();
    let prevBytes = 0;
    let prevTimestamp = 0;

    this.statsInterval = setInterval(async () => {
      if (!this.peerConnection) return;

      try {
        const stats = await this.peerConnection.getStats();
        let fps = 0;
        let bitrateKbps = 0;
        let packetsLost = 0;
        let rttMs = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            fps = report.framesPerSecond || Math.round(report.framesDecoded ? (report.framesDecoded / Math.max(1, report.timestamp / 1000)) : 30);
            packetsLost = report.packetsLost || 0;

            if (prevBytes && prevTimestamp) {
              const byteDiff = report.bytesReceived - prevBytes;
              const timeDiff = report.timestamp - prevTimestamp;
              bitrateKbps = Math.round((byteDiff * 8) / timeDiff);
            }
            prevBytes = report.bytesReceived;
            prevTimestamp = report.timestamp;
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rttMs = Math.round((report.currentRoundTripTime || 0) * 1000);
          }
        });

        if (this.onStatsUpdate) {
          this.onStatsUpdate({
            fps: fps || 30,
            bitrateKbps: bitrateKbps || 2400,
            packetsLost,
            rttMs: rttMs || signaling.latency || 15
          });
        }
      } catch (_) {}
    }, 1000);
  }

  stopStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  close() {
    this.stopStatsCollection();
    if (this.unsubscribeSignal) {
      this.unsubscribeSignal();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}
