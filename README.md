# RemoteLink — Universal Cross-Platform Remote Desktop & Control

RemoteLink is a high-performance, cross-platform remote desktop application built according to the [PRD specifications](prd.md). It allows users to view and remotely operate computers from any modern device or web browser without requiring the controller to install desktop software.

---

## 🏗️ System Architecture

```
                    ┌─────────────────────────┐
                    │    REMOTELINK PLATFORM   │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
   ┌───────────────┐                           ┌───────────────┐
   │  HOST DEVICES │                           │  CONTROLLERS  │
   │  - macOS Host │                           │ - Web Browser │
   │  - Web Host   │                           │ - Mobile Web  │
   └───────┬───────┘                           │ - Tablet Web  │
           │                                   └───────┬───────┘
           │         WebSocket Signaling               │
           └────────────────►┌────────────────────────◄┘
                             │  SIGNALING & SESSION   │
                             │  SERVER (Node.js/ws)   │
                             │  - Device Registry     │
                             │  - 6-Digit Passcodes   │
                             │  - Host Approval Gate  │
                             └────────────┬───────────┘
                                          │
                         Peer-to-Peer WebRTC Pipeline
                         ┌────────────────┴───────────┐
                         ▼                            ▼
                 Real-Time Screen               Ultra-Low Latency
                 Media Stream (H.264/VP8)       Remote Input (DataChannel)
                 - 60 FPS target                - Mouse (move/click/drag/scroll)
                 - Adaptive resolution          - Keyboard & modifiers
                 - Cursor capture               - Mobile touch/trackpad
```

---

## 🚀 Key Features

| PRD Section | Feature | Implementation Details |
|---|---|---|
| **3.1 Connectivity** | Device ID & Passcodes | Automatic Device ID generation, 6-digit one-time connection passcodes (`123-456`), and QR code pairing for one-tap mobile connection. |
| **3.2 Screen Sharing** | ScreenCaptureKit & WebRTC | Real-time screen capture via macOS ScreenCaptureKit or browser `getDisplayMedia`, hardware-accelerated video streaming up to 60 FPS. |
| **3.3 Remote Control** | Mouse, Keyboard, Touch | Normalized coordinate mapping `(0.0 - 1.0)`, CoreGraphics system event injection (`CGEvent`), WebRTC DataChannel + WebSocket fallback. |
| **3.4 Browser Access** | Zero Client Installation | Full controller application runs directly in any modern desktop or mobile browser (Chrome, Safari, Firefox, Edge). |
| **3.5 & 7 Security** | Mandatory Host Approval | Host receives an explicit interactive prompt to Approve or Reject any incoming connection before video or control is shared. |
| **3.6 Session Control** | Active Session Visibility | Persistent banner on the host displaying the connected client name, session timer, and an immediate 1-click **Disconnect** button. |
| **8.3 Mobile Viewing** | Responsive & Touch-Ready | Virtual trackpad, tap-to-click, two-finger scroll, on-screen keyboard helper, and pinch-to-zoom support for smartphones and tablets. |

---

## 📁 Repository Structure

```
.
├── prd.md                     # Product Requirements Document
├── package.json               # Root scripts
├── server/                    # Signaling & Session Management Server
│   ├── package.json
│   └── src/
│       ├── server.js          # HTTP + WebSocket signaling server (port 8080)
│       └── sessionManager.js  # Device pairing, 6-digit codes, session authorization
├── web/                       # Web Controller & Browser Host Application
│   ├── package.json
│   ├── vite.config.js         # Vite configuration (port 3000)
│   ├── tailwind.config.js     # Tailwind CSS styles
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx            # Application root & state coordinator
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Connection & latency status header
│   │   │   ├── Dashboard.jsx      # Device discovery, passcode connect, host cards
│   │   │   ├── HostView.jsx       # Host view: QR code, 6-digit code, screen preview
│   │   │   ├── ControllerView.jsx # Remote viewer: canvas, mouse/key capture, toolbar
│   │   │   ├── MobileControls.jsx # Virtual trackpad, gestures & touch controls
│   │   │   ├── ApprovalModal.jsx  # Host approval pop-up dialog
│   │   │   └── SessionMetrics.jsx # Live HUD (FPS, latency, bitrate, packets)
│   │   └── services/
│   │       ├── signaling.js       # WebSocket client
│   │       ├── webrtc.js          # WebRTC PeerConnection & DataChannel manager
│   │       └── inputCapture.js    # Normalized coordinate translation & key mapping
└── macos-host/                # Native macOS Host (Swift & ScreenCaptureKit)
    ├── Package.swift          # Swift Package Manager manifest
    └── Sources/
        ├── main.swift                 # Host entry point & permission checks
        ├── ScreenCaptureManager.swift # ScreenCaptureKit screen streaming
        ├── InputInjector.swift        # CoreGraphics (CGEvent) input synthesis
        └── SignalingClient.swift      # URLSessionWebSocketTask signaling client
```

---

## ⚡ Getting Started

### 1. Start the Signaling Server

```bash
cd server
npm start
```
*Runs on `http://localhost:8080` and `ws://localhost:8080`.*

### 2. Start the Web Application (Controller & Web Host)

```bash
cd web
npm run dev
```
*Accessible on `http://localhost:3000` (or `http://<your-lan-ip>:3000` for mobile devices on the same Wi-Fi).*

### 3. Start the Native macOS Host (Optional)

```bash
cd macos-host
swift run
```
*Registers your Mac with the signaling server, displays your one-time connection code, and prepares ScreenCaptureKit + Accessibility input injection.*

---

## 🖥️ How It Works (Step-by-Step Flow)

1. **Host Setup**:
   - Open `http://localhost:3000` and switch to **Host Mode**, OR run `swift run` in `macos-host/`.
   - The host is assigned a unique **Device ID** and a **6-Digit Passcode** (e.g. `482-193`) with a QR code.
2. **Controller Connects**:
   - On another computer, phone, or tablet, open `http://<host-ip>:3000`.
   - Enter the 6-digit passcode (or scan the QR code).
   - Click **Connect**.
3. **Host Approval**:
   - The host screen instantly displays a pop-up: *"Incoming Connection Request from Web Controller. Allow remote viewing and control?"*
   - Host clicks **Approve & Share**.
4. **Remote Control Session**:
   - The WebRTC peer connection negotiates ICE candidates through Google STUN servers.
   - Low-latency screen stream renders on the controller.
   - Mouse clicks, movements, scrolls, and keystrokes are transmitted instantly via WebRTC DataChannel (or WebSocket relay fallback) and executed on the host.
5. **Termination**:
   - Either the host or controller can click **Disconnect** at any time to immediately tear down the session.
