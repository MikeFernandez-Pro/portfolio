import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import gsap from 'gsap';

import { useControls } from '#debug/useControls.jsx';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';
import { METAMORPHOUS } from '#utils/metamorphousFont.js';

const LETTERS_COUNT = 3;
const BASE_POSITION = [-11.36, 7.62, -60.64];
const BASE_ROTATION = [0, 0.4, -0.1];

const SLEEP_TEXT_DEFAULTS = {
  // Seconds for one letter to rise and grow through its full cycle; the
  // letters are staggered by duration / LETTERS_COUNT so the looping cycle
  // always keeps them perfectly evenly spaced
  duration: 5,
  // How far above BASE_POSITION the letters rise
  riseHeight: 0.88,
  // Scale at spawn and at the top of the rise
  minScale: 0.05,
  maxScale: 0.15,
  // Side-to-side sine sway
  swayAmplitude: 0.05,
  swayFrequency: 2,
};

// Fills the Z glyph outline (font size 0.75 * canvas width), centered on
// its bounding box: no webfont to download and wait for
function drawLetter(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const outlines = METAMORPHOUS.generateShapes('Z', width * 0.75).flatMap(
    shape => [shape, ...shape.holes].map(path => path.getPoints(16))
  );
  const box = new THREE.Box2().setFromPoints(outlines.flat());
  const center = box.getCenter(new THREE.Vector2());

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (const points of outlines) {
    points.forEach(({ x, y }, i) => {
      // Glyph space is y-up, the canvas y-down
      const px = width / 2 + x - center.x;
      const py = height / 2 - (y - center.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  }
  ctx.fill('evenodd');
}

function createLetterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  drawLetter(canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const SleepText = () => {
  const lettersRefs = useRef([]);
  const texture = useMemo(() => createLetterTexture(), []);

  // No onChange: the values come back as state so the tween effect below
  // rebuilds on every panel change (fixed at the defaults in production)
  const {
    duration,
    riseHeight,
    minScale,
    maxScale,
    swayAmplitude,
    swayFrequency,
  } = useControls('SleepText', {
    duration: {
      value: SLEEP_TEXT_DEFAULTS.duration,
      min: 0.2,
      max: 8,
      step: 0.1,
    },
    riseHeight: {
      value: SLEEP_TEXT_DEFAULTS.riseHeight,
      min: 0,
      max: 3,
      step: 0.01,
    },
    minScale: {
      value: SLEEP_TEXT_DEFAULTS.minScale,
      min: 0,
      max: 1,
      step: 0.005,
    },
    maxScale: {
      value: SLEEP_TEXT_DEFAULTS.maxScale,
      min: 0,
      max: 1,
      step: 0.005,
    },
    swayAmplitude: {
      value: SLEEP_TEXT_DEFAULTS.swayAmplitude,
      min: 0,
      max: 0.5,
      step: 0.005,
    },
    swayFrequency: {
      value: SLEEP_TEXT_DEFAULTS.swayFrequency,
      min: 0,
      max: 10,
      step: 0.1,
    },
  });

  useLayoutEffect(() => {
    // One letter spawns every duration / LETTERS_COUNT: each timeline lasts
    // exactly `duration` and repeats, so the letters stay perfectly evenly
    // spaced through the whole loop
    const interval = duration / LETTERS_COUNT;

    // Reduced motion: a static trail of evenly spaced, growing Zs instead of
    // the rise loop (three letters at the same spot would z-fight)
    if (REDUCED_MOTION_AT_LOAD) {
      for (let i = 0; i < LETTERS_COUNT; i++) {
        const letter = lettersRefs.current[i];
        if (!letter) continue;
        const t = (i + 0.5) / LETTERS_COUNT;
        letter.position.y = BASE_POSITION[1] + riseHeight * t;
        letter.scale.setScalar(minScale + (maxScale - minScale) * t);
      }
      return;
    }

    // Quick pop-down to nothing at the top of the rise, so the letter never
    // visibly teleports back to the bottom
    const shrinkDuration = Math.min(0.15, duration * 0.25);
    const growDuration = duration - shrinkDuration;
    const timelines = [];
    for (let i = 0; i < LETTERS_COUNT; i++) {
      const letter = lettersRefs.current[i];
      if (!letter) continue;

      const timeline = gsap.timeline({ repeat: -1, delay: i * interval });
      timeline.fromTo(
        letter.position,
        { y: BASE_POSITION[1] },
        {
          y: BASE_POSITION[1] + riseHeight,
          duration,
          ease: 'linear',
        },
        0
      );
      timeline.fromTo(
        letter.scale,
        { x: minScale, y: minScale, z: minScale },
        {
          x: maxScale,
          y: maxScale,
          z: maxScale,
          duration: growDuration,
          ease: 'linear',
        },
        0
      );
      timeline.to(
        letter.scale,
        { x: 0, y: 0, z: 0, duration: shrinkDuration, ease: 'power2.in' },
        growDuration
      );
      timelines.push(timeline);
    }

    return () => {
      timelines.forEach(timeline => timeline.kill());
    };
  }, [duration, riseHeight, minScale, maxScale]);

  useFrame(state => {
    if (REDUCED_MOTION_AT_LOAD) return;
    for (let i = 0; i < LETTERS_COUNT; i++) {
      const letter = lettersRefs.current[i];
      if (letter) {
        letter.position.x =
          BASE_POSITION[0] +
          swayAmplitude * Math.sin(swayFrequency * state.elapsed + i * 3);
      }
    }
  });

  return Array.from({ length: LETTERS_COUNT }, (_, index) => (
    <mesh
      key={`sleep-z-${index}`}
      ref={el => {
        lettersRefs.current[index] = el;
      }}
      scale={SLEEP_TEXT_DEFAULTS.minScale}
      position={BASE_POSITION}
      rotation={BASE_ROTATION}
    >
      <planeGeometry args={[1, 1]} />
      {/* alphaTest discards the transparent quad around the glyph before it
          can write depth (depth rectangles punched into smoke/sparks), while
          the glyph pixels keep writing theirs - the depth-driven cheap DoF
          needs it, or letters over bare sky get defocused to the far
          plane */}
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.5}
        depthWrite={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  ));
};

export default SleepText;
