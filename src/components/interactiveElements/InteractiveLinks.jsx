import { useMemo, useEffect, useRef } from 'react';
import { Instances, Instance, Merged } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useControls } from 'leva';

import InteractionImage from '/textures/Enter.webp';

import { IS_MOBILE_DEVICE } from '../../utils/utils.js';
import { interactiveElementsIds } from './interactiveElementsUtils.js';
import { useStore } from '../../store/ZustandStorage.jsx';

const BLOOM_COLOR = new THREE.Color(10, 1.5, 1.0);

const InteractiveLinks = props => {
  const { linksInstancesDatas, activePlateRef, interactionPromptRef } = props;

  const texture = useTexture(InteractionImage, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  });

  const interactionIndicatorMesh = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.15, 4),
        new THREE.MeshBasicMaterial({ color: BLOOM_COLOR })
      ),
    []
  );

  const activationIndicatorMesh = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: texture,
          color: BLOOM_COLOR,
          transparent: true,
          depthWrite: false,
        })
      ),
    []
  );

  const meshes = useMemo(
    () => ({
      InteractionIndicatorMesh: interactionIndicatorMesh,
      ActivationIndicatorMesh: activationIndicatorMesh,
    }),
    [interactionIndicatorMesh, activationIndicatorMesh]
  );

  return (
    <>
      <Merged meshes={meshes} ref={interactionPromptRef}>
        {({ InteractionIndicatorMesh, ActivationIndicatorMesh }) => (
          <>
            <group
              position={[-4.45, 2.5, -8.55]}
              rotation-y={0.45}
              name={interactiveElementsIds.mailBox}
            >
              <InteractionIndicatorMesh name="InteractionIndicatorMesh" />
              <ActivationIndicatorMesh
                name="ActivationIndicatorMesh"
                scale={0}
                onClick={() => {
                  const activatedInteractiveElement =
                    useStore.getState().activatedInteractiveElement.current;
                  if (
                    activatedInteractiveElement &&
                    activatedInteractiveElement ===
                      interactiveElementsIds.mailBox &&
                    IS_MOBILE_DEVICE
                  ) {
                    window.location.href =
                      'mailto:mike.fernandez.pro@gmail.com';
                  }
                }}
              />
            </group>

            <group
              position={[-3.4, 2.2, -9.09]}
              name={interactiveElementsIds.linkedIn}
              rotation-y={0.47}
            >
              <InteractionIndicatorMesh name="InteractionIndicatorMesh" />
              <ActivationIndicatorMesh
                name="ActivationIndicatorMesh"
                scale={0}
                onClick={() => {
                  const activatedInteractiveElement =
                    useStore.getState().activatedInteractiveElement.current;
                  if (
                    activatedInteractiveElement &&
                    activatedInteractiveElement ===
                      interactiveElementsIds.linkedIn &&
                    IS_MOBILE_DEVICE
                  ) {
                    window.open(LINKED_IN_URL, '_blank');
                  }
                }}
              />
            </group>

            <group
              position={[-2.26, 2.2, -9.65]}
              rotation-y={0.47}
              name={interactiveElementsIds.vercel}
            >
              <InteractionIndicatorMesh name="InteractionIndicatorMesh" />
              <ActivationIndicatorMesh
                name="ActivationIndicatorMesh"
                scale={0}
                onClick={() => {
                  const activatedInteractiveElement =
                    useStore.getState().activatedInteractiveElement.current;
                  if (
                    activatedInteractiveElement &&
                    activatedInteractiveElement ===
                      interactiveElementsIds.vercel &&
                    IS_MOBILE_DEVICE
                  ) {
                    window.open(VERCEL_URL, '_blank');
                  }
                }}
              />
            </group>

            <group
              position={[-16.14, 5.9, -37.3]}
              name={interactiveElementsIds.portal}
            >
              <InteractionIndicatorMesh name="InteractionIndicatorMesh" />
              <ActivationIndicatorMesh
                name="ActivationIndicatorMesh"
                scale={0}
                onClick={() => {
                  const activatedInteractiveElement =
                    useStore.getState().activatedInteractiveElement.current;
                  if (
                    activatedInteractiveElement &&
                    activatedInteractiveElement ===
                      interactiveElementsIds.portal &&
                    IS_MOBILE_DEVICE
                  ) {
                    window.open(
                      linksInstancesDatas[activatedInteractiveElement].userData
                        .href[activePlateRef.current],
                      '_blank'
                    );
                  }
                }}
              />
            </group>

            <group
              position={[-9.77, 7.9, -58.8]}
              name={interactiveElementsIds.statue}
            >
              <InteractionIndicatorMesh name="InteractionIndicatorMesh" />
              <ActivationIndicatorMesh
                name="ActivationIndicatorMesh"
                scale={0}
                onClick={() => {
                  if (
                    activatedInteractiveElement &&
                    activatedInteractiveElement ===
                      interactiveElementsIds.statue &&
                    IS_MOBILE_DEVICE
                  ) {
                    window.open(STATUE_URL, '_blank');
                  }
                }}
              />
            </group>
          </>
        )}
      </Merged>
    </>
  );
};

export { InteractiveLinks };
