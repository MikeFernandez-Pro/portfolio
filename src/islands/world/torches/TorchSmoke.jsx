import { useEffect, useMemo } from 'react';
import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import * as THREE from 'three/webgpu';
import { attribute, uniform, vec3 } from 'three/tsl';

import {
  createSmokeMaterial,
  createSmokeUniforms,
  smokeColumnTimeOffset,
} from '#shaders/smoke.js';
import { TORCHES } from './torches.js';

// The torches' smoke column bases (the bonfire has its own BonfireSmoke)
const POSITIONS = TORCHES.flatMap(torch => (torch.smoke ? [torch.smoke] : []));

const DEFAULTS = {
  color: '#313131',
  opacity: 0.32,
  fadeHeight: 0.67,
  baseFade: 0.32,
  timeOffsetStrength: 1,
  swayScale: 2.8,
  swayPower: 0.83,
  width: 0.14,
  height: 2.9,
};

/**
 * The torch smoke columns, reusing the bonfire smoke shader: one shared
 * material and a single instanced mesh (one draw call). The plane is 1x10
 * like the bonfire's (the shader profiles work in local space), so
 * `width`/`height` scale the columns instead of the geometry. Instanced by
 * hand: the plane is an InstancedBufferGeometry with a per-column offset and
 * time offset.
 */
const TorchSmoke = () => {
  const { geometry, smokeMaterial, uniforms, columnScale } = useMemo(() => {
    const geometry = new THREE.InstancedBufferGeometry().copy(
      new THREE.PlaneGeometry(1, 10, 4, 16)
    );
    geometry.instanceCount = POSITIONS.length;
    // One instance per column: world offset + time offset (hashed from the
    // column's world position)
    geometry.setAttribute(
      'aColumnOffset',
      new THREE.InstancedBufferAttribute(new Float32Array(POSITIONS.flat()), 3)
    );
    geometry.setAttribute(
      'aTimeOffset',
      new THREE.InstancedBufferAttribute(
        new Float32Array(
          POSITIONS.map(([x, , z]) => smokeColumnTimeOffset(x, z))
        ),
        1
      )
    );

    const uniforms = createSmokeUniforms(DEFAULTS);
    // (width, height / 10): the plane is 10 tall
    const columnScale = uniform(new THREE.Vector2(1, 1));
    const smokeMaterial = createSmokeMaterial(
      uniforms,
      attribute('aTimeOffset', 'float'),
      position =>
        position
          .mul(vec3(columnScale.x, columnScale.y, 1))
          .add(attribute('aColumnOffset', 'vec3'))
    );
    return { geometry, smokeMaterial, uniforms, columnScale };
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => smokeMaterial.dispose(), [smokeMaterial]);

  const smokeControl = uniformControls(uniforms);

  const d = DEFAULTS;

  const schema = {
    color: smokeControl('uColor', d.color),
    opacity: smokeControl('uOpacity', d.opacity, 0, 1, 0.01),
    fadeHeight: smokeControl('uFadeHeight', d.fadeHeight, 0, 5, 0.01),
    // Hides the hard line where the column crosses the surface it rises
    // from (fade distance in local plane units, 0 = off)
    baseFade: smokeControl('uBaseFade', d.baseFade, 0, 4, 0.01),
    // Scales the per-column animation desynchronization (0 = all in phase)
    timeOffsetStrength: smokeControl(
      'uTimeOffsetStrength',
      d.timeOffsetStrength,
      0,
      3,
      0.01
    ),
    swayScale: smokeControl('uSwayScale', d.swayScale, 0, 10, 0.01),
    swayPower: smokeControl('uSwayPower', d.swayPower, 0, 3, 0.01),
    width: { value: d.width, min: 0.05, max: 3, step: 0.01 },
    height: { value: d.height, min: 0.5, max: 20, step: 0.1 },
  };

  const controls = useControls('TorchesSmoke', schema);
  const { width, height } = controls;

  useEffect(() => {
    columnScale.value.set(width, height / 10);
  }, [width, height, columnScale]);

  return (
    // Columns are spread across the map while the mesh sits at the origin,
    // so default culling would be wrong
    <mesh geometry={geometry} material={smokeMaterial} frustumCulled={false} />
  );
};

export { TorchSmoke };
