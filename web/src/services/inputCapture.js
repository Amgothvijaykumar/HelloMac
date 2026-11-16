/**
 * Calculates normalized coordinates (0.0 to 1.0) of a mouse/touch event
 * relative to the actual rendered video content inside the <video> element.
 */
export function getNormalizedCoordinates(event, videoElement) {
  if (!videoElement) return null;

  const rect = videoElement.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  const videoWidth = videoElement.videoWidth || rect.width;
  const videoHeight = videoElement.videoHeight || rect.height;

  if (videoWidth === 0 || videoHeight === 0 || rect.width === 0 || rect.height === 0) {
    return null;
  }

  // Account for object-fit: contain letterboxing/pillarboxing
  const videoAspect = videoWidth / videoHeight;
  const containerAspect = rect.width / rect.height;

  let renderWidth = rect.width;
  let renderHeight = rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > videoAspect) {
    // Pillarbox (bars on left/right)
    renderWidth = rect.height * videoAspect;
    offsetX = (rect.width - renderWidth) / 2;
  } else {
    // Letterbox (bars on top/bottom)
    renderHeight = rect.width / videoAspect;
    offsetY = (rect.height - renderHeight) / 2;
  }

  const relativeX = clientX - (rect.left + offsetX);
  const relativeY = clientY - (rect.top + offsetY);

  // Clamp within 0.0 - 1.0
  const normX = Math.max(0, Math.min(1, relativeX / renderWidth));
  const normY = Math.max(0, Math.min(1, relativeY / renderHeight));

  return { x: normX, y: normY };
}

/**
 * Maps KeyboardEvent into structured input payload with standard key codes
 */
export function mapKeyboardEvent(event, type) {
  return {
    type, // 'key_down' | 'key_up'
    key: event.key,
    code: event.code,
    keyCode: event.keyCode,
    modifiers: {
      alt: event.altKey,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      shift: event.shiftKey
    }
  };
}

