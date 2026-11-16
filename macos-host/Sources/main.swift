import Foundation
import AppKit

print("""
-----------------------------------------------------------
     RemoteLink — macOS Native Host Application (v1.1)
-----------------------------------------------------------
""")

// 1. Check Screen Recording & Accessibility Permissions
let hasScreenAccess = ScreenCaptureManager.shared.checkScreenCaptureAccess()
print("[Permissions] Screen Recording Access: \(hasScreenAccess ? "GRANTED" : "NOT GRANTED")")
if !hasScreenAccess {
    print("[Permissions] Requesting Screen Capture Access...")
    _ = ScreenCaptureManager.shared.requestScreenCaptureAccess()
}

let hasA11yAccess = InputInjector.shared.checkAccessibilityPermissions()
print("[Permissions] Accessibility Control Access: \(hasA11yAccess ? "GRANTED" : "NOT GRANTED")")
if !hasA11yAccess {
    print("[Permissions] Please grant Accessibility permission in System Settings -> Privacy & Security -> Accessibility to allow remote mouse and keyboard control.")
}

// 2. Identify Device
let hostName = Host.current().localizedName ?? "MacBook Pro"
let deviceId = "mac_" + UUID().uuidString.prefix(8).lowercased()

// 3. Connect to Signaling Server
let signalingUrlString = ProcessInfo.processInfo.environment["REMOTELINK_SIGNALING_URL"] ?? "ws://127.0.0.1:3000"
guard let signalingUrl = URL(string: signalingUrlString) else {
    fatalError("Invalid signaling URL: \(signalingUrlString)")
}

let client = SignalingClient(serverURL: signalingUrl)
client.connect()

// Run loop
dispatchMain()

