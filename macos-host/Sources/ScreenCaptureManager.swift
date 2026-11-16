import Foundation
import ScreenCaptureKit
import CoreGraphics
import CoreMedia

/// Captures macOS display frames using Apple's modern ScreenCaptureKit framework
public class ScreenCaptureManager: NSObject, SCStreamOutput, SCStreamDelegate {
    public static let shared = ScreenCaptureManager()

    private var stream: SCStream?
    public var isCapturing = false
    public var onFrameCaptured: ((CMSampleBuffer) -> Void)?

    /// Check if Screen Recording permission is granted
    public func checkScreenCaptureAccess() -> Bool {
        return CGPreflightScreenCaptureAccess()
    }

    /// Request Screen Recording permission
    public func requestScreenCaptureAccess() -> Bool {
        return CGRequestScreenCaptureAccess()
    }

    /// Start capturing the primary macOS display
    public func startCapture(fps: Int = 30) async throws {
        guard !isCapturing else { return }

        // Fetch shareable displays
        let content = try await SCShareableContent.current
        guard let display = content.displays.first else {
            throw NSError(domain: "RemoteLink", code: 1, userInfo: [NSLocalizedDescriptionKey: "No display found"])
        }

        InputInjector.shared.updateScreenResolution(width: CGFloat(display.width), height: CGFloat(display.height))

        let filter = SCContentFilter(display: display, excludingWindows: [])
        let config = SCStreamConfiguration()

        // Ultra-low latency resolution scaling (1280 max width for instant encoding)
        let targetWidth = min(display.width, 1280)
        let targetHeight = Int(Double(targetWidth) / (Double(display.width) / Double(display.height)))

        config.width = targetWidth
        config.height = targetHeight
        config.minimumFrameInterval = CMTime(value: 1, timescale: 60) // 60 FPS
        config.queueDepth = 3 // Optimal Metal surface recycling pool
        config.showsCursor = true

        let newStream = SCStream(filter: filter, configuration: config, delegate: self)
        try newStream.addStreamOutput(self, type: .screen, sampleHandlerQueue: DispatchQueue(label: "com.remotelink.screencapture", qos: .userInteractive))
        try await newStream.startCapture()

        self.stream = newStream
        self.isCapturing = true
        print("[ScreenCapture] Ultra-low latency 60 FPS capture started (\(targetWidth)x\(targetHeight), queueDepth: 1)")
    }

    public func stopCapture() async {
        guard isCapturing, let stream = stream else { return }
        do {
            try await stream.stopCapture()
            self.stream = nil
            self.isCapturing = false
            print("[ScreenCapture] Screen capture stopped")
        } catch {
            print("[ScreenCapture] Error stopping capture: \(error)")
        }
    }

    // SCStreamOutput callback
    public func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen else { return }
        onFrameCaptured?(sampleBuffer)
    }

    // SCStreamDelegate error callback
    public func stream(_ stream: SCStream, didStopWithError error: Error) {
        print("[ScreenCapture] Stream stopped with error: \(error)")
        self.isCapturing = false
    }
}

