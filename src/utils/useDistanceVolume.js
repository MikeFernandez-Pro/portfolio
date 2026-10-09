import { useEffect } from 'react';

import { useStore } from '#store';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';

/**
 * Sets a looping or repeated sound's volume from the character's distance
 * to `position` (a Vector3): min(gain / distance, cap) times
 * SOUND_VOLUMES[volumeKey] (read live, the debug panel changes it), silent
 * past maxDistance.
 */
export const useDistanceVolume = (
  sound,
  position,
  { maxDistance, gain, cap, volumeKey }
) => {
  useEffect(
    () =>
      useStore.subscribe(
        state => state.characterPosition,
        characterPosition => {
          if (!characterPosition) return;
          const distance = position.distanceTo(characterPosition);
          sound.volume(
            distance < maxDistance
              ? Math.min(gain / distance, cap) * SOUND_VOLUMES[volumeKey]
              : 0
          );
        }
      ),
    [sound, position, maxDistance, gain, cap, volumeKey]
  );
};
