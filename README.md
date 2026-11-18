# RemoteLink

A high-performance, zero-UI remote desktop application that streams your Mac desktop to any browser with near-zero latency. Control your Mac from any phone, tablet, or PC without installing any apps on the client device.

---

## ⚡ How It Works

1. **Hardware-Accelerated Screen Capture**: The native macOS host captures your display in real-time at 60 FPS using Apple's `ScreenCaptureKit` with zero buffer lag (`queueDepth: 1`).
2. **Raw Binary Streaming**: Screen frames are compressed directly on the GPU (JPEG) and streamed as raw binary byte arrays over WebSockets, eliminating Base64 overhead.
3. **Instant Browser Rendering & Remote Control**: The browser decodes frames asynchronously via `createImageBitmap` onto an edge-to-edge full-screen canvas. Mouse clicks, drags, scrolls, touch gestures, and keystrokes are transmitted instantly and injected into macOS via CoreGraphics (`CGEvent`).

---

## 📋 Prerequisites

- **macOS:** macOS 13.0 (Ventura) or newer
- **Node.js:** v18 or newer
- **macOS Permissions** *(Required by macOS security for remote desktop)*:
  1. **Screen Recording:** Open `System Settings` → `Privacy & Security` → `Screen & System Audio Recording` and ensure your Terminal / iTerm / IDE is toggled **ON**.
  2. **Accessibility:** Open `System Settings` → `Privacy & Security` → `Accessibility` and ensure your Terminal / iTerm / IDE is toggled **ON** *(allows remote mouse and keyboard input)*.

---

## 🚀 Quick Setup & Usage

### 1. Clone the Repository
```bash
git clone https://github.com/Amgothvijaykumar/HelloMac.git
cd HelloMac
```

---

### Option A: Control Over the Internet (Anywhere in the World) 🌍

Use your deployed cloud relay server on Render to access your Mac from any network (mobile data, hotel Wi-Fi, outside home).

#### 1. Start the Mac Host
In your terminal, run:
```bash
./start.sh https://hellomac.onrender.com
```

> **Note:** First-time run will automatically compile the Swift native host. You can safely close your terminal window after starting—it runs silently in the background as a daemon without any Dock icon.

#### 2. Open from Any Device
On your phone, iPad, laptop, or desktop, simply open:
👉 **https://hellomac.onrender.com**

Your Mac screen will appear instantly with full touch, mouse, and keyboard control!

---

### Option B: Local Network (Same Wi-Fi) 🏠

If you only want to control your Mac within your local Wi-Fi network without the internet:

#### 1. Start RemoteLink
```bash
./start.sh
```

#### 2. Open on Client Device
Open the URL shown in your terminal:
👉 **`http://<your-mac-ip>:3000`** *(or `http://localhost:3000` on the same Mac)*

---

## 🛠️ Management Commands

| Command | Description |
|---|---|
| `./start.sh https://hellomac.onrender.com` | Start Mac host connected to Cloud Relay (World-wide access) |
| `./start.sh` | Start local server and host (Local Wi-Fi access) |
| `./status.sh` | Check whether RemoteLink is running and view recent logs |
| `./stop.sh` | Completely stop RemoteLink background processes |

---

## ☁️ Deploying Your Own Cloud Relay (Optional)

If you'd like to deploy your own free relay on [Render](https://render.com):

1. Create a **New Web Service** connected to your repository.
2. Configure settings:
   - **Root Directory:** `server`
   - **Language:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Instance Type:** `Free ($0/month)`
3. Click **Deploy Web Service**.
4. Once deployed, run `./start.sh <YOUR_RENDER_URL>` on your Mac.
