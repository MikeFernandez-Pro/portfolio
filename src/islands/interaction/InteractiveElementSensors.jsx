import { useEffect } from 'react';
import * as THREE from 'three/webgpu';

import { buildWorldSpaceBvh } from '#physics/buildBvh.js';
import { physicsWorld } from '#physics/world.js';
import { useStore } from '#store';

// One box sensor zone per interactive element (mailbox, plates, glyph...),
// baked to world space from its sensor position/rotation/scale. Entering or
// leaving one sets the active element id.
const InteractiveElementSensors = ({ elements }) => {
  useEffect(() => {
    const unitBox = new THREE.BoxGeometry(1, 1, 1);

    const handles = elements.map(element =>
      physicsWorld.addSensor({
        bvh: buildWorldSpaceBvh(unitBox, element.sensor),
        onEnter: () => useStore.setState({ activeElementId: element.id }),
        onExit: () => useStore.setState({ activeElementId: null }),
      })
    );

    // The baked copies own their data
    unitBox.dispose();

    return () => handles.forEach(handle => handle.remove());
  }, [elements]);

  return null;
};

export { InteractiveElementSensors };
