import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshBVHHelper } from 'three-mesh-bvh';

import { physicsWorld } from '#physics/world.js';
import { useControls } from '#utils/useControls.jsx';

// Capsule turns green when the contact solve reports grounded, red in the air
const GROUNDED_COLOR = 0x44ff66;
const AIRBORNE_COLOR = 0xff5544;
const SOLID_COLOR = 0x22ff88;
const SENSOR_COLOR = 0xffaa22;
const CONTACT_COLOR = 0x66aaff;

// Matches the capture cap in PhysicsWorld
const MAX_CONTACT_ARROWS = 32;

/**
 * Physics visualization (debug "Physics" folder): wireframes of the
 * solid colliders and sensor zones, the character capsule (colored by
 * grounded state), the contact normals of the last simulated frame, and
 * optionally the island BVH boxes. Rendered only with DEBUG_ENABLED, so the
 * whole module tree-shakes out of production like the rest of the debug
 * stack. The scene rebuilds when toggled on (or via the refresh button) —
 * a death-zone height change while visualizing needs a refresh to show.
 */
const PhysicsDebug = () => {
  const groupRef = useRef();
  const capsuleRef = useRef(null);
  const arrowsRef = useRef([]);
  // Resources created here (never the physics-owned BVH geometries)
  const ownedRef = useRef([]);
  const stateRef = useRef({ visualize: false, showBvh: false });

  const disposeRef = useRef(() => {
    const group = groupRef.current;
    if (!group) return;
    [...group.children].forEach(child => group.remove(child));
    ownedRef.current.forEach(resource => resource.dispose?.());
    ownedRef.current = [];
    capsuleRef.current = null;
    arrowsRef.current = [];
  });

  const buildRef = useRef(() => {
    disposeRef.current();
    const group = groupRef.current;
    if (!group) return;
    const owned = ownedRef.current;

    const solidMaterial = new THREE.MeshBasicMaterial({
      color: SOLID_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    owned.push(solidMaterial);
    for (const solid of physicsWorld.solids) {
      group.add(new THREE.Mesh(solid.bvh.geometry, solidMaterial));
      if (stateRef.current.showBvh) {
        // MeshBVHHelper reads the mesh's boundsTree; the proxy mesh itself
        // is never added to the scene
        const proxy = new THREE.Mesh(solid.bvh.geometry);
        proxy.geometry.boundsTree = solid.bvh;
        const helper = new MeshBVHHelper(proxy, 12);
        owned.push(helper);
        group.add(helper);
      }
    }

    const sensorMaterial = new THREE.MeshBasicMaterial({
      color: SENSOR_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    owned.push(sensorMaterial);
    for (const sensor of physicsWorld.sensors) {
      group.add(new THREE.Mesh(sensor.bvh.geometry, sensorMaterial));
    }

    const body = physicsWorld.characterBody;
    if (body) {
      const capsuleGeometry = new THREE.CapsuleGeometry(
        body.capsuleRadius,
        body.capsuleHalfHeight * 2,
        4,
        12
      );
      const capsuleMaterial = new THREE.MeshBasicMaterial({
        color: GROUNDED_COLOR,
        wireframe: true,
      });
      owned.push(capsuleGeometry, capsuleMaterial);
      const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
      capsuleRef.current = capsule;
      group.add(capsule);
    }

    for (let i = 0; i < MAX_CONTACT_ARROWS; i++) {
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(),
        0.25,
        CONTACT_COLOR,
        0.06,
        0.04
      );
      arrow.visible = false;
      owned.push(arrow.line.geometry, arrow.line.material, arrow.cone.geometry);
      arrowsRef.current.push(arrow);
      group.add(arrow);
    }
  });

  useControls(
    'Physics',
    {
      visualize: {
        value: false,
        onChange: value => {
          stateRef.current.visualize = value;
          physicsWorld.debugCapture = value;
          if (value) buildRef.current();
          else disposeRef.current();
        },
      },
      showBvh: {
        value: false,
        onChange: value => {
          stateRef.current.showBvh = value;
          if (stateRef.current.visualize) buildRef.current();
        },
      },
      refresh: () => {
        if (stateRef.current.visualize) buildRef.current();
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    const dispose = disposeRef.current;
    return () => {
      physicsWorld.debugCapture = false;
      dispose();
    };
  }, []);

  useFrame(() => {
    if (!stateRef.current.visualize) return;

    const body = physicsWorld.characterBody;
    const capsule = capsuleRef.current;
    if (body && capsule) {
      const { x, y, z } = body.translation();
      capsule.position.set(x, y + body.capsuleOffsetY, z);
      capsule.material.color.setHex(
        body.isGrounded() ? GROUNDED_COLOR : AIRBORNE_COLOR
      );
    }

    const contacts = physicsWorld.debugContacts;
    arrowsRef.current.forEach((arrow, i) => {
      const contact = contacts[i];
      arrow.visible = contact !== undefined;
      if (contact) {
        arrow.position.copy(contact.point);
        arrow.setDirection(contact.normal);
      }
    });
  });

  return <group ref={groupRef} />;
};

export { PhysicsDebug };
