import { useEffect, useRef } from 'react';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';
import { keysConfigList } from '#controller/CharacterControllerUtils.js';

/**
 * useKeyboardControls
 * - Manages WASD/Arrow key state and provides Shift/Space callbacks.
 * - Desktop only; does nothing on mobile.
 */
export function useKeyboardControls({
  onSpaceDown,
  onShiftDown,
  onShiftUp,
} = {}) {
  const eventKeysRef = useRef({
    forward: false,
    backward: false,
    leftward: false,
    rightward: false,
    enter: false,
  });

  useEffect(() => {
    if (IS_MOBILE_DEVICE) return;

    const handler = event => {
      // Movement mapping
      if (keysConfigList[event.code]) {
        eventKeysRef.current[keysConfigList[event.code]] =
          event.type === 'keydown';
      }

      // Space (jump) on keydown
      if (event.code === 'Space' && event.type === 'keydown') {
        event.preventDefault();
        onSpaceDown && onSpaceDown();
      }

      // Shift sprint toggles
      if (event.code === 'ShiftLeft' && event.type === 'keydown') {
        event.preventDefault();
        onShiftDown && onShiftDown(event);
      } else if (event.code === 'ShiftLeft' && event.type === 'keyup') {
        event.preventDefault();
        onShiftUp && onShiftUp();
      }
    };

    document.addEventListener('keydown', handler);
    document.addEventListener('keyup', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('keyup', handler);
    };
  }, [onSpaceDown, onShiftDown, onShiftUp]);

  const resetKeys = () => {
    const map = eventKeysRef.current;
    for (const key in map) map[key] = false;
  };

  return { eventKeys: eventKeysRef.current, resetKeys };
}
