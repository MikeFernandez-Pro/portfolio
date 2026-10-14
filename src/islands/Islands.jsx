import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei/webgpu';

import { IS_MOBILE_DEVICE } from '#utils/device.js';

import { patchCloudShadows } from '#shaders/cloudShadows.js';
import {
  setCandleLightPositions,
  patchPointLights,
} from '#islands/world/pointLights/pointLights.js';
import { PointLightsControls } from '#islands/world/pointLights/PointLightsControls.jsx';
import { TorchSmoke } from '#islands/world/torches/TorchSmoke.jsx';
import { CauldronSmoke } from '#islands/skills/cauldron/CauldronSmoke.jsx';
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

import { GlbSkinnedMesh } from './GlbSkinnedMesh.jsx';
import {
  candleFlamePositions,
  dropEmptyMorphTargets,
  dropVercelSign,
  splitIslandTerrain,
} from './islandGeometryFixups.js';
import { ISLAND_POSITION, ISLAND_SCALE, islandToWorld } from './islandSpace.js';

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

// island.glb nodes mounted as they are, with their GLB material (the
// island_1 terrain and the nodes other components mount with their own
// material are not listed; island_6, 7 and 11 are not mounted at all)
const PLAIN_MESHES = [
  ['island_2', 'lanternsAndHomes'],
  ['island_3', 'torchesAndFire'],
  ['island_4', 'forgeSword'],
  ['island_5', 'candles'],
  ['island_9', 'magicPortal'],
  ['island_12', 'seaPlate'],
  ['island_13', 'halloweenPlate'],
  ['island_14', 'portalPlate'],
  ['island_15', 'signs'],
  ['island_16', 'controls'],
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

    // The terrain gets the TSL cloud shadows and point lights, which
    // need a node material: swap it in the GLTF materials map (the JSX below
    // and IslandMaterialsControls read it from there)
    const terrain = toNodeMaterial(materials.islandTexture);
    terrain.roughness = 1;
    patchCloudShadows(terrain);
    patchPointLights(terrain);
    materials.islandTexture = terrain;
  }, [materials, islandTexture]);

  // Geometry edits that must land before the meshes mount: the terrain split
  // into its static and moving triangles, no Vercel sign quads, and no morph
  // targets on the primitives they don't move (islandGeometryFixups.js)
  const staticTerrain = useMemo(() => {
    dropVercelSign(nodes);
    dropEmptyMorphTargets(nodes);
    return splitIslandTerrain(nodes);
  }, [nodes]);

  // The GLB clips animate island_6 (the old lava, replaced by
  // ForgeLavaPlane) and island_7 / island_11 (the baked floating skills,
  // replaced by the text in FloatingSkills), none mounted — drop those
  // tracks so the mixer doesn't warn about a missing node
  const filteredAnimations = useMemo(() => {
    animations.forEach(clip => {
      clip.tracks = clip.tracks.filter(
        track =>
          !track.name.startsWith('island_6.') &&
          !track.name.startsWith('island_7.') &&
          !track.name.startsWith('island_11.')
      );
    });
    return animations;
  }, [animations]);

  const islandAnimations = useAnimations(filteredAnimations, islandRef);

  useEffect(() => {
    // One point light per candle, at its flame tip
    setCandleLightPositions(candleFlamePositions(nodes).map(islandToWorld));

    // Hide keyboard controls on mobile
    materials.controls.visible = !IS_MOBILE_DEVICE;

    // Play island animations
    islandAnimations.actions['details'].play();
  }, []);

  return (
    <>
      {/* Island space. The `details` clip animates the morph weights of
          every island.glb primitive (one track per island_N mesh, bound by
          name under this group, the mixer root): the GLB meshes other
          components remount (potion, books, flags) must stay inside it.
          World-space props mount below, outside the group */}
      <group ref={islandRef} scale={ISLAND_SCALE} position={ISLAND_POSITION}>
        <group name="island">
          <ContactIsland islandAnimations={islandAnimations} />
          <WindowRay />
          <SkillsIsland island={island} />
          <CountriesFlags island={island} />
          {/* The terrain: its static triangles as a plain mesh, the moving
              ones as island_1 (skinned, morphed) */}
          <mesh
            name="islandStatic"
            geometry={staticTerrain}
            material={materials.islandTexture}
            castShadow={!IS_MOBILE_DEVICE}
            receiveShadow={!IS_MOBILE_DEVICE}
          />
          <GlbSkinnedMesh
            node={nodes.island_1}
            material={materials.islandTexture}
            castShadow={!IS_MOBILE_DEVICE}
            receiveShadow={!IS_MOBILE_DEVICE}
          />
          {PLAIN_MESHES.map(([node, material]) => (
            <GlbSkinnedMesh
              key={node}
              node={nodes[node]}
              material={materials[material]}
            />
          ))}
        </group>
        <primitive object={nodes.hammer} />
        <primitive object={nodes.anvilSword} />
        <primitive object={nodes.pot} />
        <primitive object={nodes.portal} />
        <primitive object={nodes.smallGlyph} />
        <primitive object={nodes.glyph} />
        <primitive object={nodes.neutral_bone} />
      </group>
      <IslandMaterialsControls materials={materials} />
      <PointLightsControls />
      <CauldronSmoke />
      <TorchSmoke />
      {/* Shares island_1's morphTargetInfluences array with the mounted mesh,
          so the lava reads the mixer-animated bellows weight live */}
      <ForgeLavaPlane bellowsMesh={nodes.island_1} />
      <ProjectsIsland island={island} />
      <ResumeIsland />
    </>
  );
};

useGLTF.preload(islandModel);

export default Islands;
