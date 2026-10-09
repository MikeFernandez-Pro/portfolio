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

/**
 * Background sphere with a vertical two-color gradient. Same result as the
 * drei <GradientTexture> it replaces: stop 0 at the top of the sphere, colors
 * interpolated in sRGB (like a canvas gradient) and decoded to linear.
 */
const SkyGradient = props => {
  const { stops, colors } = props;
  const [stop0, stop1] = stops;
  const [color0, color1] = colors;

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

export { SkyGradient };
