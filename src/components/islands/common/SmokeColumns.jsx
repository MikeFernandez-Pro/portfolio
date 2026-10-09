import { useEffect, useMemo, useRef } from 'react';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three/webgpu';
import { attribute, uniform, vec3 } from 'three/tsl';

import {
  createSmokeMaterial,
  createSmokeUniforms,
  smokeColumnTimeOffset,
} from '#shaders/smoke/smoke.js';

/**
 * Group of smoke columns reusing the bonfire smoke shader: one shared
 * material and a single instanced mesh (one draw call per group), tuned
 * from its own debug folder. The plane is 1x10 like the bonfire's (the
 * shader profiles work in local space), so `width`/`height` scale the
 * columns instead of the geometry. Instanced by hand: the plane is an
 * InstancedBufferGeometry with a per-column offset and time offset.
 */
const SmokeColumns = props => {
  const { folderName, positions, defaults } = props;

  const defaultsRef = useRef(defaults);

  // One instance per column: world offset + time offset (hashed from the
  // column's world position), filled by the effect below
  const { geometry, smokeMaterial, uniforms, columnScale } = useMemo(() => {
    const geometry = new THREE.InstancedBufferGeometry().copy(
      new THREE.PlaneGeometry(1, 10, 4, 16)
    );
    geometry.instanceCount = positions.length;
    geometry.setAttribute(
      'aColumnOffset',
      new THREE.InstancedBufferAttribute(
        new Float32Array(positions.length * 3),
        3
      )
    );
    geometry.setAttribute(
      'aTimeOffset',
      new THREE.InstancedBufferAttribute(new Float32Array(positions.length), 1)
    );

    const uniforms = createSmokeUniforms(defaultsRef.current);
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

  const schema = {
    color: {
      value: d.color,
      onChange: v => {
        uniforms.uColor.value.set(v);
      },
    },
    opacity: numberUniform('uOpacity', d.opacity, 0, 1, 0.01),
    fadeHeight: numberUniform('uFadeHeight', d.fadeHeight, 0, 5, 0.01),
    // Hides the hard line where the column crosses the surface it rises
    // from (fade distance in local plane units, 0 = off)
    baseFade: numberUniform('uBaseFade', d.baseFade, 0, 4, 0.01),
    // Scales the per-column animation desynchronization (0 = all in phase)
    timeOffsetStrength: numberUniform(
      'uTimeOffsetStrength',
      d.timeOffsetStrength,
      0,
      3,
      0.01
    ),
    swayScale: numberUniform('uDisplacementUv', d.swayScale, 0, 10, 0.01),
    swayPower: numberUniform('uDisplacementUvY', d.swayPower, 0, 3, 0.01),
    width: { value: d.width, min: 0.05, max: 3, step: 0.01 },
    height: { value: d.height, min: 0.5, max: 20, step: 0.1 },
  };

  const controls = useControls(folderName, schema);
  const { width, height } = controls;

  useEffect(() => {
    const columnOffsets = geometry.attributes.aColumnOffset;
    const timeOffsets = geometry.attributes.aTimeOffset;

    positions.forEach(([x, y, z], index) => {
      columnOffsets.setXYZ(index, x, y, z);
      timeOffsets.setX(index, smokeColumnTimeOffset(x, z));
    });
    columnOffsets.needsUpdate = true;
    timeOffsets.needsUpdate = true;

    columnScale.value.set(width, height / 10);
  }, [positions, width, height, geometry, columnScale]);

  return (
    // Columns are spread across the map while the mesh sits at the origin,
    // so default culling would be wrong
    <mesh geometry={geometry} material={smokeMaterial} frustumCulled={false} />
  );
};

export { SmokeColumns };
