import { useControls } from '#debug/useControls.jsx';
import {
  RESPAWN_DEFAULTS,
  respawnConfig,
  playRespawnAnimation,
  scrubRespawnAnimation,
  resetRespawnAnimation,
  refreshRespawnAnimation,
} from './respawnAnimation.js';
import {
  DEATH_DEFAULTS,
  deathConfig,
  scrubDeathAnimation,
  refreshDeathAnimation,
  resetDeathAnimation,
} from './deathAnimation.js';
import { resetDeathParticles, scrubDeathParticles } from './DeathParticles.jsx';
import { playDeathPreview } from './deathCycle.js';
import { targets } from './targets.js';

// Targets register once their models load, so every setter guards against
// them being missing yet
const withChar = updater => {
  if (targets.dissolve) updater(targets.dissolve);
};
const withSpiral = updater => {
  if (targets.spiral) updater(targets.spiral.uniforms);
};

// Build-time values are baked into the timelines; after changing one,
// re-apply the current scrub frame so the tweak is visible immediately
const setRespawnConfig = (key, value) => {
  respawnConfig[key] = value;
  refreshRespawnAnimation();
};
const setDeathConfig = (key, value) => {
  deathConfig[key] = value;
  refreshDeathAnimation();
};

/**
 * Debug folders previewing the death cycle: Play / Reset buttons, progress
 * scrubbers, durations and the dissolve and spiral look. Debug only: the
 * values here are the defaults the targets are created with. Renders
 * nothing.
 */
const DeathCycleControls = () => {
  useControls('Player Death', {
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
    deathDissolve: {
      value: DEATH_DEFAULTS.dissolveDuration,
      min: 0.1,
      max: 4,
      step: 0.01,
      onChange: v => setDeathConfig('dissolveDuration', v),
    },
    deathFade: {
      value: DEATH_DEFAULTS.fadeDuration,
      min: 0.1,
      max: 4,
      step: 0.01,
      onChange: v => setDeathConfig('fadeDuration', v),
    },
    deathThickness: {
      value: DEATH_DEFAULTS.thickness,
      min: 0.01,
      max: 1,
      step: 0.01,
      onChange: v => setDeathConfig('thickness', v),
    },
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
    charDelay: {
      value: RESPAWN_DEFAULTS.charDelay,
      min: 0,
      max: 2,
      step: 0.01,
      onChange: value => setRespawnConfig('charDelay', value),
    },
    charDissolveDuration: {
      value: RESPAWN_DEFAULTS.charProgressDuration,
      min: 0.1,
      max: 4,
      step: 0.01,
      onChange: value => setRespawnConfig('charProgressDuration', value),
    },
    charFormDuration: {
      value: RESPAWN_DEFAULTS.charRespawnDuration,
      min: 0.1,
      max: 4,
      step: 0.01,
      onChange: value => setRespawnConfig('charRespawnDuration', value),
    },
    // Spiral timing — fully independent of the character
    spiralDelay: {
      value: RESPAWN_DEFAULTS.spiralDelay,
      min: 0,
      max: 2,
      step: 0.01,
      onChange: value => setRespawnConfig('spiralDelay', value),
    },
    spiralDuration: {
      value: RESPAWN_DEFAULTS.spiralDuration,
      min: 0.1,
      max: 4,
      step: 0.01,
      onChange: value => setRespawnConfig('spiralDuration', value),
    },
    spiralStartX: {
      value: RESPAWN_DEFAULTS.spiralStartX,
      min: -2,
      max: 2,
      step: 0.01,
      onChange: value => setRespawnConfig('spiralStartX', value),
    },
    spiralEndX: {
      value: RESPAWN_DEFAULTS.spiralEndX,
      min: -2,
      max: 2,
      step: 0.01,
      onChange: value => setRespawnConfig('spiralEndX', value),
    },

    // Character look (only visible during the dissolve)
    charColor: {
      value: RESPAWN_DEFAULTS.charColor,
      onChange: value => withChar(u => u.uColor.value.set(value)),
    },
    charIntensity: {
      value: RESPAWN_DEFAULTS.charIntensity,
      min: 0,
      max: 100,
      step: 0.1,
      onChange: value =>
        withChar(u => {
          u.uIntensity.value = value;
        }),
    },
    voronoiScale: {
      value: RESPAWN_DEFAULTS.charRepeat,
      min: 0,
      max: 10,
      step: 0.01,
      onChange: value =>
        withChar(u => {
          u.uRepeat.value = value;
        }),
    },
    perlinScale: {
      value: RESPAWN_DEFAULTS.charPerlinScale,
      min: 0.1,
      max: 20,
      step: 0.1,
      onChange: value =>
        withChar(u => {
          u.uPerlinScale.value = value;
        }),
    },
    perlinStrength: {
      value: RESPAWN_DEFAULTS.charPerlinStrength,
      min: 0,
      max: 2,
      step: 0.01,
      onChange: value =>
        withChar(u => {
          u.uPerlinStrength.value = value;
        }),
    },
    perlinSpeed: {
      value: RESPAWN_DEFAULTS.charPerlinSpeed,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: value =>
        withChar(u => {
          u.uPerlinSpeed.value = value;
        }),
    },
    // Animated peak: thickness ramps 0 -> this -> 0 across the respawn
    voronoiThickness: {
      value: RESPAWN_DEFAULTS.charThickness,
      min: 0.01,
      max: 1,
      step: 0.01,
      onChange: value => setRespawnConfig('charThickness', value),
    },
    // Fragments below this alpha are discarded (don't write depth), which
    // removes the silhouette of the still-invisible character
    alphaClip: {
      value: RESPAWN_DEFAULTS.alphaClip,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: value =>
        withChar(u => {
          u.uAlphaClip.value = value;
        }),
    },
    // Manual voronoi reveal (0 = none, 1 = full lava pattern). Timeline-driven
    // during Play/scrub, so this is for static inspection
    voronoiProgress: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: value =>
        withChar(u => {
          u.uProgress.value = value;
        }),
    },
    // Manual character form (0 = only lava, 1 = formed character). Also
    // timeline-driven; for static inspection.
    uCharFormProgress: {
      value: 1,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: value =>
        withChar(u => {
          u.uCharFormProgress.value = value;
        }),
    },

    // Spiral look
    spiralColor: {
      value: RESPAWN_DEFAULTS.spiralColor,
      onChange: value => withSpiral(u => u.uColor.value.set(value)),
    },
    spiralIntensity: {
      value: RESPAWN_DEFAULTS.spiralEmissive,
      min: 0,
      max: 20,
      step: 0.01,
      onChange: value =>
        withSpiral(u => {
          u.uEmissiveIntensity.value = value;
        }),
    },
  });

  return null;
};

export { DeathCycleControls };
