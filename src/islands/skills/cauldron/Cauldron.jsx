import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from '#debug/useControls.jsx';
import * as THREE from 'three/webgpu';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

import {
  POTION_DEFAULTS,
  createCauldronPotionMaterial,
  createCauldronPotionUniforms,
  potionControls,
} from './cauldronPotion.js';
import {
  cauldronBubblesControls,
  createCauldronBubbles,
} from './cauldronBubbles.js';

// Pot self-rotation is idle motion; the liquid/bubbles stay animated
const SPEED = REDUCED_MOTION_AT_LOAD ? 0 : 0.5;
const POTION_PLANE_HEIGHT = 0;
const BUBBLES_SURFACE_OFFSET = 0.02;

const Cauldron = props => {
  const { island } = props;

  const potionMeshRef = useRef(null);
  const bubblesPointsRef = useRef(null);
  const planeHeightRef = useRef(POTION_PLANE_HEIGHT);

  const perlinNoiseTexture = useVoronoiPerlinTexture();

  // The potion mesh has no UVs: the vertex shader maps the potion onto the
  // liquid disc from its local-space XZ bounds instead
  const potionBounds = useMemo(() => {
    const geometry = island.nodes.island_8.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;

    return {
      center: new THREE.Vector2((min.x + max.x) / 2, (min.z + max.z) / 2),
      halfSize: new THREE.Vector2((max.x - min.x) / 2, (max.z - min.z) / 2),
      surfaceY: max.y,
    };
  }, [island]);

  const applyPlaneHeight = height => {
    planeHeightRef.current = height;

    if (potionMeshRef.current) {
      potionMeshRef.current.position.y = height;
    }

    if (bubblesPointsRef.current) {
      bubblesPointsRef.current.position.y =
        potionBounds.surfaceY + BUBBLES_SURFACE_OFFSET + height;
    }
  };

  useLayoutEffect(() => {
    applyPlaneHeight(planeHeightRef.current);
  }, [potionBounds]);

  const { bubbles, uniforms: bubblesUniforms } = useMemo(() => {
    const created = createCauldronBubbles(potionBounds.halfSize);
    // Above the liquid disc (the height follows the planeHeight control)
    created.bubbles.position.set(
      potionBounds.center.x,
      potionBounds.surfaceY + BUBBLES_SURFACE_OFFSET + POTION_PLANE_HEIGHT,
      potionBounds.center.y
    );
    return created;
  }, [potionBounds]);

  useEffect(() => () => bubbles.material.dispose(), [bubbles]);
  bubblesPointsRef.current = bubbles;

  useControls(
    'CauldronBubbles',
    cauldronBubblesControls(bubbles, bubblesUniforms)
  );

  const { potionMaterial, potionUniforms } = useMemo(() => {
    const potionUniforms = createCauldronPotionUniforms(
      POTION_DEFAULTS,
      potionBounds
    );
    const potionMaterial = createCauldronPotionMaterial(
      potionUniforms,
      perlinNoiseTexture
    );
    return { potionMaterial, potionUniforms };
  }, [perlinNoiseTexture, potionBounds]);

  useEffect(() => () => potionMaterial.dispose(), [potionMaterial]);

  useControls('CauldronPotion', {
    planeHeight: {
      value: POTION_PLANE_HEIGHT,
      min: -0.5,
      max: 0.5,
      step: 0.001,
      onChange: applyPlaneHeight,
    },
    ...potionControls(potionUniforms),
  });

  useFrame((state, delta) => {
    island.nodes.pot.rotation.y += delta * SPEED;
  });

  return (
    <>
      <skinnedMesh
        ref={potionMeshRef}
        name="island_8"
        geometry={island.nodes.island_8.geometry}
        skeleton={island.nodes.island_8.skeleton}
        morphTargetDictionary={island.nodes.island_8.morphTargetDictionary}
        morphTargetInfluences={island.nodes.island_8.morphTargetInfluences}
        material={potionMaterial}
      />
      {/* Boiling bubbles above the liquid disc */}
      <primitive object={bubbles} />
    </>
  );
};

export { Cauldron };
