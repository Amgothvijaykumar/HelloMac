import Foundation
import CoreGraphics
import ApplicationServices

/// Handles synthesis and injection of keyboard and mouse inputs into macOS window server
public class InputInjector {
    public static let shared = InputInjector()

    private var screenWidth: CGFloat = 1920
    private var screenHeight: CGFloat = 1080

    // Standard W3C DOM Key / Code mapping to macOS Virtual Key Codes (CGKeyCode)
    public static let keycodeMap: [String: UInt16] = [
        // Navigation & Editing
        "Backspace": 0x33, // 51 (macOS Delete/Backspace)
        "Delete": 0x75,    // 117 (Forward Delete)
        "Enter": 0x24,     // 36 (Return)
        "NumpadEnter": 0x4C,
        "Tab": 0x30,       // 48
        "Space": 0x31,     // 49
        "Escape": 0x35,    // 53
        "ArrowLeft": 0x7B, // 123
        "ArrowRight": 0x7C,// 124
        "ArrowDown": 0x7D, // 125
        "ArrowUp": 0x7E,   // 126
        "Home": 0x73,      // 115
        "End": 0x77,       // 119
        "PageUp": 0x74,    // 116
        "PageDown": 0x79,  // 121

        // Modifiers
        "ShiftLeft": 0x38,
        "ShiftRight": 0x3C,
        "Shift": 0x38,
        "ControlLeft": 0x3B,
        "ControlRight": 0x3E,
        "Control": 0x3B,
        "AltLeft": 0x3A,
        "AltRight": 0x3D,
        "Alt": 0x3A,
        "MetaLeft": 0x37,
        "MetaRight": 0x36,
        "Meta": 0x37,

        // Letters
        "KeyA": 0x00, "KeyB": 0x0B, "KeyC": 0x08, "KeyD": 0x02, "KeyE": 0x0E,
        "KeyF": 0x03, "KeyG": 0x05, "KeyH": 0x04, "KeyI": 0x22, "KeyJ": 0x26,
        "KeyK": 0x28, "KeyL": 0x25, "KeyM": 0x2E, "KeyN": 0x2D, "KeyO": 0x1F,
        "KeyP": 0x23, "KeyQ": 0x0C, "KeyR": 0x0F, "KeyS": 0x01, "KeyT": 0x11,
        "KeyU": 0x20, "KeyV": 0x09, "KeyW": 0x0D, "KeyX": 0x07, "KeyY": 0x10,
        "KeyZ": 0x06,

        // Digits
        "Digit1": 0x12, "Digit2": 0x13, "Digit3": 0x14, "Digit4": 0x15, "Digit5": 0x17,
        "Digit6": 0x16, "Digit7": 0x1A, "Digit8": 0x1C, "Digit9": 0x19, "Digit0": 0x1D,

        // Symbols
        "Minus": 0x1B, "Equal": 0x18, "BracketLeft": 0x21, "BracketRight": 0x1E,
        "Backslash": 0x2A, "Semicolon": 0x29, "Quote": 0x27, "Backquote": 0x32,
        "Comma": 0x2B, "Period": 0x2F, "Slash": 0x2C
    ]

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

    /// Move mouse cursor to normalized (0.0 - 1.0) coordinates
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

    /// Keyboard key event simulation with proper macOS virtual key code mapping
    public func sendKey(code: String?, key: String?, isDown: Bool, modifiers: [String: Bool] = [:]) {
        var keyCode: UInt16? = nil

        if let c = code, let mapped = InputInjector.keycodeMap[c] {
            keyCode = mapped
        } else if let k = key, let mapped = InputInjector.keycodeMap[k] {
            keyCode = mapped
        }

        if let kc = keyCode {
            if let event = CGEvent(keyboardEventSource: nil, virtualKey: CGKeyCode(kc), keyDown: isDown) {
                var flags: CGEventFlags = []
                if modifiers["shift"] == true { flags.insert(.maskShift) }
                if modifiers["ctrl"] == true { flags.insert(.maskControl) }
                if modifiers["alt"] == true { flags.insert(.maskAlternate) }
                if modifiers["meta"] == true { flags.insert(.maskCommand) }

                event.flags = flags
                event.post(tap: .cghidEventTap)
            }
        } else if let k = key, k.count == 1 {
            // Type exact Unicode character
            if isDown {
                typeText(k)
            }
        }
    }

    /// Type arbitrary text string via Unicode injection (works with any layout, mobile keyboard, emojis)
    public func typeText(_ text: String) {
        for char in text {
            let str = String(char)
            let utf16 = Array(str.utf16)
            if let eventDown = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true) {
                eventDown.keyboardSetUnicodeString(stringLength: utf16.count, unicodeString: utf16)
                eventDown.post(tap: .cghidEventTap)
            }
            if let eventUp = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: false) {
                eventUp.keyboardSetUnicodeString(stringLength: utf16.count, unicodeString: utf16)
                eventUp.post(tap: .cghidEventTap)
            }
        }
    }
}
