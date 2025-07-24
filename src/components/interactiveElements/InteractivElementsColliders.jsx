import { InstancedRigidBodies } from '@react-three/rapier';
import { useMemo } from 'react';
import { interactiveElementsCount } from './interactiveElementsUtils.js';
import { useStore } from '../../store/ZustandStorage.jsx';

const InteractivElementsColliders = props => {
  const { linksInstancesDatas } = props;

  const instances = useMemo(
    () =>
      Object.entries(linksInstancesDatas).map(([key, data], i) => ({
        key: `instance_${i}`,
        ...data,
      })),
    [linksInstancesDatas]
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
        <instancedMesh args={[undefined, undefined, interactiveElementsCount]}>
          <boxGeometry />
          <meshBasicMaterial visible={false} />
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  );
};

export { InteractivElementsColliders };
