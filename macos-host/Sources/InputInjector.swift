import Foundation
import CoreGraphics
import ApplicationServices

/// Handles synthesis and injection of keyboard and mouse inputs into macOS window server
public class InputInjector {
    public static let shared = InputInjector()

    private var screenWidth: CGFloat = 1920
    private var screenHeight: CGFloat = 1080

    public init() {
        if let mainDisplay = CGMainDisplayID() as CGDirectDisplayID? {
            screenWidth = CGFloat(CGDisplayPixelsWide(mainDisplay))
            screenHeight = CGFloat(CGDisplayPixelsHigh(mainDisplay))
        }
    }

    /// Checks whether this process has macOS Accessibility permissions for input simulation
    public func checkAccessibilityPermissions() -> Bool {
        let checkOptPrompt = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options = [checkOptPrompt: true] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }

    /// Update display resolution bounds for normalized coordinates
    public func updateScreenResolution(width: CGFloat, height: CGFloat) {
        self.screenWidth = width
        self.screenHeight = height
    }

    /// Move mouse cursor to normalized (0.0 - 1.0) or absolute coordinates
    public func moveMouse(normalizedX: Double, normalizedY: Double) {
        let x = CGFloat(normalizedX) * screenWidth
        let y = CGFloat(normalizedY) * screenHeight
        let point = CGPoint(x: x, y: y)

        if let event = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left) {
            event.post(tap: .cghidEventTap)
        }
    }

    /// Send mouse button down / up
    public func setMouseButton(button: Int, isDown: Bool, normalizedX: Double?, normalizedY: Double?) {
        let point: CGPoint
        if let nx = normalizedX, let ny = normalizedY {
            point = CGPoint(x: CGFloat(nx) * screenWidth, y: CGFloat(ny) * screenHeight)
        } else {
            point = CGEvent(source: nil)?.location ?? CGPoint(x: screenWidth / 2, y: screenHeight / 2)
        }

        let eventType: CGEventType
        let mouseButton: CGMouseButton

        switch button {
        case 2: // Right click
            eventType = isDown ? .rightMouseDown : .rightMouseUp
            mouseButton = .right
        default: // Left click
            eventType = isDown ? .leftMouseDown : .leftMouseUp
            mouseButton = .left
        }

        if let event = CGEvent(mouseEventSource: nil, mouseType: eventType, mouseCursorPosition: point, mouseButton: mouseButton) {
            event.post(tap: .cghidEventTap)
        }
    }

    /// Click (down then up)
    public func clickMouse(button: Int, normalizedX: Double?, normalizedY: Double?) {
        setMouseButton(button: button, isDown: true, normalizedX: normalizedX, normalizedY: normalizedY)
        usleep(15000) // 15ms click hold
        setMouseButton(button: button, isDown: false, normalizedX: normalizedX, normalizedY: normalizedY)
    }

    /// Scroll wheel
    public func scroll(deltaX: Double, deltaY: Double) {
        let dy = Int32(-deltaY)
        let dx = Int32(-deltaX)
        if let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 2, wheel1: dy, wheel2: dx, wheel3: 0) {
            event.post(tap: .cghidEventTap)
        }
    }

    /// Keyboard key event simulation
    public func sendKey(keyCode: UInt16, isDown: Bool, modifiers: [String: Bool] = [:]) {
        if let event = CGEvent(keyboardEventSource: nil, virtualKey: CGKeyCode(keyCode), keyDown: isDown) {
            var flags: CGEventFlags = []
            if modifiers["shift"] == true { flags.insert(.maskShift) }
            if modifiers["ctrl"] == true { flags.insert(.maskControl) }
            if modifiers["alt"] == true { flags.insert(.maskAlternate) }
            if modifiers["meta"] == true { flags.insert(.maskCommand) }

            event.flags = flags
            event.post(tap: .cghidEventTap)
        }
    }
}
