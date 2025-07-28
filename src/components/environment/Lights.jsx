import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useHelper } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';

const Lights = () => {
  const characterLightRef = useRef(null);
  const pointLightRef = useRef(null);

  const characterLightHelper = useHelper(
    characterLightRef,
    THREE.DirectionalLightHelper,
    0
  );

  const directionalLightControls = useControls('directionalLight', {
    intensity: {
      value: 18,
      min: 0,
      max: 40,
    },
    color: {
      value: '#3a62c8',
    },
  });

  const ambientLightControls = useControls('ambientLight', {
    intensity: {
      value: 16,
      min: 0,
      max: 20,
    },
    color: {
      value: '#526cad',
    },
  });

  const scene = useThree(state => state.scene);
  const targetObject = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const unsubCharacterPosition = IS_MOBILE_DEVICE
      ? undefined
      : useStore.subscribe(
          state => state.characterPosition,
          characterPosition => {
            if (characterPosition && characterLightRef.current) {
              targetObject.position.set(
                characterPosition.x,
                characterPosition.y,
                characterPosition.z
              );
              characterLightRef.current.position.set(
                characterPosition.x - 3,
                characterPosition.y + 4,
                characterPosition.z + 3
              );
              characterLightRef.current.target = targetObject;
              characterLightRef.current.shadow.camera.target = targetObject;
            }
          }
        );

    if (characterLightHelper.current) {
      characterLightHelper.current.visible = false;
      characterLightHelper.current.targetLine.geometry.drawRange.count = 0;
    }

    scene.add(targetObject);

    return () => {
      scene.remove(targetObject);

      if (IS_MOBILE_DEVICE) return;

      unsubCharacterPosition?.();
    };
  }, []);

  return (
    <>
      <ambientLight
        intensity={ambientLightControls.intensity}
        color={ambientLightControls.color}
      />
      <directionalLight
        ref={characterLightRef}
        position={[-3, 4, 3]}
        intensity={directionalLightControls.intensity}
        color={directionalLightControls.color}
        castShadow={!IS_MOBILE_DEVICE}
        shadow-mapSize={[512, 512]}
        shadow-camera-near={1}
        shadow-camera-far={10}
        shadow-camera-top={1.5}
        shadow-camera-right={1}
        shadow-camera-bottom={-1}
        shadow-camera-left={-1}
        shadow-bias={-0.01}
      />

      <pointLight
        ref={pointLightRef}
        position={[-9.7, 12, -59.5]}
        intensity={45}
        color="#ad7351"
      />
    </>
  );
};

export default Lights;
