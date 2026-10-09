import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Mesh } from 'three/webgpu';
import {
  SAH,
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';

/**
 * drei's <Bvh>: builds a three-mesh-bvh bounds tree for every mesh below it
 * so pointer raycasts stay cheap. Local copy: drei 11's `external` entry
 * pulls a whole-`three` namespace import (and camera-controls, maath...)
 * into the bundle for this one component. Also uses three-mesh-bvh's
 * current option name (targetLeafSize, not the deprecated maxLeafTris).
 */
const Bvh = props => {
  const { firstHitOnly = false, children } = props;

  const ref = useRef(null);
  const raycaster = useThree(state => state.raycaster);

  useEffect(() => {
    const group = ref.current;
    const options = { strategy: SAH, maxDepth: 40, targetLeafSize: 10 };
    raycaster.firstHitOnly = firstHitOnly;

    group.traverse(child => {
      if (
        child.isMesh &&
        !child.geometry.boundsTree &&
        child.raycast === Mesh.prototype.raycast
      ) {
        child.raycast = acceleratedRaycast;
        child.geometry.computeBoundsTree = computeBoundsTree;
        child.geometry.disposeBoundsTree = disposeBoundsTree;
        child.geometry.computeBoundsTree(options);
      }
    });

    return () => {
      delete raycaster.firstHitOnly;
      group.traverse(child => {
        if (child.isMesh && child.geometry.boundsTree) {
          child.geometry.disposeBoundsTree();
          child.raycast = Mesh.prototype.raycast;
        }
      });
    };
  }, []);

  return <group ref={ref}>{children}</group>;
};

export { Bvh };
