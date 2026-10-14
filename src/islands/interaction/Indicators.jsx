import { useMemo } from 'react';
import { Merged } from '@react-three/drei/webgpu';
import * as THREE from 'three/webgpu';

import { IS_MOBILE_DEVICE } from '#utils/device.js';
import {
  INDICATOR_ENTER_TILE,
  INDICATOR_RING,
  openLink,
} from './interactions.js';

import {
  useScreensAtlasTexture,
  SCREENS_ATLAS_RECTS,
  createAtlasTileTexture,
} from '#utils/packedTextures.js';

const INDICATOR_COLOR = new THREE.Color(10, 1.5, 1.0);

/**
 * One indicator per link, named by link id: a diamond ring that turns into
 * the Enter tile while the character stands in the link's sensor zone
 * (interactions.js animates them). `ref` receives the group holding them.
 */
const Indicators = ({ links, ref }) => {
  // "Enter" tile of the screens atlas. The atlas has no alpha channel
  // (flattened over black), so the white text's green channel doubles as the
  // cutout mask through alphaMap. The clone keeps this material's own
  // sampling setup without touching the shared atlas texture.
  const atlasTexture = useScreensAtlasTexture();
  const enterTileTexture = useMemo(() => {
    const texture = createAtlasTileTexture(
      atlasTexture,
      SCREENS_ATLAS_RECTS.enterTile
    );
    texture.colorSpace = THREE.NoColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }, [atlasTexture]);

  const ringMesh = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.15, 4),
        new THREE.MeshBasicMaterial({ color: INDICATOR_COLOR })
      ),
    []
  );

  const enterTileMesh = useMemo(
    () =>
      new THREE.Mesh(
        // Inset tile (SCREENS_ATLAS_RECTS, 250x252 of 256): smaller plane,
        // centered where the crop sits so the text keeps the size and place
        // it had on the full 1x1 tile
        new THREE.PlaneGeometry(250 / 256, 252 / 256).translate(
          -1 / 256,
          0,
          0
        ),
        new THREE.MeshBasicMaterial({
          map: enterTileTexture,
          alphaMap: enterTileTexture,
          color: INDICATOR_COLOR,
          transparent: true,
          depthWrite: false,
        })
      ),
    [enterTileTexture]
  );

  const meshes = useMemo(
    () => ({ Ring: ringMesh, EnterTile: enterTileMesh }),
    [ringMesh, enterTileMesh]
  );

  return (
    // One instance per link (drei allocates 1000 by default)
    <Merged meshes={meshes} limit={links.length} ref={ref}>
      {({ Ring, EnterTile }) =>
        links.map(link => (
          <group
            position={link.indicator.position}
            rotation-y={link.indicator.rotationY}
            name={link.id}
            key={link.id}
          >
            <Ring name={INDICATOR_RING} />
            {/* Scale must never be exactly 0 (here or in the interactions.js
                tweens): three's Matrix4.decompose returns scale (1,1,1) for
                zero-determinant matrices, which makes drei <Merged>
                instances reappear at full size */}
            <EnterTile
              name={INDICATOR_ENTER_TILE}
              scale={0.001}
              // Tap to open: mobile only (desktop uses Enter). No handler on
              // desktop, so R3F doesn't raycast the tiles on every pointer move
              onClick={IS_MOBILE_DEVICE ? () => openLink(link) : undefined}
            />
          </group>
        ))
      }
    </Merged>
  );
};

export { Indicators };
