import { useMemo } from 'react';
import { Merged } from '@react-three/drei/webgpu';
import * as THREE from 'three';

import { IS_MOBILE_DEVICE } from '#utils/utils.js';

import {
  useScreensAtlasTexture,
  SCREENS_ATLAS_RECTS,
  createAtlasTileTexture,
} from '#utils/packedTextures.js';

const INTERACTIVE_LINK_COLOR = new THREE.Color(10, 1.5, 1.0);

const Indicators = props => {
  const { interactiveElementsData, activePlateRef, interactionPromptRef } =
    props;

  // "Enter" tile of the screens atlas. The atlas has no alpha channel
  // (flattened over black), so the white text's green channel doubles as the
  // cutout mask through alphaMap. The clone keeps this material's own
  // sampling setup without touching the shared atlas texture.
  const atlasTexture = useScreensAtlasTexture();
  const interactiveLinkTexture = useMemo(() => {
    const texture = createAtlasTileTexture(
      atlasTexture,
      SCREENS_ATLAS_RECTS.interactiveLink
    );
    texture.colorSpace = THREE.NoColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }, [atlasTexture]);

  const interactionIndicatorMesh = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.15, 4),
        new THREE.MeshBasicMaterial({ color: INTERACTIVE_LINK_COLOR })
      ),
    []
  );

  const activationIndicatorMesh = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: interactiveLinkTexture,
          alphaMap: interactiveLinkTexture,
          color: INTERACTIVE_LINK_COLOR,
          transparent: true,
          depthWrite: false,
        })
      ),
    [interactiveLinkTexture]
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
            {Object.values(interactiveElementsData).map(linkInstanceData => {
              // Skip if interactive element doesn't contain an url link
              if (!linkInstanceData.userData.activateLink) {
                return null;
              }

              return (
                <group
                  position={linkInstanceData.userData.interactiveLinkPosition}
                  rotation-y={
                    linkInstanceData.userData.interactiveLinkRotationY
                  }
                  name={linkInstanceData.userData.id}
                  key={linkInstanceData.userData.id}
                >
                  <InteractionIndicatorMesh name="InteractionIndicatorMesh" />
                  {/* Scale must never be exactly 0: three r185 Matrix4.decompose
                      returns scale (1,1,1) for zero-determinant matrices, which
                      makes drei <Merged> instances reappear at full size */}
                  <ActivationIndicatorMesh
                    name="ActivationIndicatorMesh"
                    scale={0.001}
                    onClick={() => {
                      // Only activate click trigger on mobile devices
                      if (!IS_MOBILE_DEVICE) {
                        return;
                      }

                      linkInstanceData.userData.activateLink(activePlateRef);
                    }}
                  />
                </group>
              );
            })}
          </>
        )}
      </Merged>
    </>
  );
};

export { Indicators };
