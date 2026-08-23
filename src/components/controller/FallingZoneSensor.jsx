import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';

import { useControls } from '#utils/useControls.jsx';
import FallingZoneModel from '#assets/models/islandSensors/fallingZone.glb';

// Both zones are authored in island space, so they carry the same transform
// as the Islands group
const ISLAND_SCALE = 0.45;
const ISLAND_POSITION = [-1.35, 2.25, -15];

// Two trimesh sensors stretched under the island edges (from the same GLB):
// - fallingZone (just below the walkable surface, ~y 0.38): crossing it
//   means the character fell off the world, which triggers the falling
//   animation
// - deathZone (same plane, deathZoneHeight lower): crossing it kills the
//   character (a height check remains as fallback). Its GLB node translation
//   is ignored — the drop below the falling zone is the debug-tunable
//   world-space offset instead.
// Both meshes exist only to feed the trimesh sensors, they never render
export default function FallingZoneSensor({ onEnter, onDeathEnter }) {
  const { nodes } = useGLTF(FallingZoneModel);

  const { deathZoneHeight } = useControls(
    'Falling',
    {
      deathZoneHeight: { value: -1, min: -10, max: 0, step: 0.1 },
    },
    { collapsed: true }
  );

  return (
    <>
      <RigidBody
        type={'fixed'}
        colliders={'trimesh'}
        sensor
        includeInvisible
        onIntersectionEnter={onEnter}
      >
        <mesh
          geometry={nodes.fallingZone.geometry}
          scale={ISLAND_SCALE}
          position={ISLAND_POSITION}
          visible={false}
        />
      </RigidBody>
      {/* Transform lives on the RigidBody (not the mesh) so the height
          slider teleports the collider along with the visual */}
      <RigidBody
        type={'fixed'}
        colliders={'trimesh'}
        sensor
        includeInvisible
        scale={ISLAND_SCALE}
        position={[
          ISLAND_POSITION[0],
          ISLAND_POSITION[1] + deathZoneHeight,
          ISLAND_POSITION[2],
        ]}
        onIntersectionEnter={onDeathEnter}
      >
        <mesh geometry={nodes.deathZone.geometry} visible={false} />
      </RigidBody>
    </>
  );
}

useGLTF.preload(FallingZoneModel);
