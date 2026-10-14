import { useEffect, useMemo } from 'react';
import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import * as THREE from 'three/webgpu';
import {
  float,
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
} from 'three/tsl';
import { hash12 } from '#shaders/includes/hash.js';
import { useSmokeTexture } from '#utils/packedTextures.js';

// World-space cauldron position (GLB `pot` node through the island group
// transform): the smoke rises from just above the potion surface (the
// offset control shifts it)
const POSITION = [8.64, 3.1, -29.73];

const DEFAULTS = {
  color: '#00ffd4',
  opacity: 1,
  density: 0.6,
  speed: 0.07,
  edgeFade: 0.5,
  topFadeStart: 0.48,
  topFadeEnd: 1,
  bottomFadeStart: 0.31,
  bottomFadeEnd: 0.41,
  timeOffsetStrength: 1,
  swayScale: 2.16,
  swayPower: 3,
  swayAmplitude: 0.16,
  width: 1.94,
  height: 2.8,
  offset: [0, 0.83, 0],
};

/**
 * The cauldron's smoke column: same 1x10 plane as TorchSmoke, but a single plain mesh with its own node material driven by
 * smoke.webp instead of the procedural perlin — fully separate from the
 * torch/bonfire smoke.
 */
const CauldronSmoke = () => {
  const smokeTexture = useSmokeTexture();

  const { smokeMaterial, uniforms } = useMemo(() => {
    const d = DEFAULTS;
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
      uSwayAmplitude: uniform(d.swayAmplitude),
      uTimeOffsetStrength: uniform(d.timeOffsetStrength),
      uSwayScale: uniform(d.swayScale),
      uSwayPower: uniform(d.swayPower),
    };

    const smokeMaterial = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
    });

    // Single column drawn as a plain mesh: its world position hashes into a
    // time offset so it doesn't sway in sync with other smoke
    const columnXZ = modelWorldMatrix.element(3).xz;
    const timeOffset = hash12(columnXZ).mul(100);
    const columnTime = time.add(timeOffset.mul(uniforms.uTimeOffsetStrength));

    // Sway grows with height (uv.y: 0 at the base, 1 at the top), so the
    // base stays anchored to the cauldron whatever the amplitude; swayPower
    // shapes the curve. The epsilon keeps pow(0, 0) out of undefined
    // territory when swayPower is 0
    const heightFactor = pow(uv().y, max(uniforms.uSwayPower, 0.0001));
    smokeMaterial.positionNode = positionGeometry.add(
      vec3(
        sin(positionGeometry.y.mul(uniforms.uSwayScale).sub(columnTime))
          .mul(heightFactor)
          .mul(uniforms.uSwayAmplitude),
        0,
        0
      )
    );

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

  const smokeControl = uniformControls(uniforms);

  const d = DEFAULTS;

  const { width, height, offset } = useControls('CauldronSmoke', {
    color: smokeControl('uColor', d.color),
    opacity: smokeControl('uOpacity', d.opacity, 0, 1, 0.01),
    // Gamma on the texture: < 1 = denser smoke (keeps the detail), > 1 =
    // thinner wisps, 1 = raw texture
    density: smokeControl('uDensity', d.density, 0.1, 3, 0.01),
    // Texture scroll speed
    speed: smokeControl('uSpeed', d.speed, 0, 3, 0.01),
    // Fade width on the plane's vertical edges, in plane units (0 = hard)
    edgeFade: smokeControl('uEdgeFade', d.edgeFade, 0, 0.5, 0.001),
    // Vertical fade-out at the top: full below topFadeStart, fully gone
    // at topFadeEnd
    topFadeStart: smokeControl('uTopFadeStart', d.topFadeStart, 0, 1, 0.01),
    topFadeEnd: smokeControl('uTopFadeEnd', d.topFadeEnd, 0, 1, 0.01),
    // Vertical fade-in at the base: gone below bottomFadeStart, full at
    // bottomFadeEnd
    bottomFadeStart: smokeControl(
      'uBottomFadeStart',
      d.bottomFadeStart,
      0,
      1,
      0.01
    ),
    bottomFadeEnd: smokeControl('uBottomFadeEnd', d.bottomFadeEnd, 0, 1, 0.01),
    // Shifts the animation phase (hashed from the column's world position)
    timeOffsetStrength: smokeControl(
      'uTimeOffsetStrength',
      d.timeOffsetStrength,
      0,
      3,
      0.01
    ),
    swayScale: smokeControl('uSwayScale', d.swayScale, 0, 10, 0.01),
    swayPower: smokeControl('uSwayPower', d.swayPower, 0, 3, 0.01),
    // Left/right displacement amplitude at the top of the column, in local
    // plane units (0 = still; the base never moves)
    swayAmplitude: smokeControl('uSwayAmplitude', d.swayAmplitude, 0, 3, 0.01),
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
        POSITION[0] + offset[0],
        POSITION[1] + offset[1],
        POSITION[2] + offset[2],
      ]}
      scale={[width, height / 10, 1]}
      material={smokeMaterial}
    >
      <planeGeometry args={[1, 10, 4, 16]} />
    </mesh>
  );
};

export { CauldronSmoke };
