import { useEffect, useRef, useMemo } from 'react';
import { useControls } from 'leva';
import * as THREE from 'three';

const LANTERNS_COLOR = new THREE.Color('#ff5245');
let lanternsIntensity = 8.53;

const LanternsAndHome = props => {
  const { island } = props;

  const lanternsMesh = useMemo(
    () => island.scene.getObjectByName('island_2'),
    [island]
  );

  useEffect(() => {
    lanternsMesh.material?.dispose();
    lanternsMesh.material = new THREE.MeshBasicMaterial({
      color: LANTERNS_COLOR,
      toneMapped: false,
    });
  }, [lanternsMesh]);

  useControls(
    'Lanterns',
    {
      color: {
        value: '#ff4646',
        onChange: value => {
          LANTERNS_COLOR.set(value);
          const scaled =
            LANTERNS_COLOR.clone().multiplyScalar(lanternsIntensity);
          if (lanternsMesh) {
            lanternsMesh.material.color.set(scaled);
          }
        },
      },
      intensity: {
        value: 10,
        min: 1,
        max: 10,
        step: 0.01,
        onChange: value => {
          lanternsIntensity = value;
          const scaled = LANTERNS_COLOR.clone().multiplyScalar(value);
          if (lanternsMesh) {
            lanternsMesh.material.color.set(scaled);
          }
        },
      },
    },
    { collapsed: true }
  );

  return null;
};

export { LanternsAndHome };
