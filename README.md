# RemoteLink

### What is this?
RemoteLink is a high-performance, zero-UI remote desktop application that streams your Mac screen to any device with near-zero latency. It allows you to view and remotely operate your macOS desktop from any phone, tablet, or PC without installing any client software. Everything runs directly in full-screen through any modern web browser with instant touch, mouse, and keyboard synchronization.

---

### How it works
1. **Screen Capture**: The native macOS host captures your display in real-time at 60 FPS using Apple's hardware-accelerated `ScreenCaptureKit` with zero buffer lag (`queueDepth: 1`).
2. **Binary Streaming**: Frames are compressed on the GPU and streamed as raw binary byte packets over WebSockets directly to the browser, bypassing Base64 overhead.
3. **Hardware Rendering & Remote Input**: The client decodes frames asynchronously via `createImageBitmap` onto a full-screen canvas, while all touch taps, mouse clicks, drags, scrolls, and keystrokes are immediately relayed and injected into macOS via CoreGraphics (`CGEvent`).

---

### How to set up

#### 1. Requirements
- macOS 13.0 or higher
- Node.js (v18+)

#### 2. Start in Background (Independent Daemon)
Run the background launcher in your terminal:
```bash
./start.sh
```
*(Or run `npm start`)*

> **Note:** Once started, you can safely close your terminal window. RemoteLink runs independently in the background without showing any icon in the Dock or App Switcher.

#### 3. Connect
Open the displayed URL on any device connected to the same Wi-Fi network:
```text
http://<your-lan-ip>:3000
```
*(Or on your Mac: `http://localhost:3000`)*

Your Mac desktop will appear instantly in full-screen with full touch and mouse control.

#### 4. Stop or Check Status
- **Check status:** `./status.sh` *(or `npm run status`)*
- **Stop daemon:** `./stop.sh` *(or `npm stop`)*
