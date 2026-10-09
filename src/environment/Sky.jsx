import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import {
  clamp,
  float,
  max,
  mix,
  sRGBTransferEOTF,
  uniform,
  uv,
} from 'three/tsl';

import { useControls } from '#debug/useControls.jsx';

// Width of the gradient's bottom→top blend band, in sphere V units — 0.65 is
// the original hardcoded 0.35→1 stops
const MIX_BAND = 0.65;

/**
 * Background sphere with a vertical two-color gradient. Same result as the
 * drei <GradientTexture> it replaces: stop 0 at the top of the sphere, colors
 * interpolated in sRGB (like a canvas gradient) and decoded to linear.
 */
const Sky = () => {
  const {
    bottomColor: color0,
    topColor: color1,
    mixHeight,
  } = useControls('SkyColors', {
    bottomColor: '#000649',
    topColor: '#0077ff',
    // 0 = the whole sky is bottomColor, 1 = all topColor; in between the
    // blend band slides proportionally
    mixHeight: { value: 0.3, min: 0, max: 1, step: 0.01 },
  });

  // The blend band (fixed width) slides with mixHeight, past the zenith at 0
  // (bottomColor fills the sphere) and past the horizon at 1 (topColor fills
  // it), so the extremes really reach 100% of one color
  const mixCenter = (1 - mixHeight) * (1 + MIX_BAND) - MIX_BAND / 2;
  const stop0 = THREE.MathUtils.clamp(mixCenter - MIX_BAND / 2, 0, 1);
  const stop1 = THREE.MathUtils.clamp(mixCenter + MIX_BAND / 2, 0, 1);

  const { material, uniforms } = useMemo(() => {
    const uniforms = {
      stop0: uniform(0),
      stop1: uniform(1),
      color0: uniform(new THREE.Color()),
      color1: uniform(new THREE.Color()),
    };

    const t = float(1).sub(uv().y);
    const k = clamp(
      t.sub(uniforms.stop0).div(max(uniforms.stop1.sub(uniforms.stop0), 1e-5)),
      0,
      1
    );

    const material = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide });
    material.colorNode = sRGBTransferEOTF(
      mix(uniforms.color0, uniforms.color1, k)
    );

    return { material, uniforms };
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    uniforms.stop0.value = stop0;
    uniforms.stop1.value = stop1;
    // sRGB components, interpolated as-is in the shader
    uniforms.color0.value.set(color0).convertLinearToSRGB();
    uniforms.color1.value.set(color1).convertLinearToSRGB();
  }, [uniforms, stop0, stop1, color0, color1]);

  return (
    <mesh material={material}>
      <sphereGeometry args={[125]} />
    </mesh>
  );
};

export { Sky };
