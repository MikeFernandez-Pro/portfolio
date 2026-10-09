import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import {
  clamp,
  cos,
  distance,
  float,
  PI2,
  sin,
  smoothstep,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import gsap from 'gsap';

import { useStore } from '#store';
import { useControls } from '#debug/useControls.jsx';
import {
  DESPAWN_DEFAULTS,
  despawnConfig,
  playDespawnAnimation,
  scrubDespawnAnimation,
  refreshDespawnAnimation,
  resetDespawnAnimation,
} from '#character/deathCycle/despawnAnimation.js';
import {
  createParticleSprite,
  particleAttribute,
  pointCoord,
} from '#utils/pointSprites.js';

// One-shot disintegration burst: when the character dies, it vanishes and
// this cloud of glowing dust rises and fades from where it stood. Hidden at
// rest; CharacterController positions and plays it through
// playDeathParticles.

const PARTICLES_COUNT = 30;

// Character capsule the particles spawn in (local space, matches the
// collider in CharacterController: radius 0.25 + half-height 0.3 at y 0.58)
const CAPSULE_RADIUS = 0.25;
const CAPSULE_Y_MIN = 0.05;
const CAPSULE_Y_MAX = 1.1;

export const DEATH_PARTICLES_DEFAULTS = {
  duration: 1,
  riseHeight: 0.69,
  size: 0.044,
  color: '#25c447', // matches the respawn voronoi lava
  intensity: 9.01, // > bloom threshold (2) so the motes glow
};

// Live, mutable copy the controls edit and playDeathParticles reads
const deathParticlesConfig = { ...DEATH_PARTICLES_DEFAULTS };

// Play the burst at the given world position ({x, y, z}); returns the gsap
// tween (or null when the system is not mounted yet)
export const playDeathParticles = position => {
  const { deathParticlesMesh, deathParticlesUniforms } = useStore.getState();
  if (!deathParticlesMesh || !deathParticlesUniforms) return null;

  deathParticlesMesh.position.set(position.x, position.y, position.z);
  deathParticlesMesh.visible = true;

  const progress = deathParticlesUniforms.uProgress;
  gsap.killTweensOf(progress);
  progress.value = 0;
  return gsap.to(progress, {
    value: 1,
    duration: deathParticlesConfig.duration,
    // Linear: the per-particle pacing (delays, fade curve) lives in the shader
    ease: 'none',
    onComplete: () => {
      deathParticlesMesh.visible = false;
    },
  });
};

// Stop the burst and return to the resting state (no dust)
export const resetDeathParticles = () => {
  const { deathParticlesMesh, deathParticlesUniforms } = useStore.getState();
  if (!deathParticlesMesh || !deathParticlesUniforms) return;
  gsap.killTweensOf(deathParticlesUniforms.uProgress);
  deathParticlesUniforms.uProgress.value = 0;
  deathParticlesMesh.visible = false;
};

// Freeze the burst at an arbitrary [0, 1] moment (progress scrubber). The
// burst is placed at the character's current position when it appears
export const scrubDeathParticles = progress => {
  const { deathParticlesMesh, deathParticlesUniforms, characterPosition } =
    useStore.getState();
  if (!deathParticlesMesh || !deathParticlesUniforms) return;

  if (!deathParticlesMesh.visible && progress > 0 && characterPosition) {
    deathParticlesMesh.position.set(
      characterPosition.x,
      characterPosition.y,
      characterPosition.z
    );
  }
  gsap.killTweensOf(deathParticlesUniforms.uProgress);
  deathParticlesUniforms.uProgress.value = progress;
  deathParticlesMesh.visible = progress > 0;
};

// Full death preview at the character's current position (falls back to
// spawn): the character despawns (formed -> voronoi -> gone) while the dust
// rises, exactly like a real death, then reforms once both are done. The
// real death path (CharacterController) plays the two animations itself —
// there the respawn animation reforms the character
const playPlayerDeathPreview = () => {
  const position = useStore.getState().characterPosition ?? {
    x: 0,
    y: 0.6,
    z: 0,
  };
  const despawn = playDespawnAnimation();
  const burst = playDeathParticles(position);
  // gsap tweens/timelines are thenable
  Promise.all([despawn, burst].filter(Boolean)).then(() =>
    resetDespawnAnimation()
  );
};

const DeathParticles = () => {
  // TSL uniform nodes, shared by every rebuild of the sprite (count control)
  const uniforms = useMemo(
    () => ({
      uProgress: uniform(0),
      uSize: uniform(DEATH_PARTICLES_DEFAULTS.size),
      uRiseHeight: uniform(DEATH_PARTICLES_DEFAULTS.riseHeight),
      uColor: uniform(new THREE.Color(DEATH_PARTICLES_DEFAULTS.color)),
      uIntensity: uniform(DEATH_PARTICLES_DEFAULTS.intensity),
    }),
    []
  );

  const withUniforms = updater => updater(uniforms);

  const d = DEATH_PARTICLES_DEFAULTS;

  // Despawn build-time values are baked into its timeline; re-apply the
  // current scrub frame after a change so the tweak is visible immediately
  const setDespawnConfig = (key, value) => {
    despawnConfig[key] = value;
    refreshDespawnAnimation();
  };

  const controls = useControls('Player Death', {
    // Full death preview (character despawn + death particles in parallel) at
    // the character's current position
    Play: () => playPlayerDeathPreview(),
    'Reset Animation': () => {
      resetDeathParticles();
      resetDespawnAnimation();
    },
    // Freeze both animations at any moment (0 = alive, 1 = fully gone)
    progress: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: v => {
        scrubDeathParticles(v);
        scrubDespawnAnimation(v);
      },
    },

    // Character despawn (reverse respawn dissolve, no spiral). The lava
    // look (color, intensity, noise) is shared with the respawn and lives
    // in the Respawn Animation folder
    despawnDissolve: {
      value: DESPAWN_DEFAULTS.dissolveDuration,
      min: 0.1,
      max: 4,
      step: 0.01,
      onChange: v => setDespawnConfig('dissolveDuration', v),
    },
    despawnFade: {
      value: DESPAWN_DEFAULTS.fadeDuration,
      min: 0.1,
      max: 4,
      step: 0.01,
      onChange: v => setDespawnConfig('fadeDuration', v),
    },
    despawnThickness: {
      value: DESPAWN_DEFAULTS.thickness,
      min: 0.01,
      max: 1,
      step: 0.01,
      onChange: v => setDespawnConfig('thickness', v),
    },

    // Death particles — rebuild the geometry (new random spread) when changed
    count: { value: PARTICLES_COUNT, min: 10, max: 500, step: 10 },
    particlesDuration: {
      value: d.duration,
      min: 0.2,
      max: 3,
      step: 0.01,
      onChange: v => (deathParticlesConfig.duration = v),
    },
    riseHeight: {
      value: d.riseHeight,
      min: 0.2,
      max: 4,
      step: 0.01,
      onChange: v => withUniforms(u => (u.uRiseHeight.value = v)),
    },
    size: {
      value: d.size,
      min: 0.01,
      max: 0.3,
      step: 0.001,
      onChange: v => withUniforms(u => (u.uSize.value = v)),
    },
    color: {
      value: d.color,
      onChange: v => withUniforms(u => u.uColor.value.set(v)),
    },
    intensity: {
      value: d.intensity,
      min: 1,
      max: 10,
      step: 0.01,
      onChange: v => withUniforms(u => (u.uIntensity.value = v)),
    },
  });

  const particles = useMemo(() => {
    const count = controls.count;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randoms = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Uniform spawn inside the character capsule (sqrt keeps the disc even)
      const radius = CAPSULE_RADIUS * Math.sqrt(Math.random());
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3 + 0] = Math.cos(angle) * radius;
      positions[i * 3 + 1] =
        CAPSULE_Y_MIN + Math.random() * (CAPSULE_Y_MAX - CAPSULE_Y_MIN);
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      scales[i] = 0.4 + Math.random() * 0.6;

      randoms[i * 3 + 0] = 0.6 + Math.random() * 0.8; // rise speed multiplier
      randoms[i * 3 + 1] = Math.random() * 0.4; // start delay
      randoms[i * 3 + 2] = Math.random(); // sway phase
    }

    const position = particleAttribute(positions, 3);
    const aScale = particleAttribute(scales, 1);
    // x: rise speed multiplier, y: start delay, z: sway phase
    const aRandom = particleAttribute(randoms, 3);

    const material = new THREE.PointsNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // Per-particle life: delayed start (staggers the burst), normalized so
    // every particle still ends its life exactly when uProgress reaches 1
    const life = clamp(
      uniforms.uProgress.sub(aRandom.y).div(float(1).sub(aRandom.y)),
      0,
      1
    );

    // Rise, with a gentle sway scaled by life so the burst starts tight on
    // the character silhouette and loosens as the dust climbs
    const phase = aRandom.z.mul(PI2);
    material.positionNode = position.add(
      vec3(
        sin(life.mul(9).add(phase)).mul(0.05).mul(life),
        life.mul(uniforms.uRiseHeight).mul(aRandom.x),
        cos(life.mul(7).add(phase)).mul(0.05).mul(life)
      )
    );

    // Dust motes shrink as they rise (gl_PointSize * uResolution.y / -viewZ)
    material.sizeNode = uniforms.uSize
      .mul(aScale)
      .mul(float(1).sub(life.mul(0.6)))
      .mul(2);

    // Soft round mote; quick pop in, long fade out over the rise. Intensity
    // pushes the color beyond 1 so the bloom pass makes it glow
    const strength = smoothstep(
      0.15,
      0.5,
      distance(pointCoord, vec2(0.5))
    ).oneMinus();
    const alpha = smoothstep(0, 0.08, life).mul(
      smoothstep(0.45, 1, life).oneMinus()
    );
    material.colorNode = vec4(
      uniforms.uColor.mul(uniforms.uIntensity),
      alpha.mul(strength)
    );

    const sprite = createParticleSprite(material, count);
    // Hidden at rest; playDeathParticles positions and shows it
    sprite.visible = false;
    return sprite;
  }, [controls.count, uniforms]);

  useEffect(() => () => particles.material.dispose(), [particles]);

  // Registered in the store so the death sequence (CharacterController) and
  // the debug helpers can position and play the burst
  useEffect(() => {
    useStore.setState({
      deathParticlesMesh: particles,
      deathParticlesUniforms: uniforms,
    });

    return () => {
      gsap.killTweensOf(uniforms.uProgress);
      useStore.setState({
        deathParticlesMesh: null,
        deathParticlesUniforms: null,
      });
    };
  }, [particles, uniforms]);

  return <primitive object={particles} />;
};

export { DeathParticles };
