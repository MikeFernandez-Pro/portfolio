import { useMemo } from 'react';
import { InstancedRigidBodies } from '@react-three/rapier';

import { INTERACTIVE_ELEMENTS_COUNT } from './interactiveElementsData.js';
import { useStore } from '#store/ZustandStorage.jsx';

const InteractivElementsColliders = props => {
  const { interactiveElementsData } = props;

  const instances = useMemo(
    () =>
      Object.entries(interactiveElementsData).map(([key, data], i) => ({
        key: `instance_${i}`,
        ...data,
      })),
    [interactiveElementsData]
  );

  return (
    <>
      <InstancedRigidBodies
        instances={instances}
        colliders="cuboid"
        type={'fixed'}
        sensor
        onIntersectionEnter={state => {
          useStore.setState({
            activatedInteractiveElement: {
              prev: useStore.getState().activatedInteractiveElement.current,
              current: state.target.rigidBody.userData.id,
            },
          });
        }}
        onIntersectionExit={() => {
          useStore.setState({
            activatedInteractiveElement: {
              prev: useStore.getState().activatedInteractiveElement.current,
              current: null,
            },
          });
        }}
      >
        <instancedMesh
          args={[undefined, undefined, INTERACTIVE_ELEMENTS_COUNT]}
        >
          <boxGeometry />
          <meshBasicMaterial visible={false} />
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  );
};

export { InteractivElementsColliders };
