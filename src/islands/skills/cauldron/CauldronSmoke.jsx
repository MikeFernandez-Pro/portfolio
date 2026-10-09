import { useEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { useControls } from '#debug/useControls.jsx';
import * as THREE from 'three/webgpu';
import {
  If,
  dot,
  float,
  fract,
  max,
  min,
  modelWorldMatrix,
  positionGeometry,
  pow,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  Fn,
} from 'three/tsl';

import smokeUrl from '#assets/textures/smoke.webp';

/**
 * The cauldron's smoke column: same 1x10 plane and debug schema as
 * TorchSmoke, but a single plain mesh with its own shader pair driven by
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

  const { smokeMaterial, uniforms } = useMemo(() => {
    const d = defaultsRef.current;
    const uniforms = {
      uColor: uniform(new THREE.Color(d.color)),
      uOpacity: uniform(d.opacity),
      uDensity: uniform(d.density),
      uSpeed: uniform(d.speed),
      uEdgeFade: uniform(d.edgeFade),
      uTopFadeStart: uniform(d.topFadeStart),
      uTopFadeEnd: uniform(d.topFadeEnd),
      uBottomFadeStart: uniform(d.bottomFadeStart),
      uBottomFadeEnd: uniform(d.bottomFadeEnd),
      uSwayEnabled: uniform(d.sway ? 1 : 0),
      uSwayAmplitude: uniform(d.swayAmplitude),
      uTimeOffsetStrength: uniform(d.timeOffsetStrength),
      uDisplacementUv: uniform(d.swayScale),
      uDisplacementUvY: uniform(d.swayPower),
    };

    const smokeMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
    });

    // Single column drawn as a plain mesh: its world position hashes into a
    // time offset so it doesn't sway in sync with other smoke
    const columnXZ = modelWorldMatrix.element(3).xz;
    const timeOffset = fract(
      sin(dot(columnXZ, vec2(12.9898, 78.233))).mul(43758.5453)
    ).mul(100);
    const columnTime = time.add(timeOffset.mul(uniforms.uTimeOffsetStrength));

    // Sway grows with height (uv.y: 0 at the base, 1 at the top), so the
    // base stays anchored to the cauldron whatever the amplitude; swayPower
    // shapes the curve. The epsilon keeps pow(0, 0) out of undefined
    // territory when swayPower is 0
    smokeMaterial.positionNode = Fn(() => {
      const position = vec3(positionGeometry).toVar();
      If(uniforms.uSwayEnabled.greaterThan(0.5), () => {
        const heightFactor = pow(
          uv().y,
          max(uniforms.uDisplacementUvY, 0.0001)
        );
        position.x.addAssign(
          sin(position.y.mul(uniforms.uDisplacementUv).sub(columnTime))
            .mul(heightFactor)
            .mul(uniforms.uSwayAmplitude)
        );
      });
      return position;
    })();

    // Texture rotated 90 degrees: local x reads the texture's y axis and the
    // upward scroll runs along the texture's x axis, at uSpeed
    const smokeUv = vec2(uv().y.sub(columnTime.mul(uniforms.uSpeed)), uv().x);
    // Gamma curve: density < 1 pushes the mid values toward opaque without
    // flattening them, > 1 thins the smoke out
    const smoke = pow(
      texture(smokeTexture, smokeUv).r,
      max(uniforms.uDensity, 0.0001)
    );
    // Slight fade on the plane's vertical edges (0 = hard edges)
    const edgeFade = smoothstep(
      0,
      max(uniforms.uEdgeFade, 0.0001),
      min(uv().x, uv().x.oneMinus())
    );
    // Fade the column out as it rises, and its base in
    const topFade = float(1).sub(
      smoothstep(
        uniforms.uTopFadeStart,
        max(uniforms.uTopFadeEnd, uniforms.uTopFadeStart.add(0.0001)),
        uv().y
      )
    );
    const bottomFade = smoothstep(
      uniforms.uBottomFadeStart,
      max(uniforms.uBottomFadeEnd, uniforms.uBottomFadeStart.add(0.0001)),
      uv().y
    );

    smokeMaterial.colorNode = uniforms.uColor;
    smokeMaterial.opacityNode = smoke
      .mul(edgeFade)
      .mul(topFade)
      .mul(bottomFade)
      .mul(uniforms.uOpacity);

    return { smokeMaterial, uniforms };
  }, [smokeTexture]);

  useEffect(() => () => smokeMaterial.dispose(), [smokeMaterial]);

  const numberUniform = (uniform, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      uniforms[uniform].value = v;
    },
  });

  const d = defaultsRef.current;

  const { width, height, offset } = useControls(folderName, {
    color: {
      value: d.color,
      onChange: v => {
        uniforms.uColor.value.set(v);
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
        uniforms.uSwayEnabled.value = v ? 1 : 0;
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
    swayAmplitude: numberUniform('uSwayAmplitude', d.swayAmplitude, 0, 3, 0.01),
    width: { value: d.width, min: 0.05, max: 3, step: 0.01 },
    height: { value: d.height, min: 0.5, max: 20, step: 0.1 },
    offset: { value: d.offset, step: 0.01 },
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
