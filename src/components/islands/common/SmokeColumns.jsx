import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

// Stable fallback so the matrices effect doesn't re-run on every render
// for groups without an offset control
const NO_OFFSET = [0, 0, 0];

const INSTANCE_MATRIX = new THREE.Matrix4();
const INSTANCE_POSITION = new THREE.Vector3();
const INSTANCE_QUATERNION = new THREE.Quaternion();
const INSTANCE_SCALE = new THREE.Vector3();

import smokeVertexShader from '#shaders/smoke/vertex.glsl';
import smokeFragmentShader from '#shaders/smoke/fragment.glsl';

/**
 * Group of smoke columns reusing the bonfire smoke shader: one shared
 * material and a single InstancedMesh (one draw call per group), tuned
 * from its own debug folder. The plane is 1x10 like the bonfire's (the
 * shader profiles work in local space), so `width`/`height` scale the
 * instances instead of the geometry.
 */
const SmokeColumns = props => {
  const { folderName, positions, defaults } = props;

  const defaultsRef = useRef(defaults);

  const smokeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: smokeVertexShader,
        fragmentShader: smokeFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(defaultsRef.current.color) },
          uOpacity: { value: defaultsRef.current.opacity },
          uFadeHeight: { value: defaultsRef.current.fadeHeight },
          uBaseFade: { value: defaultsRef.current.baseFade },
          uTimeOffsetStrength: {
            value: defaultsRef.current.timeOffsetStrength,
          },
          uDisplacementUv: { value: defaultsRef.current.swayScale },
          uDisplacementUvY: { value: defaultsRef.current.swayPower },
          newPositionY: { value: 1.69 },
        },
        transparent: true,
        depthWrite: false,
      }),
    []
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

  const schema = {
    color: {
      value: d.color,
      onChange: v => {
        smokeMaterial.uniforms.uColor.value.set(v);
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

  // Shared world-space offset, only for groups whose defaults ask for it
  // (torch positions are baked, the cauldron still gets tuned live)
  if (d.offset) {
    schema.offset = { value: d.offset, step: 0.01 };
  }

  const controls = useControls(folderName, schema, {
    collapsed: true,
    reset: true,
  });
  const { width, height } = controls;
  const offset = controls.offset ?? NO_OFFSET;

  useFrame(({ clock }) => {
    smokeMaterial.uniforms.uTime.value = clock.elapsedTime;
  });

  const instancedMeshRef = useRef(null);

  useEffect(() => {
    const instancedMesh = instancedMeshRef.current;

    INSTANCE_QUATERNION.identity();
    INSTANCE_SCALE.set(width, height / 10, 1);

    positions.forEach(([x, y, z], index) => {
      INSTANCE_POSITION.set(x + offset[0], y + offset[1], z + offset[2]);
      INSTANCE_MATRIX.compose(
        INSTANCE_POSITION,
        INSTANCE_QUATERNION,
        INSTANCE_SCALE
      );
      instancedMesh.setMatrixAt(index, INSTANCE_MATRIX);
    });
    instancedMesh.instanceMatrix.needsUpdate = true;
  }, [positions, width, height, offset]);

  return (
    // Instances are spread across the map while the mesh sits at the
    // origin, so default culling would be wrong
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, positions.length]}
      material={smokeMaterial}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 10, 4, 16]} />
    </instancedMesh>
  );
};

export { SmokeColumns };
