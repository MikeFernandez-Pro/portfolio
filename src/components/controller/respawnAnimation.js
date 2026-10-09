import gsap from 'gsap';

import { useStore } from '#store/ZustandStorage.jsx';
import {
  spawnLightUniforms,
  spawnLightSettings,
} from '#islands/common/islandPointLights.js';

// Single source of truth for the whole respawn animation (character voronoi
// dissolve + spawn spiral). Both the real gameplay respawn and the debug
// controls build their timeline from here.
export const RESPAWN_DEFAULTS = {
  // Durations (seconds)
  charDelay: 0, // character start offset from Play (independent of the spiral)
  charProgressDuration: 0.5, // voronoi lava grows in
  charRespawnDuration: 0.4, // lava mixes back to the real character
  spiralDelay: 0, // spiral start offset from Play (independent of the character)
  spiralDuration: 1.1, // spiral sweep length
  spiralStartX: -0.75, // uv.x offset at the start of the sweep
  spiralEndX: 1, // uv.x offset at the end of the sweep
  // Look
  charColor: '#25c447',
  charIntensity: 3.6,
  charRepeat: 0, // voronoi pattern scale
  charPerlinScale: 1.5, // perlin warp scale
  charPerlinStrength: 1, // perlin UV warp strength
  charPerlinSpeed: 0.12, // perlin scroll speed
  charThickness: 0.2, // voronoi dissolve edge softness
  alphaClip: 0.01, // discard only ~fully-transparent fragments (kills the
  // silhouette) while keeping the character's opacity fade-in intact
  spiralColor: '#44fca3',
  spiralEmissive: 7.54,
};

// Live, mutable copy the controls edit and the timeline reads at build time
export const respawnConfig = { ...RESPAWN_DEFAULTS };

let masterTimeline = null;
let lastProgress = 1; // last scrubbed frame (1 = resting/formed)

const getTargets = () => {
  const { characterRespawnUniforms, spiralRespawnUniforms, spiralRespawnMesh } =
    useStore.getState();
  return {
    character: characterRespawnUniforms,
    spiral: spiralRespawnUniforms,
    spiralMesh: spiralRespawnMesh,
  };
};

// Build (but don't necessarily play) the combined timeline
export const buildRespawnTimeline = ({
  onStart,
  onComplete,
  paused = false,
} = {}) => {
  const { character, spiral, spiralMesh } = getTargets();
  const c = respawnConfig;

  // Character timing; the spiral is timed independently (see its block below)
  const charTotal = c.charProgressDuration + c.charRespawnDuration;
  const charStart = Math.max(0, c.charDelay);
  const charEnd = charStart + charTotal;

  const tl = gsap.timeline({ paused, onStart });

  if (character) {
    // Initial state, applied immediately: invisible, no lava, sharp edge
    tl.set(character.uCharFormProgress, { value: 0 }, 0);
    tl.set(character.uProgress, { value: 0 }, 0);
    tl.set(character.uThickness, { value: 0 }, 0);

    // Phase 1 (after the delay): lava grows in, edge thickens 0 -> max
    tl.to(
      character.uProgress,
      { value: 1, duration: c.charProgressDuration, ease: 'power1.out' },
      charStart
    );
    tl.to(
      character.uThickness,
      {
        value: c.charThickness,
        duration: c.charProgressDuration,
        ease: 'linear',
      },
      charStart
    );

    // Phase 2: form the real character over the lava while the voronoi recedes
    // (uProgress 1 -> 0) and the edge thins back out
    tl.to(
      character.uCharFormProgress,
      { value: 1, duration: c.charRespawnDuration, ease: 'linear' },
      charStart + c.charProgressDuration
    );
    tl.to(
      character.uProgress,
      { value: 0, duration: c.charRespawnDuration, ease: 'linear' },
      charStart + c.charProgressDuration
    );
    tl.to(
      character.uThickness,
      { value: 0, duration: c.charRespawnDuration, ease: 'linear' },
      charStart + c.charProgressDuration
    );
  }

  // Spawn light: fades in over the first half of the respawn and out over the
  // second (off at rest). Independent of the character/spiral targets.
  const spawnHalf = charTotal / 2;
  tl.set(spawnLightUniforms.uSpawnLightIntensity, { value: 0 }, charStart);
  tl.to(
    spawnLightUniforms.uSpawnLightIntensity,
    {
      value: spawnLightSettings.intensity,
      duration: spawnHalf,
      ease: 'sine.in',
    },
    charStart
  );
  tl.to(
    spawnLightUniforms.uSpawnLightIntensity,
    { value: 0, duration: spawnHalf, ease: 'sine.out' },
    charStart + spawnHalf
  );

  if (spiral) {
    // Self-contained: starts at spiralDelay from Play and runs for
    // spiralDuration, sweeping uv.x from spiralStartX to spiralEndX. The mesh
    // is shown for the duration and hidden again at the end (hidden at rest).
    const spiralStart = Math.max(0, c.spiralDelay);
    const spiralEnd = spiralStart + c.spiralDuration;

    if (spiralMesh) tl.set(spiralMesh, { visible: true }, spiralStart);
    tl.set(spiral.uUvOffsetX, { value: c.spiralStartX }, spiralStart);
    tl.to(
      spiral.uUvOffsetX,
      { value: c.spiralEndX, duration: c.spiralDuration, ease: 'linear' },
      spiralStart
    );
    if (spiralMesh) tl.set(spiralMesh, { visible: false }, spiralEnd);
  }

  // Gameplay resumes when the CHARACTER finishes — independent of the spiral,
  // so a longer spiral never delays the physics/controls coming back
  if (onComplete) tl.call(onComplete, undefined, charEnd);

  return tl;
};

// Play the full animation from the start (used by the real respawn + Play btn)
export const playRespawnAnimation = (callbacks = {}) => {
  masterTimeline?.kill();
  masterTimeline = buildRespawnTimeline({ ...callbacks, paused: false });
  return masterTimeline;
};

// Seek the animation to an arbitrary [0, 1] moment (progress scrubber)
export const scrubRespawnAnimation = progress => {
  lastProgress = progress;
  masterTimeline?.kill();
  masterTimeline = buildRespawnTimeline({ paused: true });
  masterTimeline.progress(progress).pause();
};

// Rebuild the paused preview at the current frame — call after editing a
// build-time value (durations, delays, offsets, thickness) so the change is
// visible immediately while scrubbing. Never interrupts an active Play.
export const refreshRespawnAnimation = () => {
  if (masterTimeline && masterTimeline.isActive()) return;
  scrubRespawnAnimation(lastProgress);
};

// Stop the animation and return to the resting state (formed character, no
// spiral) — the normal in-game look
export const resetRespawnAnimation = () => {
  masterTimeline?.kill();
  masterTimeline = null;
  lastProgress = 1;

  const { character, spiral, spiralMesh } = getTargets();
  if (character) {
    character.uProgress.value = 0;
    character.uCharFormProgress.value = 1;
  }
  if (spiral) {
    spiral.uUvOffsetX.value = respawnConfig.spiralStartX;
  }
  if (spiralMesh) {
    spiralMesh.visible = false;
  }
  spawnLightUniforms.uSpawnLightIntensity.value = 0;
};
