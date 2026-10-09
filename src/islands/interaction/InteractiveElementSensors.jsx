import { useEffect } from 'react';
import * as THREE from 'three';

import { buildWorldSpaceBvh } from '#physics/buildBvh.js';
import { physicsWorld } from '#physics/world.js';
import { useStore } from '#store';

// One box sensor zone per interactive element (mailbox, plates, glyph...),
// baked to world space from the same position/rotation/scale the instanced
// rapier cuboids used. Entering/leaving one toggles the activated element.
const InteractiveElementSensors = props => {
  const { interactiveElementsData } = props;

  useEffect(() => {
    const unitBox = new THREE.BoxGeometry(1, 1, 1);

    const handles = Object.values(interactiveElementsData).map(data =>
      physicsWorld.addSensor({
        bvh: buildWorldSpaceBvh(unitBox, data),
        userData: data.userData,
        onEnter: state => {
          useStore.setState({
            activatedInteractiveElement: {
              prev: useStore.getState().activatedInteractiveElement.current,
              current: state.target.rigidBody.userData.id,
            },
          });
        },
        onExit: () => {
          useStore.setState({
            activatedInteractiveElement: {
              prev: useStore.getState().activatedInteractiveElement.current,
              current: null,
            },
          });
        },
      })
    );

    // The baked copies own their data
    unitBox.dispose();

    return () => handles.forEach(handle => handle.remove());
  }, [interactiveElementsData]);

  return null;
};

export { InteractiveElementSensors };
