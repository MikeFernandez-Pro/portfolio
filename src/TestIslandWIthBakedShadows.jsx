import { useGLTF, useAnimations, SoftShadows, shaderMaterial, Svg, Image, Text, Instance, Instances, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import LavaMesh from "./LavaMesh";
import LiquidMeshes from "./LiquidMeshes";
import MagicBooks from "./MagicBooks";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";
import { extend, useFrame, useLoader } from "@react-three/fiber";
import MagicLetters from "./MagicLetters";
import { DoubleSide } from "three";
import { MeshStandardMaterial } from "three";
import SleepText from "./SleepText";

const remapMaterialUVs = (material, remapUVs, {
  uvAttributePrefix,
  uvAttributeOffset
} = {}) => {
  const _uvAttributePrefix = uvAttributePrefix || 'texcoord_';
  const _uvAttributeOffset = 2;

  material.customProgramCacheKey = () => Math.random();
  material.onBeforeCompile = (shader, context) => {  
    const resolveIncludes = (shader) => {
      // NOTE Straight from three/WebGLProgram.js
      const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;

      return shader.replace(includePattern, (match, include) => {
        const string = THREE.ShaderChunk[include];

        if (!string) {
          return;
        }

        return resolveIncludes(string);
      });
    };

    let maxTexCoordIndex = 0;
    const texCoordSwaps = [];

    Object.entries(remapUVs).forEach(([ textureType, uvMap ]) => {
      if (!uvMap.startsWith(_uvAttributePrefix)) {
        console.warn('Invalid UVMap name', uvMap);

        return;
      }

      const texCoordIndex = parseFloat(uvMap.split(new RegExp(`${_uvAttributePrefix}\\D*`, 'gi')).join(''));

      maxTexCoordIndex = Math.max(texCoordIndex, maxTexCoordIndex);
      texCoordSwaps[textureType] = texCoordIndex;
    });

    if (maxTexCoordIndex - 1 <= 0) {
      return;
    }

    shader.vertexShader = shader.vertexShader.replace(`#include <uv2_pars_vertex>`, `
      ${Array(maxTexCoordIndex - 1).fill(0).map((_, index) => `
        attribute vec2 ${_uvAttributePrefix}${index + _uvAttributeOffset};
        varying vec2 vTexCoord${index + _uvAttributeOffset};
      `).join('\n')}

      #include <uv2_pars_vertex>
    `).replace(`#include <uv2_vertex>`, `
      ${Array(maxTexCoordIndex - 1).fill(0).map((_, index) => `
        vTexCoord${index + _uvAttributeOffset} = ( vec3( ${_uvAttributePrefix}${index + _uvAttributeOffset}, 1 ) ).xy;
      `).join('\n')}

      #include <uv2_vertex>
    `);

    shader.fragmentShader = shader.fragmentShader.replace(`#include <uv2_pars_fragment>`, `
      ${Array(maxTexCoordIndex - 1).fill(0).map((_, index) => `
        varying vec2 vTexCoord${index + _uvAttributeOffset};
      `).join('\n')}

      #include <uv2_pars_fragment>
    `);

    shader.vertexShader = resolveIncludes(shader.vertexShader);
    shader.fragmentShader = resolveIncludes(shader.fragmentShader);

    Object.entries(texCoordSwaps).forEach(([ textureType, texCoordIndex ]) => {
      shader.fragmentShader = shader.fragmentShader.replaceAll(
        `texture2D( ${textureType}, vUv )`,
        `texture2D( ${textureType}, vTexCoord${texCoordIndex} )`
       ).replaceAll(
        `texture2D( ${textureType}, vUv2 )`,
        `texture2D( ${textureType}, vTexCoord${texCoordIndex} )`
       );
    });
  };
};

const Island = () => {
  const staticLights = useControls("staticLights", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#ffaf67",
  });
  const magicCircle = useControls("magicCircle", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#ffaf67",
  });

  const pressurePlates = useControls("pressurePlates", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#68cff2",
  });
  const sword = useControls("sword", {
    intensity: { value: 3.94, min: 0, max: 50, step: 0.01 },
    color: "#f85f3d",
  });
  const magicLetters = useControls("magicLetters", {
    intensity: { value: 3.94, min: 0, max: 50, step: 0.01 },
    color: "#f85f3d",
  });

  /**
   * Island initialization
   */
  const island = useGLTF("/models/islandShadowsTest.glb");
  const islandAnimations = useAnimations(island.animations, island.scene)
  const islandPosition = useMemo(() => [-1.35, 2.3, -15], []);

  const islandTexture = useLoader(THREE.TextureLoader, "textures/TextureWithEye.png")
  const testShadow = useLoader(THREE.TextureLoader, "textures/testShadow.png")
  
  islandTexture.flipY = false;
  islandTexture.colorSpace = THREE.SRGBColorSpace

  testShadow.flipY = false;
  testShadow.colorSpace = THREE.SRGBColorSpace
  testShadow.channel = 2

  console.log(island.materials)
  island.materials.testShadows.map = islandTexture;
  island.materials.testShadows.aoMap = testShadow;
  island.materials.testShadows.aoMapIntensity = 10;
  


  
  island.materials.testShadows.color = new THREE.Color(1, 1, 1);

  const { envMapIntensity } = useControls('environment map', {
    envMapIntensity: { value: 1, min: 0, max: 12 }
})
  island.scene.traverse((child) => {
    if (child.isMesh && child.material.isMeshStandardMaterial && child.material.name !== "hammer") {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material.roughness = 1;
      // child.material.envMapIntensity = envMapIntensity
    }
  });

  island.materials.hammer.map = islandTexture;
  island.materials.hammer.color = new THREE.Color(1, 1, 1);

  island.materials.staticLights.emissiveIntensity = staticLights.intensity;
  island.materials.staticLights.toneMapped = false;

  island.materials.magicPortal.color = new THREE.Color(magicCircle.color)
  island.materials.magicPortal.emissiveIntensity = 0;
  island.materials.magicPortal.emissive = new THREE.Color(magicCircle.color);
  island.materials.magicPortal.toneMapped = false;

  island.materials.magicLetters.emissiveIntensity =4;
  island.materials.magicLetters.toneMapped = false;
  island.materials.magicLetters.map = islandTexture;
  
  island.materials.galaxyPlate.emissiveIntensity = 0;
  island.materials.galaxyPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.galaxyPlate.toneMapped = false;
  island.materials.galaxyPlate.map = islandTexture;

  island.materials.portalPlate.emissiveIntensity = 0;
  island.materials.portalPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.portalPlate.toneMapped = false;
  island.materials.portalPlate.map = islandTexture;

  island.materials.seaPlate.emissiveIntensity = 0;
  island.materials.seaPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.seaPlate.toneMapped = false;
  island.materials.seaPlate.map = islandTexture;

  // console.log(island.scene.children[0].children[0])
  /**
   * Island Animations Activation
   */
  useEffect(() => {
    islandAnimations.actions["anvilAnimation"].play();
    islandAnimations.actions["magicPotAnimation"].play();
    islandAnimations.actions["Key.020Action.005"].play();
  }, []);

  /**
   * Magic Circle 
   */

  const magicCircleActivationRef = useRef(useStore.getState().magicCircleActivation)

  /**
   * Projects Activation Plates
   */

  const activePlateRef = useRef(useStore.getState().activePlate)
  const prevPlateRef = useRef(useStore.getState().prevPlate)
  const magicCircleActivation = useStore(state => state.magicCircleActivation)

  if (magicCircleActivation) {
    gsap.to(island.materials.magicPortal, { duration: 1, emissiveIntensity: 2.3 })
  }

  useEffect(() => useStore.subscribe(
    state => {
      activePlateRef.current = state.activePlate
      prevPlateRef.current = state.prevPlate
      if (prevPlateRef.current)
        gsap.to(island.materials[prevPlateRef.current], { duration: 0, emissiveIntensity: 0 });
      gsap.to(island.materials[activePlateRef.current], { duration: 0.2, emissiveIntensity: 3 });
    }
  ), [])

  return (
    <>
      <primitive object={island.scene} scale={0.45} position={islandPosition} />
      <LiquidMeshes
        well={island.scene.children[0].children[0].children[2]}
        cauldron={island.scene.children[0].children[0].children[5]}
      />
      <LavaMesh lavaMesh={island.scene.children[0].children[0].children[3]} />
      <MagicBooks magicBooks={island.scene.children[0].children[0].children[9]} texture={islandTexture} />
      <MagicLetters magicLetters={island.scene.children[0].children[0].children[11]} texture={islandTexture}/>
      <SleepText />
    </>    
  );
};

useGLTF.preload("/models/island.glb");

export default Island;
