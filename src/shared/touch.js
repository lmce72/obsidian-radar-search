// Cancel scrolling gestures and synthetic clicks; no EmbedUI runtime dependency.
export function makeTouchHandler(action, threshold = 10) {
  let start = null;
  return {
    onTouchStart(event) {
      const touch = event.touches?.length === 1 ? event.touches[0] : null;
      start = touch ? { x: touch.clientX, y: touch.clientY, id: touch.identifier } : null;
    },
    onTouchEnd(event) {
      event.preventDefault();
      const touch = Array.from(event.changedTouches || []).find(item => item.identifier === start?.id);
      const tap = touch && start && Math.abs(touch.clientX - start.x) <= threshold && Math.abs(touch.clientY - start.y) <= threshold;
      start = null;
      if (tap) action(event);
    }
  };
}
