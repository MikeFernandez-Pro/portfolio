import { useEffect, useRef } from 'react';
import { useControls } from 'leva';
import * as THREE from 'three';

const LanternsAndHome = props => {
  const { island } = props;
  const lanternsAndHomeRef = useRef(null);
  const baseColorRef = useRef(new THREE.Color('#ff4646'));
  const intensityRef = useRef(9.9);

  useEffect(() => {
    const mesh = island.scene.getObjectByName('island_2');
    mesh.material?.dispose();
    mesh.material = new THREE.MeshBasicMaterial({
      color: baseColorRef.current.clone().multiplyScalar(intensityRef.current),
    });
    lanternsAndHomeRef.current = mesh;
  }, [island]);

  useControls('Lanterns', {
    color: {
      value: '#ffffff',
      onChange: value => {
        baseColorRef.current.set(value);
        const scaled = baseColorRef.current
          .clone()
          .multiplyScalar(intensityRef.current);
        if (lanternsAndHomeRef.current) {
          lanternsAndHomeRef.current.material.color.set(scaled);
        }
      },
    },
    intensity: {
      value: 1,
      min: 0,
      max: 10,
      step: 0.01,
      onChange: value => {
        intensityRef.current = value;
        const scaled = baseColorRef.current.clone().multiplyScalar(value);
        if (lanternsAndHomeRef.current) {
          lanternsAndHomeRef.current.material.color.set(scaled);
        }
      },
    },
  });

  return null;
};

export { LanternsAndHome };
