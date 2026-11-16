import Foundation

/// WebSocket client that interfaces with the RemoteLink signaling server
public class SignalingClient: NSObject {
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    public var serverURL: URL

    public var hostId: String?
    public var connectionCode: String?
    public var isConnected = false

    public init(serverURL: URL = URL(string: "ws://localhost:8080")!) {
        self.serverURL = serverURL
        super.init()
        self.urlSession = URLSession(configuration: .default)
    }

    public func connect() {
        print("[Signaling] Connecting to \(serverURL)...")
        let request = URLRequest(url: serverURL)
        webSocketTask = urlSession?.webSocketTask(with: request)
        webSocketTask?.resume()
        listenForMessages()
    }

    private func listenForMessages() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .failure(let error):
                print("[Signaling] Disconnected or error: \(error.localizedDescription)")
                self.isConnected = false
                // Auto-reconnect after 3 seconds
                DispatchQueue.global().asyncAfter(deadline: .now() + 3.0) {
                    self.connect()
                }

            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                self.listenForMessages()
            }
        }
    }

    private func handleMessage(_ jsonString: String) {
        guard let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        let payload = json["payload"] as? [String: Any] ?? [:]

        switch type {
        case "host_registered":
            self.isConnected = true
            self.hostId = payload["hostId"] as? String
            self.connectionCode = payload["connectionCode"] as? String

            print("\n=================================================")
            print("🚀  RemoteLink macOS Host Online!")
            print("🔑  Connection Code:  \(self.connectionCode ?? "---")")
            print("💻  Device ID:        \(payload["deviceId"] ?? "")")
            print("🌐  Controller URL:   http://localhost:3000?code=\(self.connectionCode ?? "")")
            print("=================================================\n")

        case "incoming_connection_request":
            let reqId = payload["requestId"] as? String ?? ""
            let controllerName = payload["controllerName"] as? String ?? "Web Controller"
            let controllerType = payload["controllerType"] as? String ?? "web"

            print("\n🔔  INCOMING CONNECTION REQUEST!")
            print("    Controller: \(controllerName) (\(controllerType))")
            print("    Approving session and preparing screen stream...\n")

            // Auto-approve or trigger system prompt
            respondToRequest(requestId: reqId, approved: true)

        case "session_started":
            let sessionId = payload["sessionId"] as? String ?? ""
            let ctrlName = payload["controllerName"] as? String ?? "Controller"
            print("🟢  Active session established with \(ctrlName) [\(sessionId)]")

            Task {
                try? await ScreenCaptureManager.shared.startCapture(fps: 30)
            }

        case "remote_input":
            if let input = payload["input"] as? [String: Any] {
                self.processRemoteInput(input)
            }

        case "session_terminated":
            print("🔴  Session terminated: \(payload["reason"] ?? "ended")")
            Task {
                await ScreenCaptureManager.shared.stopCapture()
            }

        default:
            break
        }
    }

    public func registerHost(deviceId: String, deviceName: String) {
        let message: [String: Any] = [
            "type": "register_host",
            "payload": [
                "deviceId": deviceId,
                "deviceName": deviceName,
                "os": "macos",
                "resolution": [
                    "width": 1920,
                    "height": 1080
                ]
            ]
        ]
        send(message)
    }

    public func respondToRequest(requestId: String, approved: Bool) {
        let message: [String: Any] = [
            "type": "respond_connection",
            "payload": [
                "requestId": requestId,
                "approved": approved
            ]
        ]
        send(message)
    }

    private func processRemoteInput(_ input: [String: Any]) {
        guard let inputType = input["type"] as? String else { return }

        switch inputType {
        case "mouse_move":
            if let x = input["x"] as? Double, let y = input["y"] as? Double {
                InputInjector.shared.moveMouse(normalizedX: x, normalizedY: y)
            }

        case "mouse_down":
            let button = input["button"] as? Int ?? 0
            let x = input["x"] as? Double
            let y = input["y"] as? Double
            InputInjector.shared.setMouseButton(button: button, isDown: true, normalizedX: x, normalizedY: y)

        case "mouse_up":
            let button = input["button"] as? Int ?? 0
            let x = input["x"] as? Double
            let y = input["y"] as? Double
            InputInjector.shared.setMouseButton(button: button, isDown: false, normalizedX: x, normalizedY: y)

        case "mouse_click":
            let button = input["button"] as? Int ?? 0
            let x = input["x"] as? Double
            let y = input["y"] as? Double
            InputInjector.shared.clickMouse(button: button, normalizedX: x, normalizedY: y)

        case "wheel":
            let dx = input["deltaX"] as? Double ?? 0
            let dy = input["deltaY"] as? Double ?? 0
            InputInjector.shared.scroll(deltaX: dx, deltaY: dy)

        case "key_down", "key_up":
            let isDown = (inputType == "key_down")
            let keyCode = UInt16(input["keyCode"] as? Int ?? 0)
            let modifiers = input["modifiers"] as? [String: Bool] ?? [:]
            InputInjector.shared.sendKey(keyCode: keyCode, isDown: isDown, modifiers: modifiers)

        default:
            break
        }
    }

    private func send(_ dictionary: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dictionary),
              let string = String(data: data, encoding: .utf8) else {
            return
        }
        webSocketTask?.send(.string(string)) { error in
            if let error = error {
                print("[Signaling] Send error: \(error)")
            }
        }
    }
}
