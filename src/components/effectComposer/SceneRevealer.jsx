import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Effect } from 'postprocessing';
import gsap from 'gsap';
import * as THREE from 'three';

import sceneRevealerFragmentShader from '#shaders/sceneRevealer/fragment.glsl';

import PerlinNoiseImage from '#assets/textures/perlin.png';

import { IS_PHOTO_MODE } from '#utils/utils.js';

class sceneRevealerEffect extends Effect {
  constructor(aspectRatio, perlinNoiseTexture) {
    super('sceneRevealerEffect', sceneRevealerFragmentShader, {
      uniforms: new Map([
        ['progress', new THREE.Uniform(0.25)],
        ['size', new THREE.Uniform(5)],
        ['aspectRatio', new THREE.Uniform(aspectRatio)],
        ['uTime', new THREE.Uniform(0)],
        ['uPerlinNoiseTexture', new THREE.Uniform(perlinNoiseTexture)],
      ]),
    });
  }
}
const SceneRevealer = props => {
  const { sceneRevealerRef } = props;

  const aspectRatio = useThree(state => state.viewport.aspect);

  const perlinNoiseTexture = useTexture(PerlinNoiseImage, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  const effect = useMemo(
    () => new sceneRevealerEffect(aspectRatio, perlinNoiseTexture),
    []
  );

  useEffect(() => {
    // Photo mode: no intro sequence — the scene starts fully revealed
    if (IS_PHOTO_MODE) {
      effect.uniforms.get('progress').value = 1.5;
      return;
    }

    let sceneRevealerAnimation = gsap.to(
      sceneRevealerRef.current?.uniforms.get('progress'),
      {
        value: 0.25,
        duration: 1,
        delay: 0.5,
        ease: 'circ.out',
      }
    );

    return () => {
      sceneRevealerAnimation.kill();
      sceneRevealerAnimation = null;
    };
  }, []);

  useFrame(({ clock }) => {
    sceneRevealerRef.current.uniforms.get('uTime').value = clock.elapsedTime;
    sceneRevealerRef.current.uniforms.get('aspectRatio').value = aspectRatio;
  });

  return <primitive ref={sceneRevealerRef} object={effect} />;
};

useTexture.preload(PerlinNoiseImage);

export { SceneRevealer };
