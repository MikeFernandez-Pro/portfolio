import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { settingControls } from '#debug/settingControls.js';
import { useStore } from '#store';
import {
  RESPAWN_DEFAULTS,
  respawnConfig,
  playRespawnAnimation,
  scrubRespawnAnimation,
  resetRespawnAnimation,
  refreshRespawnAnimation,
} from './respawnAnimation.js';
import {
  deathConfig,
  playDeathAnimation,
  scrubDeathAnimation,
  refreshDeathAnimation,
  resetDeathAnimation,
} from './deathAnimation.js';
import {
  playDeathParticles,
  resetDeathParticles,
  scrubDeathParticles,
} from './DeathParticles.jsx';
import { SPAWN_POINT } from './deathCycle.js';
import { targets } from './targets.js';

// Targets register once their models load: these resolve them on change
const charControl = uniformControls(() => targets.dissolve);
const spiralControl = uniformControls(() => targets.spiral?.uniforms);

// Debug preview of a death at the character's current position (the spawn
// point before it moved): it dissolves away while the death particles rise,
// then forms back in place once both are done (no teleport, no respawn)
const playDeathPreview = () => {
  const position = useStore.getState().characterPosition ?? SPAWN_POINT;
  const death = playDeathAnimation();
  const particles = playDeathParticles(position);
  // gsap tweens/timelines are thenable
  Promise.all([death, particles].filter(Boolean)).then(() =>
    resetDeathAnimation()
  );
};

// Build-time values are baked into the timelines; after changing one,
// re-apply the current scrub frame so the tweak is visible immediately
const respawnControl = settingControls(respawnConfig, () =>
  refreshRespawnAnimation()
);
const deathControl = settingControls(deathConfig, () =>
  refreshDeathAnimation()
);

/**
 * Debug folders previewing the death cycle: Play / Reset buttons, progress
 * scrubbers, durations and the dissolve and spiral look. Debug only: the
 * values here are the defaults the targets are created with. Renders
 * nothing.
 */
const DeathCycleControls = () => {
  useControls('Character Death', {
    // Death at the character's current position, formed back in place
    Play: () => playDeathPreview(),
    'Reset Animation': () => {
      resetDeathParticles();
      resetDeathAnimation();
    },
    // Freeze the dissolve and the particles at any moment (0 = alive,
    // 1 = fully gone)
    progress: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: v => {
        scrubDeathParticles(v);
        scrubDeathAnimation(v);
      },
    },
    // The lava look (color, intensity, noise) is shared with the respawn
    // and lives in the Respawn Animation folder
    deathDissolve: deathControl('dissolveDuration', 0.1, 4, 0.01),
    deathFade: deathControl('fadeDuration', 0.1, 4, 0.01),
    deathThickness: deathControl('thickness', 0.01, 1, 0.01),
  });

  useControls('Respawn Animation', {
    Play: () => playRespawnAnimation(),
    'Reset Animation': () => resetRespawnAnimation(),
    // Scrub to any moment of the animation. Defaults to 1 (resting/formed)
    progress: {
      value: 1,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: value => scrubRespawnAnimation(value),
    },

    // Durations
    charDelay: respawnControl('charDelay', 0, 2, 0.01),
    charDissolveDuration: respawnControl('charProgressDuration', 0.1, 4, 0.01),
    charFormDuration: respawnControl('charRespawnDuration', 0.1, 4, 0.01),
    // Spiral timing — fully independent of the character
    spiralDelay: respawnControl('spiralDelay', 0, 2, 0.01),
    spiralDuration: respawnControl('spiralDuration', 0.1, 4, 0.01),
    spiralStartX: respawnControl('spiralStartX', -2, 2, 0.01),
    spiralEndX: respawnControl('spiralEndX', -2, 2, 0.01),

    // Character look (only visible during the dissolve)
    charColor: charControl('uColor', RESPAWN_DEFAULTS.charColor),
    charIntensity: charControl(
      'uIntensity',
      RESPAWN_DEFAULTS.charIntensity,
      0,
      100,
      0.1
    ),
    voronoiScale: charControl(
      'uRepeat',
      RESPAWN_DEFAULTS.charRepeat,
      0,
      10,
      0.01
    ),
    perlinScale: charControl(
      'uPerlinScale',
      RESPAWN_DEFAULTS.charPerlinScale,
      0.1,
      20,
      0.1
    ),
    perlinStrength: charControl(
      'uPerlinStrength',
      RESPAWN_DEFAULTS.charPerlinStrength,
      0,
      2,
      0.01
    ),
    perlinSpeed: charControl(
      'uPerlinSpeed',
      RESPAWN_DEFAULTS.charPerlinSpeed,
      0,
      1,
      0.01
    ),
    // Animated peak: thickness ramps 0 -> this -> 0 across the respawn
    voronoiThickness: respawnControl('charThickness', 0.01, 1, 0.01),
    // Fragments below this alpha are discarded (don't write depth), which
    // removes the silhouette of the still-invisible character
    alphaClip: charControl(
      'uAlphaClip',
      RESPAWN_DEFAULTS.alphaClip,
      0,
      1,
      0.01
    ),
    // Manual voronoi reveal (0 = none, 1 = full lava pattern). Timeline-driven
    // during Play/scrub, so this is for static inspection
    voronoiProgress: charControl('uProgress', 0, 0, 1, 0.01),
    // Manual character form (0 = only lava, 1 = formed character). Also
    // timeline-driven; for static inspection.
    uCharFormProgress: charControl('uCharFormProgress', 1, 0, 1, 0.01),

    // Spiral look
    spiralColor: spiralControl('uColor', RESPAWN_DEFAULTS.spiralColor),
    spiralIntensity: spiralControl(
      'uEmissiveIntensity',
      RESPAWN_DEFAULTS.spiralEmissive,
      0,
      20,
      0.01
    ),
  });

  return null;
};

export { DeathCycleControls };
