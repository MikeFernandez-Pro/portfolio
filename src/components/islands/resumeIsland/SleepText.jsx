import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

import TextFont from '#assets/fonts/metamorphous.woff';

const LETTERS_COUNT = 3;
const BASE_POSITION = [-11.36, 7.62, -60.64];
const BASE_ROTATION = [0, 0.4, -0.1];

function drawLetter(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${width * 0.75}px Metamorphous, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', width / 2, height / 2);
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

  useLayoutEffect(() => {
    let cancelled = false;
    const font = new FontFace('Metamorphous', `url(${TextFont})`);

    font.load().then(loadedFont => {
      if (cancelled) return;
      document.fonts.add(loadedFont);
      drawLetter(texture.image);
      texture.needsUpdate = true;
    });

    const tweens = [];
    for (let i = 0; i < LETTERS_COUNT; i++) {
      const letter = lettersRefs.current[i];
      if (!letter) continue;

      tweens.push(
        gsap.fromTo(
          letter.position,
          { y: 7.62 },
          { y: 8.5, duration: 2, delay: i / 1.5, repeat: -1, ease: 'linear' }
        ),
        gsap.fromTo(
          letter.scale,
          { x: 0.05, y: 0.05, z: 0.05 },
          {
            x: 0.15,
            y: 0.15,
            z: 0.15,
            duration: 2,
            delay: i / 1.5,
            repeat: -1,
            ease: 'linear',
          }
        )
      );
    }

    return () => {
      cancelled = true;
      tweens.forEach(tween => tween.kill());
    };
  }, [texture]);

  useFrame(state => {
    const amplitude = 0.05;
    const frequency = 2;
    const offset = -11.35;

    for (let i = 0; i < LETTERS_COUNT; i++) {
      const letter = lettersRefs.current[i];
      if (letter) {
        letter.position.x =
          offset +
          amplitude * Math.sin(frequency * state.clock.elapsedTime + i * 3);
      }
    }
  });

  return Array.from({ length: LETTERS_COUNT }, (_, index) => (
    <mesh
      key={`sleep-z-${index}`}
      ref={el => {
        lettersRefs.current[index] = el;
      }}
      scale={0.05}
      position={BASE_POSITION}
      rotation={BASE_ROTATION}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  ));
};

export default SleepText;
