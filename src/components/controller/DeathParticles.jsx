import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

import { useStore } from '#store/ZustandStorage.jsx';
import { useControls } from '#utils/useControls.jsx';
import {
  DESPAWN_DEFAULTS,
  despawnConfig,
  playDespawnAnimation,
  scrubDespawnAnimation,
  refreshDespawnAnimation,
  resetDespawnAnimation,
} from '#controller/despawnAnimation.js';

import vertexShader from '#shaders/deathParticles/vertex.glsl';
import fragmentShader from '#shaders/deathParticles/fragment.glsl';

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
  const meshRef = useRef();
  const materialRef = useRef();

  // All runtime mutations go through the MATERIAL's uniforms: R3F diffs the
  // `uniforms` prop per entry, so the memo passed as prop is not guaranteed
  // to share references with material.uniforms
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uSize: { value: DEATH_PARTICLES_DEFAULTS.size },
      uRiseHeight: { value: DEATH_PARTICLES_DEFAULTS.riseHeight },
      uColor: { value: new THREE.Color(DEATH_PARTICLES_DEFAULTS.color) },
      uIntensity: { value: DEATH_PARTICLES_DEFAULTS.intensity },
      uResolution: { value: new THREE.Vector2(1, 1) },
    }),
    []
  );

  const withUniforms = updater => {
    if (materialRef.current) updater(materialRef.current.uniforms);
  };

  // Keep the point sizes correct across resizes and dpr changes
  const size = useThree(state => state.size);
  const dpr = useThree(state => state.viewport.dpr);
  useEffect(() => {
    withUniforms(u => u.uResolution.value.set(size.width * dpr, size.height * dpr));
  }, [size, dpr]);

  // Registered in the store so the death sequence (CharacterController) and
  // the debug helpers can position and play the burst. The material instance
  // holds the live uniforms (see above)
  useEffect(() => {
    const materialUniforms = materialRef.current.uniforms;
    useStore.setState({
      deathParticlesMesh: meshRef.current,
      deathParticlesUniforms: materialUniforms,
    });

    return () => {
      gsap.killTweensOf(materialUniforms.uProgress);
      useStore.setState({
        deathParticlesMesh: null,
        deathParticlesUniforms: null,
      });
    };
  }, []);

  const d = DEATH_PARTICLES_DEFAULTS;

  // Despawn build-time values are baked into its timeline; re-apply the
  // current scrub frame after a change so the tweak is visible immediately
  const setDespawnConfig = (key, value) => {
    despawnConfig[key] = value;
    refreshDespawnAnimation();
  };

  const controls = useControls(
    'Player Death',
    {
      // Full death preview (character despawn + dust burst in parallel) at
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

      // Dust burst — rebuilds the geometry (new random spread) when changed
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
    },
    { collapsed: true }
  );

  const bufferAttributes = useMemo(() => {
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

    return { positions, scales, randoms };
  }, [controls.count]);

  return (
    <points ref={meshRef} visible={false} frustumCulled={false}>
      {/* Keyed on count so a count change rebuilds the buffers cleanly */}
      <bufferGeometry key={controls.count}>
        <bufferAttribute
          attach="attributes-position"
          args={[bufferAttributes.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aScale"
          args={[bufferAttributes.scales, 1]}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          args={[bufferAttributes.randoms, 3]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export { DeathParticles };
