import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { useControls } from '#utils/useControls.jsx';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

const LINE_SEGMENTS = 20;
const WIND_TIME_OFFSET_MAX = 100;
const WIND_FIELD_SEED = 0x9e3779b9;
const WIND_LINES_RENDER_ORDER = 100;

const WIND_LINES_DEFAULTS = {
  enabled: true,
  color: '#ffffff',
  direction: 1.12,
  gridSpacing: 6,
  geometryLength: 22.1,
  baseHeight: 3,
  heightVariation: 7,
  width: 0.11,
  speed: 0.76,
  alphaMultiplier: 0.11,
  lengthMultiplier: 1.75,
  // Field bounds covering the archipelago
  centerX: -6,
  centerZ: -26,
  sizeX: 44,
  sizeZ: 72,
};

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uTimeMultiplier;
uniform float uSpeed;

attribute vec3 aInstanceOffset;
attribute float aInstanceTimeOffset;
attribute float aInstanceRotation;

varying vec2 vUv;
varying float vTimeOffset;

void main() {
  vUv = uv;
  vTimeOffset = aInstanceTimeOffset;

  // Rotate the ribbon around Y by the instance angle
  float c = cos(aInstanceRotation);
  float s = sin(aInstanceRotation);
  vec3 rotated = vec3(
    position.x * c - position.z * s,
    position.y,
    position.x * s + position.z * c
  );

  vec3 p = rotated + aInstanceOffset;
  float localTime = (uTime + aInstanceTimeOffset) * uTimeMultiplier * uSpeed;
  p.y += sin(vUv.x * 10.0 + localTime) * 0.1;

  vec4 worldPosition = modelMatrix * vec4(p, 1.0);
  worldPosition.z += sin(worldPosition.x + localTime * 2.0) * 0.2;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uTimeMultiplier;
uniform float uAlphaMultiplier;
uniform float uStrength;
uniform float uSpeed;
uniform float uLengthMultiplier;
uniform float uRange;
uniform vec3 uColor;

varying vec2 vUv;
varying float vTimeOffset;

void main() {
  float timeMultiplier = uTimeMultiplier * uSpeed;
  float t = fract((uTime + vTimeOffset) * timeMultiplier);
  float range = uRange * uLengthMultiplier;
  float center = mix(0.5 - range, 0.5 + range, t);
  float d = abs(vUv.x - center) * uLengthMultiplier;
  float alpha = 1.0 - smoothstep(0.1, 0.4, d);
  float edge = min(vUv.x, 1.0 - vUv.x);
  float edgeFade = smoothstep(0.0, 0.1, edge);

  alpha *= edgeFade * uAlphaMultiplier * uStrength;

  gl_FragColor = vec4(uColor, alpha);
}
`;

// Deterministic rng so the wind field layout is stable across rebuilds
function mulberry32(seed) {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Instanced wind-line ribbons drifting above the islands.
 */
const WindLines = () => {
  const controls = useControls(
    'Wind Lines',
    {
      enabled: WIND_LINES_DEFAULTS.enabled,
      color: WIND_LINES_DEFAULTS.color,
      direction: {
        value: WIND_LINES_DEFAULTS.direction,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
      },
      gridSpacing: {
        value: WIND_LINES_DEFAULTS.gridSpacing,
        min: 1,
        max: 12,
        step: 0.1,
      },
      geometryLength: {
        value: WIND_LINES_DEFAULTS.geometryLength,
        min: 1,
        max: 30,
        step: 0.1,
      },
      baseHeight: {
        value: WIND_LINES_DEFAULTS.baseHeight,
        min: -2,
        max: 12,
        step: 0.1,
      },
      heightVariation: {
        value: WIND_LINES_DEFAULTS.heightVariation,
        min: 0,
        max: 12,
        step: 0.1,
      },
      width: {
        value: WIND_LINES_DEFAULTS.width,
        min: 0.02,
        max: 0.5,
        step: 0.01,
      },
      speed: { value: WIND_LINES_DEFAULTS.speed, min: 0, max: 5, step: 0.01 },
      alphaMultiplier: {
        value: WIND_LINES_DEFAULTS.alphaMultiplier,
        min: 0,
        max: 2,
        step: 0.01,
      },
      lengthMultiplier: {
        value: WIND_LINES_DEFAULTS.lengthMultiplier,
        min: 0.1,
        max: 4,
        step: 0.01,
      },
      centerX: {
        value: WIND_LINES_DEFAULTS.centerX,
        min: -60,
        max: 60,
        step: 0.5,
      },
      centerZ: {
        value: WIND_LINES_DEFAULTS.centerZ,
        min: -80,
        max: 40,
        step: 0.5,
      },
      sizeX: { value: WIND_LINES_DEFAULTS.sizeX, min: 4, max: 120, step: 1 },
      sizeZ: { value: WIND_LINES_DEFAULTS.sizeZ, min: 4, max: 160, step: 1 },
    },
    { collapsed: true }
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTimeMultiplier: { value: 0.04 },
      uAlphaMultiplier: { value: WIND_LINES_DEFAULTS.alphaMultiplier },
      uStrength: { value: 1 },
      uSpeed: { value: WIND_LINES_DEFAULTS.speed },
      uLengthMultiplier: { value: WIND_LINES_DEFAULTS.lengthMultiplier },
      uRange: { value: 4 },
      uColor: { value: new THREE.Color(WIND_LINES_DEFAULTS.color) },
    }),
    []
  );

  const geometry = useMemo(() => {
    // Ribbon strip centered at the origin, extending along X
    const vertexCount = (LINE_SEGMENTS + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint16Array(LINE_SEGMENTS * 6);

    let vertexCursor = 0;
    let indexCursor = 0;

    for (let segment = 0; segment <= LINE_SEGMENTS; segment += 1) {
      const u = segment / LINE_SEGMENTS;
      const localX = (u - 0.5) * controls.geometryLength;

      for (let side = 0; side < 2; side += 1) {
        positions[vertexCursor * 3] = localX;
        positions[vertexCursor * 3 + 1] = (side - 0.5) * controls.width;
        positions[vertexCursor * 3 + 2] = 0;
        uvs[vertexCursor * 2] = u;
        uvs[vertexCursor * 2 + 1] = side;
        vertexCursor += 1;
      }
    }

    for (let segment = 0; segment < LINE_SEGMENTS; segment += 1) {
      const a = segment * 2;
      indices[indexCursor] = a;
      indices[indexCursor + 1] = a + 1;
      indices[indexCursor + 2] = a + 2;
      indices[indexCursor + 3] = a + 2;
      indices[indexCursor + 4] = a + 1;
      indices[indexCursor + 5] = a + 3;
      indexCursor += 6;
    }

    // Per-instance attributes over the wind field grid
    const bounds = {
      minX: controls.centerX - controls.sizeX / 2,
      maxX: controls.centerX + controls.sizeX / 2,
      minZ: controls.centerZ - controls.sizeZ / 2,
      maxZ: controls.centerZ + controls.sizeZ / 2,
    };
    const spacing = Math.max(controls.gridSpacing, 0.1);
    const columns = Math.max(
      1,
      Math.floor((bounds.maxX - bounds.minX) / spacing)
    );
    const rows = Math.max(1, Math.floor((bounds.maxZ - bounds.minZ) / spacing));
    const count = columns * rows;
    const offsets = new Float32Array(count * 3);
    const timeOffsets = new Float32Array(count);
    const rotations = new Float32Array(count);
    const rng = mulberry32(WIND_FIELD_SEED);
    const angle = -Math.PI / 2 + controls.direction;

    let i = 0;
    for (let ix = 0; ix < columns; ix += 1) {
      for (let iz = 0; iz < rows; iz += 1) {
        offsets[i * 3] = bounds.minX + spacing * (ix + 0.5);
        offsets[i * 3 + 1] =
          controls.baseHeight + rng() * controls.heightVariation;
        offsets[i * 3 + 2] = bounds.minZ + spacing * (iz + 0.5);
        timeOffsets[i] = rng() * WIND_TIME_OFFSET_MAX;
        rotations[i] = angle;
        i += 1;
      }
    }

    const windGeometry = new THREE.InstancedBufferGeometry();
    windGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    windGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    windGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    windGeometry.setAttribute(
      'aInstanceOffset',
      new THREE.InstancedBufferAttribute(offsets, 3)
    );
    windGeometry.setAttribute(
      'aInstanceTimeOffset',
      new THREE.InstancedBufferAttribute(timeOffsets, 1)
    );
    windGeometry.setAttribute(
      'aInstanceRotation',
      new THREE.InstancedBufferAttribute(rotations, 1)
    );
    windGeometry.instanceCount = count;
    windGeometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(controls.centerX, 0, controls.centerZ),
      Math.max(controls.sizeX, controls.sizeZ)
    );

    return windGeometry;
  }, [
    controls.gridSpacing,
    controls.geometryLength,
    controls.baseHeight,
    controls.heightVariation,
    controls.width,
    controls.direction,
    controls.centerX,
    controls.centerZ,
    controls.sizeX,
    controls.sizeZ,
  ]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [uniforms]
  );

  useEffect(() => {
    uniforms.uAlphaMultiplier.value = controls.alphaMultiplier;
    uniforms.uSpeed.value = controls.speed;
    uniforms.uLengthMultiplier.value = controls.lengthMultiplier;
    uniforms.uColor.value.set(controls.color);
  }, [controls, uniforms]);

  // The streaks are pure drifting motion - off entirely under reduced motion
  const enabled = controls.enabled && !REDUCED_MOTION_AT_LOAD;

  useFrame(({ elapsed }) => {
    // The mesh is hidden when disabled; no point animating it
    if (!enabled) return;
    uniforms.uTime.value = elapsed;
  });

  return (
    <mesh
      name="WindLines"
      geometry={geometry}
      material={material}
      visible={enabled}
      frustumCulled={false}
      renderOrder={WIND_LINES_RENDER_ORDER}
    />
  );
};

export { WindLines };
