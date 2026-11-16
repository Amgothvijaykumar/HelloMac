import Foundation
import CoreImage
import CoreMedia
import CoreVideo
import ImageIO

/// WebSocket client that interfaces with the RemoteLink server
public class SignalingClient: NSObject {
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    public var serverURL: URL
    public var isConnected = false

    private let ciContext = CIContext(options: [CIContextOption.useSoftwareRenderer: false])
    private var lastFrameTime: Double = 0
    private var isSendingFrame = false

    public init(serverURL: URL = URL(string: "ws://localhost:3000")!) {
        self.serverURL = serverURL
        super.init()
        self.urlSession = URLSession(configuration: .default)
        self.setupFrameStreaming()
    }

    private func setupFrameStreaming() {
        ScreenCaptureManager.shared.onFrameCaptured = { [weak self] sampleBuffer in
            guard let self = self, self.isConnected else { return }
            guard !self.isSendingFrame else { return } // Drop frame if previous is still transmitting

            let now = Date().timeIntervalSince1970
            guard (now - self.lastFrameTime) >= 0.016 else { return } // 60 FPS cap (16.6ms)
            self.lastFrameTime = now

            guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
            self.isSendingFrame = true

            DispatchQueue.global(qos: .userInteractive).async {
                let ciImage = CIImage(cvPixelBuffer: imageBuffer)
                let colorSpace = CGColorSpaceCreateDeviceRGB()
                let options: [CIImageRepresentationOption: Any] = [
                    CIImageRepresentationOption(rawValue: "kCGImageDestinationLossyFactor"): 0.45
                ]
                if let jpegData = self.ciContext.jpegRepresentation(of: ciImage, colorSpace: colorSpace, options: options) {
                    // Send pure binary frame (Zero base64 overhead!)
                    self.webSocketTask?.send(.data(jpegData)) { _ in
                        self.isSendingFrame = false
                    }
                } else {
                    self.isSendingFrame = false
                }
            }
        }
    }

    public func connect() {
        print("[Signaling] Connecting to \(serverURL)...")
        let request = URLRequest(url: serverURL)
        webSocketTask = urlSession?.webSocketTask(with: request)
        webSocketTask?.resume()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.isConnected = true
            self.send(["type": "register_host"])
            print("🚀 [RemoteLink] Registered as Host — Starting Screen Capture...")
            Task {
                try? await ScreenCaptureManager.shared.startCapture(fps: 30)
            }
        }

        listenForMessages()
    }

    private func listenForMessages() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .failure(let error):
                print("[Signaling] Connection closed: \(error.localizedDescription)")
                self.isConnected = false
                DispatchQueue.global().asyncAfter(deadline: .now() + 2.0) {
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

        if type == "remote_input", let input = json["input"] as? [String: Any] {
            self.processRemoteInput(input)
        }
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
        webSocketTask?.send(.string(string)) { _ in }
    }
}
