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
import { uniformControls } from '#debug/uniformControls.js';
import { settingControls } from '#debug/settingControls.js';
import { CHARACTER_CAPSULE } from '#character/hooks/useCharacterBody.js';
import { registerDeathParticles, targets } from './targets.js';
import { RESPAWN_DEFAULTS } from './respawnAnimation.js';
import {
  createGlowPointsMaterial,
  createParticleSprite,
  particleAttribute,
  pointCoord,
} from '#utils/pointSprites.js';

// Death particles: when the character dies, it vanishes and this cloud of
// glowing motes rises and fades from where it stood. Hidden at rest; the
// death cycle positions and plays it through playDeathParticles.

const PARTICLES_COUNT = 30;

// The particles spawn inside the character's collider capsule (local space)
const CAPSULE_RADIUS = CHARACTER_CAPSULE.radius;
const CAPSULE_Y_MIN =
  CHARACTER_CAPSULE.offsetY -
  CHARACTER_CAPSULE.halfHeight -
  CHARACTER_CAPSULE.radius;
const CAPSULE_Y_MAX =
  CHARACTER_CAPSULE.offsetY +
  CHARACTER_CAPSULE.halfHeight +
  CHARACTER_CAPSULE.radius;

const DEATH_PARTICLES_DEFAULTS = {
  duration: 1,
  riseHeight: 0.69,
  size: 0.044,
  color: RESPAWN_DEFAULTS.charColor, // matches the respawn voronoi lava
  intensity: 9.01, // > bloom threshold (2) so the motes glow
};

// Live, mutable copy the controls edit and playDeathParticles reads
const deathParticlesConfig = { ...DEATH_PARTICLES_DEFAULTS };

// Play the burst at the given world position ({x, y, z}); returns the gsap
// tween (or null when the system is not mounted yet)
export const playDeathParticles = position => {
  if (!targets.particles) return null;
  const { mesh, uniforms } = targets.particles;

  mesh.position.set(position.x, position.y, position.z);
  mesh.visible = true;

  const progress = uniforms.uProgress;
  gsap.killTweensOf(progress);
  progress.value = 0;
  return gsap.to(progress, {
    value: 1,
    duration: deathParticlesConfig.duration,
    // Linear: the per-particle pacing (delays, fade curve) lives in the shader
    ease: 'none',
    onComplete: () => {
      mesh.visible = false;
    },
  });
};

// Stop the burst and return to the resting state (no particles)
export const resetDeathParticles = () => {
  if (!targets.particles) return;
  const { mesh, uniforms } = targets.particles;
  gsap.killTweensOf(uniforms.uProgress);
  uniforms.uProgress.value = 0;
  mesh.visible = false;
};

// Freeze the burst at an arbitrary [0, 1] moment (progress scrubber). The
// burst is placed at the character's current position when it appears
export const scrubDeathParticles = progress => {
  if (!targets.particles) return;
  const { mesh, uniforms } = targets.particles;
  const { characterPosition } = useStore.getState();

  if (!mesh.visible && progress > 0 && characterPosition) {
    mesh.position.set(
      characterPosition.x,
      characterPosition.y,
      characterPosition.z
    );
  }
  gsap.killTweensOf(uniforms.uProgress);
  uniforms.uProgress.value = progress;
  mesh.visible = progress > 0;
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

  const d = DEATH_PARTICLES_DEFAULTS;
  const control = uniformControls(uniforms);
  const setting = settingControls(deathParticlesConfig);

  // Shares the 'Character Death' folder with the death timeline controls
  // (DeathCycleControls)
  const controls = useControls('Character Death', {
    // Death particles — rebuild the geometry (new random spread) when changed
    count: { value: PARTICLES_COUNT, min: 10, max: 500, step: 10 },
    particlesDuration: setting('duration', 0.2, 3, 0.01),
    riseHeight: control('uRiseHeight', d.riseHeight, 0.2, 4, 0.01),
    size: control('uSize', d.size, 0.01, 0.3, 0.001),
    color: control('uColor', d.color),
    intensity: control('uIntensity', d.intensity, 1, 10, 0.01),
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

    const material = createGlowPointsMaterial();

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

    // Dust motes shrink as they rise
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

  // The death cycle positions and plays the burst
  useEffect(() => {
    const unregister = registerDeathParticles({ mesh: particles, uniforms });
    return () => {
      gsap.killTweensOf(uniforms.uProgress);
      unregister();
    };
  }, [particles, uniforms]);

  return <primitive object={particles} />;
};

export { DeathParticles };
