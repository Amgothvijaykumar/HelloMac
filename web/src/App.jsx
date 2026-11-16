import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import HostView from './components/HostView';
import ControllerView from './components/ControllerView';
import ApprovalModal from './components/ApprovalModal';
import { signaling } from './services/signaling';
import { WebRTCManager } from './services/webrtc';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'controller' | 'host'
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [latency, setLatency] = useState(0);

  // Host state
  const [hostInfo, setHostInfo] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [remoteInputsOnHost, setRemoteInputsOnHost] = useState([]);

  // Controller state
  const [onlineHosts, setOnlineHosts] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [screenFrame, setScreenFrame] = useState(null);
  const [metrics, setMetrics] = useState({ fps: 30, bitrateKbps: 0, packetsLost: 0, rttMs: 0 });
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);

  // Active Session
  const [activeSession, setActiveSession] = useState(null); // { id, isHost, hostId, controllerName, ... }

  const webrtcRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Connect to signaling server on mount
  useEffect(() => {
    signaling.connect()
      .then(() => setIsSignalingConnected(true))
      .catch((err) => console.error('Signaling connection error:', err));

    const unsubConn = signaling.on('connected', () => setIsSignalingConnected(true));
    const unsubDisconn = signaling.on('disconnected', () => setIsSignalingConnected(false));
    const unsubLat = signaling.on('latency', (l) => setLatency(l));

    // Listen for hosts broadcast
    const unsubHosts = signaling.on('hosts_list', ({ hosts }) => {
      setOnlineHosts(hosts);
    });

    // Check query params for quick connect code (e.g. from QR code scan)
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
      setTimeout(() => {
        handleConnectByCode(codeParam);
      }, 500);
    }

    // Host registration response
    const unsubHostReg = signaling.on('host_registered', (info) => {
      setHostInfo(info);
    });

    // Incoming connection request for Host
    const unsubReq = signaling.on('incoming_connection_request', (req) => {
      setPendingRequest(req);
    });

    // Host session start
    const unsubHostStart = signaling.on('session_started', async (data) => {
      const sessionObj = {
        id: data.sessionId,
        isHost: true,
        controllerId: data.controllerId,
        controllerName: data.controllerName,
        controllerType: data.controllerType,
        startedAt: data.startedAt
      };
      setActiveSession(sessionObj);

      // Initialize WebRTC for Host
      if (webrtcRef.current) {
        webrtcRef.current.close();
      }

      const rtc = new WebRTCManager({
        isHost: true,
        sessionId: data.sessionId,
        onRemoteInput: (input) => {
          setRemoteInputsOnHost((prev) => [...prev.slice(-20), input]);
        }
      });
      rtc.setIceServers(data.iceServers);
      const curStream = localStreamRef.current || localStream;
      if (curStream) {
        rtc.addTracksFromStream(curStream);
      }
      rtc.initPeerConnection();
      webrtcRef.current = rtc;
    });

    // Controller connection response
    const unsubCtrlResp = signaling.on('connection_response', async ({ approved, sessionId, hostId, reason, iceServers }) => {
      setIsConnecting(false);
      if (approved && sessionId) {
        setConnectionError(null);
        setActiveSession({
          id: sessionId,
          isHost: false,
          hostId
        });
        setActiveTab('controller');

        // Initialize WebRTC for Controller
        if (webrtcRef.current) {
          webrtcRef.current.close();
        }

        const rtc = new WebRTCManager({
          isHost: false,
          sessionId,
          onRemoteStream: (stream) => {
            setRemoteStream(stream);
          },
          onStatsUpdate: (stats) => {
            setMetrics(stats);
          }
        });
        rtc.setIceServers(iceServers);
        webrtcRef.current = rtc;

        // Controller creates and sends WebRTC Offer
        try {
          await rtc.createOffer();
          setIsDataChannelOpen(true);
        } catch (e) {
          console.error('Failed to create offer:', e);
        }
      } else {
        setConnectionError(reason || 'Connection rejected or failed');
      }
    });

    // Remote inputs forwarded via WebSocket relay
    const unsubInput = signaling.on('remote_input', ({ input }) => {
      setRemoteInputsOnHost((prev) => [...prev.slice(-20), input]);
    });

    // Screen frames received from native host or fallback
    const unsubFrame = signaling.on('screen_frame', ({ frame }) => {
      setScreenFrame(frame);
    });

    // Session terminated
    const unsubTerm = signaling.on('session_terminated', ({ reason }) => {
      if (webrtcRef.current) {
        webrtcRef.current.close();
        webrtcRef.current = null;
      }
      setActiveSession(null);
      setRemoteStream(null);
      alert(`Session Ended: ${reason || 'Disconnected'}`);
      setActiveTab('dashboard');
    });

    return () => {
      unsubConn();
      unsubDisconn();
      unsubLat();
      unsubHosts();
      unsubHostReg();
      unsubReq();
      unsubHostStart();
      unsubCtrlResp();
      unsubInput();
      unsubFrame();
      unsubTerm();
    };
  }, [localStream]);

  // Register as host when entering Host tab
  useEffect(() => {
    if (activeTab === 'host' && !hostInfo && isSignalingConnected) {
      const storedDevId = localStorage.getItem('remotelink_device_id') || `web_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('remotelink_device_id', storedDevId);

      signaling.send('register_host', {
        deviceId: storedDevId,
        deviceName: navigator.userAgent.includes('Mac') ? 'MacBook (Web)' : 'Browser Desktop',
        os: navigator.userAgent.includes('Mac') ? 'macos' : 'browser',
        resolution: {
          width: window.screen.width,
          height: window.screen.height
        }
      });
    }
  }, [activeTab, hostInfo, isSignalingConnected]);

  // Start screen capture on Host
  const handleStartSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          frameRate: { ideal: 60, max: 60 }
        },
        audio: false
      });

      setLocalStream(stream);
      localStreamRef.current = stream;

      // If session is already open, add tracks
      if (webrtcRef.current) {
        webrtcRef.current.addTracksFromStream(stream);
      }

      stream.getVideoTracks()[0].onended = () => {
        handleStopSharing();
      };
    } catch (err) {
      console.error('Failed to start screen capture:', err);
      alert('Could not start screen capture: ' + err.message);
    }
  };

  const handleStopSharing = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }
  };

  // Host approval handler
  const handleApproveRequest = async (requestId) => {
    let stream = localStreamRef.current || localStream;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            frameRate: { ideal: 60, max: 60 }
          },
          audio: false
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (webrtcRef.current) {
          webrtcRef.current.addTracksFromStream(stream);
        }
      } catch (err) {
        console.error('Failed to get display media on approval:', err);
        signaling.send('respond_connection', {
          requestId,
          approved: false,
          reason: 'Host cancelled screen selection.'
        });
        setPendingRequest(null);
        return;
      }
    }

    signaling.send('respond_connection', {
      requestId,
      approved: true
    });
    setPendingRequest(null);
  };

  // Host reject handler
  const handleRejectRequest = (requestId, reason) => {
    signaling.send('respond_connection', {
      requestId,
      approved: false,
      reason
    });
    setPendingRequest(null);
  };

  // Controller connects by 6-digit code
  const handleConnectByCode = (code) => {
    setIsConnecting(true);
    setConnectionError(null);
    signaling.send('request_connection', {
      code,
      controllerId: `ctrl_${Math.random().toString(36).substring(2, 8)}`,
      controllerName: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Chrome Controller',
      controllerType: navigator.userAgent.includes('Mobile') ? 'mobile' : 'web'
    });
  };

  // Controller connects to listed host
  const handleConnectToHost = (host) => {
    setIsConnecting(true);
    setConnectionError(null);
    signaling.send('request_connection', {
      hostId: host.id,
      controllerId: `ctrl_${Math.random().toString(36).substring(2, 8)}`,
      controllerName: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Chrome Controller',
      controllerType: navigator.userAgent.includes('Mobile') ? 'mobile' : 'web'
    });
  };

  // Controller sends input to host
  const handleSendInput = (inputEvent) => {
    if (webrtcRef.current) {
      webrtcRef.current.sendInput(inputEvent);
    }
  };

  // Disconnect active session
  const handleDisconnect = () => {
    if (activeSession) {
      signaling.send('disconnect_session', {
        sessionId: activeSession.id,
        reason: 'User disconnected'
      });
      if (webrtcRef.current) {
        webrtcRef.current.close();
        webrtcRef.current = null;
      }
      setActiveSession(null);
      setRemoteStream(null);
      setActiveTab('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isSignalingConnected}
        latency={latency}
        activeSession={activeSession}
      />

      {/* Main Viewport */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            onlineHosts={onlineHosts}
            onConnectByCode={handleConnectByCode}
            onConnectToHost={handleConnectToHost}
            onSwitchToHostMode={() => setActiveTab('host')}
            isConnecting={isConnecting}
            connectionError={connectionError}
          />
        )}

        {activeTab === 'host' && (
          <HostView
            hostInfo={hostInfo}
            activeSession={activeSession}
            localStream={localStream}
            remoteInputEvents={remoteInputsOnHost}
            onStartSharing={handleStartSharing}
            onStopSharing={handleStopSharing}
            onDisconnect={handleDisconnect}
          />
        )}

        {activeTab === 'controller' && (
          <ControllerView
            session={activeSession}
            remoteStream={remoteStream}
            screenFrame={screenFrame}
            metrics={metrics}
            isDataChannelOpen={isDataChannelOpen}
            onSendInput={handleSendInput}
            onDisconnect={handleDisconnect}
          />
        )}
      </main>

      {/* Host Incoming Connection Approval Modal */}
      {pendingRequest && (
        <ApprovalModal
          request={pendingRequest}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
        />
      )}
    </div>
  );
}

