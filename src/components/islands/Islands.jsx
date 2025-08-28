import React, { useEffect, useRef } from 'react';
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
  const islandRef = useRef();

  const island = useGLTF(islandModel);

  const { nodes, materials, animations } = island;

  const islandAnimations = useAnimations(animations, islandRef);

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
    <group ref={islandRef} scale={0.45} position={ISLAND_POSITION}>
      <group name="island">
        <ContactIsland
          islandNodes={nodes}
          islandAnimations={islandAnimations}
        />
        <skinnedMesh
          name="island_1"
          geometry={nodes.island_1.geometry}
          material={materials.islandTexture}
          skeleton={nodes.island_1.skeleton}
          morphTargetDictionary={nodes.island_1.morphTargetDictionary}
          morphTargetInfluences={nodes.island_1.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_2"
          geometry={nodes.island_2.geometry}
          material={materials.lanternsAndHomes}
          skeleton={nodes.island_2.skeleton}
          morphTargetDictionary={nodes.island_2.morphTargetDictionary}
          morphTargetInfluences={nodes.island_2.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_3"
          geometry={nodes.island_3.geometry}
          material={materials.torchesAndFire}
          skeleton={nodes.island_3.skeleton}
          morphTargetDictionary={nodes.island_3.morphTargetDictionary}
          morphTargetInfluences={nodes.island_3.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_4"
          geometry={nodes.island_4.geometry}
          material={materials.forgeSword}
          skeleton={nodes.island_4.skeleton}
          morphTargetDictionary={nodes.island_4.morphTargetDictionary}
          morphTargetInfluences={nodes.island_4.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_5"
          geometry={nodes.island_5.geometry}
          material={materials.candles}
          skeleton={nodes.island_5.skeleton}
          morphTargetDictionary={nodes.island_5.morphTargetDictionary}
          morphTargetInfluences={nodes.island_5.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_6"
          geometry={nodes.island_6.geometry}
          material={materials.lava}
          skeleton={nodes.island_6.skeleton}
          morphTargetDictionary={nodes.island_6.morphTargetDictionary}
          morphTargetInfluences={nodes.island_6.morphTargetInfluences}
        />

        <skinnedMesh
          name="island_8"
          geometry={nodes.island_8.geometry}
          material={materials.potion}
          skeleton={nodes.island_8.skeleton}
          morphTargetDictionary={nodes.island_8.morphTargetDictionary}
          morphTargetInfluences={nodes.island_8.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_9"
          geometry={nodes.island_9.geometry}
          material={materials.magicPortal}
          skeleton={nodes.island_9.skeleton}
          morphTargetDictionary={nodes.island_9.morphTargetDictionary}
          morphTargetInfluences={nodes.island_9.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_10"
          geometry={nodes.island_10.geometry}
          material={materials.magicBooks}
          skeleton={nodes.island_10.skeleton}
          morphTargetDictionary={nodes.island_10.morphTargetDictionary}
          morphTargetInfluences={nodes.island_10.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_11"
          geometry={nodes.island_11.geometry}
          material={materials.magicLetters}
          skeleton={nodes.island_11.skeleton}
          morphTargetDictionary={nodes.island_11.morphTargetDictionary}
          morphTargetInfluences={nodes.island_11.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_12"
          geometry={nodes.island_12.geometry}
          material={materials.seaPlate}
          skeleton={nodes.island_12.skeleton}
          morphTargetDictionary={nodes.island_12.morphTargetDictionary}
          morphTargetInfluences={nodes.island_12.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_13"
          geometry={nodes.island_13.geometry}
          material={materials.halloweenPlate}
          skeleton={nodes.island_13.skeleton}
          morphTargetDictionary={nodes.island_13.morphTargetDictionary}
          morphTargetInfluences={nodes.island_13.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_14"
          geometry={nodes.island_14.geometry}
          material={materials.portalPlate}
          skeleton={nodes.island_14.skeleton}
          morphTargetDictionary={nodes.island_14.morphTargetDictionary}
          morphTargetInfluences={nodes.island_14.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_15"
          geometry={nodes.island_15.geometry}
          material={materials.signs}
          skeleton={nodes.island_15.skeleton}
          morphTargetDictionary={nodes.island_15.morphTargetDictionary}
          morphTargetInfluences={nodes.island_15.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_16"
          geometry={nodes.island_16.geometry}
          material={materials.controls}
          skeleton={nodes.island_16.skeleton}
          morphTargetDictionary={nodes.island_16.morphTargetDictionary}
          morphTargetInfluences={nodes.island_16.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_17"
          geometry={nodes.island_17.geometry}
          material={materials.britishFlag}
          skeleton={nodes.island_17.skeleton}
          morphTargetDictionary={nodes.island_17.morphTargetDictionary}
          morphTargetInfluences={nodes.island_17.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_18"
          geometry={nodes.island_18.geometry}
          material={materials.frenchFlag}
          skeleton={nodes.island_18.skeleton}
          morphTargetDictionary={nodes.island_18.morphTargetDictionary}
          morphTargetInfluences={nodes.island_18.morphTargetInfluences}
        />
        <skinnedMesh
          name="island_19"
          geometry={nodes.island_19.geometry}
          material={materials.spainFlag}
          skeleton={nodes.island_19.skeleton}
          morphTargetDictionary={nodes.island_19.morphTargetDictionary}
          morphTargetInfluences={nodes.island_19.morphTargetInfluences}
        />
      </group>
      <primitive object={nodes.hammer} />
      <primitive object={nodes.anvilSword} />
      <primitive object={nodes.pot} />
      <primitive object={nodes.portal} />
      <primitive object={nodes.smallGlyph} />
      <primitive object={nodes.glyph} />
      <primitive object={nodes.neutral_bone} />
    </group>
    // <primitive
    // object={island.scene}
    // scale={0.45}
    // position={ISLAND_POSITION}
    // />
    // <LanternsAndHome island={island} />

    // <ContactIsland island={island} islandAnimations={islandAnimations} />
    // <SkillsIsland island={island} />
    // <ProjectIsland island={island} />
    // <ResumeIsland island={island} />
  );
};

useGLTF.preload(islandModel);

export default Islands;
