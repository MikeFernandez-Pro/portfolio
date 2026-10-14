import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei/webgpu';

import { buildWorldSpaceBvh } from '#physics/buildBvh.js';
import { physicsWorld } from '#physics/world.js';
import { useControls } from '#debug/useControls.jsx';
import { ISLAND_POSITION, ISLAND_SCALE } from '#islands/islandSpace.js';

import FallingZoneModel from '#assets/models/islandSensors/fallingZone.glb';

// Registers a sensor zone baked at `position`; returns its remover
const addZone = (geometry, position, onEnter) =>
  physicsWorld.addSensor({
    bvh: buildWorldSpaceBvh(geometry, { position, scale: ISLAND_SCALE }),
    onEnter,
  }).remove;

// Two trimesh sensor zones stretched under the island edges (same GLB,
// authored in island space):
// - falling zone (just below the walkable surface, ~y 0.38): crossing it
//   means the character fell off an island, which starts the fall
// - death zone (same plane, deathZoneHeight lower): crossing it causes
//   death (the controller keeps a height check as fallback). Its GLB node
//   translation is ignored — the drop below the falling zone is the
//   debug-tunable world-space offset instead (moving the slider re-bakes the
//   tiny mesh).
const FallAndDeathZones = ({ onFallingZoneEnter, onDeathZoneEnter }) => {
  const { nodes } = useGLTF(FallingZoneModel);

  // Keep the latest callbacks without re-registering the sensors
  const onFallingZoneEnterRef = useRef();
  const onDeathZoneEnterRef = useRef();
  onFallingZoneEnterRef.current = onFallingZoneEnter;
  onDeathZoneEnterRef.current = onDeathZoneEnter;

  const { deathZoneHeight } = useControls('Character Death', {
    deathZoneHeight: { value: -1, min: -10, max: 0, step: 0.1 },
  });

  useEffect(
    () =>
      addZone(nodes.fallingZone.geometry, ISLAND_POSITION, () =>
        onFallingZoneEnterRef.current?.()
      ),
    [nodes]
  );

  useEffect(
    () =>
      addZone(
        nodes.deathZone.geometry,
        [
          ISLAND_POSITION[0],
          ISLAND_POSITION[1] + deathZoneHeight,
          ISLAND_POSITION[2],
        ],
        () => onDeathZoneEnterRef.current?.()
      ),
    [nodes, deathZoneHeight]
  );

  return null;
};

useGLTF.preload(FallingZoneModel);

export { FallAndDeathZones };
