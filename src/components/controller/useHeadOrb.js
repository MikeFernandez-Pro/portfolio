import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { useStore } from '#store/ZustandStorage.jsx';
import { useControls } from '#utils/useControls.jsx';

const ORB_GROUP_NAME = 'headOrbGroup';

const ORB_DEFAULTS = {
  color: '#91ffd0',
  intensity: 3.6,
  // Radius and height offset in character glb root units (x0.18 in world)
  scale: 0.62,
  height: 0.43,
};

// Glowing orb floating inside the character's head (visible through the
// helmet openings). Same attachment trick as the belt lantern: a group under
// the head bone whose local matrix (boneInverse * bindMatrix) reproduces the
// character glb root frame, so the controls work in character units.
const useHeadOrb = scene => {
  const orbRef = useRef(null);
  const groupRef = useRef(null);
  // Head bone origin at bind pose, in character root space
  const baseRef = useRef(new THREE.Vector3());
  const settings = useRef({ ...ORB_DEFAULTS }).current;

  const applySettings = () => {
    const orb = orbRef.current;
    const group = groupRef.current;
    if (!orb || !group) return;
    orb.scale.setScalar(settings.scale);
    group.position
      .copy(baseRef.current)
      .add(new THREE.Vector3(0, settings.height, 0));
    orb.material.color.set(settings.color).multiplyScalar(settings.intensity);
  };

  useLayoutEffect(() => {
    const knight = scene.getObjectByName('knight');
    // GLTFLoader strips ':' from node names: mixamorig:Head -> mixamorigHead
    let head = scene.getObjectByName('mixamorigHead');
    if (!head) {
      scene.traverse(object => {
        if (!head && object.isBone && /Head$/.test(object.name)) head = object;
      });
    }
    if (!knight?.skeleton || !head) return;

    const boneIndex = knight.skeleton.bones.indexOf(head);
    if (boneIndex === -1) return;
    head.getObjectByName(ORB_GROUP_NAME)?.removeFromParent();

    // Character root frame welded to the head bone (see useLanternAttachment)
    const bindLocal = new THREE.Matrix4()
      .copy(knight.skeleton.boneInverses[boneIndex])
      .multiply(knight.bindMatrix);

    const attachGroup = new THREE.Group();
    attachGroup.name = ORB_GROUP_NAME;
    bindLocal.decompose(
      attachGroup.position,
      attachGroup.quaternion,
      attachGroup.scale
    );

    // The head bone origin in root space is the inverse bind translation
    baseRef.current.setFromMatrixPosition(bindLocal.clone().invert());

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16, 0, Math.PI),
      new THREE.MeshBasicMaterial({
        transparent: true,
        toneMapped: false,
        // The helmet still occludes the orb (it writes depth), the orb just
        // never fights other transparents
        depthWrite: false,
      })
    );

    const group = new THREE.Group();
    group.add(orb);
    attachGroup.add(group);
    head.add(attachGroup);

    orbRef.current = orb;
    groupRef.current = group;
    applySettings();

    return () => {
      attachGroup.removeFromParent();
      orb.geometry.dispose();
      orb.material.dispose();
      orbRef.current = null;
      groupRef.current = null;
    };
  }, [scene]);

  useControls(
    'HeadOrb',
    {
      color: {
        value: ORB_DEFAULTS.color,
        onChange: v => {
          settings.color = v;
          applySettings();
        },
      },
      intensity: {
        value: ORB_DEFAULTS.intensity,
        min: 0,
        max: 10,
        step: 0.05,
        onChange: v => {
          settings.intensity = v;
          applySettings();
        },
      },
      scale: {
        value: ORB_DEFAULTS.scale,
        min: 0.01,
        max: 2,
        step: 0.01,
        onChange: v => {
          settings.scale = v;
          applySettings();
        },
      },
      height: {
        value: ORB_DEFAULTS.height,
        min: -2,
        max: 2,
        step: 0.01,
        onChange: v => {
          settings.height = v;
          applySettings();
        },
      },
    },
    { collapsed: true, reset: true }
  );

  // Fade with the respawn dissolve so the orb never floats in a half-formed
  // character
  useFrame(() => {
    const orb = orbRef.current;
    if (!orb) return;
    const uniforms = useStore.getState().characterRespawnUniforms;
    orb.material.opacity = uniforms?.uCharFormProgress
      ? uniforms.uCharFormProgress.value
      : 1;
  });
};

export { useHeadOrb };
