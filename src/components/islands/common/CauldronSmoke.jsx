import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import cauldronSmokeVertexShader from '#shaders/cauldronSmoke/vertex.glsl';
import cauldronSmokeFragmentShader from '#shaders/cauldronSmoke/fragment.glsl';
import smokeUrl from '#assets/textures/smoke.webp';

/**
 * The cauldron's smoke column: same 1x10 plane and debug schema as
 * SmokeColumns, but a single plain mesh with its own shader pair driven by
 * smoke.png instead of the procedural perlin — fully separate from the
 * torch/bonfire smoke.
 */
const CauldronSmoke = props => {
  const { folderName, position, defaults } = props;

  const defaultsRef = useRef(defaults);

  const smokeTexture = useLoader(THREE.TextureLoader, smokeUrl);
  useMemo(() => {
    smokeTexture.colorSpace = THREE.NoColorSpace;
    smokeTexture.wrapS = THREE.RepeatWrapping;
    smokeTexture.wrapT = THREE.RepeatWrapping;
    smokeTexture.needsUpdate = true;
  }, [smokeTexture]);

  const smokeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: cauldronSmokeVertexShader,
        fragmentShader: cauldronSmokeFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(defaultsRef.current.color) },
          uOpacity: { value: defaultsRef.current.opacity },
          uDensity: { value: defaultsRef.current.density },
          uSpeed: { value: defaultsRef.current.speed },
          uEdgeFade: { value: defaultsRef.current.edgeFade },
          uTopFadeStart: { value: defaultsRef.current.topFadeStart },
          uTopFadeEnd: { value: defaultsRef.current.topFadeEnd },
          uBottomFadeStart: { value: defaultsRef.current.bottomFadeStart },
          uBottomFadeEnd: { value: defaultsRef.current.bottomFadeEnd },
          uSwayEnabled: { value: defaultsRef.current.sway ? 1 : 0 },
          uSwayAmplitude: { value: defaultsRef.current.swayAmplitude },
          uTimeOffsetStrength: {
            value: defaultsRef.current.timeOffsetStrength,
          },
          uDisplacementUv: { value: defaultsRef.current.swayScale },
          uDisplacementUvY: { value: defaultsRef.current.swayPower },
          uSmokeTexture: { value: smokeTexture },
        },
        transparent: true,
        depthWrite: false,
       
      }),
    [smokeTexture]
  );

  const numberUniform = (uniform, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      smokeMaterial.uniforms[uniform].value = v;
    },
  });

  const d = defaultsRef.current;

  const { width, height, offset } = useControls(
    folderName,
    {
      color: {
        value: d.color,
        onChange: v => {
          smokeMaterial.uniforms.uColor.value.set(v);
        },
      },
      opacity: numberUniform('uOpacity', d.opacity, 0, 1, 0.01),
      // Gamma on the texture: < 1 = denser smoke (keeps the detail), > 1 =
      // thinner wisps, 1 = raw texture
      density: numberUniform('uDensity', d.density, 0.1, 3, 0.01),
      // Texture scroll speed (1 = the old hardcoded pace)
      speed: numberUniform('uSpeed', d.speed, 0, 3, 0.01),
      // Fade width on the plane's vertical edges, in plane units (0 = hard)
      edgeFade: numberUniform('uEdgeFade', d.edgeFade, 0, 0.5, 0.001),
      // Vertical fade-out at the top: full below topFadeStart, fully gone
      // at topFadeEnd
      topFadeStart: numberUniform('uTopFadeStart', d.topFadeStart, 0, 1, 0.01),
      topFadeEnd: numberUniform('uTopFadeEnd', d.topFadeEnd, 0, 1, 0.01),
      // Vertical fade-in at the base: gone below bottomFadeStart, full at
      // bottomFadeEnd
      bottomFadeStart: numberUniform(
        'uBottomFadeStart',
        d.bottomFadeStart,
        0,
        1,
        0.01
      ),
      bottomFadeEnd: numberUniform('uBottomFadeEnd', d.bottomFadeEnd, 0, 1, 0.01),
      // Fully disables the vertex sway animation
      sway: {
        value: d.sway,
        onChange: v => {
          smokeMaterial.uniforms.uSwayEnabled.value = v ? 1 : 0;
        },
      },
      // Shifts the animation phase (hashed from the column's world position)
      timeOffsetStrength: numberUniform(
        'uTimeOffsetStrength',
        d.timeOffsetStrength,
        0,
        3,
        0.01
      ),
      swayScale: numberUniform('uDisplacementUv', d.swayScale, 0, 10, 0.01),
      swayPower: numberUniform('uDisplacementUvY', d.swayPower, 0, 3, 0.01),
      // Left/right displacement amplitude at the top of the column, in local
      // plane units (0 = still; the base never moves)
      swayAmplitude: numberUniform(
        'uSwayAmplitude',
        d.swayAmplitude,
        0,
        3,
        0.01
      ),
      width: { value: d.width, min: 0.05, max: 3, step: 0.01 },
      height: { value: d.height, min: 0.5, max: 20, step: 0.1 },
      offset: { value: d.offset, step: 0.01 },
    },
    { collapsed: true, reset: true }
  );

  useFrame(({ elapsed }) => {
    smokeMaterial.uniforms.uTime.value = elapsed;
  });

  return (
    // The plane is 1x10 like the torch/bonfire smoke (the shader profiles
    // work in local space), so width/height scale the mesh instead of the
    // geometry
    <mesh
      position={[
        position[0] + offset[0],
        position[1] + offset[1],
        position[2] + offset[2],
      ]}
      scale={[width, height / 10, 1]}
      material={smokeMaterial}
    >
      <planeGeometry args={[1, 10, 4, 16]} />
    </mesh>
  );
};

export { CauldronSmoke };
