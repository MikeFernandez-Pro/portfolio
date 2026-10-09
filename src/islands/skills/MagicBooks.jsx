import { useMemo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Discard, Fn, If, materialColor, max, uniform, vec4 } from 'three/tsl';

import { useStore } from '#store';
import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import { toNodeMaterial } from '#utils/nodeMaterials.js';
import { createDissolveUniforms, dissolveLava } from '#shaders/dissolve.js';

// Same voronoi lava dissolve as the character respawn (respawnAnimation.js),
// scoped to the books: hidden at rest, the awakening grows the lava in
// and then forms the real books over it. These are the production defaults —
// the headless useControls fires each onChange once with them.
const BOOKS_DISSOLVE_DEFAULTS = {
  // Timing (seconds)
  delay: 0.4, // start offset after the awakening
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

  // Packed voronoi (R) / perlin (G), the same texture the character
  // dissolve uses
  const noiseTexture = useVoronoiPerlinTexture();

  const { magicBooksMaterial, uniforms } = useMemo(() => {
    // The lava pattern comes from the bind-pose position normalized into the
    // mesh bounds (pre-skinning)
    const geometry = island.nodes.island_10.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();

    // The timeline tweens these. Hidden at rest (no lava, no books) until
    // the glyphs activate; the edge thickness animates up from 0
    const uniforms = {
      ...createDissolveUniforms(noiseTexture, {
        ...BOOKS_DISSOLVE_DEFAULTS,
        thickness: 0,
      }),
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

  // Back to the resting state before the awakening (hidden books), ready to replay
  const resetBooksDissolve = () => {
    timelineRef.current?.kill();
    timelineRef.current = null;

    const u = uniforms;
    u.uProgress.value = 0;
    u.uFormProgress.value = 0;
    u.uThickness.value = 0;
    u.uLavaOpacity.value = 1;
  };

  const control = uniformControls(uniforms);
  useControls('MagicBooks', {
    Play: () => playBooksDissolve(),
    'Reset Animation': () => resetBooksDissolve(),
    intensity: control(
      'uIntensity',
      BOOKS_DISSOLVE_DEFAULTS.intensity,
      0,
      100,
      0.1
    ),
    color: control('uColor', BOOKS_DISSOLVE_DEFAULTS.color),
    // Build-time values, read when the next Play/awakening builds its
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
    // The books appear when the Skills island awakens
    const unsubAwake = useStore.subscribe(
      state => state.skillsIslandAwake,
      () => {
        playBooksDissolve(booksDissolveConfig.delay);
      }
    );

    // Clear subscriptions on unmount
    return () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      unsubAwake();
    };
  }, []);

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
