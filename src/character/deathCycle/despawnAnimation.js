import gsap from 'gsap';

import { useStore } from '#store';

// Character despawn: the respawn dissolve played the other way around — the
// formed character mixes into the voronoi lava, then the lava recedes to
// nothing (no spiral). Plays the moment the character dies, in parallel with
// the death particles. Fully independent of respawnAnimation.js: it shares
// the character uniforms but has its own config and timeline.
export const DESPAWN_DEFAULTS = {
  // Durations (seconds)
  dissolveDuration: 0.3, // formed character -> voronoi lava
  fadeDuration: 0.3, // lava recedes to nothing
  // Voronoi dissolve edge peak (ramps 0 -> this -> 0 across the despawn)
  thickness: 0.43,
};

// Live, mutable copy the controls edit and the timeline reads at build time
export const despawnConfig = { ...DESPAWN_DEFAULTS };

let despawnTimeline = null;
let lastProgress = 0; // last scrubbed frame (0 = resting/formed)

const getCharacter = () => useStore.getState().characterRespawnUniforms;

// Build (but don't necessarily play) the despawn timeline
export const buildDespawnTimeline = ({ onComplete, paused = false } = {}) => {
  const character = getCharacter();
  const c = despawnConfig;

  const tl = gsap.timeline({ paused, onComplete });
  if (!character) return tl;

  // Start from the formed resting state
  tl.set(character.uCharFormProgress, { value: 1 }, 0);
  tl.set(character.uProgress, { value: 0 }, 0);
  tl.set(character.uThickness, { value: 0 }, 0);

  // Phase 1: the lava grows over the character while it un-forms
  tl.to(
    character.uProgress,
    { value: 1, duration: c.dissolveDuration, ease: 'power1.out' },
    0
  );
  tl.to(
    character.uThickness,
    { value: c.thickness, duration: c.dissolveDuration, ease: 'linear' },
    0
  );
  tl.to(
    character.uCharFormProgress,
    { value: 0, duration: c.dissolveDuration, ease: 'linear' },
    0
  );

  // Phase 2: the lava recedes, leaving nothing
  tl.to(
    character.uProgress,
    { value: 0, duration: c.fadeDuration, ease: 'linear' },
    c.dissolveDuration
  );
  tl.to(
    character.uThickness,
    { value: 0, duration: c.fadeDuration, ease: 'linear' },
    c.dissolveDuration
  );

  return tl;
};

// Play the full despawn from the start (used by the real death + Play button)
export const playDespawnAnimation = (callbacks = {}) => {
  despawnTimeline?.kill();
  despawnTimeline = buildDespawnTimeline({ ...callbacks, paused: false });
  return despawnTimeline;
};

// Seek the animation to an arbitrary [0, 1] moment (progress scrubber)
export const scrubDespawnAnimation = progress => {
  lastProgress = progress;
  despawnTimeline?.kill();
  despawnTimeline = buildDespawnTimeline({ paused: true });
  despawnTimeline.progress(progress).pause();
};

// Rebuild the paused preview at the current frame — call after editing a
// build-time value (durations, thickness) so the change is visible
// immediately while scrubbing. Never interrupts an active Play.
export const refreshDespawnAnimation = () => {
  if (despawnTimeline && despawnTimeline.isActive()) return;
  scrubDespawnAnimation(lastProgress);
};

// Stop the animation and return to the resting state (formed character)
export const resetDespawnAnimation = () => {
  despawnTimeline?.kill();
  despawnTimeline = null;
  lastProgress = 0;

  const character = getCharacter();
  if (character) {
    character.uCharFormProgress.value = 1;
    character.uProgress.value = 0;
    character.uThickness.value = 0;
  }
};
