import React, { useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

import { IS_MOBILE_DEVICE } from '#utils/utils.js';

import { LanternsAndHome } from '#islands/common/LanternsAndHome';
import { ContactIsland } from '#islands/contactIsland/ContactIsland';
import { SkillsIsland } from '#islands/skillsIsland/SkillsIsland';
import { ProjectIsland } from '#islands/projectsIsland/ProjectIsland';
import { ResumeIsland } from '#islands/resumeIsland/ResumeIsland';

import islandModel from '#assets/models/island/island.glb?url';

const ISLAND_POSITION = new THREE.Vector3(-1.35, 2.25, -15);

const Islands = () => {
  const island = useGLTF(islandModel);

  const islandAnimations = useAnimations(island.animations, island.scene);

  useEffect(() => {
    const islandMesh = island.scene.getObjectByName('island_1');

    if (islandMesh) {
      islandMesh.receiveShadow = !IS_MOBILE_DEVICE;
      islandMesh.material.roughness = 1;
    }

    // Hide keyboard controls on mobile
    island.materials.controls.visible = !IS_MOBILE_DEVICE;

    // Play island animations
    islandAnimations.actions['details'].play();
  }, []);

  return (
    <>
      <primitive
        object={island.scene}
        scale={0.45}
        position={ISLAND_POSITION}
      />
      <LanternsAndHome island={island} />

      <ContactIsland island={island} islandAnimations={islandAnimations} />
      <SkillsIsland island={island} />
      <ProjectIsland island={island} />
      <ResumeIsland island={island} />
    </>
  );
};

useGLTF.preload(islandModel);

export default Islands;
