import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three/webgpu';
import {
  Discard,
  Fn,
  If,
  materialColor,
  max,
  texture,
  uniform,
  vec4,
} from 'three/tsl';

import { useStore } from '#store/ZustandStorage.jsx';
import { useControls } from '#utils/useControls.jsx';
import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import { toNodeMaterial } from '#utils/nodeMaterials.js';
import { dissolveLava } from '#shaders/character/dissolve.js';

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

  const { magicBooksMaterial, uniforms } = useMemo(() => {
    // The lava pattern comes from the bind-pose position normalized into the
    // mesh bounds (pre-skinning)
    const geometry = island.nodes.island_10.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();

    // TSL uniform nodes (the timeline tweens their .value). Voronoi (R) and
    // perlin (G) share one packed texture
    const noise = texture(noiseTexture);
    const uniforms = {
      uVoronoiTexture: noise,
      uPerlinTexture: noise,
      uColor: uniform(new THREE.Color(BOOKS_DISSOLVE_DEFAULTS.color)),
      uIntensity: uniform(BOOKS_DISSOLVE_DEFAULTS.intensity),
      uRepeat: uniform(BOOKS_DISSOLVE_DEFAULTS.repeat),
      uPerlinScale: uniform(BOOKS_DISSOLVE_DEFAULTS.perlinScale),
      uPerlinStrength: uniform(BOOKS_DISSOLVE_DEFAULTS.perlinStrength),
      uPerlinSpeed: uniform(BOOKS_DISSOLVE_DEFAULTS.perlinSpeed),
      uTime: uniform(0),
      uThickness: uniform(0),
      // Hidden at rest: no lava, no books, until the glyphs activate
      uProgress: uniform(0),
      // Book opacity: 0 = hidden, 1 = fully formed
      uFormProgress: uniform(0),
      // Lava layer fade: 1 = full, 0 = invisible
      uLavaOpacity: uniform(1),
      uAlphaClip: uniform(BOOKS_DISSOLVE_DEFAULTS.alphaClip),
    };

    // Node twin of a clone of the shared GLB material (map included)
    const magicBooksMaterial = toNodeMaterial(
      island.materials.magicBooks.clone()
    );
    magicBooksMaterial.transparent = true;

    const lava = dissolveLava(
      uniforms,
      uniform(geometry.boundingBox.min.clone()),
      uniform(geometry.boundingBox.max.clone())
    );

    // Book fades in underneath, lava is composited ON TOP (over operator),
    // not crossfaded — both are visible at once mid-animation
    magicBooksMaterial.colorNode = Fn(() => {
      const lavaA = lava.a.mul(uniforms.uLavaOpacity).toVar();
      const books = vec4(materialColor).toVar();
      const booksA = books.a.mul(uniforms.uFormProgress);

      const outA = lavaA.add(booksA.mul(lavaA.oneMinus())).toVar();
      const outRGB = lava.rgb
        .mul(lavaA)
        .add(books.rgb.mul(booksA).mul(lavaA.oneMinus()))
        .div(max(outA, 1e-5));

      If(outA.lessThan(uniforms.uAlphaClip), () => {
        Discard();
      });

      return vec4(outRGB, outA);
    })();

    return { magicBooksMaterial, uniforms };
  }, [island, noiseTexture]);

  useEffect(() => () => magicBooksMaterial.dispose(), [magicBooksMaterial]);

  const timelineRef = useRef(null);

  // One continuous motion, lava layered on top of the fading-in book:
  // phase 1 (dissolveDuration) — voronoi grows to full while book opacity
  // rises 0 -> 0.5; phase 2 (formDuration) — book opacity 0.5 -> 1 while the
  // lava layer fades out to invisible (uLavaOpacity, not a pattern recede)
  const playBooksDissolve = (delay = 0) => {
    const u = uniforms;
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

    const u = uniforms;
    u.uProgress.value = 0;
    u.uFormProgress.value = 0;
    u.uThickness.value = 0;
    u.uLavaOpacity.value = 1;
  };

  useControls('MagicBooks', {
    Play: () => playBooksDissolve(),
    'Reset Animation': () => resetBooksDissolve(),
    intensity: {
      value: BOOKS_DISSOLVE_DEFAULTS.intensity,
      min: 0,
      max: 100,
      step: 0.1,
      onChange: value => {
        uniforms.uIntensity.value = value;
      },
    },
    color: {
      value: BOOKS_DISSOLVE_DEFAULTS.color,
      onChange: value => {
        uniforms.uColor.value.set(value);
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
  });

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
    const u = uniforms;
    if (u.uProgress.value > 0 && u.uLavaOpacity.value > 0) {
      u.uTime.value = state.elapsed;
    }
  });

  return (
    <skinnedMesh
      name="island_10"
      geometry={island.nodes.island_10.geometry}
      material={magicBooksMaterial}
      skeleton={island.nodes.island_10.skeleton}
      morphTargetDictionary={island.nodes.island_10.morphTargetDictionary}
      morphTargetInfluences={island.nodes.island_10.morphTargetInfluences}
    />
  );
};

export { MagicBooks };
