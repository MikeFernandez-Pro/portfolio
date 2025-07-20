import { InstancedRigidBodies } from '@react-three/rapier';
import { useMemo } from 'react';
import { interactiveElementsCount } from './interactiveElementsConstants.js';

const InteractivElementsColliders = props => {
  const { linksInstancesDatas } = props;

  const instances = useMemo(
    () =>
      Array.from({ length: interactiveElementsCount }, (_, i) => ({
        key: `instance_${i}`,
        ...linksInstancesDatas[i],
      })),
    [linksInstancesDatas]
  );

  return (
    <InstancedRigidBodies
      instances={instances}
      colliders="cuboid"
      type={'fixed'}
      sensor
      onIntersectionEnter={state =>
        state.target.rigidBody.userData.startInteraction(
          state.target.rigidBody.userData
        )
      }
      onIntersectionExit={state => {
        state.target.rigidBody.userData.closeInteraction();
      }}
    >
      <instancedMesh args={[undefined, undefined, interactiveElementsCount]}>
        <boxGeometry />
        <meshBasicMaterial visible={false} />
      </instancedMesh>
    </InstancedRigidBodies>
  );
};

export { InteractivElementsColliders };
