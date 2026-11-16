# RemoteLink

### What is this?
RemoteLink is a high-performance, zero-UI remote desktop application that streams your Mac screen to any device with near-zero latency. It allows you to view and remotely operate your macOS desktop from any phone, tablet, or PC without installing any client software. Everything runs directly in full-screen through any modern web browser with instant touch, mouse, and keyboard synchronization.

---

### How it works
1. **Screen Capture**: The native macOS host captures your display in real-time at 60 FPS using Apple's hardware-accelerated `ScreenCaptureKit` with zero buffer lag (`queueDepth: 1`).
2. **Binary Streaming**: Frames are compressed on the GPU and streamed as raw binary byte packets over WebSockets directly to the browser, bypassing Base64 overhead.
3. **Hardware Rendering & Remote Input**: The client decodes frames asynchronously via `createImageBitmap` onto a full-screen canvas, while all touch taps, mouse clicks, drags, scrolls, and keystrokes are immediately relayed and injected into macOS via CoreGraphics (`CGEvent`).

---

### How to Set Up & Run

#### 1. Prerequisites
- **macOS:** macOS 13.0 (Ventura) or newer
- **Node.js:** v18 or newer
- **macOS System Permissions** (required by macOS security):
  - **Screen Recording:** Go to `System Settings` → `Privacy & Security` → `Screen & System Audio Recording` and ensure your Terminal / IDE is enabled.
  - **Accessibility:** Go to `System Settings` → `Privacy & Security` → `Accessibility` and ensure your Terminal / IDE is enabled (allows remote mouse and keyboard control).

#### 2. Install & Build (One-Time Setup)
In the project directory, run:
```bash
# Install server dependencies
cd server && npm install && cd ..

# Compile the native macOS host
npm run build:host
```

#### 3. Start RemoteLink (1-Click)
Start the background daemon:
```bash
./start.sh
```
*(Or run `npm start`)*

> **Note:** Once started, you can safely close your terminal window. RemoteLink runs independently in the background.

#### 4. Connect From Any Device
Make sure your phone, tablet, or other PC is connected to the same Wi-Fi network, then open its browser to:
```text
http://<your-mac-ip>:3000
```
*(On your Mac: `http://localhost:3000`)*

Your Mac desktop will appear instantly in full-screen with full touch, mouse, and keyboard control.

---

### Useful Commands

| Task | Command |
|---|---|
| **Check Status & IP** | `./status.sh` *(or `npm run status`)* |
| **Stop RemoteLink** | `./stop.sh` *(or `npm stop`)* |
| **Start in Foreground** | `./run.sh` *(stops automatically when pressing `Ctrl+C`)* |
