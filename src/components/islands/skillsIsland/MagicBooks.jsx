import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { useControls } from '#utils/useControls.jsx';
import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';

import magicBooksVertexShader from '#shaders/magicBooks/vertex.glsl';
import magicBooksFragmentShader from '#shaders/magicBooks/fragment.glsl';

// Same voronoi lava dissolve as the character respawn (respawnAnimation.js),
// scoped to the books: hidden at rest, the glyph activation grows the lava in
// and then forms the real books over it. These are the production defaults —
// the headless useControls fires each onChange once with them.
const BOOKS_DISSOLVE_DEFAULTS = {
  // Timing (seconds)
  delay: 0.4, // start offset after the glyph activation
  dissolveDuration: 1, // lava grows in, book opacity 0 -> 0.5
  formDuration: 1, // book opacity 0.5 -> 1 while the lava fades out
  // Look
  color: '#ff3600',
  intensity: 80,
  repeat: 0, // voronoi pattern scale
  perlinScale: 1.5, // perlin warp scale
  perlinStrength: 1, // perlin UV warp strength
  perlinSpeed: 0.12, // perlin scroll speed
  thickness: 0.2, // voronoi dissolve edge softness (animated peak)
  alphaClip: 0.01, // discard ~fully-transparent fragments (kills the
  // silhouette of the still-hidden books)
};

// Live, mutable copy the controls edit and the timeline reads at build time
const booksDissolveConfig = { ...BOOKS_DISSOLVE_DEFAULTS };

const MagicBooks = props => {
  const { island } = props;

  // Voronoi (R) and perlin (G) share one packed texture; both sampler
  // uniforms point at it (same texture the character respawn uses)
  const noiseTexture = useVoronoiPerlinTexture();

  const magicBooksShaderMaterial = useMemo(() => {
    // Triplanar UVs come from the bind-pose position normalized into the
    // mesh bounds (csm_Position is pre-skinning)
    const geometry = island.nodes.island_10.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();

    // CSM patches the base material instance in place, so clone the shared
    // GLB material to keep the original pristine (StrictMode/HMR safe)
    return new CustomShaderMaterial({
      baseMaterial: island.materials.magicBooks.clone(),
      vertexShader: magicBooksVertexShader,
      fragmentShader: magicBooksFragmentShader,
      uniforms: {
        uVoronoiTexture: { value: noiseTexture },
        uPerlinTexture: { value: noiseTexture },
        uBoundsMin: { value: geometry.boundingBox.min.clone() },
        uBoundsMax: { value: geometry.boundingBox.max.clone() },
        uColor: { value: new THREE.Color(BOOKS_DISSOLVE_DEFAULTS.color) },
        uIntensity: { value: BOOKS_DISSOLVE_DEFAULTS.intensity },
        uRepeat: { value: BOOKS_DISSOLVE_DEFAULTS.repeat },
        uPerlinScale: { value: BOOKS_DISSOLVE_DEFAULTS.perlinScale },
        uPerlinStrength: { value: BOOKS_DISSOLVE_DEFAULTS.perlinStrength },
        uPerlinSpeed: { value: BOOKS_DISSOLVE_DEFAULTS.perlinSpeed },
        uTime: { value: 0 },
        uThickness: { value: 0 },
        // Hidden at rest: no lava, no books, until the glyphs activate
        uProgress: { value: 0 },
        uFormProgress: { value: 0 },
        uLavaOpacity: { value: 1 },
        uAlphaClip: { value: BOOKS_DISSOLVE_DEFAULTS.alphaClip },
      },
      toneMapped: false,
      transparent: true,
    });
  }, [island, noiseTexture]);

  const timelineRef = useRef(null);

  // One continuous motion, lava layered on top of the fading-in book:
  // phase 1 (dissolveDuration) — voronoi grows to full while book opacity
  // rises 0 -> 0.5; phase 2 (formDuration) — book opacity 0.5 -> 1 while the
  // lava layer fades out to invisible (uLavaOpacity, not a pattern recede)
  const playBooksDissolve = (delay = 0) => {
    const u = magicBooksShaderMaterial.uniforms;
    const c = booksDissolveConfig;

    timelineRef.current?.kill();
    const tl = gsap.timeline({ delay });

    tl.set(u.uProgress, { value: 0 }, 0);
    tl.set(u.uFormProgress, { value: 0 }, 0);
    tl.set(u.uThickness, { value: 0 }, 0);
    tl.set(u.uLavaOpacity, { value: 1 }, 0);

    tl.to(
      u.uProgress,
      { value: 1, duration: c.dissolveDuration, ease: 'power1.out' },
      0
    );
    tl.to(
      u.uThickness,
      { value: c.thickness, duration: c.dissolveDuration, ease: 'linear' },
      0
    );
    tl.to(
      u.uFormProgress,
      { value: 0.5, duration: c.dissolveDuration, ease: 'linear' },
      0
    );

    tl.to(
      u.uFormProgress,
      { value: 1, duration: c.formDuration, ease: 'linear' },
      c.dissolveDuration
    );
    tl.to(
      u.uLavaOpacity,
      { value: 0, duration: c.formDuration, ease: 'linear' },
      c.dissolveDuration
    );

    timelineRef.current = tl;
  };

  // Back to the pre-activation resting state (hidden books), ready to replay
  const resetBooksDissolve = () => {
    timelineRef.current?.kill();
    timelineRef.current = null;

    const u = magicBooksShaderMaterial.uniforms;
    u.uProgress.value = 0;
    u.uFormProgress.value = 0;
    u.uThickness.value = 0;
    u.uLavaOpacity.value = 1;
  };

  useControls(
    'MagicBooks',
    {
      Play: () => playBooksDissolve(),
      'Reset Animation': () => resetBooksDissolve(),
      intensity: {
        value: BOOKS_DISSOLVE_DEFAULTS.intensity,
        min: 0,
        max: 100,
        step: 0.1,
        onChange: value => {
          magicBooksShaderMaterial.uniforms.uIntensity.value = value;
        },
      },
      color: {
        value: BOOKS_DISSOLVE_DEFAULTS.color,
        onChange: value => {
          magicBooksShaderMaterial.uniforms.uColor.value.set(value);
        },
      },
      // Build-time values, read when the next Play/activation builds its
      // timeline
      dissolveDuration: {
        value: BOOKS_DISSOLVE_DEFAULTS.dissolveDuration,
        min: 0.1,
        max: 4,
        step: 0.01,
        onChange: value => {
          booksDissolveConfig.dissolveDuration = value;
        },
      },
      formDuration: {
        value: BOOKS_DISSOLVE_DEFAULTS.formDuration,
        min: 0.1,
        max: 4,
        step: 0.01,
        onChange: value => {
          booksDissolveConfig.formDuration = value;
        },
      },
      // Animated peak: thickness ramps 0 -> this -> 0 across the dissolve
      thickness: {
        value: BOOKS_DISSOLVE_DEFAULTS.thickness,
        min: 0.01,
        max: 1,
        step: 0.01,
        onChange: value => {
          booksDissolveConfig.thickness = value;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  useEffect(() => {
    // Subscribe to magicGlyphActivation zustand store state
    const unsubMagicPlateActivation = useStore.subscribe(
      state => state.magicGlyphActivation,
      () => {
        playBooksDissolve(booksDissolveConfig.delay);
      }
    );

    // Clear subscriptions on unmount
    return () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      unsubMagicPlateActivation();
    };
  }, []);

  // The perlin scroll only shows while lava is visible — skip the uniform
  // write the rest of the time (per-frame discipline)
  useFrame(state => {
    const u = magicBooksShaderMaterial.uniforms;
    if (u.uProgress.value > 0 && u.uLavaOpacity.value > 0) {
      u.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <skinnedMesh
      name="island_10"
      geometry={island.nodes.island_10.geometry}
      material={magicBooksShaderMaterial}
      skeleton={island.nodes.island_10.skeleton}
      morphTargetDictionary={island.nodes.island_10.morphTargetDictionary}
      morphTargetInfluences={island.nodes.island_10.morphTargetInfluences}
    />
  );
};

export { MagicBooks };
