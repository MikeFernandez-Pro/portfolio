import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei/webgpu';

import { buildWorldSpaceBvh } from '#physics/buildBvh.js';
import { physicsWorld } from '#physics/world.js';
import { useControls } from '#debug/useControls.jsx';

import FallingZoneModel from '#assets/models/islandSensors/fallingZone.glb';

// Both zones are authored in island space, so they carry the same transform
// as the Islands group
const ISLAND_SCALE = 0.45;
const ISLAND_POSITION = [-1.35, 2.25, -15];

// Two trimesh sensor zones stretched under the island edges (same GLB):
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

  const { deathZoneHeight } = useControls('Player Death', {
    deathZoneHeight: { value: -1, min: -10, max: 0, step: 0.1 },
  });

  useEffect(() => {
    const bvh = buildWorldSpaceBvh(nodes.fallingZone.geometry, {
      position: ISLAND_POSITION,
      scale: ISLAND_SCALE,
    });
    const handle = physicsWorld.addSensor({
      bvh,
      onEnter: event => onFallingZoneEnterRef.current?.(event),
    });
    return () => handle.remove();
  }, [nodes]);

  useEffect(() => {
    const bvh = buildWorldSpaceBvh(nodes.deathZone.geometry, {
      position: [
        ISLAND_POSITION[0],
        ISLAND_POSITION[1] + deathZoneHeight,
        ISLAND_POSITION[2],
      ],
      scale: ISLAND_SCALE,
    });
    const handle = physicsWorld.addSensor({
      bvh,
      onEnter: event => onDeathZoneEnterRef.current?.(event),
    });
    return () => handle.remove();
  }, [nodes, deathZoneHeight]);

  return null;
};

useGLTF.preload(FallingZoneModel);

export { FallAndDeathZones };
