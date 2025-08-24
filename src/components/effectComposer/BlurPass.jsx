import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Effect } from 'postprocessing';
import { useControls } from 'leva';
import * as THREE from 'three';

import blurPassFragmentShader from '#shaders/blurPass/fragment.glsl';

class blurPassEffect extends Effect {
  constructor(isHorizontal) {
    super('blurPassEffect', blurPassFragmentShader, {
      uniforms: new Map([
        ['uResolution', new THREE.Uniform(new THREE.Vector2(0, 0))],
        ['uAspectRatio', new THREE.Uniform(1.0)],
        ['uIsHorizontal', new THREE.Uniform(isHorizontal)],
        ['uBlurStrength', new THREE.Uniform(1.0)],
        ['uCenter', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uBlurCenterSize', new THREE.Uniform(0.02)],
        ['uBlurSmoothness', new THREE.Uniform(1.98)],
      ]),
    });
  }
}

const BlurPass = props => {
  const { horizontalBlurPassRef, verticalBlurPassRef } = props;
  const { size, aspectRatio, dpr } = useThree(state => ({
    size: state.size,
    aspectRatio: state.viewport.aspect,
    dpr: state.viewport.dpr,
  }));

  const controls = useControls(
    'Blur Pass',
    {
      uBlurStrength: { value: 1.0, min: 0, max: 10, step: 0.01 },
      uBlurCenterSize: { value: 0.02, min: 0, max: 1, step: 0.01 },
      uBlurSmoothness: { value: 1.98, min: 0, max: 10, step: 0.01 },
      uCenter: {
        value: new THREE.Vector2(0.5, 0.19),
        min: 0,
        max: 1,
        step: 0.01,
      },
    },
    { collapsed: true }
  );

  const horizontalBlurPass = useMemo(
    () => new blurPassEffect(true),
    [horizontalBlurPassRef]
  );

  const verticalBlurPass = useMemo(
    () => new blurPassEffect(false),
    [verticalBlurPassRef]
  );

  useFrame(() => {
    horizontalBlurPassRef.current.uniforms
      .get('uResolution')
      .value.set(size.width * dpr, size.height * dpr);
    horizontalBlurPassRef.current.uniforms.get('uAspectRatio').value =
      aspectRatio;
    horizontalBlurPassRef.current.uniforms.get('uBlurStrength').value =
      controls.uBlurStrength;
    horizontalBlurPassRef.current.uniforms.get('uCenter').value =
      controls.uCenter;
    horizontalBlurPassRef.current.uniforms.get('uBlurCenterSize').value =
      controls.uBlurCenterSize;
    horizontalBlurPassRef.current.uniforms.get('uBlurSmoothness').value =
      controls.uBlurSmoothness;

    verticalBlurPassRef.current.uniforms
      .get('uResolution')
      .value.set(size.height * dpr, size.width * dpr);
    verticalBlurPassRef.current.uniforms.get('uAspectRatio').value =
      aspectRatio;
    verticalBlurPassRef.current.uniforms.get('uBlurStrength').value =
      controls.uBlurStrength;
    verticalBlurPassRef.current.uniforms.get('uCenter').value =
      controls.uCenter;
    verticalBlurPassRef.current.uniforms.get('uBlurCenterSize').value =
      controls.uBlurCenterSize;
    verticalBlurPassRef.current.uniforms.get('uBlurSmoothness').value =
      controls.uBlurSmoothness;
  });

  return (
    <>
      <primitive ref={horizontalBlurPassRef} object={horizontalBlurPass} />
      <primitive ref={verticalBlurPassRef} object={verticalBlurPass} />
    </>
  );
};

export { BlurPass };
