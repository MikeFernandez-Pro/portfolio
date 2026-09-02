import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Effect } from 'postprocessing';
import gsap from 'gsap';
import * as THREE from 'three';

import sceneRevealerFragmentShader from '#shaders/sceneRevealer/fragment.glsl';

import { IS_PHOTO_MODE } from '#utils/utils.js';

class sceneRevealerEffect extends Effect {
  constructor(aspectRatio) {
    super('sceneRevealerEffect', sceneRevealerFragmentShader, {
      uniforms: new Map([
        ['progress', new THREE.Uniform(-0.1)],
        ['size', new THREE.Uniform(15)],
        ['aspectRatio', new THREE.Uniform(aspectRatio)],
        ['uTime', new THREE.Uniform(0)],
      ]),
    });
  }
}
const SceneRevealer = props => {
  const { sceneRevealerRef } = props;

  const aspectRatio = useThree(state => state.viewport.aspect);

  const effect = useMemo(() => new sceneRevealerEffect(aspectRatio), []);

  useEffect(() => {
    // Photo mode: no intro sequence — the scene starts fully revealed
    if (IS_PHOTO_MODE) {
      effect.uniforms.get('progress').value = 1.5;
      effect.enabled = false;
      return;
    }

    let sceneRevealerAnimation = gsap.to(
      sceneRevealerRef.current?.uniforms.get('progress'),
      {
        value: 0.35,
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

  // The useThree selector re-renders on resize; no need to write the aspect
  // ratio per frame
  useEffect(() => {
    effect.uniforms.get('aspectRatio').value = aspectRatio;
  }, [effect, aspectRatio]);

  useFrame(({ clock }) => {
    const fx = sceneRevealerRef.current;
    if (!fx?.enabled) return;
    // Fully open: the pass is a no-op, drop it
    if (fx.uniforms.get('progress').value >= 1.5) {
      fx.enabled = false;
      return;
    }
    fx.uniforms.get('uTime').value = clock.elapsedTime;
  });

  return <primitive ref={sceneRevealerRef} object={effect} />;
};

export { SceneRevealer };
