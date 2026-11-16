# PRD.md — RemoteLink

**Product Name:** RemoteLink  
**Version:** 1.1  
**Product Type:** Universal Cross-Platform Remote Desktop and Control Application  
**Primary Goal:** Allow users to view and remotely control another device from virtually any supported device.

---

# 1. Product Overview

RemoteLink is a universal remote desktop application that allows users to share their computer screen and remotely control it from another device.

The host device runs the RemoteLink host application, while the controller can connect through a native application or web browser.

The application should support different operating systems, screen sizes, and device types.

## 1.1 Supported Devices

### Host Devices
- macOS
- Windows
- Linux (future support)

### Controller Devices
- macOS
- Windows
- Linux
- Android
- iOS
- iPadOS
- Tablets
- Any supported modern web browser

**Important:** A controller should not need to install the RemoteLink desktop application if browser-based access is available.

# 2. Product Vision

Build a universal remote desktop platform where users can access and control their computers from any supported device, anywhere.

Example:

| Controller | Host | Supported |
|---|---|---|
| MacBook | MacBook | Yes |
| Windows PC | MacBook | Yes |
| Android | MacBook | Yes |
| iPhone | Windows PC | Yes |
| Browser | MacBook | Yes |
| Browser | Windows PC | Yes |
| Tablet | MacBook | Yes |
| Windows PC | Windows PC | Yes |

# 3. Core Features

## 3.1 Universal Device Connectivity

Users should be able to connect devices regardless of their operating system.

Features:
- Unique device ID.
- One-time connection code.
- QR code pairing.
- Device registration.
- Online/offline status.
- Browser-based connection.
- Cross-platform compatibility.

## 3.2 Screen Sharing

The host device must capture its screen and transmit it to the controller.

Requirements:
- Real-time screen streaming.
- Adaptive resolution.
- Full-screen mode.
- Multiple monitor support.
- Adjustable streaming quality.
- Low-latency streaming.
- Responsive viewing on mobile devices.

## 3.3 Remote Control

The controller should be able to operate the host device.

Supported interactions:
- Mouse movement.
- Left and right clicks.
- Double click.
- Scrolling.
- Drag and drop.
- Keyboard input.
- Keyboard shortcuts.

Mobile-specific interactions:
- Touch-to-mouse control.
- Virtual mouse.
- On-screen keyboard.
- Pinch-to-zoom.
- Responsive remote desktop viewing.

Remote input must be supported only where the host operating system permits it and the required permissions are granted.

## 3.4 Browser-Based Access

This is a major product requirement.

Users should be able to open a browser on any supported device and access RemoteLink.

Example:

```text
https://remotelink.example.com
```

The user should be able to:

1. Open the RemoteLink website.
2. Sign in or enter a connection code.
3. Select a host device.
4. Request access.
5. Receive approval from the host.
6. View the remote screen.
7. Control the remote computer where supported.

No desktop application installation should be required on the controller side.

## 3.5 Authentication and Pairing

- User authentication.
- Device registration.
- One-time connection codes.
- QR-based pairing.
- Host approval.
- Session expiration.
- Device management.

## 3.6 Session Management

Display:
- Connected device.
- Controller identity.
- Session duration.
- Network latency.
- Connection quality.
- Streaming resolution.
- Disconnect control.

The host must always be informed when a remote-control session is active.

# 4. System Architecture

## 4.1 Architecture Overview

RemoteLink follows a client-server architecture with a WebRTC-based communication layer.

```text
                REMOTELINK PLATFORM
                        |
          +-------------+-------------+
          |                           |
     HOST DEVICES                CONTROLLERS
          |                           |
    +-----+------+           +--------+--------+
    |            |           |        |        |
   macOS      Windows       Web     Mobile   Desktop
    |            |         Browser   Apps     Apps
    |            |           |        |        |
    +------------+-----------+--------+--------+
                         |
                  BACKEND SERVICES
                         |
              +----------+----------+
              |                     |
        Authentication       Signaling Server
              |                     |
              +----------+----------+
                         |
                  WebRTC Connection
                         |
              +----------+----------+
              |                     |
         Screen Stream         Remote Input
              |                     |
              +----------+----------+
                         |
                  HOST COMPUTER
```

## 4.2 Host Application

Responsible for:
- Device registration.
- Screen capture.
- Video encoding.
- Remote input handling.
- Connection approval.
- Session management.
- Permission management.

## 4.3 Controller Applications

Controllers can use:

- Web application.
- macOS desktop application.
- Windows desktop application.
- Android application.
- iOS application.

All controller types should use a common backend and communication protocol.

## 4.4 Backend

Responsibilities:
- Authentication.
- Device discovery.
- Connection requests.
- Signaling.
- Session management.
- Device status.
- Access authorization.

# 5. Recommended Technology Stack

| Layer | Technology |
|---|---|
| macOS Host | Swift |
| macOS UI | SwiftUI |
| macOS Screen Capture | ScreenCaptureKit |
| Windows Host | C# / .NET |
| Windows Capture | Windows Graphics Capture |
| Web Controller | React / Next.js |
| Mobile Controller | React Native |
| Backend | Node.js / Fastify |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Signaling | WebSocket |
| Screen Streaming | WebRTC |
| NAT Traversal | STUN / TURN |
| TURN Server | coturn |

# 6. Network Architecture

The application must work across different networks.

Examples:
- Same Wi-Fi network.
- Different Wi-Fi networks.
- Home to office.
- Mobile data to home computer.
- Different countries.

Use WebRTC for real-time media communication.

Requirements:
- STUN for network discovery.
- TURN for relaying connections when direct connections fail.
- Encrypted communication.
- Network reconnection.
- Adaptive bitrate.

# 7. Security Requirements

- Authenticated device pairing.
- Explicit host approval.
- Encrypted screen streaming.
- Secure session credentials.
- Session expiration.
- Immediate disconnect.
- Visible remote-access indicator.
- Permission-based screen capture.
- Permission-based remote input.
- Audit logs for connections.

The application must not bypass operating-system security permissions or hide active remote-control sessions from the host user.

# 8. User Interface

## 8.1 Dashboard

Display:
- Registered devices.
- Online devices.
- Offline devices.
- Recent connections.
- Connect to device.
- Share my screen.

## 8.2 Host Screen

Display:
- Device ID.
- Connection code.
- QR code.
- Incoming connection request.
- Controller information.
- Approve / Reject.
- Active session indicator.
- Disconnect button.

## 8.3 Controller Screen

Display:
- Remote screen.
- Full-screen mode.
- Mouse control.
- Keyboard control.
- Mobile touch controls.
- Connection quality.
- Resolution settings.
- Disconnect button.

# 9. Non-Functional Requirements

## Performance
- Target 30 FPS under suitable network conditions.
- Adaptive video quality.
- Low input latency.
- Efficient CPU and memory usage.

## Compatibility
- Cross-platform host support.
- Browser-based controller.
- Mobile-responsive interface.
- Different screen resolutions.
- Multiple monitor support.

## Reliability
- Network recovery.
- Session timeout.
- Host disconnection detection.
- Automatic cleanup of expired sessions.

# 10. MVP Development Phases

## Phase 1 — macOS Host

- Create SwiftUI host application.
- Implement ScreenCaptureKit.
- Implement permission handling.
- Capture desktop frames.
- Register the device.
- Generate connection codes.

## Phase 2 — Web Controller

- Build React/Next.js web application.
- Implement authentication.
- Connect using device ID.
- Display remote screen.
- Support full-screen viewing.

## Phase 3 — Remote Control

- Implement mouse movement.
- Implement keyboard input.
- Support browser-based control.
- Add host approval.
- Add session management.

## Phase 4 — Cross-Platform

- Windows host.
- Windows controller.
- Android controller.
- iOS controller.
- Responsive tablet interface.

## Phase 5 — Advanced Features

- Clipboard synchronization.
- File transfer.
- Multiple displays.
- Connection history.
- Session recording with consent.
- Adaptive streaming.
- Advanced network recovery.

# 11. Acceptance Criteria

The MVP is complete when:

1. A MacBook can register as a host.
2. A user can access RemoteLink from another device's browser.
3. The controller can connect using a device ID or connection code.
4. The host can approve or reject the request.
5. The controller can view the host screen in real time.
6. The controller can remotely operate the host using supported input methods.
7. Screen streaming works across different networks.
8. The connection is encrypted.
9. The host can disconnect immediately.
10. The active remote session is visible to the host user.

# 12. Final Product Goal

RemoteLink should make remote computer access independent of the controller's operating system.

A user should be able to:

1. Install RemoteLink on their MacBook.
2. Open RemoteLink on the host.
3. Share a connection code.
4. Open a browser on another device.
5. Enter the connection code.
6. Approve the request on the MacBook.
7. View and control the MacBook remotely.

**Final Vision: One host computer, any supported controller device, one seamless remote desktop experience.**