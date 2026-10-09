import React, { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei/webgpu';
import * as THREE from 'three/webgpu';

import { IS_MOBILE_DEVICE } from '#utils/device.js';

import { patchCloudShadows } from '#shaders/cloudShadows.js';
import {
  setCandleLightPositions,
  patchPointLights,
} from '#islands/world/pointLights/pointLights.js';
import { PointLightsControls } from '#islands/world/pointLights/PointLightsControls.jsx';
import { TorchSmoke } from '#islands/world/torches/TorchSmoke.jsx';
import { CauldronSmoke } from '#islands/skills/cauldron/CauldronSmoke.jsx';
import { LanternsAndHome } from '#islands/world/lanterns/LanternsAndHome';
import { WindowRay } from '#islands/world/WindowRay';
import { IslandMaterialsControls } from '#islands/world/IslandMaterialsControls';
import { ContactIsland } from '#islands/contact/ContactIsland';
import { ForgeLavaPlane } from '#islands/contact/forge/ForgeLavaPlane.jsx';
import { SkillsIsland } from '#islands/skills/SkillsIsland';
import { ProjectsIsland } from '#islands/projects/ProjectsIsland';
import { ResumeIsland } from '#islands/resume/ResumeIsland';
import { CountriesFlags } from '#islands/resume/countryFlags/CountriesFlags';

import { useIslandTexture } from '#utils/packedTextures.js';
import { toNodeMaterial } from '#utils/nodeMaterials.js';

import islandModel from '#assets/models/island/island.glb?url';

const ISLAND_POSITION = new THREE.Vector3(-1.35, 2.25, -15);

// island.glb materials that share islandTexture2k.ktx2 as baseColor map (the
// GLB itself embeds no texture)
const TEXTURED_MATERIALS = [
  'islandTexture',
  'magicBooks',
  'magicLetters',
  'seaPlate',
  'halloweenPlate',
  'portalPlate',
  'signs',
  'controls',
  'britishFlag',
  'frenchFlag',
  'spainFlag',
];

// World-space cauldron position (GLB `pot` node through the island group
// transform), smoke rises from just above the potion surface
const CAULDRON_SMOKE_POSITION = [8.64, 3.1, -29.73];

// World-space torch smoke positions: the torch flames (the coordinates noted
// next to each sparks offset in TorchesSparks.jsx) minus the bonfire, which
// already has its own Smoke component, with the hand-tuned per-torch offsets
// baked in
const TORCH_SMOKE_POSITIONS = [
  [-5.78, 1.7, -16.55],
  [-18.51, 5.8, -30.99],
  [-18.31, 5.8, -35.71],
  [-13.83, 5.8, -35.57],
  [-10.87, 7.88, -46.85],
  [-15.29, 7.69, -52.85],
  [-4.68, 7.8, -52.99],
  [-6.28, 8.37, -57.97],
  [-13.13, 8.4, -57.97],
];

const Islands = () => {
  const islandRef = useRef();

  const island = useGLTF(islandModel);

  const { nodes, materials, animations } = island;

  // Assign the shared texture during render, before children mount: MagicBooks
  // clones magicBooks, FloatingSkills reads magicLetters.map and CountryFlag
  // copies the flags' map while rendering
  const islandTexture = useIslandTexture();
  useMemo(() => {
    for (const name of TEXTURED_MATERIALS) {
      materials[name].map = islandTexture;
      materials[name].needsUpdate = true;
    }

    // The terrain gets the TSL cloud shadows and island point lights, which
    // need a node material: swap it in the GLTF materials map (the JSX below
    // and IslandMaterialsControls read it from there)
    const terrain = toNodeMaterial(materials.islandTexture);
    terrain.roughness = 1;
    patchCloudShadows(terrain);
    patchPointLights(terrain);
    materials.islandTexture = terrain;
  }, [materials, islandTexture]);

  // The GLB clips animate island_7 and island_11 (the baked floating skills,
  // replaced by the text in FloatingSkills), neither mounted — drop those
  // tracks so the mixer doesn't warn about a missing node
  const filteredAnimations = useMemo(() => {
    // Each island primitive gets one interleaved weights track (all morph
    // targets together), so removing the cauldron bubble means zeroing the
    // potBubbles component inside the values rather than dropping a track
    const morphDictionary = nodes.island_1.morphTargetDictionary;
    const potBubblesIndex = morphDictionary.potBubbles;
    const targetCount = Object.keys(morphDictionary).length;

    animations.forEach(clip => {
      clip.tracks = clip.tracks.filter(
        track =>
          !track.name.startsWith('island_7.') &&
          !track.name.startsWith('island_11.')
      );

      clip.tracks.forEach(track => {
        if (!track.name.endsWith('.morphTargetInfluences')) return;
        for (
          let i = potBubblesIndex;
          i < track.values.length;
          i += targetCount
        ) {
          track.values[i] = 0;
        }
      });
    });
    return animations;
  }, [animations, nodes]);

  const islandAnimations = useAnimations(filteredAnimations, islandRef);

  useEffect(() => {
    // The pot bubbles are visible at rest in the base geometry (their morph
    // animation is already zeroed in filteredAnimations): identify their
    // vertices through the potBubbles morph deltas — only bubble vertices
    // have non-zero ones — and shove them far below the island
    const morphDictionary = nodes.island_1.morphTargetDictionary;
    const potBubblesIndex = morphDictionary.potBubbles;

    Object.values(nodes).forEach(node => {
      const geometry = node.geometry;
      const bubbleDeltas =
        geometry?.morphAttributes?.position?.[potBubblesIndex];
      if (!bubbleDeltas || geometry.userData.potBubblesHidden) return;

      const position = geometry.attributes.position;
      for (let i = 0; i < bubbleDeltas.count; i++) {
        if (
          bubbleDeltas.getX(i) !== 0 ||
          bubbleDeltas.getY(i) !== 0 ||
          bubbleDeltas.getZ(i) !== 0
        ) {
          position.setY(i, position.getY(i) - 30);
        }
      }
      position.needsUpdate = true;
      geometry.userData.potBubblesHidden = true;
    });

    // The Vercel sign quads are baked into the signs primitive together with
    // the mail and LinkedIn ones, but they sit apart at x > -3 in geometry
    // space — shove them below the island, XSign renders an X logo in their
    // place
    const signsPosition = nodes.island_15.geometry.attributes.position;
    if (!nodes.island_15.geometry.userData.vercelSignHidden) {
      for (let i = 0; i < signsPosition.count; i++) {
        if (signsPosition.getX(i) > -3) {
          signsPosition.setY(i, signsPosition.getY(i) - 30);
        }
      }
      signsPosition.needsUpdate = true;
      nodes.island_15.geometry.userData.vercelSignHidden = true;
    }

    // One fake point light per candle: cluster the candles primitive's
    // vertices by XZ proximity in island space, one light at each cluster's
    // top (the flame tip), brought to world through the group transform
    const candlesPosition = nodes.island_5.geometry.attributes.position;
    const candleClusters = [];
    for (let i = 0; i < candlesPosition.count; i++) {
      const x = candlesPosition.getX(i);
      const y = candlesPosition.getY(i);
      const z = candlesPosition.getZ(i);

      let cluster = candleClusters.find(
        c => Math.hypot(c.sumX / c.n - x, c.sumZ / c.n - z) < 0.8
      );
      if (!cluster) {
        cluster = { sumX: 0, sumZ: 0, n: 0, maxY: -Infinity };
        candleClusters.push(cluster);
      }
      cluster.sumX += x;
      cluster.sumZ += z;
      cluster.n += 1;
      if (y > cluster.maxY) cluster.maxY = y;
    }
    const islandScale = 0.45;
    setCandleLightPositions(
      candleClusters.map(c => [
        (c.sumX / c.n) * islandScale + ISLAND_POSITION.x,
        c.maxY * islandScale + ISLAND_POSITION.y,
        (c.sumZ / c.n) * islandScale + ISLAND_POSITION.z,
      ])
    );

    // Hide keyboard controls on mobile
    island.materials.controls.visible = !IS_MOBILE_DEVICE;

    // Play island animations
    islandAnimations.actions['details'].play();
  }, []);

  return (
    <>
      <group ref={islandRef} scale={0.45} position={ISLAND_POSITION}>
        <group name="island">
          <ContactIsland
            islandNodes={nodes}
            islandAnimations={islandAnimations}
          />
          <WindowRay />
          <SkillsIsland island={island} />
          <CountriesFlags island={island} />
          <skinnedMesh
            name="island_1"
            geometry={nodes.island_1.geometry}
            material={materials.islandTexture}
            skeleton={nodes.island_1.skeleton}
            morphTargetDictionary={nodes.island_1.morphTargetDictionary}
            morphTargetInfluences={nodes.island_1.morphTargetInfluences}
            castShadow={!IS_MOBILE_DEVICE}
            receiveShadow={!IS_MOBILE_DEVICE}
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
            visible={false}
            geometry={nodes.island_6.geometry}
            material={materials.lava}
            skeleton={nodes.island_6.skeleton}
            morphTargetDictionary={nodes.island_6.morphTargetDictionary}
            morphTargetInfluences={nodes.island_6.morphTargetInfluences}
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
        </group>
        <primitive object={nodes.hammer} />
        <primitive object={nodes.anvilSword} />
        <primitive object={nodes.pot} />
        <primitive object={nodes.portal} />
        <primitive object={nodes.smallGlyph} />
        <primitive object={nodes.glyph} />
        <primitive object={nodes.neutral_bone} />
      </group>
      <LanternsAndHome island={island} />
      <IslandMaterialsControls materials={materials} />
      <PointLightsControls />
      <CauldronSmoke
        folderName="CauldronSmoke"
        position={CAULDRON_SMOKE_POSITION}
        defaults={{
          color: '#00ffd4',
          opacity: 1,
          density: 0.6,
          speed: 0.07,
          edgeFade: 0.5,
          topFadeStart: 0.48,
          topFadeEnd: 1,
          bottomFadeStart: 0.31,
          bottomFadeEnd: 0.41,
          sway: true,
          timeOffsetStrength: 1,
          swayScale: 2.16,
          swayPower: 3,
          swayAmplitude: 0.16,
          width: 1.94,
          height: 2.8,
          offset: [0, 0.83, 0],
        }}
      />
      <TorchSmoke
        folderName="TorchesSmoke"
        positions={TORCH_SMOKE_POSITIONS}
        defaults={{
          color: '#313131',
          opacity: 0.32,
          fadeHeight: 0.67,
          baseFade: 0.32,
          timeOffsetStrength: 1,
          swayScale: 2.8,
          swayPower: 0.83,
          width: 0.14,
          height: 2.9,
        }}
      />
      {/* Shares island_1's morphTargetInfluences array with the mounted mesh,
          so the lava reads the mixer-animated blowerClosed weight live */}
      <ForgeLavaPlane blowerMesh={nodes.island_1} />
      <ProjectsIsland island={island} />
      <ResumeIsland />
    </>
  );
};

useGLTF.preload(islandModel);

export default Islands;
