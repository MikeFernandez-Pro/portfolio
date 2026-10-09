import gsap from 'gsap';

import { targets } from './targets.js';
import { createScrubbableTimeline } from './scrubbableTimeline.js';

// Character death: the respawn dissolve played the other way around — the
// formed character mixes into the voronoi lava, then the lava recedes to
// nothing (no spiral). Plays the moment the character dies, in parallel with
// the death particles. Independent of respawnAnimation.js: it shares the
// character dissolve uniforms but has its own config and timeline.
export const DEATH_DEFAULTS = {
  // Durations (seconds)
  dissolveDuration: 0.3, // formed character -> voronoi lava
  fadeDuration: 0.3, // lava recedes to nothing
  // Voronoi dissolve edge peak (ramps 0 -> this -> 0 across the death)
  thickness: 0.43,
};

// Live, mutable copy the controls edit and the timeline reads at build time
export const deathConfig = { ...DEATH_DEFAULTS };

const buildDeathTimeline = ({ onComplete, paused = false } = {}) => {
  const character = targets.dissolve;
  const c = deathConfig;

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

// 0 = alive (formed), the resting frame
const timeline = createScrubbableTimeline(buildDeathTimeline, 0);

export const playDeathAnimation = timeline.play;
export const scrubDeathAnimation = timeline.scrub;
export const refreshDeathAnimation = timeline.refresh;

// Stop the animation and return to the resting state (formed character)
export const resetDeathAnimation = () => {
  timeline.stop();

  const character = targets.dissolve;
  if (character) {
    character.uCharFormProgress.value = 1;
    character.uProgress.value = 0;
    character.uThickness.value = 0;
  }
};
